"""
파일 업로드 핸들러
- 개발 환경: 로컬 파일시스템 (/app/media/)
- 프로덕션: AWS S3 (pre-signed URL)
"""
import os
import uuid
import logging
from datetime import datetime

from app.core.config import settings

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
    ext = os.path.splitext(filename)[1].lower()
    unique_name = f"{uuid.uuid4().hex[:12]}_{filename}"
    return f"{company_code}/{category}/{now.year}/{now.month:02d}/{unique_name}"


async def save_file_local(
    file_content: bytes,
    filename: str,
    company_code: str,
    category: str = "invoices",
) -> str:
    """로컬 파일시스템에 저장 (개발 환경)"""
    _validate_file(filename, len(file_content))

    relative_path = _generate_path(company_code, category, filename)
    full_path = os.path.join(MEDIA_ROOT, relative_path)

    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    with open(full_path, "wb") as f:
        f.write(file_content)

    logger.info("File saved locally: %s", full_path)
    return relative_path


async def save_file_s3(
    file_content: bytes,
    filename: str,
    company_code: str,
    category: str = "invoices",
) -> str:
    """AWS S3에 업로드 (프로덕션)"""
    import boto3

    _validate_file(filename, len(file_content))

    relative_path = _generate_path(company_code, category, filename)
    s3_key = f"{settings.AWS_S3_BUCKET}/{relative_path}"

    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )

    ext = os.path.splitext(filename)[1].lower()
    content_type = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }.get(ext, "application/octet-stream")

    s3.put_object(
        Bucket=settings.AWS_S3_BUCKET,
        Key=relative_path,
        Body=file_content,
        ContentType=content_type,
    )

    logger.info("File uploaded to S3: s3://%s/%s", settings.AWS_S3_BUCKET, relative_path)
    return relative_path


async def save_file(
    file_content: bytes,
    filename: str,
    company_code: str,
    category: str = "invoices",
) -> str:
    """환경에 따라 로컬 또는 S3 저장"""
    if settings.ENVIRONMENT == "development":
        return await save_file_local(file_content, filename, company_code, category)
    else:
        return await save_file_s3(file_content, filename, company_code, category)


def get_file_url(file_path: str) -> str:
    """파일 접근 URL 반환"""
    if settings.ENVIRONMENT == "development":
        return f"/media/{file_path}"
    else:
        import boto3
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        return s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.AWS_S3_BUCKET, "Key": file_path},
            ExpiresIn=settings.S3_PRESIGNED_URL_EXPIRY,
        )
