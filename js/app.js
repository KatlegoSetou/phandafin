// ===== A. State (data the app remembers) =====
let products = []; // loaded from data/products.csv
let settings = {}; // loaded from data/settings.csv
let invoiceItems = []; // items on the current invoice

// ===== B. Page elements =====
const businessNameHeading = document.getElementById("business-name");
const customerInput = document.getElementById("customer-name");
const productSelect = document.getElementById("product-select");
const quantityInput = document.getElementById("quantity");
const deliveryCheckbox = document.getElementById("delivery-checkbox");
const addItemBtn = document.getElementById("add-item-btn");
const newInvoiceBtn = document.getElementById("new-invoice-btn");
const messageText = document.getElementById("message");
const printBtn = document.getElementById("print-btn");

const invoiceBusinessName = document.getElementById("invoice-business-name");
const invoiceBusinessAddress = document.getElementById("invoice-business-address"); const invoiceBusinessPhone = document.getElementById("invoice-business-phone");
const invoiceNumber = document.getElementById("invoice-number");
const invoiceDate = document.getElementById("invoice-date");
const invoiceCustomer = document.getElementById("invoice-customer");
const itemsBody = document.getElementById("items-body");
const subtotalText = document.getElementById("subtotal");
const deliveryText = document.getElementById("delivery");
const vatPercentText = document.getElementById("vat-percent");
const vatAmountText = document.getElementById("vat-amount");
const grandTotalText = document.getElementById("grand-total");

// ===== C. Helper functions =====

// Turns CSV text into an array of rows. Each row is an array of cells.
function parseCSV(text) {
    const lines = text.trim().split("\n"); const rows = [];

    // Start at 1 to skip the header line 
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") continue; // ignore blank lines 
        const cells = line.split(",");
        rows.push(cells.map(cell => cell.trim()));
    }
    return rows;
}

// Turns 75 into "R75.00"
function formatMoney(amount) {
    return settings.currency_symbol + amount.toFixed(2);
}

// Turns 5 into "05"
function pad(number) {
    return String(number).padStart(2, "0");
}

// ===== D. Loading data =====
async function loadCSV(path) {
    const response = await fetch(path, { cache: "no-store" }); if (!response.ok) { throw new Error("Could not load " + path); } const text = await response.text(); return parseCSV(text);
}

async function loadData() {
    try {
        const productRows = await loadCSV("data/products.csv");
        const settingRows = await loadCSV("data/settings.csv");

        // Turn each row into an object: { name, price } 
        products = productRows.map(row => ({
            name: row[0],
            price: Number(row[1])
        }));

        // Turn the rows into one object: { vat_rate: "0.15", ... } 
        settings = {};
        settingRows.forEach(row => {
            settings[row[0]] = row[1];
        });

        applySettings();
        fillProductDropdown();
        renderInvoice();
    } catch (error) {
        messageText.textContent = "Could not load data files. Are you using Live Server? (" + error.message + ")";
    }
}

function applySettings() {
    businessNameHeading.textContent = settings.business_name;
    invoiceBusinessName.textContent = settings.business_name;
    invoiceBusinessAddress.textContent = settings.business_address;
    invoiceBusinessPhone.textContent = settings.business_phone;
    document.title = settings.business_name + " Invoice Generator";
}

function fillProductDropdown() {
    productSelect.innerHTML = "";
    products.forEach((product, index) => {
        const option = document.createElement("option");
        option.value = index; // the position in the products array 
        option.textContent = product.name + " - " + formatMoney(product.price); productSelect.appendChild(option);
    });
}

// ===== E. Invoice logic =====
function addItem() {
    messageText.textContent = ""; // clear old messages 

    const product = products[productSelect.value];
    const quantity = parseInt(quantityInput.value);

    if (!product) {
        messageText.textContent = "Please choose a product.";
        return;
    }
    if (isNaN(quantity) || quantity < 1) {
        messageText.textContent = "Quantity must be 1 or more.";
        return;
    }

    invoiceItems.push({
        name: product.name,
        price: product.price,
        quantity: quantity
    });

    quantityInput.value = 1;
    renderInvoice();
}

function removeItem(index) {
    invoiceItems.splice(index, 1);
    renderInvoice();
}

function renderInvoice() {
    itemsBody.innerHTML = "";
    let subtotal = 0;

    if (invoiceItems.length === 0) {
        itemsBody.innerHTML = '<tr><td colspan="5">No items added yet.</td></tr>';
    }

    invoiceItems.forEach((item, index) => {
        const lineTotal = item.price * item.quantity;
        subtotal += lineTotal;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.name}</td> 
            <td>${item.quantity}</td> 
            <td>${formatMoney(item.price)}</td> 
            <td>${formatMoney(lineTotal)}</td> 
            <td class="no-print"> 
                <button class="remove-btn" data-index="${index}">Remove</button> 
            </td> 
            `;
        itemsBody.appendChild(row);
    });

    // Totals 
    const delivery = deliveryCheckbox.checked ? Number(settings.delivery_fee) : 0;
    const vatRate = Number(settings.vat_rate);
    const vatAmount = (subtotal + delivery) * vatRate;
    const total = subtotal + delivery + vatAmount;

    subtotalText.textContent = formatMoney(subtotal);
    deliveryText.textContent = formatMoney(delivery);
    vatPercentText.textContent = (vatRate * 100).toFixed(0);
    vatAmountText.textContent = formatMoney(vatAmount);
    grandTotalText.textContent = formatMoney(total);
}

// ===== F. Invoice number, date and reset =====
function setInvoiceMeta() {
    const now = new Date();

    // Example result: INV-20261109-1430 
    const datePart = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()); const timePart = pad(now.getHours()) + pad(now.getMinutes()); 
    
    invoiceNumber.textContent = "INV-" + datePart + "-" + timePart; 
    invoiceDate.textContent = now.toLocaleDateString("en-ZA");
} 

function newInvoice() { 
    invoiceItems = []; 
    customerInput.value = ""; 
    invoiceCustomer.textContent = "—"; 
    deliveryCheckbox.checked = false; 
    quantityInput.value = 1; 
    messageText.textContent = ""; 
    setInvoiceMeta(); 
    renderInvoice(); 
}

// ===== G. Event listeners =====
addItemBtn.addEventListener("click", addItem);
deliveryCheckbox.addEventListener("change", renderInvoice);

// One listener on the table body handles every Remove button
itemsBody.addEventListener("click", function (event) {
    if (event.target.classList.contains("remove-btn")) {
        const index = Number(event.target.dataset.index);
        removeItem(index);
    }
});

// Show the customer name on the invoice as the user types
customerInput.addEventListener("input", function () { 
    invoiceCustomer.textContent = customerInput.value.trim() || "—";
});

newInvoiceBtn.addEventListener("click", newInvoice);

printBtn.addEventListener("click", function () { 
    window.print(); 
});

// ===== H. Start-up (keep this at the very bottom) =====
setInvoiceMeta();
loadData();