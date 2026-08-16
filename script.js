// === Pega aquí la URL que copiaste de Google Apps Script ===
const API_URL = "https://script.google.com/macros/s/AKfycbya-Vz8XQXBKwx-QqPOz1mjlBjTxuGP5BujGLzv8DTatgIbzbHYd_cIKXuBWZQ4apDu/exec"; 

document.addEventListener('DOMContentLoaded', fetchItems);

// Obtener datos desde Google Sheets
async function fetchItems() {
    showLoader(true);
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        renderList(data);
    } catch (error) {
        console.error("Error al cargar los datos:", error);
        alert("Hubo un problema al conectar con la base de datos.");
    } finally {
        showLoader(false);
    }
}

// Agregar nuevo elemento a Sheets
async function addItem() {
    const nameInput = document.getElementById('itemInput');
    const costInput = document.getElementById('costInput');
    const addBtn = document.getElementById('addBtn');
    
    const name = nameInput.value.trim();
    const cost = parseFloat(costInput.value) || 0;

    if (!name) {
        alert("Por favor ingresa el nombre del producto.");
        return;
    }

    // Preparar estado visual de carga
    addBtn.disabled = true;
    addBtn.innerText = "Guardando...";

    const payload = { action: "add", name: name, cost: cost };

    try {
        await fetch(API_URL, {
            method: 'POST',
            // Usamos text/plain para evitar errores de preflight (CORS) en Apps Script
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        
        // Limpiar inputs y recargar la lista
        nameInput.value = '';
        costInput.value = '';
        await fetchItems();
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("No se pudo guardar el producto.");
    } finally {
        addBtn.disabled = false;
        addBtn.innerText = "Agregar a lista";
    }
}

// Cambiar estado (Pendiente / Comprado)
async function toggleStatus(id, checkboxElem) {
    const isChecked = checkboxElem.checked;
    const newStatus = isChecked ? "Comprado" : "Pendiente";
    
    // Cambiar UI inmediatamente para mejor experiencia de usuario
    const liElem = checkboxElem.closest('li');
    if(isChecked) liElem.classList.add('is-bought');
    else liElem.classList.remove('is-bought');
    
    recalculateTotal();

    const payload = { action: "update", id: id, status: newStatus };

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error("Error al actualizar:", error);
        alert("Error de sincronización. Refrescando lista...");
        fetchItems(); // Recargar si hubo error para mantener sincronía
    }
}

// Renderizar la lista en el HTML
function renderList(items) {
    const list = document.getElementById('shoppingList');
    list.innerHTML = '';
    
    // Invertir para que los más nuevos salgan arriba
    items.reverse().forEach(item => {
        const isBought = item.status === "Comprado";
        
        const li = document.createElement('li');
        if (isBought) li.classList.add('is-bought');
        
        li.innerHTML = `
            <div class="item-details">
                <h4>${item.name}</h4>
                <p data-cost="${item.cost}">$${item.cost.toFixed(2)}</p>
            </div>
            <div class="checkbox-wrapper">
                <input type="checkbox" ${isBought ? 'checked' : ''} onchange="toggleStatus('${item.id}', this)">
            </div>
        `;
        list.appendChild(li);
    });

    recalculateTotal();
}

// Recalcular total solo de los marcados como "Comprado"
function recalculateTotal() {
    let total = 0;
    const listItems = document.querySelectorAll('#shoppingList li');
    
    listItems.forEach(li => {
        const checkbox = li.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) {
            const costText = li.querySelector('p').getAttribute('data-cost');
            total += parseFloat(costText);
        }
    });

    document.getElementById('totalAmount').innerText = total.toFixed(2);
}

function showLoader(show) {
    document.getElementById('loader').style.display = show ? 'block' : 'none';
}