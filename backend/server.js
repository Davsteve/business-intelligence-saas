import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { calculateFinancialHealth } from "../src/utils/financialHealthEngine.js";

dotenv.config();

const app = express();

// ✅ CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// ✅ JSON parser
app.use(express.json());

// ✅ Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
});

app.use("/api/ai", limiter);

// 🔐 Supabase Setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 🔐 Auth Middleware
const verifyUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token" });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(403).json({ error: "Invalid token" });
    }

    req.user = data.user;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(500).json({ error: "Auth failed" });
  }
};

function generateSmartInsights(metrics) {
  const {
    incomeTrend,
    expenseRatio,
    runway,
    savings,
    burnRate
  } = metrics;

  const insights = [];

  // 🧠 1. Financial Position (CORE HEALTH)
  if (runway < 30) {
    insights.push({
      title: "Financial Survival Risk",
      message: "Your financial runway is critically low, meaning you may run out of funds soon if no changes are made.",
      impact: "CRITICAL",
      reasoning: "Runway below 30 days signals immediate survival risk.",
      action: "Cut all non-essential expenses immediately and secure short-term income sources."
    });
  } else if (runway < 60) {
    insights.push({
      title: "Limited Financial Buffer",
      message: "Your runway is limited, which puts you at moderate risk if income drops further.",
      impact: "HIGH",
      reasoning: "Runway between 30–60 days offers limited protection.",
      action: "Increase savings rate and reduce discretionary spending."
    });
  } else {
    insights.push({
      title: "Stable Financial Position",
      message: "You have a reasonable financial buffer, giving you some stability.",
      impact: "MEDIUM",
      reasoning: "Runway above 60 days provides flexibility.",
      action: "Maintain discipline and look for growth opportunities."
    });
  }

  // 📉 2. Income Risk
  if (incomeTrend < -20) {
    insights.push({
      title: "Income Decline Risk",
      message: "Your income is dropping significantly, which is the biggest threat to your financial stability.",
      impact: "CRITICAL",
      reasoning: "A decline greater than 20% is a major instability signal.",
      action: "Prioritize stabilizing income through new or alternative sources immediately."
    });
  } else if (incomeTrend < 0) {
    insights.push({
      title: "Income Instability",
      message: "Your income shows a declining trend, which may affect your future stability.",
      impact: "HIGH",
      reasoning: "Even small declines can compound over time.",
      action: "Identify ways to stabilize or diversify income."
    });
  } else {
    insights.push({
      title: "Income Growth Opportunity",
      message: "Your income is growing, creating an opportunity to strengthen your financial position.",
      impact: "MEDIUM",
      reasoning: "Positive trends allow wealth building.",
      action: "Increase savings and invest surplus wisely."
    });
  }

  // 💸 3. Spending Behavior
  if (expenseRatio > 60) {
    insights.push({
      title: "High Spending Pressure",
      message: "A large portion of your income is being spent, limiting your ability to save.",
      impact: "HIGH",
      reasoning: "Expense ratio above 60% restricts financial growth.",
      action: "Reduce discretionary expenses and optimize major cost areas."
    });
  } else if (expenseRatio > 40) {
    insights.push({
      title: "Moderate Spending",
      message: "Your spending is under control but still leaves room for improvement.",
      impact: "MEDIUM",
      reasoning: "Moderate ratios can be optimized.",
      action: "Track and trim non-essential expenses."
    });
  } else {
    insights.push({
      title: "Efficient Spending",
      message: "Your spending is well managed relative to your income.",
      impact: "LOW",
      reasoning: "Low expense ratio supports savings.",
      action: "Maintain current discipline."
    });
  }

  return insights;
}

