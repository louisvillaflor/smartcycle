const SUPABASE_URL = 'https://nlybbvlhhdjjmqkzjnhx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tb_WPtZc6awrzrQrDvYUxQ_ndUpe-Au';
window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
window.collections = [];
window.currentItems = [];
window.currentCategory = 'School';
window.editingIndex = -1; // Consider migrating this to window.editingId as noted above
let currentPage = 1;
let currentFilter = 'all';
const itemsPerPage = 10;

// 1. INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
    loadModalHTML();
    setupSearch();
    await fetchAllCollections();
});

function refreshIcons() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// YYYY-MM-DD string to MM-DD-YYYY
function formatDateToMDY(dateString) {
    if (!dateString) return 'N/A';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString; 
    const [year, month, day] = parts;
    return `${month}-${day}-${year}`;
}    

window.loadMaterialDropdownOptions = async function() {
    const materialSelect = document.getElementById('selMaterial') || 
                           document.getElementById('inMaterial') || 
                           document.querySelector('select[name="material"]'); 
    if (!materialSelect) {
        console.warn("Material select dropdown element not found in DOM.");
        return;
    } try {
        console.log("Fetching price list categories from Supabase...");
        const { data: materials, error } = await _supabase
            .from('price_list')
            .select('id, material_name, price, unit, status');

        if (error) throw error;
        
        console.log("Raw data received from Supabase price_list:", materials);
        materialSelect.innerHTML = '<option value="" disabled selected>Select a material...</option>';

        if (!materials || materials.length === 0) {
            console.warn("The price_list table returned 0 rows. Check your Supabase RLS policies or table data.");
            materialSelect.innerHTML = '<option value="" disabled selected>No materials found (Check RLS/Data)</option>';
            return;
        }

        const activeMaterials = materials.filter(item => {
            if (!item.status) return true; 
            return item.status.toLowerCase() === 'active';
        });

        console.log("Filtered active materials to display:", activeMaterials);
        if (activeMaterials.length === 0) {
            materialSelect.innerHTML = '<option value="" disabled selected>No active materials found (Check statuses)</option>';
            return;
        }

        activeMaterials.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id; 
            option.setAttribute('data-rate', item.price);
            option.textContent = `${item.material_name} (₱${item.price}/${item.unit || 'kg'})`;
            materialSelect.appendChild(option);
        });

        console.log("Dropdown material items successfully bound to UI.");
    } catch (err) {
        console.error("Failed to load materials into UI selection dropdown:", err.message);
    }
};

// 2. DATA MANAGEMENT (FETCH)
window.fetchAllCollections = async function() {
    console.log("Fetching collections from Supabase...");
    
    const { data, error } = await _supabase
        .from('collections')
        .select(`
            *, 
            collection_items (
                *,
                price_list (
                    material_name
                )
            )
        `)
        .order('date_collected', { ascending: false })
        .order('id', { ascending: false });

    if (error) {
        console.error("Error fetching data from Supabase:", error.message);
        return;
    }

    window.collections = data.map(col => {
        const rawItems = col.collection_items || [];
        
        const mappedItems = rawItems.map(item => {
            let materialName = 'Unknown';
            
            if (item.price_list) {
                if (Array.isArray(item.price_list) && item.price_list.length > 0) {
                    materialName = item.price_list[0].material_name || 'Unknown';
                } else if (item.price_list.material_name) {
                    materialName = item.price_list.material_name;
                }
            } else if (item.material_name) {
                materialName = item.material_name;
            }
            
            return {
                material_id: item.material_id, 
                material: materialName,
                rate: parseFloat(item.rate) || 0,
                weight: parseFloat(item.weight) || 0,
                subtotal: parseFloat(item.subtotal) || 0
            };
        });

        return {
            id: col.id,
            date: formatDateToMDY(col.date_collected),
            customer: col.customer_name,
            category: col.type || 'School',
            totalAmount: mappedItems.reduce((sum, i) => sum + i.subtotal, 0),
            totalWeight: mappedItems.reduce((sum, i) => sum + i.weight, 0),
            address: col.address,
            contact: col.contact_number,
            items: mappedItems 
        };
    });

    console.log("Parsed Collections State:", window.collections);
    renderTable();
};

