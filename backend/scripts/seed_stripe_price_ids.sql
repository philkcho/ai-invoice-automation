-- Stripe Sandbox에서 Product/Price 생성 후 발급받은 price_xxx ID를 아래에 입력
-- 사용법: docker-compose exec db psql -U invoice_user -d invoice_db -f /app/scripts/seed_stripe_price_ids.sql
--
-- Stripe 대시보드에서 아래 3개 상품을 Recurring (Monthly)로 생성:
--   AI Invoice - Starter    : $29/mo  → price_xxx
--   AI Invoice - Professional: $79/mo  → price_xxx
--   AI Invoice - Enterprise  : $199/mo → price_xxx

UPDATE subscription_plans
SET stripe_price_id = 'price_1TDbLvC2DtYPu97ePuz2U09R'
WHERE name = 'starter';

UPDATE subscription_plans
SET stripe_price_id = 'price_1TDbMMC2DtYPu97ewcamQPnz'
WHERE name = 'professional';

UPDATE subscription_plans
SET stripe_price_id = 'price_1TDbMlC2DtYPu97eYTSr78JX'
WHERE name = 'enterprise';

-- Free Trial은 Stripe 결제 불필요 (stripe_price_id = NULL 유지)

-- 확인
SELECT name, display_name, monthly_price, stripe_price_id, is_active
FROM subscription_plans
ORDER BY sort_order;
