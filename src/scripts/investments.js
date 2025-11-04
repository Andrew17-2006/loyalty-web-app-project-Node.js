document.addEventListener("DOMContentLoaded", async () => {
  const API_URL = "https://api.exchangerate.host/latest";
  const assetSelect = document.getElementById("assetSelect");
  const investBtn = document.getElementById("investBtn");
  const amountInput = document.getElementById("investAmount");
  const balanceInfo = document.getElementById("balanceInfo");
  const portfolioTable = document.getElementById("portfolioTable");
  const ctx = document.getElementById("investmentChart").getContext("2d");

  let cashbackBalance = 1250; // test balance (from loyalty)
  balanceInfo.textContent = `Your cashback balance: ₴${cashbackBalance}`;

  let rates = {};
  let portfolio = [];

  // === Load exchange rates ===
  async function fetchRates() {
    const response = await fetch(API_URL);
    const data = await response.json();
    rates = data.rates;
    console.log("📈 Loaded rates:", rates);
    renderChart();
  }

  // === Render chart ===
  function renderChart() {
    new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            label: "UAH / USD trend",
            borderColor: "#00acdc",
            data: [39.2, 39.5, 39.1, 38.9, 39.3, 39.6, 39.2],
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: false } },
      },
    });
  }

  // === Invest logic ===
  investBtn.addEventListener("click", () => {
    const asset = assetSelect.value;
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) {
      alert("Enter a valid amount!");
      return;
    }

    if (amount > cashbackBalance) {
      alert("Not enough cashback!");
      return;
    }

    const rate = asset === "BTC" ? 39000 : rates[asset] || 40;
    const profit = (Math.random() * 200 - 100).toFixed(2);

    cashbackBalance -= amount;
    balanceInfo.textContent = `Your cashback balance: ₴${cashbackBalance.toFixed(2)}`;

    portfolio.push({ asset, invested: amount, rate, profit });
    renderPortfolio();
  });

  // === Render portfolio ===
  function renderPortfolio() {
    portfolioTable.innerHTML = "";
    portfolio.forEach((p) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${p.asset}</td>
        <td>${p.invested.toFixed(2)}</td>
        <td>${p.rate}</td>
        <td style="color:${p.profit >= 0 ? '#16a34a' : '#dc2626'}">
          ${p.profit >= 0 ? "+" : ""}${p.profit}
        </td>
      `;
      portfolioTable.appendChild(row);
    });
  }

  await fetchRates();
});
