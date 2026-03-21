"""AI 채팅 서비스 — 자연어 질의 → SQL 생성 → 결과 자연어 변환"""
import json
import logging
import re
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── DB 스키마 설명 (Claude에게 전달) ──────────────────
DB_SCHEMA = """
Tables:

1. invoices
   - id (UUID PK), company_id (UUID FK), vendor_id (UUID FK -> vendors.id),
     invoice_type_id (UUID FK -> invoice_types.id)
   - invoice_number (varchar), invoice_date (date), due_date (date)
   - amount_subtotal (numeric), amount_tax (numeric), amount_total (numeric)
   - currency_original (varchar, default 'USD')
   - status: 'RECEIVED','OCR_REVIEW','PENDING','SUBMITTED','REVIEW_NEEDED',
             'IN_APPROVAL','APPROVED','REJECTED','SCHEDULED','PAID','VOID'
   - validation_status: 'PENDING','PASS','FAIL','WARNING','OVERRIDDEN'
   - ocr_status: 'PENDING','COMPLETED','FAILED','CORRECTED'
   - source_channel: 'UPLOAD','GMAIL','OUTLOOK','MANUAL'
   - po_number (varchar), notes (text)
   - created_at (timestamptz), updated_at (timestamptz)

2. vendors
   - id (UUID PK), company_id (UUID FK)
   - vendor_code (varchar), company_name (varchar) -- this is the vendor's name
   - status: 'ACTIVE','INACTIVE'
   - vendor_category (varchar), contact_name (varchar)
   - payment_terms (varchar)
   - billing_city (varchar), billing_state (varchar)

3. invoice_payments
   - id (UUID PK), company_id (UUID FK), invoice_id (UUID FK -> invoices.id)
   - payment_method: 'ACH','CHECK','WIRE','CREDIT_CARD'
   - payment_status: 'SCHEDULED','PROCESSING','PAID','FAILED','VOID'
   - scheduled_date (date), paid_date (date), amount_paid (numeric)
   - transaction_ref (varchar)

4. invoice_approvals
   - id (UUID PK), company_id (UUID FK), invoice_id (UUID FK -> invoices.id)
   - step (int), approver_role (varchar), status: 'PENDING','APPROVED','REJECTED','CANCELLED'
   - action_at (timestamptz), comments (text)

5. invoice_types
   - id (UUID PK), company_id (UUID FK)
   - type_code (varchar), type_name (varchar), is_active (bool)

6. purchase_orders
   - id (UUID PK), company_id (UUID FK), vendor_id (UUID FK -> vendors.id)
   - po_number (varchar), po_date (date)
   - amount_total (numeric), amount_invoiced (numeric), amount_remaining (numeric)
   - status: 'DRAFT','OPEN','CLOSED','CANCELLED'

7. invoice_line_items
   - id (UUID PK), invoice_id (UUID FK -> invoices.id)
   - line_number (int), description (text), quantity (numeric), unit_price (numeric)
   - amount (numeric), category (varchar), tax_amount (numeric)

8. companies
   - id (UUID PK), company_name (varchar), status: 'ACTIVE','INACTIVE'

Key JOINs:
- invoices.vendor_id = vendors.id
- invoices.invoice_type_id = invoice_types.id
- invoices.po_id = purchase_orders.id
- invoice_payments.invoice_id = invoices.id
- invoice_approvals.invoice_id = invoices.id
- invoice_line_items.invoice_id = invoices.id
"""

SQL_SYSTEM_PROMPT = f"""You are a data analyst for an invoice management system.
Given a user's question (in Korean or English), generate a PostgreSQL SELECT query.

STRICT RULES:
1. ONLY generate SELECT statements. NEVER use INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE.
2. The query MUST include: WHERE company_id = :company_id (use the parameter, not a literal UUID).
3. NEVER select: password_hash, ach_routing, ach_account, raw_text, file_path, credentials.
4. Always add LIMIT 100.
5. Use proper JOINs when needed.
6. For "this month": WHERE created_at >= date_trunc('month', CURRENT_DATE)
7. For "overdue": WHERE due_date < CURRENT_DATE AND status NOT IN ('PAID','VOID')
8. For vendor name queries, use vendors.company_name.
9. When casting enum columns to compare with strings, use CAST(column AS text) or column::text.
10. Return ONLY the raw SQL query. No markdown, no explanation, no code blocks.

{DB_SCHEMA}"""

ANSWER_SYSTEM_PROMPT = """You are a helpful assistant for an invoice management system.
Given a user's question and the query results, provide a clear, concise answer in the same language as the question.
Format numbers with commas and currency symbols where appropriate.
If the result is empty, say so clearly.
Keep your answer brief (2-3 sentences max). Do not mention SQL or technical details."""

# ── 금지 패턴 ─────────────────────────────────────
FORBIDDEN_PATTERNS = re.compile(
    r'\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|COPY|'
    r'pg_read_file|pg_ls_dir|lo_import|pg_sleep)\b',
    re.IGNORECASE,
)

