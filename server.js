const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// ВАЖЛИВО: CORS має бути перед всіма роутами
app.use(cors({ 
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://andrew17-2006.github.io/loyalty-web-app-project-Node.js/'
  ],
  credentials: true,
  // Allow the custom header used as a username fallback
  allowedHeaders: ['Content-Type', 'x-username'],
  optionsSuccessStatus: 200
}));

// Simple request logger to help debug whether requests reach the server
app.use((req, res, next) => {
  console.log('>>> REQ', req.method, req.originalUrl);
  next();
});

// Accept OPTIONS preflight globally and echo allowed headers (helpful for dev)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.header('Origin') || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, x-username');
    return res.sendStatus(200);
  }
  next();
});

app.use(bodyParser.json());
app.use(cookieParser());

// Helper to get username from cookie or custom header/body (fallback)
function getUsernameFromReq(req) {
  if (req.cookies && req.cookies.username) return req.cookies.username;
  // Support header fallback for clients that can't send cookies
  if (req.get('x-username')) return req.get('x-username');
  // Also allow username in body for POST/PUT where appropriate
  if (req.body && req.body.username) return req.body.username;
  return null;
}

const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'loyaltycards',
  port: 3306
});

db.connect((err) => {
  if (err) {
    console.error('Помилка підключення до БД:', err);
    return;
  }
  console.log('Підключено до MySQL БД!');
});

// Реєстрація
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.json({ success: false, message: 'Заповніть всі поля!' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
    db.query(sql, [username, email, hashedPassword], (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.json({ success: false, message: 'Користувач з таким email або ім\'ям вже існує!' });
        return res.json({ success: false, message: 'Помилка при реєстрації' });
      }
      
      // Встановлюємо cookie відразу після реєстрації
      res.cookie('username', username, { 
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000
      });
      
      console.log('✅ User registered and cookie set:', username);
      // Return username so client can persist it if cookies are blocked
      res.json({ success: true, message: 'Реєстрація успішна!', username });
    });
  } catch (error) {
    res.json({ success: false, message: 'Помилка сервера' });
  }
});

// Логін
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt for:', email);
  
  if (!email || !password) return res.json({ success: false, message: 'Заповніть всі поля!' });

  const sql = 'SELECT * FROM users WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.log('DB error:', err);
      return res.json({ success: false, message: 'Помилка сервера' });
    }
    if (results.length === 0) {
      console.log('User not found');
      return res.json({ success: false, message: 'Неправильний email або пароль' });
    }

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      console.log('Invalid password');
      return res.json({ success: false, message: 'Неправильний email або пароль' });
    }

    // Встановлюємо cookie
    res.cookie('username', user.username, { 
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      domain: '127.0.0.1',
      maxAge: 24 * 60 * 60 * 1000
    });
    
    console.log('✅ Cookie set for user:', user.username);
    console.log('Cookie header:', res.getHeader('Set-Cookie'));
    // Return username so client can persist it if cookies are blocked
    res.json({ success: true, message: 'Вхід успішний!', username: user.username });
  });
});

// Повернути поточного користувача
app.get('/currentUser', (req, res) => {
  console.log('currentUser check - cookies:', req.cookies, 'x-username header:', req.get('x-username'));
  const username = getUsernameFromReq(req);
  if (username) {
    console.log('✅ User found via cookie/header/body:', username);
    res.json({ success: true, username });
  } else {
    console.log('❌ No user identity found');
    res.json({ success: false });
  }
});

// Вихід
app.post('/logout', (req, res) => {
  res.clearCookie('username', { path: '/' });
  console.log('User logged out');
  res.json({ success: true });
});

app.get('/api/loyalty-cards', (req, res) => {
  const username = getUsernameFromReq(req);
  
  if (!username) {
    return res.json({ success: false, message: 'Користувач не авторизований' });
  }

  // Спочатку знайти user_id по username
  const getUserSql = 'SELECT id FROM users WHERE username = ?';
  db.query(getUserSql, [username], (err, userResults) => {
    if (err) {
      console.error('DB error:', err);
      return res.json({ success: false, message: 'Помилка БД' });
    }
    
    if (userResults.length === 0) {
      return res.json({ success: false, message: 'Користувач не знайдений' });
    }

    const userId = userResults[0].id;

    // Отримати всі картки користувача
    const getCardsSql = 'SELECT * FROM loyalty_cards WHERE user_id = ? ORDER BY id ASC';
    db.query(getCardsSql, [userId], (err, cards) => {
      if (err) {
        console.error('DB error:', err);
        return res.json({ success: false, message: 'Помилка отримання карток' });
      }

      res.json({ success: true, cards });
    });
  });
});

