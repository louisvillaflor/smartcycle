const SUPABASE_URL = 'https://nlybbvlhhdjjmqkzjnhx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tb_WPtZc6awrzrQrDvYUxQ_ndUpe-Au';
window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {

    // STATE 
    const ITEMS_PER_PAGE = 10;
    let currentPage  = 1;
    let currentFilter = 'all';
    let currentSearch = '';
    let saleMaterials = [];
    let editingId = null;

    // STORAGE 
    async function loadSales() {
    const { data, error } = await window._supabase
        .from('sales')
        .select(`
            *,
            sale_items (*)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching sales:', error);
        return [];
    }
    
    return data.map(sale => {
        // Map items to a consistent structure
        const mappedItems = (sale.sale_items || []).map(item => ({
            material: item.item_name || 'Unknown', // Use 'material' to match collections logic
            rate: parseFloat(item.price) || 0,
            weight: parseFloat(item.weight) || 0,
            subtotal: (parseFloat(item.price) || 0) * (parseFloat(item.weight) || 0)
        }));

        return {
            ...sale,
            items: mappedItems, // Use 'items' to match collections.js
            // Ensure these match your Supabase column names exactly
            totalWeight: parseFloat(sale.total_weight) || 0,
            totalAmount: parseFloat(sale.total_amount) || 0
        };
    });
}
    // ELEMENTS 
    const salesTableBody = document.getElementById('salesTableBody');
    const emptyState     = document.getElementById('emptyState');
    const paginationEl   = document.getElementById('pagination');
    const searchInput    = document.getElementById('salesSearch');

    //RENDER TABLE 
    async function renderTable() {
    const allSales = await loadSales(); 
    let filtered = allSales;

    if (currentFilter !== 'all') {
        filtered = allSales.filter(s => s.type === currentFilter);
    }
    if (currentSearch) {
        filtered = filtered.filter(s =>
            `${s.date} ${s.id} ${s.partner} ${s.material_names} ${s.contact}`.toLowerCase().includes(currentSearch)
        );
    }

    salesTableBody.innerHTML = '';

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    if (pageItems.length === 0) {
        emptyState.classList.add('visible');
        renderPagination(0);
        return;
    }

    emptyState.classList.remove('visible');

        pageItems.forEach(sale => {
        const rowId = 'sub-' + sale.id;
    
        // 1. MATERIAL SUMMARY LOGIC
        let materialSummary = 'N/A';
        if (sale.items && sale.items.length > 0) {
            const unique = [...new Set(sale.items.map(m => m.material))]; 
            materialSummary = unique.length === 1 ? unique[0] : `${unique.length} types`;
        }
    
        // 2. MAIN ROW
        const trMain = document.createElement('tr');
        trMain.className = 'main-row';
        trMain.setAttribute('onclick', `toggleDetails('${rowId}', this)`); // Consistency with toggle logic
        trMain.innerHTML = `
            <td class="chevron-cell"><i data-lucide="chevron-down" style="width:18px;"></i></td>
            <td>${sale.date || 'N/A'}</td>
            <td><span class="id-badge">${sale.id}</span></td>
            <td style="font-weight:600;">${sale.partner || 'Unknown'}</td>
            <td><span style="color:#64748b;">${materialSummary}</span></td>
            <td style="text-align:center;">${(sale.totalWeight || 0).toFixed(1)} kg</td>
            <td style="text-align:right; font-weight:700; color:#10b981;">₱${(sale.totalAmount || 0).toFixed(2)}</td>
            <td></td>
        `;
    
        // 3. SUB ROW (Expanded content)
        const materialRows = (sale.items || []).map(m => `
            <tr>
                <td style="text-align:center;">${m.weight.toFixed(1)}</td>
                <td style="text-align:center;">kg</td>
                <td style="text-align:left; padding-left:8px;">${m.material}</td>
                <td style="text-align:center;">₱${m.rate.toFixed(2)}</td>
                <td style="text-align:center;">₱${m.subtotal.toFixed(2)}</td>
            </tr>
        `).join('');
    
        const trSub = document.createElement('tr');
        trSub.id = rowId;
        trSub.className = 'sub-row-container';
        trSub.innerHTML = `
            <td colspan="8" style="padding:0 !important; border:none;">
                <div class="expanded-content">
                    <table class="expanded-table">
                        <thead>
                            <tr>
                                <th style="text-align:center;">QTY</th>
                                <th style="text-align:center;">UNIT</th>
                                <th style="text-align:left; padding-left:8px;">DESCRIPTION</th>
                                <th style="text-align:center;">PRICE</th>
                                <th style="text-align:center;">AMOUNT</th>
                            </tr>
                        </thead>
                        <tbody>${materialRows}</tbody>
                    </table>
                    <div style="text-align:right; padding: 15px 25px; border-top: 1px solid #f1f5f9;">
                        <span style="font-size:13px; color:#64748b; margin-right:10px;">Total Amount:</span>
                        <span style="font-weight:700; color:#10b981;">₱${(sale.totalAmount || 0).toFixed(2)}</span>
                    </div>
                </div>
            </td>
        `;
    
        salesTableBody.appendChild(trMain);
        salesTableBody.appendChild(trSub);
    });
        lucide.createIcons();
        renderPagination(filtered.length);
    }

    //  ROW TOGGLE
    salesTableBody.addEventListener('click', (e) => {
        if (e.target.closest('.action-btns')) return;
        const mainRow = e.target.closest('.main-row');
        if (!mainRow) return;

        const targetId = mainRow.getAttribute('data-target');
        const subRow   = document.getElementById(targetId);
        if (!subRow) return;

        const isOpen = subRow.classList.contains('show');
        document.querySelectorAll('.sub-row-container').forEach(r => r.classList.remove('show'));
        document.querySelectorAll('.main-row').forEach(r => r.classList.remove('open'));

        if (!isOpen) {
            subRow.classList.add('show');
            mainRow.classList.add('open');
        }
    });

    // ACTION BUTTONS
    salesTableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        e.stopPropagation();

        const action = btn.getAttribute('data-action');
        const id     = btn.getAttribute('data-id');

        if (action === 'edit') {
            openEditModal(id);
        } else if (action === 'delete') {
            showDeleteModal(id);
        } else if (action === 'view-receipt') {
            const sale = loadSales().find(s => s.id === id);
            if (sale && sale.receiptImage) {
                const win = window.open('', '_blank');
                win.document.write(`<!DOCTYPE html><html><head><title>Receipt - ${sale.partner}</title>
                    <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#1a1a1a;}
                    img{max-width:100%;max-height:100vh;object-fit:contain;border-radius:8px;}</style></head>
                    <body><img src="${sale.receiptImage}" alt="Receipt for ${sale.partner}"></body></html>`);
            }
        }
    });

    // DELETE MODAL 
    async function showDeleteModal(id) {
        const allSales = await loadSales();
        const sale = allSales.find(s => s.id === id);
        if (!sale) return;

        if (!document.getElementById('saleDeleteModal')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="saleDeleteModal" style="
                    display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);
                    z-index:3000;justify-content:center;align-items:center;
                    backdrop-filter:blur(4px);
                ">
                    <div style="
                        background:white;border-radius:20px;padding:36px 32px 28px;
                        width:360px;max-width:90vw;text-align:center;
                        box-shadow:0 20px 60px rgba(0,0,0,0.2);
                        animation:saleDeleteIn 0.25s ease-out;
                    ">
                        <div style="width:64px;height:64px;background:#fef2f2;border-radius:50%;
                            display:flex;align-items:center;justify-content:center;margin:0 auto 18px;">
                            <i data-lucide="trash-2" style="width:28px;height:28px;color:#ef4444;"></i>
                        </div>
                        <h3 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">Delete Sale</h3>
                        <p id="saleDeleteText" style="font-size:14px;color:#6b7280;margin:0 0 28px;line-height:1.5;"></p>
                        <div style="display:flex;gap:12px;">
                            <button id="saleDeleteCancel" style="
                                flex:1;padding:12px;border-radius:10px;border:1px solid #e5e7eb;
                                background:white;font-size:14px;font-weight:600;color:#374151;
                                cursor:pointer;font-family:inherit;transition:background 0.2s;
                            " onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">Cancel</button>
                            <button id="saleDeleteConfirm" style="
                                flex:1;padding:12px;border-radius:10px;border:none;
                                background:#ef4444;color:white;font-size:14px;font-weight:600;
                                cursor:pointer;font-family:inherit;transition:background 0.2s;
                            " onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">Delete</button>
                        </div>
                    </div>
                </div>
                <style>
                    @keyframes saleDeleteIn {
                        from { opacity:0; transform:scale(0.93) translateY(16px); }
                        to   { opacity:1; transform:scale(1) translateY(0); }
                    }
                </style>
            `);
            lucide.createIcons();
        }

        const modal      = document.getElementById('saleDeleteModal');
        const text       = document.getElementById('saleDeleteText');
        const confirmBtn = document.getElementById('saleDeleteConfirm');
        const cancelBtn  = document.getElementById('saleDeleteCancel');

        text.textContent = `Are you sure you want to delete the sale for "${sale.partner}"? This action cannot be undone.`;
        modal.style.display = 'flex';
        lucide.createIcons();

        const newConfirm = confirmBtn.cloneNode(true);
        const newCancel  = cancelBtn.cloneNode(true);
        confirmBtn.replaceWith(newConfirm);
        cancelBtn.replaceWith(newCancel);

       newConfirm.addEventListener('click', async () => {
    const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

    if (!error) {
        modal.style.display = 'none';
        renderTable();
    } else {
        alert("Delete failed: " + error.message);
    }
});
        newCancel.addEventListener('click', () => { modal.style.display = 'none'; });
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    }

    //PAGINATION 
    function renderPagination(totalCount) {
        const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
        paginationEl.innerHTML = '';

        if (totalPages <= 1) return;

        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '<i data-lucide="chevron-left"></i>';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => { currentPage--; renderTable(); });
        paginationEl.appendChild(prevBtn);

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
            btn.textContent = i;
            btn.addEventListener('click', () => { currentPage = i; renderTable(); });
            paginationEl.appendChild(btn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = '<i data-lucide="chevron-right"></i>';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => { currentPage++; renderTable(); });
        paginationEl.appendChild(nextBtn);

        lucide.createIcons();
    }

    // FILTER TABS
    document.querySelectorAll('.table-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.table-tabs .tab').forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            currentFilter = tab.getAttribute('data-filter') || 'all';
            currentPage = 1;
            renderTable();
        });
    });

    // SEARCH 
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.toLowerCase().trim();
            currentPage = 1;
            renderTable();
        });
    }

    // GENERATE ID 
    function generateId() {
        const allSales = loadSales();
        const maxId = allSales.length > 0
            ? Math.max(...allSales.map(s => parseInt(s.id.replace(/\D/g,'')) || 0))
            : 0;
        return 'S' + String(maxId + 1).padStart(3, '0');
    }

    // LOAD MODAL 
    fetch('sales_form.html')
        .then(res => res.text())
        .then(html => {
            document.getElementById('sale-modal-container').innerHTML = html;
            lucide.createIcons();
            wireModal();
            renderTable();
        })
        .catch(() => {
            console.error('Could not load sales form');
            renderTable();
        });

    // OPEN EDIT
    async function openEditModal(id) {
        const sale = await loadSales().find(s => s.id === id);
        
        if (!sale) return;

        editingId = id;
        saleMaterials = [...(sale.materials || [])];

        const modal = document.getElementById('saleModal');
        if (!modal) return;

        // Set fields
        document.getElementById('partnerName').value = sale.partner || '';
        document.getElementById('saleContact').value = sale.contact || '';

        // Convert display date (MM-DD-YY or similar) back to YYYY-MM-DD
        if (sale.rawDate) {
            document.getElementById('saleDate').value = sale.rawDate;
        }

        // Set type tab
        modal.querySelectorAll('.m-tab').forEach(t => {
            const match = t.getAttribute('data-type') === sale.type;
            t.classList.toggle('active', match);
            t.setAttribute('aria-selected', match ? 'true' : 'false');
        });

        // Update submit button text
        const submitBtn = document.getElementById('submitSaleBtn');
        if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check"></i> Update';

        renderMaterialsTable();
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        lucide.createIcons();
    }

    // RENDER MATERIALS TABLE 
    function renderMaterialsTable() {
        const materialsBody  = document.getElementById('materialsBody');
        const formTotalLine  = document.getElementById('saleFormTotalLine');
        const materialsTotalEl = document.getElementById('saleFormTotal');
        if (!materialsBody) return;

        materialsBody.innerHTML = '';

        if (saleMaterials.length === 0) {
            materialsBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px;">No materials added yet</td></tr>';
            if (formTotalLine) formTotalLine.style.display = 'none';
            return;
        }

        let total = 0;
        saleMaterials.forEach((m, idx) => {
            const subtotal = m.rate * m.weight;
            total += subtotal;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${m.name}</td>
                <td>${m.weight} kg</td>
                <td><strong>&#8369;${subtotal.toFixed(2)}</strong></td>
                <td>
                    <button class="remove-item-btn" data-idx="${idx}" type="button">
                        <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                    </button>
                </td>
            `;
            materialsBody.appendChild(tr);
        });

        if (formTotalLine) formTotalLine.style.display = 'flex';
        if (materialsTotalEl) materialsTotalEl.innerHTML = `&#8369;${total.toFixed(2)}`;
        lucide.createIcons();
    }

    // WIRE MODAL
    function wireModal() {
        const saleModal        = document.getElementById('saleModal');
        const openSaleModalBtn = document.getElementById('openSaleModalBtn');
        const cancelSaleBtn    = document.getElementById('cancelSaleBtn');
        const submitSaleBtn    = document.getElementById('submitSaleBtn');
        const addMaterialBtn   = document.getElementById('addMaterialBtn');
        const materialsBody    = document.getElementById('materialsBody');
        const attachReceiptBtn = document.getElementById('attachReceiptBtn');
        const receiptInput     = document.getElementById('receiptInput');
        const receiptPreview   = document.getElementById('receiptPreview');
        const receiptPreviewImg = document.getElementById('receiptPreviewImg');
        const removeReceiptBtn = document.getElementById('removeReceiptBtn');
        const receiptFilenameLabel = document.getElementById('receiptFilenameLabel');

        if (!saleModal) return;

        // Open
        openSaleModalBtn?.addEventListener('click', () => {
            editingId = null;
            saleMaterials = [];
            resetModal();
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('saleDate').value = today;
            saleModal.classList.add('show');
            document.body.style.overflow = 'hidden';
            lucide.createIcons();
        });

        // Close 
        function closeModal() {
            saleModal.classList.remove('show');
            document.body.style.overflow = '';
            editingId = null;
            saleMaterials = [];
            resetModal();
        }

        cancelSaleBtn?.addEventListener('click', closeModal);
        saleModal.addEventListener('click', (e) => { if (e.target === saleModal) closeModal(); });

        // Tabs 
        saleModal.querySelectorAll('.m-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                saleModal.querySelectorAll('.m-tab').forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
            });
        });

        // Add Material
        addMaterialBtn?.addEventListener('click', () => {
            const sel      = document.getElementById('materialSelect');
            const weightEl = document.getElementById('materialWeight');
            const name     = sel.value;
            const rate     = Number(sel.selectedOptions[0]?.dataset.rate || 0);
            const weight   = parseFloat(weightEl.value) || 0;
            const matErr   = document.getElementById('materialsError');

            if (!name || weight <= 0) {
                if (matErr) matErr.textContent = 'Please enter a valid weight.';
                return;
            }
            if (matErr) matErr.textContent = '';

            saleMaterials.push({ name, rate, weight });
            weightEl.value = '';
            weightEl.focus();
            renderMaterialsTable();
        });

        // Enter key on weight input
        document.getElementById('materialWeight')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); addMaterialBtn?.click(); }
        });

        // Remove Material
        materialsBody?.addEventListener('click', (e) => {
            const delBtn = e.target.closest('.remove-item-btn');
            if (!delBtn) return;
            const idx = Number(delBtn.dataset.idx);
            if (!isNaN(idx)) {
                saleMaterials.splice(idx, 1);
                renderMaterialsTable();
            }
        });

        //  Receipt Attach 
        attachReceiptBtn?.addEventListener('click', () => receiptInput?.click());

        receiptInput?.addEventListener('change', () => {
            const file = receiptInput.files[0];
            if (!file) return;
            if (receiptFilenameLabel) receiptFilenameLabel.textContent = file.name;
            const reader = new FileReader();
            reader.onload = (e) => {
                if (receiptPreviewImg) receiptPreviewImg.src = e.target.result;
                receiptPreview?.classList.add('visible');
                lucide.createIcons();
            };
            reader.readAsDataURL(file);
        });

        removeReceiptBtn?.addEventListener('click', () => {
            if (receiptInput) receiptInput.value = '';
            if (receiptPreviewImg) receiptPreviewImg.src = '';
            receiptPreview?.classList.remove('visible');
            if (receiptFilenameLabel) receiptFilenameLabel.textContent = 'Attach Receipt';
        });

        //  Validate contact
        function validateContact(value) {
            if (!value) return true;
            return /^09\d{9}$/.test(value.replace(/[-\s]/g, ''));
        }

        document.getElementById('saleContact')?.addEventListener('input', (e) => {
            const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 11);
            let fmt = raw;
            if (raw.length > 4 && raw.length <= 7) fmt = `${raw.slice(0,4)}-${raw.slice(4)}`;
            else if (raw.length > 7) fmt = `${raw.slice(0,4)}-${raw.slice(4,7)}-${raw.slice(7,11)}`;
            e.target.value = fmt;
        });

        //  Submit/ Update 
        submitSaleBtn?.addEventListener('click', async () => {
            const partnerVal = document.getElementById('partnerName')?.value.trim();
            const dateVal    = document.getElementById('saleDate')?.value;
            const contactVal = document.getElementById('saleContact')?.value.trim();

            const partnerErr = document.getElementById('partnerNameError');
            const dateErr    = document.getElementById('saleDateError');
            const contactErr = document.getElementById('saleContactError');
            const matErr     = document.getElementById('materialsError');

            [partnerErr, dateErr, contactErr, matErr].forEach(el => { if (el) el.textContent = ''; });

            let hasError = false;
            if (!partnerVal) { if (partnerErr) partnerErr.textContent = 'Partner name is required.'; hasError = true; }
            if (!dateVal)    { if (dateErr)    dateErr.textContent = 'Date is required.'; hasError = true; }
            if (contactVal && !validateContact(contactVal)) { if (contactErr) contactErr.textContent = 'Use format: 09XX-XXX-XXXX'; hasError = true; }
            if (saleMaterials.length === 0) { if (matErr) matErr.textContent = 'Please add at least one material.'; hasError = true; }
            if (hasError) return;

            const activeTab = saleModal.querySelector('.m-tab.active');
            const type      = activeTab?.getAttribute('data-type') || 'organization';

            // Format date
            const dateObj = new Date(dateVal);
            const month   = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day     = String(dateObj.getDate()).padStart(2, '0');
            const year    = String(dateObj.getFullYear()).slice(-2);
            const displayDate = `${month}-${day}-${year}`;

            let totalAmount = 0;
            let totalWeight = 0;
            saleMaterials.forEach(m => { totalAmount += m.rate * m.weight; totalWeight += m.weight; });

            const materialNames = [...new Set(saleMaterials.map(m => m.name))].join(', ');

            // Receipt image
            let receiptImage = null;
            if (receiptPreviewImg && receiptPreviewImg.src && receiptPreviewImg.src !== window.location.href) {
                receiptImage = receiptPreviewImg.src;
            }

            // Prepare the object for Supabase
        const saleData = {
            date: displayDate,
            raw_date: dateVal, // Use snake_case for DB columns
            partner: partnerVal,
            contact: contactVal,
            type: type,
            materials: saleMaterials, // Supabase handles JSON arrays automatically
            material_names: materialNames,
            total_amount: totalAmount,
            total_weight: totalWeight,
            receipt_image: receiptImage
        };
        
        if (editingId) {
            // UPDATE
            const { error } = await window._supabase
                .from('sales')
                .update(saleData)
                .eq('id', editingId);
            
            if (error) alert("Update failed: " + error.message);
        } else {
            // INSERT
            const { error } = await window._supabase
                .from('sales')
                .insert([saleData]);
            
            if (error) alert("Insert failed: " + error.message);
        }
        
        // Refresh the table after saving
        closeModal();
        await renderTable();
        resetModal();
    });
        // Reset 
        function resetModal() {
            saleMaterials = [];
            renderMaterialsTable();
            ['partnerName','saleDate','saleContact'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            if (receiptInput) receiptInput.value = '';
            if (receiptPreviewImg) receiptPreviewImg.src = '';
            receiptPreview?.classList.remove('visible');
            if (receiptFilenameLabel) receiptFilenameLabel.textContent = 'Attach Receipt';
            saleModal.querySelectorAll('.m-tab').forEach((t, i) => {
                t.classList.toggle('active', i === 0);
                t.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
            });
            ['partnerNameError','saleDateError','saleContactError','materialsError'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = '';
            });
            const submitBtn = document.getElementById('submitSaleBtn');
            if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check"></i> Submit';
            lucide.createIcons();
    }
 }

});    
