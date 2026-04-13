import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Button from "../Components/ui/Button";
import { useBusiness } from "../context/BusinessContext";
import { calculateFinancialHealth } from "../utils/financialHealthEngine";
import { formatCurrency } from "../utils/formatcurrency";

export default function Advisor() {
  const { businessId, loading } = useBusiness();  
  const [transactions, setTransactions] = useState([]);
  const [aiAdvice, setAiAdvice] = useState("");
  const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;  
  const [aiData, setAiData] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const normalizedInsights = aiData?.insights?.length
  ? [
      // ✅ Insight 1 → Positive
      {
        ...aiData.insights[0],
        title: "Current Financial Position",
      },

      // ⚠️ Insight 2 → Risk
      {
        ...aiData.insights[1],
        title: "Improve Financial Safety Buffer",
        impact: "high",
      },

      // 🚀 Insight 3 → Growth
      {
        ...aiData.insights[2],
        title: "Growth Opportunity",
        impact: "medium",
      },
    ]
  : [];
  const getStabilityIndicator = (stability) => {
  if (!stability) return "";

  if (stability.toLowerCase().includes("very stable")) return "🟢";
  if (stability.toLowerCase().includes("stable")) return "🟡";
  if (stability.toLowerCase().includes("moderate")) return "🟠";
  return "🔴";
};
  const financials = calculateFinancialHealth(transactions);

const {
  score,
  riskLevel
} = financials;
  const { stability } = financials;

const {
  runwayMonths,
  runwayDays,
  avgMonthlyBurn,
  net,
  totalIncome,
  incomeGrowth,
} = financials;
  const getImpactColor = (impact) => {
  if (impact === "high") return "#ef4444";   // red
  if (impact === "medium") return "#f59e0b"; // yellow
  return "#22c55e"; // green
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

const monthlyNetMap = {};

transactions.forEach((t) => {
  const d = new Date(t.created_at);
  const key = `${d.getFullYear()}-${d.getMonth()}`;

  if (!monthlyNetMap[key]) {
    monthlyNetMap[key] = 0;
  }

  if (t.categories?.type === "income") {
    monthlyNetMap[key] += Number(t.amount || 0);
  } else {
    monthlyNetMap[key] -= Number(t.amount || 0);
  }
});

const monthlyNets = Object.entries(monthlyNetMap)
  .sort(([a], [b]) => {
    const [yearA, monthA] = a.split("-").map(Number);
    const [yearB, monthB] = b.split("-").map(Number);

    if (yearA !== yearB) return yearA - yearB;
    return monthA - monthB;
  })
  .map(([_, value]) => value);

const last3Months = monthlyNets.slice(-3);

let trend = "stable";

if (last3Months.length === 3) {
  const [a, b, c] = last3Months;

  // 🔥 Overall direction (NOT just last month)
  const overallChange = a !== 0 ? (c - a) / a : 0;

  // 🔥 Short-term momentum
  const recentChange = b !== 0 ? (c - b) / b : 0;

  // 🔥 Volatility
  const avg = (a + b + c) / 3;
  const max = Math.max(a, b, c);
  const min = Math.min(a, b, c);
  const volatility = avg > 0 ? (max - min) / avg : 0;

  // ✅ DECISION LOGIC
  if (overallChange > 0.1) {
    trend = volatility > 0.4 ? "growing_volatile" : "growing";
  } else if (overallChange < -0.1) {
    trend = volatility > 0.4 ? "declining_volatile" : "declining";
  } else {
    trend = volatility > 0.4 ? "volatile" : "stable";
  }
  // 🔥 STRICT TREND CHECK
if (c > b && b > a) {
  trend = "growing";
}
}

  const growth =
    lastMonthIncome > 0
      ? ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100
      : 0;

const getAIAdvice = async () => {

    if (
  !Number.isFinite(net) ||
  !Number.isFinite(avgMonthlyBurn) ||
  !Number.isFinite(totalIncome)
) {
  console.error("Invalid data:", { net, avgMonthlyBurn, totalIncome });
  throw new Error("Invalid financial data");
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
  net: Number(net),
  income: Number(totalIncome),
  burn: Number(avgMonthlyBurn),
  runwayMonths: Number(runwayMonths),
  runwayDays: Number(runwayDays),
  burnRatio: totalIncome > 0 ? avgMonthlyBurn / totalIncome : 0,
  growth: Number(incomeGrowth),
  trend,
  topCategory,
  topCategoryPercent: Number(topCategoryPercent),
  stability
})
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("API ERROR:", result);
      throw new Error(result.error || "Failed to fetch AI advice");
    }

    return result.data || result;
  };

  const handleGenerateAdvice = async () => {
    setLoadingAI(true);

    try {
      const result = await getAIAdvice();

      setAiData({
  priority: result.priority || "No priority available",
  summary: result.summary || "No summary available",
  riskLevel: result.riskLevel || "medium",
  insights: result.insights || [],
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
  label="Cash Runway" 
  value={
    avgMonthlyBurn === 0
      ? "Unlimited"
      : `${Math.round(runwayDays)} days`
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
    {aiData && (
  <div style={{
    padding: "16px",
    borderRadius: "9px",
    background: "#020617",
    border: "1px solid rgba(255,255,255,0.08)"
  }}>

    {/* SUMMARY */}
    <div style={{
      padding: "12px",
      background: "#020617",
      borderRadius: "8px",
      marginBottom: "12px"
    }}>
      <div style={{
  padding: "12px",
  background: "#020617",
  borderRadius: "8px",
  marginBottom: "12px"
}}>
  💡 {aiData.summary}
</div>
    </div>

    <div style={{
  padding: "12px",
  background: "#1e293b",
  borderRadius: "8px",
  marginBottom: "12px",
  borderLeft: "4px solid #ef4444"
}}>
  <div style={{
  padding: "12px",
  background: "#1e293b",
  borderRadius: "8px",
  marginBottom: "12px",
  borderLeft: "4px solid #ef4444"
}}>
  🎯 <strong>Focus Area:</strong> {aiData.priority}
</div>
</div> 

    {/* RISK LEVEL */}
    <h3>
  Financial Risk:{" "}
  <span style={{
    color:
      aiData.riskLevel === "low"
        ? "#00ff9d"
        : aiData.riskLevel === "moderate"
        ? "#ffaa00"
        : "#ff4d4d"
  }}>
    {aiData.riskLevel.toUpperCase()}
  </span>
</h3>

    {/* INSIGHTS */}
    <h3 style={{ marginTop: "16px" }}>Key Insights</h3>

    {normalizedInsights.map((item, i) => (
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
        <p><b>Action:</b> {item.action}</p>
        <p>
  <b>Priority:</b>{" "}
  <span style={{
    color:
      item.impact === "high"
        ? "#ff4d4d"   // red
        : item.impact === "medium"
        ? "#facc15"   // 🔥 proper yellow
        : "#22c55e"   // green
  }}>
    {item.impact === "high"
      ? "High"
      : item.impact === "medium"
      ? "Moderate"
      : "Low"}
  </span>
</p>
        <div style={{ marginTop: "6px" }}>
  <b>Numbers:</b>

  {item.numbers?.burn !== undefined && (
    <div>💸 Monthly Expenses: {formatCurrency(item.numbers.burn)}</div>
  )}

  {item.numbers?.income !== undefined && (
    <div>💰 Monthly Income: {formatCurrency(item.numbers.income)}</div>

  )}

  {item.numbers?.runwayDays !== undefined && (
    <div>⏳ Financial Buffer: {item.numbers.runwayDays} days</div>
  )}

  {item.numbers?.burnRatio !== undefined && (
    <div>📊 Expense Ratio: {(item.numbers.burnRatio * 100).toFixed(1)}%</div>
  )}

  {item.numbers?.investableAmount !== undefined && (
  <div>📈 Available to Invest: {formatCurrency(item.numbers.investableAmount)}</div>
)}

  {item.numbers?.surplus !== undefined && (
  <div>💼 Net Savings: {formatCurrency(item.numbers.surplus)}</div>
)}

  {item.numbers?.gapToTarget !== undefined && (
  <div>📉 Gap to Target: {item.numbers?.gapToTarget?.toFixed(1)}%</div>
)}

  {item.numbers?.reinvestment !== undefined && (
  <div>🚀 Reinvestment: {formatCurrency(item.numbers.reinvestment)}</div>
)}
</div>
      </div>
    ))}

  </div>
)}
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