"""Vendor 관련 유틸리티 (EIN 정규화, fuzzy match)"""
import re
from difflib import SequenceMatcher


def normalize_ein(ein: str | None) -> str | None:
    """EIN에서 하이픈/공백/특수문자 제거 → 숫자만 반환"""
    if not ein:
        return None
    return re.sub(r"[^0-9]", "", ein) or None


def fuzzy_match_score(name1: str, name2: str) -> float:
    """두 회사명의 유사도 (0.0 ~ 1.0)"""
    return SequenceMatcher(None, name1.lower().strip(), name2.lower().strip()).ratio()
