"""
3-Layer Validation Engine
설계서 v12 기준:
  Layer 1: Global Rules (MAX_AMOUNT, PAYMENT_TERMS, DUPLICATE_CHECK 등)
  Layer 2: Type-based Rules (PO match, rate check, cycle check 등)
  Layer 3: Contract Rules (contracted price, max order amount 등)

이 서비스는 Phase 6에서 Invoice 모델과 연동되어 실행됨.
현재는 엔진 구조와 규칙 평가 로직만 구현.
"""
import logging
from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.global_validation_rule import GlobalValidationRule
from app.models.type_rule_set import TypeRuleSet
from app.models.type_rule_condition import TypeRuleCondition
from app.models.vendor_contract import VendorContract

logger = logging.getLogger(__name__)


class ValidationResult:
    def __init__(self, layer: str, rule_name: str, condition_name: str,
                 result: str, reason: str, rule_id: UUID | None = None,
                 rule_table: str | None = None):
        self.layer = layer
        self.rule_name = rule_name
        self.condition_name = condition_name
        self.result = result  # PASS / FAIL / WARNING
        self.reason = reason
        self.rule_id = rule_id
        self.rule_table = rule_table

    def to_dict(self) -> dict:
        return {
            "layer": self.layer,
            "rule_name": self.rule_name,
            "condition_name": self.condition_name,
            "result": self.result,
            "reason": self.reason,
            "rule_id": str(self.rule_id) if self.rule_id else None,
            "rule_table": self.rule_table,
        }


async def run_layer1_global(
    db: AsyncSession,
    company_id: UUID,
    invoice_data: dict,
) -> list[ValidationResult]:
    """Layer 1: Global Rules 실행"""
    results = []

    # 회사별 + 시스템 기본 규칙 조회
    query = select(GlobalValidationRule).where(
        or_(GlobalValidationRule.company_id == company_id, GlobalValidationRule.company_id.is_(None)),
        GlobalValidationRule.is_active == True,
    )
    rules = (await db.execute(query)).scalars().all()

    for rule in rules:
        config = rule.config or {}
        result = _evaluate_global_rule(rule, config, invoice_data)
        if result:
            results.append(result)

    return results


def _evaluate_global_rule(rule: GlobalValidationRule, config: dict, invoice_data: dict) -> Optional[ValidationResult]:
    """개별 글로벌 규칙 평가"""
    amount_total = invoice_data.get("amount_total", 0)

    if rule.rule_type == "MAX_AMOUNT":
        max_amount = config.get("max_invoice_amount", float("inf"))
        if amount_total > max_amount:
            return ValidationResult(
                layer="GLOBAL", rule_name=rule.rule_name,
                condition_name="MAX_AMOUNT", result=rule.severity,
                reason=f"Invoice amount ${amount_total:,.2f} exceeds max ${max_amount:,.2f}",
                rule_id=rule.id, rule_table="global_validation_rules",
            )

    elif rule.rule_type == "PAYMENT_TERMS":
        allowed = config.get("allowed_terms", [])
        terms = invoice_data.get("payment_terms")
        if terms and allowed and terms not in allowed:
            return ValidationResult(
                layer="GLOBAL", rule_name=rule.rule_name,
                condition_name="PAYMENT_TERMS", result=rule.severity,
                reason=f"Payment terms '{terms}' not in allowed: {allowed}",
                rule_id=rule.id, rule_table="global_validation_rules",
            )

    elif rule.rule_type == "DUE_DATE":
        grace_days = config.get("grace_days", 0)
        due_date_str = invoice_data.get("due_date")
        if due_date_str:
            due = date.fromisoformat(due_date_str) if isinstance(due_date_str, str) else due_date_str
            if due < date.today() - timedelta(days=grace_days):
                return ValidationResult(
                    layer="GLOBAL", rule_name=rule.rule_name,
                    condition_name="DUE_DATE", result=rule.severity,
                    reason=f"Invoice is overdue (due: {due}, grace: {grace_days} days)",
                    rule_id=rule.id, rule_table="global_validation_rules",
                )

    # DUPLICATE_CHECK, ANNUAL_LIMIT, REQUIRED_DOC는 Phase 6에서 DB 조회와 함께 구현
    return None


async def run_layer2_type_rules(
    db: AsyncSession,
    company_id: UUID,
    invoice_type_id: UUID,
    invoice_data: dict,
) -> list[ValidationResult]:
    """Layer 2: Type-based Rules 실행"""
    results = []

    query = select(TypeRuleSet).where(
        or_(TypeRuleSet.company_id == company_id, TypeRuleSet.company_id.is_(None)),
        TypeRuleSet.invoice_type_id == invoice_type_id,
        TypeRuleSet.is_active == True,
    )
    rule_sets = (await db.execute(query)).scalars().all()

    for rule_set in rule_sets:
        for condition in rule_set.conditions:
            if not condition.is_active:
                continue
            result = _evaluate_type_condition(rule_set, condition, invoice_data)
            if result:
                results.append(result)

    return results


