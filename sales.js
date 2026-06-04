const state = {
    sales: [],
    filtered: [],
    loading: false
};

if (!window._supabase) {
    const SUPABASE_URL = 'https://nlybbvlhhdjjmqkzjnhx.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_tb_WPtZc6awrzrQrDvYUxQ_ndUpe-Au';

    window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}
let currentUserRole = null;

async function getUserRole() {
    const { data: { user } } = await window._supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await window._supabase
        .from('profiles')
        .select('type')
        .eq('auth_id', user.id) // IMPORTANT: must match auth_id
        .single();

    if (error) {
        console.error('Role fetch error:', error.message);
        return null;
    }

    return data.type; // "Super Admin", "Admin", "Moderator"
}

function applyRoleUI() {
    const addBtn = document.getElementById('openSaleModalBtn');

    if (currentUserRole === 'Moderator') {
        if (addBtn) addBtn.style.display = 'none';
    }
}

// STORAGE & DATA SANITIZATION (UPDATED FOR RELATED TABLES)
async function fetchSales() {
    const { data, error } = await window._supabase
        .from('sales')
        .select(`
            *,
            profiles (
                name
            ),
            sale_items (
                *,
                price_list (
                    material_name
                )
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("FETCH ERROR:", error.message);
        return [];
    }

    // Change this section inside your fetchSales() function:
    return data.map(sale => {
        const items = Array.isArray(sale.sale_items) ? sale.sale_items : [];
    
        return {
            ...sale,
            raw_date: sale.date 
                ? new Date(sale.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-') 
                : 'N/A',
            
            partner: sale.profiles ? sale.profiles.name : 'Unknown',
            
            // Inside your sales.js fetchSales() data mapping transformation loop:
            items: items.map(i => ({
                material_id: i.material_id, // 🔹 ADD THIS LINE so edit mode can read it!
                name: i.price_list ? i.price_list.material_name : 'Unknown Material',
                weight: Number(i.weight) || 0,
                rate: Number(i.rate) || 0,
                subtotal: Number(i.amount) || 0
            })),
            total_weight: Number(sale.total_weight) || 0,
            total_amount: Number(sale.total_amount) || 0
        };
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // RUNTIME STATE
    const ITEMS_PER_PAGE = 10;
    let currentPage   = 1;
    let currentFilter = 'all';
    let currentSearch = '';

    // DOM ELEMENTS
    const salesTableBody = document.getElementById('salesTableBody');
    const emptyState     = document.getElementById('emptyState');
    const paginationEl   = document.getElementById('pagination');
    const searchInput    = document.getElementById('salesSearch');

    currentUserRole = await getUserRole();
    applyRoleUI();

    // Central data pipeline
    async function loadDataAndRender() {
        state.loading = true;
        state.sales = await fetchSales(); 
        state.loading = false;
        renderTable();
    }

    // RENDER TABLE (Instantaneous execution directly over local state)
    function renderTable() {
        // 1. FILTER LOCAL MEMORY
        let filtered = state.sales;

        if (currentFilter !== 'all') {
            filtered = state.sales.filter(s => s.type === currentFilter);
        }

        if (currentSearch) {
            filtered = filtered.filter(s =>
                `${s.id} ${s.partner} ${s.date}`.toLowerCase().includes(currentSearch)
            );
        }

        state.filtered = filtered;

        // 2. PAGINATION MATH
        const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
        if (currentPage > totalPages) currentPage = totalPages;

        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

        // 3. RENDER DOM STATES
        salesTableBody.innerHTML = '';

        if (pageItems.length === 0) {
            emptyState?.classList.add('visible');
            renderPagination(0);
            return;
        }

        emptyState?.classList.remove('visible');

        // 4. BUILD DOCUMENT FRAGMENT
        const fragment = document.createDocumentFragment();

        pageItems.forEach(sale => {
            const rowId = `sub-${sale.id}`;

            // Compute material overview string strings
            const uniqueNames = [...new Set(sale.items.map(i => i.name))];
            const materialSummary = sale.items.length === 0 
                ? 'N/A' 
                : uniqueNames.length === 1 
                    ? uniqueNames[0] 
                    : `${uniqueNames.length} types`;

            const trMain = document.createElement('tr');
            trMain.className = 'main-row';
            trMain.setAttribute('data-target', rowId);
            const canModify = currentUserRole === 'Super Admin' || currentUserRole === 'Admin';
            
            trMain.innerHTML = `
                <td class="chevron-cell"><i data-lucide="chevron-down"></i></td>
                <td>${sale.raw_date || 'N/A'}</td>
                <td><span class="id-badge">${sale.id}</span></td>
                <td style="font-weight: 600;">${sale.partner || 'Unknown'}</td>
                <td>${materialSummary}</td>
                <td style="text-align:center;">${sale.total_weight.toFixed(1)} kg</td>
                <td style="text-align:right; font-weight:700; color:#10b981;">₱${sale.total_amount.toFixed(2)}</td>
                <td>
                    <div class="action-btns">
                        <button class="icon-btn receipt-btn" data-action="view-receipt" data-id="${sale.id}" title="View Receipt">
                            <i data-lucide="image"></i>
                        </button>
            
                        ${canModify ? `
                            <button class="icon-btn" data-action="edit" data-id="${sale.id}" title="Edit">
                                <i data-lucide="edit-2"></i>
                            </button>
                            <button class="icon-btn delete" data-action="delete" data-id="${sale.id}" title="Delete">
                                <i data-lucide="trash-2"></i>
                            </button>
                        ` : ``}
                    </div>
                </td>
            `;

            // 🔹 FIX: Safely fallback if there are no sub-items inside the sale row
            let itemsHTML = '';
            if (sale.items.length === 0) {
                itemsHTML = `
                    <tr>
                        <td colspan="5" style="text-align:center; color:#94a3b8; padding:20px; font-style:italic;">
                            No specific material item rows attached to this record.
                        </td>
                    </tr>
                `;
            } else {
                itemsHTML = sale.items.map(m => `
                    <tr>
                        <td style="text-align:center;">${m.weight.toFixed(1)}</td>
                        <td style="text-align:center;">kg</td>
                        <td style="text-align:left; padding-left:8px;">${m.name || 'Unknown'}</td>
                        <td style="text-align:center;">₱${m.rate.toFixed(2)}</td>
                        <td style="text-align:center;">₱${m.subtotal.toFixed(2)}</td>
                    </tr>
                `).join('');
            }

            const trSub = document.createElement('tr');
            trSub.id = rowId;
            trSub.className = 'sub-row-container';
            trSub.innerHTML = `
                <td colspan="8" style="border:none;">
                    <div class="expanded-content">
                        <table class="expanded-table">
                            <thead>
                                <tr>
                                    <th style="text-align:center">QTY</th>
                                    <th style="text-align:center">UNIT</th>
                                    <th style="text-align:left; padding-left:8px;">DESCRIPTION</th>
                                    <th style="text-align:center">PRICE</th>
                                    <th style="text-align:center">AMOUNT</th>
                                </tr>
                            </thead>
                            <tbody>${itemsHTML}</tbody>
                        </table>
                        <div style="text-align:right; padding: 15px 25px; border-top: 1px solid #f1f5f9;">
                            <span style="font-size:13px; color:#64748b; margin-right:10px;">Total Amount:</span>
                            <span style="font-weight:700; color:#10b981;">₱${sale.total_amount.toFixed(2)}</span>
                        </div>
                    </div>
                </td>
            `;

            fragment.appendChild(trMain);
            fragment.appendChild(trSub);
        });

        salesTableBody.appendChild(fragment);
        lucide.createIcons();
        renderPagination(filtered.length);
    }

    // Expose entrypoint for local sales forms to force fresh fetches
    window.renderTable = loadDataAndRender;

    // EVENT DELEGATION: Rows & Action Buttons
    salesTableBody.addEventListener('click', (e) => {
        const target = e.target;
        
        // Context 1: Intercept Action Buttons
        const btn = target.closest('[data-action]');
        if (btn) {
            e.stopPropagation();
            const action = btn.getAttribute('data-action');
            const id = btn.getAttribute('data-id');
            const sale = state.sales.find(s => String(s.id) === String(id));
            
            if (!sale) return;

            const canModify = currentUserRole === 'Super Admin' || currentUserRole === 'Admin';
            
            if (action === 'edit') {
                if (!canModify) return alert('Unauthorized');
                window.openEditModal(id);
            
            } else if (action === 'delete') {
                if (!canModify) return alert('Unauthorized');
                window.showDeleteModal(id);
            } else if (action === 'view-receipt' && sale.receipt_image) {
                const win = window.open('', '_blank');
                win.document.write(`<!DOCTYPE html><html><head><title>Receipt - ${sale.partner}</title>
                    <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#1a1a1a;}
                    img{max-width:100%;max-height:100vh;object-fit:contain;border-radius:8px;}</style></head>
                    <body><img src="${sale.receipt_image}" alt="Receipt for ${sale.partner}"></body></html>`);
            }
            return;
        }

        // Context 2: Expandable Row Toggle Behavior
        const mainRow = target.closest('.main-row');
        if (mainRow) {
            const targetId = mainRow.getAttribute('data-target');
            const subRow = document.getElementById(targetId);
            if (!subRow) return;

            const isOpen = subRow.classList.contains('show');
            
            document.querySelectorAll('.sub-row-container').forEach(r => r.classList.remove('show'));
            document.querySelectorAll('.main-row').forEach(r => r.classList.remove('open'));

            if (!isOpen) {
                subRow.classList.add('show');
                mainRow.classList.add('open');
            }
        }
    });

    // CENTRALIZED MODAL DELETION CONTROLLER
    window.showDeleteModal = function(id) {
        const sale = state.sales.find(s => String(s.id) === String(id));
        if (!sale) return;

        if (!document.getElementById('saleDeleteModal')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="saleDeleteModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:3000;justify-content:center;align-items:center;backdrop-filter:blur(4px);">
                    <div style="background:white;border-radius:20px;padding:36px 32px 28px;width:360px;max-width:90vw;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                        <div style="width:64px;height:64px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;">
                            <i data-lucide="trash-2" style="width:28px;height:28px;color:#ef4444;"></i>
                        </div>
                        <h3 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">Delete Sale</h3>
                        <p id="saleDeleteText" style="font-size:14px;color:#6b7280;margin:0 0 28px;line-height:1.5;"></p>
                        <div style="display:flex;gap:12px;">
                            <button id="saleDeleteCancel" style="flex:1;padding:12px;border-radius:10px;border:1px solid #e5e7eb;background:white;font-size:14px;font-weight:600;color:#374151;cursor:pointer;font-family:inherit;">Cancel</button>
                            <button id="saleDeleteConfirm" style="flex:1;padding:12px;border-radius:10px;border:none;background:#ef4444;color:white;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Delete</button>
                        </div>
                    </div>
                </div>
            `);
            
            const modal = document.getElementById('saleDeleteModal');
            document.getElementById('saleDeleteCancel').addEventListener('click', () => modal.style.display = 'none');
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
        }

        const modal = document.getElementById('saleDeleteModal');
        document.getElementById('saleDeleteText').textContent = `Are you sure you want to delete the sale for "${sale.partner}"? This action cannot be undone.`;
        
        const confirmBtn = document.getElementById('saleDeleteConfirm');
        const cleanConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.replaceWith(cleanConfirmBtn);

        cleanConfirmBtn.addEventListener('click', async () => {
            const { error } = await window._supabase.from('sales').delete().eq('id', id);
            if (!error) {
                modal.style.display = 'none';
                loadDataAndRender();
            } else {
                alert(`Delete failed: ${error.message}`);
            }
        });

        modal.style.display = 'flex';
        lucide.createIcons();
    };

    // PAGINATION GENERATION
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
            btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
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

    // FILTER TAB BINDINGS
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

    // SEARCH INPUT BOUNDARY
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.toLowerCase().trim();
            currentPage = 1;
            renderTable();
        });
    }

    // INITIAL APP COLD-START RUN
    await loadDataAndRender();
});

