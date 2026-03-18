const STORAGE_KEY = "homebuild-tracker-v1";
const MAX_BUDGET = 654675.68;
const TARGET_BUDGET = 508784.25;

const budgetLineItems = [
  ["PLANS", 0],
  ["ENGINEERING", 500],
  ["SURVEY", 1500],
  ["FEES / PERMITS / INSURANCE", 7794.25],
  ["OBCH FEE", 10000],
  ["UTILITIES", 19400],
  ["SITE PREP", 0],
  ["FOUNDATION", 67640],
  ["TERMITE TREATMENT", 1000],
  ["FRAMING", 126100],
  ["STRUCTURAL STEEL", 0],
  ["WINDOWS", 19000],
  ["EXTERIOR DOORS", 0],
  ["ROOF", 28600],
  ["FIREPLACE", 4300],
  ["GARAGE DOORS", 2800],
  ["HVAC ROUGH", 25000],
  ["PLUMBING TOP OUT", 22000],
  ["ELECTRICAL ROUGH", 27200],
  ["LOW VOLTAGE", 0],
  ["STRUCTURED WIRING", 0],
  ["EXTERIOR", 18750],
  ["INSULATION", 7000],
  ["SHEETROCK", 21800],
  ["INTERIOR TRIM", 20000],
  ["COUNTER TOPS", 8000],
  ["PAINTING / WALL COVERING", 5000],
  ["SHOWER / TUB SURROUNDS", 15000],
  ["MIRRORS / SHOWER DOORS", 1400],
  ["ELECTRICAL FIXTURES", 8000],
  ["PLUMBING FIXTURES / FAUCETS", 8000],
  ["FLOORS", 15000],
  ["FLATWORK", 0],
  ["APPLIANCES", 10000],
  ["HARDWARE", 3000],
  ["SPECIAL ITEMS", 0],
  ["LANDSCAPING", 0],
  ["FENCES", 0],
  ["CLEANING / OTHER", 5000],
  ["FINAL PREP", 0]
];

const nonMaterialLineItems = new Set([
  "PLANS",
  "ENGINEERING",
  "SURVEY",
  "FEES / PERMITS / INSURANCE",
  "OBCH FEE",
  "SITE PREP",
  "CLEANING / OTHER",
  "FINAL PREP"
]);

const defaultDeliveries = budgetLineItems
  .map(([description]) => description)
  .filter((description) => !nonMaterialLineItems.has(description))
  .map((material) => ({
    material,
    company: "",
    expectedDate: "",
    deliveredDate: "",
    status: "Not Ordered",
    notes: ""
  }));

const initialState = {
  clientName: "",
  projectDate: "",
  livingSf: 3341,
  framingSf: 5775,
  interestEntries: [],
  budget: budgetLineItems.map(([description, targetBudget]) => ({
    description,
    targetBudget,
    actualToDate: 0,
    finalCost: 0,
    paidInFull: false,
    company: ""
  })),
  deliveries: defaultDeliveries
};

let state = loadState();

