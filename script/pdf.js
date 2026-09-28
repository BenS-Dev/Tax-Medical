// PDF report, share and email actions. Everything here runs in the browser:
// the report is built from the figures already on the page and nothing is uploaded.

const REPORT_EMAIL = 'servicenow@wpg-plan.com';

const PDF_COLORS = {
    ink: [23, 48, 43],
    muted: [91, 109, 104],
    forest: [0, 77, 67],
    green: [0, 133, 63],
    personal: [154, 168, 164],
    mist: [238, 243, 241],
    rule: [219, 227, 224]
};

function readText(id) {
    const element = document.getElementById(id);
    return element ? element.textContent.replace(/\s+/g, ' ').trim() : '';
}

function readBreakdown(id) {
    const list = document.getElementById(id);
    if (!list) return [];
    return Array.from(list.querySelectorAll('li')).map((item) => {
        const spans = item.querySelectorAll('span');
        if (spans.length >= 2) {
            return [spans[0].textContent.trim(), spans[1].textContent.trim()];
        }
        return [item.textContent.trim(), ''];
    });
}

function collectReport() {
    const advantage = document.getElementById('taxAdvantage');
    const lead = advantage.querySelector('.advantage-lead');
    const amount = advantage.querySelector('strong');
    const detail = advantage.querySelector('.advantage-detail');

    return {
        date: new Date(),
        inputs: [
            ['Gross professional income', document.getElementById('grossIncome').value],
            ['Salary drawn from the corporation', document.getElementById('personalExpenses').value],
            ['Overhead', document.getElementById('overheadPercent').value],
            ['EI premiums', document.getElementById('includeEi').checked ? 'Included' : 'Excluded'],
            ['Self-employed', document.getElementById('selfEmployed').checked ? 'Yes' : 'No']
        ],
        verdict: {
            lead: lead ? lead.textContent.trim() : '',
            amount: amount ? amount.textContent.replace(/\s+/g, ' ').trim() : advantage.textContent.trim(),
            detail: detail ? detail.textContent.trim() : ''
        },
        personal: {
            title: 'Personal income',
            totalTax: readText('summaryPersonalTax'),
            rate: readText('summaryPersonalRate'),
            lines: [
                ['Gross income', readText('personalGross')],
                ['Federal tax', readText('federalTax')],
                ['Manitoba tax', readText('manitobaTax')],
                ['CPP contributions', readText('cppContrib')],
                ['EI premiums', readText('eiPremium')],
                ['Total tax and deductions', readText('totalPersonalTax'), 'total'],
                ['Take-home', readText('netPersonal'), 'net'],
                ['Effective tax rate', readText('effectivePersonal')]
            ],
            breakdowns: [
                ['Federal tax by bracket', readBreakdown('federalBreakdown')],
                ['Manitoba tax by bracket', readBreakdown('manitobaBreakdown')]
            ]
        },
        corporate: {
            title: 'Professional corporation',
            totalTax: readText('summaryCorpTax'),
            rate: readText('summaryCorpRate'),
            lines: [
                ['Gross corporate income', readText('corpGross')],
                ['Overhead', readText('corpOverhead')],
                ['Salary to you', readText('corpSalary')],
                ['Employer CPP and EI', readText('corpEmployerPayroll')],
                ['Corporate taxable income', readText('corpTaxable')],
                ['Corporate tax', readText('corpTax')],
                ['Personal tax on salary', readText('corpSalaryTax')],
                ['Your CPP and EI on salary', readText('corpSalaryPayroll')],
                ['Retained in corporation', readText('corpRetained')],
                ['Total tax paid', readText('totalCorpTax'), 'total'],
                ['Take-home plus retained', readText('netCorp'), 'net'],
                ['Effective tax rate', readText('effectiveCorp')]
            ],
            breakdowns: [
                ['Corporate tax detail', readBreakdown('corpBreakdown')],
                ['Salary federal tax by bracket', readBreakdown('corpSalaryFederalBreakdown')],
                ['Salary Manitoba tax by bracket', readBreakdown('corpSalaryProvincialBreakdown')]
            ]
        }
    };
}

