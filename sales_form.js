let saleMaterials = [];
let editingId = null;

document.addEventListener('DOMContentLoaded', () => {
    initSalesForm();
});

function initSalesForm() {
    const openBtn = document.getElementById('openSaleModalBtn');
    const modal   = document.getElementById('saleModal');

    if (!modal) return;

    openBtn?.addEventListener('click', () => openModal());

    wireFormEvents();
}

//OPEN SALE MODAL GLOBAL
window.openEditSaleModal = async function(id) {
    const { data } = await supabaseClient
        .from('sales')
        .select('*')
        .eq('id', id)
        .single();

    if (!data) return;

    editingId = id;
    saleMaterials = data.materials || [];

    openModal();

    document.getElementById('partnerName').value = data.partner || '';
    document.getElementById('saleContact').value = data.contact || '';
    document.getElementById('saleDate').value = data.raw_date || '';

    renderMaterialsTable();
};

//OPEN CLOSE MODAL
function openModal() {
    const modal = document.getElementById('saleModal'); // Ensure you get the element
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        if (window.lucide) lucide.createIcons();
    } else {
        console.error("Modal element 'saleModal' not found in DOM.");
    }
}

function closeModal() {
    const modal = document.getElementById('saleModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    resetForm();
}
//RESET
function resetForm() {
    saleMaterials = [];
    editingId = null;

    document.getElementById('partnerName').value = '';
    document.getElementById('saleContact').value = '';
    document.getElementById('saleDate').value = '';

    renderMaterialsTable();
}

//RENDER MATERIALS TABLE
function renderMaterialsTable() {
    const body = document.getElementById('materialsBody');
    if (!body) return;

    body.innerHTML = '';

    saleMaterials.forEach((m, i) => {
        const subtotal = m.rate * m.weight;

        body.innerHTML += `
            <tr>
                <td>${m.name}</td>
                <td>${m.weight} kg</td>
                <td>₱${subtotal.toFixed(2)}</td>
                <td>
                    <button data-idx="${i}" class="remove-item-btn">X</button>
                </td>
            </tr>
        `;
    });
}


// ADD MATERIAL
function wireFormEvents() {
    const addBtn = document.getElementById('addMaterialBtn');
    const submitBtn = document.getElementById('submitSaleBtn');

    addBtn?.addEventListener('click', () => {
        const sel = document.getElementById('materialSelect');
        const weight = parseFloat(document.getElementById('materialWeight').value);

        if (!sel.value || weight <= 0) return;

        saleMaterials.push({
            name: sel.value,
            rate: Number(sel.selectedOptions[0].dataset.rate),
            weight
        });

        renderMaterialsTable();
    });

    submitBtn?.addEventListener('click', handleSubmit);
}

// SUBMIT
async function handleSubmit() {
    const partner = document.getElementById('partnerName').value;
    const date    = document.getElementById('saleDate').value;

    let totalAmount = 0;
    let totalWeight = 0;

    saleMaterials.forEach(m => {
        totalAmount += m.rate * m.weight;
        totalWeight += m.weight;
    });

    // ✅ INSERT / UPDATE SALES
    let saleId = editingId;

    if (editingId) {
        await supabaseClient
            .from('sales')
            .update({
                partner,
                raw_date: date,
                total_amount: totalAmount,
                total_weight: totalWeight
            })
            .eq('id', editingId);

        // 🔥 delete old items before re-inserting
        await supabaseClient
            .from('sale_items')
            .delete()
            .eq('sale_id', editingId);

    } else {
        const { data, error } = await supabaseClient
            .from('sales')
            .insert([{
                partner,
                raw_date: date,
                total_amount: totalAmount,
                total_weight: totalWeight
            }])
            .select()
            .single();

        if (error) {
            alert(error.message);
            return;
        }

        saleId = data.id;
    }

    // ✅ INSERT SALE ITEMS
    const itemsPayload = saleMaterials.map(m => ({
        sale_id: saleId,
        material_name: m.name,
        weight: m.weight,
        amount: m.rate * m.weight
    }));

    if (itemsPayload.length > 0) {
        await supabaseClient.from('sale_items').insert(itemsPayload);
    }

    closeModal();

    if (window.refreshSalesTable) {
        window.refreshSalesTable();
    }
}
