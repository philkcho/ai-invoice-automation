"""이메일 연동 서비스 — Gmail API / Microsoft Graph API 클라이언트

OAuth2 인증 → 이메일 조회 → 첨부파일 추출 → OCR 파이프라인 연결
"""
import json
import logging
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode

from app.core.config import settings

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════
#  Gmail API
# ══════════════════════════════════════════════════════

GMAIL_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"
GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.readonly"


def get_gmail_auth_url(state: str) -> str:
    """Gmail OAuth2 인증 URL 생성"""
    params = {
        "client_id": settings.GMAIL_CLIENT_ID,
        "redirect_uri": settings.GMAIL_REDIRECT_URI,
        "response_type": "code",
        "scope": GMAIL_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{GMAIL_AUTH_URL}?{urlencode(params)}"


async def exchange_gmail_code(code: str) -> dict:
    """Gmail authorization code → access/refresh token 교환"""
    import httpx

    async with httpx.AsyncClient() as client:
        resp = await client.post(GMAIL_TOKEN_URL, data={
            "client_id": settings.GMAIL_CLIENT_ID,
            "client_secret": settings.GMAIL_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.GMAIL_REDIRECT_URI,
        })
        resp.raise_for_status()
        return resp.json()


async def refresh_gmail_token(refresh_token: str) -> dict:
    """Gmail refresh token → 새 access token"""
    import httpx

    async with httpx.AsyncClient() as client:
        resp = await client.post(GMAIL_TOKEN_URL, data={
            "client_id": settings.GMAIL_CLIENT_ID,
            "client_secret": settings.GMAIL_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        })
        resp.raise_for_status()
        data = resp.json()
        # refresh_token은 응답에 포함되지 않을 수 있으므로 원본 유지
        if "refresh_token" not in data:
            data["refresh_token"] = refresh_token
        return data


async def fetch_gmail_messages(
    access_token: str,
    after_timestamp: Optional[datetime] = None,
    max_results: int = 20,
    filter_keywords: Optional[list[str]] = None,
    filter_senders: Optional[list[str]] = None,
) -> list[dict]:
    """Gmail API에서 메시지 목록 조회"""
    import httpx

    query_parts = ["has:attachment"]

    if after_timestamp:
        epoch = int(after_timestamp.timestamp())
        query_parts.append(f"after:{epoch}")

    if filter_keywords:
        keyword_query = " OR ".join(f"subject:{kw.strip()}" for kw in filter_keywords if kw.strip())
        if keyword_query:
            query_parts.append(f"({keyword_query})")

    if filter_senders:
        sender_query = " OR ".join(f"from:{s.strip()}" for s in filter_senders if s.strip())
        if sender_query:
            query_parts.append(f"({sender_query})")

    query = " ".join(query_parts)

    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {access_token}"}

        # 메시지 ID 목록 조회
        resp = await client.get(
            f"{GMAIL_API_BASE}/messages",
            headers=headers,
            params={"q": query, "maxResults": max_results},
        )
        resp.raise_for_status()
        data = resp.json()

        messages = data.get("messages", [])
        if not messages:
            return []

        # 각 메시지 상세 조회
        result = []
        for msg_ref in messages:
            msg_resp = await client.get(
                f"{GMAIL_API_BASE}/messages/{msg_ref['id']}",
                headers=headers,
                params={"format": "full"},
            )
            msg_resp.raise_for_status()
            result.append(msg_resp.json())

        return result


async def download_gmail_attachment(
    access_token: str, message_id: str, attachment_id: str
) -> bytes:
    """Gmail 첨부파일 다운로드"""
    import httpx
    import base64

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GMAIL_API_BASE}/messages/{message_id}/attachments/{attachment_id}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        data = resp.json()
        # Gmail API는 URL-safe base64로 반환
        return base64.urlsafe_b64decode(data["data"])


def parse_gmail_message(message: dict) -> dict:
    """Gmail 메시지에서 필요한 정보 추출"""
    headers = {h["name"].lower(): h["value"] for h in message["payload"].get("headers", [])}

    attachments = []
    _extract_attachments(message["payload"], attachments)

    return {
        "message_id": message["id"],
        "subject": headers.get("subject", ""),
        "from": headers.get("from", ""),
        "date": headers.get("date", ""),
        "attachments": attachments,
    }


def _extract_attachments(part: dict, attachments: list):
    """재귀적으로 첨부파일 정보 추출"""
    if part.get("filename") and part.get("body", {}).get("attachmentId"):
        mime = part.get("mimeType", "")
        if mime in ("application/pdf", "image/jpeg", "image/png", "image/jpg"):
            attachments.append({
                "filename": part["filename"],
                "mime_type": mime,
                "attachment_id": part["body"]["attachmentId"],
                "size": part["body"].get("size", 0),
            })

    for sub_part in part.get("parts", []):
        _extract_attachments(sub_part, attachments)


