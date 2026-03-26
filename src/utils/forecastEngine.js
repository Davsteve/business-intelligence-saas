export function calculateForecast(transactions) {
  if (!transactions || transactions.length === 0) {
    return null;
  }

  const monthlyMap = {};

  // ----------------------------
  // 1️⃣ GROUP TRANSACTIONS
  // ----------------------------
  transactions.forEach((t) => {
    if (!t.created_at) return;

    const date = new Date(t.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}`;

    if (!monthlyMap[key]) {
      monthlyMap[key] = { income: 0, expense: 0 };
    }

    if (t.categories?.type === "income") {
  monthlyMap[key].income += t.amount;
} else if (t.categories?.type === "expense") {
  monthlyMap[key].expense += t.amount;
}
  });

  // ----------------------------
  // 2️⃣ BUILD LAST 12 MONTHS (PADDED)
  // ----------------------------
  const now = new Date();
  const last12Months = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;

    const data = monthlyMap[key] || { income: 0, expense: 0 };

    last12Months.push({
      date: d,
      label: d.toLocaleString("default", {
        month: "short",
        year: "numeric",
      }),
      income: data.income,
      expense: data.expense,
      net: data.income - data.expense,
    });
  }

  // ----------------------------
  // 3️⃣ KPIs
  // ----------------------------
  const latestMonthNet = last12Months[last12Months.length - 1].net;

const validMonths = last12Months.filter(
  (m) => m.income > 0 || m.expense > 0
);

const averageNet =
  validMonths.reduce((acc, curr) => acc + curr.net, 0) /
  (validMonths.length || 1);

const averageExpense =
  validMonths.reduce((acc, curr) => acc + curr.expense, 0) /
  (validMonths.length || 1);


 const variance =
  validMonths.reduce((acc, m) => acc + Math.abs(m.net - averageNet), 0) /
  (validMonths.length || 1);

const stabilityFactor = Math.max(
  0.2,
  1 - variance / (Math.abs(averageNet) || 1)
);


  // ----------------------------
  // 4️⃣ PROJECTION (NEXT 3 MONTHS)
  // ----------------------------

  const projectionData = [];

  let lastDate = last12Months[last12Months.length - 1].date;
  let lastNet = latestMonthNet;

  for (let i = 1; i <= 3; i++) {
    const futureDate = new Date(
      lastDate.getFullYear(),
      lastDate.getMonth() + i,
      1
    );

    // Conservative projection:
    // move 20% toward average trend each month
    const growthRate =
  latestMonthNet !== 0
    ? (latestMonthNet - averageNet) / Math.abs(averageNet || 1)
    : 0;

// clamp growth so it doesn't go crazy
const cappedGrowth = Math.max(Math.min(growthRate, 0.2), -0.2);

lastNet = lastNet + averageNet * 0.3 * stabilityFactor;

    projectionData.push({
      label: futureDate.toLocaleString("default", {
        month: "short",
        year: "numeric",
      }),
      projectedNet: lastNet,
    });
  }

  // ----------------------------
  // 5️⃣ FORMAT FOR CHART
  // ----------------------------

  const formattedActual = last12Months.map((m) => ({
    label: m.label,
    actualNet: m.net,
    projectedNet: null,
  }));

  const formattedProjection = projectionData.map((p) => ({
    label: p.label,
    actualNet: null,
    projectedNet: p.projectedNet,
  }));

  return {
    monthlyData: formattedActual,
    projectionData: formattedProjection,
    latestMonthNet,
    averageNet,
    averageExpense,
  };
}