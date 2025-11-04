// === Loyalty Cards Script ===
// Використовуємо глобальний API_URL з header.js
console.log('🌐 Loyalty Cards using global API_URL:', window.API_URL);

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

  // ===== Helper functions =====
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

  function makeAuthHeaders() {
    const headers = {};
    const username = localStorage.getItem('username');
    if (username) headers['x-username'] = username;
    return headers;
  }

  function updateCardCounter() {
    const totalCards = document.querySelectorAll('.editable-card').length;
    if (activeCardsCounter) activeCardsCounter.textContent = totalCards;
    addCardBtn.style.display = totalCards >= MAX_CARDS ? 'none' : 'flex';
  }

  // ===== Завантажити картки =====
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

  // ===== Генерація випадкових транзакцій =====
  function generateRandomTransactions(storeName) {
    const transactionList = document.querySelector('.transactions ul');
    const bonusTotal = document.querySelector('.bonus-box:nth-child(1) h3');
    const bonusMonth = document.querySelector('.bonus-box:nth-child(2) h3');

    if (!transactionList || !bonusTotal || !bonusMonth) return;

    let totalCashback = 0;
    let monthCashback = 0;
    const count = Math.floor(Math.random() * 3) + 2; // 2–5 транзакцій

    for (let i = 0; i < count; i++) {
      const amount = Math.floor(Math.random() * 9901) + 100;
      const cashback = +(amount * 0.02).toFixed(2);
      totalCashback += cashback;
      monthCashback += cashback;

      const li = document.createElement('li');
      li.innerHTML = `<span>${storeName}</span> — ₴${amount.toFixed(2)} <strong>+₴${cashback.toFixed(2)} кешбек</strong>`;
      transactionList.prepend(li);
    }

    const currentTotal = parseFloat(bonusTotal.textContent.replace(/[₴,]/g, '')) || 0;
    const currentMonth = parseFloat(bonusMonth.textContent.replace(/[₴,]/g, '')) || 0;
    bonusTotal.textContent = `₴${(currentTotal + totalCashback).toFixed(2)}`;
    bonusMonth.textContent = `₴${(currentMonth + monthCashback).toFixed(2)}`;
  }

  // ===== Додавання картки =====
  addCardBtn.addEventListener('click', async () => {
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

        // 🟢 Генеруємо транзакції для нового магазину
        generateRandomTransactions(cardData.store_name);
      } else {
        alert(data.message || 'Помилка додавання картки');
      }
    } catch (err) {
      console.error('Помилка:', err);
      alert('Не вдалося додати картку');
    }
  });

  // ===== Створення картки =====
  function createCard(cardData) {
    const card = document.createElement('div');
    card.className = 'loyalty-card editable-card';
    card.dataset.cardId = cardData.id;
    card.style.background = `linear-gradient(135deg, ${cardData.color}, ${adjustBrightness(cardData.color, -20)})`;

    card.innerHTML = `
      <button class="edit-btn" title="Редагувати">✏️</button>
      <button class="delete-btn" title="Видалити">🗑️</button>
      <div class="card-content">
        <p class="store-name">${cardData.card_name}</p>
        <p class="store-label">${cardData.store_name}</p>
      </div>
    `;

    return card;
  }

  function adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }

  // Завантаження існуючих карток
  await ensureUsernameCached();
  await loadCardsFromDB();
});
