// === RECUERDA PEGAR TU NUEVA URL AQUÍ ===
const API_URL = "https://script.google.com/macros/s/AKfycbya-Vz8XQXBKwx-QqPOz1mjlBjTxuGP5BujGLzv8DTatgIbzbHYd_cIKXuBWZQ4apDu/exec"; 

document.addEventListener('DOMContentLoaded', fetchItems);

// UTILIDAD PARA MODALES (Adiós alerts nativos)
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.add('hide'); setTimeout(() => { document.getElementById(id).classList.remove('active', 'hide'); }, 300); }
function showSysAlert(title, message) { 
    document.getElementById('alertTitle').innerText = title; 
    document.getElementById('alertMessage').innerText = message; 
    openModal('alertModal'); 
}
function setGlobalLoader(active) { document.getElementById('globalLoader').style.display = active ? 'flex' : 'none'; }

// SISTEMA DE PROMESA PARA EL COSTO MODAL
let resolveCostPromise = null;
function askForCostModal(itemName) {
    return new Promise((resolve) => {
        document.getElementById('costModalTitle').innerText = `Costo: ${itemName}`;
        document.getElementById('costModalInput').value = '';
        openModal('costModal');
        // Enfocar input automáticamente
        setTimeout(() => document.getElementById('costModalInput').focus(), 300);
        resolveCostPromise = resolve;
    });
}
function saveCost() {
    const val = parseFloat(document.getElementById('costModalInput').value);
    closeModal('costModal');
    if(resolveCostPromise) resolveCostPromise(isNaN(val) || val < 0 ? null : val);
}
function cancelCost() {
    closeModal('costModal');
    if(resolveCostPromise) resolveCostPromise(null);
}

// Carga Inicial
async function fetchItems() {
    setGlobalLoader(true);
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        renderList(data);
    } catch (error) {
        showSysAlert("Error de conexión", "No pudimos conectar con la base de datos.");
    } finally {
        setGlobalLoader(false);
    }
}

// Agregar Faltante
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

// Cambiar estado (Usando el nuevo modal animado)
async function toggleStatus(id, checkboxElem, itemName) {
    const isChecked = checkboxElem.checked;
    let newStatus = "Pendiente";
    let cost = 0;

    if (isChecked) {
        // En lugar del prompt nativo, esperamos a que el usuario use el modal
        const inputCost = await askForCostModal(itemName);
        
        if (inputCost === null) {
            checkboxElem.checked = false; // Revierte si cancela
            return;
        }
        cost = inputCost;
        newStatus = "Comprado";
    }

    // Actualización visual instantánea
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

    // Sincronizar en fondo
    try {
        await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "update", id: id, status: newStatus, cost: cost }) });
    } catch (error) {
        fetchItems(); 
    }
}

// Renderizar la lista
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
        
        li.innerHTML = `
            <div class="item-details">
                <h4>${item.name}</h4>
                <p class="item-cost ${costClass}" data-cost="${isBought ? item.cost : 0}">${costDisplay}</p>
            </div>
            <div class="checkbox-wrapper">
                <input type="checkbox" ${isBought ? 'checked' : ''} onchange="toggleStatus('${item.id}', this, '${item.name}')">
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
        if (checkbox && checkbox.checked) {
            total += parseFloat(li.querySelector('.item-cost').getAttribute('data-cost')) || 0;
        }
    });
    document.getElementById('totalAmount').innerText = total.toFixed(2);
}

// ==== CIERRE DE DÍA ====
async function confirmCloseDay() {
    const total = document.getElementById('totalAmount').innerText;
    if (total === "0.00") return showSysAlert("Sin compras", "No hay artículos comprados para cerrar el día.");
    
    setGlobalLoader(true);
    try {
        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "closeDay" }) });
        const res = await response.json();
        
        showSysAlert("¡Día Cerrado!", `Se generó un ticket con ${res.count} artículos.\nTotal Gastado: $${res.total.toFixed(2)}`);
        await fetchItems(); // Recarga la lista, los comprados desaparecerán (ya están en el ticket)
    } catch (error) {
        showSysAlert("Error", "No se pudo cerrar el día.");
        setGlobalLoader(false);
    }
}

// ==== HISTORIAL DE TICKETS ====
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
                    <div class="ticket-total">
                        <span>TOTAL</span>
                        <span>$${ticket.total.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        document.getElementById('historyLoader').innerText = "Error al cargar el historial.";
    }
}