export function calculateFinancialHealth(transactions) {
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
  };
}

function calculateStability(transactions) {

  console.log("Monthly Income Values:", values);
  const monthlyIncome = {};

  transactions.forEach((txn) => {
    if (txn.type !== "income") return;

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
const runwayMonths =
  avgMonthlyBurn > 0 ? net / avgMonthlyBurn : 0;

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

  // 🔹 Scaling
  const clamp = (num) =>
    Math.max(0, Math.min(100, num));

  const marginScore = clamp((profitMargin / 40) * 100);
  const runwayScore = clamp((runwayMonths / 12) * 100);
  const growthScore = clamp((incomeGrowth + 20) * 2.5);
  const concentrationScore = clamp(
    100 - topExpensePercent * 1.5
  );

  // 🔹 Weights
  const weights = {
    margin: 0.25,
    runway: 0.25,
    growth: 0.2,
    concentration: 0.15,
    stability: 0.15,
  };

  const finalScore =
    marginScore * weights.margin +
    runwayScore * weights.runway +
    growthScore * weights.growth +
    concentrationScore * weights.concentration;

  const score = Math.round(finalScore);

  // 🔹 Risk Classification
  let riskLevel = "Low";
  if (score < 70) riskLevel = "Moderate";
  if (score < 50) riskLevel = "High";
  if (score < 30) riskLevel = "Critical";

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
      name: "Profit Margin",
      rawValue: Number(profitMargin.toFixed(2)),
      score: Math.round(marginScore),
      weight: weights.margin,
      contribution: Math.round(
        marginScore * weights.margin
      ),
      status: getStatus(marginScore),
    },
    {
      name: "Runway",
      rawValue: Number(runwayMonths.toFixed(2)),
      score: Math.round(runwayScore),
      weight: weights.runway,
      contribution: Math.round(
        runwayScore * weights.runway
      ),
      status: getStatus(runwayScore),
    },
    {
      name: "Income Growth",
      rawValue: Number(incomeGrowth.toFixed(2)),
      score: Math.round(growthScore),
      weight: weights.growth,
      contribution: Math.round(
        growthScore * weights.growth
      ),
      status: getStatus(growthScore),
    },
    {
      name: "Expense Concentration",
      rawValue: Number(topExpensePercent.toFixed(2)),
      score: Math.round(concentrationScore),
      weight: weights.concentration,
      contribution: Math.round(
        concentrationScore *
          weights.concentration
      ),
      status: getStatus(concentrationScore),
    },
  ];

  const stability = calculateStability(transactions);

  return {
    score,
    riskLevel,
    profitMargin: Number(profitMargin.toFixed(2)),
    runwayMonths: Number(runwayMonths.toFixed(2)),
    runwayDays: Number(runwayDays.toFixed(2)),
    avgMonthlyBurn: Number(avgMonthlyBurn.toFixed(2)),
    incomeGrowth: Number(incomeGrowth.toFixed(2)),
    topExpensePercent: Number(topExpensePercent.toFixed(2)),
    stability: stability,
    breakdown,
  };
} 