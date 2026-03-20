"""AES-256 암호화/복호화 (ACH routing/account 등 민감 필드용)

Fernet 방식 사용 (AES-128-CBC + HMAC-SHA256).
ENCRYPTION_KEY(64자 hex = 32바이트)에서 Fernet 호환 키를 생성.
"""
import base64
import hashlib
import logging
from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings

logger = logging.getLogger(__name__)

_fernet_instance: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is None:
        raw_key = settings.ENCRYPTION_KEY
        if not raw_key or raw_key == "REPLACE_WITH_RANDOM_HEX_64":
            raise ValueError("ENCRYPTION_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.")
        # ENCRYPTION_KEY(hex)를 SHA-256으로 해싱 → 32바이트 → Fernet base64 키
        key_bytes = hashlib.sha256(raw_key.encode()).digest()
        fernet_key = base64.urlsafe_b64encode(key_bytes)
        _fernet_instance = Fernet(fernet_key)
    return _fernet_instance


def encrypt_value(plain_text: str) -> str:
    """평문을 암호화하여 반환"""
    if not plain_text:
        return plain_text
    try:
        return _get_fernet().encrypt(plain_text.encode()).decode()
    except Exception as e:
        logger.error("암호화 실패: %s", type(e).__name__)
        raise ValueError("데이터 암호화에 실패했습니다") from e


def decrypt_value(encrypted_text: str) -> str:
    """암호문을 복호화하여 반환"""
    if not encrypted_text:
        return encrypted_text
    try:
        return _get_fernet().decrypt(encrypted_text.encode()).decode()
    except InvalidToken:
        logger.error("복호화 실패: 잘못된 토큰 또는 ENCRYPTION_KEY 불일치")
        raise ValueError("데이터 복호화에 실패했습니다. ENCRYPTION_KEY를 확인하세요.")
    except Exception as e:
        logger.error("복호화 실패: %s", type(e).__name__)
        raise ValueError("데이터 복호화에 실패했습니다") from e