// ------------------------
// Додати нову картку
app.post('/api/loyalty-cards', (req, res) => {
  // Debug: log headers/body to assist when browser preflight or headers are blocked
  console.log('Incoming POST /api/loyalty-cards headers:', req.headers);
  console.log('Incoming POST /api/loyalty-cards body:', req.body);

  const username = getUsernameFromReq(req);
  const { card_name, store_name, color, code_value } = req.body;

  if (!username) {
    return res.json({ success: false, message: 'Користувач не авторизований' });
  }

  // Знайти user_id
  const getUserSql = 'SELECT id FROM users WHERE username = ?';
  db.query(getUserSql, [username], (err, userResults) => {
    if (err || userResults.length === 0) {
      console.error('User lookup failed for username:', username, 'err:', err);
      return res.json({ success: false, message: 'Користувач не знайдений', usernameUsed: username, dbError: err ? err.message : undefined });
    }

    const userId = userResults[0].id;

    // Вставити нову картку
    const insertSql = 'INSERT INTO loyalty_cards (user_id, card_name, store_name, color, code_value) VALUES (?, ?, ?, ?, ?)';
    db.query(insertSql, [userId, card_name, store_name, color, code_value], (err, result) => {
      if (err) {
        console.error('Insert error:', err);
        return res.json({ success: false, message: 'Помилка додавання картки', error: err.message });
      }

      console.log('Insert success, id:', result.insertId);
      res.json({ 
        success: true, 
        message: 'Картку додано', 
        cardId: result.insertId,
        card: { id: result.insertId, user_id: userId, card_name, store_name, color, code_value }
      });
    });
  });
});

// ------------------------
// Оновити картку
app.put('/api/loyalty-cards/:id', (req, res) => {
  const username = getUsernameFromReq(req);
  const cardId = req.params.id;
  const { card_name, store_name, color, code_value } = req.body;

  if (!username) {
    return res.json({ success: false, message: 'Користувач не авторизований' });
  }

  // Перевірити що картка належить користувачу
  const checkSql = `
    SELECT lc.* FROM loyalty_cards lc 
    JOIN users u ON lc.user_id = u.id 
    WHERE lc.id = ? AND u.username = ?
  `;
  
  db.query(checkSql, [cardId, username], (err, results) => {
    if (err || results.length === 0) {
      return res.json({ success: false, message: 'Картка не знайдена або немає доступу' });
    }

    // Оновити картку
    const updateSql = 'UPDATE loyalty_cards SET card_name = ?, store_name = ?, color = ?, code_value = ? WHERE id = ?';
    db.query(updateSql, [card_name, store_name, color, code_value, cardId], (err) => {
      if (err) {
        console.error('Update error:', err);
        return res.json({ success: false, message: 'Помилка оновлення' });
      }

      res.json({ success: true, message: 'Картку оновлено' });
    });
  });
});

// ------------------------
// Видалити картку
  app.delete('/api/loyalty-cards/:id', (req, res) => {
    const username = getUsernameFromReq(req);
    const cardId = req.params.id;

    if (!username) {
      return res.json({ success: false, message: 'Користувач не авторизований' });
    }

    // Перевірити що картка належить користувачу
    const checkSql = `
      SELECT lc.* FROM loyalty_cards lc 
      JOIN users u ON lc.user_id = u.id 
      WHERE lc.id = ? AND u.username = ?
    `;
  
  db.query(checkSql, [cardId, username], (err, results) => {
    if (err || results.length === 0) {
      return res.json({ success: false, message: 'Картка не знайдена або немає доступу' });
    }

    // Видалити картку
    const deleteSql = 'DELETE FROM loyalty_cards WHERE id = ?';
    db.query(deleteSql, [cardId], (err) => {
      if (err) {
        console.error('Delete error:', err);
        return res.json({ success: false, message: 'Помилка видалення' });
      }

      res.json({ success: true, message: 'Картку видалено' });
    });
  });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));