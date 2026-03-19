"""
OCR Service — Google Document AI를 사용한 인보이스 데이터 추출
PDF/이미지에서 텍스트를 추출하고 구조화된 JSON으로 변환.

우선순위:
1. Google Document AI (GOOGLE_PROJECT_ID 설정 시)
2. Claude API (ANTHROPIC_API_KEY 설정 시)
3. Mock 데이터 (둘 다 미설정)
"""
import json
import base64
import logging
import os
import re
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


async def extract_invoice_data(file_path: str) -> dict:
    """파일에서 인보이스 데이터 추출 (Google Document AI 우선)"""
    # 1. Google Document AI
    if settings.GOOGLE_PROJECT_ID and settings.GOOGLE_PROCESSOR_ID:
        logger.info("Using Google Document AI for extraction")
        return await _extract_with_google_documentai(file_path)

    # 2. Claude API fallback
    if settings.ANTHROPIC_API_KEY and settings.ANTHROPIC_API_KEY != "your-anthropic-api-key":
        logger.info("Using Claude API for extraction")
        return await _extract_with_claude(file_path)

    # 3. Mock
    logger.warning("No OCR API configured, returning mock data")
    return _mock_ocr_result()


async def _extract_with_google_documentai(file_path: str) -> dict:
    """Google Document AI Invoice Parser로 인보이스 데이터 추출"""
    from google.cloud import documentai_v1 as documentai

    full_path = os.path.join("/app/media", file_path) if not file_path.startswith("/") else file_path
    if not os.path.exists(full_path):
        raise FileNotFoundError(f"File not found: {full_path}")

    with open(full_path, "rb") as f:
        file_content = f.read()

    ext = os.path.splitext(file_path)[1].lower()
    mime_type = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }.get(ext)
    if not mime_type:
        raise ValueError(f"Unsupported file type: {ext}")

    # Document AI 클라이언트
    client_options = {"api_endpoint": f"{settings.GOOGLE_LOCATION}-documentai.googleapis.com"}
    client = documentai.DocumentProcessorServiceClient(client_options=client_options)

    resource_name = client.processor_path(
        settings.GOOGLE_PROJECT_ID,
        settings.GOOGLE_LOCATION,
        settings.GOOGLE_PROCESSOR_ID,
    )

    raw_document = documentai.RawDocument(content=file_content, mime_type=mime_type)
    request = documentai.ProcessRequest(name=resource_name, raw_document=raw_document)

    try:
        result = client.process_document(request=request)
        document = result.document
        logger.info("Google Document AI response: %d entities found", len(document.entities))
        return _parse_documentai_response(document)
    except Exception as e:
        logger.error("Google Document AI call failed: %s", e)
        raise


def _parse_documentai_response(document) -> dict:
    """Google Document AI 응답을 표준 형식으로 변환"""
    entities = {}
    for entity in document.entities:
        key = entity.type_
        value = entity.mention_text
        # 중복 키는 첫 번째 값 사용
        if key not in entities:
            entities[key] = value

    # Line items 파싱
    line_items = []
    for entity in document.entities:
        if entity.type_ in ("line_item", "line_item/"):
            line = {}
            for prop in entity.properties:
                prop_type = prop.type_.replace("line_item/", "")
                line[prop_type] = prop.mention_text
            if line:
                line_items.append({
                    "description": line.get("description", line.get("product_code", "")),
                    "quantity": _parse_number(line.get("quantity", "1")),
                    "unit_price": _parse_number(line.get("unit_price", "0")),
                    "amount": _parse_number(line.get("amount", line.get("line_amount", "0"))),
                })

    # 표준 결과 구성
    result = {
        "vendor_name": entities.get("supplier_name", entities.get("vendor_name")),
        "vendor_address": entities.get("supplier_address", entities.get("vendor_address")),
        "vendor_ein": entities.get("supplier_tax_id", entities.get("vendor_tax_id")),
        "invoice_number": entities.get("invoice_id", entities.get("invoice_number")),
        "invoice_date": _parse_date(entities.get("invoice_date")),
        "due_date": _parse_date(entities.get("due_date", entities.get("payment_due_date"))),
        "po_number": entities.get("purchase_order", entities.get("po_number")),
        "payment_terms": entities.get("payment_terms", entities.get("net_amount")),
        "subtotal": _parse_number(entities.get("net_amount", entities.get("subtotal", "0"))),
        "tax_amount": _parse_number(entities.get("total_tax_amount", entities.get("tax_amount", "0"))),
        "total_amount": _parse_number(entities.get("total_amount", entities.get("amount_due", "0"))),
        "currency": entities.get("currency", "USD"),
        "line_items": line_items,
        "_raw_text": document.text[:2000] if document.text else "",
        "_provider": "google_documentai",
    }

    return result


