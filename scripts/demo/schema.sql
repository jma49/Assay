-- Demo e-commerce dataset for the check scripts in checks.ts.
-- Deterministic (setseed) so every seed produces the same findings.
DROP SCHEMA IF EXISTS demo CASCADE;
CREATE SCHEMA demo;

CREATE TABLE demo.customers (
  id          serial PRIMARY KEY,
  email       text NOT NULL,
  full_name   text NOT NULL,
  country     text NOT NULL,
  created_at  timestamptz NOT NULL
);

CREATE TABLE demo.products (
  id          serial PRIMARY KEY,
  sku         text NOT NULL UNIQUE,
  name        text NOT NULL,
  category    text NOT NULL,
  price       numeric(10, 2) NOT NULL,
  cost        numeric(10, 2) NOT NULL
);

CREATE TABLE demo.inventory (
  product_id  int PRIMARY KEY REFERENCES demo.products(id),
  on_hand     int NOT NULL,
  reserved    int NOT NULL DEFAULT 0
);

CREATE TABLE demo.orders (
  id           serial PRIMARY KEY,
  customer_id  int NOT NULL REFERENCES demo.customers(id),
  status       text NOT NULL,
  total        numeric(10, 2) NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL
);

-- No FK on product_id on purpose: the orphan-order-items check needs orphans.
CREATE TABLE demo.order_items (
  id          serial PRIMARY KEY,
  order_id    int NOT NULL REFERENCES demo.orders(id),
  product_id  int NOT NULL,
  quantity    int NOT NULL,
  unit_price  numeric(10, 2) NOT NULL
);

CREATE TABLE demo.payments (
  id          serial PRIMARY KEY,
  order_id    int NOT NULL REFERENCES demo.orders(id),
  amount      numeric(10, 2) NOT NULL,
  refunded    numeric(10, 2) NOT NULL DEFAULT 0,
  method      text NOT NULL,
  paid_at     timestamptz NOT NULL
);

SELECT setseed(0.42);

INSERT INTO demo.customers (email, full_name, country, created_at)
SELECT
  'customer' || g || '@example.com',
  (ARRAY['Alex','Sam','Jordan','Taylor','Casey','Riley','Morgan','Jamie'])[1 + g % 8]
    || ' ' || (ARRAY['Chen','Smith','Garcia','Wang','Kim','Brown','Li','Lopez'])[1 + (g / 8) % 8],
  (ARRAY['US','CA','CN','DE','JP','GB'])[1 + g % 6],
  now() - (random() * interval '365 days')
FROM generate_series(1, 200) g;

INSERT INTO demo.products (sku, name, category, price, cost)
SELECT
  'SKU-' || lpad(g::text, 4, '0'),
  (ARRAY['Desk','Chair','Lamp','Monitor','Keyboard','Mouse'])[1 + g % 6] || ' ' || g,
  (ARRAY['furniture','furniture','lighting','electronics','electronics','electronics'])[1 + g % 6],
  round((20 + random() * 480)::numeric, 2),
  0
FROM generate_series(1, 60) g;
UPDATE demo.products SET cost = round(price * (0.4 + random() * 0.3)::numeric, 2);

INSERT INTO demo.inventory (product_id, on_hand, reserved)
SELECT id, 5 + floor(random() * 200)::int, floor(random() * 5)::int FROM demo.products;

INSERT INTO demo.orders (customer_id, status, created_at)
SELECT
  1 + floor(random() * 200)::int,
  CASE WHEN r < 0.80 THEN 'paid' WHEN r < 0.88 THEN 'shipped'
       WHEN r < 0.95 THEN 'cancelled' ELSE 'pending' END,
  CASE WHEN r >= 0.95 THEN now() - (random() * interval '2 days')
       ELSE now() - (random() * interval '90 days') END
FROM (SELECT random() AS r FROM generate_series(1, 1500)) s;

INSERT INTO demo.order_items (order_id, product_id, quantity, unit_price)
SELECT x.order_id, p.id, x.quantity, p.price
FROM (
  SELECT o.id AS order_id,
         1 + floor(random() * 60)::int AS product_id,
         1 + floor(random() * 3)::int AS quantity
  FROM demo.orders o
  -- "+ 0 * o.id" makes the item count per order instead of evaluated once
  CROSS JOIN LATERAL generate_series(1, 1 + floor(random() * 3)::int + 0 * o.id)
) x
JOIN demo.products p ON p.id = x.product_id;

UPDATE demo.orders o
SET total = s.total
FROM (SELECT order_id, sum(quantity * unit_price) AS total
      FROM demo.order_items GROUP BY order_id) s
WHERE s.order_id = o.id;

INSERT INTO demo.payments (order_id, amount, method, paid_at)
SELECT id, total,
  (ARRAY['card','card','card','paypal','bank_transfer'])[1 + floor(random() * 5)::int],
  created_at + interval '3 minutes'
FROM demo.orders WHERE status IN ('paid', 'shipped');

-- ---------------------------------------------------------------------------
-- Injected data quality issues, one block per check in checks.ts
-- ---------------------------------------------------------------------------

-- duplicate-orders: 6 orders placed twice within a minute
WITH src AS (SELECT * FROM demo.orders WHERE status = 'paid' ORDER BY id LIMIT 6),
dup AS (
  INSERT INTO demo.orders (customer_id, status, total, created_at)
  SELECT customer_id, status, total, created_at + interval '40 seconds' FROM src
  RETURNING id, customer_id, total, created_at
)
INSERT INTO demo.payments (order_id, amount, method, paid_at)
SELECT id, total, 'card', created_at + interval '1 minute' FROM dup;

-- negative-inventory
UPDATE demo.inventory SET on_hand = -3 WHERE product_id IN (7, 23, 41);

-- paid-orders-missing-payment
DELETE FROM demo.payments WHERE order_id IN (
  SELECT id FROM demo.orders WHERE status = 'paid' ORDER BY id DESC LIMIT 5
);

-- payment-amount-mismatch
UPDATE demo.payments SET amount = amount - 10.00 WHERE id IN (
  SELECT id FROM demo.payments ORDER BY id LIMIT 4 OFFSET 100
);

-- invalid-customer-emails
UPDATE demo.customers SET email = 'no-at-sign.example.com' WHERE id = 17;
UPDATE demo.customers SET email = 'trailing@space.com ' WHERE id = 58;
UPDATE demo.customers SET email = '' WHERE id = 133;

-- stale-pending-orders
UPDATE demo.orders SET created_at = now() - interval '12 days' WHERE id IN (
  SELECT id FROM demo.orders WHERE status = 'pending' ORDER BY id LIMIT 7
);

-- orphan-order-items: products that no longer exist
INSERT INTO demo.order_items (order_id, product_id, quantity, unit_price)
VALUES (10, 9001, 1, 49.00), (250, 9002, 2, 15.50);

-- price-below-cost
UPDATE demo.products SET cost = price + 5.00 WHERE id IN (12, 35);
