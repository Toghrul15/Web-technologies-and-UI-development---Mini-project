const API_URL = "https://api.exchangerate-api.com/v4/latest/USD";

const $ = (id) => document.getElementById(id);
const els = {
  amount: $("amount"),
  from: $("from"),
  to: $("to"),
  swap: $("swap"),
  result: $("result"),
  rateLine: $("rateLine"),
  updated: $("updated"),
  baseCode: $("baseCode"),
  search: $("search"),
  rows: $("rows"),
  status: $("status"),
};

let rates = {};
let names;
try {
  names = new Intl.DisplayNames(["ru"], { type: "currency" });
} catch {
  names = { of: (c) => c };
}

const currencyName = (code) => {
  try { return names.of(code) || code; } catch { return code; }
};

const fmt = (n, max = 4) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: max }).format(n);

// Курс 1 единицы from в единицах to (API отдаёт курсы относительно USD)
const rate = (from, to) => rates[to] / rates[from];

function showStatus(message, isError = false, retry = false) {
  els.status.className = "status" + (isError ? " error" : "");
  els.status.textContent = message;
  if (retry) {
    const btn = document.createElement("button");
    btn.textContent = "Повторить";
    btn.addEventListener("click", load);
    els.status.append(btn);
  }
  els.status.hidden = false;
}

const hideStatus = () => { els.status.hidden = true; };

function fillSelects() {
  const codes = Object.keys(rates).sort();
  const options = codes
    .map((c) => `<option value="${c}">${c} — ${currencyName(c)}</option>`)
    .join("");
  els.from.innerHTML = options;
  els.to.innerHTML = options;
  els.from.value = "USD";
  els.to.value = codes.includes("EUR") ? "EUR" : codes[0];
}

function convert() {
  const amount = parseFloat(els.amount.value);
  const { value: from } = els.from;
  const { value: to } = els.to;
  if (!rates[from] || !rates[to]) return;

  const r = rate(from, to);
  els.result.textContent = Number.isFinite(amount)
    ? `${fmt(amount * r, 2)} ${to}`
    : "—";
  els.rateLine.textContent = `1 ${from} = ${fmt(r, 6)} ${to}`;
  els.baseCode.textContent = from;
  renderRows();
}

function renderRows() {
  const from = els.from.value;
  const q = els.search.value.trim().toLowerCase();
  const html = Object.keys(rates)
    .sort()
    .filter((c) => !q || c.toLowerCase().includes(q) || currencyName(c).toLowerCase().includes(q))
    .map((c) => `
      <tr data-code="${c}" class="${c === els.to.value ? "active" : ""}" tabindex="0">
        <td><span class="code">${c}</span><span class="name">${currencyName(c)}</span></td>
        <td class="num">${fmt(rate(from, c), 4)}</td>
      </tr>`)
    .join("");
  els.rows.innerHTML =
    html || `<tr><td colspan="2">Ничего не найдено. Проверьте код или название валюты.</td></tr>`;
}

function selectRow(row) {
  if (!row) return;
  els.to.value = row.dataset.code;
  convert();
}

async function load() {
  showStatus("Загружаем курсы…");
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    rates = data.rates;

    fillSelects();
    const date = data.time_last_updated
      ? new Date(data.time_last_updated * 1000)
      : new Date(data.date);
    els.updated.textContent = `Обновлено: ${date.toLocaleString("ru-RU")}`;
    convert();
    hideStatus();
  } catch (err) {
    showStatus(`Не удалось загрузить курсы (${err.message}). Проверьте подключение.`, true, true);
  }
}

els.amount.addEventListener("input", convert);
els.from.addEventListener("change", convert);
els.to.addEventListener("change", convert);
els.search.addEventListener("input", renderRows);

els.swap.addEventListener("click", () => {
  [els.from.value, els.to.value] = [els.to.value, els.from.value];
  convert();
});

els.rows.addEventListener("click", (e) => selectRow(e.target.closest("tr")));
els.rows.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    selectRow(e.target.closest("tr"));
  }
});

load();