function buildReceiptItemRows(items, minRows) {
    let rows = items.map(item => `
      <tr>
        <td style="text-align:center;">${item.weight}</td>
        <td style="text-align:center;">kg</td>
        <td style="text-align:left; padding-left:8px;">${item.material}</td>
        <td style="text-align:center;">₱${item.rate}</td>
        <td style="text-align:center;">₱${item.subtotal.toFixed(2)}</td>
      </tr>
    `).join('');

    const emptyCount = Math.max(0, minRows - items.length);
    for (let i = 0; i < emptyCount; i++) {
        rows += `<tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>`;
    }
    return rows;
}

window.viewReceipt = function(index) {
    const data = getFilteredCollections()[index];
    if (!data) return;

    if (typeof logAction === 'function') {
        logAction(`Viewed receipt for ${data.customer}`, window.location.pathname);
    }

    const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <base href="${window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1)}">
      <title>Receipt - ${data.customer}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 30px 20px; }
        .receipt { background: white; border: 2px solid #333; padding: 30px 36px; max-width: 700px; margin: 0 auto; font-size: 12px; color: #111; }
        .receipt-header { display: flex; align-items: center; gap: 20px; padding-bottom: 16px; border-bottom: 2px solid #111; margin-bottom: 20px; }
        .receipt-header img { width: 70px; height: 70px; object-fit: contain; }
        .org-info { flex: 1; text-align: center; }
        .org-info h2 { font-size: 15px; font-weight: 800; color: #0ea5e9; text-transform: uppercase; margin-bottom: 4px; }
        .org-info p { font-size: 11px; color: #444; margin: 2px 0; }
        .org-info a { color: #0ea5e9; }
        .field-row { display: flex; gap: 30px; margin-bottom: 18px; }
        .field-item { display: flex; align-items: flex-end; gap: 6px; flex: 1; }
        .field-item label { font-size: 11px; font-weight: 700; white-space: nowrap; color: #111; }
        .field-value { flex: 1; border-bottom: 1.5px solid #111; font-size: 11px; color: #111; padding-bottom: 2px; min-height: 16px; overflow: hidden; word-break: break-all; min-width: 0; }
        table { width: 100%; border-collapse: collapse; border: 1.5px solid #111; margin-bottom: 10px; table-layout: fixed; word-break: break-word;}
        th { font-size: 11px; font-weight: 800; text-transform: uppercase; text-align: center; padding: 8px 6px; border: 1.5px solid #111; background: white; color: #111; letter-spacing: 0.3px; }
        th:nth-child(3) { text-align: left; padding-left: 8px; }
        td { font-size: 11px; padding: 10px 6px; border: 1px solid #111; text-align: center; color: #111; vertical-align: top; }
        .empty-row td { height: 30px; padding: 0; }
        .receipt-total { text-align: right; font-size: 13px; font-weight: 800; padding-top: 6px; border-top: 2px solid #111; margin-bottom: 30px; color: #111; }
        .receipt-total span { color: #46B336; font-size: 14px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 20px; }
        .sig-block { width: 45%; }
        .sig-block p { font-size: 11px; font-weight: 700; margin-bottom: 28px; }
        .sig-line { border-bottom: 1.5px solid #111; width: 100%; margin-bottom: 4px; }
        .sig-sublabel { font-size: 9px; font-weight: 600; text-align: center; color: #111; }
        .no-print { text-align: center; margin-top: 24px; }
        @media print { body { background: white; padding: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="receipt-header">
          <img src="photo/tezwa_logo.jpg" alt="Logo" onerror="this.style.display='none'">
          <div class="org-info">
            <h2>TAGUMPAY 83ZERO WASTE ASSOCIATION</h2>
            <p>South Nagtahan, Brgy. 830, Zone 90 District VI, Paco, Manila</p>
            <p>Email: <a href="mailto:tezwa.manila@gmail.com">tezwa.manila@gmail.com</a></p>
            <p>Contact No.: 0927-286-7378</p>
          </div>
        </div>
        <div class="field-row">
          <div class="field-item"><label>Cash Receipt No.</label><div class="field-value">${data.id || ''}</div></div>
          <div class="field-item"><label>Date</label><div class="field-value">${data.date || ''}</div></div>
        </div>
        <div class="field-row">
          <div class="field-item"><label>Customer</label><div class="field-value">${data.customer || ''}</div></div>
          <div class="field-item"><label>Contact No.</label><div class="field-value">${data.contact || ''}</div></div>
        </div>
        <div class="field-row">
          <div class="field-item"><label>Address</label><div class="field-value">${data.address || ''}</div></div>
          <div class="field-item"><label>Salesman</label><div class="field-value"></div></div>
        </div>
        <table>
          <thead>
            <tr><th>QTY</th><th>UNIT</th><th style="text-align:left; padding-left:8px;">DESCRIPTION</th><th>PRICE</th><th>AMOUNT</th></tr>
          </thead>
          <tbody>${buildReceiptItemRows(data.items || [], 9)}</tbody>
        </table>
        <div class="receipt-total">TOTAL: <span>₱${data.totalAmount ? data.totalAmount.toFixed(2) : '0.00'}</span></div>
        <div class="signatures">
          <div class="sig-block"><p>Received By:</p><div class="sig-line"></div><div class="sig-sublabel">Signature Over Printed Name</div></div>
          <div class="sig-block"><p>Approved By:</p><div class="sig-line"></div><div class="sig-sublabel">Signature Over Printed Name</div></div>
        </div>
      </div>
      <div class="no-print">
        <button onclick="window.print()" style="background:#46B336;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">Print Receipt</button>
        <button onclick="window.close()" style="background:#6b7280;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;margin-left:10px;">Close</button>
      </div>
    </body>
    </html>`;

    const receiptWindow = window.open('', '_blank', 'width=750,height=900');
    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
};
