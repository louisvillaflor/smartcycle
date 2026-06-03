const SUPABASE_URL = 'https://nlybbvlhhdjjmqkzjnhx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tb_WPtZc6awrzrQrDvYUxQ_ndUpe-Au';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

lucide.createIcons();

let currentView = 'archive';
let allLogs = [];
let filteredLogs = [];

document.addEventListener('DOMContentLoaded', function () {
    fetch('navbar.html')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load navbar');
            return response.text();
        })
        .then(html => {
            const navbarContainer = document.getElementById('navbar-container');
            navbarContainer.innerHTML = html;

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            setActiveNavItem();
            addKeyboardNavigation();
            initializeMobileMenu();
            initializeAdminSection();
            displayLoggedInUser();
        })
        .catch(error => {
            console.error('Error loading navbar:', error);
        });
});


// Set active nav item based on current page
function setActiveNavItem() {
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.classList.remove('active');
        item.removeAttribute('aria-current');

        const dataPage = item.getAttribute('data-page');
        const href = item.getAttribute('href');

        if ((dataPage && currentPage.includes(dataPage)) || href === currentPage) {
            item.classList.add('active');
            item.setAttribute('aria-current', 'page');
        }
    });
}


// Keyboard arrow navigation for nav items
function addKeyboardNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach((item, index) => {
        item.addEventListener('keydown', (e) => {
            let targetIndex;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    targetIndex = (index + 1) % navItems.length;
                    navItems[targetIndex].focus();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    targetIndex = (index - 1 + navItems.length) % navItems.length;
                    navItems[targetIndex].focus();
                    break;
                case 'Home':
                    e.preventDefault();
                    navItems[0].focus();
                    break;
                case 'End':
                    e.preventDefault();
                    navItems[navItems.length - 1].focus();
                    break;
            }
        });
    });
}


// Mobile sidebar open/close
function initializeMobileMenu() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const navItems = document.querySelectorAll('.nav-item');

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.classList.add('sidebar-open');
        hamburgerBtn.setAttribute('aria-expanded', 'true');
        sidebar.setAttribute('aria-hidden', 'false');
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('sidebar-open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        sidebar.setAttribute('aria-hidden', 'true');
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) closeSidebar();
        });
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
                closeSidebar();
            }
        }, 250);
    });
}


// Admin section: profile click vs three-dots click
function initializeAdminSection() {
    const adminProfileBtn = document.getElementById('admin-profile-btn');
    const adminMoreBtn = document.getElementById('admin-more-btn');
    const adminDropdown = document.getElementById('admin-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    if (!adminProfileBtn || !adminMoreBtn || !adminDropdown) return;

    // Three dots — toggle dropdown (stop propagation so it doesn't bubble to profile btn)
    adminMoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = adminDropdown.classList.toggle('active');
        adminMoreBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Profile area click — placeholder for future profile page navigation
    adminProfileBtn.addEventListener('click', (e) => {
        // If the three-dots area was clicked, do nothing here
        if (e.target.closest('#admin-more-btn')) return;
        
        window.location.href = 'user.html';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!adminMoreBtn.contains(e.target) && !adminDropdown.contains(e.target)) {
            adminDropdown.classList.remove('active');
            adminMoreBtn.setAttribute('aria-expanded', 'false');
        }
    });

    // Logout button opens confirmation modal
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            adminDropdown.classList.remove('active');
            openLogoutModal();
        });
    }

    // Close dropdown on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && adminDropdown.classList.contains('active')) {
            adminDropdown.classList.remove('active');
            adminMoreBtn.setAttribute('aria-expanded', 'false');
            adminMoreBtn.focus();
        }
    });

    initializeLogoutModal();
}


// Logout confirmation modal
function initializeLogoutModal() {
    const logoutModal = document.getElementById('logoutModal');
    const logoutCancelBtn = document.getElementById('logoutCancelBtn');
    const logoutConfirmBtn = document.getElementById('logoutConfirmBtn');

    if (!logoutModal) return;

    if (logoutCancelBtn) {
        logoutCancelBtn.addEventListener('click', () => {
            logoutModal.close();
        });
    }

    if (logoutConfirmBtn) {
        logoutConfirmBtn.addEventListener('click', () => {
            handleLogout();
        });
    }
}

