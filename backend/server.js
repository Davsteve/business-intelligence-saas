import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

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
  net,
  income,
  burn,
  growth,
  trend,
  score, 
  topCategory,
  topCategoryPercent
} = req.body;

    // ✅ VALIDATION FIRST
    if (
      !Number.isFinite(net) ||
      !Number.isFinite(burn) ||
      !Number.isFinite(income)
    ) {
      return res.status(400).json({ error: "Invalid input data" });
    }

    // ✅ DERIVED METRICS (ADD HERE)
const runwayMonths = Number(req.body.runwayMonths || 0);
const runwayDays = Number(req.body.runwayDays || 0);
    const burnRatio = income > 0 ? burn / income : 0;

    // ✅ RISK LEVEL (DEFINE EARLY)
    const riskLevel =
  runwayDays <= 15 ? "HIGH" :
  burnRatio > 0.7 ? "HIGH" :
  runwayDays < 90 ? "MODERATE" :
  "LOW";

    // ✅ INSIGHTS (ALWAYS 3)
    const insights = [];

    // 🔥 SCORE-BASED PRIMARY INSIGHT
if (score !== undefined) {
  if (score < 35) {
    insights.push({
      title: "Financial Danger Zone",
      message: `Your financial health score is ${score}/100. Your current financial position is at risk.`,
      action: "Reduce expenses immediately and increase income sources to stabilize your finances.",
      impact: "high"
    });
  } 
  else if (score < 60) {
    insights.push({
      title: "Financial Stability at Risk",
      message: `Your score of ${score}/100 indicates moderate financial risk.`,
      action: "Focus on improving savings and extending your runway.",
      impact: "medium"
    });
  } 
  else {
    insights.push({
      title: "Healthy Financial Position",
      message: `Your financial health score of ${score}/100 reflects good financial discipline.`,
      action: "Maintain your current habits and explore growth opportunities.",
      impact: "low"
    });
  }
}

    // 2️⃣ CASH BUFFER
    if (runwayDays < 30) {
      insights.push({
  title: "Low Cash Buffer",
  message: `You only have ${runwayDays} days of runway, which is critically low.`,
  action: `Increase runway to at least 90 days by reducing burn or increasing income.`,
  impact: "high",
  numbers: {
    runwayDays,
    burn,
    income
  }
});
    } else if (runwayDays < 90) {
  insights.push({
    title: "Moderate Cash Buffer",
    message: `You currently have ${runwayDays} days of runway. While this provides some stability, it may not be sufficient to handle unexpected financial shocks.`,
    action: `Increase your runway to at least 120 days by reducing expenses by approximately ₹${Math.round(burn * 0.15)} or improving income streams.`,
    impact: "medium",
    numbers: {
      runwayDays,
      burn,
      income,
      suggestedCut: Math.round(burn * 0.15)
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
      burn,
      income,
      investableAmount: Math.round(net * 0.2)
    }
      });
    }

    // 2️⃣ BURN
    if (burnRatio > 0.7) {
      insights.push({
  title: "High Burn Rate",
  message: `You are spending ₹${burn} against an income of ₹${income}, resulting in a ${Math.round(burnRatio * 100)}% burn ratio.`,
  action: `Reduce expenses by ₹${Math.round(burn * 0.2)} to bring burn ratio below 60%.`,
  impact: "high",
  numbers: {
    burn,
    income,
    burnRatio
  }
});
    } else if (burnRatio > 0.5) {
  insights.push({
    title: "Moderate Burn",
    message: `Your burn ratio is ${Math.round(burnRatio * 100)}%, with expenses of ₹${burn} against income of ₹${income}. This is manageable but leaves limited margin for error.`,
    action: `Optimize expenses by cutting approximately ₹${Math.round(burn * 0.1)} to improve financial flexibility.`,
    impact: "medium",
    numbers: {
      burn,
      income,
      burnRatio,
      suggestedCut: Math.round(burn * 0.1)
    }
  });

} else {
  insights.push({
    title: "Efficient Spending",
    message: `Your burn ratio is a healthy ${Math.round(burnRatio * 100)}%, with expenses well aligned to your income of ₹${income}.`,
    action: `Maintain current discipline. You may consider reallocating ₹${Math.round((income - burn) * 0.2)} towards savings or growth.`,
    impact: "low",
    numbers: {
      burn,
      income,
      burnRatio,
      surplus: income - burn,
      investableAmount: Math.round((income - burn) * 0.2)
    }
      });
    }

    // 3️⃣ GROWTH
