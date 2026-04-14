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
  origin: "https://clariflow-eight.vercel.app",
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
  burnRatio = 0,
  runwayDays = 0,
  stability = "unknown",
  incomeTrendLabel = "unknown"
} = financialData || {};

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

const surplus = totalIncome - avgMonthlyExpenses;

// Prevent negative values
const safeSurplus = Math.max(0, surplus);

// 50% safety buffer
const safetyReserve = safeSurplus * 0.5;

// What user can actually use
const investableAmount = safeSurplus - safetyReserve;

// Realistic reinvestment (not aggressive)
const reinvestment = investableAmount * 0.6;

    // ✅ INSIGHTS (ALWAYS 3)
    const insights = [];

    // 1️⃣ CASH BUFFER
    if (runwayDays < 30) {
      insights.push({
  title: "Low Cash Buffer",
  message: `You only have ${runwayDays} days of runway, which is critically low.`,
  action: `Increase runway to at least 90 days by reducing burn or increasing income.`,
  impact: "high",
  numbers: {
    runwayDays,
    burn: avgMonthlyExpenses,
income: totalIncome
  }
});
    } else if (runwayDays < 90) {
  insights.push({
    title: "Moderate Cash Buffer",
    message: `Based on your historical income and expense, You currently have ${runwayDays} days of runway. While this provides some stability, it may not be sufficient to handle unexpected financial shocks.`,
    action: `Increase your runway to at least 120 days by reducing expenses by approximately ₹${Math.round(avgMonthlyExpenses * 0.15)} or improving income streams.`,
    impact: "medium",
    numbers: {
      runwayDays,
      burn: avgMonthlyExpenses,
income: totalIncome,
      suggestedCut: Math.round(avgMonthlyExpenses * 0.15)
    }
  });

} else {
  insights.push({
    title: "Strong Cash Position",
    message: `Your runway stands at ${runwayDays} days, indicating a strong financial buffer and low short-term liquidity risk.`,
    action: `Consider allocating ₹${Math.round(net * 0.2)} towards investments or growth initiatives while maintaining a safety reserve.`,
    impact: "low",
    numbers: {
      runwayDays,
      burn: avgMonthlyExpenses,
income: totalIncome,
      investableAmount: Math.round(net * 0.2)
    }
      });
    }

    // 2️⃣ BURN
    if (burnRatio > 0.7) {
      insights.push({
  title: "High Burn Rate",
  message: `You are spending ₹${avgMonthlyExpenses} against an income of ₹${totalIncome}, resulting in a ${Math.round(burnRatio * 100)}% burn ratio.`,
  action: `Reduce expenses by ₹${Math.round(avgMonthlyExpenses * 0.2)} to bring burn ratio below 60%.`,
  impact: "high",
  numbers: {
    burn: avgMonthlyExpenses,
income: totalIncome,
    burnRatio
  }
});
    } else if (burnRatio > 0.5) {
  insights.push({
    title: "Moderate Burn",
    message: `Your burn ratio is ${Math.round(burnRatio * 100)}%, with expenses of ₹${avgMonthlyExpenses} against income of ₹${totalIncome}. This is manageable but leaves limited margin for error.`,
    action: `Optimize expenses by cutting approximately ₹${Math.round(avgMonthlyExpenses * 0.1)} to improve financial flexibility.`,
    impact: "medium",
    numbers: {
      burn: avgMonthlyExpenses,
income: totalIncome,
      burnRatio,
      suggestedCut: Math.round(avgMonthlyExpenses * 0.1)
    }
  });

} else {
  insights.push({
    title: "Efficient Spending",
    message: `Your burn ratio is a healthy ${Math.round(burnRatio * 100)}%, with expenses well aligned to your income of ₹${totalIncome}.`,
    action: `Maintain current discipline. You may consider reallocating ₹${Math.round((totalIncome - avgMonthlyExpenses) * 0.2)} towards savings or growth.`,
    impact: "low",
    numbers: {
      burn: avgMonthlyExpenses,
income: totalIncome,
      burnRatio,
      surplus: totalIncome - avgMonthlyExpenses,
      investableAmount: Math.round((totalIncome - avgMonthlyExpenses) * 0.2)
    }
      });
    }

    // 3️⃣ GROWTH
