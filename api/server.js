require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// --- RAZORPAY IMPORTS ---
const crypto = require('crypto');
const Razorpay = require('razorpay');

const app = express();
const server = http.createServer(app);
app.use(cors());
app.use(express.json());

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@1234';
const JWT_SECRET = process.env.JWT_SECRET || 'nexustech_secret_key_2024';

// --- INITIALIZE RAZORPAY ---
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-FETCH IMAGE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const IMAGE_BASE_DIR = process.env.VERCEL 
  ? '/tmp' 
  : path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'root',
  database: process.env.DB_NAME || 'electronics_store',
});

db.connect(err => {
  if (err) { console.error('❌ DB connection failed:', err.message); return; }
  console.log('✅ Connected to MySQL');

  // Auto-migration
  db.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviews' AND COLUMN_NAME = 'user_id'`,
    (err2, rows) => {
      if (err2) return;
      if (rows[0].cnt === 0) {
        db.query(
          `ALTER TABLE reviews ADD COLUMN user_id INT NOT NULL DEFAULT 0 AFTER product_id`,
          (err3) => {
            if (err3) console.error('❌ Migration failed (reviews.user_id):', err3.message);
            else console.log('✅ Migration applied: reviews.user_id column added');
          }
        );
      }
    }
  );
});

const promiseDb = db.promise();

const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on('connection', (ws) => {
  const client = { ws, userId: null, isAdmin: false };
  clients.add(client);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'auth' && msg.token) {
        jwt.verify(msg.token, JWT_SECRET, (err, decoded) => {
          if (err) return;
          if (decoded.isAdmin) { client.isAdmin = true; }
          else { client.userId = decoded.id; }
        });
      }
    } catch (_) {}
  });

  ws.on('close', () => clients.delete(client));
  ws.on('error', () => clients.delete(client));
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

const heartbeat = setInterval(() => {
  clients.forEach(client => {
    if (!client.ws.isAlive) { client.ws.terminate(); clients.delete(client); return; }
    client.ws.isAlive = false;
    client.ws.ping();
  });
}, 25000);

wss.on('close', () => clearInterval(heartbeat));

function broadcast(payload, { toUserId, toAdmins, toAll } = {}) {
  const data = JSON.stringify(payload);
  clients.forEach(client => {
    if (client.ws.readyState !== WebSocket.OPEN) return;
    if (toAll) { client.ws.send(data); return; }
    if (toAdmins && client.isAdmin) { client.ws.send(data); return; }
    if (toUserId && client.userId === toUserId) { client.ws.send(data); return; }
  });
}

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided.' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

const authenticateAdmin = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Admin access denied.' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded.isAdmin) return res.status(403).json({ error: 'Not authorized as admin.' });
    req.admin = decoded;
    next();
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-FETCH IMAGE LOGIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getKeywords(str) {
  return new Set(
    str.toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .split(' ')
      .filter(word => word.length > 1)
  );
}

function calculateMatchScore(productName, fileName) {
  const productKeywords = getKeywords(productName);
  const fileKeywords = getKeywords(fileName.split('.')[0]);
  let matches = 0;
  productKeywords.forEach(word => {
    if (fileKeywords.has(word)) matches++;
  });
  return matches;
}