def _evaluate_type_condition(
    rule_set: TypeRuleSet, condition: TypeRuleCondition, invoice_data: dict
) -> Optional[ValidationResult]:
    """개별 타입 규칙 조건 평가"""
    field_value = invoice_data.get(condition.field_target) if condition.field_target else None
    threshold = float(condition.threshold_value) if condition.threshold_value else None

    if condition.condition_type == "AMOUNT_MATCH" and field_value is not None and threshold is not None:
        if condition.operator == "EQ" and float(field_value) != threshold:
            return ValidationResult(
                layer="TYPE", rule_name=rule_set.rule_set_name,
                condition_name=condition.condition_name, result=condition.severity,
                reason=f"{condition.field_target} = {field_value}, expected {threshold}",
                rule_id=condition.id, rule_table="type_rule_conditions",
            )

    if condition.condition_type == "RATE_CHECK" and field_value is not None and threshold is not None:
        if condition.operator == "GT" and float(field_value) > threshold:
            return ValidationResult(
                layer="TYPE", rule_name=rule_set.rule_set_name,
                condition_name=condition.condition_name, result=condition.severity,
                reason=f"{condition.field_target} = {field_value}, exceeds {threshold}",
                rule_id=condition.id, rule_table="type_rule_conditions",
            )

    if condition.condition_type == "REQUIRES_APPROVER":
        if not invoice_data.get("has_approver"):
            return ValidationResult(
                layer="TYPE", rule_name=rule_set.rule_set_name,
                condition_name=condition.condition_name, result=condition.severity,
                reason="Approver is required for this invoice type",
                rule_id=condition.id, rule_table="type_rule_conditions",
            )

    return None


async def run_layer3_contract_rules(
    db: AsyncSession,
    company_id: UUID,
    vendor_id: UUID,
    invoice_data: dict,
) -> list[ValidationResult]:
    """Layer 3: Contract Rules 실행"""
    results = []

    query = select(VendorContract).where(
        VendorContract.company_id == company_id,
        VendorContract.vendor_id == vendor_id,
        VendorContract.is_active == True,
    )
    contracts = (await db.execute(query)).scalars().all()

    today = date.today()
    amount_total = invoice_data.get("amount_total", 0)

    for contract in contracts:
        # 계약 기간 체크
        if today < contract.effective_date or today > contract.expiry_date:
            results.append(ValidationResult(
                layer="CONTRACT", rule_name=contract.contract_name,
                condition_name="CONTRACT_PERIOD", result="WARNING",
                reason=f"Invoice date outside contract period ({contract.effective_date} ~ {contract.expiry_date})",
                rule_id=contract.id, rule_table="vendor_contracts",
            ))

        # 주문 금액 상한
        if contract.max_order_amount and amount_total > float(contract.max_order_amount):
            results.append(ValidationResult(
                layer="CONTRACT", rule_name=contract.contract_name,
                condition_name="MAX_ORDER_AMOUNT", result="FAIL",
                reason=f"Amount ${amount_total:,.2f} exceeds contract max ${float(contract.max_order_amount):,.2f}",
                rule_id=contract.id, rule_table="vendor_contracts",
            ))

        # 만료 경고
        days_to_expiry = (contract.expiry_date - today).days
        if 0 < days_to_expiry <= contract.expiry_warning_days:
            results.append(ValidationResult(
                layer="CONTRACT", rule_name=contract.contract_name,
                condition_name="CONTRACT_EXPIRY_WARNING", result="WARNING",
                reason=f"Contract expires in {days_to_expiry} days ({contract.expiry_date})",
                rule_id=contract.id, rule_table="vendor_contracts",
            ))

    return results


async def validate_invoice(
    db: AsyncSession,
    company_id: UUID,
    invoice_type_id: UUID,
    vendor_id: UUID,
    invoice_data: dict,
) -> dict:
    """3-Layer Validation 실행 → 종합 결과 반환"""
    layer1 = await run_layer1_global(db, company_id, invoice_data)
    layer2 = await run_layer2_type_rules(db, company_id, invoice_type_id, invoice_data)
    layer3 = await run_layer3_contract_rules(db, company_id, vendor_id, invoice_data)

    all_results = layer1 + layer2 + layer3
    has_fail = any(r.result == "FAIL" for r in all_results)
    has_warning = any(r.result == "WARNING" for r in all_results)

    if has_fail:
        overall = "FAIL"
    elif has_warning:
        overall = "WARNING"
    else:
        overall = "PASS"

    return {
        "overall": overall,
        "total_checks": len(all_results),
        "fail_count": sum(1 for r in all_results if r.result == "FAIL"),
        "warning_count": sum(1 for r in all_results if r.result == "WARNING"),
        "pass_count": sum(1 for r in all_results if r.result == "PASS"),
        "results": [r.to_dict() for r in all_results],
    }
