const federalBrackets = [
    { min: 0, max: 55_867, rate: 0.15 },
    { min: 55_867, max: 111_733, rate: 0.205 },
    { min: 111_733, max: 173_205, rate: 0.26 },
    { min: 173_205, max: 246_752, rate: 0.29 },
    { min: 246_752, max: Number.POSITIVE_INFINITY, rate: 0.33 }
];

const manitobaBrackets = [
    { min: 0, max: 47_000, rate: 0.108 },
    { min: 47_000, max: 100_000, rate: 0.1275 },
    { min: 100_000, max: Number.POSITIVE_INFINITY, rate: 0.174 }
];

const CPP_RATE = 0.0595;
const CPP_BASE = 3_500;
const CPP_MAX = 7_994.4;
const EI_RATE = 0.0166;
const EI_MAX = 1_049.12;
const SMALL_BUSINESS_RATE = 0.11;

function formatInputCurrency(value) {
    const digitsOnly = value.replace(/[^\d]/g, '');

    if (!digitsOnly) {
        return '';
    }

    const amount = Number.parseInt(digitsOnly, 10);

    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function parseInputCurrency(value) {
    return Number.parseFloat(value.replace(/[^\d]/g, '')) || 0;
}

function handleInputFormat(inputId) {
    const input = document.getElementById(inputId);

    const previousLength = input.value.length;
    const cursorPosition = input.selectionStart;
    const numericValue = parseInputCurrency(input.value);

    if (numericValue > 0) {
        input.value = formatInputCurrency(input.value);
    }

    const newLength = input.value.length;
    const delta = newLength - previousLength;
    const nextCursor = Math.max(0, cursorPosition + delta);

    input.setSelectionRange(nextCursor, nextCursor);
}

function calculateBracketDetail(income, brackets) {
    let remaining = income;
    const breakdown = [];
    let total = 0;

    for (const bracket of brackets) {
        if (remaining <= 0) {
            break;
        }

        const span = bracket.max - bracket.min;
        const taxablePortion = Math.max(Math.min(remaining, span), 0);

        if (taxablePortion > 0) {
            const taxForBracket = taxablePortion * bracket.rate;
            total += taxForBracket;
            breakdown.push({
                range: formatBracketRange(bracket.min, bracket.max),
                amount: taxablePortion,
                tax: taxForBracket,
                rate: bracket.rate
            });
            remaining -= taxablePortion;
        }
    }

    return { total, breakdown };
}

function formatBracketRange(min, max) {
    const lower = formatCurrency(min);
    if (!Number.isFinite(max)) {
        return `${lower}+`;
    }

    const upper = formatCurrency(max);
    return `${lower} - ${upper}`;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatPercent(rate) {
    return `${(rate * 100).toFixed(1).replace(/\.0$/, '')}%`;
}

function renderBreakdown(elementId, entries) {
    const listElement = document.getElementById(elementId);

    if (!listElement) {
        return;
    }

    if (!entries.length) {
        listElement.innerHTML = '<li><span>No tax owed in this bracket.</span></li>';
        return;
    }

    listElement.innerHTML = entries
        .map((entry) => {
            return `<li><span>${entry.range}</span><span>${formatPercent(entry.rate)} on ${formatCurrency(entry.amount)} = ${formatCurrency(entry.tax)}</span></li>`;
        })
        .join('');
}

function refreshEiToggleDescription(includeEi) {
    const strong = document.querySelector('.toggle-display strong');
    const detail = document.querySelector('.toggle-display small');

    if (!strong || !detail) {
        return;
    }

    strong.textContent = includeEi ? 'EI premiums included in calculation' : 'EI premiums excluded from calculation';
    detail.textContent = includeEi
        ? 'Uncheck if the physician is EI-exempt (e.g., incorporated owner-manager).'
        : 'Re-enable if EI premiums should be part of the personal tax projection.';
}

function calculateTax() {
    const grossIncome = parseInputCurrency(document.getElementById('grossIncome').value);
    const personalExpenses = parseInputCurrency(document.getElementById('personalExpenses').value) || 100_000;
    const includeEi = document.getElementById('includeEi').checked;

    refreshEiToggleDescription(includeEi);

    const personalFederalDetail = calculateBracketDetail(grossIncome, federalBrackets);
    const personalProvincialDetail = calculateBracketDetail(grossIncome, manitobaBrackets);
    const cpp = Math.min(Math.max(grossIncome - CPP_BASE, 0) * CPP_RATE, CPP_MAX);
    const ei = includeEi ? Math.min(grossIncome * EI_RATE, EI_MAX) : 0;

    const totalPersonalTax = personalFederalDetail.total + personalProvincialDetail.total + cpp + ei;
    const netPersonal = grossIncome - totalPersonalTax;
    const effectivePersonalRate = grossIncome > 0 ? ((totalPersonalTax / grossIncome) * 100).toFixed(2) : '0.00';

    const corpTax = grossIncome * SMALL_BUSINESS_RATE;
    const corpAfterTax = grossIncome - corpTax;
    const salary = Math.min(personalExpenses, corpAfterTax);

    const salaryFederalDetail = calculateBracketDetail(salary, federalBrackets);
    const salaryProvincialDetail = calculateBracketDetail(salary, manitobaBrackets);
    const salaryCpp = Math.min(Math.max(salary - CPP_BASE, 0) * CPP_RATE, CPP_MAX);
    const salaryEi = includeEi ? Math.min(salary * EI_RATE, EI_MAX) : 0;
    const salaryTax = salaryFederalDetail.total + salaryProvincialDetail.total + salaryCpp + salaryEi;

    const netSalary = salary - salaryTax;
    const retained = corpAfterTax - salary;
    const totalCorpTax = corpTax + salaryTax;
    const netCorp = netSalary + retained;
    const effectiveCorpRate = grossIncome > 0 ? ((totalCorpTax / grossIncome) * 100).toFixed(2) : '0.00';

    const corporateBreakdown = grossIncome > 0 ? [{ range: 'Active business income', amount: grossIncome, tax: corpTax, rate: SMALL_BUSINESS_RATE }] : [];

    updatePersonalResults({
        grossIncome,
        federalTax: personalFederalDetail.total,
        provincialTax: personalProvincialDetail.total,
        cpp,
        ei,
        totalPersonalTax,
        netPersonal,
        effectivePersonalRate,
        federalBreakdown: personalFederalDetail.breakdown,
        provincialBreakdown: personalProvincialDetail.breakdown
    });

    updateCorporateResults({
        grossIncome,
        corpTax,
        corpAfterTax,
        salary,
        salaryTax,
        retained,
        totalCorpTax,
        netCorp,
        effectiveCorpRate,
        corpBreakdown: corporateBreakdown,
        salaryFederalBreakdown: salaryFederalDetail.breakdown,
        salaryProvincialBreakdown: salaryProvincialDetail.breakdown
    });

    updateSummary(totalPersonalTax, effectivePersonalRate, totalCorpTax, effectiveCorpRate);

    updateAdvantage(netCorp - netPersonal, grossIncome);
}

function updateSummary(personalTax, personalRate, corporateTax, corporateRate) {
    document.getElementById('summaryPersonalTax').textContent = formatCurrency(personalTax);
    document.getElementById('summaryPersonalRate').textContent = `${personalRate}% effective rate`;
    document.getElementById('summaryCorpTax').textContent = formatCurrency(corporateTax);
    document.getElementById('summaryCorpRate').textContent = `${corporateRate}% effective rate`;
}

function updatePersonalResults(data) {
    document.getElementById('personalGross').textContent = formatCurrency(data.grossIncome);
    document.getElementById('federalTax').textContent = formatCurrency(data.federalTax);
    document.getElementById('manitobaTax').textContent = formatCurrency(data.provincialTax);
    document.getElementById('cppContrib').textContent = formatCurrency(data.cpp);
    document.getElementById('eiPremium').textContent = formatCurrency(data.ei);
    document.getElementById('totalPersonalTax').textContent = formatCurrency(data.totalPersonalTax);
    document.getElementById('netPersonal').textContent = formatCurrency(data.netPersonal);
    document.getElementById('effectivePersonal').textContent = `${data.effectivePersonalRate}%`;

    renderBreakdown('federalBreakdown', data.federalBreakdown);
    renderBreakdown('manitobaBreakdown', data.provincialBreakdown);
}

function updateCorporateResults(data) {
    document.getElementById('corpGross').textContent = formatCurrency(data.grossIncome);
    document.getElementById('corpTax').textContent = formatCurrency(data.corpTax);
    document.getElementById('corpAfterTax').textContent = formatCurrency(data.corpAfterTax);
    document.getElementById('corpSalary').textContent = formatCurrency(data.salary);
    document.getElementById('corpSalaryTax').textContent = formatCurrency(data.salaryTax);
    document.getElementById('corpRetained').textContent = formatCurrency(data.retained);
    document.getElementById('totalCorpTax').textContent = formatCurrency(data.totalCorpTax);
    document.getElementById('netCorp').textContent = formatCurrency(data.netCorp);
    document.getElementById('effectiveCorp').textContent = `${data.effectiveCorpRate}%`;

    renderBreakdown('corpBreakdown', data.corpBreakdown || []);
    renderBreakdown('corpSalaryFederalBreakdown', data.salaryFederalBreakdown || []);
    renderBreakdown('corpSalaryProvincialBreakdown', data.salaryProvincialBreakdown || []);
}

function updateAdvantage(advantage, grossIncome) {
    const advantageElement = document.getElementById('taxAdvantage');

    if (grossIncome === 0) {
        advantageElement.className = 'advantage';
        advantageElement.textContent = 'Enter an income amount to see tax comparison';
        return;
    }

    if (advantage > 0) {
        advantageElement.className = 'advantage corporate';
        advantageElement.innerHTML = `
            <strong>Corporate structure provides a tax advantage of ${formatCurrency(advantage)}</strong>
            You save ${formatCurrency(advantage)} by incorporating (${((advantage / grossIncome) * 100).toFixed(1)}% of gross income)
        `;
        return;
    }

    const personalAdvantage = Math.abs(advantage);
    advantageElement.className = 'advantage personal';
    advantageElement.innerHTML = `
        <strong>Personal income structure provides a tax advantage of ${formatCurrency(personalAdvantage)}</strong>
        You save ${formatCurrency(personalAdvantage)} by remaining unincorporated (${((personalAdvantage / grossIncome) * 100).toFixed(1)}% of gross income)
    `;
}

document.getElementById('grossIncome').addEventListener('input', () => {
    handleInputFormat('grossIncome');
    calculateTax();
});

document.getElementById('personalExpenses').addEventListener('input', () => {
    handleInputFormat('personalExpenses');
    calculateTax();
});

document.getElementById('grossIncome').addEventListener('focus', (event) => {
    event.target.select();
});

document.getElementById('personalExpenses').addEventListener('focus', (event) => {
    event.target.select();
});

document.getElementById('includeEi').addEventListener('change', () => {
    calculateTax();
});

calculateTax();
