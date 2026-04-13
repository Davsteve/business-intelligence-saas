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
  if (monthlyNets.length >= 2) {
    const prev = monthlyNets[monthlyNets.length - 2];
    const current = monthlyNets[monthlyNets.length - 1];

    if (prev !== 0) {
      incomeGrowth =
        ((current - prev) / Math.abs(prev)) * 100;
    }
  }

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

// 🔥 NEW SCORING MODEL

let score = 0;

// 1. RUNWAY SCORE (40)
if (runwayDays >= 180) score += 40;
else if (runwayDays >= 90) score += 30;
else if (runwayDays >= 45) score += 20;
else if (runwayDays >= 30) score += 10;
else score += 5;

// 2. BURN RATIO SCORE (25)
const burnRatio = totalIncome > 0 ? totalExpense / totalIncome : 1;

if (burnRatio <= 0.3) score += 25;
else if (burnRatio <= 0.5) score += 18;
else if (burnRatio <= 0.7) score += 10;
else score += 5;

// 3. SAVINGS RATE SCORE (20)
const savingsRate = totalIncome > 0 ? net / totalIncome : 0;

if (savingsRate >= 0.5) score += 20;
else if (savingsRate >= 0.3) score += 15;
else if (savingsRate >= 0.1) score += 10;
else score += 5;

// 4. INCOME TREND SCORE (15)
let incomeTrend = "stable";

if (sortedMonths.length >= 2) {
  const prevIncome = sortedMonths[sortedMonths.length - 2].income;
  const currIncome = sortedMonths[sortedMonths.length - 1].income;

  if (currIncome > prevIncome) incomeTrend = "growing";
  else if (currIncome < prevIncome) incomeTrend = "declining";
}

if (incomeTrend === "growing") score += 15;
else if (incomeTrend === "stable") score += 10;
else score += 5;

// FINAL SCORE
score = Math.min(100, Math.max(0, Math.round(score)));

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
    value: runwayDays,
  },
  {
    name: "Burn Ratio",
    value: burnRatio,
  },
  {
    name: "Savings Rate",
    value: savingsRate,
  },
  {
    name: "Income Trend",
    value: incomeTrend,
  },
];

  let stability = calculateStability(transactions);

// 🔥 CONTEXT-AWARE OVERRIDE
if (runwayMonths < 1 || net < avgMonthlyBurn) {
  stability = "Financially unstable 🔴";
}

  return {
  score,
  riskLevel,
  profitMargin: Number(profitMargin.toFixed(2)),
  runwayMonths: Number(runwayMonths.toFixed(2)),
  runwayDays: Number(runwayDays.toFixed(2)),
  avgMonthlyBurn: Number(avgMonthlyBurn.toFixed(2)),
  incomeGrowth: Number(incomeGrowth.toFixed(2)),
  topExpensePercent: Number(topExpensePercent.toFixed(2)),
  stability,
  breakdown,

  // 🔥 ADD THESE 2 LINES
  net,
  totalIncome,
};
} 