// Add these to the top of profiles.js if not already present
const SUPABASE_URL = 'https://nlybbvlhhdjjmqkzjnhx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tb_WPtZc6awrzrQrDvYUxQ_ndUpe-Au';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 1. FETCH PROFILES FROM DATABASE
async function fetchProfilesFromSupabase() {
    const { data, error } = await _supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching profiles:", error.message);
        return;
    }

    // Clear current table and contacts array
    const tableBody = document.getElementById('contactsTableBody');
    tableBody.innerHTML = '';
    contacts = data; 

    // 2. RENDER EACH PROFILE
    data.forEach(profile => {
        // Map database fields to your existing UI structure
        const contactObj = {
            id: profile.id,
            name: profile.name,
            address: profile.address || 'N/A',
            contactNumber: profile.contact_num || 'N/A',
            category: (profile.type || 'walk-ins').toLowerCase(),
            displayCategory: profile.type || 'Walk-ins',
            avatarColor: getRandomColor()
        };
        addContactToTable(contactObj);
    });
}

// 3. INITIALIZE ON LOAD
document.addEventListener('DOMContentLoaded', () => {
    fetchProfilesFromSupabase(); // Call Supabase instead of LocalStorage
    initializeTabSwitching();
    initializeSearch();
});

// Initialize Lucide icons
lucide.createIcons();

let currentTab = 'all';
let contacts = [];
let nextId = 1;

// Get category display name
function getCategoryDisplayName(category) {
    const categoryMap = {
        'walk-ins': 'Walk-ins',
        'school': 'School',
        'junkshop': 'Junkshop',
        'organization': 'Organization'
    };
    return categoryMap[category] || category;
}

// Generate random color for avatar
function getRandomColor() {
    const colors = ['#4CAF50', '#FF9800', '#2196F3', '#9C27B0', '#F44336', '#00BCD4', '#FF5722', '#8BC34A'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Add contact to table
function addContactToTable(contact) {
    const tableBody = document.getElementById('contactsTableBody');

    const emptyRow = tableBody.querySelector('.empty-state-row');
    if (emptyRow) emptyRow.remove();

    const row = document.createElement('tr');
    row.setAttribute('data-category', contact.category);
    row.setAttribute('data-id', contact.id);

    row.innerHTML = `
        <td>
            <div class="customer-cell">
                <div class="customer-avatar" style="background-color: ${contact.avatarColor};">
                    <i data-lucide="user" style="width: 16px; height: 16px;"></i>
                </div>
                <span>${contact.name}</span>
            </div>
        </td>
        <td>${contact.displayCategory}</td>
        <td>${contact.id}</td>
        <td>${contact.address}</td>
        <td>${contact.contactNumber}</td>
        <td>
            <div class="action-buttons">
                <button class="action-btn edit-btn" title="Edit">
                    <i data-lucide="pencil"></i>
                </button>
                <button class="action-btn delete-btn" title="Delete">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </td>
    `;

    // Delete
    row.querySelector('.delete-btn').addEventListener('click', function() {
        if (confirm(`Are you sure you want to delete ${contact.name}?`)) {
            contacts = contacts.filter(c => c.id !== contact.id);
            localStorage.setItem('smartCycleContacts', JSON.stringify(contacts));
            row.remove();
            checkEmptyState();
        }
    });

    // Edit — placeholder
    row.querySelector('.edit-btn').addEventListener('click', function() {
        alert(`Edit functionality for ${contact.name} - To be implemented`);
    });

    tableBody.appendChild(row);
    lucide.createIcons();
    filterContacts(currentTab);
}

// Check if table is empty and show message
function checkEmptyState() {
    const tableBody = document.getElementById('contactsTableBody');
    const visibleRows = Array.from(tableBody.querySelectorAll('tr')).filter(
        row => row.style.display !== 'none' && !row.classList.contains('empty-state-row')
    );

    if (visibleRows.length === 0 && !tableBody.querySelector('.empty-state-row')) {
        const emptyRow = document.createElement('tr');
        emptyRow.className = 'empty-state-row';
        emptyRow.innerHTML = `
            <td colspan="6" class="empty-state">
                <i data-lucide="inbox"></i>
                <p>No profiles found</p>
            </td>
        `;
        tableBody.appendChild(emptyRow);
        lucide.createIcons();
    } else if (visibleRows.length > 0) {
        const emptyRow = tableBody.querySelector('.empty-state-row');
        if (emptyRow) emptyRow.remove();
    }
}

// Initialize tab switching
function initializeTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-btn');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });

            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            currentTab = this.getAttribute('data-tab');
            filterContacts(currentTab);
        });
    });
}

// Filter contacts based on selected tab
function filterContacts(tab) {
    const tableBody = document.getElementById('contactsTableBody');
    const rows = tableBody.querySelectorAll('tr:not(.empty-state-row)');

    rows.forEach(row => {
        const category = row.getAttribute('data-category');

        if (tab === 'all') {
            row.style.display = '';
        } else if (tab === 'collections') {
            row.style.display = ['walk-ins', 'school', 'organization'].includes(category) ? '' : 'none';
        } else if (tab === 'sales') {
            row.style.display = category === 'junkshop' ? '' : 'none';
        }
    });

    checkEmptyState();
}

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const tableBody = document.getElementById('contactsTableBody');
        const rows = tableBody.querySelectorAll('tr:not(.empty-state-row)');

        rows.forEach(row => {
            const name = row.querySelector('.customer-cell span')?.textContent.toLowerCase() || '';
            const id   = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || '';
            const category = row.getAttribute('data-category');

            const matchesSearch = name.includes(searchTerm) || id.includes(searchTerm);
            const matchesTab = currentTab === 'all' ||
                (currentTab === 'collections' && ['walk-ins', 'school', 'organization'].includes(category)) ||
                (currentTab === 'sales' && category === 'junkshop');

            row.style.display = (matchesSearch && matchesTab) ? '' : 'none';
        });

        checkEmptyState();
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    const savedContacts = localStorage.getItem('smartCycleContacts');

    if (savedContacts) {
        try {
            contacts = JSON.parse(savedContacts);

            if (contacts.length > 0) {
                const ids = contacts.map(c => parseInt(c.id)).filter(id => !isNaN(id));
                if (ids.length > 0) nextId = Math.max(...ids) + 1;
            }

            contacts.forEach(contact => addContactToTable(contact));
        } catch (e) {
            console.error('Error parsing saved contacts:', e);
            contacts = [];
        }
    }

    initializeTabSwitching();
    initializeSearch();
    checkEmptyState();
});