FORBIDDEN_COLUMNS = re.compile(
    r'\b(password_hash|ach_routing|ach_account|raw_text|credentials)\b',
    re.IGNORECASE,
)


def _validate_sql(sql: str) -> str:
    """SQL 안전성 검증"""
    sql = sql.strip().rstrip(';')

    # 코드 블록 마커 제거
    if sql.startswith('```'):
        sql = re.sub(r'^```\w*\n?', '', sql)
        sql = re.sub(r'\n?```$', '', sql)
        sql = sql.strip()

    if not sql.upper().startswith('SELECT'):
        raise ValueError("Only SELECT queries are allowed")

    if FORBIDDEN_PATTERNS.search(sql):
        raise ValueError("Query contains forbidden operations")

    if FORBIDDEN_COLUMNS.search(sql):
        raise ValueError("Query accesses restricted columns")

    if 'INTO' in sql.upper().split('FROM')[0]:
        raise ValueError("SELECT INTO is not allowed")

    # LIMIT 강제
    if 'LIMIT' not in sql.upper():
        sql += ' LIMIT 100'

    return sql


GENERAL_SYSTEM_PROMPT = """You are a helpful AI assistant for an invoice management system.
Answer the user's question concisely in the same language they used.
If the question is about invoice data, let them know they can ask specific data questions and you'll look it up.
Keep answers brief (2-3 sentences)."""


async def process_chat_message(
    db: AsyncSession,
    company_id: Optional[UUID],
    message: str,
    chat_mode: str = "invoice_only",
) -> dict:
    """자연어 질의 처리: 질문 → SQL 생성 → 실행 → 자연어 답변"""
    import anthropic

    if not settings.ANTHROPIC_API_KEY or settings.ANTHROPIC_API_KEY == "your-anthropic-api-key":
        return {"answer": "AI service is not configured. Please set ANTHROPIC_API_KEY.", "sql": None, "data": None}

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    # Hybrid 모드: 먼저 질문이 DB 관련인지 판별
    if chat_mode == "hybrid":
        try:
            classify_response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=10,
                system="Classify if this question is about invoice/payment/vendor/company DATA that requires a database query. Reply ONLY 'DB' or 'GENERAL'. Nothing else.",
                messages=[{"role": "user", "content": message}],
            )
            classification = classify_response.content[0].text.strip().upper()
        except Exception:
            classification = "DB"

        if classification == "GENERAL":
            try:
                general_response = client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=1024,
                    system=GENERAL_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": message}],
                )
                return {"answer": general_response.content[0].text.strip(), "sql": None, "data": None}
            except Exception as e:
                logger.error("Claude API error (general): %s", e)
                return {"answer": "Failed to process your question.", "sql": None, "data": None}

    # invoice_only 모드이거나 DB 질문인 경우
    # Step 1: 질문 → SQL 생성
    try:
        sql_response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SQL_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": message}],
        )
        generated_sql = sql_response.content[0].text.strip()
    except Exception as e:
        logger.error("Claude API error (SQL generation): %s", e)
        return {"answer": "Failed to process your question. Please try again.", "sql": None, "data": None}

    # Step 2: SQL 검증
    try:
        validated_sql = _validate_sql(generated_sql)
    except ValueError as e:
        logger.warning("SQL validation failed: %s — SQL: %s", e, generated_sql)
        return {"answer": "I couldn't generate a safe query for that question. Please try rephrasing.", "sql": None, "data": None}

    # Step 3: SQL 실행
    try:
        params = {}
        if company_id:
            params["company_id"] = str(company_id)

        async with db.begin_nested():
            await db.execute(text("SET LOCAL statement_timeout = '5000'"))
            result = await db.execute(text(validated_sql), params)
            columns = list(result.keys())
            rows = result.fetchall()
            data = [dict(zip(columns, row)) for row in rows[:100]]

        # JSON serialization을 위해 특수 타입 변환
        for row in data:
            for k, v in row.items():
                if hasattr(v, 'isoformat'):
                    row[k] = v.isoformat()
                elif isinstance(v, UUID):
                    row[k] = str(v)
                elif hasattr(v, '__float__'):
                    row[k] = float(v)

    except Exception as e:
        logger.warning("Query execution failed: %s — SQL: %s", e, validated_sql)
        return {
            "answer": "The query could not be executed. Please try a different question.",
            "sql": validated_sql,
            "data": None,
        }

    # Step 4: 결과 → 자연어 답변
    try:
        result_summary = json.dumps(data[:20], ensure_ascii=False, default=str)
        answer_response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=ANSWER_SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": f"Question: {message}\n\nQuery results ({len(data)} rows):\n{result_summary}",
            }],
        )
        answer = answer_response.content[0].text.strip()
    except Exception as e:
        logger.error("Claude API error (answer generation): %s", e)
        answer = f"Query returned {len(data)} rows."

    return {"answer": answer, "sql": validated_sql, "data": data[:20]}
