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

// 🚀 MAIN ENDPOINT
app.post("/api/ai", verifyUser, async (req, res) => {
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
    const insights = [];

    // 1️⃣ CASH BUFFER
    if (runwayDays < 30) {
  insights.push({
    title: "Low Cash Buffer",
    message: `You only have ${runwayDays} days of runway, which is critically low.`,
    action: `Increase runway to at least 90 days by reducing expenses or increasing income immediately.`,
    impact: "low",
    numbers: {
  income: Math.round(latestMonthIncome),
  expenses: Math.round(latestMonthExpense),
  savings: Math.round(latestMonthNet),
  runwayDays: Math.round(runwayDays),
  burnRatio: +(safeBurnRatio * 100).toFixed(1),
  incomeGrowth: +incomeGrowth.toFixed(1),
  suggestedCut: Math.round(latestMonthExpense * 0.2),
  investableAmount: Math.round(investableAmount),
  funMoney: Math.round(funMoney)
}
  });

} else if (runwayDays < 60) {
  insights.push({
    title: "Moderate Cash Buffer",
    message: `You currently have ${runwayDays} days of runway. This provides some stability but could be improved.`,
    action: `Aim to increase runway to at least 90 days by reducing expenses by around ₹${Math.round(latestMonthExpense * 0.15)}.`,
    impact: "medium",
    numbers: {
  income: Math.round(latestMonthIncome),
  expenses: Math.round(latestMonthExpense),
  savings: Math.round(latestMonthNet),
  runwayDays: Math.round(runwayDays),
  burnRatio: +(safeBurnRatio * 100).toFixed(1),
  incomeGrowth: +incomeGrowth.toFixed(1),
  suggestedCut: Math.round(latestMonthExpense * 0.2),
  investableAmount: Math.round(investableAmount),
  funMoney: Math.round(funMoney)
}
  });

} else {
  insights.push({
    title: "Strong Cash Position",
    message: `Your runway stands at ${runwayDays} days, indicating a strong financial buffer.`,
    action: `You can safely allocate part of your surplus towards investments or growth.`,
    impact: "high",
    numbers: {
  income: Math.round(latestMonthIncome),
  expenses: Math.round(latestMonthExpense),
  savings: Math.round(latestMonthNet),
  runwayDays: Math.round(runwayDays),
  burnRatio: +(safeBurnRatio * 100).toFixed(1),
  incomeGrowth: +incomeGrowth.toFixed(1),
  suggestedCut: Math.round(latestMonthExpense * 0.2),
  investableAmount: Math.round(investableAmount),
  funMoney: Math.round(funMoney)
}
  });
}

    // 2️⃣ BURN
    if (safeBurnRatio > 0.7) {
      insights.push({
  title: "High Burn Rate",
  message: `You are spending ₹${latestMonthExpense} against an income of ₹${latestMonthIncome}, resulting in a ${Math.round(safeBurnRatio * 100)}% burn ratio.`,
  action: `Reduce expenses by ₹${Math.round(latestMonthExpense * 0.2)} to bring burn ratio below 60%.`,
  impact: "high",
  numbers: {
  income: Math.round(latestMonthIncome),
  expenses: Math.round(latestMonthExpense),
  savings: Math.round(latestMonthNet),
  runwayDays: Math.round(runwayDays),
  burnRatio: +(safeBurnRatio * 100).toFixed(1),
  incomeGrowth: +incomeGrowth.toFixed(1),
  suggestedCut: Math.round(latestMonthExpense * 0.2),
  investableAmount: Math.round(investableAmount),
  funMoney: Math.round(funMoney)
}
});
    } else if (safeBurnRatio > 0.5) {
  insights.push({
    title: "Moderate Burn",
    message: `Your burn ratio is ${Math.round(safeBurnRatio * 100)}%, with expenses of ₹${latestMonthExpense} against income of ₹${latestMonthIncome}. This is manageable but leaves limited margin for error.`,
    action: `Optimize expenses by cutting approximately ₹${Math.round(latestMonthExpense * 0.1)} to improve financial flexibility.`,
    impact: "medium",
    numbers: {
  income: Math.round(latestMonthIncome),
  expenses: Math.round(latestMonthExpense),
  savings: Math.round(latestMonthNet),
  runwayDays: Math.round(runwayDays),
  burnRatio: +(safeBurnRatio * 100).toFixed(1),
  incomeGrowth: +incomeGrowth.toFixed(1),
  suggestedCut: Math.round(latestMonthExpense * 0.2),
  investableAmount: Math.round(investableAmount),
  funMoney: Math.round(funMoney)
}
  });

} else {
  insights.push({
    title: "Efficient spending",
    message: `Your burn ratio is a healthy ${Math.round(safeBurnRatio * 100)}%, with expenses well aligned to your income of ₹${latestMonthIncome}.`,
    action: `You can safely increase savings or investments by ₹${Math.round(safeSurplus * 0.2)} without affecting stability.`,
    impact: "low",
    numbers: {
  income: Math.round(latestMonthIncome),
  expenses: Math.round(latestMonthExpense),
  savings: Math.round(latestMonthNet),
  runwayDays: Math.round(runwayDays),
  burnRatio: +(safeBurnRatio * 100).toFixed(1),
  incomeGrowth: +incomeGrowth.toFixed(1),
  suggestedCut: Math.round(latestMonthExpense * 0.2),
  investableAmount: Math.round(investableAmount),
  funMoney: Math.round(funMoney)
}
      });
    }

    // 3️⃣ GROWTH
if (incomeGrowth < 0) {
  insights.push({
    title: "Declining Income",
    message: `Your income dropped by ${Math.abs(incomeGrowth).toFixed(1)}%. Combined with a runway of ${runwayDays} days, this puts pressure on your financial stability.`,
    action: `Increase revenue streams or pricing to reverse the decline within the next month.`,
    impact: "high",
    numbers: {
  income: Math.round(latestMonthIncome),
  expenses: Math.round(latestMonthExpense),
  savings: Math.round(latestMonthNet),
  runwayDays: Math.round(runwayDays),
  burnRatio: +(safeBurnRatio * 100).toFixed(1),
  incomeGrowth: +incomeGrowth.toFixed(1),
  suggestedCut: Math.round(latestMonthExpense * 0.2),
  investableAmount: Math.round(investableAmount),
  funMoney: Math.round(funMoney)
}
  });

} else if (incomeGrowth < 10) {
  insights.push({
    title: "Slow Growth",
    message: `Your income is growing at ${incomeGrowth.toFixed(1)}%, which is positive but relatively slow for sustainable expansion.`,
    action: `Aim to increase growth to at least 10–15% by adding new income streams or improving conversion efficiency.`,
    impact: "medium",
    numbers: {
  income: Math.round(latestMonthIncome),
  expenses: Math.round(latestMonthExpense),
  savings: Math.round(latestMonthNet),
  runwayDays: Math.round(runwayDays),
  burnRatio: +(safeBurnRatio * 100).toFixed(1),
  incomeGrowth: +incomeGrowth.toFixed(1),
  suggestedCut: Math.round(latestMonthExpense * 0.2),
  investableAmount: Math.round(investableAmount),
  funMoney: Math.round(funMoney)
}
  });

} else {
  insights.push({
    title: "Strong Growth",
    message: `Your income is growing at a healthy ${incomeGrowth.toFixed(1)}%, indicating strong upward momentum.`,
    action: `You have room to allocate about ₹${Math.round(funMoney)} as fun money while still investing the majority. Maintain this balance.`,
    impact: "low",
    numbers: {
  income: Math.round(latestMonthIncome),
  expenses: Math.round(latestMonthExpense),
  savings: Math.round(latestMonthNet),
  runwayDays: Math.round(runwayDays),
  burnRatio: +(safeBurnRatio * 100).toFixed(1),
  incomeGrowth: +incomeGrowth.toFixed(1),
  suggestedCut: Math.round(latestMonthExpense * 0.2),
  investableAmount: Math.round(investableAmount),
  funMoney: Math.round(funMoney)
}
  });
  // ✅ FINAL IMPACT SANITY CHECK (ONLY IF NEEDED)
insights.forEach((insight) => {
  // If runway is critical → always high
  if (runwayDays < 15 && insight.title.includes("Cash")) {
    insight.impact = "high";
  }

  // If burn is very high → force high
  if (safeBurnRatio > 0.75 && insight.title.toLowerCase().includes("burn")) {
    insight.impact = "high";
  }

  // If income is declining → force high
  if (incomeGrowth < 0 && insight.title.toLowerCase().includes("income")) {
    insight.impact = "high";
  }
});
}

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
You are a simple, human-friendly financial advisor.

Speak like you're explaining money to a normal person, not an expert.

Rules:
- Explain numbers in simple terms, but DO NOT ignore them.
Always base your advice strictly on:
- income
- expenses
- savings
- growth
- Keep sentences short and clear
- Sound encouraging, not analytical

IMPORTANT RULES:
- If expenses < 50% of income → DO NOT say spending is high
- If income is decreasing → MUST highlight it as risk
- If savings > 30% → MUST mention strong savings behavior

Structure:
1. First insight → something positive (compliment)
2. Second → risk/problem
3. Third → opportunity

Actions:
- Must feel realistic and easy to follow
- Use numbers only when helpful, not everywhere

Tone:
- Friendly
- Clear
- Practical
- Slightly motivational

Goal:
Make the user feel:
"I understand my situation and know what to do next"
`
        },
        {
          role: "user",
          content: `
Here is the user's financial data:

Here is the user's financial data:

- Financial Score: ${score}/100
- Risk Level: ${riskLevel}

- Current Month Income: ₹${latestMonthIncome}
- Current Month Expenses: ₹${latestMonthExpense}
- Current Month Savings: ₹${latestMonthNet}

- Income Growth: ${incomeGrowth}%
- Income Trend: ${incomeTrendLabel}

- Burn Ratio: ${(safeBurnRatio * 100).toFixed(1)}%
- Runway: ${runwayDays} days

- Stability: ${stability}
- Top Expense Category: ${topCategory} (${(topCategoryPercent || 0).toFixed(1)}%)

Priority Context:
${priority}

---

Instructions:

Give EXACTLY 3 insights:

1. First → something the user is doing well (positive reinforcement)
2. Second → a problem or risk they should fix
3. Third → a growth opportunity

Each insight must include:
- title (simple, human-friendly)
- message (clear explanation, not technical)
- action (specific and realistic)
- impact (low | medium | high)

Also include:
- summary (short, human-like explanation of situation)
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
  aiInsights = insights.map((baseInsight, i) => ({
    ...baseInsight,
    title: parsed.insights[i]?.title || baseInsight.title,
    message: parsed.insights[i]?.message || baseInsight.message,
    action: parsed.insights[i]?.action || baseInsight.action,
    // 🔒 NEVER override impact or numbers
  }));
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