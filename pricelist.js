document.addEventListener('DOMContentLoaded', () => {

    let editRow = null;
    let currentSearch = '';

    const addItemBtn        = document.getElementById('addItemBtn');
    const modalOverlay      = document.getElementById('itemModalOverlay');
    const cancelBtn         = document.getElementById('cancelBtn');
    const saveBtn           = document.getElementById('saveBtn');
    const modalTitle        = document.getElementById('modalTitle');
    const materialNameInput = document.getElementById('materialName');
    const unitSelect        = document.getElementById('unit');
    const priceInput        = document.getElementById('itemPrice');
    const searchInput       = document.getElementById('priceSearch');

    // OPEN MODAL
    function openModal(isEdit = false) {
        if (isEdit) {
            modalTitle.textContent = 'Edit Item';
            saveBtn.innerHTML = '<i data-lucide="check" style="width:15px;height:15px;"></i> Save Changes';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } else {
            modalTitle.textContent = 'Add New Material';
            saveBtn.innerHTML = '<i data-lucide="check" style="width:15px;height:15px;"></i> Add Item';
            if (typeof lucide !== 'undefined') lucide.createIcons();
            editRow                 = null;
            materialNameInput.value = '';
            unitSelect.value        = 'per kg';
            priceInput.value        = '';
        }
        modalOverlay.style.display         = 'flex';
        modalOverlay.style.alignItems      = 'center';
        modalOverlay.style.justifyContent  = 'center';
        modalOverlay.setAttribute('aria-hidden', 'false');
        setTimeout(() => materialNameInput.focus(), 50);
    }

    // CLOSE MODAL
    function closeModal() {
        modalOverlay.style.display = 'none';
        modalOverlay.setAttribute('aria-hidden', 'true');
        editRow                 = null;
        materialNameInput.value = '';
        unitSelect.value        = 'per kg';
        priceInput.value        = '';
        clearAllFieldErrors();
    }

    addItemBtn?.addEventListener('click', () => openModal(false));
    cancelBtn?.addEventListener('click', closeModal);

    // Close on backdrop click
    modalOverlay?.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.style.display === 'flex') closeModal();
    });

    // INLINE VALIDATION HELPERS
    function showFieldError(input, message) {
        input.style.borderColor = '#d25353';
        input.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.1)';
        let err = input.parentElement.querySelector('.field-error');
        if (!err) {
            err = document.createElement('span');
            err.className = 'field-error';
            err.style.cssText = 'display:block;font-size:11px;color:#d25353;margin-top:4px;font-weight:500;';
            input.parentElement.appendChild(err);
        }
        err.textContent = message;
    }

    function clearFieldError(input) {
        input.style.borderColor = '';
        input.style.boxShadow = '';
        const err = input.parentElement.querySelector('.field-error');
        if (err) err.textContent = '';
    }

    function clearAllFieldErrors() {
        [materialNameInput, priceInput].forEach(clearFieldError);
    }

    // Clear errors on input
    materialNameInput?.addEventListener('input', () => clearFieldError(materialNameInput));
    priceInput?.addEventListener('input', () => clearFieldError(priceInput));

    // SAVE
    saveBtn?.addEventListener('click', () => {
        const material = materialNameInput.value.trim();
        const unit     = unitSelect.value;
        const price    = priceInput.value.trim();

        clearAllFieldErrors();
        let hasError = false;

        if (!material) {
            showFieldError(materialNameInput, 'Material name is required.');
            hasError = true;
        }
        if (!price) {
            showFieldError(priceInput, 'Price is required.');
            hasError = true;
        } else if (parseFloat(price) < 0) {
            showFieldError(priceInput, 'Price must be a positive number.');
            hasError = true;
        }
        if (hasError) return;

        const formattedPrice = parseFloat(price).toFixed(2);

        if (editRow) {
            editRow.cells[0].textContent = material;
            editRow.cells[1].textContent = unit;
            editRow.cells[2].textContent = '₱' + formattedPrice;
            editRow.querySelector('.edit-btn').setAttribute('aria-label', 'Edit ' + material);
            editRow.querySelector('.delete-btn').setAttribute('aria-label', 'Delete ' + material);
        } else {
            renderRow(material, unit, formattedPrice);
        }

        saveToLocalStorage();
        closeModal();
        checkEmptyState();
    });

    // RENDER ROW
    function renderRow(material, unit, price) {
        const tableBody = document.getElementById('priceTableBody');
        const row       = document.createElement('tr');

        row.innerHTML = `
            <td>${material}</td>
            <td>${unit}</td>
            <td>₱${price}</td>
            <td><span class="status active">Active</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" type="button" aria-label="Edit ${material}">
                        <i data-lucide="edit-2" aria-hidden="true"></i>
                    </button>
                    <button class="action-btn delete-btn" type="button" aria-label="Delete ${material}">
                        <i data-lucide="trash-2" aria-hidden="true"></i>
                    </button>
                </div>
            </td>
        `;

        row.querySelector('.edit-btn').addEventListener('click', () => editItem(row));
        row.querySelector('.delete-btn').addEventListener('click', () => deleteItem(row));

        tableBody.appendChild(row);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // EDIT
    function editItem(row) {
        editRow                 = row;
        materialNameInput.value = row.cells[0].textContent;
        unitSelect.value        = row.cells[1].textContent;
        priceInput.value        = row.cells[2].textContent.replace('₱', '');
        openModal(true);
    }

    // DELETE CONFIRMATION MODAL
    function showDeleteConfirm(name, onConfirm) {
        let overlay = document.getElementById('deleteConfirmOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'deleteConfirmOverlay';
            overlay.className = 'delete-confirm-overlay';
            overlay.innerHTML = `
                <div class="delete-confirm-box">
                    <div class="delete-confirm-icon">
                        <i data-lucide="trash-2"></i>
                    </div>
                    <h2 class="delete-confirm-title">Delete Item</h2>
                    <p class="delete-confirm-msg" id="deleteConfirmMsg"></p>
                    <div class="delete-confirm-actions">
                        <button class="btn-confirm-cancel" id="deleteConfirmCancel">Cancel</button>
                        <button class="btn-confirm-delete" id="deleteConfirmOk">Delete</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        document.getElementById('deleteConfirmMsg').textContent =
            `Are you sure you want to delete "${name}"? This action cannot be undone.`;

        overlay.classList.add('open');
        if (typeof lucide !== 'undefined') lucide.createIcons();

        const cancelBtn = document.getElementById('deleteConfirmCancel');
        const okBtn = document.getElementById('deleteConfirmOk');

        function close() {
            overlay.classList.remove('open');
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));
            okBtn.replaceWith(okBtn.cloneNode(true));
        }

        document.getElementById('deleteConfirmCancel').addEventListener('click', close);
        document.getElementById('deleteConfirmOk').addEventListener('click', () => {
            close();
            onConfirm();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
    }

    // DELETE
    function deleteItem(row) {
        const name = row.cells[0].textContent;
        showDeleteConfirm(name, () => {
            row.remove();
            saveToLocalStorage();
            checkEmptyState();
        });
    }

    // ITEM COUNT
    function updateItemCount() {
        const countEl = document.getElementById('itemCount');
        if (!countEl) return;
        const total = document.querySelectorAll('#priceTableBody tr').length;
        countEl.textContent = total === 1 ? '1 material' : `${total} materials`;
    }

    // EMPTY STATE
    function checkEmptyState() {
        const tbody = document.getElementById('priceTableBody');
        const empty = document.getElementById('emptyState');
        if (!empty) return;
        empty.style.display = tbody.children.length === 0 ? 'flex' : 'none';
        updateItemCount();
    }

    // LOCALSTORAGE
    function saveToLocalStorage() {
        const rows = [];
        document.querySelectorAll('#priceTableBody tr').forEach(tr => {
            rows.push({
                material: tr.cells[0].textContent,
                unit:     tr.cells[1].textContent,
                price:    tr.cells[2].textContent.replace('₱', '')
            });
        });
        localStorage.setItem('smartCyclePrices', JSON.stringify(rows));
    }

    function loadFromLocalStorage() {
        const saved = localStorage.getItem('smartCyclePrices');
        if (saved) {
            try {
                const rows = JSON.parse(saved);
                rows.forEach(item => renderRow(item.material, item.unit, item.price));
            } catch (e) {
                console.error('Error loading price list:', e);
            }
        }
        checkEmptyState();
    }

    // SEARCH
    function applySearch() {
        const rows = document.querySelectorAll('#priceTableBody tr');
        let visibleCount = 0;
        rows.forEach(row => {
            const text = row.cells[0].textContent.toLowerCase();
            const match = !currentSearch || text.includes(currentSearch);
            row.style.display = match ? '' : 'none';
            if (match) visibleCount++;
        });
        const empty = document.getElementById('emptyState');
        if (empty) {
            const totalRows = document.querySelectorAll('#priceTableBody tr').length;
            empty.style.display = (totalRows === 0 || (currentSearch && visibleCount === 0)) ? 'flex' : 'none';
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.toLowerCase().trim();
            applySearch();
        });
    }

    loadFromLocalStorage();
    if (typeof lucide !== 'undefined') lucide.createIcons();
});