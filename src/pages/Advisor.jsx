import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Button from "../Components/ui/Button";
import { useBusiness } from "../context/BusinessContext";
import { calculateFinancialHealth } from "../utils/financialHealthEngine";
import { formatCurrency } from "../utils/formatcurrency";

export default function Advisor() {
  const getKeyNumbers = (item, numbers) => {
  if (!numbers || typeof numbers !== "object") return [];

  const result = [];
  const title = item.title?.toLowerCase() || "";
  const type = item.type;

  // -------------------------
  // 🧠 INTERPRETATION HELPERS
  // -------------------------

  const getBurnStatus = (burn) => {
  if (burn > 70) return "⚠️ High spending (Target: <50%)";
  if (burn > 50) return "⚠️ Moderate spending (Target: <50%)";
  return "✅ Healthy spending (well below 50%)";
};

  const getRunwayStatus = (days) => {
  if (days < 30) return "🚨 Critical (Target: 90+ days)";
  if (days < 60) return "⚠️ Low buffer (Target: 90+ days)";
  return "✅ Safe (Target: 90+ days)";
};

  const getSavingsStatus = (savings) => {
  if (!numbers.expenses || numbers.expenses === 0) return "";

  const months = savings / numbers.expenses;
  const targetMonths = 3;

  if (savings <= 0) return "🚨 No buffer";
  if (months < 1) return "🚨 Critical buffer (<1 month)";
  if (months < targetMonths)
    return `⚠️ Weak buffer (Target: ${targetMonths} months)`;

  return `✅ Healthy buffer (${targetMonths}+ months)`;
};

  // -------------------------
  // 🎯 CONTEXT-BASED DISPLAY
  // -------------------------

  // 🟥 RISK / SURVIVAL INSIGHTS
  if (title.includes("buffer") || title.includes("runway")) {
    result.push(
      `⏳ Runway: ${numbers.runwayDays} days → ${getRunwayStatus(numbers.runwayDays)}`
    );

    result.push(
      `💼 Savings: ${formatCurrency(numbers.savings)} → ${getSavingsStatus(numbers.savings)}`
    );
    if (numbers.targetSavings) {
  const progress =
    numbers.targetSavings > 0
      ? ((numbers.savings / numbers.targetSavings) * 100).toFixed(0)
      : 0;

  result.push(
    `🎯 Savings Progress: ${formatCurrency(numbers.savings)} / ${formatCurrency(numbers.targetSavings)} (${progress}%)`
  );
}

    result.push(
      `📊 Burn Rate: ${numbers.burnRatio}% → ${getBurnStatus(numbers.burnRatio)}`
    );

    if (numbers.suggestedCut && numbers.newRunway) {
  result.push(
    `✂️ Cutting ₹${numbers.suggestedCut} → Runway becomes ~${numbers.newRunway} days`
  );
}

    if (numbers.funMoney > 0) {
  result.push(
    `🎯 Free Spend: ₹${numbers.funMoney} → Lifestyle flexibility`
  );
}

// 🎯 TARGET: SAFETY BUFFER (90 DAYS)
if (numbers.runwayDays < 90 && numbers.expenses > 0) {
  if (numbers.savingsGap > 0) {
  result.push(
    `🎯 You need ${formatCurrency(numbers.savingsGap)} more savings to reach a safe buffer`
  );
}
}

// 🚀 TARGET: REQUIRED INCOME
if (numbers.avgMonthlyBurn > 0) {
  if (numbers.incomeGap > 0) {
  result.push(
    `🚀 Increase income by ${formatCurrency(numbers.incomeGap)} to stabilize finances`
  );
}
}
  }

  // 🟩 EFFICIENCY / SPENDING INSIGHTS
  else if (title.includes("spending")) {
    result.push(
      `💸 Expenses: ${formatCurrency(numbers.expenses)} (${numbers.burnRatio}% of income)`
    );

    result.push(
      `📊 Burn Rate: ${numbers.burnRatio}% → ${getBurnStatus(numbers.burnRatio)}`
    );

    result.push(
      `💰 Income: ${formatCurrency(numbers.income)}`
    );

    if (numbers.investableAmount > 0) {
      result.push(
        `📈 Investable: ${formatCurrency(numbers.investableAmount)} → Growth potential`
      );
    }

    if (numbers.funMoney > 0) {
  result.push(
    `🎯 Free Spend: ₹${numbers.funMoney} → Lifestyle flexibility`
  );
}
  }

  // 🟨 INCOME / GROWTH INSIGHTS
  else if (title.includes("income")) {
    result.push(`💰 Income: ${formatCurrency(numbers.income)}`);

    if (numbers.targetIncome) {
  result.push(
    `🎯 Target Income: ${formatCurrency(numbers.targetIncome)}`
  );
}


    result.push(
      `📊 Burn Rate: ${numbers.burnRatio}% → ${getBurnStatus(numbers.burnRatio)}`
    );

    result.push(
      `⏳ Runway: ${numbers.runwayDays} days → ${getRunwayStatus(numbers.runwayDays)}`
    );

    if (numbers.investableAmount > 0) {
      result.push(
        `📈 Investable: ${formatCurrency(numbers.investableAmount)} → Can grow wealth`
      );
      if (numbers.incomeGrowth !== undefined) {
  result.push(
    `📈 Income Growth: ${numbers.incomeGrowth.toFixed(1)}% ${
      numbers.incomeGrowth < 0 ? "📉 Declining" : "📈 Growing"
    }`
  );
}
    }
  }

  // 🟦 DEFAULT (fallback)
  else {
    result.push(`💰 Income: ${formatCurrency(numbers.income)}`);
    result.push(`💸 Expenses: ${formatCurrency(numbers.expenses)}`);
    result.push(
      `📊 Burn Rate: ${numbers.burnRatio}% → ${getBurnStatus(numbers.burnRatio)}`
    );
  }

  // -------------------------
// 🧠 FINAL INSIGHT LAYER
// -------------------------

if (title.includes("buffer") || title.includes("runway")) {
  if (numbers.runwayDays < 60) {
    result.push("💡 Your runway is low — increase income or cut expenses urgently");
  }
}

if (title.includes("spending")) {
  if (numbers.burnRatio > 50) {
    result.push("💡 High burn rate — reducing expenses will significantly improve stability");
  } else {
    result.push("💡 Your spending is controlled — focus on increasing income next");
  }
}

if (title.includes("income")) {
  if (numbers.incomeGrowth < 0) {
    result.push("💡 Income is declining — stabilizing income should be your top priority");
  }
}

  return result;
};

  const { businessId, loading } = useBusiness();  
  const [transactions, setTransactions] = useState([]);
  const [aiAdvice, setAiAdvice] = useState("");
  const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;  
  const [aiData, setAiData] = useState(null);
  const risk = aiData?.riskLevel?.toLowerCase?.() || "moderate";
  const [loadingAI, setLoadingAI] = useState(false);
  const getPriority = (impact) => {
  if (!impact) {
    return { text: "Unknown", color: "#64748b" };
  }

  if (impact.toLowerCase() === "high") {
    return { text: "High", color: "#ef4444" }; // red
  }

  if (impact.toLowerCase() === "medium") {
    return { text: "Moderate", color: "#facc15" }; // yellow
  }

  return { text: "Low", color: "#22c55e" }; // green
};
  const normalizedInsights = Array.from(
  new Map((aiData?.insights || []).map(i => [i.title, i])).values()
);

  const getStabilityIndicator = (stability) => {
  if (!stability) return "";

  if (stability.toLowerCase().includes("very stable")) return "🟢";
  if (stability.toLowerCase().includes("stable")) return "🟡";
  if (stability.toLowerCase().includes("moderate")) return "🟠";
  return "🔴";
};
  const financials = calculateFinancialHealth(transactions);

const { financialStatus, incomeTrendLabel, stability } = financials || {};

const trend = incomeTrendLabel || "stable";

const {
  score,
  riskLevel
} = financials;

const {
  runwayMonths,
  runwayDays,
  avgMonthlyBurn,
  net,
  totalIncome,
  incomeGrowth,
  avgMonthlyIncome,
  avgMonthlyExpenses,
  burnRatio,
} = financials;
const runwayDisplay =
  avgMonthlyBurn <= 0
    ? "Unlimited"
    : `${Math.round(runwayDays)} days`;
  const getImpactColor = (impact) => {
  if (!impact) return "#64748b"; // fallback

  if (impact.toLowerCase() === "high") return "#ef4444";   // red
  if (impact.toLowerCase() === "medium") return "#f59e0b"; // yellow
  if (impact.toLowerCase() === "low") return "#22c55e";    // green

  return "#64748b";
};

  useEffect(() => {
    if (!businessId) return;
    fetchTransactions();
  }, [businessId]);

  async function fetchTransactions() {
    const { data } = await supabase
      .from("transactions")
      .select("*, categories(name, type)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });

    if (data) setTransactions(data);
  }

  if (loading) return <div>Loading...</div>;

  if (!transactions.length) {
  return <p>No financial data yet.</p>
}

  // ------------------------
  // EXPENSE DEPENDENCY
  // ------------------------

  const expenseMap = {};
  let totalExpense = 0;

  transactions.forEach((t) => {
    if (t.categories?.type !== "expense") return;
    const name = t.categories?.name || "Other";
    const amount = Number(t.amount || 0);

    expenseMap[name] = (expenseMap[name] || 0) + amount;
    totalExpense += amount;
  });

  let topCategory = "None";
  let topCategoryPercent = 0;

  Object.entries(expenseMap).forEach(([name, value]) => {
    const percent =
      totalExpense > 0 ? (value / totalExpense) * 100 : 0;

    if (percent > topCategoryPercent) {
      topCategoryPercent = percent;
      topCategory = name;
    }
  });

  // ------------------------
  // GROWTH (Last 2 Months)
  // ------------------------

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastMonth = new Date(currentYear, currentMonth - 1, 1);

  let thisMonthIncome = 0;
  let lastMonthIncome = 0;

  transactions.forEach((t) => {
    if (t.categories?.type !== "income") return;
    const d = new Date(t.created_at);

    if (
      d.getMonth() === currentMonth &&
      d.getFullYear() === currentYear
    ) {
      thisMonthIncome += Number(t.amount || 0);
    }

    if (
      d.getMonth() === lastMonth.getMonth() &&
      d.getFullYear() === lastMonth.getFullYear()
    ) {
      lastMonthIncome += Number(t.amount || 0);
    }
  });

// ------------------------
// NET TREND (CORRECT LOGIC)
// ------------------------
const getAIAdvice = async () => {

    if (
  !Number.isFinite(net) ||
  !Number.isFinite(avgMonthlyBurn ?? 0) ||
  !Number.isFinite(totalIncome)
) {
  console.error("Invalid data:", { net, avgMonthlyBurn, totalIncome });
  return;
}

    const session = await supabase.auth.getSession();
    const token = session.data.session.access_token;

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
  transactions,
  trend,
  topCategory,
  topCategoryPercent
})
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("API ERROR:", result);
      throw new Error(result.error || "Failed to fetch AI advice");
    }

    return result;
  };

  const handleGenerateAdvice = async () => {
    setLoadingAI(true);

    try {
      const result = await getAIAdvice();

      setAiData({
  priority: result.priority,
  summary: result.summary,
  riskLevel: result.riskLevel,
  insights: result.insights,
  nextBestAction: result.nextBestAction,
  behaviorInsights: result.behaviorInsights || [],
});

    } catch (err) {
      console.error("❌ AI ERROR:", err);
    } finally {
      setLoadingAI(false);
    }
  };


  // ------------------------
  // UI
  // ------------------------

  return (
  <div style={{ padding: "40px" }}>

    <h1 style={{ fontSize: "32px", marginBottom: "30px" }}>
      Smart Financial Advisor
    </h1>

    {/* HEALTH CARD */}
    <div style={{
      background: "linear-gradient(145deg, #0f172a, #111827)",
      padding: "30px",
      borderRadius: "18px",
      marginBottom: "40px",
      boxShadow: "0 0 40px rgba(0, 255, 157, 0.05)"
    }}>
      <h2 style={{ fontSize: "26px" }}>
        Financial Health Score:{" "}
        <span style={{
          color:
            score >= 75
              ? "#00ff9d"
              : score >= 50
              ? "#ffaa00"
              : "#ff4d4d"
        }}>
          {score}/100
        </span>
      </h2>

      <p>
  <strong>Financial Status:</strong>{" "}
  {riskLevel === "Low"
  ? "You're in a strong financial position ✅"
  : riskLevel === "Moderate"
  ? "Stable overall, but there's room for improvement ⚠️"
  : riskLevel === "High"
  ? "You're under financial pressure — take action soon ⚠️"
  : "Financial situation needs immediate attention 🚨"}
</p>

<p>
  <strong>Income Trend:</strong>{" "}

{trend === "growing" && "Growing steadily 📈"}
{trend === "declining" && "Declining — needs attention 📉"}
{trend === "stable" && "Stable ➖"}
{trend === "volatile" && "Irregular income pattern ⚠️"}
{trend === "growing_volatile" && "Growing but inconsistent ⚠️📈"}
{trend === "declining_volatile" && "Declining and unstable ⚠️📉"}
</p>

<p>
  <strong>Financial Stability:</strong>{" "}
  {stability} {getStabilityIndicator(stability)}
</p>
    </div>

    {/* METRICS GRID */}
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "20px",
      marginBottom: "40px"
    }}>
      <MetricCard label="Net Savings" value={formatCurrency(net)} />
