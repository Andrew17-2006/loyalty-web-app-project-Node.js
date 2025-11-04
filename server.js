// ======= Імпорти =======
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// ======= CORS =======
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://andrew17-2006.github.io',
    'https://loyalty-web-app-project-nodejs-production.up.railway.app'
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'x-username'],
  optionsSuccessStatus: 200
}));

// ======= Middleware =======
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// ======= Logging =======
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// ======= MySQL Connection =======
let db;
try {
  console.log('✅ Using Railway MySQL connection...');
  const dbUrl = new URL(process.env.DATABASE_URL || process.env.MYSQL_URL);

  db = mysql.createConnection({
    host: dbUrl.hostname,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.substring(1),
    port: dbUrl.port || 3306,
    ssl: { rejectUnauthorized: false }
  });

  db.connect((err) => {
    if (err) console.error('❌ Помилка підключення до MySQL:', err);
    else console.log('✅ Підключено до MySQL БД!');
  });
} catch (error) {
  console.error('❌ Помилка створення підключення:', error);
}

// ======= Serve static files =======
app.use(express.static(path.join(__dirname)));
app.use('/src', express.static(path.join(__dirname, 'src')));

// ======= Helper =======
function getUsernameFromReq(req) {
  if (req.cookies?.username) return req.cookies.username;
  if (req.get('x-username')) return req.get('x-username');
  if (req.body?.username) return req.body.username;
  return null;
}

// ======= Pages =======
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/main', (req, res) => res.sendFile(path.join(__dirname, 'src', 'main.html')));
app.get('/map', (req, res) => res.sendFile(path.join(__dirname, 'src', 'map.html')));
app.get('/loyalty', (req, res) => res.sendFile(path.join(__dirname, 'src', 'loyalty.html')));
app.get('/investments', (req, res) => res.sendFile(path.join(__dirname, 'src', 'investments.html')));
app.get('/header', (req, res) => res.sendFile(path.join(__dirname, 'src', 'header.html')));

// ======= Register =======
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.json({ success: false, message: 'Заповніть всі поля!' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
    db.query(sql, [username, email, hashedPassword], (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY')
          return res.json({ success: false, message: 'Користувач вже існує!' });
        return res.json({ success: false, message: 'Помилка при реєстрації' });
      }
      res.cookie('username', username, { httpOnly: false, sameSite: 'lax', path: '/' });
      res.json({ success: true, message: 'Реєстрація успішна!', username });
    });
  } catch (error) {
    res.json({ success: false, message: 'Помилка сервера' });
  }
});

// ======= Login =======
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.json({ success: false, message: 'Заповніть всі поля!' });

  const sql = 'SELECT * FROM users WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
    if (err) return res.json({ success: false, message: 'Помилка сервера' });
    if (results.length === 0)
      return res.json({ success: false, message: 'Неправильний email або пароль' });

    const user = results[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid)
      return res.json({ success: false, message: 'Неправильний email або пароль' });

    res.cookie('username', user.username, { httpOnly: false, sameSite: 'lax', path: '/' });
    res.json({ success: true, message: 'Вхід успішний!', username: user.username });
  });
});

// ======= Current user =======
app.get('/currentUser', (req, res) => {
  const username = getUsernameFromReq(req);
  if (username) res.json({ success: true, username });
  else res.json({ success: false });
});

// ======= Logout =======
app.post('/logout', (req, res) => {
  res.clearCookie('username', { path: '/' });
  res.json({ success: true });
});

// ======= Loyalty cards =======
app.get('/api/loyalty-cards', (req, res) => {
  const username = getUsernameFromReq(req);
  if (!username) return res.json({ success: false, message: 'Користувач не авторизований' });

  const getUserSql = 'SELECT id FROM users WHERE username = ?';
  db.query(getUserSql, [username], (err, userRes) => {
    if (err || userRes.length === 0)
      return res.json({ success: false, message: 'Користувач не знайдений' });

    const userId = userRes[0].id;
    const sql = 'SELECT * FROM loyalty_cards WHERE user_id = ? ORDER BY id ASC';
    db.query(sql, [userId], (err, cards) => {
      if (err) return res.json({ success: false, message: 'Помилка отримання карток' });
      res.json({ success: true, cards });
    });
  });
});

// ======= Add card =======
app.post('/api/loyalty-cards', (req, res) => {
  const username = getUsernameFromReq(req);
  const { card_name, store_name, color, code_value } = req.body;
  if (!username) return res.json({ success: false, message: 'Користувач не авторизований' });

  const getUserSql = 'SELECT id FROM users WHERE username = ?';
  db.query(getUserSql, [username], (err, userRes) => {
    if (err || userRes.length === 0)
      return res.json({ success: false, message: 'Користувач не знайдений' });

    const userId = userRes[0].id;
    const sql = 'INSERT INTO loyalty_cards (user_id, card_name, store_name, color, code_value) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [userId, card_name, store_name, color, code_value], (err, result) => {
      if (err) return res.json({ success: false, message: 'Помилка додавання картки' });
      res.json({ success: true, message: 'Картку додано', cardId: result.insertId });
    });
  });
});

// ======= Update card =======
app.put('/api/loyalty-cards/:id', (req, res) => {
  const username = getUsernameFromReq(req);
  const cardId = req.params.id;
  const { card_name, store_name, color, code_value } = req.body;

  if (!username) {
    return res.json({ success: false, message: 'Користувач не авторизований' });
  }

  const checkSql = `
    SELECT lc.* FROM loyalty_cards lc
    JOIN users u ON lc.user_id = u.id
    WHERE lc.id = ? AND u.username = ?
  `;
  db.query(checkSql, [cardId, username], (err, results) => {
    if (err || results.length === 0) {
      return res.json({ success: false, message: 'Картку не знайдено або немає доступу' });
    }

    const updateSql = `
      UPDATE loyalty_cards
      SET card_name = ?, store_name = ?, color = ?, code_value = ?
      WHERE id = ?
    `;
    db.query(updateSql, [card_name, store_name, color, code_value, cardId], (err) => {
      if (err) return res.json({ success: false, message: 'Помилка оновлення картки' });
      res.json({ success: true, message: 'Картку оновлено' });
    });
  });
});

// ======= Delete card =======
app.delete('/api/loyalty-cards/:id', (req, res) => {
  const username = getUsernameFromReq(req);
  const cardId = req.params.id;
  if (!username) return res.json({ success: false, message: 'Користувач не авторизований' });

  const checkSql = `
    SELECT lc.* FROM loyalty_cards lc
    JOIN users u ON lc.user_id = u.id
    WHERE lc.id = ? AND u.username = ?
  `;
  db.query(checkSql, [cardId, username], (err, results) => {
    if (err || results.length === 0)
      return res.json({ success: false, message: 'Картка не знайдена або немає доступу' });

    db.query('DELETE FROM loyalty_cards WHERE id = ?', [cardId], (err) => {
      if (err) return res.json({ success: false, message: 'Помилка видалення' });
      res.json({ success: true, message: 'Картку видалено' });
    });
  });
});

// ======= Start server =======
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
