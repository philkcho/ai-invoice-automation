"""AES-256 암호화/복호화 (ACH routing/account 등 민감 필드용)

Fernet 방식 사용 (AES-128-CBC + HMAC-SHA256).
ENCRYPTION_KEY(64자 hex = 32바이트)에서 Fernet 호환 키를 생성.
"""
import base64
import hashlib
from cryptography.fernet import Fernet
from app.core.config import settings

_fernet_instance: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is None:
        # ENCRYPTION_KEY(hex)를 SHA-256으로 해싱 → 32바이트 → Fernet base64 키
        key_bytes = hashlib.sha256(settings.ENCRYPTION_KEY.encode()).digest()
        fernet_key = base64.urlsafe_b64encode(key_bytes)
        _fernet_instance = Fernet(fernet_key)
    return _fernet_instance


def encrypt_value(plain_text: str) -> str:
    """평문을 암호화하여 반환"""
    if not plain_text:
        return plain_text
    return _get_fernet().encrypt(plain_text.encode()).decode()


def decrypt_value(encrypted_text: str) -> str:
    """암호문을 복호화하여 반환"""
    if not encrypted_text:
        return encrypted_text
    return _get_fernet().decrypt(encrypted_text.encode()).decode()
