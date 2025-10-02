// 2024 Tax Constants - CORRECTED
const FEDERAL_MAX_BASIC_PERSONAL_AMOUNT = 15_705;
const FEDERAL_MIN_BASIC_PERSONAL_AMOUNT = 14_156;
const FEDERAL_BASIC_PERSONAL_PHASEOUT_START = 173_205;
const FEDERAL_BASIC_PERSONAL_PHASEOUT_END = 246_752;
const FEDERAL_LOW_RATE = 0.15;

const MANITOBA_BASIC_PERSONAL_AMOUNT = 15_000;
const MANITOBA_LOW_RATE = 0.108;

const CANADA_EMPLOYMENT_AMOUNT = 1_433;

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

// CPP Constants
const CPP_BASE_EXEMPTION = 3_500;
const CPP_YMPE = 68_500;
const CPP_YAMPE = 73_200;

// Employee CPP
const CPP_EMPLOYEE_RATE = 0.0595;
const CPP_BASE_MAX = 3_867.50;
const CPP2_EMPLOYEE_RATE = 0.04;
const CPP2_MAX = 188.00;

// Self-Employed CPP
const CPP_SELF_EMPLOYED_RATE = 0.119;
const CPP_SELF_EMPLOYED_BASE_MAX = 7_735.00;
const CPP2_SELF_EMPLOYED_RATE = 0.08;
const CPP2_SELF_EMPLOYED_MAX = 376.00;

// CPP Tax Treatment
const CPP_ENHANCED_MAX = 838.00;
const CPP_BASE_CREDIT_AMOUNT = 3_217.50;

// EI Constants
const EI_RATE = 0.0166;
const EI_MAX_INSURABLE = 63_200;
const EI_MAX = 1_049.12;

const SMALL_BUSINESS_RATE = 0.11;

function formatInputCurrency(value) {
    const digitsOnly = String(value).replace(/[^\d]/g, '');
    if (digitsOnly === '') return '';
    return formatCurrency(Number.parseInt(digitsOnly, 10));
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
        if (remaining <= 0) break;

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
    if (!Number.isFinite(max)) return `${lower}+`;
    return `${lower} - ${formatCurrency(max)}`;
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
    if (!listElement) return;

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
    const reduction = ((income - FEDERAL_BASIC_PERSONAL_PHASEOUT_START) / reductionRange) * 
                      (FEDERAL_MAX_BASIC_PERSONAL_AMOUNT - FEDERAL_MIN_BASIC_PERSONAL_AMOUNT);
    return FEDERAL_MAX_BASIC_PERSONAL_AMOUNT - reduction;
}

function refreshEiToggleDescription(includeEi, isSelfEmployed) {
    const toggles = document.querySelectorAll('.toggle-display');
    if (toggles.length === 0) return;

    const eiToggle = toggles[0];
    const strong = eiToggle.querySelector('strong');
    const small = eiToggle.querySelector('small');

    if (strong && small) {
        if (isSelfEmployed) {
            strong.textContent = includeEi ? 'EI premiums included (optional)' : 'EI premiums excluded';
            small.textContent = includeEi
                ? 'Self-employed can optionally register for EI special benefits.'
                : 'Most self-employed doctors do not opt into EI.';
        } else {
            strong.textContent = includeEi ? 'EI premiums included' : 'EI premiums excluded';
            small.textContent = includeEi
                ? 'Disable if the physician is EI-exempt (e.g., incorporated owner-manager).'
                : 'Enable if EI premiums should be part of the personal tax projection.';
        }
    }
}

function refreshSelfEmployedDescription(isSelfEmployed) {
    const toggles = document.querySelectorAll('.toggle-display');
    if (toggles.length < 2) return;

    const selfEmployedToggle = toggles[1];
    const strong = selfEmployedToggle.querySelector('strong');
    const small = selfEmployedToggle.querySelector('small');

    if (strong && small) {
        strong.textContent = isSelfEmployed ? 'Self-employed (unincorporated)' : 'Employee or incorporated';
        small.textContent = isSelfEmployed
            ? 'Pays both employee + employer CPP ($8,111 max), no employment credit.'
            : 'Pays only employee CPP ($4,056 max), gets $1,433 employment credit.';
    }
}

