"""
파일 업로드 핸들러
로컬 파일시스템 (/app/media/) 저장
"""
import os
import uuid
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
MEDIA_ROOT = "/app/media"


def _validate_file(filename: str, file_size: int) -> None:
    """파일 확장자 및 크기 검증"""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    if file_size > MAX_FILE_SIZE:
        raise ValueError(f"File too large: {file_size / 1024 / 1024:.1f}MB. Max: {MAX_FILE_SIZE / 1024 / 1024:.0f}MB")


def _generate_path(company_code: str, category: str, filename: str) -> str:
    """파일 저장 경로 생성: {company_code}/{category}/{year}/{month}/{uuid}_{filename}"""
    now = datetime.utcnow()
    unique_name = f"{uuid.uuid4().hex[:12]}_{filename}"
    return f"{company_code}/{category}/{now.year}/{now.month:02d}/{unique_name}"


async def save_file(
    file_content: bytes,
    filename: str,
    company_code: str,
    category: str = "invoices",
) -> str:
    """로컬 파일시스템에 저장"""
    _validate_file(filename, len(file_content))

    relative_path = _generate_path(company_code, category, filename)
    full_path = os.path.join(MEDIA_ROOT, relative_path)

    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    with open(full_path, "wb") as f:
        f.write(file_content)

    logger.info("File saved: %s", full_path)
    return relative_path


def get_file_url(file_path: str) -> str:
    """파일 접근 URL 반환"""
    return f"/media/{file_path}"