function findBestImage(productName, category) {
  const subDir = category.toLowerCase();
  const dirPath = path.join(IMAGE_BASE_DIR, subDir);

  if (!fs.existsSync(dirPath)) {
    console.warn(`⚠️  Directory not found: ${dirPath}`);
    return null;
  }

  const files = fs.readdirSync(dirPath);
  let bestMatch = null;
  let highestScore = -1;

  files.forEach(file => {
    if (!/\.(jpg|jpeg|png|webp|avif)$/i.test(file)) return;
    const score = calculateMatchScore(productName, file);
    const brand = productName.split(' ')[0].toLowerCase();
    const finalScore = file.toLowerCase().includes(brand) ? score + 1.5 : score;

    if (finalScore > highestScore) {
      highestScore = finalScore;
      bestMatch = file;
    }
  });

  return bestMatch ? `/images/products/${subDir}/${bestMatch}` : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/signup', async (req, res) => {
  const { username, email, password, phone, dialCode, address, city, pincode, country } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'Username, email and password are required.' });
  const fullPhone = dialCode && phone ? `${dialCode}${phone}` : phone || null;
  try {
    const hashed = await bcrypt.hash(password, 10);
    db.query(
      `INSERT INTO users (username,email,password,phone,address,city,pincode,country) VALUES (?,?,?,?,?,?,?,?)`,
      [username, email, hashed, fullPhone, address || null, city || null, pincode || null, country || 'India'],
      (err) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ error: 'Email already registered.' });
          if (err.code === 'ER_BAD_FIELD_ERROR') {
            db.query(
              'INSERT INTO users (username,email,password,country) VALUES (?,?,?,?)',
              [username, email, hashed, country || 'India'],
              (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                return res.status(201).json({ message: 'User registered!' });
              }
            );
            return;
          }
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'User registered!' });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Wrong password' });
    const token = jwt.sign({ id: user.user_id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      message: 'Login successful', token,
      user: {
        id: user.user_id, username: user.username, email: user.email,
        phone: user.phone || null, address: user.address || null,
        city: user.city || null, pincode: user.pincode || null, country: user.country || 'India',
      }
    });
  });
});

