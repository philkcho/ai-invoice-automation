"""
샘플 인보이스 PDF 5개 생성 스크립트

AI 인보이스 자동화 시스템의 OCR 테스트/데모용.
실제 미국 인보이스 레이아웃과 동일한 형식으로 생성.

사용법: python generate_sample_invoices.py
출력: 현재 디렉토리에 5개 PDF 파일 생성
"""

import os
from datetime import date
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
)
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER


def create_styles():
    """공통 스타일 정의"""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="VendorName",
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1a1a2e"),
    ))
    styles.add(ParagraphStyle(
        name="InvoiceTitle",
        fontName="Helvetica-Bold",
        fontSize=28,
        leading=32,
        alignment=TA_RIGHT,
        textColor=colors.HexColor("#2d6a4f"),
    ))
    styles.add(ParagraphStyle(
        name="VendorDetail",
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#444444"),
    ))
    styles.add(ParagraphStyle(
        name="HeaderLabel",
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        alignment=TA_RIGHT,
        textColor=colors.HexColor("#666666"),
    ))
    styles.add(ParagraphStyle(
        name="HeaderValue",
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        alignment=TA_RIGHT,
        textColor=colors.HexColor("#1a1a2e"),
    ))
    styles.add(ParagraphStyle(
        name="SectionTitle",
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#2d6a4f"),
        spaceBefore=4,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name="BillToText",
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#333333"),
    ))
    styles.add(ParagraphStyle(
        name="FooterText",
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#888888"),
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        name="TotalLabel",
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        alignment=TA_RIGHT,
        textColor=colors.HexColor("#1a1a2e"),
    ))
    styles.add(ParagraphStyle(
        name="TotalValue",
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        alignment=TA_RIGHT,
        textColor=colors.HexColor("#2d6a4f"),
    ))

    return styles


def fmt_currency(amount: float, currency: str = "USD") -> str:
    """통화 포맷"""
    if currency == "JPY":
        return f"¥{amount:,.0f}"
    return f"${amount:,.2f}"


