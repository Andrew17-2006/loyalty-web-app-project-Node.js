document.addEventListener("DOMContentLoaded", async () => {
  const ctx = document.getElementById("investmentChart").getContext("2d");
  const assetSelect = document.getElementById("assetSelect");
  const investBtn = document.getElementById("investBtn");
  const amountInput = document.getElementById("investAmount");
  const balanceInfo = document.getElementById("balanceInfo");
  const portfolioTable = document.getElementById("portfolioTable");
  const rangeBtns = document.querySelectorAll(".range-btn");

  let cashbackBalance = 1250; // приклад — можна підключити з лояльності
  balanceInfo.textContent = `Your cashback balance: ₴${cashbackBalance}`;

  let chart;
  let portfolio = JSON.parse(localStorage.getItem("portfolio")) || [];
  let currentRange = 7;

  // === Завантаження історичних курсів ===
  async function fetchHistoricalData(asset, days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);

  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];
  let base, symbols;

  if (asset === "BTC") {
    // BTC fallback — немає даних у exchangerate.host/timeseries
    console.warn("⚠️ Using BTC fallback data");
    const labels = Array.from({ length: days }, (_, i) => `Day ${i + 1}`);
    const values = Array.from({ length: days }, () =>
      38000 + Math.random() * 2000
    );
    return { labels, values };
    } else {
      base = asset;
      symbols = "UAH";
    }

    const url = `https://api.exchangerate.host/v1/timeseries?start_date=${startStr}&end_date=${endStr}&base=${base}&symbols=${symbols}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (!data.rates) {
        console.error("❌ No rates field in API response:", data);
        return { labels: [], values: [] };
      }

      const labels = Object.keys(data.rates);
      const values = Object.values(data.rates).map(v => Object.values(v)[0]);

      return { labels, values };
    } catch (err) {
      console.error("❌ Error fetching rates:", err);
      return { labels: [], values: [] };
    }
  }

  // === Побудова графіка ===
  async function renderChart(asset = assetSelect.value, days = currentRange) {
    const { labels, values } = await fetchHistoricalData(asset, days);

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: `${asset} trend (${days} days)`,
          data: values,
          borderColor: "#00acdc",
          backgroundColor: "rgba(0, 172, 220, 0.2)",
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: false } },
        plugins: { legend: { display: false } }
      }
    });
  }

  // === Інвестування ===
  investBtn.addEventListener("click", () => {
    const asset = assetSelect.value;
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) return alert("Enter a valid amount!");
    if (amount > cashbackBalance) return alert("Not enough cashback!");

    const currentRate = chart?.data?.datasets?.[0]?.data?.slice(-1)?.[0] || 40;
    const profitPercent = (Math.random() * 10 - 5).toFixed(2); // випадкові зміни %

    cashbackBalance -= amount;
    balanceInfo.textContent = `Your cashback balance: ₴${cashbackBalance.toFixed(2)}`;

    portfolio.push({
      asset,
      invested: amount,
      rate: currentRate,
      change: profitPercent,
      profit: (amount * profitPercent / 100).toFixed(2)
    });

    localStorage.setItem("portfolio", JSON.stringify(portfolio));
    renderPortfolio();
  });

  // === Відображення портфеля ===
  function renderPortfolio() {
    portfolioTable.innerHTML = "";
    portfolio.forEach((p) => {
      const row = document.createElement("tr");
      const color = p.profit >= 0 ? "#16a34a" : "#dc2626";
      row.innerHTML = `
        <td>${p.asset}</td>
        <td>${p.invested.toFixed(2)}</td>
        <td>${p.rate.toFixed(2)}</td>
        <td style="color:${color}">${p.change}%</td>
        <td style="color:${color}">${p.profit >= 0 ? "+" : ""}${p.profit}</td>
      `;
      portfolioTable.appendChild(row);
    });
  }

  // === Кнопки діапазонів ===
  rangeBtns.forEach(btn => {
    btn.addEventListener("click", async () => {
      rangeBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentRange = parseInt(btn.dataset.range);
      await renderChart(assetSelect.value, currentRange);
    });
  });

  // === Початкове відображення ===
  await renderChart("USD", currentRange);
  renderPortfolio();
});