function formatReportDate(date) {
    return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function reportFileName(date) {
    const stamp = date.toISOString().slice(0, 10);
    return `WPG-physician-tax-comparison-${stamp}.pdf`;
}

async function buildReportPdf() {
    const { jsPDF } = window.jspdf;
    const report = collectReport();
    const logo = typeof WPG_LOGO_PNG !== 'undefined' ? WPG_LOGO_PNG : null;

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const setColor = (color) => doc.setTextColor(...color);
    const rule = (atY, color = PDF_COLORS.rule) => {
        doc.setDrawColor(...color);
        doc.setLineWidth(0.75);
        doc.line(margin, atY, pageWidth - margin, atY);
    };
    const ensureSpace = (needed) => {
        if (y + needed > pageHeight - margin - 10) {
            doc.addPage();
            y = margin;
        }
    };

    // Header
    if (logo) {
        const logoWidth = 170;
        doc.addImage(logo.data, 'PNG', margin, y - 14, logoWidth, logoWidth * logo.ratio, undefined, 'FAST');
    } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        setColor(PDF_COLORS.forest);
        doc.text('The Wealth Planning Group Inc.', margin, y + 6);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setColor(PDF_COLORS.muted);
    doc.text(formatReportDate(report.date), pageWidth - margin, y + 2, { align: 'right' });
    doc.text('2026 rates', pageWidth - margin, y + 14, { align: 'right' });
    y += 40;
    rule(y);
    y += 30;

    doc.setFont('times', 'normal');
    doc.setFontSize(24);
    setColor(PDF_COLORS.forest);
    doc.text('Physician tax comparison', margin, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setColor(PDF_COLORS.muted);
    doc.text('Personal income compared with a professional corporation.', margin, y);
    y += 26;

    // Inputs
    doc.setFillColor(...PDF_COLORS.mist);
    const inputRowHeight = 16;
    const inputBoxHeight = report.inputs.length * inputRowHeight + 30;
    doc.roundedRect(margin, y, contentWidth, inputBoxHeight, 6, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setColor(PDF_COLORS.ink);
    doc.text('Your numbers', margin + 14, y + 20);
    let inputY = y + 38;
    report.inputs.forEach(([label, value]) => {
        doc.setFont('helvetica', 'normal');
        setColor(PDF_COLORS.muted);
        doc.text(label, margin + 14, inputY);
        doc.setFont('helvetica', 'bold');
        setColor(PDF_COLORS.ink);
        doc.text(value || '-', pageWidth - margin - 14, inputY, { align: 'right' });
        inputY += inputRowHeight;
    });
    y += inputBoxHeight + 20;

    // Verdict
    if (report.verdict.lead) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        setColor(PDF_COLORS.ink);
        doc.text(report.verdict.lead, margin, y);
        y += 30;
    }
    doc.setFont('times', 'normal');
    doc.setFontSize(report.verdict.lead ? 30 : 14);
    setColor(PDF_COLORS.green);
    doc.text(report.verdict.amount, margin, y);
    y += 18;
    if (report.verdict.detail) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        setColor(PDF_COLORS.muted);
        const detailLines = doc.splitTextToSize(report.verdict.detail, contentWidth);
        doc.text(detailLines, margin, y);
        y += detailLines.length * 12;
    }
    y += 18;

    // Total tax bars
    const personalValue = Number(report.personal.totalTax.replace(/[^0-9.-]/g, '')) || 0;
    const corporateValue = Number(report.corporate.totalTax.replace(/[^0-9.-]/g, '')) || 0;
    const largest = Math.max(personalValue, corporateValue, 1);
    [
        ['Earning personally', report.personal, personalValue, PDF_COLORS.personal],
        ['Through a corporation', report.corporate, corporateValue, PDF_COLORS.green]
    ].forEach(([label, side, value, color]) => {
        rule(y);
        y += 18;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        setColor(PDF_COLORS.ink);
        doc.text(label, margin, y);
        doc.setFontSize(12);
        doc.text(side.totalTax, pageWidth - margin, y, { align: 'right' });
        y += 9;
        doc.setFillColor(...PDF_COLORS.mist);
        doc.rect(margin, y, contentWidth, 7, 'F');
        doc.setFillColor(...color);
        doc.rect(margin, y, contentWidth * (value / largest), 7, 'F');
        y += 16;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        setColor(PDF_COLORS.muted);
        doc.text(`Total tax, ${side.rate}`, margin, y);
        y += 12;
    });
    rule(y);
    y += 24;

    // Line-by-line statements, side by side (title row plus 18pt per line)
    ensureSpace(14 + Math.max(report.personal.lines.length, report.corporate.lines.length) * 18);
    const gap = 24;
    const columnWidth = (contentWidth - gap) / 2;
    const drawStatement = (side, x, startY, swatch) => {
        let lineY = startY;
        doc.setFillColor(...swatch);
        doc.rect(x, lineY - 7, 7, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        setColor(PDF_COLORS.ink);
        doc.text(side.title, x + 13, lineY);
        lineY += 12;
        side.lines.forEach(([label, value, kind]) => {
            doc.setDrawColor(...PDF_COLORS.rule);
            doc.line(x, lineY, x + columnWidth, lineY);
            lineY += 13;
            if (kind === 'net') {
                doc.setFillColor(...PDF_COLORS.mist);
                doc.rect(x, lineY - 10.5, columnWidth, 15, 'F');
            }
            const emphasised = kind === 'total' || kind === 'net';
            doc.setFont('helvetica', emphasised ? 'bold' : 'normal');
            doc.setFontSize(9.5);
            setColor(emphasised ? PDF_COLORS.ink : PDF_COLORS.muted);
            doc.text(label, x + 4, lineY);
            doc.setFont('helvetica', 'bold');
            setColor(kind === 'net' ? PDF_COLORS.forest : PDF_COLORS.ink);
            doc.text(value, x + columnWidth - 4, lineY, { align: 'right' });
            lineY += 5;
        });
        return lineY;
    };
    const leftEnd = drawStatement(report.personal, margin, y, PDF_COLORS.personal);
    const rightEnd = drawStatement(report.corporate, margin + columnWidth + gap, y, PDF_COLORS.green);
    y = Math.max(leftEnd, rightEnd) + 30;

    // Bracket detail
    const breakdowns = [...report.personal.breakdowns, ...report.corporate.breakdowns]
        .filter(([, rows]) => rows.length);
    if (breakdowns.length) {
        ensureSpace(60);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        setColor(PDF_COLORS.ink);
        doc.text('Bracket detail', margin, y);
        y += 20;
        breakdowns.forEach(([title, rows]) => {
            ensureSpace(30 + rows.length * 13);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            setColor(PDF_COLORS.forest);
            doc.text(title, margin, y);
            y += 13;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            rows.forEach(([label, value]) => {
                setColor(PDF_COLORS.muted);
                doc.text(label, margin, y);
                setColor(PDF_COLORS.ink);
                doc.text(value, pageWidth - margin, y, { align: 'right' });
                y += 12;
            });
            y += 10;
        });
    }

    // Disclaimer
    const notes = [
        'Estimate based on 2026 federal and Manitoba rates, assuming the small business deduction applies (9% on the first $500,000 of active business income, 27% above).',
        'Retained earnings are taxed again when paid out as dividends; that second layer is not shown.',
        'RRSP contributions, other deductions and advanced strategies are not included.',
        'Talk to a tax professional before making decisions based on these figures.'
    ];
    ensureSpace(40 + notes.length * 13);
    y += 6;
    rule(y);
    y += 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    setColor(PDF_COLORS.ink);
    doc.text('What this estimate leaves out', margin, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setColor(PDF_COLORS.muted);
    notes.forEach((note) => {
        const noteLines = doc.splitTextToSize(note, contentWidth - 10);
        doc.text('•', margin, y);
        doc.text(noteLines, margin + 10, y);
        y += noteLines.length * 11 + 2;
    });

    // Full disclaimer, taken from the page so the site and the PDF always match
    const disclaimerParagraphs = Array.from(document.querySelectorAll('#disclaimerText p'))
        .map((paragraph) => paragraph.textContent.replace(/\s+/g, ' ').trim());
    if (disclaimerParagraphs.length) {
        doc.setFontSize(8.5);
        const wrapped = disclaimerParagraphs.map((paragraph) => doc.splitTextToSize(paragraph, contentWidth - 24));
        const boxHeight = 40 + wrapped.reduce((total, lines) => total + lines.length * 11 + 6, 0);
        y += 8;
        ensureSpace(boxHeight);
        doc.setDrawColor(...PDF_COLORS.rule);
        doc.setLineWidth(0.75);
        doc.roundedRect(margin, y, contentWidth, boxHeight, 6, 6, 'S');
        let textY = y + 22;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        setColor(PDF_COLORS.ink);
        doc.text('Important disclaimer', margin + 12, textY);
        textY += 16;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        setColor(PDF_COLORS.muted);
        wrapped.forEach((lines) => {
            doc.text(lines, margin + 12, textY);
            textY += lines.length * 11 + 6;
        });
        y += boxHeight;
    }

    // Footer on every page
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        setColor(PDF_COLORS.muted);
        doc.text('The Wealth Planning Group Inc.', margin, pageHeight - 34);
        doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 34, { align: 'right' });
        doc.setFontSize(7.5);
        doc.text('For educational purposes only. Not tax, legal or financial advice. Results are estimates and are not guaranteed.', margin, pageHeight - 22);
    }

    return { doc, report, fileName: reportFileName(report.date) };
}

function setReportStatus(message) {
    const status = document.getElementById('reportStatus');
    if (status) status.textContent = message;
}

async function downloadReport() {
    const { doc, fileName } = await buildReportPdf();
    doc.save(fileName);
    return fileName;
}

async function shareReport() {
    const { doc, fileName } = await buildReportPdf();
    const file = new File([doc.output('blob')], fileName, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: 'Physician tax comparison',
                text: 'Personal income compared with a professional corporation, from WPG.'
            });
            setReportStatus('');
        } catch (error) {
            if (error.name !== 'AbortError') {
                setReportStatus('Sharing didn\'t work in this browser. Use Download PDF instead.');
            }
        }
        return;
    }

    doc.save(fileName);
    setReportStatus('This browser can\'t share files, so the PDF was downloaded instead.');
}

