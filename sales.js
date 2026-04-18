const SUPABASE_URL = 'https://nlybbvlhhdjjmqkzjnhx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tb_WPtZc6awrzrQrDvYUxQ_ndUpe-Au';
window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {

    // STATE 
    const ITEMS_PER_PAGE = 10;
    let currentPage  = 1;
    let currentFilter = 'all';
    let currentSearch = '';
    
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
        const mappedItems = (sale.sale_items || []).map(item => {
            const weight = Number(item.weight) || 0;
            const amount = Number(item.amount) || 0;
    
            return {
                name: item.material_name,
                weight,
                rate: weight > 0 ? amount / weight : 0,
                subtotal: amount,
                unit: "kg"
            };
        });
    
        return {
            ...sale,
            items: mappedItems,
            totalWeight: Number(sale.total_weight) || 0,
            totalAmount: Number(sale.total_amount) || 0
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
            `${s.raw_date} ${s.id} ${s.partner} ${s.contact}`.toLowerCase().includes(currentSearch)
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
            const unique = [...new Set(sale.items.map(m => m.name))];
            materialSummary = unique.length === 1 ? unique[0] : `${unique.length} types`;
        }
    
        // 2. MAIN ROW
        const trMain = document.createElement('tr');
        trMain.className = 'main-row';
        trMain.setAttribute('data-target', rowId); 
        trMain.innerHTML = `
            <td class="chevron-cell"><i data-lucide="chevron-down"></i></td>
            <td>${sale.raw_date || 'N/A'}</td> <td><span class="id-badge">${sale.id}</span></td>
            <td style="font-weight:600;">${sale.partner || 'Unknown'}</td>
            <td><span style="color:#64748b;">${materialSummary}</span></td>
            <td style="text-align:center;">${(Number(sale.totalWeight) || 0).toFixed(1)} kg</td>
            <td style="text-align:right; font-weight:700; color:#10b981;">₱${(Number(sale.totalAmount) || 0).toFixed(2)}</td>
            <td>
                <div class="action-btns">
                    <button data-action="edit" data-id="${sale.id}">Edit</button>
                </div>
            </td>
        `;
    
        // 3. SUB ROW (Expanded content)
        const materialRows = (sale.items || []).map(m => {
            const weight = Number(m.weight) || 0;
            const rate = Number(m.rate) || 0;
            const subtotal = Number(m.subtotal) || 0;
        
            return `
                <tr>
                    <td style="text-align:center;">${weight}</td>
                    <td style="text-align:center;">${m.unit || 'kg'}</td>
                    <td style="text-align:left; padding-left:8px;">${m.name}</td>
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
    //Connect BOTH FILES
    window.refreshSalesTable = renderTable;
    //  ROW TOGGLE
    salesTableBody.addEventListener('click', async (e) => {
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
    salesTableBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        e.stopPropagation();

        const action = btn.getAttribute('data-action');
        const id     = btn.getAttribute('data-id');

        if (action === 'edit') {
            window.openEditSaleModal(id);
        } else if (action === 'delete') {
            window.showDeleteModal(id);
        } else if (action === 'view-receipt') {
            const allSales = await loadSales();
            const sale = allSales.find(s => s.id === id);
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
    const { error } = await window._supabase
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
    renderTable();
});    
