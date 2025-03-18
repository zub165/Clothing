# Clothing Business Manager

A web-based inventory and business management system for clothing businesses. This application helps track inventory, manage orders, monitor payments, and calculate profit/loss in real-time.

## Features

### 1. Inventory Management
- Add new items with details (name, stock quantity, purchase price, selling price)
- Edit existing inventory items
- Delete items from inventory
- Search functionality to filter inventory items
- Real-time stock updates

### 2. Order Management
- Place new orders with item selection and quantity
- Automatic stock reduction upon order placement
- View order history
- Delete orders if needed

### 3. Payment Tracking
- Record incoming payments
- Maintain payment history
- Track total revenue

### 4. Profit & Loss Analysis
- Real-time calculation of total revenue
- Track total expenses
- Calculate net profit
- Automatic updates based on inventory and order changes

## Technical Details

### Technology Stack
- HTML5
- CSS3
- JavaScript (Vanilla)
- Local Storage for data persistence

### Data Structure
The application uses the following data structures:
- Inventory: Array of items with properties (name, stock, purchasePrice, sellingPrice)
- Orders: Array of orders with properties (name, qty, total)
- Payments: Array of payment amounts
- Financial metrics: totalRevenue, totalExpenses, netProfit

### Local Storage
All data is persisted using browser's Local Storage:
- inventory
- orders
- payments
- totalRevenue
- totalExpenses

## User Interface

### Layout
- Sidebar navigation menu
- Main content area with sections for:
  - Inventory Management
  - Order Placement
  - Payment Tracking
  - Profit & Loss Analysis

### Design Features
- Responsive design
- Modern and clean interface
- Interactive tables
- Search functionality
- Color-coded elements for better visibility

## Workflow

1. **Inventory Management**
   - Add new items using the inventory form
   - Edit or delete existing items
   - Search through inventory items

2. **Order Processing**
   - Select item and enter quantity
   - System checks stock availability
   - Order is processed and stock is updated
   - Revenue is automatically calculated

3. **Payment Tracking**
   - Record incoming payments
   - View payment history
   - Track total revenue

4. **Financial Analysis**
   - View total revenue
   - Monitor total expenses
   - Track net profit
   - Real-time updates based on transactions

## Getting Started

1. Clone the repository
2. Open `index.html` in a modern web browser
3. Start managing your clothing business!

## Browser Compatibility
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Data Persistence
All data is stored locally in the browser's Local Storage. Clearing browser data will reset the application.

## Future Enhancements
- User authentication
- Cloud storage integration
- Export functionality for reports
- Advanced analytics
- Mobile app version