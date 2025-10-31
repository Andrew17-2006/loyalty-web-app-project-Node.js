// ======= Імпорти =======
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

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
app.use(cookieParser());

// ======= Логування запитів =======
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// ======= Підключення до MySQL =======
let db;
try {
  if (process.env.DATABASE_URL || process.env.MYSQL_URL) {
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
  } else {
    console.log('⚙️ Using local MySQL fallback...');
    db = mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: 'root',
      database: 'loyaltycards',
      port: 3306
    });
  }

  db.connect((err) => {
    if (err) console.error('❌ Помилка підключення до MySQL:', err);
    else console.log('✅ Підключено до MySQL БД!');
  });
} catch (error) {
  console.error('❌ Помилка створення підключення:', error);
}

// ======= Видача статичних файлів =======
app.use(express.static(__dirname));
app.use('/src', express.static(path.join(__dirname, 'src')));

// ======= Хелпер для отримання імені користувача =======
function getUsernameFromReq(req) {
  if (req.cookies?.username) return req.cookies.username;
  if (req.get('x-username')) return req.get('x-username');
  if (req.body?.username) return req.body.username;
  return null;
}

// ======= Головна сторінка =======
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ======= Підтримка інших сторінок (src/*.html) =======
app.get('/:page', (req, res) => {
  const filePath = path.join(__dirname, 'src', `${req.params.page}.html`);
  res.sendFile(filePath, (err) => {
    if (err) res.status(404).send('❌ Page not found');
  });
});

// ======= Реєстрація =======
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

// ======= Логін =======
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

// ======= Поточний користувач =======
app.get('/currentUser', (req, res) => {
  const username = getUsernameFromReq(req);
  if (username) res.json({ success: true, username });
  else res.json({ success: false });
});

// ======= Вихід =======
app.post('/logout', (req, res) => {
  res.clearCookie('username', { path: '/' });
  res.json({ success: true });
});

// ======= Картки лояльності =======
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

// ======= Додати картку =======
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

// ======= Видалити картку =======
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

// ======= Запуск сервера =======
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