def _parse_number(value: Optional[str]) -> float:
    """문자열에서 숫자 추출 ($1,234.56 → 1234.56)"""
    if not value:
        return 0.0
    cleaned = re.sub(r'[^\d.\-]', '', str(value))
    try:
        return float(cleaned) if cleaned else 0.0
    except ValueError:
        return 0.0


def _parse_date(value: Optional[str]) -> Optional[str]:
    """날짜 문자열을 YYYY-MM-DD 형식으로 변환"""
    if not value:
        return None
    # 이미 YYYY-MM-DD 형식이면 그대로
    if re.match(r'^\d{4}-\d{2}-\d{2}$', value):
        return value
    # MM/DD/YYYY 또는 MM-DD-YYYY
    m = re.match(r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})', value)
    if m:
        return f"{m.group(3)}-{m.group(1).zfill(2)}-{m.group(2).zfill(2)}"
    # 그 외는 원본 반환
    return value


async def _extract_with_claude(file_path: str) -> dict:
    """Claude API로 인보이스 데이터 추출 (fallback)"""
    import anthropic

    full_path = os.path.join("/app/media", file_path) if not file_path.startswith("/") else file_path
    if not os.path.exists(full_path):
        raise FileNotFoundError(f"File not found: {full_path}")

    with open(full_path, "rb") as f:
        file_content = f.read()

    ext = os.path.splitext(file_path)[1].lower()
    media_type = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }.get(ext)
    if not media_type:
        raise ValueError(f"Unsupported file type: {ext}")

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    file_b64 = base64.standard_b64encode(file_content).decode("utf-8")

    prompt = """You are an invoice data extraction assistant. Extract the following into JSON:
vendor_name, vendor_address, vendor_ein, invoice_number, invoice_date (YYYY-MM-DD),
due_date (YYYY-MM-DD), po_number, payment_terms, subtotal, tax_amount, total_amount,
currency, line_items (array of: description, quantity, unit_price, amount).
Return ONLY valid JSON. Use null for unknown fields."""

    if media_type == "application/pdf":
        content = [
            {"type": "document", "source": {"type": "base64", "media_type": media_type, "data": file_b64}},
            {"type": "text", "text": prompt},
        ]
    else:
        content = [
            {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": file_b64}},
            {"type": "text", "text": prompt},
        ]

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": content}],
        )
        raw_text = response.content[0].text
        result = json.loads(raw_text)
        result["_raw_text"] = raw_text
        result["_provider"] = "claude"
        return result
    except json.JSONDecodeError:
        return {"_raw_text": raw_text, "_parse_error": True, "_provider": "claude"}
    except Exception as e:
        logger.error("Claude API call failed: %s", e)
        raise


def _mock_ocr_result() -> dict:
    """개발/테스트용 목업 OCR 결과"""
    return {
        "vendor_name": "Mock Vendor Corp",
        "vendor_address": "123 Main St, New York, NY 10001",
        "vendor_ein": "12-3456789",
        "invoice_number": "INV-MOCK-001",
        "invoice_date": "2026-03-15",
        "due_date": "2026-04-14",
        "po_number": None,
        "payment_terms": "Net30",
        "subtotal": 1000.00,
        "tax_amount": 82.50,
        "total_amount": 1082.50,
        "currency": "USD",
        "line_items": [
            {
                "description": "Consulting Service",
                "quantity": 10,
                "unit_price": 100.00,
                "amount": 1000.00,
            },
        ],
        "_mock": True,
        "_provider": "mock",
    }