# ══════════════════════════════════════════════════════
#  Outlook / Microsoft Graph API
# ══════════════════════════════════════════════════════

MS_AUTH_URL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize"
MS_TOKEN_URL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
MS_GRAPH_BASE = "https://graph.microsoft.com/v1.0/me"
MS_SCOPES = "Mail.Read offline_access"


def get_outlook_auth_url(state: str) -> str:
    """Outlook OAuth2 인증 URL 생성"""
    tenant = settings.OUTLOOK_TENANT_ID or "common"
    params = {
        "client_id": settings.OUTLOOK_CLIENT_ID,
        "redirect_uri": settings.OUTLOOK_REDIRECT_URI,
        "response_type": "code",
        "scope": MS_SCOPES,
        "state": state,
        "prompt": "consent",
    }
    return f"{MS_AUTH_URL.format(tenant=tenant)}?{urlencode(params)}"


async def exchange_outlook_code(code: str) -> dict:
    """Outlook authorization code → access/refresh token 교환"""
    import httpx

    tenant = settings.OUTLOOK_TENANT_ID or "common"
    async with httpx.AsyncClient() as client:
        resp = await client.post(MS_TOKEN_URL.format(tenant=tenant), data={
            "client_id": settings.OUTLOOK_CLIENT_ID,
            "client_secret": settings.OUTLOOK_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.OUTLOOK_REDIRECT_URI,
            "scope": MS_SCOPES,
        })
        resp.raise_for_status()
        return resp.json()


async def refresh_outlook_token(refresh_token: str) -> dict:
    """Outlook refresh token → 새 access token"""
    import httpx

    tenant = settings.OUTLOOK_TENANT_ID or "common"
    async with httpx.AsyncClient() as client:
        resp = await client.post(MS_TOKEN_URL.format(tenant=tenant), data={
            "client_id": settings.OUTLOOK_CLIENT_ID,
            "client_secret": settings.OUTLOOK_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
            "scope": MS_SCOPES,
        })
        resp.raise_for_status()
        data = resp.json()
        if "refresh_token" not in data:
            data["refresh_token"] = refresh_token
        return data


async def fetch_outlook_messages(
    access_token: str,
    after_timestamp: Optional[datetime] = None,
    max_results: int = 20,
    filter_keywords: Optional[list[str]] = None,
    filter_senders: Optional[list[str]] = None,
) -> list[dict]:
    """Microsoft Graph API에서 메시지 목록 조회"""
    import httpx

    filters = ["hasAttachments eq true"]

    if after_timestamp:
        iso = after_timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
        filters.append(f"receivedDateTime ge {iso}")

    if filter_senders:
        sender_filters = " or ".join(
            f"contains(from/emailAddress/address,'{s.strip()}')"
            for s in filter_senders if s.strip()
        )
        if sender_filters:
            filters.append(f"({sender_filters})")

    filter_str = " and ".join(filters)

    params = {
        "$filter": filter_str,
        "$top": max_results,
        "$orderby": "receivedDateTime desc",
        "$select": "id,subject,from,receivedDateTime,hasAttachments",
    }

    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {access_token}"}

        resp = await client.get(
            f"{MS_GRAPH_BASE}/messages",
            headers=headers,
            params=params,
        )
        resp.raise_for_status()
        data = resp.json()

        messages = data.get("value", [])
        if not messages and filter_keywords:
            # Graph API의 $search로 키워드 검색 (OData filter와 병행 불가)
            # 키워드가 있으면 후처리로 필터링
            pass

        return messages


async def fetch_outlook_attachments(
    access_token: str, message_id: str
) -> list[dict]:
    """Outlook 메시지의 첨부파일 목록 조회"""
    import httpx

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{MS_GRAPH_BASE}/messages/{message_id}/attachments",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"$select": "id,name,contentType,size,contentBytes"},
        )
        resp.raise_for_status()
        data = resp.json()

        attachments = []
        for att in data.get("value", []):
            content_type = att.get("contentType", "")
            if content_type in ("application/pdf", "image/jpeg", "image/png", "image/jpg"):
                attachments.append({
                    "attachment_id": att["id"],
                    "filename": att["name"],
                    "mime_type": content_type,
                    "size": att.get("size", 0),
                    "content_bytes": att.get("contentBytes"),  # base64 encoded
                })

        return attachments


def parse_outlook_message(message: dict) -> dict:
    """Outlook 메시지에서 필요한 정보 추출"""
    return {
        "message_id": message["id"],
        "subject": message.get("subject", ""),
        "from": message.get("from", {}).get("emailAddress", {}).get("address", ""),
        "date": message.get("receivedDateTime", ""),
    }