function loadState() {
  const fromStorage = localStorage.getItem(STORAGE_KEY);
  if (!fromStorage) {
    return structuredClone(initialState);
  }

  try {
    const parsed = JSON.parse(fromStorage);
    const baseState = {
      ...structuredClone(initialState),
      ...parsed
    };

    const existingMaterials = new Set((baseState.deliveries || []).map((row) => row.material));
    const missingDefaults = defaultDeliveries.filter((row) => !existingMaterials.has(row.material));
    baseState.deliveries = [...(baseState.deliveries || []), ...missingDefaults];

    if (!Array.isArray(baseState.interestEntries)) {
      baseState.interestEntries = [];
    }

    return baseState;
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function drawBudgetPieChart(canvasId, budgetLimit, actualTotal) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  const size = 220;
  const center = size / 2;
  const radius = 88;

  canvas.width = size;
  canvas.height = size;

  const spentWithinBudget = Math.min(actualTotal, budgetLimit);
  const remainingBudget = Math.max(budgetLimit - actualTotal, 0);
  const overBudget = Math.max(actualTotal - budgetLimit, 0);
  const chartTotal = Math.max(budgetLimit + overBudget, 1);

  const slices = [
    { value: spentWithinBudget, color: "#2158c9" },
    { value: remainingBudget, color: "#90a4c4" },
    { value: overBudget, color: "#b53333" }
  ];

  ctx.clearRect(0, 0, size, size);

  let startAngle = -Math.PI / 2;
  slices.forEach((slice) => {
    if (slice.value <= 0) {
      return;
    }

    const sliceAngle = (slice.value / chartTotal) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();
    startAngle += sliceAngle;
  });

  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(center, center, 50, 0, Math.PI * 2);
  ctx.fill();

  const percent = budgetLimit > 0 ? (actualTotal / budgetLimit) * 100 : 0;
  ctx.fillStyle = "#1f2d3d";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${percent.toFixed(1)}%`, center, center + 7);
}

function renderSingleBudgetOverview(prefix, canvasId, budgetLimit, actualTotal) {
  const remaining = Math.max(budgetLimit - actualTotal, 0);
  const overBudget = Math.max(actualTotal - budgetLimit, 0);
  const percent = budgetLimit > 0 ? (actualTotal / budgetLimit) * 100 : 0;

  document.getElementById(`${prefix}Budget`).textContent = money(budgetLimit);
  document.getElementById(`${prefix}ActualCost`).textContent = money(actualTotal);
  document.getElementById(`${prefix}Remaining`).textContent = money(remaining);
  document.getElementById(`${prefix}OverBudget`).textContent = money(overBudget);
  document.getElementById(`${prefix}Percent`).textContent = `${percent.toFixed(1)}%`;

  drawBudgetPieChart(canvasId, budgetLimit, actualTotal);
}

function renderBudgetOverview(actualTotal) {
  renderSingleBudgetOverview("maxChart", "maxBudgetPieChart", MAX_BUDGET, actualTotal);
  renderSingleBudgetOverview("targetChart", "targetBudgetPieChart", TARGET_BUDGET, actualTotal);
}

function renderInterestTable() {
  const tbody = document.querySelector("#interestTable tbody");
  tbody.innerHTML = "";

  let totalInterest = 0;

  state.interestEntries.forEach((entry, index) => {
    totalInterest += Number(entry.amount || 0);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${entry.month}</td>
      <td class="money">${money(entry.amount)}</td>
      <td><button class="delete-btn" type="button" data-remove-interest="${index}">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("interestPaidTotal").textContent = money(totalInterest);
}

function renderProjectFields() {
  const ids = ["clientName", "projectDate", "livingSf", "framingSf"];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    el.value = state[id] ?? "";
    el.addEventListener("input", () => {
      state[id] = el.type === "number" ? Number(el.value || 0) : el.value;
      saveState();
    });
  });
}

function renderBudgetTable() {
  const tbody = document.querySelector("#budgetTable tbody");
  tbody.innerHTML = "";

  let targetTotal = 0;
  let actualTotal = 0;
  let finalTotal = 0;
  let paidCount = 0;

  state.budget.forEach((item, index) => {
    targetTotal += Number(item.targetBudget || 0);
    actualTotal += Number(item.actualToDate || 0);
    finalTotal += Number(item.finalCost || 0);
    paidCount += item.paidInFull ? 1 : 0;

    const tr = document.createElement("tr");
    const variance = Number(item.finalCost || 0) - Number(item.targetBudget || 0);

    tr.innerHTML = `
      <td>${item.description}</td>
      <td class="money">${money(item.targetBudget)}</td>
      <td><input type="number" min="0" step="0.01" value="${item.actualToDate}" data-budget="${index}" data-field="actualToDate" /></td>
      <td><input type="number" min="0" step="0.01" value="${item.finalCost}" data-budget="${index}" data-field="finalCost" /></td>
      <td class="center"><input type="checkbox" data-budget="${index}" data-field="paidInFull" ${item.paidInFull ? "checked" : ""} /></td>
      <td><input type="text" value="${item.company}" data-budget="${index}" data-field="company" placeholder="Company name"/></td>
      <td class="money ${variance > 0 ? "variance-bad" : "variance-good"}">${money(variance)}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("targetTotal").textContent = money(targetTotal);
  document.getElementById("actualTotal").textContent = money(actualTotal);
  document.getElementById("finalTotal").textContent = money(finalTotal);
  document.getElementById("paidCount").textContent = `${paidCount} / ${state.budget.length}`;

  const varianceTotal = finalTotal - targetTotal;
  const varianceEl = document.getElementById("varianceTotal");
  varianceEl.textContent = money(varianceTotal);
  varianceEl.className = `money ${varianceTotal > 0 ? "variance-bad" : "variance-good"}`;

  renderBudgetOverview(actualTotal);
}

function renderDeliveryTable() {
  const tbody = document.querySelector("#deliveryTable tbody");
  tbody.innerHTML = "";

  state.deliveries.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" value="${row.material}" data-delivery="${index}" data-field="material" /></td>
      <td><input type="text" value="${row.company}" data-delivery="${index}" data-field="company" /></td>
      <td><input type="date" value="${row.expectedDate}" data-delivery="${index}" data-field="expectedDate" /></td>
      <td><input type="date" value="${row.deliveredDate}" data-delivery="${index}" data-field="deliveredDate" /></td>
      <td>
        <select data-delivery="${index}" data-field="status">
          ${["Not Ordered", "Ordered", "In Transit", "Delivered", "Installed"].map((status) => `<option ${row.status === status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </td>
      <td><textarea data-delivery="${index}" data-field="notes">${row.notes}</textarea></td>
      <td><button class="delete-btn" type="button" data-remove-delivery="${index}">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function wireEvents() {
  document.body.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const budgetIndex = target.dataset.budget;
    const budgetField = target.dataset.field;
    if (budgetIndex !== undefined && budgetField) {
      const row = state.budget[Number(budgetIndex)];
      row[budgetField] = target.type === "checkbox" ? target.checked : target.type === "number" ? Number(target.value || 0) : target.value;
      saveState();
      renderBudgetTable();
      return;
    }

    const deliveryIndex = target.dataset.delivery;
    const deliveryField = target.dataset.field;
    if (deliveryIndex !== undefined && deliveryField) {
      state.deliveries[Number(deliveryIndex)][deliveryField] = target.value;
      saveState();
    }
  });

  document.body.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.dataset.budget !== undefined && target.dataset.field === "paidInFull") {
      const row = state.budget[Number(target.dataset.budget)];
      row.paidInFull = target.checked;
      saveState();
      renderBudgetTable();
    }
  });

  document.body.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.id === "addInterestEntry") {
      const monthInput = document.getElementById("interestMonth");
      const amountInput = document.getElementById("interestAmount");
      const month = monthInput.value;
      const amount = Number(amountInput.value || 0);

      if (!month || amount <= 0) {
        return;
      }

      state.interestEntries.push({ month, amount });
      saveState();
      renderInterestTable();
      amountInput.value = "0";
      return;
    }

    if (target.id === "addDelivery") {
      state.deliveries.push({
        material: "",
        company: "",
        expectedDate: "",
        deliveredDate: "",
        status: "Not Ordered",
        notes: ""
      });
      saveState();
      renderDeliveryTable();
      return;
    }

    if (target.id === "resetBudget") {
      state.budget = structuredClone(initialState.budget);
      saveState();
      renderBudgetTable();
      return;
    }

    const removeInterest = target.dataset.removeInterest;
    if (removeInterest !== undefined) {
      state.interestEntries.splice(Number(removeInterest), 1);
      saveState();
      renderInterestTable();
      return;
    }

    const removeIndex = target.dataset.removeDelivery;
    if (removeIndex !== undefined) {
      state.deliveries.splice(Number(removeIndex), 1);
      saveState();
      renderDeliveryTable();
    }
  });
}

function start() {
  renderProjectFields();
  wireEvents();
  renderBudgetTable();
  renderInterestTable();
  renderDeliveryTable();
}

start();