<MetricCard label="Avg Monthly Expenses" value={formatCurrency(avgMonthlyBurn)} />
      <MetricCard
  label="Estimated Runway"
  value={
    <div>
      <div>{runwayDisplay}</div>
      <span style={{ fontSize: "12px", opacity: 0.6 }}>
        Calculated from your net savings and spending patterns
      </span>
    </div>
  }
/>
      <MetricCard label="Top Expense" value={`${topCategory} (${topCategoryPercent.toFixed(1)}%)`} />
    </div>

    {/* SUMMARY */}
    <PremiumSection title="AI Insights">

  <Button
  onClick={handleGenerateAdvice}
  disabled={loadingAI}
>
  {loadingAI ? "Generating..." : "Generate AI Advice"}
</Button>

  {aiData ? (
  <div style={{
    padding: "16px",
    borderRadius: "9px",
    background: "#020617",
    border: "1px solid rgba(255,255,255,0.05)",
    lineHeight: "1.6"
  }}>

    {/* NEXT BEST ACTION */}
<div style={{
  padding: "16px",
  borderRadius: "10px",
  background: "#020617",
  border: "1px solid rgba(255,255,255,0.1)",
  marginBottom: "16px",
  borderLeft: "4px solid #ef4444"
}}>
  <h3 style={{ marginBottom: "8px" }}>
    🚀 What You Should Do Next
  </h3>

  <p>
    <strong>{aiData.nextBestAction?.title}</strong>
  </p>

  <p>
    {aiData.nextBestAction?.action}
  </p>

  <p style={{ opacity: 0.6 }}>
    {aiData.nextBestAction?.reason}
  </p>
  {aiData.nextBestAction?.steps && (
  <ul style={{ marginTop: "10px", paddingLeft: "18px" }}>
    {aiData.nextBestAction.steps.map((step, i) => (
      <li key={i} style={{ marginBottom: "6px" }}>
        {step}
      </li>
    ))}
  </ul>
)}
</div>

    {/* SUMMARY */}
    <div style={{
      padding: "12px",
      background: "#020617",
      borderRadius: "8px",
      marginBottom: "12px"
    }}>

  <p style={{ marginBottom: "10px" }}>
  💡 {aiData.summary}
</p>
</div>

    <div style={{
  padding: "12px",
  background: "#1e293b",
  borderRadius: "8px",
  marginBottom: "12px",
  borderLeft: "4px solid #ef4444"
}}>
  🎯 <strong>Priority:</strong> {aiData.priority}
</div>

    {/* RISK LEVEL */}
    <h3>
  Financial Risk:{" "}
  <span style={{
  color:
    risk === "low"
      ? "#00ff9d"
      : risk === "moderate"
      ? "#ffaa00"
      : "#ff4d4d"
}}>
  {risk.toUpperCase()}
</span>
</h3>

{/* =========================
    🧠 Behavioral Risks
========================= */}
{aiData?.behaviorInsights?.length > 0 && (
  <div style={{
    marginBottom: "16px",
    padding: "16px",
    borderRadius: "10px",
    background: "#020617",
    border: "1px solid rgba(255,255,255,0.08)",
    borderLeft: "4px solid #f59e0b"
  }}>
    <h3 style={{ color: "#fbbf24" }}>⚠️ Behavioral Risks</h3>

    <ul style={{ marginTop: "10px", paddingLeft: "20px" }}>
      {aiData.behaviorInsights.map((item, i) => (
        <li key={i} style={{ marginBottom: "8px" }}>
          {item}
        </li>
      ))}
    </ul>
  </div>
)}

    {/* INSIGHTS */}
    <h3 style={{ marginTop: "16px" }}>Key Insights</h3>

    {[...normalizedInsights]
  .sort((a, b) => {
    const score = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
    return (score[b.impact] || 0) - (score[a.impact] || 0);
  })
  .map((item, i) => (
      <div key={i} style={{
        marginBottom: "12px",
        padding: "12px",
        borderRadius: "8px",
        background: "#020617",
        border: "1px solid rgba(255,255,255,0.08)",
        borderLeft: `4px solid ${getImpactColor(item.impact)}`
      }}>
        <strong>{item.title}</strong>
        <p>{item.message}</p>
        <p style={{ opacity: 0.6, fontSize: "13px" }}>
  {item.reasoning}
</p>
        <p><b>Action:</b> {item.action}</p>
        <p>
  <b>Priority:</b>{" "}
{(() => {
  const level = item.priority?.toLowerCase();

const priority = {
  text: item.priority || "Low",
  color:
    level === "critical" || level === "high"
      ? "#ef4444"
      : level === "medium"
      ? "#facc15"
      : "#22c55e"
};

  return (
    <span style={{ color: priority.color }}>
      {priority.text}
    </span>
  );
})()}
</p>

{(() => {
  const keyNumbers = getKeyNumbers(item, item.numbers);

  if (keyNumbers.length === 0) return null;

  return (
    <>
      <div style={{ marginTop: "10px", fontWeight: "bold" }}>
        Key Numbers:
      </div>

      {keyNumbers.map((num, index) => (
        <div
          key={index}
          style={{ marginBottom: "4px", opacity: 0.9 }}
        >
          {num}
        </div>
      ))}
    </>
  );
})()}

      </div>
    ))}

  </div>
) : (
  <div style={{ opacity: 0.6 }}>
    Click the button above to generate personalized financial advice.
  </div>
)}

</PremiumSection>

  </div>
);

// ------------------------
// UI Components
// ------------------------

function MetricCard({ label, value }) {
  return (
    <div
      style={{
        background: "linear-gradient(145deg, #111827, #0f172a)",
        padding: "20px",
        borderRadius: "14px",
        border: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "0 0 25px rgba(0, 191, 255, 0.05)",
      }}
    >
      <p style={{ opacity: 0.7, marginBottom: "8px" }}>{label}</p>
      <h3 style={{ fontSize: "22px" }}>{value}</h3>
    </div>
  );
}

function PremiumSection({ title, children }) {
  return (
    <div
      style={{
        background: "linear-gradient(145deg, #0f172a, #111827)",
        padding: "30px",
        borderRadius: "18px",
        marginBottom: "30px",
        border: "1px solid rgba(255,255,255,0.04)",
        boxShadow: "0 0 35px rgba(0, 191, 255, 0.03)",
      }}
    >
      <h3 style={{ marginBottom: "15px", fontSize: "20px" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
}

