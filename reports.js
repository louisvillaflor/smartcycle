document.addEventListener('DOMContentLoaded', () => {

    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // POPOVER HELPERS
    const allPairs = [];

    function openPopover(btn, popover) {
        btn.setAttribute('aria-expanded', 'true');
        popover.setAttribute('aria-hidden', 'false');
    }

    function closePopover(btn, popover) {
        btn.setAttribute('aria-expanded', 'false');
        popover.setAttribute('aria-hidden', 'true');
    }

    function togglePopover(btn, popover, others = []) {
        const isOpen = popover.getAttribute('aria-hidden') === 'false';
        others.forEach(({ b, p }) => closePopover(b, p));
        isOpen ? closePopover(btn, popover) : openPopover(btn, popover);
    }

    function registerPair(btn, popover) {
        if (!btn || !popover) return;
        allPairs.push({ btn, popover });

        popover.addEventListener('click', (e) => e.stopPropagation());
    }

    // Close all popovers when clicking outside
    document.addEventListener('click', (e) => {
        allPairs.forEach(({ btn, popover }) => {
            if (!btn.contains(e.target)) {
                closePopover(btn, popover);
            }
        });
    });

    // Close all on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            allPairs.forEach(({ btn, popover }) => closePopover(btn, popover));
        }
    });

    // DESKTOP — Date Range + Category popovers
    const dateBtn         = document.getElementById('dateBtn');
    const datePopover     = document.getElementById('datePopover');
    const categoryBtn     = document.getElementById('categoryBtn');
    const categoryPopover = document.getElementById('categoryPopover');

    registerPair(dateBtn, datePopover);
    registerPair(categoryBtn, categoryPopover);

    dateBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePopover(dateBtn, datePopover, [{ b: categoryBtn, p: categoryPopover }]);
    });

    categoryBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePopover(categoryBtn, categoryPopover, [{ b: dateBtn, p: datePopover }]);
    });

    // MOBILE — Date Range + Category popovers
    const dateBtnMobile         = document.getElementById('dateBtnMobile');
    const datePopoverMobile     = document.getElementById('datePopoverMobile');
    const categoryBtnMobile     = document.getElementById('categoryBtnMobile');
    const categoryPopoverMobile = document.getElementById('categoryPopoverMobile');

    registerPair(dateBtnMobile, datePopoverMobile);
    registerPair(categoryBtnMobile, categoryPopoverMobile);

    dateBtnMobile?.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePopover(dateBtnMobile, datePopoverMobile, [{ b: categoryBtnMobile, p: categoryPopoverMobile }]);
    });

    categoryBtnMobile?.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePopover(categoryBtnMobile, categoryPopoverMobile, [{ b: dateBtnMobile, p: datePopoverMobile }]);
    });

    // MOBILE — Export dropdown
    const exportDropdownBtn = document.getElementById('exportDropdownBtn');
    const exportDropdown    = document.getElementById('exportDropdown');

    registerPair(exportDropdownBtn, exportDropdown);

    exportDropdownBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePopover(exportDropdownBtn, exportDropdown);
    });

    document.querySelectorAll('.export-dropdown-item').forEach(btn => {
        btn.addEventListener('click', () => {
            handleExport(btn.getAttribute('data-format'));
            closePopover(exportDropdownBtn, exportDropdown);
        });
    });

    // Desktop export buttons
    document.querySelectorAll('.btn-export').forEach(btn => {
        btn.addEventListener('click', () => handleExport(btn.getAttribute('data-format')));
    });

    // EXPORT
    function handleExport(format) {
        showExportModal(format);
    }

    const fieldStyle = `border:1px solid #d1d5db;border-radius:7px;padding:7px 10px;
        font-size:13px;font-family:inherit;color:#0f172a;outline:none;width:100%;box-sizing:border-box;`;
    const labelStyle = `font-size:12px;font-weight:600;color:#374151;display:flex;flex-direction:column;gap:4px;`;

    function showExportModal(format) {
        document.getElementById('exportFormModal')?.remove();

        const now = new Date();

        const overlay = document.createElement('div');
        overlay.id = 'exportFormModal';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.45);
            display: flex; align-items: center; justify-content: center;
            z-index: 9999; font-family: 'Inter', sans-serif;
        `;

        overlay.innerHTML = `
            <div style="background:#fff; border-radius:16px; padding:28px 32px; width:460px; max-width:92vw;
                        box-shadow:0 24px 48px rgba(0,0,0,0.18); position:relative;">
                <button id="exportModalClose" style="position:absolute;top:14px;right:16px;background:none;
                    border:none;font-size:20px;cursor:pointer;color:#64748b;line-height:1;">&#10005;</button>

                <h2 style="margin:0 0 4px;font-size:17px;font-weight:700;color:#0f172a;">
                    Export Junkshop Monitoring Form
                </h2>
                <p style="margin:0 0 20px;font-size:13px;color:#64748b;">
                    Fill in the form details for the <strong>${format}</strong> report.
                </p>

                <div style="display:grid;gap:10px;">

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <label style="font-size:12px;font-weight:600;color:#374151;display:flex;flex-direction:column;gap:4px;">
                            Month
                            <select id="expMonth" style="${fieldStyle}">
                                ${['January','February','March','April','May','June',
                                   'July','August','September','October','November','December']
                                   .map((m,i)=>`<option value="${i}" ${i===now.getMonth()?'selected':''}>${m}</option>`).join('')}
                            </select>
                        </label>
                        <label style="font-size:12px;font-weight:600;color:#374151;display:flex;flex-direction:column;gap:4px;">
                            Year
                            <input id="expYear" type="number" value="${now.getFullYear()}" min="2000" max="2099" style="${fieldStyle}">
                        </label>
                    </div>

                    <label style="${labelStyle}">Junkshop Name
                        <input id="expJunkshop" type="text" placeholder="e.g. Juan's Junkshop" style="${fieldStyle}">
                    </label>
                    <label style="${labelStyle}">Address
                        <input id="expAddress" type="text" placeholder="Street, City" style="${fieldStyle}">
                    </label>

                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                        <label style="${labelStyle}">Barangay
                            <input id="expBrgy" type="text" style="${fieldStyle}">
                        </label>
                        <label style="${labelStyle}">Zone
                            <input id="expZone" type="text" style="${fieldStyle}">
                        </label>
                        <label style="${labelStyle}">District
                            <input id="expDistrict" type="text" style="${fieldStyle}">
                        </label>
                    </div>

                    <label style="${labelStyle}">Owner / In-Charge
                        <input id="expOwner" type="text" placeholder="Full name" style="${fieldStyle}">
                    </label>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <label style="${labelStyle}">Mobile No.
                            <input id="expMobile" type="text" placeholder="09XX-XXX-XXXX" style="${fieldStyle}">
                        </label>
                        <label style="${labelStyle}">Landline
                            <input id="expLandline" type="text" placeholder="(02) XXXX-XXXX" style="${fieldStyle}">
                        </label>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                        <label style="${labelStyle}">Date Established
                            <input id="expDateEst" type="text" placeholder="MM/DD/YYYY" style="${fieldStyle}">
                        </label>
                        <label style="${labelStyle}">Floor Area (sqm)
                            <input id="expFloor" type="text" style="${fieldStyle}">
                        </label>
                        <label style="${labelStyle}">No. of Aide
                            <input id="expAide" type="text" style="${fieldStyle}">
                        </label>
                    </div>

                </div>

                <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:22px;">
                    <button id="exportModalCancel" style="padding:9px 20px;border:1px solid #e5e7eb;
                        border-radius:8px;background:#fff;font-size:13px;cursor:pointer;color:#374151;
                        font-weight:500;">Cancel</button>
                    <button id="exportModalConfirm" style="padding:9px 22px;border:none;border-radius:8px;
                        background:#46B336;color:#fff;font-size:13px;font-weight:600;cursor:pointer;
                        display:flex;align-items:center;gap:6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Export ${format}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('#exportModalClose').addEventListener('click', close);
        overlay.querySelector('#exportModalCancel').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

        overlay.querySelector('#exportModalConfirm').addEventListener('click', () => {
            const opts = {
                month:           parseInt(overlay.querySelector('#expMonth').value),
                year:            parseInt(overlay.querySelector('#expYear').value),
                junkshopName:    overlay.querySelector('#expJunkshop').value.trim(),
                address:         overlay.querySelector('#expAddress').value.trim(),
                barangay:        overlay.querySelector('#expBrgy').value.trim(),
                zone:            overlay.querySelector('#expZone').value.trim(),
                district:        overlay.querySelector('#expDistrict').value.trim(),
                owner:           overlay.querySelector('#expOwner').value.trim(),
                mobile:          overlay.querySelector('#expMobile').value.trim(),
                landline:        overlay.querySelector('#expLandline').value.trim(),
                dateEstablished: overlay.querySelector('#expDateEst').value.trim(),
                floorArea:       overlay.querySelector('#expFloor').value.trim(),
                noOfAide:        overlay.querySelector('#expAide').value.trim(),
            };

            close();

            if (format === 'PDF') {
                JunkshopExport.exportPDF(opts).catch(err => {
                    console.error('PDF export error:', err);
                    alert('PDF export failed. Please try again.');
                });
            } else {
                JunkshopExport.exportCSV(opts);
            }
        });
    }

    // CALENDAR
    let selectedStart = null;
    let selectedEnd   = null;

    function buildCalendar(tbodyId, year, month, labelId) {
        const tbody = document.getElementById(tbodyId);
        const label = document.getElementById(labelId);
        if (!tbody) return;

        const monthNames = [
            'January','February','March','April','May','June',
            'July','August','September','October','November','December'
        ];

        if (label) label.textContent = `${monthNames[month]} ${year}`;

        tbody.innerHTML = '';

        const today       = new Date();
        const firstDay    = new Date(year, month, 1).getDay();
        const startOffset = (firstDay + 6) % 7; // Monday-based grid
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let day = 1 - startOffset;

        for (let row = 0; row < 6; row++) {
            const tr = document.createElement('tr');
            let rowHasCurrent = false;

            for (let col = 0; col < 7; col++, day++) {
                const td  = document.createElement('td');
                const btn = document.createElement('button');
                btn.type  = 'button';

                if (day < 1 || day > daysInMonth) {
                    btn.textContent = new Date(year, month, day).getDate();
                    btn.classList.add('other-month');
                    btn.disabled = true;
                } else {
                    rowHasCurrent   = true;
                    btn.textContent = day;
                    const thisDate  = new Date(year, month, day);

                    if (
                        today.getFullYear() === year &&
                        today.getMonth()    === month &&
                        today.getDate()     === day
                    ) {
                        btn.classList.add('today');
                    }

                    applyRangeClasses(btn, thisDate);

                    btn.addEventListener('click', () => onDateClick(thisDate));
                }

                td.appendChild(btn);
                tr.appendChild(td);
            }

            if (rowHasCurrent || row === 0) tbody.appendChild(tr);
        }
    }

    function applyRangeClasses(btn, date) {
        btn.classList.remove('selected', 'range-start', 'range-end', 'in-range');
        if (!selectedStart) return;

        const t = date.getTime();
        const s = selectedStart.getTime();

        if (!selectedEnd) {
            if (t === s) btn.classList.add('selected');
            return;
        }

        const e = selectedEnd.getTime();
        if      (t === s)        btn.classList.add('range-start');
        else if (t === e)        btn.classList.add('range-end');
        else if (t > s && t < e) btn.classList.add('in-range');
    }

    function onDateClick(date) {
        if (!selectedStart || (selectedStart && selectedEnd)) {
            selectedStart = date;
            selectedEnd   = null;
        } else {
            if (date < selectedStart) {
                selectedEnd   = selectedStart;
                selectedStart = date;
            } else {
                selectedEnd = date;
            }
        }
        rebuildAllCalendars();
    }

    // Desktop calendar state
    let desktopYear  = new Date().getFullYear();
    let desktopMonth = new Date().getMonth();

    function buildDesktop() {
        buildCalendar('calBody', desktopYear, desktopMonth, 'calMonthLabel');
    }

    document.getElementById('calPrev')?.addEventListener('click', () => {
        if (--desktopMonth < 0) { desktopMonth = 11; desktopYear--; }
        buildDesktop();
    });

    document.getElementById('calNext')?.addEventListener('click', () => {
        if (++desktopMonth > 11) { desktopMonth = 0; desktopYear++; }
        buildDesktop();
    });

    // Mobile calendar state
    let mobileYear  = new Date().getFullYear();
    let mobileMonth = new Date().getMonth();

    function buildMobile() {
        buildCalendar('calBodyMobile', mobileYear, mobileMonth, 'calMonthLabelMobile');
    }

    document.getElementById('calPrevMobile')?.addEventListener('click', () => {
        if (--mobileMonth < 0) { mobileMonth = 11; mobileYear--; }
        buildMobile();
    });

    document.getElementById('calNextMobile')?.addEventListener('click', () => {
        if (++mobileMonth > 11) { mobileMonth = 0; mobileYear++; }
        buildMobile();
    });

    function rebuildAllCalendars() {
        buildDesktop();
        buildMobile();
    }

    // Initial render
    buildDesktop();
    buildMobile();

    // DATE RANGES
    document.querySelectorAll('.quick-dates li button').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('ul').querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            switch (btn.getAttribute('data-range')) {
                case 'yesterday': {
                    const y = new Date(today);
                    y.setDate(today.getDate() - 1);
                    selectedStart = new Date(y);
                    selectedEnd   = new Date(y);
                    break;
                }
                case 'last-week': {
                    const end = new Date(today);
                    end.setDate(today.getDate() - today.getDay() - 1);
                    const start = new Date(end);
                    start.setDate(end.getDate() - 6);
                    selectedStart = start;
                    selectedEnd   = end;
                    break;
                }
                case 'last-month': {
                    selectedStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    selectedEnd   = new Date(today.getFullYear(), today.getMonth(), 0);
                    break;
                }
                case 'last-quarter': {
                    const q = Math.floor(today.getMonth() / 3);
                    selectedStart = new Date(today.getFullYear(), (q - 1) * 3, 1);
                    selectedEnd   = new Date(today.getFullYear(), q * 3, 0);
                    break;
                }
            }

            rebuildAllCalendars();
        });
    });

    // CATEGORY FILTER
    document.querySelectorAll('.popover-content input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const selected = [
                ...document.querySelectorAll('.popover-content input[type="checkbox"]:checked')
            ].map(c => c.value);
            // Replace with actual filter/fetch logic
            console.log('Active categories:', selected);
        });
    });

    // TABLE RENDER
    const reportsBody = document.getElementById('reportsTableBody');
    const emptyState  = document.getElementById('emptyState');

    function renderTable(data) {
        if (!reportsBody) return;
        reportsBody.innerHTML = '';

        if (!data || data.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="col-material">${row.material}</td>
                <td>${row.week1 ?? '—'}</td>
                <td>${row.week2 ?? '—'}</td>
                <td>${row.week3 ?? '—'}</td>
                <td>${row.week4 ?? '—'}</td>
                <td class="col-total">${row.total ?? '—'}</td>
            `;
            reportsBody.appendChild(tr);
        });
    }

    // Replace with actual backend fetch
    renderTable([]);

});
