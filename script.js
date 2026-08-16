// === PEGA AQUÍ TU NUEVA URL ===
const API_URL = "https://script.google.com/macros/s/AKfycbya-Vz8XQXBKwx-QqPOz1mjlBjTxuGP5BujGLzv8DTatgIbzbHYd_cIKXuBWZQ4apDu/exec"; 

document.addEventListener('DOMContentLoaded', fetchItems);

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.add('hide'); setTimeout(() => { document.getElementById(id).classList.remove('active', 'hide'); }, 300); }
function showSysAlert(title, message) { 
    document.getElementById('alertTitle').innerText = title; 
    document.getElementById('alertMessage').innerText = message; 
    openModal('alertModal'); 
}
function setGlobalLoader(active) { document.getElementById('globalLoader').style.display = active ? 'flex' : 'none'; }

// === MODAL DE COSTO ===
let resolveCostPromise = null;
function askForCostModal(itemName) {
    return new Promise((resolve) => {
        document.getElementById('costModalTitle').innerText = `Costo: ${itemName}`;
        document.getElementById('costModalInput').value = '';
        openModal('costModal');
        setTimeout(() => document.getElementById('costModalInput').focus(), 300);
        resolveCostPromise = resolve;
    });
}
function saveCost() { const val = parseFloat(document.getElementById('costModalInput').value); closeModal('costModal'); if(resolveCostPromise) resolveCostPromise(isNaN(val) || val < 0 ? null : val); }
function cancelCost() { closeModal('costModal'); if(resolveCostPromise) resolveCostPromise(null); }

// === NUEVO: MODAL DE EDICIÓN ===
let resolveEditPromise = null;
function askForEditModal(currentName) {
    return new Promise((resolve) => {
        document.getElementById('editModalInput').value = currentName;
        openModal('editModal');
        setTimeout(() => document.getElementById('editModalInput').focus(), 300);
        resolveEditPromise = resolve;
    });
}
function saveEdit() { const val = document.getElementById('editModalInput').value.trim(); closeModal('editModal'); if(resolveEditPromise) resolveEditPromise(val === "" ? null : val); }
function cancelEdit() { closeModal('editModal'); if(resolveEditPromise) resolveEditPromise(null); }

// === NUEVO: MODAL DE CONFIRMACIÓN ===
let resolveConfirmPromise = null;
function askConfirm(title, message) {
    return new Promise((resolve) => {
        document.getElementById('confirmTitle').innerText = title;
        document.getElementById('confirmMessage').innerText = message;
        openModal('confirmModal');
        resolveConfirmPromise = resolve;
    });
}
function proceedConfirm() { closeModal('confirmModal'); if(resolveConfirmPromise) resolveConfirmPromise(true); }
function cancelConfirm() { closeModal('confirmModal'); if(resolveConfirmPromise) resolveConfirmPromise(false); }

// === FUNCIONES PRINCIPALES ===
async function fetchItems() {
    setGlobalLoader(true);
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        renderList(data);
    } catch (error) {
        showSysAlert("Error de conexión", "No pudimos conectar con la base de datos.");
    } finally { setGlobalLoader(false); }
}

async function addItem() {
    const nameInput = document.getElementById('itemInput');
    const name = nameInput.value.trim();
    if (!name) return showSysAlert("Atención", "Escribe el nombre del producto.");

    setGlobalLoader(true);
    try {
        await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "add", name: name }) });
        nameInput.value = '';
        await fetchItems();
    } catch (error) {
        showSysAlert("Error", "No se pudo guardar el producto.");
        setGlobalLoader(false);
    }
}

// NUEVA FUNCION: Editar
async function editItem(id, currentName) {
    const newName = await askForEditModal(currentName);
    if (!newName || newName === currentName) return;

    setGlobalLoader(true);
    try {
        await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "edit", id: id, newName: newName }) });
        await fetchItems();
    } catch (error) {
        showSysAlert("Error", "No se pudo editar el producto.");
        setGlobalLoader(false);
    }
}

// NUEVA FUNCION: Eliminar
async function deleteItem(id) {
    const isConfirmed = await askConfirm("¿Eliminar faltante?", "Esta acción no se puede deshacer.");
    if (!isConfirmed) return;

    setGlobalLoader(true);
    try {
        await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "delete", id: id }) });
        await fetchItems();
    } catch (error) {
        showSysAlert("Error", "No se pudo eliminar el producto.");
        setGlobalLoader(false);
    }
}

