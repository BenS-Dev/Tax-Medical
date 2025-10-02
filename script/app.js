// 2024 Tax Constants - CORRECTED
const FEDERAL_MAX_BASIC_PERSONAL_AMOUNT = 15_705;
const FEDERAL_MIN_BASIC_PERSONAL_AMOUNT = 14_156;
const FEDERAL_BASIC_PERSONAL_PHASEOUT_START = 173_205;
const FEDERAL_BASIC_PERSONAL_PHASEOUT_END = 246_752;
const FEDERAL_LOW_RATE = 0.15;

const MANITOBA_BASIC_PERSONAL_AMOUNT = 15_000;  // FIXED: Updated for 2024 (was incorrectly 11,402)
const MANITOBA_LOW_RATE = 0.108;

const CANADA_EMPLOYMENT_AMOUNT = 1_433; // ADDED: Missing federal employment credit

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

// FIXED: CPP/EI values for employees (not self-employed)
const CPP_RATE = 0.0595;
const CPP_BASE_EXEMPTION = 3_500;
const CPP_YMPE = 68_500;  // Year's Maximum Pensionable Earnings
const CPP_YAMPE = 73_200; // Year's Additional Maximum Pensionable Earnings (CPP2)
const CPP_BASE_MAX = 3_867.50;  // Employee base CPP maximum
const CPP2_RATE = 0.04;
const CPP2_MAX = 188.00;  // Employee CPP2 maximum
const CPP_ENHANCED_MAX = 838.00; // Total enhanced CPP deduction ($650 CPP1 + $188 CPP2)
const CPP_BASE_CREDIT_AMOUNT = 3_217.50; // Base CPP eligible for tax credit

const EI_RATE = 0.0166;
const EI_MAX_INSURABLE = 63_200;
const EI_MAX = 1_049.12;

const SMALL_BUSINESS_RATE = 0.11;

function formatInputCurrency(value) {
    const digitsOnly = String(value).replace(/[^\d]/g, '');

    if (digitsOnly === '') {
        return '';
    }

    const amount = Number.parseInt(digitsOnly, 10);
    return formatCurrency(amount);
}

function parseInputCurrency(value) {
    return Number.parseFloat(value.replace(/[^\d]/g, '')) || 0;
}

function handleInputFormat(inputId) {
    const input = document.getElementById(inputId);
    const previousLength = input.value.length;
    const cursorPosition = typeof input.selectionStart === 'number' ? input.selectionStart : previousLength;
    const digitsOnly = input.value.replace(/[^\d]/g, '');

    if (digitsOnly === '') {
        input.value = '';
        input.setSelectionRange(0, 0);
        return;
    }

    const formatted = formatInputCurrency(digitsOnly);
    input.value = formatted;

    const newLength = formatted.length;
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
            if (entry.isCredit) {
                const detail = entry.amount ? ` (${formatCurrency(entry.amount)} applied)` : '';
                return `<li><span>${entry.range}${detail}</span><span>${formatCurrency(entry.tax)}</span></li>`;
            }

            return `<li><span>${entry.range}</span><span>${formatPercent(entry.rate)} on ${formatCurrency(entry.amount)} = ${formatCurrency(entry.tax)}</span></li>`;
        })
        .join('');
}

function getFederalBasicPersonalAmount(income) {
    if (income <= FEDERAL_BASIC_PERSONAL_PHASEOUT_START) {
        return FEDERAL_MAX_BASIC_PERSONAL_AMOUNT;
    }

    if (income >= FEDERAL_BASIC_PERSONAL_PHASEOUT_END) {
        return FEDERAL_MIN_BASIC_PERSONAL_AMOUNT;
    }

    const reductionRange = FEDERAL_BASIC_PERSONAL_PHASEOUT_END - FEDERAL_BASIC_PERSONAL_PHASEOUT_START;
    const reduction = ((income - FEDERAL_BASIC_PERSONAL_PHASEOUT_START) / reductionRange)
        * (FEDERAL_MAX_BASIC_PERSONAL_AMOUNT - FEDERAL_MIN_BASIC_PERSONAL_AMOUNT);

    return FEDERAL_MAX_BASIC_PERSONAL_AMOUNT - reduction;
}

