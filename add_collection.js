/**
 * SmartCycle - Collection Management Engine
 * Handles modal workflows, validation, receipt preview, and Supabase integration.
 */

// Global tracking variables securely bound to module scope
let editingIndex = -1;
let currentCategory = 'School';
let loadedPricesCache = [];
window.currentItems = []; 

// UTILITY FUNCTIONS
const generateDisplayId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

const formatContact = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 4) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7, 11)}`;
};

const validateContact = (value) => {
    if (!value) return true;
    return /^09\d{9}$/.test(value.replace(/[-\s]/g, ''));
};

// FORM VALIDATION ENGINE
function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    field.classList.add('input-error');
    let errEl = field.parentElement.querySelector('.field-error');
    if (!errEl) {
        errEl = document.createElement('span');
        errEl.className = 'field-error';
        field.parentElement.appendChild(errEl);
    }
    errEl.textContent = message;
}

function clearError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    field.classList.remove('input-error');
    const errEl = field.parentElement.querySelector('.field-error');
    if (errEl) errEl.textContent = '';
}

function clearAllErrors() {
    ['inCustomer', 'inDate', 'inAddress', 'inContact', 'inWeight'].forEach(clearError);
    const itemsErr = document.getElementById('itemsError');
    if (itemsErr) itemsErr.textContent = '';
}

// MODAL CONTROLLERS
window.openAddModal = async () => {
    const modal = document.getElementById('addCollectionModal');
    if (!modal) return;

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    editingIndex = -1;
    resetForm();

    await loadActivePrices();

    const dateField = document.getElementById('inDate');
    if (dateField) dateField.value = new Date().toISOString().split('T')[0];
    
    updatePreview();
    setTimeout(refreshIcons, 100);
};

window.openEditModal = async (index, collectionHeader, detailedItems) => {
    const modal = document.getElementById('addCollectionModal');
    if (!modal) return;

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    editingIndex = index;
    clearAllErrors();

    await loadActivePrices();

    // Sync Category Tab state
    currentCategory = collectionHeader.type || 'School';
    document.querySelectorAll('.m-tab').forEach(tab => {
        const tabCategory = tab.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        tab.classList.toggle('active', tabCategory === currentCategory);
    });

    // Populate Fields safely
    if (document.getElementById('inCustomer')) document.getElementById('inCustomer').value = collectionHeader.customer_name || '';
    if (document.getElementById('inDate')) document.getElementById('inDate').value = collectionHeader.date_collected || '';
    if (document.getElementById('inAddress')) document.getElementById('inAddress').value = collectionHeader.address || '';
    if (document.getElementById('inContact')) document.getElementById('inContact').value = collectionHeader.contact_number || '';

    // Parse array with structural name mapping corrections
    window.currentItems = (detailedItems || []).map(item => {
        const targetMaterialId = parseInt(item.material_id, 10);
        const cachedItem = loadedPricesCache.find(p => parseInt(p.id, 10) === targetMaterialId);
        const finalName = item.material_name || item.material || (cachedItem ? cachedItem.material_name : 'Unknown Material');

        return {
            materialId: targetMaterialId,
            material_name: finalName, 
            rate: Number(item.rate || (cachedItem ? cachedItem.price : 0)),
            weight: Number(item.weight || 0),
            subtotal: Number(item.subtotal || (item.rate * item.weight) || 0)
        };
    });

    // Mutate action button UI text to edit layout style context
    const submitBtn = document.querySelector('.btn-submit-green');
    if (submitBtn) {
        submitBtn.onclick = () => submitCollection();
        submitBtn.innerHTML = '<i data-lucide="check"></i> Update Entry';
    }

    updatePreview();
    renderItems();
    setTimeout(refreshIcons, 100);
};

window.closeAddModal = () => {
    const modal = document.getElementById('addCollectionModal');
    if (!modal) return;

    modal.classList.remove('remove');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    resetForm();
};

document.addEventListener('click', (e) => {
    const modal = document.getElementById('addCollectionModal');
    if (modal && e.target === modal) closeAddModal();
});

// BASE DATA INGESTION ENGINE
async function loadActivePrices() {
    const selMaterial = document.getElementById('selMaterial');
    if (!selMaterial) return;

    try {
        const { data: prices, error } = await _supabase
            .from('price_list')
            .select('id, material_name, price')
            .eq('status', 'Active'); 

        if (error) throw error;

        if (prices && prices.length > 0) {
            loadedPricesCache = prices;
            selMaterial.innerHTML = prices.map((item, idx) => {
                const rate = Math.round(item.price); 
                return `<option value="${item.id}" data-name="${item.material_name}" data-rate="${rate}" ${idx === 0 ? 'selected' : ''}>
                    ${item.material_name} - ₱${rate}/kg
                </option>`;
            }).join('');
            return;
        }
        throw new Error("No active database records found");
    } catch (err) {
        console.warn("Falling back to local default price lists:", err.message);
        loadedPricesCache = [
            { id: 1, material_name: "Plastic", price: 3 },
            { id: 2, material_name: "Bakal", price: 15 },
            { id: 3, material_name: "PET-Assorted", price: 5 },
            { id: 4, material_name: "Paper Assorted", price: 8 },
            { id: 5, material_name: "Yero", price: 8 }
        ];
        selMaterial.innerHTML = loadedPricesCache.map((item, idx) => `
            <option value="${item.id}" data-name="${item.material_name}" data-rate="${item.price}" ${idx === 0 ? 'selected' : ''}>
                ${item.material_name} - ₱${item.price}/kg
            </option>
        `).join('');
    }
}

// FORM PRESENTATION CONTROLLER
window.setCategory = (category, btn) => {
    currentCategory = category;
    document.querySelectorAll('.m-tab').forEach(tab => tab.classList.remove('active'));
    btn.classList.add('active');
    updatePreview();
};

window.updatePreview = function() {
    const customer = document.getElementById('inCustomer')?.value || '---';
    const date = document.getElementById('inDate')?.value || '---';
    const address = document.getElementById('inAddress')?.value || '---';
    const contact = document.getElementById('inContact')?.value || '---';

    let formattedDate = date;
    if (date !== '---') {
        formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    const updates = { preCustomer: customer, preDate: formattedDate, preAddress: address, preContact: contact };
    Object.entries(updates).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.innerText = value;
    });
};

function resetForm() {
    ['inCustomer', 'inDate', 'inAddress', 'inContact', 'inWeight'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    clearAllErrors();
    window.currentItems = []; 
    renderItems();

    currentCategory = 'School';
    document.querySelectorAll('.m-tab').forEach((tab, idx) => tab.classList.toggle('active', idx === 0));

    const submitBtn = document.querySelector('.btn-submit-green');
    if (submitBtn) {
        submitBtn.onclick = () => submitCollection();
        submitBtn.innerHTML = '<i data-lucide="check"></i> Submit';
    }

    const previewFields = { preCustomer: '---', preDate: '---', preAddress: '---', preContact: '---', preTotal: '₱0.00' };
    Object.entries(previewFields).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.innerText = value;
    });

    refreshIcons();
}

// RECEIPT LINE ITEMS CONTROLLER
window.addItem = function() {
    const sel = document.getElementById('selMaterial');
    const weightInput = document.getElementById('inWeight');
    if (!sel || !weightInput) return;

    const weight = Number(weightInput.value);
    const selectedOption = sel.selectedOptions[0];
    const rate = Number(selectedOption?.dataset.rate || 0);
    const materialId = parseInt(sel.value, 10); 
    const materialName = selectedOption?.dataset.name || '';

    if (isNaN(materialId)) {
        alert("Please select a valid material collection type.");
        return;
    }

    if (!weight || weight <= 0 || weight > 10000) {
        showError('inWeight', weight > 10000 ? 'Invalid weight. Enter a value between 1 and 10,000.' : 'Please enter a valid weight');
        weightInput.focus();
        return;
    }

    clearError('inWeight');
    const itemsErr = document.getElementById('itemsError');
    if (itemsErr) itemsErr.textContent = '';

    window.currentItems.push({ 
        materialId,
        material_name: materialName,
        rate, 
        weight, 
        subtotal: rate * weight 
    });
    
    weightInput.value = '';
    weightInput.focus();
    renderItems();
};

window.removeItem = (index) => {
    window.currentItems.splice(index, 1);
    renderItems();
};

function renderItems() {
    const itemsBody = document.getElementById('itemsBody');
    const preItemsBody = document.getElementById('preItemsBody');
    const formTotalLine = document.getElementById('formTotalLine');
    if (!itemsBody || !preItemsBody) return;

    let total = 0;
    let mainRowsHtml = '';
    let previewRowsHtml = '';

    if (window.currentItems.length === 0) {
        itemsBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #94a3b8; padding: 20px;">No items added yet</td></tr>';
        preItemsBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #94a3b8; padding: 20px;">No items</td></tr>';
        if (formTotalLine) formTotalLine.style.display = 'none';
    } else {
        window.currentItems.forEach((item, index) => {
            total += item.subtotal;
            mainRowsHtml += `
                <tr>
                  <td>${item.material_name}</td>
                  <td>₱${item.rate}</td>
                  <td>${item.weight} kg</td>
                  <td><strong>₱${item.subtotal.toFixed(2)}</strong></td>
                  <td>
                    <button class="remove-item-btn" onclick="removeItem(${index})" title="Remove item">
                      <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                  </td>
                </tr>`;

            previewRowsHtml += `
                <tr>
                  <td style="text-align:center;">${item.weight}</td>
                  <td style="text-align:center;">kg</td>
                  <td style="text-align:left;">${item.material_name}</td>
                  <td style="text-align:center;">₱${item.rate}</td>
                  <td style="text-align:center;">₱${item.subtotal.toFixed(2)}</td>
                </tr>`;
        });

        itemsBody.innerHTML = mainRowsHtml;
        preItemsBody.innerHTML = previewRowsHtml;

        if (formTotalLine) {
            formTotalLine.style.display = 'flex';
            const formTotalEl = document.getElementById('formTotal');
            if (formTotalEl) formTotalEl.innerText = `₱${total.toFixed(2)}`;
        }
    }

    const emptyRowsNeeded = Math.max(0, 8 - window.currentItems.length);
    for (let i = 0; i < emptyRowsNeeded; i++) {
        preItemsBody.innerHTML += '<tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>';
    }

    const preTotalEl = document.getElementById('preTotal');
    if (preTotalEl) preTotalEl.innerText = `₱${total.toFixed(2)}`;

    refreshIcons();
}

// PERSISTENCE SYNC ENGINE
window.submitCollection = async function() {
    const customer = document.getElementById('inCustomer')?.value.trim();
    const date = document.getElementById('inDate')?.value;
    const address = document.getElementById('inAddress')?.value.trim();
    const contact = document.getElementById('inContact')?.value.trim();
    const submitBtn = document.querySelector('.btn-submit-green');

    clearAllErrors();
    let hasError = false;

    if (!customer) { showError('inCustomer', 'Customer name is required'); hasError = true; }
    if (!date) { showError('inDate', 'Date is required'); hasError = true; }
    if (contact && !validateContact(contact)) { showError('inContact', 'Use format: 09XX-XXX-XXXX'); hasError = true; }
    
    if (window.currentItems.length === 0) {
        const itemsErr = document.getElementById('itemsError');
        if (itemsErr) itemsErr.textContent = 'Please add at least one item';
        hasError = true;
    }
    if (hasError) return;

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = editingIndex !== -1 ? 'Updating...' : 'Saving...';
        }

        const collectionPayload = { 
            customer_name: customer, 
            date_collected: date, 
            address: address || 'N/A', 
            contact_number: contact || 'N/A', 
            type: currentCategory 
        };

        if (editingIndex !== -1) {
            // --- UPDATE EXISTING RECORD ---
            const targetedCollection = (typeof getFilteredCollections === 'function') 
                ? getFilteredCollections()[editingIndex] 
                : window.collections[editingIndex];

            if (!targetedCollection?.id) throw new Error("Unable to identify targeted collection ID context.");
            const targetId = targetedCollection.id;

            const { error: headerUpdateError } = await _supabase.from('collections').update(collectionPayload).eq('id', targetId);
            if (headerUpdateError) throw headerUpdateError;

            const { error: itemsClearError } = await _supabase.from('collection_items').delete().eq('collection_id', targetId);
            if (itemsClearError) throw itemsClearError;
            
            const itemsToInsert = window.currentItems.map(item => ({
                collection_id: targetId,
                material_id: item.materialId, 
                rate: item.rate,
                weight: item.weight,
                subtotal: item.subtotal
            }));
        
            const { error: itemsInsertError } = await _supabase.from('collection_items').insert(itemsToInsert);
            if (itemsInsertError) throw itemsInsertError;
            
            alert("Collection entry updated successfully!");
        } else {
            // --- INSERT NEW RECORD ---
            const displayId = generateDisplayId('C');
            const formattedCustomer = toTitleCase(customer); 
            collectionPayload.customer_name = formattedCustomer; 

            // Standard core profiles matching structural classifications
            const matchedOrgTypes = ['school', 'organization', 'junkshop', 'barangay'];
            const determinedType = matchedOrgTypes.includes(currentCategory.toLowerCase()) ? 'customer' : 'walk-in';

            let profileId = null;
            const { data: existingProfile } = await _supabase
                .from('profiles')
                .select('id, name, address, contact_num')
                .ilike('name', formattedCustomer)
                .maybeSingle();

            if (existingProfile) {
                profileId = existingProfile.id;
                await _supabase.from('profiles').update({
                    name: formattedCustomer,
                    category: currentCategory || 'Walk-ins',
                    address: address || existingProfile.address || 'N/A',
                    contact_num: contact || existingProfile.contact_num || 'N/A',
                    type: determinedType
                }).eq('id', profileId);
            } else {
                const { data: newProfile, error: profileError } = await _supabase
                    .from('profiles')
                    .insert([{
                        name: formattedCustomer,          
                        category: currentCategory || 'Walk-ins', 
                        address: address || 'N/A',                
                        contact_num: contact || 'N/A',            
                        display_id: displayId,
                        type: determinedType                     
                    }])
                    .select().single();
            
                if (profileError) throw profileError;
                profileId = newProfile.id;
            }
            
            collectionPayload.customer_id = profileId;
            
            const { data: headerData, error: headerError } = await _supabase
                .from('collections')
                .insert([collectionPayload])
                .select().single();
            
            if (headerError) throw headerError;
            
            const itemsToInsert = window.currentItems.map(item => ({
                collection_id: headerData.id,
                material_id: item.materialId, 
                rate: item.rate,
                weight: item.weight,
                subtotal: item.subtotal
            }));
            
            const { error: itemsError } = await _supabase.from('collection_items').insert(itemsToInsert);
            if (itemsError) throw itemsError;

            alert("Collection entry created successfully!");
        }

        closeAddModal();
        if (typeof fetchAllCollections === 'function') await fetchAllCollections();

    } catch (err) {
        console.error("Database Transaction Error:", err.message);
        alert("Failed to save: " + err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="check"></i> Submit';
            refreshIcons();
        }
    }
};

// ACTIONS & STRUCTURAL LAYOUT LISTENERS
window.setupFieldListeners = function() {
    const inCustomer = document.getElementById('inCustomer');
    if (inCustomer) {
        inCustomer.addEventListener('input', () => { 
            updatePreview();
            if (inCustomer.value.trim()) clearError('inCustomer'); 
        });
        inCustomer.addEventListener('blur', () => {
            const val = inCustomer.value.trim();
            if (!val) showError('inCustomer', 'Customer name is required');
            else if (val.length > 100) showError('inCustomer', 'Max 100 characters');
        });
    }

    const inDate = document.getElementById('inDate');
    if (inDate) {
        inDate.addEventListener('change', () => { 
            updatePreview();
            if (inDate.value) clearError('inDate'); else showError('inDate', 'Date is required'); 
        });
    }

    const inContact = document.getElementById('inContact');
    if (inContact) {
        inContact.addEventListener('input', () => {
            inContact.value = formatContact(inContact.value.replace(/[^\d]/g, '').slice(0, 11));
            updatePreview();
            clearError('inContact');
        });
    }

    const inWeight = document.getElementById('inWeight');
    if (inWeight) {
        inWeight.addEventListener('input', () => clearError('inWeight'));
    }
};

window.togglePreview = function() {
    const left = document.querySelector('.modal-left');
    const right = document.querySelector('.modal-right');
    if (!left || !right) return;
    
    right.classList.add('show-preview');
    left.style.display = 'none';
    refreshIcons();
};

window.closePreview = function() {
    const left = document.querySelector('.modal-left');
    const right = document.querySelector('.modal-right');
    if (!left || !right) return;

    right.classList.remove('show-preview');
    left.style.display = 'block';
    refreshIcons();
};
