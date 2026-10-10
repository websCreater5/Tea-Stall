
const $ = id => document.getElementById(id);
const KEY = "teaStallOrdersEnglishV1";

let cart = [];
let orders = loadOrders();
let nextNumber =
  Math.max(0, ...orders.map(order => order.number || 0)) + 1;

const defaultPrices = {
  "Regular Chai": 80,
  "Doodh Patti": 100,
  "Karak Chai": 100,
  "Green Tea": 70,
  "Kashmiri Chai": 150,
  "Water Bottle": 50,
  "Other": 0
};

function loadOrders() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(orders));
    return true;
  } catch {
    showMessage("Unable to save orders. Export a backup.");
    return false;
  }
}

function money(value) {
  return "Rs " + Number(value || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 2
  });
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showMessage(message) {
  const element = $("message");
  if (element) element.textContent = message;
}

function subtotal() {
  return cart.reduce((sum, item) =>
    sum + item.qty * item.price, 0);
}

function discount() {
  return Math.min(
    subtotal(),
    Math.max(0, Number($("discount").value) || 0)
  );
}

function total() {
  return subtotal() - discount();
}

function renderCart() {
  const body = $("cart");

  if (!cart.length) {
    body.innerHTML = `
      <tr><td colspan="5" style="text-align:center">
        No items added yet.
      </td></tr>`;
  } else {
    body.innerHTML = cart.map((item, index) => `
      <tr>
        <td>${safe(item.name)}</td>
        <td>${item.qty}</td>
        <td>${money(item.price)}</td>
        <td>${money(item.qty * item.price)}</td>
        <td>
          <button class="danger" data-remove="${index}">×</button>
        </td>
      </tr>
    `).join("");
  }

  body.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", () => {
      cart.splice(Number(button.dataset.remove), 1);
      renderCart();
    });
  });

  $("subtotal").textContent = money(subtotal());
  $("discountView").textContent = money(discount());
  $("total").textContent = money(total());
}

function renderSummary() {
  const today = new Date();
  const key = today.getFullYear() + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    String(today.getDate()).padStart(2, "0");

  const todayOrders = orders.filter(order => order.dateKey === key);

  $("sales").textContent = money(
    todayOrders.reduce((sum, order) => sum + order.total, 0)
  );

  $("orderCount").textContent = todayOrders.length;

  $("cupsSold").textContent = todayOrders.reduce(
    (sum, order) =>
      sum + order.items.reduce((count, item) => count + item.qty, 0),
    0
  );
}

function renderHistory() {
  const host = $("history");

  if (!orders.length) {
    host.innerHTML =
      '<p class="muted">No orders yet.</p>';
    return;
  }

  host.innerHTML = [...orders].reverse().slice(0, 30).map(order => `
    <div class="order-entry">
      <strong>Order #${String(order.number).padStart(4, "0")}</strong>
      <p>Customer: ${safe(order.customer || "Walk-in Customer")}</p>
      <p>${safe(order.date)} · ${safe(order.time)}</p>
      <p>Total: <strong>${money(order.total)}</strong></p>
      <p>Payment: ${safe(order.payment)}</p>
      <div class="actions">
        <button class="secondary" data-print="${safe(order.id)}">
          Print Receipt
        </button>
        <button class="secondary" data-copy="${safe(order.id)}">
          Copy Bill Text
        </button>
      </div>
    </div>
  `).join("");

  host.querySelectorAll("[data-print]").forEach(button => {
    button.addEventListener("click", () =>
      printOrder(button.dataset.print)
    );
  });

  host.querySelectorAll("[data-copy]").forEach(button => {
    button.addEventListener("click", () =>
      copyBill(button.dataset.copy)
    );
  });
}

function receiptHTML(order) {
  const rows = order.items.map(item => `
    <tr>
      <td>${safe(item.name)}<br>
        ${item.qty} x ${money(item.price)}
      </td>
      <td>${money(item.qty * item.price)}</td>
    </tr>
  `).join("");

  return `
    <div class="receipt-paper">
      <h2>TEA STALL</h2>
      <div class="center">Order Receipt</div>
      <hr>
      <p>Bill No: #${String(order.number).padStart(4, "0")}</p>
      <p>Date: ${safe(order.date)} ${safe(order.time)}</p>
      <p>Customer: ${safe(order.customer || "Walk-in Customer")}</p>
      <hr>
      <table>
        <thead><tr><th>Item</th><th>Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <hr>
      <div class="bill-row">
        <span>Subtotal</span><span>${money(order.subtotal)}</span>
      </div>
      <div class="bill-row">
        <span>Discount</span><span>${money(order.discount)}</span>
      </div>
      <div class="bill-row grand-total">
        <span>TOTAL</span><span>${money(order.total)}</span>
      </div>
      <hr>
      <p>Payment: ${safe(order.payment)}</p>
      <p class="center">Thank You! Visit Again.</p>
    </div>`;
}

