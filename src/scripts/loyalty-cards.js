// === Loyalty Cards Script ===
// Отримуємо API_URL з header.js або створюємо резервний
const API_URL = window.API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'https://loyalty-web-app-project-nodejs-production.up.railway.app'
);

console.log('🌐 Loyalty Cards API URL:', API_URL);

// Loyalty Cards з інтеграцією БД
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📦 Loyalty-cards script loaded');

  const addCardBtn = document.querySelector('.add-card');
  const loyaltyGrid = document.querySelector('.loyalty-grid');
  const activeCardsCounter = document.querySelector('.bonus-box:nth-child(3) h3');
  const MAX_CARDS = 6;

  if (!addCardBtn) {
    console.error('❌ Елемент .add-card не знайдено!');
    return;
  }

  // Helper: read cached username or fetch from server and cache it
  async function ensureUsernameCached() {
    const cached = localStorage.getItem('username');
    if (cached) return cached;

    try {
      const resp = await fetch(`${API_URL}/currentUser`, { credentials: 'include' });
      const data = await resp.json();
      if (data && data.success && data.username) {
        localStorage.setItem('username', data.username);
        return data.username;
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch currentUser:', err);
    }

    return null;
  }

  // Helper: build headers to send username fallback when cookies are not sent
  function makeAuthHeaders() {
    const headers = {};
    const username = localStorage.getItem('username');
    if (username) headers['x-username'] = username;
    return headers;
  }

  // Список магазинів
  const stores = [
    'АТБ', 'Сільпо', 'OKKO', 'Rozetka',
    'Comfy', 'Eldorado', 'Фора', 'Novus',
    'Аптека 911', "McDonald's", 'KFC', 'Інший'
  ];

  // Спершу кешуємо користувача, потім завантажуємо картки
  await ensureUsernameCached();
  await loadCardsFromDB();

  // Оновити лічильник
  function updateCardCounter() {
    const totalCards = document.querySelectorAll('.editable-card').length;
    if (activeCardsCounter) activeCardsCounter.textContent = totalCards;
    addCardBtn.style.display = totalCards >= MAX_CARDS ? 'none' : 'flex';
  }

  // Завантажити картки з БД
  async function loadCardsFromDB() {
    try {
      const response = await fetch(`${API_URL}/api/loyalty-cards`, {
        method: 'GET',
        credentials: 'include',
        headers: makeAuthHeaders()
      });
      const data = await response.json();

      if (data.success && data.cards) {
        data.cards.forEach(cardData => {
          const card = createCard(cardData);
          loyaltyGrid.insertBefore(card, addCardBtn);
        });
        updateCardCounter();
      }
    } catch (err) {
      console.error('Помилка завантаження карток:', err);
    }
  }

  // Додавання нової картки
  addCardBtn.addEventListener('click', async () => {
    console.log('🟢 Add card clicked');
    const currentCards = document.querySelectorAll('.editable-card').length;
    
    if (currentCards >= MAX_CARDS) {
      alert(`Максимальна кількість карток: ${MAX_CARDS}`);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/loyalty-cards`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, makeAuthHeaders()),
        credentials: 'include',
        body: JSON.stringify({
          card_name: 'Нова картка',
          store_name: 'Інший',
          color: '#1e293b',
          code_value: `CARD${Date.now()}`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const cardData = {
          id: data.cardId,
          card_name: 'Нова картка',
          store_name: 'Інший',
          color: '#1e293b',
          code_value: `CARD${Date.now()}`
        };
        const newCard = createCard(cardData);
        loyaltyGrid.insertBefore(newCard, addCardBtn);
        updateCardCounter();
      } else {
        alert(data.message || 'Помилка додавання картки');
      }
    } catch (err) {
      console.error('Помилка:', err);
      alert('Не вдалося додати картку');
    }
  });

  // Створення картки
  function createCard(cardData) {
    const card = document.createElement('div');
    card.className = 'loyalty-card editable-card';
    card.dataset.cardId = cardData.id;
    card.style.background = `linear-gradient(135deg, ${cardData.color}, ${adjustBrightness(cardData.color, -20)})`;

    card.innerHTML = `
      <button class="edit-btn" title="Редагувати">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
      </button>
      <button class="delete-btn" title="Видалити">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14В4z"/>
        </svg>
      </button>
      <div class="card-content">
        <p class="store-name">${cardData.card_name}</p>
        <p class="store-label">${cardData.store_name}</p>
      </div>
      <div class="edit-panel">
        <div class="edit-form">
          <label>Назва картки:</label>
          <input type="text" class="card-input" placeholder="Назва" value="${cardData.card_name}" maxlength="16">
          
          <label>Магазин:</label>
          <select class="store-select">
            ${stores.map(store => `<option value="${store}" ${store === cardData.store_name ? 'selected' : ''}>${store}</option>`).join('')}
          </select>
          
          <label>Колір:</label>
          <div class="color-picker">
            <button class="color-btn ${cardData.color === '#1e293b' ? 'selected' : ''}" data-color="#1e293b" style="background: #1e293b"></button>
            <button class="color-btn ${cardData.color === '#dc2626' ? 'selected' : ''}" data-color="#dc2626" style="background: #dc2626"></button>
            <button class="color-btn ${cardData.color === '#ea580c' ? 'selected' : ''}" data-color="#ea580c" style="background: #ea580c"></button>
            <button class="color-btn ${cardData.color === '#16a34a' ? 'selected' : ''}" data-color="#16a34a" style="background: #16a34a"></button>
            <button class="color-btn ${cardData.color === '#2563eb' ? 'selected' : ''}" data-color="#2563eb" style="background: #2563eb"></button>
            <button class="color-btn ${cardData.color === '#9333ea' ? 'selected' : ''}" data-color="#9333ea" style="background: #9333ea"></button>
            <button class="color-btn ${cardData.color === '#db2777' ? 'selected' : ''}" data-color="#db2777" style="background: #db2777"></button>
          </div>
          
          <button class="done-btn">Зберегти</button>
        </div>
      </div>
    `;

    const editBtn = card.querySelector('.edit-btn');
    const deleteBtn = card.querySelector('.delete-btn');
    const editPanel = card.querySelector('.edit-panel');
    const cardContent = card.querySelector('.card-content');
    const cardInput = card.querySelector('.card-input');
    const storeSelect = card.querySelector('.store-select');
    const storeName = card.querySelector('.store-name');
    const storeLabel = card.querySelector('.store-label');
    const colorBtns = card.querySelectorAll('.color-btn');
    const doneBtn = card.querySelector('.done-btn');
    let selectedColor = cardData.color;

    card.addEventListener('mouseenter', () => {
      if (editPanel.style.display !== 'flex') {
        editBtn.style.opacity = '1';
        editBtn.style.visibility = 'visible';
        deleteBtn.style.opacity = '1';
        deleteBtn.style.visibility = 'visible';
      }
    });

    card.addEventListener('mouseleave', () => {
      if (editPanel.style.display !== 'flex') {
        editBtn.style.opacity = '0';
        editBtn.style.visibility = 'hidden';
        deleteBtn.style.opacity = '0';
        deleteBtn.style.visibility = 'hidden';
      }
    });

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (editPanel.style.display === 'flex') closeEditPanel();
      else openEditPanel();
    });

    function openEditPanel() {
      cardContent.style.display = 'none';
      editPanel.style.display = 'flex';
      editBtn.style.display = 'none';
      deleteBtn.style.display = 'none';
      card.style.width = '220px';
      card.style.height = '360px';
    }

    function closeEditPanel() {
      cardContent.style.display = 'flex';
      editPanel.style.display = 'none';
      editBtn.style.display = 'flex';
      deleteBtn.style.display = 'flex';
      editBtn.style.opacity = '0';
      editBtn.style.visibility = 'hidden';
      deleteBtn.style.opacity = '0';
      deleteBtn.style.visibility = 'hidden';
      card.style.width = '200px';
      card.style.height = '320px';
    }

    colorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        selectedColor = btn.dataset.color;
        card.style.background = `linear-gradient(135deg, ${selectedColor}, ${adjustBrightness(selectedColor, -20)})`;
        colorBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    cardInput.addEventListener('input', () => {
      storeName.textContent = cardInput.value || 'Нова картка';
    });

    storeSelect.addEventListener('change', () => {
      storeLabel.textContent = storeSelect.value;
    });

    doneBtn.addEventListener('click', async () => {
      const updatedData = {
        card_name: cardInput.value || 'Нова картка',
        store_name: storeSelect.value,
        color: selectedColor,
        code_value: cardData.code_value
      };

      try {
        const response = await fetch(`${API_URL}/api/loyalty-cards/${cardData.id}`, {
          method: 'PUT',
          headers: Object.assign({ 'Content-Type': 'application/json' }, makeAuthHeaders()),
          credentials: 'include',
          body: JSON.stringify(updatedData)
        });

        const data = await response.json();
        
        if (data.success) {
          storeName.textContent = updatedData.card_name;
          storeLabel.textContent = updatedData.store_name;
          closeEditPanel();
        } else {
          alert(data.message || 'Помилка збереження');
        }
      } catch (err) {
        console.error('Помилка:', err);
        alert('Не вдалося зберегти зміни');
      }
    });

    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Видалити цю картку?')) return;

      try {
        const response = await fetch(`${API_URL}/api/loyalty-cards/${cardData.id}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: makeAuthHeaders()
        });

        const data = await response.json();
        
        if (data.success) {
          card.remove();
          updateCardCounter();
        } else {
          alert(data.message || 'Помилка видалення');
        }
      } catch (err) {
        console.error('Помилка:', err);
        alert('Не вдалося видалити картку');
      }
    });

    return card;
  }

  function adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }
});
