// 2026 tax constants
const FEDERAL_MAX_BASIC_PERSONAL_AMOUNT = 16_452;
const FEDERAL_MIN_BASIC_PERSONAL_AMOUNT = 14_829;
const FEDERAL_BASIC_PERSONAL_PHASEOUT_START = 181_440;
const FEDERAL_BASIC_PERSONAL_PHASEOUT_END = 258_482;
const FEDERAL_LOW_RATE = 0.14;

const MANITOBA_BASIC_PERSONAL_AMOUNT = 15_780;
const MANITOBA_BASIC_PERSONAL_PHASEOUT_START = 200_000;
const MANITOBA_BASIC_PERSONAL_PHASEOUT_END = 400_000;
const MANITOBA_LOW_RATE = 0.108;

const CANADA_EMPLOYMENT_AMOUNT = 1_501;

const federalBrackets = [
    { min: 0, max: 58_523, rate: 0.14 },
    { min: 58_523, max: 117_045, rate: 0.205 },
    { min: 117_045, max: 181_440, rate: 0.26 },
    { min: 181_440, max: 258_482, rate: 0.29 },
    { min: 258_482, max: Number.POSITIVE_INFINITY, rate: 0.33 }
];

const manitobaBrackets = [
    { min: 0, max: 47_000, rate: 0.108 },
    { min: 47_000, max: 100_000, rate: 0.1275 },
    { min: 100_000, max: Number.POSITIVE_INFINITY, rate: 0.174 }
];

// CPP Constants
const CPP_BASE_EXEMPTION = 3_500;
const CPP_YMPE = 74_600;
const CPP_YAMPE = 85_000;

// Employee CPP (5.95% = 4.95% base + 1.00% first enhanced)
const CPP_EMPLOYEE_RATE = 0.0595;
const CPP_BASE_MAX = 4_230.45;
const CPP2_EMPLOYEE_RATE = 0.04;
const CPP2_MAX = 416.00;

// Self-Employed CPP
const CPP_SELF_EMPLOYED_RATE = 0.119;
const CPP_SELF_EMPLOYED_BASE_MAX = 8_460.90;
const CPP2_SELF_EMPLOYED_RATE = 0.08;
const CPP2_SELF_EMPLOYED_MAX = 832.00;

// CPP Tax Treatment: the first enhanced share is deductible, the base share earns a credit
const CPP_ENHANCED_SHARE = 1 / 5.95;
const CPP_CREDIT_SHARE = 4.95 / 5.95;

// EI Constants
const EI_RATE = 0.0163;
const EI_MAX_INSURABLE = 68_900;
const EI_MAX = 1_123.07;
const EI_EMPLOYER_MULTIPLIER = 1.4;

// Corporate (Manitoba CCPC): federal 9% + Manitoba 0% on the first $500,000, 27% above
const SMALL_BUSINESS_RATE = 0.09;
const SMALL_BUSINESS_LIMIT = 500_000;
const GENERAL_CORPORATE_RATE = 0.27;

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
    return `${Number((rate * 100).toFixed(2))}%`;
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

function getManitobaBasicPersonalAmount(income) {
    if (income <= MANITOBA_BASIC_PERSONAL_PHASEOUT_START) {
        return MANITOBA_BASIC_PERSONAL_AMOUNT;
    }
    if (income >= MANITOBA_BASIC_PERSONAL_PHASEOUT_END) {
        return 0;
    }
    const reductionRange = MANITOBA_BASIC_PERSONAL_PHASEOUT_END - MANITOBA_BASIC_PERSONAL_PHASEOUT_START;
    const reduction = ((income - MANITOBA_BASIC_PERSONAL_PHASEOUT_START) / reductionRange) * MANITOBA_BASIC_PERSONAL_AMOUNT;
    return MANITOBA_BASIC_PERSONAL_AMOUNT - reduction;
}

// Actual CPP contributions on the given income, with the deductible and creditable portions
function calculateCpp(income, isSelfEmployed) {
    const cppBasePensionable = Math.max(0, Math.min(income, CPP_YMPE) - CPP_BASE_EXEMPTION);
    const cpp2Pensionable = Math.max(0, Math.min(income, CPP_YAMPE) - CPP_YMPE);

    if (isSelfEmployed) {
        // SELF-EMPLOYED: Pay both employee AND employer portions
        const cppBase = Math.min(cppBasePensionable * CPP_SELF_EMPLOYED_RATE, CPP_SELF_EMPLOYED_BASE_MAX);
        const cpp2 = Math.min(cpp2Pensionable * CPP2_SELF_EMPLOYED_RATE, CPP2_SELF_EMPLOYED_MAX);
        const employeeHalf = cppBase / 2;

        return {
            total: cppBase + cpp2,
            // Employer half + first enhanced share of the employee half + all of CPP2
            deduction: employeeHalf + employeeHalf * CPP_ENHANCED_SHARE + cpp2,
            creditAmount: employeeHalf * CPP_CREDIT_SHARE
        };
    }

    // EMPLOYEE: Pay only employee portion
    const cppBase = Math.min(cppBasePensionable * CPP_EMPLOYEE_RATE, CPP_BASE_MAX);
    const cpp2 = Math.min(cpp2Pensionable * CPP2_EMPLOYEE_RATE, CPP2_MAX);

    return {
        total: cppBase + cpp2,
        deduction: cppBase * CPP_ENHANCED_SHARE + cpp2,
        creditAmount: cppBase * CPP_CREDIT_SHARE
    };
}