function printOrder(id) {
  const order = orders.find(item => String(item.id) === String(id));
  if (!order) return;

  $("printReceipt").innerHTML = receiptHTML(order);
  window.print();
}

function copyBill(id) {
  const order = orders.find(item => String(item.id) === String(id));
  if (!order) return;

  const text = [
    "TEA STALL",
    "Order #" + String(order.number).padStart(4, "0"),
    "Date: " + order.date + " " + order.time,
    "Customer: " + (order.customer || "Walk-in Customer"),
    "------------------------------",
    ...order.items.map(item =>
      `${item.name}: ${item.qty} x ${money(item.price)} = ${money(item.qty * item.price)}`
    ),
    "Subtotal: " + money(order.subtotal),
    "Discount: " + money(order.discount),
    "TOTAL: " + money(order.total),
    "Payment: " + order.payment,
    "Thank You! Visit Again."
  ].join("\n");

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text)
      .then(() => showMessage("Bill copied successfully!"))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();

  try {
    document.execCommand("copy");
    showMessage("Bill copied successfully!");
  } catch {
    window.prompt("Copy your bill text:", text);
  }

  area.remove();
}

function saveOrder(shouldPrint = false) {
  if (!cart.length) {
    showMessage("Please add at least one item first.");
    return;
  }

  const now = new Date();

  const order = {
    id: (crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random().toString(16).slice(2)),
    number: nextNumber,
    date: now.toLocaleDateString("en-GB"),
    dateKey: now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0"),
    time: now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    }),
    customer: $("customer").value.trim(),
    items: cart.map(item => ({ ...item })),
    subtotal: subtotal(),
    discount: discount(),
    total: total(),
    payment: $("payment").value
  };

  orders.push(order);

  if (!persist()) {
    orders.pop();
    return;
  }

  nextNumber++;
  renderSummary();
  renderHistory();

  cart = [];
  $("customer").value = "";
  $("discount").value = "0";
  $("payment").value = "Paid";

  renderCart();

  showMessage(
    "Order #" + String(order.number).padStart(4, "0") + " saved!"
  );

  if (shouldPrint) printOrder(order.id);
}

function exportCSV() {
  if (!orders.length) {
    showMessage("No orders available to export.");
    return;
  }

  const rows = [[
    "Order Number", "Date", "Time", "Customer",
    "Items", "Subtotal", "Discount", "Total", "Payment"
  ]];

  orders.forEach(order => rows.push([
    order.number,
    order.date,
    order.time,
    order.customer,
    order.items.map(item =>
      `${item.name} (${item.qty} x ${item.price})`
    ).join("; "),
    order.subtotal,
    order.discount,
    order.total,
    order.payment
  ]));

  const csv = rows.map(row =>
    row.map(value =>
      '"' + String(value ?? "").replace(/"/g, '""') + '"'
    ).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "tea-stall-orders.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
  showMessage("Orders exported successfully.");
}

// Item selection and default prices
$("item").addEventListener("change", () => {
  const name = $("item").value;
  $("price").value = defaultPrices[name] ?? 0;
  $("customItem").style.display =
    name === "Other" ? "block" : "none";
});

// Add item to the current order
$("addItem").addEventListener("click", () => {
  const selected = $("item").value;
  const name = selected === "Other"
    ? $("customItem").value.trim()
    : selected;

  const qty = Number($("qty").value);
  const price = Number($("price").value);

  if (!name) {
    showMessage("Please enter an item name.");
    return;
  }

  if (!Number.isInteger(qty) || qty < 1) {
    showMessage("Quantity must be at least 1.");
    return;
  }

  if (!Number.isFinite(price) || price < 0) {
    showMessage("Enter a valid price.");
    return;
  }

  cart.push({ name, qty, price });
  $("qty").value = "1";

  renderCart();
  showMessage("Item added successfully.");
});

$("discount").addEventListener("input", renderCart);
$("saveOrder").addEventListener("click", () => saveOrder(false));
$("savePrint").addEventListener("click", () => saveOrder(true));

$("clearCart").addEventListener("click", () => {
  cart = [];
  $("customer").value = "";
  $("discount").value = "0";
  $("payment").value = "Paid";

  renderCart();
  showMessage("Current order cleared.");
});

$("exportCSV").addEventListener("click", exportCSV);

// Initial screen
renderCart();
renderSummary();
renderHistory();
