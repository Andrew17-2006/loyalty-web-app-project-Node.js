document.addEventListener("DOMContentLoaded", async () => {
  const ctx = document.getElementById("investmentChart").getContext("2d");
  const assetBtns = document.querySelectorAll(".asset-btn");
  const rangeBtns = document.querySelectorAll(".range-btn");
  const assetSelect = document.getElementById("assetSelect");
  const investBtn = document.getElementById("investBtn");
  const amountInput = document.getElementById("investAmount");
  const balanceInfo = document.getElementById("balanceInfo");
  const portfolioTable = document.getElementById("portfolioTable");

  let cashbackBalance = 1250;
  let currentAsset = "USD";
  let currentRange = 7;
  let chart;
  let portfolio = [];

  // === Отримати реальні поточні курси без ключа ===
  async function fetchLiveRates() {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await res.json();
      return data?.rates || {};
    } catch (err) {
      console.error("Помилка отримання курсів:", err);
      return {};
    }
  }

  // === Згенерувати історію курсів із базового значення ===
  async function fetchHistoricalRates(asset, days) {
    const rates = await fetchLiveRates();
    if (!rates.UAH || !rates.EUR || !rates.GBP) {
      console.warn("⚠️ Недостатньо даних для побудови графіка");
    }

    const baseRateUAH = {
      USD: rates.UAH || 39.5,
      EUR: (rates.UAH / rates.EUR) || 42.3,
      GBP: (rates.UAH / rates.GBP) || 48.1,
    };

    const labels = [];
    const values = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toISOString().split("T")[0]);

      // Імітація реальних коливань курсу
      const noise = (Math.sin(i / 2) + (Math.random() - 0.5)) * (asset === "GBP" ? 0.8 : asset === "EUR" ? 0.5 : 0.3);
      const dailyRate = baseRateUAH[asset] + noise;
      values.push(Number(dailyRate.toFixed(2)));
    }

    return { labels, values };
  }

  // === Побудова графіка ===
  async function renderChart(asset = currentAsset, days = currentRange) {
    const { labels, values } = await fetchHistoricalRates(asset, days);
    if (chart) chart.destroy();

    const colors = {
      USD: "#00d8ff",
      EUR: "#22c55e",
      GBP: "#f97316"
    };

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: `${asset} → UAH (${days} days)`,
          data: values,
          borderColor: colors[asset],
          backgroundColor: colors[asset] + "33",
          fill: true,
          tension: 0.35,
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: "#e2e8f0" } }
        },
        scales: {
          x: { ticks: { color: "#e2e8f0" } },
          y: { ticks: { color: "#e2e8f0" }, beginAtZero: false }
        }
      }
    });
  }

  // === Обробники кнопок валют ===
  assetBtns.forEach(btn => {
    btn.addEventListener("click", async () => {
      assetBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentAsset = btn.dataset.asset;
      assetSelect.value = currentAsset;
      await renderChart(currentAsset, currentRange);
    });
  });

  // === Обробники кнопок періодів ===
  rangeBtns.forEach(btn => {
    btn.addEventListener("click", async () => {
      rangeBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentRange = parseInt(btn.dataset.range);
      await renderChart(currentAsset, currentRange);
    });
  });

  // === Автооновлення кожні 3 хвилини ===
  setInterval(() => renderChart(currentAsset, currentRange), 180000);

  // === Інвестування ===
  investBtn.addEventListener("click", async () => {
    const asset = assetSelect.value;
    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) return alert("Enter valid amount!");
    if (amount > cashbackBalance) return alert("Not enough cashback!");

    cashbackBalance -= amount;
    balanceInfo.textContent = `Your cashback balance: ₴${cashbackBalance.toFixed(2)}`;

    const { values } = await fetchHistoricalRates(asset, 1);
    const rate = values[0] || 40;
    const profit = (Math.random() * 200 - 100).toFixed(2);

    portfolio.push({ asset, invested: amount, rate, profit });
    renderPortfolio();
  });

  function renderPortfolio() {
    portfolioTable.innerHTML = "";
    portfolio.forEach(p => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${p.asset}</td>
        <td>${p.invested.toFixed(2)}</td>
        <td>${p.rate.toFixed(2)}</td>
        <td style="color:${p.profit >= 0 ? "#16a34a" : "#dc2626"}">
          ${p.profit >= 0 ? "+" : ""}${p.profit}
        </td>
      `;
      portfolioTable.appendChild(row);
    });
  }

  // Початкове завантаження
  await renderChart();
});