def build_invoice_pdf(filepath: str, data: dict):
    """인보이스 PDF 생성"""
    styles = create_styles()
    currency = data.get("currency", "USD")

    doc = SimpleDocTemplate(
        filepath,
        pagesize=letter,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )

    elements = []
    page_width = letter[0] - 1.2 * inch  # usable width

    # ── 헤더: Vendor Info (좌) + INVOICE 제목/메타 (우) ──
    vendor = data["vendor"]
    vendor_info = (
        f'{vendor["name"]}<br/>'
        f'{vendor["address"]}<br/>'
        f'{vendor["city_state_zip"]}<br/>'
        f'Tel: {vendor["phone"]}<br/>'
        f'Email: {vendor["email"]}<br/>'
        f'EIN: {vendor["ein"]}'
    )

    header_meta_lines = [
        f'<b>Invoice #:</b> {data["invoice_number"]}',
        f'<b>Date:</b> {data["invoice_date"]}',
        f'<b>Due Date:</b> {data["due_date"]}',
    ]
    if data.get("po_number"):
        header_meta_lines.append(f'<b>PO #:</b> {data["po_number"]}')
    header_meta_lines.append(f'<b>Terms:</b> {data["payment_terms"]}')

    header_table_data = [[
        Paragraph(vendor_info, styles["VendorDetail"]),
        [
            Paragraph("INVOICE", styles["InvoiceTitle"]),
            Spacer(1, 6),
        ] + [Paragraph(line, styles["HeaderValue"]) for line in header_meta_lines],
    ]]

    header_table = Table(
        header_table_data,
        colWidths=[page_width * 0.55, page_width * 0.45],
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 12))

    # ── 구분선 ──
    elements.append(HRFlowable(
        width="100%", thickness=2,
        color=colors.HexColor("#2d6a4f"),
        spaceBefore=4, spaceAfter=12,
    ))

    # ── Bill To 영역 ──
    bill_to = data["bill_to"]
    bill_to_content = (
        f'{bill_to["name"]}<br/>'
        f'{bill_to["address"]}<br/>'
        f'{bill_to["city_state_zip"]}'
    )
    if bill_to.get("attn"):
        bill_to_content += f'<br/>Attn: {bill_to["attn"]}'

    bill_to_table_data = [[
        [
            Paragraph("BILL TO:", styles["SectionTitle"]),
            Paragraph(bill_to_content, styles["BillToText"]),
        ],
        [
            Paragraph("SHIP TO:", styles["SectionTitle"]),
            Paragraph(
                f'{bill_to["name"]}<br/>{bill_to["address"]}<br/>{bill_to["city_state_zip"]}',
                styles["BillToText"],
            ),
        ] if data.get("show_ship_to", True) else [],
    ]]

    bill_to_table = Table(
        bill_to_table_data,
        colWidths=[page_width * 0.5, page_width * 0.5],
    )
    bill_to_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8f9fa")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#dee2e6")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (0, 0), 10),
        ("LEFTPADDING", (1, 0), (1, 0), 10),
    ]))
    elements.append(bill_to_table)
    elements.append(Spacer(1, 16))

    # ── Line Items 테이블 ──
    line_items = data["line_items"]

    # 테이블 헤더
    th_style = ParagraphStyle(
        "THStyle", fontName="Helvetica-Bold", fontSize=9,
        textColor=colors.white, leading=12,
    )
    th_style_right = ParagraphStyle(
        "THStyleR", parent=th_style, alignment=TA_RIGHT,
    )
    td_style = ParagraphStyle(
        "TDStyle", fontName="Helvetica", fontSize=9,
        textColor=colors.HexColor("#333333"), leading=12,
    )
    td_style_right = ParagraphStyle(
        "TDStyleR", parent=td_style, alignment=TA_RIGHT,
    )

    table_data = [[
        Paragraph("#", th_style),
        Paragraph("Description", th_style),
        Paragraph("Qty", th_style_right),
        Paragraph("Unit Price", th_style_right),
        Paragraph("Amount", th_style_right),
    ]]

    for i, item in enumerate(line_items, 1):
        amount = item["quantity"] * item["unit_price"]
        table_data.append([
            Paragraph(str(i), td_style),
            Paragraph(item["description"], td_style),
            Paragraph(str(item["quantity"]), td_style_right),
            Paragraph(fmt_currency(item["unit_price"], currency), td_style_right),
            Paragraph(fmt_currency(amount, currency), td_style_right),
        ])

    col_widths = [
        page_width * 0.06,
        page_width * 0.46,
        page_width * 0.1,
        page_width * 0.19,
        page_width * 0.19,
    ]

    items_table = Table(table_data, colWidths=col_widths)

    # 테이블 스타일
    table_style_cmds = [
        # 헤더 행
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2d6a4f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        # 전체
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        # 그리드
        ("GRID", (0, 0), (-1, 0), 0.5, colors.HexColor("#2d6a4f")),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#dee2e6")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]

    # 짝수 행 배경색
    for i in range(1, len(table_data)):
        if i % 2 == 0:
            table_style_cmds.append(
                ("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f8f9fa"))
            )

    items_table.setStyle(TableStyle(table_style_cmds))
    elements.append(items_table)
    elements.append(Spacer(1, 12))

    # ── 금액 요약 (우측 정렬) ──
    subtotal = data["subtotal"]
    tax_rate = data["tax_rate"]
    tax_amount = data["tax_amount"]
    total = data["total"]

    summary_label_style = ParagraphStyle(
        "SumLabel", fontName="Helvetica", fontSize=10,
        alignment=TA_RIGHT, textColor=colors.HexColor("#555555"),
        leading=14,
    )
    summary_value_style = ParagraphStyle(
        "SumValue", fontName="Helvetica", fontSize=10,
        alignment=TA_RIGHT, textColor=colors.HexColor("#1a1a2e"),
        leading=14,
    )

    tax_label = f"Sales Tax ({tax_rate * 100:.1f}%):" if tax_rate else "Tax:"

    summary_data = [
        [
            Paragraph("Subtotal:", summary_label_style),
            Paragraph(fmt_currency(subtotal, currency), summary_value_style),
        ],
        [
            Paragraph(tax_label, summary_label_style),
            Paragraph(fmt_currency(tax_amount, currency), summary_value_style),
        ],
        [
            Paragraph("", summary_label_style),
            HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2d6a4f")),
        ],
        [
            Paragraph("TOTAL DUE:", styles["TotalLabel"]),
            Paragraph(fmt_currency(total, currency), styles["TotalValue"]),
        ],
    ]

    summary_table = Table(
        summary_data,
        colWidths=[page_width * 0.15, page_width * 0.2],
        hAlign="RIGHT",
    )
    summary_table.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#e8f5e9")),
        ("TOPPADDING", (0, -1), (-1, -1), 8),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 20))

    # ── 구분선 ──
    elements.append(HRFlowable(
        width="100%", thickness=1,
        color=colors.HexColor("#dee2e6"),
        spaceBefore=4, spaceAfter=12,
    ))

    # ── 결제 정보 ──
    payment_info = data.get("payment_info", {})
    if payment_info:
        elements.append(Paragraph("PAYMENT INFORMATION", styles["SectionTitle"]))
        elements.append(Spacer(1, 4))

        pay_lines = []
        if payment_info.get("bank_name"):
            pay_lines.append(f"<b>Bank:</b> {payment_info['bank_name']}")
        if payment_info.get("account_name"):
            pay_lines.append(f"<b>Account Name:</b> {payment_info['account_name']}")
        if payment_info.get("routing_number"):
            pay_lines.append(f"<b>Routing #:</b> {payment_info['routing_number']}")
        if payment_info.get("account_number"):
            pay_lines.append(f"<b>Account #:</b> {payment_info['account_number']}")
        if payment_info.get("swift"):
            pay_lines.append(f"<b>SWIFT:</b> {payment_info['swift']}")
        if payment_info.get("note"):
            pay_lines.append(f"<br/><i>{payment_info['note']}</i>")

        elements.append(Paragraph("<br/>".join(pay_lines), styles["BillToText"]))
        elements.append(Spacer(1, 16))

    # ── 하단 노트 ──
    if data.get("notes"):
        elements.append(Paragraph("NOTES", styles["SectionTitle"]))
        elements.append(Paragraph(data["notes"], styles["BillToText"]))
        elements.append(Spacer(1, 12))

    # ── 푸터 ──
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(
        width="100%", thickness=0.5,
        color=colors.HexColor("#cccccc"),
        spaceBefore=4, spaceAfter=8,
    ))
    elements.append(Paragraph(
        f"Thank you for your business! | {vendor['name']} | {vendor['phone']}",
        styles["FooterText"],
    ))

    doc.build(elements)
    print(f"  [OK] Generated: {filepath}")


