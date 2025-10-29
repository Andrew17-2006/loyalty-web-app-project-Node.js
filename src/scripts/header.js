// API URL - автоматично визначає localhost або Railway
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:3000'
  : 'https://loyalty-web-app-project-nodejs-production.up.railway.app';

console.log('🌐 Header API URL:', API_URL);

// Динамічне завантаження хедера та ініціалізація його функціональності
(async function() {
  // Завантажити хедер
  try {
    const response = await fetch('./header.html');
    if (!response.ok) throw new Error('Header not found');
    
    const headerHTML = await response.text();
    
    // Вставити хедер перед main.main-content або першим елементом body
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.insertAdjacentHTML('beforebegin', headerHTML);
    } else {
      document.body.insertAdjacentHTML('afterbegin', headerHTML);
    }
    
    // Після завантаження ініціалізувати всю функціональність
    initHeader();
  } catch (error) {
    console.error('Error loading header:', error);
  }
})();

// Ініціалізація всієї функціональності хедера
function initHeader() {
  // Визначити активну сторінку
  setActivePage();
  
  // Ініціалізувати профіль
  initProfile();
  
  // Ініціалізувати навігаційне підкреслення
  initNavigationUnderline();
}

// Встановити активну сторінку
function setActivePage() {
  const currentPage = window.location.pathname.split('/').pop() || 'main.html';
  const navLinks = document.querySelectorAll('.nav__link');
  
  navLinks.forEach(link => {
    const linkHref = link.getAttribute('href');
    if (linkHref === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// ========== PROFILE FUNCTIONALITY ==========
function initProfile() {
  const profileName = document.getElementById('profileName');
  const personContainer = document.getElementById('personContainer');
  const logoutBtn = document.getElementById('logoutBtn');

  if (!profileName || !personContainer || !logoutBtn) {
    console.error('Profile elements not found');
    return;
  }

  console.log('Profile script loaded');

  // Отримати поточного користувача
  (async () => {
    try {
      // ← ЗМІНЕНО: використовуємо API_URL
      const response = await fetch(`${API_URL}/currentUser`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Server response:', data);

      if (data.success && data.username) {
        profileName.textContent = data.username;
        try {
          localStorage.setItem('username', data.username);
          console.log('Cached username from /currentUser:', data.username);
        } catch (err) {
          console.warn('Could not cache username:', err);
        }
        console.log('Username set to:', data.username);
      } else {
        profileName.textContent = 'Guest';
        try { localStorage.removeItem('username'); } catch (e) {}
        console.log('No user logged in');
      }
    } catch (err) {
      console.error('Помилка при отриманні користувача:', err);
      profileName.textContent = 'Error';
      
      if (err.message.includes('Failed to fetch')) {
        console.error('Сервер не відповідає. Перевірте чи запущений node server.js');
      }
    }
  })();

  // Toggle при натисканні на іконку профілю
  personContainer.addEventListener('click', (e) => {
    e.stopPropagation();
    personContainer.classList.toggle('active');
    console.log('Container clicked, active:', personContainer.classList.contains('active'));
  });

  // Logout
  logoutBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    
    try {
      // ← ЗМІНЕНО: використовуємо API_URL
      const response = await fetch(`${API_URL}/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log('Logout response:', data);
      
      if (data.success) {
        try { localStorage.removeItem('username'); } catch (e) {}
        console.log('Logout successful, redirecting...');
        window.location.href = 'index.html';
      } else {
        alert('Помилка при виході');
      }
    } catch (err) {
      console.error('Помилка виходу:', err);
      alert('Не вдалося вийти з системи. Перевірте підключення до сервера.');
    }
  });

  // Закрити при кліку поза контейнером
  document.addEventListener('click', (e) => {
    if (!personContainer.contains(e.target)) {
      personContainer.classList.remove('active');
    }
  });
}

// ========== NAVIGATION UNDERLINE ==========
function initNavigationUnderline() {
  const navLinks = document.querySelectorAll('.nav__link');
  const navList = document.querySelector('.nav__list');
  const underline = document.querySelector('.nav__underline');

  if (!underline || navLinks.length === 0) {
    console.error('Navigation underline elements not found');
    return;
  }

  // Функція для переміщення підкреслення
  function moveUnderline(link) {
    const linkRect = link.getBoundingClientRect();
    const listRect = navList.getBoundingClientRect();
    
    const left = linkRect.left - listRect.left;
    const width = linkRect.width;
    
    underline.style.width = `${width}px`;
    underline.style.left = `${left}px`;
  }

  // Ініціалізація - підкреслити активний елемент
  const activeLink = document.querySelector('.nav__link.active');
  if (activeLink) {
    // Встановити початкову позицію без анімації
    underline.style.transition = 'none';
    setTimeout(() => {
      moveUnderline(activeLink);
      // Увімкнути анімацію після встановлення позиції
      setTimeout(() => {
        underline.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      }, 50);
    }, 100);
  }

  // Обробник кліків на навігаційні посилання
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      // Видалити active з усіх посилань
      navLinks.forEach(l => l.classList.remove('active'));
      
      // Додати active до поточного
      link.classList.add('active');
      
      // Перемістити підкреслення
      moveUnderline(link);
    });
  });

  // Оновити позицію при зміні розміру вікна
  window.addEventListener('resize', () => {
    const active = document.querySelector('.nav__link.active');
    if (active) {
      moveUnderline(active);
    }
  });
}