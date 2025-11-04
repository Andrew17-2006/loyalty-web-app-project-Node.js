document.addEventListener('DOMContentLoaded', () => {
  console.log('💰 Investments page loaded');

  const form = document.getElementById('invest-form');
  const tableBody = document.getElementById('invest-table-body');

  // Зберігаємо інвестиції в LocalStorage
  const investments = JSON.parse(localStorage.getItem('investments')) || [];

  function renderTable() {
    tableBody.innerHTML = '';
    investments.forEach(inv => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${inv.project}</td>
        <td>₴${inv.amount.toFixed(2)}</td>
        <td>₴${(inv.amount * inv.profitRate).toFixed(2)}</td>
        <td>${inv.date}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  renderTable();

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const project = document.getElementById('projectName').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const profitRate = +(Math.random() * 0.15 + 0.02).toFixed(2); // 2–17% прибутку
    const date = new Date().toLocaleDateString('uk-UA');

    const newInvestment = { project, amount, profitRate, date };
    investments.push(newInvestment);

    localStorage.setItem('investments', JSON.stringify(investments));
    renderTable();

    form.reset();
  });
});