# ════════════════════════════════════════════════════════════════
# 인보이스 데이터 정의
# ════════════════════════════════════════════════════════════════

BILL_TO_ACME = {
    "name": "Acme Corporation",
    "address": "100 Main Street, Suite 500",
    "city_state_zip": "New York, NY 10001",
    "attn": "Accounts Payable",
}

INVOICES = [
    # ── 1. Tech Solutions Inc. — PO 인보이스 (전자제품) ──
    {
        "filename": "INV-2026-1001_TechSolutions.pdf",
        "vendor": {
            "name": "Tech Solutions Inc.",
            "address": "4521 Innovation Drive, Suite 200",
            "city_state_zip": "San Jose, CA 95134",
            "phone": "(408) 555-0192",
            "email": "billing@techsolutions.com",
            "ein": "82-4193756",
        },
        "invoice_number": "INV-2026-1001",
        "invoice_date": "2026-03-01",
        "due_date": "2026-03-31",
        "po_number": "PO-2026-0451",
        "payment_terms": "Net 30",
        "currency": "USD",
        "bill_to": BILL_TO_ACME,
        "show_ship_to": True,
        "line_items": [
            {
                "description": "Dell Latitude 5540 Laptop (Intel i7, 16GB RAM, 512GB SSD)",
                "quantity": 10,
                "unit_price": 1249.99,
            },
            {
                "description": 'Dell UltraSharp U2723QE 27" 4K Monitor',
                "quantity": 10,
                "unit_price": 579.99,
            },
            {
                "description": "Logitech MX Keys Wireless Keyboard + MX Master 3S Mouse Combo",
                "quantity": 10,
                "unit_price": 199.99,
            },
        ],
        "subtotal": 20299.70,
        "tax_rate": 0.0875,
        "tax_amount": 1776.22,
        "total": 22075.92,
        "payment_info": {
            "bank_name": "Silicon Valley Bank",
            "account_name": "Tech Solutions Inc.",
            "routing_number": "121140399",
            "account_number": "****4821",
            "note": "Please reference invoice number on all payments.",
        },
        "notes": "All items are covered by manufacturer warranty. "
                 "Returns accepted within 30 days with original packaging.",
    },

    # ── 2. Global Logistics LLC — 운송 서비스 ──
    {
        "filename": "INV-2026-1002_GlobalLogistics.pdf",
        "vendor": {
            "name": "Global Logistics LLC",
            "address": "7800 Harbor Boulevard",
            "city_state_zip": "Long Beach, CA 90802",
            "phone": "(562) 555-0347",
            "email": "invoices@globallogistics.com",
            "ein": "36-7284519",
        },
        "invoice_number": "INV-2026-1002",
        "invoice_date": "2026-03-05",
        "due_date": "2026-04-04",
        "po_number": "PO-2026-0455",
        "payment_terms": "Net 30",
        "currency": "USD",
        "bill_to": BILL_TO_ACME,
        "show_ship_to": False,
        "line_items": [
            {
                "description": "International Freight Shipping — Shanghai to Long Beach "
                               "(40ft Container, FCL) — BOL #GLBL-2026-8834",
                "quantity": 1,
                "unit_price": 4850.00,
            },
            {
                "description": "Customs Brokerage & Documentation Fee "
                               "(Import clearance, ISF filing, duty calculation)",
                "quantity": 1,
                "unit_price": 375.00,
            },
        ],
        "subtotal": 5225.00,
        "tax_rate": 0.0,
        "tax_amount": 0.00,
        "total": 5225.00,
        "payment_info": {
            "bank_name": "Chase Commercial Banking",
            "account_name": "Global Logistics LLC",
            "routing_number": "322271627",
            "account_number": "****6190",
            "note": "Wire transfer preferred for amounts over $5,000.",
        },
        "notes": "Freight charges are tax-exempt per IRC §4253. "
                 "Delivery confirmation available upon request.",
    },

    # ── 3. Pacific Design Studio — 디자인 컨설팅 서비스 ──
    {
        "filename": "INV-2026-1003_PacificDesign.pdf",
        "vendor": {
            "name": "Pacific Design Studio",
            "address": "1200 NW Glisan Street, Floor 3",
            "city_state_zip": "Portland, OR 97209",
            "phone": "(503) 555-0821",
            "email": "accounts@pacificdesign.studio",
            "ein": "93-1847362",
        },
        "invoice_number": "INV-2026-1003",
        "invoice_date": "2026-03-10",
        "due_date": "2026-04-09",
        "po_number": None,
        "payment_terms": "Net 30",
        "currency": "USD",
        "bill_to": {
            "name": "Acme Corporation",
            "address": "100 Main Street, Suite 500",
            "city_state_zip": "New York, NY 10001",
            "attn": "Marketing Department",
        },
        "show_ship_to": False,
        "line_items": [
            {
                "description": "Brand Identity Design — Logo, color palette, typography system "
                               "(Senior Designer @ $175/hr × 24 hrs)",
                "quantity": 24,
                "unit_price": 175.00,
            },
            {
                "description": "Website UI/UX Design — Wireframes and high-fidelity mockups "
                               "for 12 pages (Designer @ $150/hr × 40 hrs)",
                "quantity": 40,
                "unit_price": 150.00,
            },
            {
                "description": "Marketing Collateral — Brochure, business cards, letterhead "
                               "(Designer @ $150/hr × 16 hrs)",
                "quantity": 16,
                "unit_price": 150.00,
            },
            {
                "description": "Project Management & Client Coordination "
                               "(PM @ $125/hr × 8 hrs)",
                "quantity": 8,
                "unit_price": 125.00,
            },
        ],
        "subtotal": 13600.00,
        "tax_rate": 0.0,
        "tax_amount": 0.00,
        "total": 13600.00,
        "payment_info": {
            "bank_name": "Columbia Bank",
            "account_name": "Pacific Design Studio LLC",
            "routing_number": "323270436",
            "account_number": "****7735",
            "note": "ACH or check accepted. Late payments subject to 1.5% monthly fee.",
        },
        "notes": "Professional services are exempt from Oregon sales tax. "
                 "All deliverables include two rounds of revisions.",
    },

    # ── 4. Metro Power & Gas — 유틸리티 요금 ──
    {
        "filename": "INV-2026-1004_MetroPower.pdf",
        "vendor": {
            "name": "Metro Power & Gas",
            "address": "One Energy Plaza",
            "city_state_zip": "Newark, NJ 07102",
            "phone": "(973) 555-0600",
            "email": "customerservice@metropower.com",
            "ein": "22-3691847",
        },
        "invoice_number": "INV-2026-1004",
        "invoice_date": "2026-03-01",
        "due_date": "2026-03-21",
        "po_number": None,
        "payment_terms": "Net 20",
        "currency": "USD",
        "bill_to": {
            "name": "Acme Corporation",
            "address": "100 Main Street, Suite 500",
            "city_state_zip": "New York, NY 10001",
            "attn": "Facilities Management",
        },
        "show_ship_to": False,
        "line_items": [
            {
                "description": "Electricity Service — Account #MPG-8842210 — "
                               "Service Period: Feb 1-28, 2026 — "
                               "Usage: 12,450 kWh @ $0.1342/kWh",
                "quantity": 1,
                "unit_price": 1671.09,
            },
        ],
        "subtotal": 1671.09,
        "tax_rate": 0.04,
        "tax_amount": 66.84,
        "total": 1737.93,
        "payment_info": {
            "bank_name": "TD Bank",
            "account_name": "Metro Power & Gas Corp",
            "routing_number": "031101266",
            "account_number": "****3042",
            "note": "Auto-pay enrollment available at metropower.com/autopay",
        },
        "notes": "Billing period: February 1-28, 2026. "
                 "Meter reading date: February 28, 2026. "
                 "Late payment fee: $25.00 after due date.",
    },

    # ── 5. Sakura Trading Co. — 일본 엔화 PO 인보이스 ──
    {
        "filename": "INV-2026-1005_SakuraTrading.pdf",
        "vendor": {
            "name": "Sakura Trading Co., Ltd.",
            "address": "2-4-1 Marunouchi, Chiyoda-ku",
            "city_state_zip": "Tokyo 100-0005, Japan",
            "phone": "+81-3-5555-0198",
            "email": "export@sakura-trading.co.jp",
            "ein": "T2-0100-1234-5678",
        },
        "invoice_number": "INV-2026-1005",
        "invoice_date": "2026-03-15",
        "due_date": "2026-05-14",
        "po_number": "PO-2026-0460",
        "payment_terms": "Net 60",
        "currency": "JPY",
        "bill_to": BILL_TO_ACME,
        "show_ship_to": True,
        "line_items": [
            {
                "description": "Precision Ceramic Bearings — Model SKR-7200 "
                               "(Industrial grade, 50mm × 90mm × 20mm)",
                "quantity": 500,
                "unit_price": 3200,
            },
            {
                "description": "High-Purity Silicon Carbide Powder — Grade A "
                               "(25kg bags, 99.5% purity)",
                "quantity": 20,
                "unit_price": 45000,
            },
        ],
        "subtotal": 2500000,
        "tax_rate": 0.10,
        "tax_amount": 250000,
        "total": 2750000,
        "payment_info": {
            "bank_name": "Mizuho Bank, Ltd.",
            "account_name": "Sakura Trading Co., Ltd.",
            "swift": "MHCBJPJT",
            "account_number": "****8891",
            "note": "Please remit in JPY via wire transfer. "
                    "Beneficiary bank: Mizuho Bank Marunouchi Branch.",
        },
        "notes": "Prices quoted in Japanese Yen (JPY). "
                 "Consumption Tax (10%) included as per Japanese tax law. "
                 "Incoterms: FOB Tokyo Port. "
                 "All goods subject to export inspection.",
    },
]


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Generating {len(INVOICES)} sample invoices...\n")

    for inv_data in INVOICES:
        filepath = os.path.join(script_dir, inv_data["filename"])
        build_invoice_pdf(filepath, inv_data)

    print(f"\nDone! {len(INVOICES)} PDF files generated in: {script_dir}")


if __name__ == "__main__":
    main()
