function computeDerivedMetrics(metrics) {
  const { income } = metrics;

  const history = income.history;

  // --- MID TERM TREND (3 months slope)
  let midTrend = 0;
  if (history.length >= 3) {
    midTrend = history[history.length - 1] - history[0];
  }

  // --- SHORT TERM TREND (last change)
  const shortTrend = income.growthRate;

  // --- TREND STRENGTH
  let trendStrength = "weak";

  if (shortTrend < -20 && midTrend < 0) {
    trendStrength = "strong_negative";
  } else if (shortTrend < 0) {
    trendStrength = "weak_negative";
  } else if (shortTrend > 20 && midTrend > 0) {
    trendStrength = "strong_positive";
  } else {
    trendStrength = "neutral";
  }

  // --- CONSISTENCY (variance check)
  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  const variance =
    history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / history.length;

  const consistency = variance < 50000 ? "high" : "low";

  return {
    shortTrend,
    midTrend,
    trendStrength,
    consistency
  };
}

function deriveFinancialState(metrics, derived) {
  const { runwayDays, savings, burnRate } = metrics;
  const { trendStrength } = derived;

  // --- PRIORITY 1: SURVIVAL
  if (runwayDays < 30) {
    return "critical";
  }

  // --- PRIORITY 2: DECLINING RISK
  if (runwayDays < 60 && trendStrength.includes("negative")) {
    return "declining_risk";
  }

  // --- PRIORITY 3: WEAK POSITION
  if (runwayDays < 90 && savings.total < 5000) {
    return "weak";
  }

  // --- PRIORITY 4: GROWTH
  if (trendStrength.includes("positive") && savings.rate > 0.3) {
    return "growth";
  }

  // --- DEFAULT
  return "stable";
}

function computeRiskScore(metrics, derived) {
  let score = 0;

  // Runway impact (highest weight)
  if (metrics.runwayDays < 30) score += 40;
  else if (metrics.runwayDays < 60) score += 25;
  else if (metrics.runwayDays < 90) score += 10;

  // Trend impact
  if (derived.trendStrength === "strong_negative") score += 30;
  else if (derived.trendStrength === "weak_negative") score += 15;

  // Burn rate
  if (metrics.burnRate > 0.5) score += 20;

  // Savings buffer
  if (metrics.savings.total < 2000) score += 20;

  return Math.min(score, 100);
}

function generateNarrative(state, metrics, derived) {
  switch (state) {
    case "critical":
      return {
        title: "Critical स्थिति",
        summary:
          "Your financial runway is dangerously low. Immediate action is required to avoid running out of funds.",
        priority: "Survival"
      };

    case "declining_risk":
      return {
        title: "Declining Risk",
        summary:
          "Your income is showing signs of decline while your runway is limited. Early action can prevent a financial crunch.",
        priority: "Stabilize income"
      };

    case "weak":
      return {
        title: "Weak Position",
        summary:
          "Your financial base is not strong enough to handle shocks. Improving savings and income stability is important.",
        priority: "Strengthen buffer"
      };

    case "growth":
      return {
        title: "Growth Phase",
        summary:
          "Your finances are improving with strong income trends and good savings behavior.",
        priority: "Scale and invest"
      };

    default:
      return {
        title: "Stable स्थिति",
        summary:
          "Your finances are stable with no immediate risks, but there is room for optimization.",
        priority: "Optimize"
      };
  }
}

function financialEngine(metrics) {
  const derived = computeDerivedMetrics(metrics);
  const state = deriveFinancialState(metrics, derived);
  const riskScore = computeRiskScore(metrics, derived);
  const narrative = generateNarrative(state, metrics, derived);

  return {
    derived,
    state,
    riskScore,
    narrative
  };
}