function getFilteredCollections() {
    if (currentFilter === 'all') return window.collections;
    return window.collections.filter(col => 
        col.category && col.category.toLowerCase() === currentFilter.toLowerCase()
    );
}

// 3. UI GENERATION & RENDERING
function loadModalHTML() {
    fetch('add_collection.html')
        .then(res => res.text())
        .then(async html => {
            document.getElementById('modalContainer').innerHTML = html;
            await window.loadMaterialDropdownOptions();

            const weightInput = document.getElementById('inWeight');
            if (weightInput) {
                weightInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem();
                    }
                });
            }

            const form = document.querySelector('#modalContainer form') || document.getElementById('collectionForm');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await saveCollection();
                });
            } else {
                const submitBtn = document.querySelector('.btn-submit-green') || document.querySelector('.btn-update');
                if (submitBtn) {
                    submitBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        await saveCollection();
                    });
                }
            }

            if (typeof setupFieldListeners === 'function') setupFieldListeners();
            refreshIcons();
        })
        .catch(() => console.log('Using fallback inline HTML modal configuration'));
}

function renderTable() {
    const tbody = document.getElementById('collectionTableBody');
    if (!tbody) return;

    const filtered = getFilteredCollections();
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const pageCollections = filtered.slice(startIdx, startIdx + itemsPerPage);

    tbody.innerHTML = '';

    if (pageCollections.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:40px; color:#94a3b8;">No collections found</td></tr>`;
        updatePagination(totalPages);
        return;
    }

    pageCollections.forEach((collection, pageIndex) => {
        const actualIndex = startIdx + pageIndex;
        const rowId = `col-${actualIndex}`;

        let materialSummary = 'N/A';
        if (collection.items && collection.items.length > 0) {
            const uniqueMaterials = [...new Set(collection.items.map(item => item.material))];
            materialSummary = uniqueMaterials.length === 1 ? uniqueMaterials[0] : `${uniqueMaterials.length} types`;
        }

        tbody.innerHTML += `
          <tr class="main-row" data-row-idx="${actualIndex}" onclick="toggleDetails('${rowId}', this)">
            <td class="chevron-cell"><i data-lucide="chevron-down" style="width:18px;"></i></td>
            <td>${collection.date}</td>
            <td><span class="id-badge">${collection.id}</span></td>
            <td style="font-weight:600;">${collection.customer}</td>
            <td><span style="color:#64748b;">${materialSummary}</span></td>
            <td style="text-align:center">${collection.totalWeight.toFixed(1)} kg</td>
            <td style="text-align:right; font-weight:700; color:#10b981;">₱${collection.totalAmount.toFixed(2)}</td>
            <td onclick="event.stopPropagation()">
              <div class="action-btns">
                <button class="icon-btn receipt-btn" onclick="viewReceipt(${actualIndex})"><i data-lucide="image"></i></button>
                <button class="icon-btn" onclick="editEntry(${actualIndex})"><i data-lucide="edit-2"></i></button>
                <button class="icon-btn delete" onclick="deleteEntry(${actualIndex})"><i data-lucide="trash-2"></i></button>
              </div>
            </td>
          </tr>
          <tr id="${rowId}" class="sub-row-container">
            <td colspan="8" style="border:none;">
              <div class="expanded-content">
                <table class="expanded-table">
                    <thead>
                        <tr>
                          <th style="text-align:center;">QTY</th>
                          <th style="text-align:center;">UNIT</th>
                          <th style="text-align:left; padding-left:0px;">DESCRIPTION</th>
                          <th style="text-align:center;">PRICE</th>
                          <th style="text-align:center;">AMOUNT</th>
                        </tr>
                      </thead>
                    <tbody>${typeof buildReceiptItemRows === 'function' ? buildReceiptItemRows(collection.items || [], 0) : ''}</tbody>
                </table>
                <div style="text-align:right; padding: 15px 25px; border-top: 1px solid #f1f5f9;">
                    <span style="font-size:13px; color:#64748b; margin-right:10px;">Total Amount:</span>
                    <span style="font-weight:700; color:#10b981;">₱${collection.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </td>
          </tr>`;
    });

    refreshIcons();
    updatePagination(totalPages);
}