function calculateEi(income) {
    return Math.min(Math.min(income, EI_MAX_INSURABLE) * EI_RATE, EI_MAX);
}

// Federal and Manitoba tax, CPP and EI on personal (or salary) income
function calculatePersonalTax(income, { isSelfEmployed, includeEi }) {
    const cppDetail = calculateCpp(income, isSelfEmployed);
    const cpp = cppDetail.total;
    const ei = includeEi ? calculateEi(income) : 0;

    // Net income for BPA phase-outs is income after the CPP deduction
    const taxableIncome = Math.max(0, income - cppDetail.deduction);

    // ============================================================
    // FEDERAL TAX
    // ============================================================

    const federalDetail = calculateBracketDetail(taxableIncome, federalBrackets);

    const federalBPA = getFederalBasicPersonalAmount(taxableIncome);
    const federalBPACredit = federalBPA * FEDERAL_LOW_RATE;
    const employmentAmount = isSelfEmployed ? 0 : Math.min(CANADA_EMPLOYMENT_AMOUNT, income);
    const federalEmploymentCredit = employmentAmount * FEDERAL_LOW_RATE;
    const federalCPPCredit = cppDetail.creditAmount * FEDERAL_LOW_RATE;
    const federalEICredit = ei * FEDERAL_LOW_RATE;

    const totalFederalCredits = federalBPACredit + federalEmploymentCredit + federalCPPCredit + federalEICredit;
    const federalTax = Math.max(0, federalDetail.total - totalFederalCredits);

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
            amount: employmentAmount,
            tax: -federalEmploymentCredit,
            isCredit: true
        });
    }

    federalBreakdown.push({
        range: 'CPP base contributions credit',
        amount: cppDetail.creditAmount,
        tax: -federalCPPCredit,
        isCredit: true
    });

    if (ei > 0) {
        federalBreakdown.push({
            range: 'EI premiums credit',
            amount: ei,
            tax: -federalEICredit,
            isCredit: true
        });
    }

    // ============================================================
    // MANITOBA TAX
    // ============================================================

    const manitobaDetail = calculateBracketDetail(taxableIncome, manitobaBrackets);

    const manitobaBPA = getManitobaBasicPersonalAmount(taxableIncome);
    const manitobaBPACredit = manitobaBPA * MANITOBA_LOW_RATE;
    const manitobaCPPCredit = cppDetail.creditAmount * MANITOBA_LOW_RATE;
    const manitobaEICredit = ei * MANITOBA_LOW_RATE;

    const totalManitobaCredits = manitobaBPACredit + manitobaCPPCredit + manitobaEICredit;
    const manitobaTax = Math.max(0, manitobaDetail.total - totalManitobaCredits);

    const manitobaBreakdown = [...manitobaDetail.breakdown];
    manitobaBreakdown.push({
        range: 'Manitoba basic personal amount credit',
        amount: manitobaBPA,
        tax: -manitobaBPACredit,
        isCredit: true
    });

    manitobaBreakdown.push({
        range: 'CPP base contributions credit',
        amount: cppDetail.creditAmount,
        tax: -manitobaCPPCredit,
        isCredit: true
    });

    if (ei > 0) {
        manitobaBreakdown.push({
            range: 'EI premiums credit',
            amount: ei,
            tax: -manitobaEICredit,
            isCredit: true
        });
    }

    return {
        cpp,
        ei,
        taxableIncome,
        federalTax,
        manitobaTax,
        federalBreakdown,
        manitobaBreakdown
    };
}

// Employer CPP/CPP2 match the employee amounts; employer EI is 1.4x the employee premium
function calculateEmployerPayroll(salary, includeEi) {
    const cpp = calculateCpp(salary, false).total;
    const ei = includeEi ? calculateEi(salary) * EI_EMPLOYER_MULTIPLIER : 0;
    return { cpp, ei, total: cpp + ei };
}