if (incomeGrowth < 0) {
  insights.push({
    title: "Declining Income",
    message: `Your income growth is ${incomeGrowth.toFixed(1)}%, indicating a downward trend.`,
    action: `Increase revenue streams or pricing to reverse the decline within the next month.`,
    impact: "high",
    numbers: {
      incomeGrowth,
      income: totalIncome
    }
  });

} else if (incomeGrowth < 10) {
  insights.push({
    title: "Slow Growth",
    message: `Your income is growing at ${incomeGrowth.toFixed(1)}%, which is positive but relatively slow for sustainable expansion.`,
    action: `Aim to increase growth to at least 10–15% by adding new income streams or improving conversion efficiency.`,
    impact: "medium",
    numbers: {
      incomeGrowth,
      income: totalIncome,
      targetGrowth: 12,
      gapToTarget: +(12 - incomeGrowth).toFixed(1)
    }
  });

} else {
  insights.push({
    title: "Strong Growth",
    message: `Your income is growing at a healthy ${incomeGrowth.toFixed(1)}%, indicating strong upward momentum.`,
    action: `Capitalize on this by reinvesting approximately ₹${Math.round(totalIncome * 0.2)} into scaling operations or marketing.`,
    impact: "low",
    numbers: {
      incomeGrowth,
      income: totalIncome,
      reinvestment: Math.round(totalIncome * 0.2)
    }
  });
}

    // ✅ PRIORITY
    let priority = "";

if (runwayDays < 15) {
  priority = `URGENT: You have less than ${runwayDays} days of runway. Reduce burn immediately and secure additional income or capital within the next 7–10 days.`;
} else if (burnRatio > 0.7) {
  priority = `HIGH: Your burn ratio is ${Math.round(burnRatio * 100)}%. Cut at least 20–30% of non-essential expenses to stabilize cash flow.`;
} else if (runwayDays < 90) {
  priority = `MODERATE: Strengthen your runway to at least 90 days by improving savings and optimizing expenses.`;
} else {
  priority = `STABLE: Maintain current discipline and explore growth opportunities.`;
}

    // ✅ SUMMARY
    const generateSummary = ({
  net,
  income,
  burn,
  runwayDays,
  burnRatio,
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
  if (burnRatio > 0.8) {
    condition = "Expenses are consuming a significant portion of your income";
  } else if (burnRatio > 0.5) {
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
  income: totalIncome,
  burn: avgMonthlyExpenses,
  runwayDays,
  burnRatio,
  trend,
  riskLevel
});


    // 🧠 AI ENHANCEMENT (SAFE)
let aiSummary = summary;
let aiInsights = insights;
let score = 50; // temporary
let totalExpense = avgMonthlyExpenses;
let avgMonthlyIncome = totalIncome;

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
- Avoid technical terms like "burn ratio", "financial resilience", "liquidity"
- Replace them with simple phrases:
  ❌ "burn ratio" → ✅ "spending compared to income"
  ❌ "liquidity" → ✅ "available money"
- Keep sentences short and clear
- Sound encouraging, not analytical

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

- Total Income: ₹${totalIncome}
- Total Expenses: ₹${totalExpense}
- Net Savings: ₹${net}

- Avg Monthly Income: ₹${avgMonthlyIncome}
- Avg Monthly Expenses: ₹${avgMonthlyExpenses}

- Income Growth: ${incomeGrowth}%
- Income Trend: ${incomeTrendLabel}

- Burn Ratio: ${(burnRatio * 100).toFixed(1)}%
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

    aiSummary = parsed.summary;
    priority = parsed.priority;
    riskLevel = parsed.riskLevel;
    aiInsights = parsed.insights;

    aiInsights = aiInsights.map(insight => ({
  ...insight,
  numbers: {
    ...insight.numbers,

    // 🔥 FORCE CONSISTENCY
    surplus: Math.round(safeSurplus),
    investableAmount: Math.round(investableAmount),
    reinvestment: Math.round(reinvestment),
    income: Math.round(totalIncome),
burn: Math.round(avgMonthlyExpenses)
  }
}));

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
    reinvestment: Math.round(reinvestment),
    income: Math.round(totalIncome),
burn: Math.round(avgMonthlyExpenses)
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