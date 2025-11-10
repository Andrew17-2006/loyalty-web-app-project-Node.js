document.addEventListener("DOMContentLoaded", async () => {
  const ctx = document.getElementById("investmentChart").getContext("2d");
  const assetSelect = document.getElementById("assetSelect");
  const investBtn = document.getElementById("investBtn");
  const amountInput = document.getElementById("investAmount");
  const balanceInfo = document.getElementById("balanceInfo");
  const portfolioTable = document.getElementById("portfolioTable");
  const rangeBtns = document.querySelectorAll(".range-btn");

  let cashbackBalance = 1250;
  let chart;
  let portfolio = JSON.parse(localStorage.getItem("portfolio")) || [];
  let currentRange = parseInt(localStorage.getItem("chartRange")) || 30;
  let currentAsset = localStorage.getItem("chartAsset") || "USD";
  let currentRate = 0;

  balanceInfo.textContent = `Your cashback balance: ₴${cashbackBalance}`;
  assetSelect.value = currentAsset;

  // Toast message
  function showToast(msg) {
    const toast = document.createElement("div");
    toast.textContent = msg;
    toast.className = "toast";
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => toast.classList.remove("show"), 3000);
    setTimeout(() => toast.remove(), 3500);
  }

  // Fetch current rate
  async function fetchCurrentRate(asset) {
    const url = `https://api.exchangerate.host/latest?base=${asset}&symbols=${asset === "BTC" ? "USD" : "UAH"}`;
    const res = await fetch(url);
    const data = await res.json();
    const rate = Object.values(data.rates)[0];
    currentRate = rate;
    return rate;
  }

  // Fetch historical data
  async function fetchHistoricalData(asset, days) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    let base = asset;
    let symbols = asset === "BTC" ? "USD" : "UAH";

    const url = `https://api.exchangerate.host/timeseries?start_date=${startStr}&end_date=${endStr}&base=${base}&symbols=${symbols}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.rates) {
      console.warn("⚠️ No data, generating fallback dataset");
      const labels = Array.from({ length: days }, (_, i) => `Day ${i + 1}`);
      const values = Array.from({ length: days }, () =>
        currentRate + (Math.random() - 0.5) * 0.5
      );
      return { labels, values };
    }

    const labels = Object.keys(data.rates);
    const values = Object.values(data.rates).map((v) => Object.values(v)[0]);
    return { labels, values };
  }

  // Render chart
  async function renderChart(asset = currentAsset, days = currentRange) {
    const rate = await fetchCurrentRate(asset);
    const { labels, values } = await fetchHistoricalData(asset, days);

    if (!labels.length) {
      console.error("❌ No data for chart rendering");
      return;
    }

    if (chart) chart.destroy();

    const colorTrend = values[values.length - 1] > values[0] ? "#16a34a" : "#dc2626";

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: `${asset} trend (${days} days)`,
            data: values,
            borderColor: colorTrend,
            backgroundColor: "rgba(0, 172, 220, 0.15)",
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: false } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.y.toFixed(2)} ${asset === "BTC" ? "USD" : "UAH"}`,
            },
          },
        },
      },
    });

    document.querySelector(".chart-section h2").textContent = `${asset} Rate — ${rate.toFixed(2)} ${asset === "BTC" ? "USD" : "UAH"}`;

    localStorage.setItem("chartAsset", asset);
    localStorage.setItem("chartRange", days);
  }

  // Invest logic
  investBtn.addEventListener("click", () => {
    const asset = assetSelect.value;
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) return alert("Enter a valid amount!");
    if (amount > cashbackBalance) return alert("Not enough cashback!");

    const rate = currentRate || 40;
    const profitPercent = (Math.random() * 10 - 5).toFixed(2);
    const profit = (amount * profitPercent / 100).toFixed(2);

    cashbackBalance -= amount;
    balanceInfo.textContent = `Your cashback balance: ₴${cashbackBalance.toFixed(2)}`;

    portfolio.push({ asset, invested: amount, rate, change: profitPercent, profit });
    localStorage.setItem("portfolio", JSON.stringify(portfolio));

    renderPortfolio();
    renderStats();
    showToast(`✅ Invested ₴${amount.toFixed(2)} in ${asset}`);
  });

  // Portfolio table
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

  // Portfolio stats
  function renderStats() {
    const statsEl = document.getElementById("portfolioStats");
    if (!statsEl) return;

    if (portfolio.length === 0) {
      statsEl.innerHTML = `<p style="opacity:0.7">No investments yet</p>`;
      return;
    }

    const totalInvested = portfolio.reduce((s, p) => s + p.invested, 0);
    const totalProfit = portfolio.reduce((s, p) => s + Number(p.profit), 0);
    const avgChange = portfolio.reduce((s, p) => s + Number(p.change), 0) / portfolio.length;
    const uniqueAssets = new Set(portfolio.map((p) => p.asset)).size;

    const color = totalProfit >= 0 ? "#16a34a" : "#dc2626";
    statsEl.innerHTML = `
      <div class="stats-box"><strong>💸 Total Invested:</strong> ₴${totalInvested.toFixed(2)}</div>
      <div class="stats-box"><strong>📊 Avg Profit:</strong> ${avgChange.toFixed(2)}%</div>
      <div class="stats-box"><strong>💹 Total Profit:</strong> <span style="color:${color}">${totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}</span> ₴</div>
      <div class="stats-box"><strong>🪙 Active Assets:</strong> ${uniqueAssets}</div>
    `;
  }

  // Buttons
  rangeBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      rangeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentRange = parseInt(btn.dataset.range);
      await renderChart(assetSelect.value, currentRange);
    });
  });

  assetSelect.addEventListener("change", async () => {
    currentAsset = assetSelect.value;
    await renderChart(currentAsset, currentRange);
  });

  // Initial render
  await renderChart(currentAsset, currentRange);
  renderPortfolio();
  renderStats();

  // Auto-refresh every 5 minutes
  setInterval(() => renderChart(currentAsset, currentRange), 300000);
});