function updatePagination(totalPages) {
    const pagination = document.querySelector('.pagination');
    if (!pagination) return;

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';

    let paginationHTML = `
        <button class="page-btn" onclick="changePage('prev')" aria-label="Previous page" ${currentPage === 1 ? 'disabled' : ''}>
          <i data-lucide="chevron-left"></i>
        </button>
        <button class="page-btn ${currentPage === 1 ? 'active' : ''}" onclick="goToPage(1)">1</button>
    `;

    if (currentPage > 3) {
        paginationHTML += `<span class="page-btn" style="cursor: default; border: none;">...</span>`;
    }

    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        paginationHTML += `<button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    if (currentPage < totalPages - 2) {
        paginationHTML += `<span class="page-btn" style="cursor: default; border: none;">...</span>`;
    }

    paginationHTML += `
        <button class="page-btn ${currentPage === totalPages ? 'active' : ''}" onclick="goToPage(${totalPages})">${totalPages}</button>
        <button class="page-btn" onclick="changePage('next')" aria-label="Next page" ${currentPage === totalPages ? 'disabled' : ''}>
          <i data-lucide="chevron-right"></i>
        </button>
    `;

    pagination.innerHTML = paginationHTML;
    refreshIcons();
}

// 4. INTERACTION & UTILITIES
window.goToPage = function(page) {
    currentPage = page;
    renderTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.changePage = function(direction) {
    const totalPages = Math.ceil(getFilteredCollections().length / itemsPerPage);
    if (direction === 'prev' && currentPage > 1) currentPage--;
    if (direction === 'next' && currentPage < totalPages) currentPage++;
    renderTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.toggleDetails = function(id, rowEl) {
    const subRow = document.getElementById(id);
    if (!subRow) return;

    const isOpen = subRow.classList.contains('show');
    document.querySelectorAll('.sub-row-container').forEach(r => r.classList.remove('show'));
    document.querySelectorAll('.main-row').forEach(r => r.classList.remove('open'));

    if (!isOpen) {
        subRow.classList.add('show');
        rowEl.classList.add('open');
    }
};

window.filterByCategory = function(category, btn) {
    currentFilter = category;
    currentPage = 1;
    document.querySelectorAll('.table-tabs .tab').forEach(tab => tab.classList.remove('active'));
    btn.classList.add('active');
    renderTable();
};

function setupSearch() {
    const searchInput = document.getElementById('collectionSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.main-row').forEach(row => {
            const text = row.innerText.toLowerCase();
            const actualIndex = row.getAttribute('data-row-idx');
            const subRow = document.getElementById(`col-${actualIndex}`);

            if (text.includes(searchTerm)) {
                row.style.display = '';
                if (subRow && row.classList.contains('open')) subRow.style.display = 'table-row';
            } else {
                row.style.display = 'none';
                if (subRow) subRow.style.display = 'none';
            }
        });
    });
}

if (typeof window.editingIndex === 'undefined') {
    window.editingIndex = -1;
}

window.editEntry = function(index) {
    const parsedIndex = parseInt(index, 10);
    window.editingIndex = parsedIndex;
    
    console.log(`[SmartCycle] Edit mode triggered! window.editingIndex is now:`, window.editingIndex);

    const filteredList = getFilteredCollections();
    const data = filteredList[parsedIndex]; 
    
    const modal = document.getElementById('addCollectionModal');
    if (!modal) {
        console.error("Could not find #addCollectionModal in the DOM.");
        return;
    }

    if (!data) {
        console.error(`No collection data found at index: ${parsedIndex}`);
        return;
    }

    if (document.getElementById('inCustomer')) document.getElementById('inCustomer').value = data.customer_name || data.customer || '';
    if (document.getElementById('inAddress')) document.getElementById('inAddress').value = data.address || '';
    if (document.getElementById('inContact')) document.getElementById('inContact').value = data.contact_number || data.contact || '';
    
    if (document.getElementById('inDate') && data.date_collected) {
        let dateVal = data.date_collected;
        if (dateVal.includes('-') && dateVal.split('-')[0].length !== 4) {
            const [m, d, y] = dateVal.split('-');
            dateVal = `${y}-${m}-${d}`;
        }
        document.getElementById('inDate').value = dateVal;
    }

    window.currentCategory = data.type || 'School';
    document.querySelectorAll('.m-tab').forEach(tab => {
        const isMatch = tab.innerText.trim().toLowerCase() === window.currentCategory.toLowerCase();
        tab.classList.toggle('active', isMatch);
    });

    window.currentItems = [...(data.items || [])];
    if (typeof renderItems === 'function') renderItems();

    const submitBtn = document.querySelector('.btn-submit-green');
    if (submitBtn) {
        submitBtn.innerHTML = '<i data-lucide="check"></i> Update';
    }

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    if (typeof updatePreview === 'function') updatePreview();
    if (typeof refreshIcons === 'function') setTimeout(refreshIcons, 50);
};

async function saveCollection() {
    const customer = document.getElementById('inCustomer')?.value.trim();
    const address = document.getElementById('inAddress')?.value.trim();
    const contact = document.getElementById('inContact')?.value.trim();
    const date = document.getElementById('inDate')?.value;
    const submitBtn = document.querySelector('.btn-submit-green');

    if (!customer || !date) {
        alert("Customer name and Date are required fields.");
        return;
    }

    if (window.currentItems.length === 0) {
        alert("Please add at least one item before saving.");
        return;
    }

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = window.editingIndex > -1 ? 'Updating...' : 'Saving...';
        }

        const formattedCustomer = typeof toTitleCase === 'function' ? toTitleCase(customer) : customer;
        const collectionPayload = {
            customer_name: formattedCustomer,
            address: address || 'N/A',
            contact_number: contact || 'N/A',
            date_collected: date,
            type: window.currentCategory
        };

        let targetId;

        if (window.editingIndex > -1) {
            const originalCollection = getFilteredCollections()[window.editingIndex];
            targetId = originalCollection.id;

            const { error: updateCollectionError } = await _supabase
                .from('collections')
                .update(collectionPayload)
                .eq('id', targetId);

            if (updateCollectionError) throw updateCollectionError;

            const { error: deleteItemsError } = await _supabase
                .from('collection_items')
                .delete()
                .eq('collection_id', targetId);

            if (deleteItemsError) throw deleteItemsError;

        } else {
            const displayId = typeof generateDisplayId === 'function' ? generateDisplayId('C') : 'C-' + Date.now();
            let profileId = null;

            const { data: existingProfile } = await _supabase
                .from('profiles')
                .select('id, name')
                .ilike('name', formattedCustomer)
                .maybeSingle();

            let determinedType = 'customer';
            if (window.currentCategory?.toLowerCase() === 'partner_category_name') {
                determinedType = 'partner';
            }

            if (existingProfile) {
                profileId = existingProfile.id;
                await _supabase
                    .from('profiles')
                    .update({
                        address: address || 'N/A',
                        contact_num: contact || 'N/A',
                        category: window.currentCategory || 'Walk-ins',
                        type: determinedType
                    })
                    .eq('id', profileId);
            } else {
                const { data: newProfile, error: profileError } = await _supabase
                    .from('profiles')
                    .insert([{
                        name: formattedCustomer,
                        category: window.currentCategory || 'Walk-ins',
                        address: address || 'N/A',
                        contact_num: contact || 'N/A',
                        display_id: displayId,
                        type: determinedType
                    }])
                    .select()
                    .single();

                if (profileError) throw profileError;
                profileId = newProfile.id;
            }

            collectionPayload.customer_id = profileId;

            const { data: newCollection, error: insertCollectionError } = await _supabase
                .from('collections')
                .insert([collectionPayload])
                .select()
                .single();

            if (insertCollectionError) throw insertCollectionError;
            targetId = newCollection.id;
        }

        if (window.currentItems.length > 0) {
            const itemsToInsert = window.currentItems.map(item => ({
                collection_id: targetId,
                material_id: parseInt(item.material_id || item.materialId, 10),
                rate: item.rate,
                weight: item.weight,
                subtotal: item.subtotal
            }));

            const { error: insertItemsError } = await _supabase
                .from('collection_items')
                .insert(itemsToInsert);

            if (insertItemsError) throw insertItemsError;
        }

        alert(window.editingIndex > -1 ? "Collection updated successfully!" : "Collection saved successfully!");
        
        if (typeof closeAddModal === 'function') closeAddModal(); 
        else if (typeof closeModal === 'function') closeModal();

        await fetchAllCollections();

    } catch (err) {
        console.error("Database mutation error:", err);
        alert("Failed to save collection updates: " + err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="check"></i> Submit';
            if (typeof refreshIcons === 'function') refreshIcons();
        }
    }
}

function closeModal() {
    const modal = document.getElementById('addCollectionModal');
    if (modal) modal.classList.remove('show');
    document.body.style.overflow = '';
    
    window.editingIndex = -1;
    window.currentItems = [];
    const submitBtn = document.querySelector('.btn-submit-green');
    if (submitBtn) submitBtn.innerHTML = '<i data-lucide="plus"></i> Submit';
}

window.deleteEntry = function(index) {
    const filteredList = getFilteredCollections();
    const collection = filteredList[index];
    if (!collection) return;

    if (!document.getElementById('deleteConfirmModal')) {
        const modalHTML = `
          <div id="deleteConfirmModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:3000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
            <div style="background:white; border-radius:20px; padding:36px 32px 28px; width:360px; max-width:90vw; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.2);">
              <div style="width:64px; height:64px; background:#fef2f2; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 18px;">
                <i data-lucide="trash-2" style="width:28px;height:28px;color:#ef4444;"></i>
              </div>
              <h3 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">Delete Collection</h3>
              <p id="deleteConfirmText" style="font-size:14px;color:#6b7280;margin:0 0 28px;line-height:1.5;"></p>
              <div style="display:flex;gap:12px;">
                <button id="deleteCancelBtn" style="flex:1; padding:12px; border-radius:10px; border:1px solid #e5e7eb; background:white; font-size:14px; font-weight:600; color:#374151; cursor:pointer; font-family:inherit;">Cancel</button>
                <button id="deleteConfirmBtn" style="flex:1; padding:12px; border-radius:10px; border:none; background:#ef4444; color:white; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit;">Delete</button>
              </div>
            </div>
          </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        refreshIcons();
    }

    const modal = document.getElementById('deleteConfirmModal');
    document.getElementById('deleteConfirmText').textContent = `Are you sure you want to delete the collection for "${collection.customer}"? This action cannot be undone.`;
    modal.style.display = 'flex';

    const confirmBtn = document.getElementById('deleteConfirmBtn');
    const cancelBtn = document.getElementById('deleteCancelBtn');
    
    confirmBtn.onclick = async () => {
        try {
            const { error: itemsDeleteError } = await _supabase
                .from('collection_items')
                .delete()
                .eq('collection_id', collection.id);
    
            if (itemsDeleteError) throw itemsDeleteError;
    
            const { error: collectionDeleteError } = await _supabase
                .from('collections')
                .delete()
                .eq('id', collection.id);
                
            if (collectionDeleteError) throw collectionDeleteError;
    
            window.collections = window.collections.filter(c => c.id !== collection.id);
            renderTable();
            
            modal.style.display = 'none';
            alert("Collection deleted successfully.");
        } catch (err) {
            console.error("Deletion lifecycle failure:", err);
            alert("Error deleting record: " + err.message);
        }
    };

    cancelBtn.onclick = () => modal.style.display = 'none';
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
};
