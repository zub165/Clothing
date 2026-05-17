-- E-commerce extensions for Clothify (run after schema.sql)
USE clothing_business;

-- Run once; ignore errors if columns already exist
ALTER TABLE inventory ADD COLUMN category VARCHAR(100) DEFAULT 'General';
ALTER TABLE inventory ADD COLUMN description TEXT;
ALTER TABLE inventory ADD COLUMN image_url VARCHAR(500);
ALTER TABLE inventory ADD COLUMN slug VARCHAR(200);
ALTER TABLE inventory ADD COLUMN featured TINYINT(1) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN sizes VARCHAR(120) DEFAULT 'S,M,L,XL';
ALTER TABLE inventory ADD COLUMN colors VARCHAR(120) DEFAULT 'Black,White';

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  item_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  size VARCHAR(16) DEFAULT 'M',
  color VARCHAR(32) DEFAULT 'Black',
  UNIQUE KEY uniq_cart_line (customer_id, item_id, size, color),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wishlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  item_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_wish (customer_id, item_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  percent_off INT NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  expires_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  customer_id INT NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_review (item_id, customer_id),
  FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shop_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  status ENUM('pending','paid','shipped','delivered','cancelled') DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  shipping DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  coupon_code VARCHAR(32),
  shipping_name VARCHAR(200),
  shipping_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS shop_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_order_id INT NOT NULL,
  item_id INT NOT NULL,
  quantity INT NOT NULL,
  size VARCHAR(16),
  color VARCHAR(32),
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (shop_order_id) REFERENCES shop_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES inventory(id)
);

INSERT IGNORE INTO coupons (code, percent_off, is_active) VALUES ('WELCOME10', 10, 1);
