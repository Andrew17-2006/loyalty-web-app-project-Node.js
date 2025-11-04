document.addEventListener('DOMContentLoaded', async () => {
  const cashbackEl = document.getElementById('cashback-balance');
  const investedEl = document.getElementById('invested-total');
  const profitEl = document.getElementById('invested-profit');
  const marketList = document.getElementById('market-list');
  const portfolioBody = document.getElementById('portfolio-body');

  let cashback = parseFloat(localStorage.getItem('cashback') || '1200'); // приклад
  let portfolio = JSON.parse(localStorage.getItem('portfolio') || '[]');

  // Показати кешбек
  cashbackEl.textContent = `₴${cashback.toFixed(2)}`;

  // Отримати курси валют
  async function fetchRates() {
    const res = await fetch('https://api.exchangerate.host/latest?base=UAH&symbols=USD,EUR,GBP,BTC');
    const data = await res.json();
    return data.rates;
  }

  const rates = await fetchRates();

  // Побудова ринку валют
  Object.entries(rates).forEach(([currency, rate]) => {
    const card = document.createElement('div');
    card.className = 'market-card';
    card.innerHTML = `
      <h3>${currency}</h3>
      <p>1 ${currency} = ${(1 / rate).toFixed(2)} ₴</p>
      <button class="invest-btn">Invest</button>
    `;

    const investBtn = card.querySelector('.invest-btn');
    investBtn.addEventListener('click', () => invest(currency, 1 / rate));

    marketList.appendChild(card);
  });

  // Інвестування
  function invest(currency, priceUAH) {
    const amount = prompt(`Скільки ₴ кешбеку інвестувати у ${currency}?`, '100');
    const investUAH = parseFloat(amount);

    if (isNaN(investUAH) || investUAH <= 0 || investUAH > cashback) {
      alert('❌ Некоректна сума або недостатньо коштів!');
      return;
    }

    cashback -= investUAH;
    cashbackEl.textContent = `₴${cashback.toFixed(2)}`;
    localStorage.setItem('cashback', cashback);

    const current = portfolio.find(p => p.currency === currency);
    if (current) {
      current.invested += investUAH;
      current.amount += investUAH / priceUAH;
    } else {
      portfolio.push({
        currency,
        invested: investUAH,
        amount: investUAH / priceUAH,
        priceAtBuy: priceUAH
      });
    }

    localStorage.setItem('portfolio', JSON.stringify(portfolio));
    renderPortfolio();
  }

  // Відображення портфоліо
  function renderPortfolio() {
    portfolioBody.innerHTML = '';
    let totalInvested = 0;
    let totalProfit = 0;

    portfolio.forEach(item => {
      const currentRate = 1 / rates[item.currency];
      const currentValue = item.amount * currentRate;
      const profit = currentValue - item.invested;

      totalInvested += item.invested;
      totalProfit += profit;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.currency}</td>
        <td>₴${item.invested.toFixed(2)}</td>
        <td>₴${currentValue.toFixed(2)}</td>
        <td style="color: ${profit >= 0 ? '#22c55e' : '#ef4444'};">₴${profit.toFixed(2)}</td>
      `;
      portfolioBody.appendChild(row);
    });

    investedEl.textContent = `₴${totalInvested.toFixed(2)}`;
    profitEl.textContent = `₴${totalProfit.toFixed(2)}`;
  }

  renderPortfolio();
});