// Largest salary (up to the request) the corporation can pay along with employer payroll costs
function capSalary(requestedSalary, corporateIncome, includeEi) {
    if (corporateIncome <= 0 || requestedSalary <= 0) return 0;

    const affordable = (salary) => salary + calculateEmployerPayroll(salary, includeEi).total <= corporateIncome;
    if (affordable(requestedSalary)) return requestedSalary;

    // Salary plus payroll cost rises with salary, so bisect for the affordable limit
    let low = 0;
    let high = Math.min(requestedSalary, corporateIncome);
    for (let i = 0; i < 60; i += 1) {
        const mid = (low + high) / 2;
        if (affordable(mid)) {
            low = mid;
        } else {
            high = mid;
        }
    }
    return low;
}

function calculateCorporateTax(taxableIncome) {
    const smallBusinessIncome = Math.min(taxableIncome, SMALL_BUSINESS_LIMIT);
    const generalIncome = Math.max(0, taxableIncome - SMALL_BUSINESS_LIMIT);
    const breakdown = [];

    if (smallBusinessIncome > 0) {
        breakdown.push({
            range: `Small business rate (first ${formatCurrency(SMALL_BUSINESS_LIMIT)})`,
            amount: smallBusinessIncome,
            tax: smallBusinessIncome * SMALL_BUSINESS_RATE,
            rate: SMALL_BUSINESS_RATE
        });
    }
    if (generalIncome > 0) {
        breakdown.push({
            range: `General rate (over ${formatCurrency(SMALL_BUSINESS_LIMIT)})`,
            amount: generalIncome,
            tax: generalIncome * GENERAL_CORPORATE_RATE,
            rate: GENERAL_CORPORATE_RATE
        });
    }

    const total = breakdown.reduce((sum, entry) => sum + entry.tax, 0);
    return { total, breakdown };
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
        strong.textContent = 'Self-employed';
        small.textContent = 'Pay double CPP, no employment credit.';
    }
}

