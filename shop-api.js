const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { apiConfig } = require('./config');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    req.user = jwt.verify(token, apiConfig.jwtSecret);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function queryAsync(connection, sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug || `item-${row.id}`,
    description: row.description || '',
    category: row.category || 'General',
    price: Number(row.selling_price),
    compareAt: row.purchase_price ? Number(row.purchase_price) : null,
    stock: row.stock,
    imageUrl: row.image_url || `https://picsum.photos/seed/${row.id}/600/800`,
    sizes: (row.sizes || 'S,M,L,XL').split(',').map((s) => s.trim()),
    colors: (row.colors || 'Black,White').split(',').map((c) => c.trim()),
    featured: Boolean(row.featured),
  };
}

module.exports = function registerShopApi(app, connection) {
  app.post('/api/shop/register', async (req, res) => {
    try {
      const { email, password, fullName, phone } = req.body;
      if (!email || !password || !fullName) {
        return res.status(400).json({ error: 'email, password, and fullName are required' });
      }
      const hash = await bcrypt.hash(password, 10);
      const result = await queryAsync(
        connection,
        'INSERT INTO customers (email, password_hash, full_name, phone) VALUES (?, ?, ?, ?)',
        [email, hash, fullName, phone || null]
      );
      const token = jwt.sign({ id: result.insertId, email }, apiConfig.jwtSecret, { expiresIn: '7d' });
      res.status(201).json({ token, user: { id: result.insertId, email, fullName } });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Email already registered' });
      }
      console.error(err);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/shop/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const rows = await queryAsync(connection, 'SELECT * FROM customers WHERE email = ?', [email]);
      if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
      const user = rows[0];
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id, email: user.email }, apiConfig.jwtSecret, { expiresIn: '7d' });
      res.json({
        token,
        user: { id: user.id, email: user.email, fullName: user.full_name, phone: user.phone },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.get('/api/shop/products', async (req, res) => {
    try {
      const { category, featured, search, limit = 50, offset = 0 } = req.query;
      let sql = 'SELECT * FROM inventory WHERE stock >= 0';
      const params = [];
      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }
      if (featured === 'true') sql += ' AND featured = 1';
      if (search) {
        sql += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      sql += ' ORDER BY featured DESC, updated_at DESC LIMIT ? OFFSET ?';
      params.push(Number(limit), Number(offset));
      const rows = await queryAsync(connection, sql, params);
      res.json(rows.map(mapProduct));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load products' });
    }
  });

  app.get('/api/shop/products/:id', async (req, res) => {
    try {
      const rows = await queryAsync(connection, 'SELECT * FROM inventory WHERE id = ?', [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Product not found' });
      const reviews = await queryAsync(
        connection,
        `SELECT r.rating, r.comment, r.created_at, c.full_name
         FROM reviews r JOIN customers c ON c.id = r.customer_id
         WHERE r.item_id = ? ORDER BY r.created_at DESC`,
        [req.params.id]
      );
      res.json({ ...mapProduct(rows[0]), reviews });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load product' });
    }
  });

  app.get('/api/shop/categories', async (req, res) => {
    try {
      const rows = await queryAsync(
        connection,
        'SELECT DISTINCT category FROM inventory WHERE category IS NOT NULL ORDER BY category'
      );
      res.json(rows.map((r) => r.category));
    } catch (err) {
      res.status(500).json({ error: 'Failed to load categories' });
    }
  });

  app.get('/api/shop/cart', authMiddleware, async (req, res) => {
    try {
      const rows = await queryAsync(
        connection,
        `SELECT c.id, c.quantity, c.size, c.color, i.*
         FROM cart_items c JOIN inventory i ON i.id = c.item_id
         WHERE c.customer_id = ?`,
        [req.user.id]
      );
      const items = rows.map((r) => ({
        cartId: r.id,
        quantity: r.quantity,
        size: r.size,
        color: r.color,
        product: mapProduct(r),
        lineTotal: Number(r.selling_price) * r.quantity,
      }));
      const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
      res.json({ items, subtotal });
    } catch (err) {
      res.status(500).json({ error: 'Cart unavailable' });
    }
  });

  app.post('/api/shop/cart', authMiddleware, async (req, res) => {
    try {
      const { itemId, quantity = 1, size = 'M', color = 'Black' } = req.body;
      await queryAsync(
        connection,
        `INSERT INTO cart_items (customer_id, item_id, quantity, size, color)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
        [req.user.id, itemId, quantity, size, color]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Could not add to cart' });
    }
  });

  app.patch('/api/shop/cart/:cartId', authMiddleware, async (req, res) => {
    try {
      const { quantity } = req.body;
      await queryAsync(
        connection,
        'UPDATE cart_items SET quantity = ? WHERE id = ? AND customer_id = ?',
        [quantity, req.params.cartId, req.user.id]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Update failed' });
    }
  });

  app.delete('/api/shop/cart/:cartId', authMiddleware, async (req, res) => {
    try {
      await queryAsync(connection, 'DELETE FROM cart_items WHERE id = ? AND customer_id = ?', [
        req.params.cartId,
        req.user.id,
      ]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Delete failed' });
    }
  });

  app.get('/api/shop/wishlist', authMiddleware, async (req, res) => {
    try {
      const rows = await queryAsync(
        connection,
        `SELECT i.* FROM wishlist w JOIN inventory i ON i.id = w.item_id WHERE w.customer_id = ?`,
        [req.user.id]
      );
      res.json(rows.map(mapProduct));
    } catch (err) {
      res.status(500).json({ error: 'Wishlist unavailable' });
    }
  });

  app.post('/api/shop/wishlist/:itemId', authMiddleware, async (req, res) => {
    try {
      await queryAsync(connection, 'INSERT IGNORE INTO wishlist (customer_id, item_id) VALUES (?, ?)', [
        req.user.id,
        req.params.itemId,
      ]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Could not save wishlist' });
    }
  });

  app.delete('/api/shop/wishlist/:itemId', authMiddleware, async (req, res) => {
    try {
      await queryAsync(connection, 'DELETE FROM wishlist WHERE customer_id = ? AND item_id = ?', [
        req.user.id,
        req.params.itemId,
      ]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Delete failed' });
    }
  });

  app.post('/api/shop/checkout', authMiddleware, async (req, res) => {
    try {
      const { shippingName, shippingAddress, couponCode } = req.body;
      const cartRows = await queryAsync(
        connection,
        `SELECT c.*, i.selling_price, i.stock, i.name
         FROM cart_items c JOIN inventory i ON i.id = c.item_id
         WHERE c.customer_id = ?`,
        [req.user.id]
      );
      if (!cartRows.length) return res.status(400).json({ error: 'Cart is empty' });

      let subtotal = 0;
      for (const line of cartRows) {
        if (line.stock < line.quantity) {
          return res.status(400).json({ error: `Insufficient stock for ${line.name}` });
        }
        subtotal += Number(line.selling_price) * line.quantity;
      }

      let discount = 0;
      if (couponCode) {
        const coupons = await queryAsync(
          connection,
          'SELECT * FROM coupons WHERE code = ? AND is_active = 1',
          [couponCode]
        );
        if (coupons.length) discount = (subtotal * coupons[0].percent_off) / 100;
      }

      const shipping = subtotal >= 75 ? 0 : 8.99;
      const total = Math.max(0, subtotal - discount + shipping);

      const orderResult = await queryAsync(
        connection,
        `INSERT INTO shop_orders (customer_id, subtotal, discount, shipping, total, coupon_code, shipping_name, shipping_address, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid')`,
        [req.user.id, subtotal, discount, shipping, total, couponCode || null, shippingName, shippingAddress]
      );
      const orderId = orderResult.insertId;

      for (const line of cartRows) {
        await queryAsync(
          connection,
          'INSERT INTO shop_order_items (shop_order_id, item_id, quantity, size, color, unit_price) VALUES (?, ?, ?, ?, ?, ?)',
          [orderId, line.item_id, line.quantity, line.size, line.color, line.selling_price]
        );
        await queryAsync(connection, 'UPDATE inventory SET stock = stock - ? WHERE id = ?', [
          line.quantity,
          line.item_id,
        ]);
        await queryAsync(
          connection,
          'INSERT INTO orders (item_id, quantity, total_amount) VALUES (?, ?, ?)',
          [line.item_id, line.quantity, line.selling_price * line.quantity]
        );
      }

      await queryAsync(connection, 'DELETE FROM cart_items WHERE customer_id = ?', [req.user.id]);
      res.status(201).json({ orderId, total, status: 'paid' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Checkout failed' });
    }
  });

  app.get('/api/shop/orders', authMiddleware, async (req, res) => {
    try {
      const orders = await queryAsync(
        connection,
        'SELECT * FROM shop_orders WHERE customer_id = ? ORDER BY created_at DESC',
        [req.user.id]
      );
      res.json(orders);
    } catch (err) {
      res.status(500).json({ error: 'Orders unavailable' });
    }
  });

  app.post('/api/shop/products/:id/reviews', authMiddleware, async (req, res) => {
    try {
      const { rating, comment } = req.body;
      await queryAsync(
        connection,
        'INSERT INTO reviews (item_id, customer_id, rating, comment) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)',
        [req.params.id, req.user.id, rating, comment || '']
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Review failed' });
    }
  });
};