// FIXED: Now properly handles enhanced CPP deduction
function applyFederalCredits(detail, grossIncome) {
    const originalTax = detail.total;
    
    // Basic Personal Amount credit
    const basicPersonalAmount = getFederalBasicPersonalAmount(grossIncome);
    const bpaCredit = basicPersonalAmount * FEDERAL_LOW_RATE;
    
    // Canada Employment Amount credit (ADDED)
    const employmentCredit = CANADA_EMPLOYMENT_AMOUNT * FEDERAL_LOW_RATE;
    
    // CPP Base credit (only the base portion, not enhanced)
    const cppCredit = CPP_BASE_CREDIT_AMOUNT * FEDERAL_LOW_RATE;
    
    const totalCredits = bpaCredit + employmentCredit + cppCredit;
    const appliedCredits = Math.min(totalCredits, originalTax);

    if (appliedCredits <= 0) {
        return detail;
    }

    detail.total = originalTax - appliedCredits;
    detail.breakdown.push({
        range: 'Federal basic personal amount credit',
        amount: Math.min(basicPersonalAmount, grossIncome),
        tax: -bpaCredit,
        isCredit: true
    });
    
    detail.breakdown.push({
        range: 'Canada employment amount credit',
        amount: CANADA_EMPLOYMENT_AMOUNT,
        tax: -employmentCredit,
        isCredit: true
    });
    
    detail.breakdown.push({
        range: 'CPP base contributions credit',
        amount: CPP_BASE_CREDIT_AMOUNT,
        tax: -cppCredit,
        isCredit: true
    });

    return detail;
}

// FIXED: Now includes CPP credit
function applyManitobaCredits(detail, grossIncome) {
    const originalTax = detail.total;
    
    // Basic Personal Amount credit
    const bpaCredit = MANITOBA_BASIC_PERSONAL_AMOUNT * MANITOBA_LOW_RATE;
    
    // CPP Base credit (provincial portion)
    const cppCredit = CPP_BASE_CREDIT_AMOUNT * MANITOBA_LOW_RATE;
    
    const totalCredits = bpaCredit + cppCredit;
    const appliedCredits = Math.min(totalCredits, originalTax);

    if (appliedCredits <= 0) {
        return detail;
    }

    detail.total = originalTax - appliedCredits;
    detail.breakdown.push({
        range: 'Manitoba basic personal amount credit',
        amount: Math.min(MANITOBA_BASIC_PERSONAL_AMOUNT, grossIncome),
        tax: -bpaCredit,
        isCredit: true
    });
    
    detail.breakdown.push({
        range: 'CPP base contributions credit',
        amount: CPP_BASE_CREDIT_AMOUNT,
        tax: -cppCredit,
        isCredit: true
    });

    return detail;
}

function refreshEiToggleDescription(includeEi) {
    const strong = document.querySelector('.toggle-display strong');
    const detail = document.querySelector('.toggle-display small');

    if (!strong || !detail) {
        return;
    }

    strong.textContent = includeEi ? 'EI premiums included in calculation' : 'EI premiums excluded from calculation';
    detail.textContent = includeEi
        ? 'Disable if the physician is EI-exempt (e.g., incorporated owner-manager).'
        : 'Enable if EI premiums should be part of the personal tax projection.';
}

