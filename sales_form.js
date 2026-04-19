let saleMaterials = [];
let editingId = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 10;
let currentFilter = 'all';
let currentSearch = '';
const salesTableBody = document.getElementById('salesTableBody');
const emptyState = document.getElementById('emptyState');


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
            await loadMaterialsToDropdown();
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
            total_amount: totalAmount,
            total_weight: totalWeight,
            receipt_image: receiptImage
        };
        
        /* if (editingId) {
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
        } */

        if (editingId) {
            // =========================
            // UPDATE FLOW
            // =========================
        
            // 1. Update main sale
            const { error: updateError } = await window._supabase
                .from('sales')
                .update(saleData)
                .eq('id', editingId);
        
            if (updateError) {
                alert("Update failed: " + updateError.message);
                return;
            }
        
            // 2. Delete old sale_items
            const { error: deleteItemsError } = await window._supabase
                .from('sale_items')
                .delete()
                .eq('sale_id', editingId);
        
            if (deleteItemsError) {
                alert("Failed to clear old items: " + deleteItemsError.message);
                return;
            }
        
            // 3. Insert new sale_items
            const itemsToInsert = saleMaterials.map(m => ({
                sale_id: editingId,
                material_name: m.name,
                weight: m.weight,
                rate: m.rate,
                amount: m.rate * m.weight
            }));
        
            const { error: insertItemsError } = await window._supabase
                .from('sale_items')
                .insert(itemsToInsert);
        
            if (insertItemsError) {
                alert("Failed to insert items: " + insertItemsError.message);
                return;
            }
        
        } else {
            // =========================
            // INSERT FLOW
            // =========================
        
            // 1. Insert sale FIRST
            const { data: insertedSale, error: insertError } = await window._supabase
                .from('sales')
                .insert([saleData])
                .select()
                .single();
        
            if (insertError) {
                alert("Insert failed: " + insertError.message);
                return;
            }
        
            // 2. Insert sale_items using returned sale ID
            const itemsToInsert = saleMaterials.map(m => ({
                sale_id: insertedSale.id,
                material_name: m.name,
                weight: m.weight,
                rate: m.rate,
                amount: m.rate * m.weight
            }));
        
            const { error: itemsError } = await window._supabase
                .from('sale_items')
                .insert(itemsToInsert);
        
            if (itemsError) {
                alert("Items insert failed: " + itemsError.message);
                return;
            }
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


    async function loadMaterialsToDropdown() {
        const { data, error } = await window._supabase
            .from('price_list')
            .select('*')
            .eq('status', 'Active')
            .order('material_name', { ascending: true });
    
        if (error) {
            console.error("Error loading materials:", error);
            return;
        }
    
        const select = document.getElementById('materialSelect');
        if (!select) return;
    
        select.innerHTML = '<option value="">Select material</option>';
    
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.material_name;
            option.textContent = `${item.material_name} (₱${parseFloat(item.price).toFixed(2)}/${item.unit})`;
    
            // 🔥 IMPORTANT: store price from DB
            option.dataset.rate = item.price;
    
            select.appendChild(option);
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


async function loadSales() {
    const { data, error } = await window._supabase
        .from('sales')
        .select(`
            *,
            sale_items (*)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching sales:", error);
        return [];
    }

    return data.map(sale => ({
        ...sale,
        items: (sale.sale_items || []).map(item => ({
            name: item.material_name,
            weight: Number(item.weight) || 0,
            rate: Number(item.rate) || 0,
            subtotal: Number(item.amount) || 0
        }))
    }));
}

function renderPagination(totalCount) {
    const paginationEl = document.getElementById('pagination');
    if (!paginationEl) return;

    paginationEl.innerHTML = '';
}


async function renderTable() {
    const allSales = await loadSales(); 
    let filtered = allSales;

    // Filter by type (organization/individual)
    if (currentFilter !== 'all') {
        filtered = allSales.filter(s => s.type === currentFilter);
    }
    
    // Search logic
    if (currentSearch) {
        const searchLower = currentSearch.toLowerCase();
        filtered = filtered.filter(s =>
            `${s.raw_date} ${s.id} ${s.partner} ${s.contact}`.toLowerCase().includes(searchLower)
        );
    }

    if (!salesTableBody) return;
    salesTableBody.innerHTML = '';

    // Pagination Calculation
    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    if (pageItems.length === 0) {
        emptyState?.classList.add('visible');
        renderPagination(0);
        return;
    }

    emptyState?.classList.remove('visible');

    pageItems.forEach(sale => {
        const rowId = 'sub-' + sale.id;
    
        // 1. MATERIAL SUMMARY LOGIC (Synced with 'materials' key)
        let materialSummary = 'N/A';
        const materialsList = sale.materials || []; // Changed from sale.items
        if (materialsList.length > 0) {
            const unique = [...new Set(materialsList.map(m => m.name))]; 
            materialSummary = unique.length === 1 ? unique[0] : `${unique.length} types`;
        }
    
        // 2. MAIN ROW
        const trMain = document.createElement('tr');
        trMain.className = 'main-row';
        trMain.setAttribute('data-target', rowId); 
        trMain.innerHTML = `
            <td class="chevron-cell"><i data-lucide="chevron-down"></i></td>
            <td>${sale.raw_date || 'N/A'}</td> 
            <td><span class="id-badge">${sale.id || '---'}</span></td>
            <td style="font-weight:600;">${sale.partner || 'Unknown'}</td>
            <td><span style="color:#64748b;">${materialSummary}</span></td>
            <td style="text-align:center;">${(Number(sale.total_weight) || 0).toFixed(1)} kg</td>
            <td style="text-align:right; font-weight:700; color:#10b981;">₱${(Number(sale.total_amount) || 0).toFixed(2)}</td>
            <td>
                <div class="action-btns">
                    <button class="edit-btn" onclick="openEditModal('${sale.id}')">Edit</button>
                </div>
            </td>
        `;
    
        // 3. SUB ROW (Synced with 'materials' key)
        const materialRows = materialsList.map(m => {
            const weight = Number(m.weight) || 0;
            const rate = Number(m.rate) || 0;
            const subtotal = weight * rate;
        
            return `
                <tr>
                    <td style="text-align:center;">${weight.toFixed(1)}</td>
                    <td style="text-align:center;">kg</td>
                    <td style="text-align:left; padding-left:8px;">${m.name || 'Unknown'}</td>
                    <td style="text-align:center;">₱${rate.toFixed(2)}</td>
                    <td style="text-align:center;">₱${subtotal.toFixed(2)}</td>
                </tr>
            `;
        }).join('');
    
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
                        <span style="font-weight:700; color:#10b981;">₱${(Number(sale.total_amount) || 0).toFixed(2)}</span>
                    </div>
                </div>
            </td>
        `;
    
        salesTableBody.appendChild(trMain);
        salesTableBody.appendChild(trSub);
    });

    lucide.createIcons();
    if (typeof renderPagination === 'function') renderPagination(filtered.length);
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