app.post('/api/auth/refresh', authenticateToken, (req, res) => {
  const token = jwt.sign({ id: req.user.id, username: req.user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

app.post('/api/admin/login', (req, res) => {
  const inputUser = (req.body.username || '').trim();
  const inputPass = (req.body.password || '').trim();
  if (inputUser !== ADMIN_USERNAME.trim() || inputPass !== ADMIN_PASSWORD.trim())
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  const token = jwt.sign({ isAdmin: true, username: ADMIN_USERNAME }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ message: 'Admin login successful', token });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS & REVIEWS
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/products', (req, res) => {
  const { category, search, inStock } = req.query;
  const conds = []; const params = [];
  if (category && category !== 'All') { conds.push('p.category = ?'); params.push(category); }
  if (search) {
    conds.push('(p.name LIKE ? OR p.brand LIKE ? OR p.category LIKE ?)');
    const like = `%${search}%`; params.push(like, like, like);
  }
  if (inStock === 'true') conds.push('p.stock_quantity > 0');
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  db.query(
    `SELECT p.*, COUNT(r.rating) AS total_reviews,
     IFNULL(ROUND(AVG(r.rating),1),0) AS average_rating
     FROM products p LEFT JOIN reviews r ON p.product_id = r.product_id
     ${where} GROUP BY p.product_id ORDER BY p.product_id DESC`,
    params,
    (err, rows) => { if (err) return res.status(500).json({ error: err.message }); res.json(rows); }
  );
});

app.get('/api/reviews/:productId', (req, res) => {
  db.query(
    `SELECT r.*, u.username FROM reviews r
     JOIN users u ON r.user_id = u.user_id
     WHERE r.product_id = ? ORDER BY r.product_id DESC`,
    [req.params.productId],
    (err, rows) => { if (err) return res.status(500).json({ error: err.message }); res.json(rows); }
  );
});

app.post('/api/reviews', authenticateToken, (req, res) => {
  const { product_id, rating, comment } = req.body;
  db.query(
    'INSERT INTO reviews (product_id,user_id,rating,comment) VALUES (?,?,?,?)',
    [product_id, req.user.id, rating, comment],
    (err) => { if (err) return res.status(500).json({ error: err.message }); res.status(201).json({ message: 'Review added!' }); }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CHECKOUT (original fallback)
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/checkout', authenticateToken, async (req, res) => {
  const { cartItems, totalAmount, address, paymentMethod } = req.body;
  const userId = req.user.id;
  if (!cartItems || !cartItems.length) return res.status(400).json({ error: 'Cart is empty.' });
  try {
    const deliveryAddr = address ? `${address.fullName}, ${address.line1}, ${address.city}, ${address.pincode}, ${address.country}` : null;
    const [result] = await promiseDb.query(
      `INSERT INTO orders (user_id,total_amount,status,payment_method,delivery_address) VALUES (?,?,'Pending',?,?)`,
      [userId, totalAmount, paymentMethod || 'cod', deliveryAddr]
    );
    const orderId = result.insertId;
    for (const item of cartItems) {
      await promiseDb.query('INSERT INTO order_items (order_id,product_id,quantity,price_at_purchase) VALUES (?,?,?,?)', [orderId, item.product_id, item.quantity, item.price]);
      await promiseDb.query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?', [item.quantity, item.product_id]);
    }
    broadcast({ type: 'new_order', orderId, userId, totalAmount, status: 'Pending' }, { toAdmins: true });
    res.json({ message: 'Order placed successfully!', orderId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SHARED ORDER HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function getUserOrdersFull(userId) {
  const [orders] = await promiseDb.query(
    `SELECT o.order_id, o.user_id, o.total_amount, o.status,
     IFNULL(o.payment_method,'cod') AS payment_method,
     IFNULL(o.delivery_address,'') AS delivery_address,
     o.created_at AS created_at, u.username, u.email
     FROM orders o JOIN users u ON o.user_id = u.user_id
     WHERE o.user_id = ? ORDER BY o.order_id DESC`,
    [userId]
  );
  for (const order of orders) {
    const [items] = await promiseDb.query(
      `SELECT oi.product_id, oi.quantity, oi.price_at_purchase AS price, p.name, p.image_url, p.category
       FROM order_items oi JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = ?`, [order.order_id]
    );
    order.items = items.map((item, idx) => ({ ...item, order_item_id: `${order.order_id}_${idx}` }));
  }
  return orders;
}

async function getAllOrdersFull() {
  const [orders] = await promiseDb.query(
    `SELECT o.order_id, o.user_id, o.total_amount, o.status,
     IFNULL(o.payment_method,'cod') AS payment_method, IFNULL(o.delivery_address,'') AS delivery_address,
     o.created_at AS created_at, u.username, u.email, IFNULL(u.phone,'N/A') AS phone
     FROM orders o JOIN users u ON o.user_id = u.user_id ORDER BY o.order_id DESC`
  );
  for (const order of orders) {
    const [items] = await promiseDb.query(
      `SELECT oi.product_id, oi.quantity, oi.price_at_purchase AS price, p.name, p.image_url, p.category
       FROM order_items oi JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = ?`, [order.order_id]
    );
    order.items = items.map((item, idx) => ({ ...item, order_item_id: `${order.order_id}_${idx}` }));
  }
  return orders;
}

// ─────────────────────────────────────────────────────────────────────────────
// USER ORDERS & ACTIONS
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/orders/my', authenticateToken, async (req, res) => {
  try { res.json(await getUserOrdersFull(req.user.id)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/orders/:id/cancel', authenticateToken, async (req, res) => {
  const { type } = req.body;
  const orderId = req.params.id;
  const userId = req.user.id || req.user.user_id;

  try {
    const [[order]] = await promiseDb.query('SELECT * FROM orders WHERE order_id = ? AND user_id = ?', [orderId, userId]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (['Cancelled', 'Returned'].includes(order.status)) return res.status(400).json({ error: 'This order is already finalized.' });

    if (type === 'cancel') {
      const cancellableStatuses = ['Pending', 'Confirmed', 'Processing'];
      if (!cancellableStatuses.includes(order.status)) {
        return res.status(400).json({ error: `Cannot cancel an order that is already "${order.status}". Please use Return instead.` });
      }
      const [items] = await promiseDb.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
      for (const item of items) {
        await promiseDb.query('UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?', [item.quantity, item.product_id]);
      }
      await promiseDb.query('UPDATE orders SET status = "Cancelled" WHERE order_id = ?', [orderId]);
      broadcast({ type: 'order_status_update', orderId: Number(orderId), status: 'Cancelled', userId }, { toAdmins: true });
      return res.json({ message: 'Order cancelled successfully. Stock has been restored.', status: 'Cancelled' });
    } else if (type === 'return') {
      if (order.status !== 'Delivered') return res.status(400).json({ error: 'Only delivered orders can be returned.' });
      await promiseDb.query('UPDATE orders SET status = "Returned" WHERE order_id = ?', [orderId]);
      broadcast({ type: 'order_status_update', orderId: Number(orderId), status: 'Returned', userId }, { toUserId: userId });
      broadcast({ type: 'order_status_update', orderId: Number(orderId), status: 'Returned', userId }, { toAdmins: true });
      return res.json({ message: 'Return request submitted. The amount will be refunded to your original payment method.', status: 'Returned' });
    } else if (type === 'exchange') {
      if (order.status !== 'Delivered') return res.status(400).json({ error: 'Only delivered orders can be exchanged.' });
      await promiseDb.query('UPDATE orders SET status = "Processing" WHERE order_id = ?', [orderId]);
      broadcast({ type: 'order_status_update', orderId: Number(orderId), status: 'Processing', userId }, { toUserId: userId });
      broadcast({ type: 'order_status_update', orderId: Number(orderId), status: 'Processing', userId }, { toAdmins: true });
      return res.json({ message: 'Exchange request received. We are processing your new product shipment.', status: 'Processing' });
    } else {
      return res.status(400).json({ error: 'Invalid type. Use "cancel", "return", or "exchange".' });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — ORDERS, STATS, PRODUCTS, USERS
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
  try { res.json(await getAllOrdersFull()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/orders/:id/status', authenticateAdmin, async (req, res) => {
  const { status } = req.body;
  const VALID = ['Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'];
  if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const orderId = Number(req.params.id);
  try {
    await promiseDb.query('UPDATE orders SET status=? WHERE order_id=?', [status, orderId]);
    const [[orderRow]] = await promiseDb.query('SELECT user_id FROM orders WHERE order_id=?', [orderId]);
    const userId = orderRow?.user_id;
    const pushPayload = { type: 'order_status_update', orderId, status, userId };
    if (userId) broadcast(pushPayload, { toUserId: userId });
    broadcast(pushPayload, { toAdmins: true });
    res.json({ message: 'Status updated!', orderId, status });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const [[{ totalRevenue }]] = await promiseDb.query("SELECT IFNULL(SUM(total_amount),0) AS totalRevenue FROM orders WHERE status NOT IN ('Cancelled','Returned')");
    const [[{ totalOrders }]] = await promiseDb.query('SELECT COUNT(*) AS totalOrders FROM orders');
    const [[{ totalUsers }]] = await promiseDb.query('SELECT COUNT(*) AS totalUsers FROM users');
    const [[{ totalProducts }]] = await promiseDb.query('SELECT COUNT(*) AS totalProducts FROM products');
    const [lowStock] = await promiseDb.query('SELECT product_id,name,category,stock_quantity FROM products WHERE stock_quantity <= 10 ORDER BY stock_quantity ASC');
    const [stockByCategory] = await promiseDb.query(`SELECT category, COUNT(*) AS total_products, SUM(stock_quantity) AS total_stock, SUM(CASE WHEN stock_quantity>0 AND stock_quantity<=10 THEN 1 ELSE 0 END) AS low_stock, SUM(CASE WHEN stock_quantity=0 THEN 1 ELSE 0 END) AS out_of_stock FROM products GROUP BY category ORDER BY category`);
    const [recentOrders] = await promiseDb.query(`SELECT o.order_id, o.total_amount, o.status, o.created_at, u.username FROM orders o JOIN users u ON o.user_id=u.user_id ORDER BY o.order_id DESC LIMIT 5`);
    const [ordersByStatus] = await promiseDb.query('SELECT status, COUNT(*) AS count FROM orders GROUP BY status');
    res.json({ totalRevenue, totalOrders, totalUsers, totalProducts, lowStock, stockByCategory, recentOrders, ordersByStatus });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FIX IMPLEMENTED HERE: Added the missing /api/admin/users route
app.get('/api/admin/users', authenticateAdmin, (req, res) => {
  db.query(
    `SELECT user_id, username, email, phone, address, city, pincode, country, created_at 
     FROM users 
     ORDER BY created_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get('/api/admin/products', authenticateAdmin, (req, res) => {
  db.query('SELECT * FROM products ORDER BY product_id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message }); res.json(rows);
  });
});

app.post('/api/admin/products', authenticateAdmin, (req, res) => {
  const { name, brand, category, price, stock_quantity, image_url, specs, description } = req.body;
  db.query(
    'INSERT INTO products (name,brand,category,price,stock_quantity,image_url,specs,description,rating,reviews_count) VALUES (?,?,?,?,?,?,?,?,0,0)',
    [name, brand, category, price, stock_quantity, image_url, specs, description],
    (err, r) => { if (err) return res.status(500).json({ error: err.message }); res.status(201).json({ message: 'Product added!', product_id: r.insertId }); }
  );
});

app.put('/api/admin/products/:id', authenticateAdmin, (req, res) => {
  const { name, brand, category, price, stock_quantity, image_url, specs, description } = req.body;
  db.query(
    'UPDATE products SET name=?,brand=?,category=?,price=?,stock_quantity=?,image_url=?,specs=?,description=? WHERE product_id=?',
    [name, brand, category, price, stock_quantity, image_url, specs, description, req.params.id],
    (err) => { if (err) return res.status(500).json({ error: err.message }); res.json({ message: 'Product updated!' }); }
  );
});

app.delete('/api/admin/products/:id', authenticateAdmin, (req, res) => {
  db.query('DELETE FROM products WHERE product_id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message }); res.json({ message: 'Product deleted!' });
  });
});

app.patch('/api/admin/products/:id/stock', authenticateAdmin, (req, res) => {
  const newQty = Number(req.body.stock_quantity);
  db.query('UPDATE products SET stock_quantity=? WHERE product_id=?', [newQty, req.params.id], async (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Stock updated!' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOYALTY POINTS LOGIC
// ─────────────────────────────────────────────────────────────────────────────
const POINTS_PER_RUPEE = 0.1;
const RUPEES_PER_POINT = 0.5;
const MAX_REDEEM_PCT = 10;

function calcTier(points) {
  if (points >= 5000) return 'Platinum';
  if (points >= 2000) return 'Gold';
  if (points >= 500) return 'Silver';
  return 'Bronze';
}

function calcNextTier(points) {
  if (points >= 5000) return null;
  if (points >= 2000) return { name: 'Platinum', needed: 5000 - points };
  if (points >= 500) return { name: 'Gold', needed: 2000 - points };
  return { name: 'Silver', needed: 500 - points };
}

async function ensureLoyaltyAccount(userId) {
  await promiseDb.query('INSERT IGNORE INTO loyalty_points (user_id, total_points, tier) VALUES (?, 0, "Bronze")', [userId]);
}

async function awardPoints(userId, orderId, orderAmount) {
  const earned = Math.floor(orderAmount * POINTS_PER_RUPEE);
  if (earned <= 0) return 0;
  await ensureLoyaltyAccount(userId);
  await promiseDb.query('UPDATE loyalty_points SET total_points = total_points + ? WHERE user_id = ?', [earned, userId]);
  const [[lp]] = await promiseDb.query('SELECT total_points FROM loyalty_points WHERE user_id = ?', [userId]);
  await promiseDb.query('UPDATE loyalty_points SET tier = ? WHERE user_id = ?', [calcTier(lp.total_points), userId]);
  await promiseDb.query(
    'INSERT INTO loyalty_transactions (user_id, points, type, description, order_id) VALUES (?, ?, "earned", ?, ?)',
    [userId, earned, `Earned for order #${orderId}`, orderId]
  );
  return earned;
}

app.get('/api/loyalty', authenticateToken, async (req, res) => {
  try {
    await ensureLoyaltyAccount(req.user.id);
    const [[lp]] = await promiseDb.query('SELECT * FROM loyalty_points WHERE user_id = ?', [req.user.id]);
    const [history] = await promiseDb.query('SELECT * FROM loyalty_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.user.id]);
    res.json({ points: lp.total_points, tier: lp.tier, redeemable_value: Math.floor(lp.total_points * RUPEES_PER_POINT), points_per_rupee: POINTS_PER_RUPEE, rupees_per_point: RUPEES_PER_POINT, next_tier: calcNextTier(lp.total_points), history });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/loyalty/validate-redeem', authenticateToken, async (req, res) => {
  const { pointsToRedeem, orderTotal } = req.body;
  try {
    await ensureLoyaltyAccount(req.user.id);
    const [[lp]] = await promiseDb.query('SELECT total_points FROM loyalty_points WHERE user_id = ?', [req.user.id]);
    const maxByPct = Math.floor((orderTotal * MAX_REDEEM_PCT) / 100 / RUPEES_PER_POINT);
    const actualRedeem = Math.min(lp.total_points, pointsToRedeem, maxByPct);
    res.json({ valid: true, points_used: actualRedeem, discount_amount: actualRedeem * RUPEES_PER_POINT, remaining_points: lp.total_points - actualRedeem });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// PROMO CODES LOGIC
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/promo/validate', authenticateToken, async (req, res) => {
  const { code, orderTotal } = req.body;
  if (!code) return res.status(400).json({ error: 'Promo code is required.' });
  try {
    const [[promo]] = await promiseDb.query(
      `SELECT * FROM promo_codes WHERE code = ? AND is_active = 1
       AND (valid_from IS NULL OR valid_from <= NOW())
       AND (valid_until IS NULL OR valid_until >= NOW())`,
      [code.trim().toUpperCase()]
    );
    if (!promo) return res.status(404).json({ error: 'Invalid or expired promo code.' });
    if (promo.usage_limit !== null && promo.used_count >= promo.usage_limit)
      return res.status(400).json({ error: 'This promo code has reached its usage limit.' });
    const [[userUsage]] = await promiseDb.query('SELECT COUNT(*) AS cnt FROM promo_usage WHERE promo_id = ? AND user_id = ?', [promo.promo_id, req.user.id]);
    if (userUsage.cnt > 0) return res.status(400).json({ error: 'You have already used this promo code.' });
    if (orderTotal < promo.min_order_value) return res.status(400).json({ error: `Minimum order of ₹${Number(promo.min_order_value).toLocaleString()} required.` });
    let discount = promo.discount_type === 'percentage'
      ? Math.min(Math.round(orderTotal * promo.discount_value / 100), promo.max_discount || Infinity)
      : promo.discount_value;
    discount = Math.min(discount, orderTotal);
    res.json({ valid: true, promo_id: promo.promo_id, code: promo.code, description: promo.description, discount_type: promo.discount_type, discount_value: promo.discount_value, discount_amount: discount, final_total: orderTotal - discount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// RAZORPAY - CREATE ORDER
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/razorpay/create-order', authenticateToken, async (req, res) => {
  try {
    const { amount, currency } = req.body;

    // Razorpay requires the amount in paise (multiply INR by 100)
    const options = {
      amount: Math.round(amount * 100), 
      currency: currency || "INR",
      receipt: `rcpt_${Date.now()}_${req.user.id}`
    };

    const order = await razorpay.orders.create(options);
    
    if (!order) return res.status(500).json({ error: "Failed to create Razorpay order" });

    res.json(order);
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    res.status(500).json({ error: "Server error while creating order" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CHECKOUT V2 (Razorpay + Promo + Loyalty)
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/checkout-v2', authenticateToken, async (req, res) => {
  const { 
    cartItems, totalAmount, address, paymentMethod, 
    promoCode, promoDiscount, loyaltyPointsUsed, loyaltyDiscount,
    razorpayPaymentId, razorpayOrderId, razorpaySignature
  } = req.body;
  
  const userId = req.user.id;
  if (!cartItems || !cartItems.length) return res.status(400).json({ error: 'Cart is empty.' });
  
  try {
    // 1. RAZORPAY SIGNATURE VERIFICATION
    if (paymentMethod === 'razorpay') {
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({ error: 'Missing Razorpay payment details.' });
      }

      const body = razorpayOrderId + "|" + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({ error: "Invalid payment signature. Payment rejected." });
      }
    }

    // 2. PROMO & LOYALTY LOGIC
    let promoId = null, verifiedPromoDiscount = 0, verifiedLoyaltyDiscount = 0, verifiedPointsUsed = 0;

    if (promoCode) {
      const [[promo]] = await promiseDb.query(`SELECT * FROM promo_codes WHERE code=? AND is_active=1 AND (valid_until IS NULL OR valid_until>=NOW())`, [promoCode.toUpperCase()]);
      if (promo) {
        const [[used]] = await promiseDb.query('SELECT COUNT(*) AS cnt FROM promo_usage WHERE promo_id=? AND user_id=?', [promo.promo_id, userId]);
        if (used.cnt === 0 && (promo.usage_limit === null || promo.used_count < promo.usage_limit)) {
          verifiedPromoDiscount = promo.discount_type === 'percentage'
            ? Math.min(Math.round(totalAmount * promo.discount_value / 100), promo.max_discount || Infinity)
            : promo.discount_value;
          promoId = promo.promo_id;
        }
      }
    }

    if (loyaltyPointsUsed > 0) {
      await ensureLoyaltyAccount(userId);
      const [[lp]] = await promiseDb.query('SELECT total_points FROM loyalty_points WHERE user_id=?', [userId]);
      const maxByPct = Math.floor((totalAmount * MAX_REDEEM_PCT) / 100 / RUPEES_PER_POINT);
      verifiedPointsUsed = Math.min(lp.total_points, loyaltyPointsUsed, maxByPct);
      verifiedLoyaltyDiscount = verifiedPointsUsed * RUPEES_PER_POINT;
    }

    const finalTotal = Math.max(0, totalAmount - verifiedPromoDiscount - verifiedLoyaltyDiscount);
    const deliveryAddr = address ? `${address.fullName}, ${address.line1}, ${address.city}, ${address.pincode}, ${address.country}` : null;

    // 3. SAVE ORDER (If Razorpay, they already paid so we mark Confirmed)
    const initialStatus = paymentMethod === 'razorpay' ? 'Confirmed' : 'Pending';
    
    const [result] = await promiseDb.query(
      `INSERT INTO orders (user_id,total_amount,status,payment_method,delivery_address,promo_code,discount_amount,loyalty_discount)
       VALUES (?,?,?,?,?,?,?,?)`,
      [userId, finalTotal, initialStatus, paymentMethod || 'cod', deliveryAddr, promoCode || null, verifiedPromoDiscount, verifiedLoyaltyDiscount]
    );
    const orderId = result.insertId;

    for (const item of cartItems) {
      await promiseDb.query('INSERT INTO order_items (order_id,product_id,quantity,price_at_purchase) VALUES (?,?,?,?)', [orderId, item.product_id, item.quantity, item.price]);
      await promiseDb.query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?', [item.quantity, item.product_id]);
    }

    // 4. UPDATE PROMOS & LOYALTY DB
    if (promoId && verifiedPromoDiscount > 0) {
      await promiseDb.query('INSERT INTO promo_usage (promo_id,user_id,order_id,discount_applied) VALUES (?,?,?,?)', [promoId, userId, orderId, verifiedPromoDiscount]);
      await promiseDb.query('UPDATE promo_codes SET used_count = used_count + 1 WHERE promo_id = ?', [promoId]);
    }

    if (verifiedPointsUsed > 0) {
      await promiseDb.query('UPDATE loyalty_points SET total_points = total_points - ? WHERE user_id = ?', [verifiedPointsUsed, userId]);
      await promiseDb.query('INSERT INTO loyalty_transactions (user_id,points,type,description,order_id) VALUES (?,?,"redeemed",?,?)', [userId, -verifiedPointsUsed, `Redeemed for order #${orderId}`, orderId]);
    }

    const pointsEarned = await awardPoints(userId, orderId, finalTotal);
    broadcast({ type: 'new_order', orderId, userId, totalAmount: finalTotal, status: initialStatus }, { toAdmins: true });
    
    res.json({ message: 'Order placed successfully!', orderId, promoDiscount: verifiedPromoDiscount, loyaltyDiscount: verifiedLoyaltyDiscount, finalTotal, pointsEarned: pointsEarned || 0 });
  } catch (err) {
    console.error('Checkout v2 error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Start Server
server.listen(3000, () => console.log('🚀 Server running on port 3000 (HTTP + WebSocket)'));
module.exports = app;
// 1. Export the app for Vercel
module.exports = app;

// 2. Only run app.listen if NOT running on Vercel
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Local server running on port ${PORT}`);
  });
}