if (growth < 0) {
  insights.push({
    title: "Declining Income",
    message: `Your income growth is ${growth.toFixed(1)}%, indicating a downward trend.`,
    action: `Increase revenue streams or pricing to reverse the decline within the next month.`,
    impact: "high",
    numbers: {
      growth,
      income
    }
  });

} else if (growth < 10) {
  insights.push({
    title: "Slow Growth",
    message: `Your income is growing at ${growth.toFixed(1)}%, which is positive but relatively slow for sustainable expansion.`,
    action: `Aim to increase growth to at least 10–15% by adding new income streams or improving conversion efficiency.`,
    impact: "medium",
    numbers: {
      growth,
      income,
      targetGrowth: 12,
      gapToTarget: +(12 - growth).toFixed(1)
    }
  });

} else {
  insights.push({
    title: "Strong Growth",
    message: `Your income is growing at a healthy ${growth.toFixed(1)}%, indicating strong upward momentum.`,
    action: `Capitalize on this by reinvesting approximately ₹${Math.round(income * 0.2)} into scaling operations or marketing.`,
    impact: "low",
    numbers: {
      growth,
      income,
      reinvestment: Math.round(income * 0.2)
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
  riskLevel, 
  score
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

    // 🔥 SCORE CONTEXT
let scoreContext = "";

if (score >= 75) {
  scoreContext = "Your financial health is strong overall.";
} else if (score >= 60) {
  scoreContext = "Your financial position is fairly stable.";
} else if (score >= 40) {
  scoreContext = "Your financial situation needs attention.";
} else {
  scoreContext = "Your financial condition is currently under pressure.";
}

  return `${scoreContext} ${opening} ${condition}, ${runwayContext}. ${trendContext}. ${riskStatement} ${forward}`;
};


const summary = generateSummary({
  net,
  income,
  burn,
  runwayDays,
  burnRatio,
  trend,
  riskLevel, 
  score
});


    // 🧠 AI ENHANCEMENT (SAFE)
let aiSummary = summary;
let aiInsights = insights;

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

- Balance: ₹${net}
- Monthly Income: ₹${income}
- Monthly Expenses: ₹${burn}
- Financial Buffer: ${runwayDays} days
- Expense Ratio: ${Math.round(burnRatio * 100)}%
- Income Growth: ${(growth || 0).toFixed(1)}%
- Income Trend: ${trend}
- Score: ${score}
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
    income: Math.round(income),
    burn: Math.round(burn)
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

const surplus = income - burn;

// Prevent negative values
const safeSurplus = Math.max(0, surplus);

// 50% safety buffer
const safetyReserve = safeSurplus * 0.5;

// What user can actually use
const investableAmount = safeSurplus - safetyReserve;

// Realistic reinvestment (not aggressive)
const reinvestment = investableAmount * 0.6;

// ✅ FINAL RESPONSE (ONLY ONE)
return res.json({
  summary: aiSummary,
  priority,
  riskLevel,
  insights: aiInsights,
  numbers: {
    surplus: Math.round(safeSurplus),
    investableAmount: Math.round(investableAmount),
    reinvestment: Math.round(reinvestment),
    income: Math.round(income),
    burn: Math.round(burn)
  }
});

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 🚀 Start Server
const PORT = 5000;

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running");
});