"""AES-256 암호화/복호화 (ACH routing/account 등 민감 필드용)"""
import base64
from cryptography.fernet import Fernet
from app.core.config import settings


def _get_fernet() -> Fernet:
    key = settings.ENCRYPTION_KEY
    # Fernet은 32-byte base64 URL-safe 키 필요
    # hex 키를 변환
    key_bytes = bytes.fromhex(key)[:32]
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def encrypt_value(plain_text: str) -> str:
    if not plain_text:
        return plain_text
    f = _get_fernet()
    return f.encrypt(plain_text.encode()).decode()


def decrypt_value(encrypted_text: str) -> str:
    if not encrypted_text:
        return encrypted_text
    f = _get_fernet()
    return f.decrypt(encrypted_text.encode()).decode()
