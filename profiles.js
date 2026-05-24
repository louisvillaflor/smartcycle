// --- 1. CONFIGURATION ---
const SUPABASE_URL = 'https://nlybbvlhhdjjmqkzjnhx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tb_WPtZc6awrzrQrDvYUxQ_ndUpe-Au';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentTab = 'all';
let contacts = [];
// Initialize Lucide icons
lucide.createIcons();
let nextId = 1;

// 1. FETCH PROFILES AND ENRICH WITH TRANSACTION DATA
async function fetchProfilesFromSupabase() {
    const tableBody = document.getElementById('contactsTableBody');
    tableBody.innerHTML = '';
    
    // Step A: Fetch your core profiles, collections, and sales records concurrently
    const [profilesRes, collectionsRes, salesRes] = await Promise.all([
        _supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        _supabase.from('collections').select('customer_name, contact_number, address, type'), // Added type
        _supabase.from('sales').select('partner, contact, address, type') // Added type
    ]);

    if (profilesRes.error) {
        console.error("Error fetching profiles:", profilesRes.error.message);
        checkEmptyState();
        return;
    }

    const profilesData = profilesRes.data || [];
    const collectionsData = collectionsRes.data || [];
    const salesData = salesRes.data || [];

    contacts = profilesData; 
    
    if (profilesData.length === 0) {
        checkEmptyState();
        return;
    }

    // Step B: Render each profile, with backfilled lookups
    profilesData.forEach(profile => {
        // Find matches across both operational tables
        const collectionMatch = collectionsData.find(c => c.customer_name === profile.name);
        const salesMatch = salesData.find(s => s.partner === profile.name);

        // Step C: Fallback lookup logic if profile table fields are empty/NULL
        let derivedAddress = profile.address;
        let derivedContact = profile.contact_num;
        let derivedCategory = profile.category; // Track category dynamically

        // --- INDEPENDENT CONTACT BACKFILL ---
        if (!derivedContact || derivedContact === 'N/A') {
            if (collectionMatch && collectionMatch.contact_number) {
                derivedContact = collectionMatch.contact_number;
            } else if (salesMatch && salesMatch.contact) {
                derivedContact = salesMatch.contact;
            }
        }

        // --- INDEPENDENT ADDRESS BACKFILL ---
        if (!derivedAddress || derivedAddress === 'N/A') {
            if (collectionMatch && collectionMatch.address) {
                derivedAddress = collectionMatch.address;
            } else if (salesMatch && salesMatch.address) {
                derivedAddress = salesMatch.address;
            }
        }

        // --- INDEPENDENT CATEGORY BACKFILL ---
        if (!derivedCategory || derivedCategory.trim() === '' || derivedCategory === 'N/A') {
            if (collectionMatch && collectionMatch.type) {
                derivedCategory = collectionMatch.type;
            } else if (salesMatch && salesMatch.type) {
                derivedCategory = salesMatch.type;
            }
        }

        // Clean up the finalized category string for uniform evaluation
        const rawCategory = (derivedCategory || 'walk-ins').toLowerCase().trim();

        // Map the finalized properties safely to your table row structure
        const contactObj = {
            id: profile.id,
            name: profile.name || 'Unknown',
            address: derivedAddress || 'N/A',
            contactNumber: derivedContact || 'N/A',
            category: rawCategory,
            displayCategory: getCategoryDisplayName(rawCategory), // Use helper function for proper formatting
            avatarColor: getRandomColor()
        };
        
        addContactToTable(contactObj);
    });
}

// Get category display name
function getCategoryDisplayName(category) {
    const categoryMap = {
        'walk-ins': 'Walk-ins',
        'school': 'School',
        'junkshop': 'Junkshop',
        'organization': 'Organization',
        'barangay': 'Barangay' // Added mapping for Barangay
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
                    <i data-lucide="edit-2"></i>
                </button>
                <button class="action-btn delete-btn" title="Delete">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </td>
    `;

    // Delete Logic (Update to delete from Supabase)
    row.querySelector('.delete-btn').addEventListener('click', async function() {
        if (confirm(`Are you sure you want to delete ${contact.name}?`)) {
            const { error } = await _supabase.from('profiles').delete().eq('id', contact.id);
            if (!error) {
                row.remove();
                checkEmptyState();
            } else {
                alert("Error deleting: " + error.message);
            }
        }
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
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentTab = this.getAttribute('data-tab');
            filterContacts(currentTab);
        });
    });
}

function filterContacts(tab) {
    const rows = document.querySelectorAll('#contactsTableBody tr:not(.empty-state-row)');
    rows.forEach(row => {
        const category = row.getAttribute('data-category');
        if (tab === 'all') {
            row.style.display = '';
        } else if (tab === 'collections') {
            // Added 'barangay' alongside your other group profile categories
            row.style.display = ['walk-ins', 'school', 'organization', 'partner', 'barangay'].includes(category) ? '' : 'none';
        } else if (tab === 'sales') {
            row.style.display = ['junkshop', 'customer'].includes(category) ? '' : 'none';
        }
    });
    checkEmptyState();
}

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput?.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const rows = document.querySelectorAll('#contactsTableBody tr:not(.empty-state-row)');

        rows.forEach(row => {
            const name = row.querySelector('.customer-cell span')?.textContent.toLowerCase() || '';
            const id = row.getAttribute('data-id').toLowerCase();
            const matches = name.includes(searchTerm) || id.includes(searchTerm);
            row.style.display = matches ? '' : 'none';
        });
        checkEmptyState();
    });
}
// 3. INITIALIZE ON LOAD
document.addEventListener('DOMContentLoaded', () => {
    fetchProfilesFromSupabase(); // Call Supabase instead of LocalStorage
    initializeTabSwitching();
    initializeSearch();
});
