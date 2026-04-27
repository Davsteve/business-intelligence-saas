export function analyzeIncomeTrend(monthlyIncome = []) {
  if (!monthlyIncome || monthlyIncome.length < 2) {
    return {
      longTermTrend: "flat",
      shortTermChange: 0,
      stability: "unknown",
      momentum: "neutral",
      signal: "weak",
    };
  }

  const first = monthlyIncome[0];
  const last = monthlyIncome[monthlyIncome.length - 1];
  const prev = monthlyIncome[monthlyIncome.length - 2];

  // -----------------------
  // 1. LONG TERM TREND
  // -----------------------
  let longTermTrend = "flat";
  if (last > first) longTermTrend = "up";
  if (last < first) longTermTrend = "down";

  // -----------------------
  // 2. SHORT TERM CHANGE (%)
  // -----------------------
  const shortTermChange =
    prev > 0 ? ((last - prev) / prev) * 100 : 0;

  // -----------------------
  // 3. STABILITY (STD DEV)
  // -----------------------
  const mean =
    monthlyIncome.reduce((a, b) => a + b, 0) /
    monthlyIncome.length;

  const variance =
    monthlyIncome.reduce((sum, val) => {
      return sum + Math.pow(val - mean, 2);
    }, 0) / monthlyIncome.length;

  const stdDev = Math.sqrt(variance);

  const stability =
    stdDev < mean * 0.3 ? "stable" : "volatile";

  // -----------------------
  // 4. MOMENTUM
  // -----------------------
  let momentum = "neutral";

  if (longTermTrend === "up" && shortTermChange < 0)
    momentum = "slowing";

  if (longTermTrend === "down" && shortTermChange > 0)
    momentum = "recovering";

  if (longTermTrend === "up" && shortTermChange > 0)
    momentum = "accelerating";

  if (longTermTrend === "down" && shortTermChange < 0)
    momentum = "declining";

  // -----------------------
  // 5. FINAL SIGNAL
  // -----------------------
  let signal = "weak";

  if (longTermTrend === "up" && shortTermChange > 0)
    signal = "strong";

  else if (longTermTrend === "up" && shortTermChange < 0)
    signal = "mixed";

  else if (longTermTrend === "down" && shortTermChange < 0)
    signal = "weak";

  else if (longTermTrend === "down" && shortTermChange > 0)
    signal = "mixed";

  return {
    longTermTrend,
    shortTermChange: Number(shortTermChange.toFixed(1)),
    stability,
    momentum,
    signal,
  };
}