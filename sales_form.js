const SUPABASE_URL = 'https://nlybbvlhhdjjmqkzjnhx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tb_WPtZc6awrzrQrDvYUxQ_ndUpe-Au';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
    const modal = document.getElementById('saleModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
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


//ADD MATERIAL
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
    //SUBMIT INSERT UPDATE
  submitBtn?.addEventListener('click', handleSubmit);
    async function handleSubmit() {
      const partner = document.getElementById('partnerName').value;
      const date    = document.getElementById('saleDate').value;
  
      let totalAmount = 0;
      let totalWeight = 0;
  
      saleMaterials.forEach(m => {
          totalAmount += m.rate * m.weight;
          totalWeight += m.weight;
      });
  
      const payload = {
          partner,
          raw_date: date,
          materials: saleMaterials,
          total_amount: totalAmount,
          total_weight: totalWeight
      };
  
      if (editingId) {
          await supabaseClient.from('sales').update(payload).eq('id', editingId);
      } else {
          await supabaseClient.from('sales').insert([payload]);
      }
  
      closeModal();
  
      // 🔥 IMPORTANT: refresh table from sales.js
      if (window.refreshSalesTable) {
          window.refreshSalesTable();
      }
  };
  document.getElementById('materialsBody')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.remove-item-btn');
      if (!btn) return;
  
      const idx = Number(btn.dataset.idx);
      saleMaterials.splice(idx, 1);
      renderMaterialsTable();
  });
}