function calculateTax() {
    const grossIncome = parseInputCurrency(document.getElementById('grossIncome').value);
    const personalExpensesField = document.getElementById('personalExpenses');
    const personalExpenses = personalExpensesField.value.trim() === '' ? 100_000 : parseInputCurrency(personalExpensesField.value);

    // Parse overhead percentage
    const overheadPercentField = document.getElementById('overheadPercent');
    let overheadPercentStr = overheadPercentField ? overheadPercentField.value.replace(/[^\d.]/g, '') : '';
    let overheadPercent = overheadPercentStr === '' ? 0 : parseFloat(overheadPercentStr);

    // Clamp between 0 and 100
    if (overheadPercentStr !== '') {
        overheadPercent = Math.max(0, Math.min(100, overheadPercent));
    }

    // Format the field to show percentage (preserve cursor position)
    if (overheadPercentField) {
        const cursorPosition = overheadPercentField.selectionStart;
        const oldValue = overheadPercentField.value;
        const newValue = overheadPercentStr === '' ? '' : `${overheadPercent}%`;

        if (oldValue !== newValue) {
            overheadPercentField.value = newValue;
            // Keep cursor before the % sign (or at end if empty)
            const newCursorPos = newValue === '' ? 0 : Math.min(cursorPosition, newValue.length - 1);
            overheadPercentField.setSelectionRange(newCursorPos, newCursorPos);
        }
    }

    // Calculate net income after overhead
    const netIncomeAfterOverhead = grossIncome * (1 - overheadPercent / 100);

    // Update net salary hint
    const netSalaryHint = document.getElementById('netSalaryHint');
    if (netSalaryHint) {
        netSalaryHint.textContent = `Net income after ${overheadPercent}% overhead: ${formatCurrency(netIncomeAfterOverhead)}`;
    }

    const includeEi = document.getElementById('includeEi')?.checked || false;

    // Check if selfEmployed toggle exists, default to false if not
    const selfEmployedElement = document.getElementById('selfEmployed');
    const isSelfEmployed = selfEmployedElement ? selfEmployedElement.checked : false;

    refreshEiToggleDescription(includeEi, isSelfEmployed);
    refreshSelfEmployedDescription(isSelfEmployed);

    // ============================================================
    // PERSONAL SCENARIO
    // Use netIncomeAfterOverhead for personal calculations
    // ============================================================

    const personal = calculatePersonalTax(netIncomeAfterOverhead, { isSelfEmployed, includeEi });
    const { cpp, ei, federalTax, manitobaTax } = personal;

    const totalPersonalTax = federalTax + manitobaTax + cpp + ei;
    const netPersonal = netIncomeAfterOverhead - totalPersonalTax;
    const effectivePersonalRate = netIncomeAfterOverhead > 0 ? ((totalPersonalTax / netIncomeAfterOverhead) * 100).toFixed(2) : '0.00';

    // ============================================================
    // CORPORATE SCENARIO (SALARY IS ALWAYS EMPLOYMENT INCOME)
    // Overhead is a corporate expense
    // ============================================================

    const corpIncome = netIncomeAfterOverhead;
    const overhead = grossIncome - corpIncome;
    const salary = capSalary(personalExpenses, corpIncome, includeEi);
    const employerPayroll = calculateEmployerPayroll(salary, includeEi);

    const corpTaxableIncome = Math.max(0, corpIncome - salary - employerPayroll.total);
    const corporateTax = calculateCorporateTax(corpTaxableIncome);
    const corpTax = corporateTax.total;
    const retained = corpTaxableIncome - corpTax;

    const salaryResult = calculatePersonalTax(salary, { isSelfEmployed: false, includeEi });
    const salaryIncomeTax = salaryResult.federalTax + salaryResult.manitobaTax;
    const salaryPayroll = salaryResult.cpp + salaryResult.ei;

    const totalCorpTax = corpTax + salaryIncomeTax + salaryPayroll + employerPayroll.total;
    const netCorp = salary - salaryIncomeTax - salaryPayroll + retained;
    const effectiveCorpRate = corpIncome > 0 ? ((totalCorpTax / corpIncome) * 100).toFixed(2) : '0.00';

    // ============================================================
    // UPDATE UI
    // ============================================================

    updatePersonalResults({
        grossIncome: netIncomeAfterOverhead,
        federalTax,
        provincialTax: manitobaTax,
        cpp,
        ei,
        totalPersonalTax,
        netPersonal,
        effectivePersonalRate,
        federalBreakdown: personal.federalBreakdown,
        provincialBreakdown: personal.manitobaBreakdown
    });

    updateCorporateResults({
        grossIncome,
        overhead,
        salary,
        employerPayroll: employerPayroll.total,
        corpTaxableIncome,
        corpTax,
        salaryTax: salaryIncomeTax,
        salaryPayroll,
        retained,
        totalCorpTax,
        netCorp,
        effectiveCorpRate,
        corpBreakdown: corporateTax.breakdown,
        salaryFederalBreakdown: salaryResult.federalBreakdown,
        salaryProvincialBreakdown: salaryResult.manitobaBreakdown
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
        corporatePersonalTax: salaryIncomeTax,
        corporatePayroll: salaryPayroll + employerPayroll.total
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
    document.getElementById('summaryCorporatePayroll').textContent = formatCurrency(summary.corporatePayroll);

    const largestTax = Math.max(summary.personalTax, summary.corporateTax);
    const barWidth = (value) => (largestTax > 0 ? `${(value / largestTax) * 100}%` : '0%');
    document.getElementById('barPersonal').style.width = barWidth(summary.personalTax);
    document.getElementById('barCorp').style.width = barWidth(summary.corporateTax);
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
    document.getElementById('corpOverhead').textContent = formatCurrency(data.overhead);
    document.getElementById('corpSalary').textContent = formatCurrency(data.salary);
    document.getElementById('corpEmployerPayroll').textContent = formatCurrency(data.employerPayroll);
    document.getElementById('corpTaxable').textContent = formatCurrency(data.corpTaxableIncome);
    document.getElementById('corpTax').textContent = formatCurrency(data.corpTax);
    document.getElementById('corpSalaryTax').textContent = formatCurrency(data.salaryTax);
    document.getElementById('corpSalaryPayroll').textContent = formatCurrency(data.salaryPayroll);
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
        advantageElement.textContent = 'Enter your gross income to see which structure comes out ahead.';
        return;
    }

    const saving = Math.abs(advantage);
    const shareOfGross = ((saving / grossIncome) * 100).toFixed(1);

    if (advantage > 0) {
        advantageElement.className = 'advantage corporate';
        advantageElement.innerHTML = `
            <span class="advantage-lead">Incorporating leaves you with</span>
            <strong>${formatCurrency(saving)} <span class="nowrap">more a year</span></strong>
            <span class="advantage-detail">That's ${shareOfGross}% of gross income, counting take-home pay plus earnings retained in the corporation.</span>
        `;
    } else {
        advantageElement.className = 'advantage personal';
        advantageElement.innerHTML = `
            <span class="advantage-lead">Staying unincorporated leaves you with</span>
            <strong>${formatCurrency(saving)} <span class="nowrap">more a year</span></strong>
            <span class="advantage-detail">That's ${shareOfGross}% of gross income compared with running it through a corporation.</span>
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

document.getElementById('overheadPercent').addEventListener('input', () => {
    calculateTax();
});

document.getElementById('grossIncome').addEventListener('focus', (event) => {
    event.target.select();
});

document.getElementById('personalExpenses').addEventListener('focus', (event) => {
    event.target.select();
});

document.getElementById('overheadPercent').addEventListener('focus', (event) => {
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