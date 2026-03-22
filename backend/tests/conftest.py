from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import hash_password, create_access_token, _get_db
from app.main import app
from app.models.company import Company
from app.models.user import User
from app.models.vendor import Vendor
from app.models.invoice_type import InvoiceType
from app.models.invoice import Invoice
from app.models.invoice_payment import InvoicePayment

# 테스트 전용 DB URL (운영 DB 보호)
TEST_DB_URL = settings.DATABASE_URL.replace("/invoice_db", "/invoice_db_test")


# ── 테스트 DB 엔진 (매 테스트마다 테이블 재생성) ────
@pytest_asyncio.fixture
async def test_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
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
    app.dependency_overrides[_get_db] = override_get_db
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


@pytest_asyncio.fixture
async def test_accountant(db_session, test_company) -> User:
    user = User(
        id=uuid4(),
        company_id=test_company.id,
        email="accountant@test.com",
        full_name="Test Accountant",
        role="ACCOUNTANT",
        password_hash=hash_password("password123"),
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_approver(db_session, test_company) -> User:
    user = User(
        id=uuid4(),
        company_id=test_company.id,
        email="approver@test.com",
        full_name="Test Approver",
        role="APPROVER",
        approval_level=1,
        password_hash=hash_password("password123"),
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_viewer(db_session, test_company) -> User:
    user = User(
        id=uuid4(),
        company_id=test_company.id,
        email="viewer@test.com",
        full_name="Test Viewer",
        role="VIEWER",
        password_hash=hash_password("password123"),
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_vendor(db_session, test_company) -> Vendor:
    vendor = Vendor(
        id=uuid4(),
        company_id=test_company.id,
        vendor_code="VEND01",
        company_name="Test Vendor Inc.",
        status="ACTIVE",
    )
    db_session.add(vendor)
    await db_session.flush()
    await db_session.refresh(vendor)
    return vendor


@pytest_asyncio.fixture
async def test_invoice_type(db_session, test_company) -> InvoiceType:
    inv_type = InvoiceType(
        id=uuid4(),
        company_id=test_company.id,
        type_code="STANDARD",
        type_name="Standard Invoice",
    )
    db_session.add(inv_type)
    await db_session.flush()
    await db_session.refresh(inv_type)
    return inv_type


@pytest_asyncio.fixture
async def test_invoice(db_session, test_company, test_vendor, test_invoice_type) -> Invoice:
    invoice = Invoice(
        id=uuid4(),
        company_id=test_company.id,
        vendor_id=test_vendor.id,
        invoice_type_id=test_invoice_type.id,
        invoice_number="INV-001",
        amount_subtotal=1000.00,
        amount_tax=100.00,
        amount_total=1100.00,
        currency_original="USD",
        source_channel="MANUAL",
        status="PENDING",
    )
    db_session.add(invoice)
    await db_session.flush()
    await db_session.refresh(invoice)
    return invoice


def auth_header(user: User) -> dict:
    """테스트용 JWT 인증 헤더 생성"""
    token = create_access_token(user.id, user.company_id, user.role)
    return {"Authorization": f"Bearer {token}"}