function calculateTax() {
    const grossIncome = parseInputCurrency(document.getElementById('grossIncome').value);
    const personalExpensesField = document.getElementById('personalExpenses');
    const personalExpenses = personalExpensesField.value.trim() === ''
        ? 100_000
        : parseInputCurrency(personalExpensesField.value);
    const includeEi = document.getElementById('includeEi').checked;

    refreshEiToggleDescription(includeEi);

    // FIXED: Calculate taxable income after CPP enhanced deduction
    const taxableIncome = grossIncome - CPP_ENHANCED_MAX;

    const personalFederalDetail = applyFederalCredits(
        calculateBracketDetail(taxableIncome, federalBrackets),
        taxableIncome
    );
    const personalProvincialDetail = applyManitobaCredits(
        calculateBracketDetail(taxableIncome, manitobaBrackets),
        taxableIncome
    );
    
    // FIXED: CPP calculated correctly for employees
    const cppBase = Math.min((CPP_YMPE - CPP_BASE_EXEMPTION) * CPP_RATE, CPP_BASE_MAX);
    const cpp2 = grossIncome > CPP_YMPE ? Math.min((Math.min(grossIncome, CPP_YAMPE) - CPP_YMPE) * CPP2_RATE, CPP2_MAX) : 0;
    const cpp = cppBase + cpp2;
    
    const ei = includeEi ? Math.min(grossIncome * EI_RATE, EI_MAX) : 0;

    const totalPersonalTax = personalFederalDetail.total + personalProvincialDetail.total + cpp + ei;
    const netPersonal = grossIncome - totalPersonalTax;
    const effectivePersonalRate = grossIncome > 0 ? ((totalPersonalTax / grossIncome) * 100).toFixed(2) : '0.00';

    const corpTax = grossIncome * SMALL_BUSINESS_RATE;
    const corpAfterTax = grossIncome - corpTax;
    const salary = Math.min(personalExpenses, corpAfterTax);

    // FIXED: Corporate salary also uses CPP enhanced deduction
    const salaryTaxableIncome = salary - Math.min(CPP_ENHANCED_MAX, salary > CPP_BASE_EXEMPTION ? CPP_ENHANCED_MAX : 0);
    
    const salaryFederalDetail = applyFederalCredits(
        calculateBracketDetail(salaryTaxableIncome, federalBrackets),
        salaryTaxableIncome
    );
    const salaryProvincialDetail = applyManitobaCredits(
        calculateBracketDetail(salaryTaxableIncome, manitobaBrackets),
        salaryTaxableIncome
    );
    
    const salaryCppBase = salary > CPP_BASE_EXEMPTION ? Math.min((Math.min(salary, CPP_YMPE) - CPP_BASE_EXEMPTION) * CPP_RATE, CPP_BASE_MAX) : 0;
    const salaryCpp2 = salary > CPP_YMPE ? Math.min((Math.min(salary, CPP_YAMPE) - CPP_YMPE) * CPP2_RATE, CPP2_MAX) : 0;
    const salaryCpp = salaryCppBase + salaryCpp2;
    
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

    updateSummary({
        personalTax: totalPersonalTax,
        personalRate: effectivePersonalRate,
        personalFederal: personalFederalDetail.total,
        personalProvincial: personalProvincialDetail.total,
        personalCPP: cpp,
        personalEI: ei,
        corporateTax: totalCorpTax,
        corporateRate: effectiveCorpRate,
        corporateCorporateTax: corpTax,
        corporatePersonalTax: salaryTax
    });

    updateAdvantage(netCorp - netPersonal, grossIncome);
}

function updateSummary(summary) {
    document.getElementById('summaryPersonalTax').textContent = formatCurrency(summary.personalTax);
    document.getElementById('summaryPersonalRate').textContent = `${summary.personalRate}% effective rate`;
    document.getElementById('summaryCorpTax').textContent = formatCurrency(summary.corporateTax);
    document.getElementById('summaryCorpRate').textContent = `${summary.corporateRate}% effective rate`;

    document.getElementById('summaryPersonalFederal').textContent = formatCurrency(summary.personalFederal);
    document.getElementById('summaryPersonalProvincial').textContent = formatCurrency(summary.personalProvincial);
    document.getElementById('summaryPersonalCPP').textContent = formatCurrency(summary.personalCPP);
    document.getElementById('summaryPersonalEI').textContent = formatCurrency(summary.personalEI);

    document.getElementById('summaryCorporateTax').textContent = formatCurrency(summary.corporateCorporateTax);
    document.getElementById('summaryCorporatePersonalTax').textContent = formatCurrency(summary.corporatePersonalTax);
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