document.addEventListener("DOMContentLoaded", async () => {
  const ctx = document.getElementById("investmentChart").getContext("2d");
  const assetSelect = document.getElementById("assetSelect");
  const investBtn = document.getElementById("investBtn");
  const amountInput = document.getElementById("investAmount");
  const balanceInfo = document.getElementById("balanceInfo");
  const portfolioTable = document.getElementById("portfolioTable");
  const rangeBtns = document.querySelectorAll(".range-btn");

  let cashbackBalance = 1250;
  let currentAsset = "USD";
  let currentRange = 7;
  let chart;
  let portfolio = [];

  // === Отримати історичні курси ===
  async function fetchHistoricalRates(asset, days) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const base = asset;
    const symbol = asset === "BTC" ? "USD" : "UAH";

    const url = `https://api.exchangerate.host/timeseries?base=${base}&symbols=${symbol}&start_date=${start
      .toISOString()
      .split("T")[0]}&end_date=${end.toISOString().split("T")[0]}`;

    const response = await fetch(url);
    const data = await response.json();
    if (!data.rates) return { labels: [], values: [] };

    const labels = Object.keys(data.rates);
    const values = Object.values(data.rates).map((v) => Object.values(v)[0]);
    return { labels, values };
  }

  // === Побудова графіка ===
  async function renderChart(asset = currentAsset, days = currentRange) {
    const { labels, values } = await fetchHistoricalRates(asset, days);

    if (chart) chart.destroy();
    if (!labels.length) return;

    const color = asset === "BTC" ? "#facc15" : "#00d8ff";

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: `${asset} trend (${days} days)`,
            data: values,
            borderColor: color,
            backgroundColor: "rgba(0, 216, 255, 0.1)",
            fill: true,
            tension: 0.4,
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000,
          easing: "easeInOutQuart",
        },
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { ticks: { color: "#e2e8f0" } },
          y: { ticks: { color: "#e2e8f0" } },
        },
      },
    });
  }

  // === Кнопки періодів ===
  rangeBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      rangeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentRange = parseInt(btn.dataset.range);
      await renderChart(currentAsset, currentRange);
    });
  });

  // === Автоматичне оновлення графіка ===
  setInterval(() => {
    renderChart(currentAsset, currentRange);
  }, 10000);

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
    portfolio.forEach((p) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${p.asset}</td>
        <td>${p.invested.toFixed(2)}</td>
        <td>${p.rate.toFixed(2)}</td>
        <td style="color:${p.profit >= 0 ? '#16a34a' : '#dc2626'}">${p.profit >= 0 ? "+" : ""}${p.profit}</td>
        <td style="color:${p.profit >= 0 ? '#16a34a' : '#dc2626'}">
          ${(p.invested * (p.profit / 100)).toFixed(2)}
        </td>
      `;
      portfolioTable.appendChild(row);
    });
  }

  // === Початкове завантаження ===
  await renderChart();
});
