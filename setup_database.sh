#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored message
print_message() {
    echo -e "${2}${1}${NC}"
}

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    print_message "MySQL is not installed. Installing MySQL..." "$YELLOW"
    brew install mysql
    brew services start mysql
    print_message "MySQL installed successfully!" "$GREEN"
fi

# Database configuration
DB_NAME="clothing_business"
DB_USER="clothing_user"
DB_PASS="ClothingApp123!"

# Create database and user
print_message "Setting up database..." "$YELLOW"

mysql -u root -p << EOF
-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS ${DB_NAME};

-- Create user if it doesn't exist
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';

-- Grant privileges
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;

-- Switch to the database
USE ${DB_NAME};

-- Create Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    purchase_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_item (name),
    INDEX idx_inventory_name (name)
);

-- Create Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    quantity INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_orders_date (order_date),
    FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE CASCADE
);

-- Create Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'completed',
    INDEX idx_payments_date (payment_date)
);

-- Create Financial Summary Table
CREATE TABLE IF NOT EXISTS financial_summary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total_revenue DECIMAL(10, 2) DEFAULT 0,
    total_expenses DECIMAL(10, 2) DEFAULT 0,
    net_profit DECIMAL(10, 2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

EOF

# Check if database creation was successful
if [ $? -eq 0 ]; then
    print_message "Database setup completed successfully!" "$GREEN"
    
    # Create .env file with database credentials
    cat > .env << EOF
DB_HOST=localhost
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_NAME=${DB_NAME}
DB_PORT=3306
EOF
    
    print_message "Environment file (.env) created with database credentials." "$GREEN"
else
    print_message "Error setting up database. Please check the error message above." "$RED"
fi 