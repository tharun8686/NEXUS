-- ============================================================
-- NexusTech — Master Schema
-- Run ONCE on a fresh database.
-- mysql -u root -pEricjoel@2006 -e "CREATE DATABASE IF NOT EXISTS electronics_store;"
-- mysql -u root -pEricjoel@2006 electronics_store < db/schema.sql
-- ============================================================

USE electronics_store;

-- ── USERS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  user_id    INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  phone      VARCHAR(20)  DEFAULT NULL,
  address    VARCHAR(255) DEFAULT NULL,
  city       VARCHAR(100) DEFAULT NULL,
  pincode    VARCHAR(10)  DEFAULT NULL,
  country    VARCHAR(100) DEFAULT 'India',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── PRODUCTS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  product_id       INT AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  brand            VARCHAR(100),
  category         VARCHAR(50),
  price            DECIMAL(10,2) NOT NULL,
  original_price   DECIMAL(10,2) DEFAULT NULL,
  discount_percent DECIMAL(5,2)  DEFAULT NULL,
  offer_label      VARCHAR(100)  DEFAULT NULL,
  stock_quantity   INT DEFAULT 0,
  image_url        VARCHAR(500),
  specs            JSON,
  description      TEXT,
  rating           DECIMAL(3,1) DEFAULT 0,
  reviews_count    INT DEFAULT 0
);

-- ── REVIEWS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  review_id  INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id    INT NOT NULL DEFAULT 0,
  rating     INT NOT NULL,
  comment    TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(user_id)       ON DELETE SET DEFAULT
);

-- ── ORDERS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  order_id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  total_amount     DECIMAL(10,2) NOT NULL,
  status           VARCHAR(30) NOT NULL DEFAULT 'Pending',
  payment_method   VARCHAR(20) DEFAULT 'cod',
  delivery_address TEXT DEFAULT NULL,
  promo_code       VARCHAR(30) DEFAULT NULL,
  discount_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
  loyalty_discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ── ORDER ITEMS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  item_id           INT AUTO_INCREMENT PRIMARY KEY,
  order_id          INT NOT NULL,
  product_id        INT NOT NULL,
  quantity          INT NOT NULL,
  price_at_purchase DECIMAL(10,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id)   REFERENCES orders(order_id)     ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- ── WISHLISTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  wishlist_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  product_id  INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_product (user_id, product_id),
  FOREIGN KEY (user_id)    REFERENCES users(user_id)       ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- ── CHAT MESSAGES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  message_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  sender     ENUM('user','admin') NOT NULL DEFAULT 'user',
  message    TEXT NOT NULL,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_created (user_id, created_at)
);

-- ── AI RECOMMENDATIONS CACHE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_recommendations (
  rec_id       INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL UNIQUE,
  product_ids  TEXT NOT NULL,
  reasoning    TEXT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ── PROMO CODES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  promo_id        INT AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(30) NOT NULL UNIQUE,
  description     VARCHAR(200) DEFAULT '',
  discount_type   ENUM('percentage','flat') NOT NULL DEFAULT 'percentage',
  discount_value  DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_discount    DECIMAL(10,2) NULL,
  usage_limit     INT NULL,
  used_count      INT NOT NULL DEFAULT 0,
  valid_from      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until     DATETIME NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promo_usage (
  usage_id         INT AUTO_INCREMENT PRIMARY KEY,
  promo_id         INT NOT NULL,
  user_id          INT NOT NULL,
  order_id         INT NOT NULL,
  discount_applied DECIMAL(10,2) NOT NULL,
  used_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_promo_user (promo_id, user_id),
  FOREIGN KEY (promo_id) REFERENCES promo_codes(promo_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(user_id)        ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(order_id)      ON DELETE CASCADE
);

-- Sample promo codes
INSERT IGNORE INTO promo_codes (code, description, discount_type, discount_value, min_order_value, max_discount, usage_limit) VALUES
  ('NEXUS10',    '10% off on all orders',               'percentage', 10,  0,    500,  NULL),
  ('WELCOME200', '₹200 off your first order',           'flat',       200, 999,  NULL, 1),
  ('TECH20',     '20% off orders above ₹5000',          'percentage', 20,  5000, 1000, NULL),
  ('FLASH500',   'Flat ₹500 off on orders above ₹2000', 'flat',       500, 2000, NULL, 100),
  ('NEWUSER15',  '15% off for new users',               'percentage', 15,  0,    750,  1);

-- ── LOYALTY POINTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_points (
  points_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL UNIQUE,
  total_points INT NOT NULL DEFAULT 0,
  tier       ENUM('Bronze','Silver','Gold','Platinum') NOT NULL DEFAULT 'Bronze',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  txn_id      INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  points      INT NOT NULL,
  type        ENUM('earned','redeemed','bonus','expired') NOT NULL DEFAULT 'earned',
  description VARCHAR(200) DEFAULT '',
  order_id    INT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(user_id)   ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL,
  INDEX idx_user_created (user_id, created_at)
);

-- ── OFFERS / DISCOUNTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  offer_id       INT AUTO_INCREMENT PRIMARY KEY,
  offer_name     VARCHAR(100) NOT NULL,
  offer_type     ENUM('product','category') NOT NULL DEFAULT 'product',
  discount_type  ENUM('percentage','flat')  NOT NULL DEFAULT 'percentage',
  discount_value DECIMAL(10,2) NOT NULL,
  product_id     INT  NULL,
  category       VARCHAR(50) NULL,
  start_date     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_date       DATETIME NULL,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- ── SENTIMENT CACHE ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_sentiment (
  sentiment_id INT AUTO_INCREMENT PRIMARY KEY,
  product_id   INT NOT NULL UNIQUE,
  label        ENUM('Highly Recommended','Recommended','Mixed Reviews','Poor Quality','No Reviews') NOT NULL DEFAULT 'No Reviews',
  score        DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  positive_pct TINYINT NOT NULL DEFAULT 0,
  summary      TEXT,
  review_count INT NOT NULL DEFAULT 0,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
  INDEX idx_label (label)
);

-- ── STOCK ALERTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_alerts (
  alert_id    INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  product_id  INT NOT NULL,
  email       VARCHAR(255) NOT NULL,
  notified    TINYINT(1) NOT NULL DEFAULT 0,
  notified_at TIMESTAMP NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_product (user_id, product_id),
  FOREIGN KEY (user_id)    REFERENCES users(user_id)       ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
  INDEX idx_product_notified (product_id, notified)
);

-- ── RAZORPAY ORDERS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS razorpay_orders (
  rp_id               INT AUTO_INCREMENT PRIMARY KEY,
  order_id            INT NOT NULL,
  razorpay_order_id   VARCHAR(100) NOT NULL UNIQUE,
  razorpay_payment_id VARCHAR(100) NULL,
  razorpay_signature  VARCHAR(500) NULL,
  amount              INT NOT NULL,
  currency            VARCHAR(10) NOT NULL DEFAULT 'INR',
  status              ENUM('created','paid','failed') NOT NULL DEFAULT 'created',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

-- ── SEARCH LOGS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_logs (
  log_id       INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NULL,
  raw_query    VARCHAR(500) NOT NULL,
  parsed_query TEXT NULL,
  result_count INT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at)
);

SELECT 'NexusTech schema created successfully!' AS status;
