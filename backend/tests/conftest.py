from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import hash_password, create_access_token
from app.main import app
from app.models.company import Company
from app.models.user import User


# ── 테스트 DB 엔진 (매 테스트 함수마다 테이블 재생성) ──
@pytest_asyncio.fixture
async def test_engine():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


# ── 테스트 DB 세션 ──────────────────────────────────
@pytest_asyncio.fixture
async def db_session(test_engine):
    session_factory = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session
        await session.rollback()


# ── FastAPI 의존성 오버라이드 ────────────────────────
@pytest_asyncio.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ── 테스트 데이터 헬퍼 ──────────────────────────────
@pytest_asyncio.fixture
async def test_company(db_session) -> Company:
    company = Company(
        id=uuid4(),
        company_code="TEST01",
        company_name="Test Company",
        status="ACTIVE",
    )
    db_session.add(company)
    await db_session.flush()
    await db_session.refresh(company)
    return company


@pytest_asyncio.fixture
async def test_super_admin(db_session) -> User:
    user = User(
        id=uuid4(),
        company_id=None,
        email="admin@test.com",
        full_name="Super Admin",
        role="SUPER_ADMIN",
        password_hash=hash_password("password123"),
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_company_admin(db_session, test_company) -> User:
    user = User(
        id=uuid4(),
        company_id=test_company.id,
        email="companyadmin@test.com",
        full_name="Company Admin",
        role="COMPANY_ADMIN",
        password_hash=hash_password("password123"),
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


def auth_header(user: User) -> dict:
    """테스트용 JWT 인증 헤더 생성"""
    token = create_access_token(user.id, user.company_id, user.role)
    return {"Authorization": f"Bearer {token}"}
