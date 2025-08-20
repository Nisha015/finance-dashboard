// -----------------------
// Personal Finance Dashboard
// -----------------------

const STORAGE_KEY = "finance_transactions";
const THEME_KEY = "finance_theme";

let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let pieChart, barChart;

// ---------- Utils ----------
function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function formatCurrency(num) {
  return "₹" + Number(num).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ---------- Theme ----------
function loadTheme() {
  const theme = localStorage.getItem(THEME_KEY) || "light";
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
    document.getElementById("themeIcon").textContent = "☀️";
  } else {
    document.documentElement.classList.remove("dark");
    document.getElementById("themeIcon").textContent = "🌙";
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  if (isDark) {
    document.documentElement.classList.remove("dark");
    localStorage.setItem(THEME_KEY, "light");
    document.getElementById("themeIcon").textContent = "🌙";
  } else {
    document.documentElement.classList.add("dark");
    localStorage.setItem(THEME_KEY, "dark");
    document.getElementById("themeIcon").textContent = "☀️";
  }
}

// ---------- Rendering ----------
function renderTransactions() {
  const tbody = document.getElementById("txBody");
  const emptyState = document.getElementById("emptyState");

  tbody.innerHTML = "";
  if (transactions.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  } else {
    emptyState.classList.add("hidden");
  }

  transactions.forEach((tx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="px-3 py-2">${tx.type === "income" ? "⬆️" : "⬇️"}</td>
      <td class="px-3 py-2 font-medium ${tx.type === "income" ? "text-green-600" : "text-red-600"}">
        ${formatCurrency(tx.amount)}
      </td>
      <td class="px-3 py-2">${tx.category}</td>
      <td class="px-3 py-2">${tx.date}</td>
      <td class="px-3 py-2">${tx.notes || ""}</td>
      <td class="px-3 py-2 text-right">
        <button class="btn btn-ghost text-blue-500" onclick="editTransaction('${tx.id}')">✏️</button>
        <button class="btn btn-ghost text-red-500" onclick="deleteTransaction('${tx.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderSummary() {
  let income = 0, expense = 0;
  transactions.forEach((t) => {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  });

  document.getElementById("totalIncome").textContent = formatCurrency(income);
  document.getElementById("totalExpense").textContent = formatCurrency(expense);
  document.getElementById("balance").textContent = formatCurrency(income - expense);
}

function renderCharts() {
  // Pie chart: expense by category
  const expenseByCategory = {};
  transactions.forEach((t) => {
    if (t.type === "expense") {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
    }
  });

  const pieData = {
    labels: Object.keys(expenseByCategory),
    datasets: [{
      data: Object.values(expenseByCategory),
      backgroundColor: [
        "#f87171", "#fb923c", "#facc15", "#4ade80", "#60a5fa", "#a78bfa", "#f472b6"
      ]
    }]
  };

  if (pieChart) pieChart.destroy();
  pieChart = new Chart(document.getElementById("pieChart"), {
    type: "pie",
    data: pieData,
  });

  // Bar chart: monthly spending
  const monthly = {};
  transactions.forEach((t) => {
    const month = t.date.slice(0, 7); // YYYY-MM
    monthly[month] = (monthly[month] || 0) + (t.type === "expense" ? t.amount : 0);
  });

  const barData = {
    labels: Object.keys(monthly),
    datasets: [{
      label: "Expenses",
      data: Object.values(monthly),
      backgroundColor: "#60a5fa"
    }]
  };

  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: barData,
  });
}

function renderAll() {
  renderTransactions();
  renderSummary();
  renderCharts();
}

// ---------- CRUD ----------
function addTransaction(tx) {
  transactions.push(tx);
  saveTransactions();
  renderAll();
}

function editTransaction(id) {
  const tx = transactions.find((t) => t.id === id);
  if (!tx) return;
  document.getElementById("modalTitle").textContent = "Edit Transaction";
  document.getElementById("txId").value = tx.id;
  document.querySelector(`input[name="txType"][value="${tx.type}"]`).checked = true;
  document.getElementById("amount").value = tx.amount;
  document.getElementById("category").value = tx.category;
  document.getElementById("date").value = tx.date;
  document.getElementById("notes").value = tx.notes || "";
  openModal();
}

function updateTransaction(updated) {
  transactions = transactions.map((t) => (t.id === updated.id ? updated : t));
  saveTransactions();
  renderAll();
}

function deleteTransaction(id) {
  if (!confirm("Delete this transaction?")) return;
  transactions = transactions.filter((t) => t.id !== id);
  saveTransactions();
  renderAll();
}

// ---------- Modal ----------
function openModal() {
  document.getElementById("modal").classList.remove("hidden");
}
function closeModal() {
  document.getElementById("modal").classList.add("hidden");
  document.getElementById("txForm").reset();
  document.getElementById("txId").value = "";
  document.getElementById("modalTitle").textContent = "Add Transaction";
}

// ---------- Init ----------
function initCategories() {
  const categories = ["Food", "Travel", "Shopping", "Bills", "Salary", "Other"];
  const select = document.getElementById("category");
  const filterSelect = document.getElementById("filterCategory");
  select.innerHTML = "";
  filterSelect.innerHTML = `<option value="all">All</option>`;

  categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);

    const fopt = document.createElement("option");
    fopt.value = c;
    fopt.textContent = c;
    filterSelect.appendChild(fopt);
  });
}

// ---------- Export / Import ----------
function exportJSON() {
  const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "transactions_backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data)) {
        transactions = data;
        saveTransactions();
        renderAll();
        alert("✅ Import successful!");
      } else {
        alert("❌ Invalid JSON file format");
      }
    } catch (err) {
      alert("❌ Error reading file: " + err.message);
    }
  };
  reader.readAsText(file);
}

function exportCSV() {
  let csv = "Type,Amount,Category,Date,Notes\n";
  transactions.forEach((t) => {
    csv += `${t.type},${t.amount},${t.category},${t.date},"${t.notes || ""}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "transactions.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function initEvents() {
  document.getElementById("addBtn").addEventListener("click", openModal);
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("cancelBtn").addEventListener("click", closeModal);

  document.getElementById("themeToggle").addEventListener("click", toggleTheme);

  document.getElementById("txForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("txId").value;
    const type = document.querySelector("input[name='txType']:checked").value;
    const amount = parseFloat(document.getElementById("amount").value);
    const category = document.getElementById("category").value;
    const date = document.getElementById("date").value;
    const notes = document.getElementById("notes").value;

    if (!amount || !date || !category) {
      alert("Please fill in all required fields.");
      return;
    }

    const tx = { id: id || uid(), type, amount, category, date, notes };
    if (id) updateTransaction(tx);
    else addTransaction(tx);

    closeModal();
  });

  document.getElementById("resetFilters").addEventListener("click", () => {
    document.getElementById("filterFrom").value = "";
    document.getElementById("filterTo").value = "";
    document.getElementById("filterCategory").value = "all";
    document.getElementById("filterQuery").value = "";
    renderAll();
  });

  // Export / Import events
  document.getElementById("exportBtn").addEventListener("click", exportJSON);
  document.getElementById("csvBtn").addEventListener("click", exportCSV);

  document.getElementById("importBtn").addEventListener("click", () => {
    document.getElementById("importFile").click();
  });

  document.getElementById("importFile").addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      importJSON(e.target.files[0]);
    }
  });
}

// ---------- Init App ----------
window.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  initCategories();
  initEvents();
  renderAll();
});
