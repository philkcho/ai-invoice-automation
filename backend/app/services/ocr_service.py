"""
OCR Service — Claude API를 사용한 인보이스 데이터 추출
PDF/이미지에서 텍스트를 추출하고 구조화된 JSON으로 변환.
"""
import json
import base64
import logging
import os
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Claude API 응답에서 추출할 필드
OCR_FIELDS = [
    "vendor_name", "vendor_address", "vendor_ein",
    "invoice_number", "invoice_date", "due_date",
    "po_number", "payment_terms",
    "subtotal", "tax_amount", "total_amount",
    "currency",
    "line_items",  # [{description, quantity, unit_price, amount}]
]

OCR_PROMPT = """You are an invoice data extraction assistant. Analyze the provided invoice document and extract the following information into a JSON object.

Required fields:
- vendor_name: Company/vendor name on the invoice
- vendor_address: Full address of the vendor
- vendor_ein: EIN/Tax ID if visible
- invoice_number: Invoice number/ID
- invoice_date: Invoice date (YYYY-MM-DD format)
- due_date: Payment due date (YYYY-MM-DD format)
- po_number: Purchase order number if present
- payment_terms: Payment terms (e.g., "Net30")
- subtotal: Subtotal amount before tax (number)
- tax_amount: Tax amount (number)
- total_amount: Total amount (number)
- currency: Currency code (e.g., "USD")
- line_items: Array of line items, each with:
  - description: Item description
  - quantity: Quantity (number)
  - unit_price: Unit price (number)
  - amount: Line total (number)

Return ONLY valid JSON. Use null for fields that cannot be determined.
Do not include any explanation or markdown formatting."""


async def extract_invoice_data(file_path: str) -> dict:
    """파일에서 인보이스 데이터 추출 (Claude API 호출)"""
    import anthropic

    if not settings.ANTHROPIC_API_KEY or settings.ANTHROPIC_API_KEY == "your-anthropic-api-key":
        logger.warning("ANTHROPIC_API_KEY not configured, returning mock data")
        return _mock_ocr_result()

    # 파일 읽기
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

    # Claude API 호출
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    file_b64 = base64.standard_b64encode(file_content).decode("utf-8")

    if media_type == "application/pdf":
        content = [
            {
                "type": "document",
                "source": {"type": "base64", "media_type": media_type, "data": file_b64},
            },
            {"type": "text", "text": OCR_PROMPT},
        ]
    else:
        content = [
            {
                "type": "image",
                "source": {"type": "base64", "media_type": media_type, "data": file_b64},
            },
            {"type": "text", "text": OCR_PROMPT},
        ]

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": content}],
        )

        raw_text = response.content[0].text
        logger.info("Claude OCR response length: %d chars", len(raw_text))

        # JSON 파싱
        result = json.loads(raw_text)
        result["_raw_text"] = raw_text
        return result

    except json.JSONDecodeError:
        logger.error("Failed to parse Claude OCR response as JSON")
        return {"_raw_text": raw_text, "_parse_error": True}
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
    }
