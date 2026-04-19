const JunkshopExport = (() => {

    const RECYCLABLE_MATERIALS = [
        'Old Newspaper',
        'White Paper',
        'Assorted',
        'Paper/Magazines',
        'Cartons',
        'PET Bottles',
        'Plastics Containers',
        'Bottles (Glass)',
        'Aluminum',
        'Copper',
        'Tin',
        'Steel',
        'Others',
    ];

    function parseCollectionDate(raw) {
        if (!raw) return null;
        const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (slashMatch) {
            let [, m, d, y] = slashMatch;
            if (y.length === 2) y = '20' + y;
            return new Date(+y, +m - 1, +d);
        }
        const d = new Date(raw);
        return isNaN(d) ? null : d;
    }

    function weekOfMonth(date) {
        return Math.min(4, Math.ceil(date.getDate() / 7));
    }

    function aggregateData(month, year) {
        const raw = JSON.parse(localStorage.getItem('smartCycleCollections') || '[]');
        const result = {};
        RECYCLABLE_MATERIALS.forEach(m => {
            result[m] = { w1: 0, w2: 0, w3: 0, w4: 0, total: 0 };
        });
        raw.forEach(col => {
            const d = parseCollectionDate(col.date);
            if (!d) return;
            if (d.getMonth() !== month || d.getFullYear() !== year) return;
            const wk  = weekOfMonth(d);
            const key = `w${wk}`;
            (col.items || []).forEach(item => {
                const mat   = item.material;
                const known = RECYCLABLE_MATERIALS.find(
                    m => m.toLowerCase() === mat.toLowerCase()
                ) || 'Others';
                result[known][key]  += Number(item.weight) || 0;
                result[known].total += Number(item.weight) || 0;
            });
        });
        Object.values(result).forEach(r => {
            ['w1', 'w2', 'w3', 'w4', 'total'].forEach(k => {
                r[k] = Math.round(r[k] * 100) / 100;
            });
        });
        return result;
    }

    const MONTHS = [
        'January','February','March','April','May','June',
        'July','August','September','October','November','December'
    ];


    // CSV EXPORT

    function exportCSV(opts = {}) {
        const now   = new Date();
        const month = opts.month ?? now.getMonth();
        const year  = opts.year  ?? now.getFullYear();
        const data  = aggregateData(month, year);
        const monthLabel = `${MONTHS[month]} ${year}`;

        const rows = [
            ['JUNKSHOP MONITORING FORM - Data Sheet'],
            [`Month: ${monthLabel}`],
            [],
            ['Junkshop Name:', opts.junkshopName || ''],
            ['Address:', opts.address || ''],
            ['Barangay:', opts.barangay || '', 'Zone:', opts.zone || '', 'District:', opts.district || ''],
            ['Owner:', opts.owner || ''],
            ['Mobile No.:', opts.mobile || '', 'Landline:', opts.landline || ''],
            ['Date Established:', opts.dateEstablished || '', 'Floor Area:', opts.floorArea || '', 'No. of Aide:', opts.noOfAide || ''],
            [],
            ['RECYCLABLE MATERIALS (Kilos / Day)', 'WEEK 1', '', 'WEEK 2', '', 'WEEK 3', '', 'WEEK 4', '', 'Monthly Total'],
            ['RECYCLABLE', 'D1','D2','D3','D4','D5','D6','D7', 'D1','D2','D3','D4','D5','D6','D7',
                           'D1','D2','D3','D4','D5','D6','D7', 'D1','D2','D3','D4','D5','D6','D7', 'TOTAL'],
        ];
        RECYCLABLE_MATERIALS.forEach(mat => {
            const r = data[mat];
            rows.push([mat, '', '', '', '', '', '', r.w1||'',
                            '', '', '', '', '', '', r.w2||'',
                            '', '', '', '', '', '', r.w3||'',
                            '', '', '', '', '', '', r.w4||'', r.total||'']);
        });
        rows.push([]);
        rows.push(['Certified by:', '', '', '', '', 'Monitored by:']);
        rows.push(['Junkshop Owner/In-Charge', '', 'Date', '', '', 'DPS - Monitoring', '', 'Date']);

        const csv = rows.map(r =>
            r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\r\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `JunkshopMonitoringForm_${MONTHS[month]}${year}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // PDF EXPORT

    async function exportPDF(opts = {}) {
        const jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        if (!jsPDF) {
            alert('jsPDF failed to load. Please refresh the page and try again.');
            return;
        }

        const now        = new Date();
        const month      = opts.month ?? now.getMonth();
        const year       = opts.year  ?? now.getFullYear();
        const data       = aggregateData(month, year);
        const monthLabel = `${MONTHS[month]} ${year}`;

        // A4 landscape
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const W   = doc.internal.pageSize.getWidth();   // 841.89
        const H   = doc.internal.pageSize.getHeight();  // 595.28
        const ML  = 30, MR = 30;
        const usableW = W - ML - MR;  // ~781.89

        let y = 18;

        const sf = (fam, sty, sz) => { doc.setFont(fam, sty); doc.setFontSize(sz); doc.setTextColor(0,0,0); };

        const ctext = (txt, yy, sz, sty = 'normal', col = [0,0,0]) => {
            doc.setFont('times', sty); doc.setFontSize(sz); doc.setTextColor(...col);
            doc.text(txt, W / 2, yy, { align: 'center' });
        };

        const ltext = (txt, xx, yy, sz, sty = 'normal') => {
            doc.setFont('times', sty); doc.setFontSize(sz); doc.setTextColor(0,0,0);
            doc.text(txt, xx, yy);
        };

        const hline = (x1, x2, yy, lw = 0.5) => {
            doc.setLineWidth(lw); doc.setDrawColor(0,0,0); doc.line(x1, yy, x2, yy);
        };

        const box = (x, yy, w, h) => {
            doc.setDrawColor(0,0,0); doc.setLineWidth(0.4); doc.rect(x, yy, w, h, 'S');
        };

        // Logo
        const loadImage = async (path) => {
            try {
                const resp = await fetch(path);
                if (!resp.ok) return null;
                const blob = await resp.blob();
                return await new Promise((res, rej) => {
                    const r = new FileReader();
                    r.onload  = () => res(r.result);
                    r.onerror = rej;
                    r.readAsDataURL(blob);
                });
            } catch { return null; }
        };

        // HEADER
        const logoW   = 54, logoH = 54;
        const logoY   = y + 10;
        const centerX = W / 2;

        const leftLogoData  = await loadImage('photo/left_logo.jpg');
        const rightLogoData = await loadImage('photo/right_logo.png');
        if (leftLogoData)  doc.addImage(leftLogoData,  'JPEG', centerX - 200 - logoW, logoY, logoW, logoH);
        if (rightLogoData) doc.addImage(rightLogoData, 'PNG',  centerX + 200,         logoY, logoW, logoH);

        ctext('Republic of the Philippines',   y + 13, 9.5, 'normal');
        ctext('City of Manila',                y + 25,  9.5, 'normal');
        ctext('DEPARTMENT OF PUBLIC SERVICES', y + 42, 17,  'bold', [0, 70, 150]);
        ctext('Manila, Philippines',           y + 57, 9.5, 'normal');

        y += 70;

        // Double rule
        hline(ML, W - MR, y,     2.5);
        hline(ML, W - MR, y + 4, 0.8);
        y += 14;

        // FORM TITLE
        ctext('JUNKSHOP MONITORING FORM', y + 12, 13, 'bold');
        y += 20;
        ctext('Data Sheet', y + 2, 10.5, 'normal');
        y += 14;

        // Month with underline
        ltext('Month: ', ML, y, 10, 'normal');
        const mw = doc.getTextWidth('Month: ');
        hline(ML + mw, ML + mw + 140, y + 1, 0.6);
        if (monthLabel) ltext(monthLabel, ML + mw + 2, y, 10, 'normal');
        y += 18;

        // INFO FIELDS
        const field = (label, value, x, yy, ulLen) => {
            ltext(label, x, yy, 9, 'bold');
            const lw = doc.getTextWidth(label);
            if (value) ltext(value, x + lw + 1, yy, 9, 'normal');
            hline(x + lw + 1, x + lw + 1 + ulLen, yy + 1.5, 0.5);
        };

        // Row 1: Junkshop Name | Address | Brgy | Zone | District
        field('Junkshop Name: ', opts.junkshopName || '', ML,       y, 130);
        field('Address: ',       opts.address      || '', ML + 240, y, 170);
        field('Brgy: ',    opts.barangay || '', ML + 490, y, 55);
        field('Zone: ',    opts.zone     || '', ML + 583, y, 35);
        field('District: ', opts.district || '', ML + 648, y, 60);
        y += 14;

        // Row 2: Owner | Mobile No. | Landline | Date Established | Floor Area | No. of Aide
        field('Owner: ',            opts.owner          || '', ML,       y, 110);
        field('Mobile No. : ',      opts.mobile         || '', ML + 207, y, 80);
        field('Landline: ',         opts.landline        || '', ML + 350, y, 75);
        field('Date Established: ', opts.dateEstablished || '', ML + 480, y, 60);
        field('Floor Area: ',       opts.floorArea       || '', ML + 612, y, 45);
        field('No. of Aide: ',      opts.noOfAide        || '', ML + 694, y, 40);
        y += 12;

        // Bold double underline
        hline(ML, W - MR, y,     2);
        hline(ML, W - MR, y + 4, 0.6);
        y += 12;

        // TABLE
        const colMat   = 88;
        const colTotal = 44;
        const colWeeks = usableW - colMat - colTotal;
        const colWeek  = colWeeks / 4;
        const dayCount = 7;
        const dayW     = colWeek / dayCount;

        const rh0 = 16
        const rh1 = 14; 
        const rh2 = 11;
        const rh3 = 13;  
        const nMat = RECYCLABLE_MATERIALS.length;
        const tableH = rh0 + rh1 + rh2 + (nMat + 2) * rh3;  
        const tableTop = y;

        // Outer bold border
        doc.setDrawColor(0,0,0);
        doc.setLineWidth(0.8);
        doc.rect(ML, tableTop, usableW, tableH, 'S');

        // Title row
        let ry = tableTop;
        hline(ML, ML + usableW, ry + rh0, 0.6);
        doc.setFont('times', 'bold'); doc.setFontSize(9); doc.setTextColor(0,0,0);
        doc.text('COLLECTED RECYCLABLE MATERIALS (Kilos / Day)', W / 2, ry + rh0 - 4, { align: 'center' });
        ry += rh0;

        // Header row 1
        // RECYCLABLE cell
        box(ML, ry, colMat, rh1 + rh2);
        // Monthly Total cell
        const totX = ML + colMat + colWeeks;
        box(totX, ry, colTotal, rh1 + rh2);

        // WEEK 1-4
        let wx = ML + colMat;
        doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(0,0,0);
        for (let w = 1; w <= 4; w++) {
            box(wx, ry, colWeek, rh1);
            doc.text(`WEEK ${w}`, wx + colWeek / 2, ry + rh1 - 4, { align: 'center' });
            wx += colWeek;
        }

        // RECYCLABLE vertically centred
        doc.setFontSize(8);
        doc.text('RECYCLABLE', ML + colMat / 2, ry + (rh1 + rh2) / 2 + 3, { align: 'center' });

        // Monthly Total vertically
        doc.setFontSize(7.5);
        doc.text('Monthly', totX + colTotal / 2, ry + (rh1 + rh2) / 2 - 1, { align: 'center' });
        doc.text('Total',   totX + colTotal / 2, ry + (rh1 + rh2) / 2 + 9, { align: 'center' });

        ry += rh1;

        // Header row 2: D1..D7
        wx = ML + colMat;
        doc.setFont('times', 'bold'); doc.setFontSize(6.5); doc.setTextColor(0,0,0);
        for (let w = 0; w < 4; w++) {
            for (let d = 1; d <= dayCount; d++) {
                box(wx, ry, dayW, rh2);
                doc.text(`D ${d}`, wx + dayW / 2, ry + rh2 - 3, { align: 'center' });
                wx += dayW;
            }
        }
        ry += rh2;

        // Data rows
        RECYCLABLE_MATERIALS.forEach(mat => {
            const r = data[mat];

            box(ML, ry, colMat, rh3);
            doc.setFont('times', 'normal'); doc.setFontSize(8); doc.setTextColor(0,0,0);
            doc.text(mat, ML + 3, ry + rh3 - 4);

            wx = ML + colMat;
            [r.w1, r.w2, r.w3, r.w4].forEach(weekVal => {
                for (let d = 1; d <= dayCount; d++) {
                    box(wx, ry, dayW, rh3);
                    if (d === dayCount && weekVal > 0) {
                        doc.setFont('times', 'bold'); doc.setFontSize(6.5);
                        doc.text(String(weekVal), wx + dayW / 2, ry + rh3 - 3, { align: 'center' });
                        doc.setFont('times', 'normal'); doc.setFontSize(8);
                    }
                    wx += dayW;
                }
            });

            box(totX, ry, colTotal, rh3);
            if (r.total > 0) {
                doc.setFont('times', 'bold'); doc.setFontSize(8);
                doc.text(String(r.total), totX + colTotal / 2, ry + rh3 - 4, { align: 'center' });
            }

            ry += rh3;
        });

        // Two blank rows at bottom
        for (let i = 0; i < 2; i++) {
            box(ML, ry, colMat, rh3);
            wx = ML + colMat;
            for (let d = 0; d < 4 * dayCount; d++) { box(wx, ry, dayW, rh3); wx += dayW; }
            box(totX, ry, colTotal, rh3);
            ry += rh3;
        }

        y = ry + 16;

        // SIGNATURES
        ltext('Certified by:', ML, y, 9, 'bold');
        ltext('Monitored by:', W / 2 + 8, y, 9, 'bold');
        y += 28;

        const sigL = 175, dateL = 75;
        // Left side: signature line and Date line
        hline(ML,         ML + sigL,                  y, 0.8);
        hline(ML + sigL + 14, ML + sigL + 14 + dateL, y, 0.8);
        // Right side
        hline(W / 2 + 8,              W / 2 + 8 + sigL,                  y, 0.8);
        hline(W / 2 + 8 + sigL + 14,  W / 2 + 8 + sigL + 14 + dateL,    y, 0.8);

        y += 9;
        ltext('Junkshop Owner/In-Charge', ML,                   y, 9,   'bold');
        ltext('Date',                     ML + sigL + 20,        y, 9,   'normal');
        ltext('DPS - Monitoring',         W / 2 + 8,             y, 9,   'bold');
        ltext('Date',                     W / 2 + 8 + sigL + 20, y, 9,   'normal');

        y += 12;
        ltext('(Signature over printed name)', ML,        y, 7.5, 'normal');
        ltext('(Signature over printed name)', W / 2 + 8, y, 7.5, 'normal');

        y += 22;

        // BOTTOM TAGLINE
        hline(ML, W - MR, y,     2.5);
        hline(ML, W - MR, y + 4, 0.8);
        y += 18;

        ctext('\u201CBayanihan para sa Malinis na Kapaligiran\u201D', y, 10.5, 'bolditalic', [0, 70, 150]);
        y += 14;
        ctext('Ground Floor, Old Comelec Bldg. Lion\'s Road, Arroceros Street, Ermita Manila', y, 7.5);
        y += 11;
        ctext('Tel. no.: (02) 527 4967/ (02) 310 1261', y, 7.5);
        y += 11;
        ctext('Email: dps.cityofmanila@gmail.com', y, 7.5);

        // SAVE
        doc.save(`JunkshopMonitoringForm_${MONTHS[month]}${year}.pdf`);
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
            const s   = document.createElement('script');
            s.src     = src;
            s.onload  = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    return { exportPDF, exportCSV, aggregateData, RECYCLABLE_MATERIALS };

})();