async function toggleStatus(id, checkboxElem, itemName) {
    const isChecked = checkboxElem.checked;
    let newStatus = "Pendiente", cost = 0;

    if (isChecked) {
        const inputCost = await askForCostModal(itemName);
        if (inputCost === null) { checkboxElem.checked = false; return; }
        cost = inputCost; newStatus = "Comprado";
    }

    const liElem = checkboxElem.closest('li');
    const costTextElem = liElem.querySelector('.item-cost');
    
    if (isChecked) {
        liElem.classList.add('is-bought');
        costTextElem.innerText = `$${cost.toFixed(2)}`;
        costTextElem.className = 'item-cost cost-bought';
        costTextElem.setAttribute('data-cost', cost);
    } else {
        liElem.classList.remove('is-bought');
        costTextElem.innerText = "Pendiente";
        costTextElem.className = 'item-cost cost-pending';
        costTextElem.setAttribute('data-cost', 0);
    }
    recalculateTotal();

    try { await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "update", id: id, status: newStatus, cost: cost }) }); } 
    catch (error) { fetchItems(); }
}

function renderList(items) {
    const list = document.getElementById('shoppingList');
    list.innerHTML = '';
    if(items.length === 0) list.innerHTML = '<li style="justify-content:center; color:#999;">No hay pendientes hoy. ¡Todo listo!</li>';

    items.reverse().forEach(item => {
        const isBought = item.status === "Comprado";
        const li = document.createElement('li');
        if (isBought) li.classList.add('is-bought');
        
        const costDisplay = isBought ? `$${item.cost.toFixed(2)}` : "Pendiente";
        const costClass = isBought ? "cost-bought" : "cost-pending";
        
        // Aquí insertamos los botones de edición y eliminación
        li.innerHTML = `
            <div class="item-details">
                <h4>${item.name}</h4>
                <p class="item-cost ${costClass}" data-cost="${isBought ? item.cost : 0}">${costDisplay}</p>
            </div>
            <div class="item-controls">
                <div class="item-actions">
                    <button class="action-btn" onclick="editItem('${item.id}', '${item.name}')" title="Editar">✏️</button>
                    <button class="action-btn" onclick="deleteItem('${item.id}')" title="Eliminar">🗑️</button>
                </div>
                <div class="checkbox-wrapper">
                    <input type="checkbox" ${isBought ? 'checked' : ''} onchange="toggleStatus('${item.id}', this, '${item.name}')">
                </div>
            </div>
        `;
        list.appendChild(li);
    });
    recalculateTotal();
}

function recalculateTotal() {
    let total = 0;
    document.querySelectorAll('#shoppingList li').forEach(li => {
        const checkbox = li.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) { total += parseFloat(li.querySelector('.item-cost').getAttribute('data-cost')) || 0; }
    });
    document.getElementById('totalAmount').innerText = total.toFixed(2);
}

async function confirmCloseDay() {
    const total = document.getElementById('totalAmount').innerText;
    if (total === "0.00") return showSysAlert("Sin compras", "No hay artículos comprados para cerrar el día.");
    
    setGlobalLoader(true);
    try {
        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "closeDay" }) });
        const res = await response.json();
        showSysAlert("¡Día Cerrado!", `Se generó un ticket con ${res.count} artículos.\nTotal Gastado: $${res.total.toFixed(2)}`);
        await fetchItems();
    } catch (error) {
        showSysAlert("Error", "No se pudo cerrar el día.");
        setGlobalLoader(false);
    }
}

async function openHistory() {
    openModal('historyModal');
    document.getElementById('historyLoader').style.display = 'block';
    document.getElementById('historyContainer').innerHTML = '';

    try {
        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "getHistory" }) });
        const tickets = await response.json();
        document.getElementById('historyLoader').style.display = 'none';
        const container = document.getElementById('historyContainer');
        
        if(tickets.length === 0) {
            container.innerHTML = '<p class="text-center" style="color:#999; margin-top:20px;">Aún no hay tickets guardados.</p>';
            return;
        }

        tickets.forEach(ticket => {
            let itemsHtml = ticket.items.map(i => `<div class="ticket-item"><span>${i.name}</span><span>$${i.cost.toFixed(2)}</span></div>`).join('');
            container.innerHTML += `
                <div class="ticket-card">
                    <div class="ticket-date">${ticket.date} | ${ticket.id.split('-')[1]}</div>
                    ${itemsHtml}
                    <div class="ticket-total"><span>TOTAL</span><span>$${ticket.total.toFixed(2)}</span></div>
                </div>
            `;
        });
    } catch (error) { document.getElementById('historyLoader').innerText = "Error al cargar el historial."; }
}