function calculateTax() {
    const grossIncome = parseInputCurrency(document.getElementById('grossIncome').value);
    const personalExpensesField = document.getElementById('personalExpenses');
    const personalExpenses = personalExpensesField.value.trim() === '' ? 100_000 : parseInputCurrency(personalExpensesField.value);
    const includeEi = document.getElementById('includeEi')?.checked || false;
    
    // Check if selfEmployed toggle exists, default to false if not
    const selfEmployedElement = document.getElementById('selfEmployed');
    const isSelfEmployed = selfEmployedElement ? selfEmployedElement.checked : false;

    refreshEiToggleDescription(includeEi, isSelfEmployed);
    refreshSelfEmployedDescription(isSelfEmployed);

    // ============================================================
    // CALCULATE CPP AND TAXABLE INCOME (DIFFERENT FOR EACH TYPE)
    // ============================================================
    
    let cpp, taxableIncome;

    if (isSelfEmployed) {
        // SELF-EMPLOYED: Pay both employee AND employer portions
        const cppBasePensionable = Math.max(0, Math.min(grossIncome, CPP_YMPE) - CPP_BASE_EXEMPTION);
        const cppBase = Math.min(cppBasePensionable * CPP_SELF_EMPLOYED_RATE, CPP_SELF_EMPLOYED_BASE_MAX);
        
        const cpp2Pensionable = Math.max(0, Math.min(grossIncome, CPP_YAMPE) - CPP_YMPE);
        const cpp2 = Math.min(cpp2Pensionable * CPP2_SELF_EMPLOYED_RATE, CPP2_SELF_EMPLOYED_MAX);
        
        cpp = cppBase + cpp2;
        
        // Self-employed deductions: employer half + enhanced portion
        const cppEmployerDeduction = cpp / 2;
        const cppEnhancedDeduction = CPP_ENHANCED_MAX;
        
        taxableIncome = grossIncome - cppEmployerDeduction - cppEnhancedDeduction;
        
    } else {
        // EMPLOYEE: Pay only employee portion
        const cppBasePensionable = Math.max(0, Math.min(grossIncome, CPP_YMPE) - CPP_BASE_EXEMPTION);
        const cppBase = Math.min(cppBasePensionable * CPP_EMPLOYEE_RATE, CPP_BASE_MAX);
        
        const cpp2Pensionable = Math.max(0, Math.min(grossIncome, CPP_YAMPE) - CPP_YMPE);
        const cpp2 = Math.min(cpp2Pensionable * CPP2_EMPLOYEE_RATE, CPP2_MAX);
        
        cpp = cppBase + cpp2;
        
        // Employee deduction: only enhanced portion
        taxableIncome = grossIncome - CPP_ENHANCED_MAX;
    }

    // ============================================================
    // CALCULATE FEDERAL TAX
    // ============================================================
    
    const federalDetail = calculateBracketDetail(taxableIncome, federalBrackets);
    
    // Federal credits
    const federalBPA = getFederalBasicPersonalAmount(taxableIncome);
    const federalBPACredit = federalBPA * FEDERAL_LOW_RATE;
    const federalEmploymentCredit = isSelfEmployed ? 0 : CANADA_EMPLOYMENT_AMOUNT * FEDERAL_LOW_RATE;
    const federalCPPCredit = CPP_BASE_CREDIT_AMOUNT * FEDERAL_LOW_RATE;
    
    const totalFederalCredits = federalBPACredit + federalEmploymentCredit + federalCPPCredit;
    const federalTax = Math.max(0, federalDetail.total - totalFederalCredits);
    
    // Build federal breakdown
    const federalBreakdown = [...federalDetail.breakdown];
    federalBreakdown.push({
        range: 'Federal basic personal amount credit',
        amount: federalBPA,
        tax: -federalBPACredit,
        isCredit: true
    });
    
    if (!isSelfEmployed) {
        federalBreakdown.push({
            range: 'Canada employment amount credit',
            amount: CANADA_EMPLOYMENT_AMOUNT,
            tax: -federalEmploymentCredit,
            isCredit: true
        });
    }
    
    federalBreakdown.push({
        range: 'CPP base contributions credit',
        amount: CPP_BASE_CREDIT_AMOUNT,
        tax: -federalCPPCredit,
        isCredit: true
    });

    // ============================================================
    // CALCULATE MANITOBA TAX
    // ============================================================
    
    const manitobaDetail = calculateBracketDetail(taxableIncome, manitobaBrackets);
    
    // Manitoba credits
    const manitobaBPACredit = MANITOBA_BASIC_PERSONAL_AMOUNT * MANITOBA_LOW_RATE;
    const manitobaCPPCredit = CPP_BASE_CREDIT_AMOUNT * MANITOBA_LOW_RATE;
    
    const totalManitobaCredits = manitobaBPACredit + manitobaCPPCredit;
    const manitobaTax = Math.max(0, manitobaDetail.total - totalManitobaCredits);
    
    // Build Manitoba breakdown
    const manitobaBreakdown = [...manitobaDetail.breakdown];
    manitobaBreakdown.push({
        range: 'Manitoba basic personal amount credit',
        amount: MANITOBA_BASIC_PERSONAL_AMOUNT,
        tax: -manitobaBPACredit,
        isCredit: true
    });
    
    manitobaBreakdown.push({
        range: 'CPP base contributions credit',
        amount: CPP_BASE_CREDIT_AMOUNT,
        tax: -manitobaCPPCredit,
        isCredit: true
    });

    // ============================================================
    // CALCULATE EI AND TOTALS FOR PERSONAL
    // ============================================================
    
    const ei = includeEi ? Math.min(grossIncome * EI_RATE, EI_MAX) : 0;
    
    const totalPersonalTax = federalTax + manitobaTax + cpp + ei;
    const netPersonal = grossIncome - totalPersonalTax;
    const effectivePersonalRate = grossIncome > 0 ? ((totalPersonalTax / grossIncome) * 100).toFixed(2) : '0.00';

    // ============================================================
    // CORPORATE SCENARIO (ALWAYS USES EMPLOYEE CPP)
    // ============================================================
    
    const corpTax = grossIncome * SMALL_BUSINESS_RATE;
    const corpAfterTax = grossIncome - corpTax;
    const salary = Math.min(personalExpenses, corpAfterTax);

    // Corporate salary is ALWAYS employee (never self-employed)
    const salaryCppBasePensionable = Math.max(0, Math.min(salary, CPP_YMPE) - CPP_BASE_EXEMPTION);
    const salaryCppBase = Math.min(salaryCppBasePensionable * CPP_EMPLOYEE_RATE, CPP_BASE_MAX);
    
    const salaryCpp2Pensionable = Math.max(0, Math.min(salary, CPP_YAMPE) - CPP_YMPE);
    const salaryCpp2 = Math.min(salaryCpp2Pensionable * CPP2_EMPLOYEE_RATE, CPP2_MAX);
    
    const salaryCpp = salaryCppBase + salaryCpp2;
    const salaryTaxableIncome = salary - CPP_ENHANCED_MAX;

    const salaryFederalDetail = calculateBracketDetail(salaryTaxableIncome, federalBrackets);
    const salaryProvincialDetail = calculateBracketDetail(salaryTaxableIncome, manitobaBrackets);

    // Corporate salary ALWAYS gets employment credit
    const salaryFederalBPA = getFederalBasicPersonalAmount(salaryTaxableIncome);
    const salaryBPACredit = salaryFederalBPA * FEDERAL_LOW_RATE;
    const salaryEmploymentCredit = CANADA_EMPLOYMENT_AMOUNT * FEDERAL_LOW_RATE;
    const salaryCPPCredit = CPP_BASE_CREDIT_AMOUNT * FEDERAL_LOW_RATE;
    
    const salaryFederalTax = Math.max(0, salaryFederalDetail.total - salaryBPACredit - salaryEmploymentCredit - salaryCPPCredit);
    
    const salaryManitobaBPACredit = MANITOBA_BASIC_PERSONAL_AMOUNT * MANITOBA_LOW_RATE;
    const salaryManitobaCPPCredit = CPP_BASE_CREDIT_AMOUNT * MANITOBA_LOW_RATE;
    
    const salaryManitobaTax = Math.max(0, salaryProvincialDetail.total - salaryManitobaBPACredit - salaryManitobaCPPCredit);

    // Build salary breakdowns
    const salaryFederalBreakdown = [...salaryFederalDetail.breakdown];
    salaryFederalBreakdown.push({
        range: 'Federal basic personal amount credit',
        amount: salaryFederalBPA,
        tax: -salaryBPACredit,
        isCredit: true
    });
    salaryFederalBreakdown.push({
        range: 'Canada employment amount credit',
        amount: CANADA_EMPLOYMENT_AMOUNT,
        tax: -salaryEmploymentCredit,
        isCredit: true
    });
    salaryFederalBreakdown.push({
        range: 'CPP base contributions credit',
        amount: CPP_BASE_CREDIT_AMOUNT,
        tax: -salaryCPPCredit,
        isCredit: true
    });

    const salaryProvincialBreakdown = [...salaryProvincialDetail.breakdown];
    salaryProvincialBreakdown.push({
        range: 'Manitoba basic personal amount credit',
        amount: MANITOBA_BASIC_PERSONAL_AMOUNT,
        tax: -salaryManitobaBPACredit,
        isCredit: true
    });
    salaryProvincialBreakdown.push({
        range: 'CPP base contributions credit',
        amount: CPP_BASE_CREDIT_AMOUNT,
        tax: -salaryManitobaCPPCredit,
        isCredit: true
    });

    const salaryEi = includeEi ? Math.min(salary * EI_RATE, EI_MAX) : 0;
    const salaryTax = salaryFederalTax + salaryManitobaTax + salaryCpp + salaryEi;

    const netSalary = salary - salaryTax;
    const retained = corpAfterTax - salary;
    const totalCorpTax = corpTax + salaryTax;
    const netCorp = netSalary + retained;
    const effectiveCorpRate = grossIncome > 0 ? ((totalCorpTax / grossIncome) * 100).toFixed(2) : '0.00';

    const corporateBreakdown = grossIncome > 0 ? [{ 
        range: 'Active business income', 
        amount: grossIncome, 
        tax: corpTax, 
        rate: SMALL_BUSINESS_RATE 
    }] : [];

    // ============================================================
    // UPDATE UI
    // ============================================================
    
    updatePersonalResults({
        grossIncome,
        federalTax,
        provincialTax: manitobaTax,
        cpp,
        ei,
        totalPersonalTax,
        netPersonal,
        effectivePersonalRate,
        federalBreakdown,
        provincialBreakdown: manitobaBreakdown
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
        salaryFederalBreakdown,
        salaryProvincialBreakdown
    });

    updateSummary({
        personalTax: totalPersonalTax,
        personalRate: effectivePersonalRate,
        personalFederal: federalTax,
        personalProvincial: manitobaTax,
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
    } else {
        const personalAdvantage = Math.abs(advantage);
        advantageElement.className = 'advantage personal';
        advantageElement.innerHTML = `
            <strong>Personal income structure provides a tax advantage of ${formatCurrency(personalAdvantage)}</strong>
            You save ${formatCurrency(personalAdvantage)} by remaining unincorporated (${((personalAdvantage / grossIncome) * 100).toFixed(1)}% of gross income)
        `;
    }
}

// Event listeners
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

const selfEmployedElement = document.getElementById('selfEmployed');
if (selfEmployedElement) {
    selfEmployedElement.addEventListener('change', () => {
        calculateTax();
    });
}

calculateTax();