function openLogoutModal() {
    const logoutModal = document.getElementById('logoutModal');
    if (logoutModal) {
        lucide.createIcons();
        logoutModal.showModal();
    }
}

    
    // Display logged-in user name from session
    function displayLoggedInUser() {
        const adminNameElement = document.getElementById('admin-name');
        if (adminNameElement) {
            adminNameElement.textContent = sessionStorage.getItem('userName') || 'Admin';
        }
    }
    
    
    // Logout: clear session and redirect
    function handleLogout() {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userName');
        sessionStorage.removeItem('userEmail');
        sessionStorage.removeItem('authToken');
    
        window.location.href = 'index.html';
    }

// MOCK DATA
const MOCK_LOGS = [
    {
        id: 1,
        user_name: 'Jadey morales',
        user_role: 'Admin',
        action: 'Deleted Sale #102',
        created_at: '2026-05-29T20:30:00',
        is_deleted: false
    },
    {
        id: 2,
        user_name: 'Polytechnic',
        user_role: 'Super-Admin',
        action: 'Edited Yero price',
        created_at: '2026-05-29T20:30:00',
        is_deleted: false
    },
    {
        id: 3,
        user_name: 'Sir Allan',
        user_role: 'Admin',
        action: 'Added Collection #092',
        created_at: '2026-05-29T20:30:00',
        is_deleted: false
    },
    {
        id: 4,
        user_name: 'Princess',
        user_role: 'Admin',
        action: 'Deleted Sale #102',
        created_at: '2026-05-29T20:30:00',
        is_deleted: false
    },
    {
        id: 5,
        user_name: 'Tanay national',
        user_role: 'Super-Admin',
        action: 'Added Collection #092',
        created_at: '2026-05-27T20:30:00',
        is_deleted: false
    },
    {
        id: 6,
        user_name: 'KPOP junk',
        user_role: 'Moderator',
        action: 'Viewed Sale #030',
        created_at: '2026-05-27T20:30:00',
        is_deleted: false
    },
    {
        id: 7,
        user_name: 'EVERYGLORY',
        user_role: 'Moderator',
        action: 'Edited Collection #045',
        created_at: '2026-05-27T20:30:00',
        is_deleted: true
    }
];

async function fetchHistory() {
    allLogs = MOCK_LOGS;
    applyFiltersAndRender();
}

// FILTER
function applyFiltersAndRender() {
    const roleFilter   = document.getElementById('roleFilter')?.value   || '';
    const actionFilter = document.getElementById('actionFilter')?.value || '';
    const dateFilter   = document.getElementById('dateFilter')?.value   || '';

    filteredLogs = allLogs.filter(log => {
        if (currentView === 'archive' && log.is_deleted)  return false;
        if (currentView === 'trash'   && !log.is_deleted) return false;
        if (roleFilter && log.user_role !== roleFilter) return false;
        if (actionFilter && !log.action.startsWith(actionFilter)) return false;
        if (dateFilter) {
            const logDate = log.created_at.slice(0, 10);
            if (logDate !== dateFilter) return false;
        }
        return true;
    });

    renderHistory();
}

// RENDER
function renderHistory() {
    const listEl     = document.getElementById('historyList');
    const emptyEl    = document.getElementById('emptyState');
    listEl.innerHTML = '';

    if (filteredLogs.length === 0) {
        emptyEl.style.display = 'flex';
        lucide.createIcons();
        return;
    }

    emptyEl.style.display = 'none';

    const groups = groupByDate(filteredLogs);

    Object.entries(groups).forEach(([dateLabel, logs]) => {
        const groupEl = document.createElement('tbody');
        groupEl.className = 'date-group';

        const headerEl = document.createElement('tr');
        headerEl.className = 'date-group-header';
        headerEl.innerHTML = `<td colspan="5">${dateLabel}</td>`;
        groupEl.appendChild(headerEl);

        logs.forEach(log => {
            groupEl.appendChild(buildRow(log));
        });

        listEl.appendChild(groupEl);
    });

    lucide.createIcons();
}