// 🚀 MAIN ENDPOINT
app.post("/api/ai", verifyUser, async (req, res) => {
  const getImpactLevel = ({ runwayDays, burnRatio, incomeGrowth }) => {
  if (runwayDays < 30 || burnRatio > 70 || incomeGrowth < -10) {
    return "high";
  }
  if (runwayDays < 90 || burnRatio > 50 || incomeGrowth < 5) {
    return "medium";
  }
  return "low";
};
  try {
    const {
  trend,
  topCategory,
  topCategoryPercent,
  transactions
} = req.body;

// ✅ DERIVED METRICS (ADD HERE)
console.log("📥 Incoming transactions:", transactions);

const financialData = calculateFinancialHealth(transactions);

// ✅ CURRENT MONTH EXTRACTION (CRITICAL)
const latestMonthIncome =
  financialData?.monthlyIncomeArray?.slice(-1)[0] || 0;

const latestMonthNet =
  financialData?.monthlyNets?.slice(-1)[0] || 0;

// If net = income - expense → expense = income - net
const latestMonthExpense = latestMonthIncome - latestMonthNet;

console.log("financialData:", financialData);

if (!financialData) {
  console.error("financialData is undefined");
  return res.status(500).json({ error: "Financial calculation failed" });
}

let {
  totalIncome = 0,
  avgMonthlyExpenses = 0,
  incomeGrowth = 0,
  net = 0,
  runwayDays = 0,
  stability = "unknown",
  incomeTrendLabel = "unknown"
} = financialData || {};

const safeBurnRatio =
  latestMonthIncome > 0
    ? latestMonthExpense / latestMonthIncome
    : 0;

    const primaryIssue =
  incomeGrowth < 0
    ? "income_decline"
    : safeBurnRatio > 0.7
    ? "high_burn"
    : runwayDays < 60
    ? "low_runway"
    : "stable";

const secondaryIssue =
  primaryIssue === "income_decline" && safeBurnRatio > 0.5
    ? "expense_pressure"
    : runwayDays < 60
    ? "runway_risk"
    : "none";

let riskLevel = "MODERATE";

if (runwayDays < 30) {
  riskLevel = "HIGH";
} else if (runwayDays > 90) {
  riskLevel = "LOW";
}

if (
  !Number.isFinite(net) ||
  !Number.isFinite(avgMonthlyExpenses) ||
  !Number.isFinite(totalIncome)
) {
  console.error("Invalid data:", { net, avgMonthlyExpenses, totalIncome });
  return res.status(400).json({ error: "Invalid financial data" });
}

const surplus = latestMonthNet;
const safeSurplus = Math.max(0, surplus);

// ✅ SIMPLE ALLOCATION MODEL (NO EMERGENCY FUND)
const investableAmount = safeSurplus * 0.8;
const funMoney = safeSurplus * 0.2;

    // ✅ INSIGHTS (ALWAYS 3)
    const metrics = {
  incomeTrend: incomeGrowth,
  expenseRatio: safeBurnRatio * 100,
  runway: runwayDays,
  savings: latestMonthNet,
  burnRate: safeBurnRatio
};

const insights = generateSmartInsights(metrics);

    // ✅ PRIORITY
    let priority = "";

if (runwayDays < 15) {
  priority = `URGENT: Less than ${runwayDays} days of runway. Cut expenses immediately and secure income.`;
} else if (incomeGrowth < 0) {
  priority = `HIGH: Income is declining. Focus on increasing income sources urgently.`;
} else if (safeBurnRatio > 0.7) {
  priority = `HIGH: Spending is too high. Reduce non-essential expenses by 20–30%.`;
} else if (runwayDays < 90) {
  priority = `MODERATE: Improve your runway to at least 90 days.`;
} else {
  priority = `LOW: You're financially stable. Maintain discipline and grow.`;
}

    // ✅ SUMMARY
    const generateSummary = ({
  net,
  income,
  burn,
  runwayDays,
  safeBurnRatio,
  trend,
  riskLevel
}) => {
  let opening = "";
  let condition = "";
  let riskStatement = "";
  let forward = "";

  // 🟢 OPENING (state-based)
  if (riskLevel === "HIGH") {
    opening = "Your financial position is currently under pressure.";
  } else if (riskLevel === "MODERATE") {
    opening = "Your financial position is stable but requires attention.";
  } else {
    opening = "Your financial position appears stable and well-managed.";
  }

  // 💸 CONDITION (numbers-driven)
  if (safeBurnRatio > 0.8) {
    condition = "Expenses are consuming a significant portion of your income";
  } else if (safeBurnRatio > 0.5) {
    condition = "Spending levels are moderately high relative to income";
  } else {
    condition = "Spending is well-controlled relative to income";
  }

  // ⏳ RUNWAY CONTEXT
  let runwayContext = "";
  if (runwayDays < 30) {
    runwayContext = "with limited cash runway remaining";
  } else if (runwayDays < 90) {
    runwayContext = "with a moderate financial buffer";
  } else {
    runwayContext = "supported by a strong cash runway";
  }

  // 📉 TREND
  let trendContext = "";
  if (trend === "volatile") {
  trendContext = "Income shows high fluctuations with no clear direction";
}
  if (trend === "declining") {
    trendContext = "Income trends indicate a downward trajectory";
  } else if (trend === "growing") {
    trendContext = "Income is showing positive growth momentum";
  } else {
    trendContext = "Income levels are relatively stable";
  }

  // ⚠️ RISK STATEMENT
  if (riskLevel === "HIGH") {
    riskStatement =
      "This combination increases the risk of liquidity stress if not addressed.";
  } else if (riskLevel === "MODERATE") {
    riskStatement =
      "While manageable, this situation could weaken financial resilience over time.";
  } else {
    riskStatement =
      "Overall financial risk remains low under current conditions.";
  }

  // 🔮 FORWARD OUTLOOK
  forward =
    "Maintaining disciplined spending and monitoring income trends will be key to sustaining financial stability.";

  return `${opening} ${condition}, ${runwayContext}. ${trendContext}. ${riskStatement} ${forward}`;
};

const summary = generateSummary({
  net,
  income: latestMonthIncome,
burn: latestMonthExpense,
  runwayDays,
  safeBurnRatio,
  trend,
  riskLevel
});


    // 🧠 AI ENHANCEMENT (SAFE)
let aiSummary = summary;
let aiInsights = insights;
const impactScore = {
  high: 3,
  medium: 2,
  low: 1
};

insights.sort((a, b) => impactScore[b.impact] - impactScore[a.impact]);
let score = Math.round(
  (Math.min(runwayDays, 120) / 120) * 40 +
  (1 - safeBurnRatio) * 30 +
  Math.max(0, incomeGrowth) * 3
);

let runwayStatus = "unknown";

if (runwayDays <= 0) runwayStatus = "none";
else if (runwayDays < 30) runwayStatus = "low";
else if (runwayDays <= 90) runwayStatus = "moderate";
else runwayStatus = "strong";

try {
  const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a strict personal financial analyst.

You MUST follow a structured decision-making process.

---

STEP 1: Evaluate the situation
- Identify the biggest financial risk
- Do NOT treat all problems equally

STEP 2: Prioritize correctly
- If income is falling → this is the #1 problem
- If runway < 60 days → survival is priority
- DO NOT suggest investing when runway is low

STEP 3: Give clear actions
- One PRIMARY action (most important)
- 2–3 SECONDARY actions (supporting steps)

---

STRICT RULES:

- Do NOT give generic advice
- Do NOT repeat the same priority multiple times
- Do NOT contradict yourself
- Do NOT suggest long-term strategies when short-term survival is at risk

---

OUTPUT FORMAT (MANDATORY):

Overall Situation:
(1–2 lines summary using real numbers)

Biggest Risk:
(One clear problem)

Primary Action:
(What must be done immediately)

Secondary Actions:
- Point 1
- Point 2
- Point 3

Key Insight:
(One sharp takeaway)

---

Be direct, practical, and logical.
`
        },
        {
          role: "user",
          content: `
Financial Data:

- Financial Score: ${score}/100
- Risk Level: ${riskLevel}

- Current Month Income: ₹${latestMonthIncome}
- Current Month Expenses: ₹${latestMonthExpense}
- Current Month Savings: ₹${latestMonthNet}

- Income Growth: ${incomeGrowth}%
- Income Trend: ${incomeTrendLabel}

- Burn Ratio: ${(safeBurnRatio * 100).toFixed(1)}%
- Runway: ${runwayDays} days (${runwayStatus})

- Stability: ${stability}
- Top Expense Category: ${topCategory} (${(topCategoryPercent || 0).toFixed(1)}%)

---

Instructions:

You MUST generate EXACTLY 3 insights.

Each insight MUST focus on a COMPLETELY DIFFERENT dimension:

1. CURRENT → Overall financial position (runway, savings, stability)
2. RISK → The biggest financial danger (ONLY ONE)
3. GROWTH → Future improvement (NOT current problem)

STRICT RULES:

- DO NOT repeat the same metric in multiple insights
- If income decline is used in RISK → DO NOT mention it again
- GROWTH insight MUST NOT describe a problem
- CURRENT insight MUST NOT describe risk
- Each insight must talk about DIFFERENT data points

Each insight MUST include:
"type": "current" | "risk" | "growth"

Also include:
- summary (Brief 3 liner, human-like explanation of situation)
- riskLevel (LOW | MODERATE | HIGH)
- priority (1–2 lines, clear and actionable)

Return ONLY valid JSON:
{
  "summary": "...",
  "riskLevel": "...",
  "priority": "...",
  "insights": [...]
}
`
        }
      ]
    })
  });

  const data = await aiResponse.json();

  if (data?.choices?.[0]?.message?.content) {
  const raw = data.choices[0].message.content;

  try {
    // ✅ Extract ONLY JSON part (even if messy)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (!jsonMatch) throw new Error("No JSON found");

    const parsed = JSON.parse(jsonMatch[0]);

    aiSummary = parsed.summary || summary;
priority = parsed.priority || priority;
riskLevel = parsed.riskLevel || riskLevel;

    // ✅ Keep backend structure, only enhance text
if (Array.isArray(parsed.insights)) {
  const ai = parsed.insights;

  // ✅ Create map ONCE (outside loop)
  const aiMap = {
    current: ai.find(i => i.type === "current") || ai[0],
    risk: ai.find(i => i.type === "risk") || ai[1],
    growth: ai.find(i => i.type === "growth") || ai[2],
  };

  // ✅ Clean mapping (NO nesting, NO duplication)
  aiInsights = insights.map((baseInsight) => {
    let matchedAI;

    if (baseInsight.title.toLowerCase().includes("financial")) {
      matchedAI = aiMap.current;
    } else if (baseInsight.title.toLowerCase().includes("spending")) {
      matchedAI = aiMap.risk;
    } else if (baseInsight.title.toLowerCase().includes("income")) {
      matchedAI = aiMap.growth;
    }

    return {
      ...baseInsight,
      title: matchedAI?.title || baseInsight.title,
      message: matchedAI?.message || baseInsight.message,
      action: matchedAI?.action || baseInsight.action
    };
  });

  // ✅ HARD DUPLICATE PROTECTION
  const seen = new Set();

  aiInsights = aiInsights.map((insight) => {
    const key = insight.message?.toLowerCase();

    if (seen.has(key)) {
      return {
        ...insight,
        message: "Your financial pattern suggests a need for strategic adjustment.",
        action: "Re-evaluate both income and expenses to improve balance."
      };
    }

    seen.add(key);
    return insight;
  });
}

  } catch (err) {
    console.error("AI JSON parse failed:", err);

    // ✅ CLEAN fallback (NOT raw anymore)
    aiSummary = summary;
  }
}

} catch (err) {
  console.log("AI failed, using base insights");
}

// ------------------------
// SMART CAPITAL ALLOCATION
// ------------------------



// ✅ FINAL RESPONSE (ONLY ONE)
return res.json({
  summary: aiSummary,
  priority,
  riskLevel,
  insights: aiInsights,
  avgMonthlyBurn: avgMonthlyExpenses,
  numbers: {
  surplus: Math.round(safeSurplus),
  investableAmount: Math.round(investableAmount),
  funMoney: Math.round(funMoney),
  income: Math.round(latestMonthIncome),
  burn: Math.round(latestMonthExpense),
  savings: Math.round(latestMonthNet)
}
});

  } catch (error) {
  console.error("🚨 AI ROUTE CRASH:", error);
  console.error("STACK:", error.stack);

  return res.status(500).json({
    error: "Internal server error",
    message: error.message
  });
}
});

// 🚀 Start Server
const PORT = 5000;

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running");
});