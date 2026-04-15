export function calculateFinancialHealth(transactions) {

  transactions = transactions || [];

  if (!transactions || transactions.length === 0) {
  return {
    score: 0,
    breakdown: {
      profit: 0,
      runway: 0,
      growth: 0,
      concentration: 0,
      stability: 0,
    },
    net: 0,
    totalIncome: 0,
  };
}

function calculateStability(transactions) {

  
  const monthlyIncome = {};

  transactions.forEach((txn) => {
    if (txn.categories?.type !== "income") return;

    const date = new Date(txn.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;

    if (!monthlyIncome[key]) monthlyIncome[key] = 0;
    monthlyIncome[key] += txn.amount;
  });

  const values = Object.values(monthlyIncome);

  if (values.length < 2) return "Moderately stable income";

  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  const min = Math.min(...values);
const max = Math.max(...values);

const ratio = min / (max || 1);

if (ratio > 0.7) return "Very stable income";
if (ratio > 0.4) return "Moderately stable income";
return "Highly unstable income";
}

  let totalIncome = 0;
  let totalExpense = 0;

  const monthlyMap = {};
  const expenseMap = {};
  const monthlyExpenses = {};
  const monthlyIncome = {};

  // 🔹 Aggregate Transactions
  transactions.forEach((t) => {
    const date = new Date(t.created_at);
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${month}`;

    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        income: 0,
        expense: 0,
        year,
        month,
      };
    }

    if (t.categories?.type === "income") {
  totalIncome += t.amount;
  monthlyMap[key].income += t.amount;

  // 🔥 ADD THIS
  if (!monthlyIncome[key]) monthlyIncome[key] = 0;
  monthlyIncome[key] += t.amount;
} else {
      totalExpense += t.amount;
      monthlyMap[key].expense += t.amount;

      monthlyExpenses[key] =
  (monthlyExpenses[key] || 0) + t.amount;

      const name = t.categories?.name || "Other";
      expenseMap[name] = (expenseMap[name] || 0) + t.amount;
    }
  });

  // 🔹 Sort Months Properly (VERY IMPORTANT)
  const sortedMonths = Object.values(monthlyMap).sort(
    (a, b) =>
      new Date(a.year, a.month) - new Date(b.year, b.month)
  );

  const monthlyNets = sortedMonths.map(
    (m) => m.income - m.expense
  );

  const monthlyIncomeArray = sortedMonths.map(
  (m) => m.income
);

  const net = totalIncome - totalExpense;

  const profitMargin =
    totalIncome > 0 ? (net / totalIncome) * 100 : 0;

  // 🔹 Average Monthly Net
  const avgMonthlyNet =
    monthlyNets.length > 0
      ? monthlyNets.reduce((a, b) => a + b, 0) /
        monthlyNets.length
      : 0;

  // 🔹 Runway (only meaningful if burning cash)
  // 🔥 Calculate monthly burn (expenses only)
const expenseValues = Object.values(monthlyExpenses);

const avgMonthlyBurn =
  expenseValues.length > 0
    ? expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length
    : 0;

// 🔥 Correct runway
const runwayMonths = avgMonthlyBurn > 0
  ? Math.max(0, net) / avgMonthlyBurn
  : 0;

const runwayDays = runwayMonths * 30;

  // 🔹 Income Growth (last 2 sorted months)
  let incomeGrowth = 0;

if (monthlyIncomeArray.length >= 2) {
  const prev = monthlyIncomeArray[monthlyIncomeArray.length - 2];
  const current = monthlyIncomeArray[monthlyIncomeArray.length - 1];

  if (prev !== 0) {
    incomeGrowth = ((current - prev) / prev) * 100;
  }
}

// 🔥 Income Trend Label
let incomeTrendLabel = "stable";

if (incomeGrowth > 10) {
  incomeTrendLabel = "growing";
} else if (incomeGrowth < -5) {
  incomeTrendLabel = "declining";
}
// 🔥 Burn Ratio

const avgMonthlyIncome =
  sortedMonths.length > 0
    ? totalIncome / sortedMonths.length
    : 0;

const avgMonthlyExpenses =
  sortedMonths.length > 0
    ? totalExpense / sortedMonths.length
    : 0;
const burnRatio =
  avgMonthlyIncome === 0
    ? 0
    : Math.min(avgMonthlyExpenses / avgMonthlyIncome, 5);

  // 🔹 Expense Concentration
  let topExpensePercent = 0;
  if (totalExpense > 0) {
    Object.values(expenseMap).forEach((val) => {
      const share = (val / totalExpense) * 100;
      if (share > topExpensePercent) {
        topExpensePercent = share;
      }
    });
  }

  // 🔹 Stability (Std Deviation)
  const mean = avgMonthlyNet;

  const variance =
    monthlyNets.length > 0
      ? monthlyNets.reduce(
          (acc, val) =>
            acc + Math.pow(val - mean, 2),
          0
        ) / monthlyNets.length
      : 0;

  // 🔹 Scaling
  // 🔥 NEW SCORING MODEL

let score = 0;

// 🔹 Savings Rate
const savingsRate = totalIncome > 0 ? (net / totalIncome) * 100 : 0;

// 🔹 Stability Score (convert variance → 0–10)
const stabilityScore =
  monthlyNets.length > 1
    ? Math.max(0, 10 - Math.sqrt(variance) / 1000)
    : 5;

// 🔹 1. RUNWAY (25 points)
if (runwayMonths >= 6) score += 25;
else score += (runwayMonths / 6) * 25;

// 🔹 2. SAVINGS RATE (20 points)
if (savingsRate >= 30) score += 20;
else score += (savingsRate / 30) * 20;

// 🔹 3. INCOME GROWTH (15 points)
if (incomeGrowth >= 20) score += 15;
else if (incomeGrowth > 0) score += (incomeGrowth / 20) * 15;

// 🔹 4. BURN RATIO (20 points)
const burnScore = Math.max(0, (1 - burnRatio)) * 20;
score += burnScore;

// 🔹 5. STABILITY (20 points)
score += stabilityScore * 2;

// 🔹 FINAL NORMALIZATION
score = Math.min(Math.max(score, 0), 100);
score = Math.round(score);

  // 🔹 Risk Classification
  let riskLevel;

if (runwayDays < 30) riskLevel = "Critical";
else if (runwayDays < 90) riskLevel = "High";
else if (score < 60) riskLevel = "Moderate";
else riskLevel = "Low";

  // 🔹 Status Label Helper
  const getStatus = (metricScore) => {
    if (metricScore >= 75) return "Strong";
    if (metricScore >= 55) return "Healthy";
    if (metricScore >= 35) return "Weak";
    return "Critical";
  };

  // 🔹 Breakdown Object
  const breakdown = [
  {
    name: "Runway Strength",
    value: Math.round((runwayMonths / 6) * 100),
  },
  {
    name: "Savings Rate",
    value: Math.round(savingsRate),
  },
  {
    name: "Burn Control",
    value: Math.round((1 - burnRatio) * 100),
  },
  {
    name: "Income Growth",
    value: Math.round(incomeGrowth),
  },
];

  let stability = calculateStability(transactions);

// 🔥 CONTEXT-AWARE OVERRIDE
if (runwayMonths < 1 && net < avgMonthlyBurn) {
  stability = "Financially unstable 🔴";
}

  return {
  score,
  riskLevel,

  // Core
  net,
  totalIncome,
  totalExpense,

  // Monthly
  avgMonthlyIncome: Number(
    (totalIncome / (sortedMonths.length || 1)).toFixed(2)
  ),
  avgMonthlyExpenses: Number(
    (totalExpense / (sortedMonths.length || 1)).toFixed(2)
  ),
  avgMonthlyBurn: Number(
  (totalExpense / (sortedMonths.length || 1)).toFixed(2)
),

  // Growth & Trend
  incomeGrowth: Number(incomeGrowth.toFixed(2)),
  incomeTrendLabel,

  // Burn & Runway
  burnRatio: Number(burnRatio.toFixed(4)),
  runwayMonths: Number(runwayMonths.toFixed(2)),
  runwayDays: Number(runwayDays.toFixed(2)),

  // Stability
  stability,

  // Debug (important for next phase)
  monthlyIncomeArray,
  monthlyNets,

  breakdown
};
} 