const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || '').trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '').trim();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'novatech_store',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use(cors());
app.use(express.json({ limit: '5mb' }));

function isAdminAuthEnabled() {
  return Boolean(ADMIN_USERNAME && ADMIN_PASSWORD);
}

function parseBasicAuthHeader(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Basic ')) return null;

  try {
    const encoded = authHeader.slice(6);
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex < 0) return null;

    const username = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);
    return { username, password };
  } catch {
    return null;
  }
}

function requireAdminAuth(req, res, next) {
  if (!isAdminAuthEnabled()) {
    return next();
  }

  const credentials = parseBasicAuthHeader(req);
  const isValid = credentials
    && credentials.username === ADMIN_USERNAME
    && credentials.password === ADMIN_PASSWORD;

  if (!isValid) {
    res.setHeader('WWW-Authenticate', 'Basic realm="NovaTech Admin"');
    return res.status(401).send('Autenticacion requerida.');
  }

  return next();
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
      products_json LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(
    'INSERT INTO app_state (id, products_json) VALUES (1, ?) ON DUPLICATE KEY UPDATE products_json = products_json',
    ['[]'],
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      last_name VARCHAR(120) NULL,
      company VARCHAR(180) NULL,
      phone VARCHAR(60) NOT NULL,
      email VARCHAR(190) NOT NULL,
      message TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (error) {
    res.status(500).json({ ok: false, db: 'disconnected', error: error.message });
  }
});

app.get('/api/products', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT products_json FROM app_state WHERE id = 1 LIMIT 1');
    const row = rows[0];
    const products = row ? JSON.parse(row.products_json || '[]') : [];
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron leer productos.', detail: error.message });
  }
});

app.put('/api/products', async (req, res) => {
  if (isAdminAuthEnabled()) {
    const credentials = parseBasicAuthHeader(req);
    const isValid = credentials
      && credentials.username === ADMIN_USERNAME
      && credentials.password === ADMIN_PASSWORD;

    if (!isValid) {
      res.setHeader('WWW-Authenticate', 'Basic realm="NovaTech Admin"');
      return res.status(401).json({ error: 'Autenticacion requerida para editar productos.' });
    }
  }

  try {
    const products = Array.isArray(req.body?.products) ? req.body.products : null;
    if (!products) {
      return res.status(400).json({ error: 'El body debe incluir products como array.' });
    }

    const productsJson = JSON.stringify(products);
    await pool.query(
      'INSERT INTO app_state (id, products_json) VALUES (1, ?) ON DUPLICATE KEY UPDATE products_json = VALUES(products_json)',
      [productsJson],
    );

    res.json({ ok: true, count: products.length });
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron guardar productos.', detail: error.message });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const payload = req.body || {};
    const name = String(payload.name || '').trim();
    const lastName = String(payload.lastName || '').trim();
    const company = String(payload.company || '').trim();
    const phone = String(payload.phone || '').trim();
    const email = String(payload.email || '').trim();
    const message = String(payload.message || '').trim();

    if (!name || !phone || !email) {
      return res.status(400).json({ error: 'name, phone y email son obligatorios.' });
    }

    await pool.query(
      'INSERT INTO leads (name, last_name, company, phone, email, message) VALUES (?, ?, ?, ?, ?, ?)',
      [name, lastName || null, company || null, phone, email, message || null],
    );

    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo guardar el lead.', detail: error.message });
  }
});

app.get('/admin.html', requireAdminAuth, (_req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin', requireAdminAuth, (_req, res) => {
  res.redirect('/admin.html');
});

app.use(express.static(__dirname));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

async function bootstrap() {
  await pool.query('SELECT 1');
  await ensureSchema();

  app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
    if (isAdminAuthEnabled()) {
      console.log('Admin protegido con Basic Auth.');
    } else {
      console.log('Admin sin autenticacion (configura ADMIN_USERNAME y ADMIN_PASSWORD para produccion).');
    }
  });
}

bootstrap().catch((error) => {
  console.error('No se pudo iniciar el servidor:', error.message);
  process.exit(1);
});