async function emailReport() {
    const { doc, report, fileName } = await buildReportPdf();
    doc.save(fileName);

    const summaryLines = [
        ...report.inputs.map(([label, value]) => `${label}: ${value}`),
        '',
        `Total tax earning personally: ${report.personal.totalTax} (${report.personal.rate})`,
        `Total tax through a corporation: ${report.corporate.totalTax} (${report.corporate.rate})`,
        `${report.verdict.lead} ${report.verdict.amount}`.trim()
    ];
    const body = [
        'Hello WPG,',
        '',
        'I ran the physician tax calculator and would like to talk through the results.',
        '',
        ...summaryLines,
        '',
        `[Attach ${fileName} from your downloads folder before sending.]`
    ].join('\n');

    const subject = `Physician tax comparison, ${formatReportDate(report.date)}`;
    window.location.href = `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setReportStatus(`Your email app should open now. Attach ${fileName} from your downloads before sending.`);
}

function runReportAction(button, action) {
    button.addEventListener('click', async () => {
        if (!window.jspdf) {
            setReportStatus('The PDF tool didn\'t load. Refresh the page and try again.');
            return;
        }
        button.disabled = true;
        setReportStatus('');
        try {
            await action();
        } catch (error) {
            console.error(error);
            setReportStatus('The PDF couldn\'t be created. Refresh the page and try again.');
        } finally {
            button.disabled = false;
        }
    });
}

const downloadButton = document.getElementById('downloadPdf');
const shareButton = document.getElementById('sharePdf');
const emailButton = document.getElementById('emailPdf');

if (downloadButton) runReportAction(downloadButton, downloadReport);
if (emailButton) runReportAction(emailButton, emailReport);
if (shareButton) {
    // Only offer sharing where the browser can share files (most phones, Safari on Mac).
    const probe = new File([''], 'probe.pdf', { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [probe] })) {
        runReportAction(shareButton, shareReport);
    } else {
        shareButton.hidden = true;
    }
}