// ROW BUILDER
function buildRow(log) {
    const row = document.createElement('tr');
    const avatarColor = log.avatar_color || getRandomColor();
    const roleClass   = getRoleClass(log.user_role);
    const formattedTs = formatTimestamp(log.created_at);

    row.innerHTML = `
        <td>
            <div class="user-cell">
                <div class="user-avatar" style="background-color: ${avatarColor};">
                    <i data-lucide="user" style="width: 16px; height: 16px;"></i>
                </div>
                <span class="user-name">${escapeHtml(log.user_name)}</span>
            </div>
        </td>
        <td><span class="role-badge ${roleClass}">${escapeHtml(log.user_role)}</span></td>
        <td><span class="action-desc">${escapeHtml(log.action)}</span></td>
        <td><span class="timestamp">${formattedTs}</span></td>
        <td>
            <div class="action-btns">
                <button class="icon-btn delete" title="Delete log" data-id="${log.id}">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </td>
    `;

    row.querySelector('.delete').addEventListener('click', async (e) => {
        e.stopPropagation();
        showDeleteModal(log);
    });

    return row;
}

function showDeleteModal(log) {
    if (!document.getElementById('historyDeleteModal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="historyDeleteModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:3000;justify-content:center;align-items:center;backdrop-filter:blur(4px);">
                <div style="background:white;border-radius:20px;padding:36px 32px 28px;width:360px;max-width:90vw;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                    <div style="width:64px;height:64px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;">
                        <i data-lucide="trash-2" style="width:28px;height:28px;color:#ef4444;"></i>
                    </div>
                    <h3 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">Delete Log</h3>
                    <p id="historyDeleteText" style="font-size:14px;color:#6b7280;margin:0 0 28px;line-height:1.5;"></p>
                    <div style="display:flex;gap:12px;">
                        <button id="historyDeleteCancel" style="flex:1;padding:12px;border-radius:10px;border:1px solid #e5e7eb;background:white;font-size:14px;font-weight:600;color:#374151;cursor:pointer;font-family:inherit;">Cancel</button>
                        <button id="historyDeleteConfirm" style="flex:1;padding:12px;border-radius:10px;border:none;background:#ef4444;color:white;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Delete</button>
                    </div>
                </div>
            </div>
        `);

        const modal = document.getElementById('historyDeleteModal');
        document.getElementById('historyDeleteCancel').addEventListener('click', () => modal.style.display = 'none');
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    }

    const modal = document.getElementById('historyDeleteModal');
    document.getElementById('historyDeleteText').textContent =
        `Are you sure you want to delete the log entry for "${log.user_name}"? This action cannot be undone.`;

    const confirmBtn = document.getElementById('historyDeleteConfirm');
    const cleanBtn = confirmBtn.cloneNode(true);
    confirmBtn.replaceWith(cleanBtn);

    cleanBtn.addEventListener('click', async () => {
        await deleteLog(log.id);
        allLogs = allLogs.filter(l => l.id !== log.id);
        modal.style.display = 'none';
        applyFiltersAndRender();
    });

    modal.style.display = 'flex';
    lucide.createIcons();
}

async function deleteLog(id) {
    console.log('Delete log id:', id);
}

// HELPERS
function groupByDate(logs) {
    const groups = {};
    logs.forEach(log => {
        const label = formatDateLabel(log.created_at);
        if (!groups[label]) groups[label] = [];
        groups[label].push(log);
    });
    return groups;
}

function formatDateLabel(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTimestamp(isoString) {
    const date = new Date(isoString);
    const y  = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d  = String(date.getDate()).padStart(2, '0');
    const h  = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${d} ${h}:${mi}`;
}

function getRoleClass(role) {
    const map = {
        'Super-Admin': 'super-admin',
        'Admin':       'admin',
        'Moderator':   'moderator'
    };
    return map[role] || 'admin';
}

function getRandomColor() {
    const colors = ['#4CAF50', '#FF9800', '#2196F3', '#9C27B0', '#F44336', '#00BCD4', '#FF5722', '#8BC34A'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', () => {

    fetchHistory();

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentView = this.getAttribute('data-view');
            applyFiltersAndRender();
        });
    });

    const filterBtn   = document.getElementById('filterBtn');
    const filterPanel = document.getElementById('filterPanel');
    filterBtn.addEventListener('click', () => {
        filterPanel.classList.toggle('open');
        filterBtn.classList.toggle('open');
    });

    ['roleFilter', 'actionFilter', 'dateFilter'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', applyFiltersAndRender);
    });

    document.getElementById('clearFilter').addEventListener('click', () => {
        document.getElementById('roleFilter').value   = '';
        document.getElementById('actionFilter').value = '';
        document.getElementById('dateFilter').value   = '';
        applyFiltersAndRender();
    });
});
