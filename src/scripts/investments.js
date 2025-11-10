document.addEventListener("DOMContentLoaded", async () => {
  const ctx = document.getElementById("investmentChart")?.getContext("2d");
  if (!ctx) {
    console.error("❌ Canvas not found or context is null");
    return;
  }

  const assetSelect = document.getElementById("assetSelect");
  const investBtn = document.getElementById("investBtn");
  const amountInput = document.getElementById("investAmount");
  const balanceInfo = document.getElementById("balanceInfo");
  const portfolioTable = document.getElementById("portfolioTable");
  const rangeBtns = document.querySelectorAll(".range-btn");

  let cashbackBalance = 1250;
  let chart;
  let portfolio = [];
  let currentRange = 30;
  let currentAsset = "USD";
  let currentRate = 0;
  let autoUpdateInterval;

  balanceInfo.textContent = `Your cashback balance: ₴${cashbackBalance}`;

  async function fetchCurrentRate(asset) {
    const url = `https://api.exchangerate.host/latest?base=${asset}&symbols=${asset === "BTC" ? "USD" : "UAH"}`;
    const res = await fetch(url);
    const data = await res.json();
    const rate = data?.rates ? Object.values(data.rates)[0] : 0;
    currentRate = rate;
    return rate;
  }

  async function fetchHistoricalData(asset, days) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const url = `https://api.exchangerate.host/timeseries?base=${asset}&symbols=${asset === "BTC" ? "USD" : "UAH"}&start_date=${start.toISOString().split("T")[0]}&end_date=${end.toISOString().split("T")[0]}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data?.rates) {
      console.warn("⚠️ No data, generating mock points");
      const labels = Array.from({ length: days }, (_, i) => `Day ${i + 1}`);
      const values = Array.from({ length: days }, () => currentRate || 40);
      return { labels, values };
    }

    const labels = Object.keys(data.rates);
    const values = Object.values(data.rates).map((v) => Object.values(v)[0]);
    return { labels, values };
  }

  async function renderChart(asset = currentAsset, days = currentRange) {
    try {
      const rate = await fetchCurrentRate(asset);
      const { labels, values } = await fetchHistoricalData(asset, days);

      if (chart) chart.destroy();
      if (!labels?.length) return;

      chart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: `${asset} trend (${days} days)`,
              data: values,
              borderColor: "#00d8ff",
              backgroundColor: "rgba(0, 216, 255, 0.15)",
              fill: true,
              tension: 0.4,
              borderWidth: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: { ticks: { color: "#e2e8f0" } },
            y: { ticks: { color: "#e2e8f0" } },
          },
        },
      });

      document.querySelector(".chart-section h2").textContent =
        `${asset} Rate — ${rate.toFixed(2)} ${asset === "BTC" ? "USD" : "UAH"}`;
    } catch (err) {
      console.error("❌ Chart rendering failed:", err);
    }
  }

  // === Інтервал оновлення кожні 10 секунд ===
  function startAutoUpdate() {
    if (autoUpdateInterval) clearInterval(autoUpdateInterval);
    autoUpdateInterval = setInterval(() => {
      renderChart(currentAsset, currentRange);
    }, 10000);
  }

  rangeBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      rangeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentRange = parseInt(btn.dataset.range);
      await renderChart(currentAsset, currentRange);
    });
  });

  assetSelect.addEventListener("change", async () => {
    currentAsset = assetSelect.value;
    await renderChart(currentAsset, currentRange);
  });

  await renderChart(currentAsset, currentRange);
  startAutoUpdate();
});
