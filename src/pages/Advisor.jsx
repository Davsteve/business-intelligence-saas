import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useBusiness } from "../context/BusinessContext";
import { calculateFinancialHealth } from "../utils/financialHealthEngine";

export default function Advisor() {
  const { businessId, loading } = useBusiness();  
  const [transactions, setTransactions] = useState([]);
  const [aiAdvice, setAiAdvice] = useState("");
  const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;  
  const [aiData, setAiData] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const getStabilityIndicator = (stability) => {
  if (stability.includes("Very stable")) return "🟢";
  if (stability.includes("Stable")) return "🟡";
  if (stability.includes("Moderately")) return "🟠";
  return "🔴";
};
  const financials = calculateFinancialHealth(transactions);
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
  // BASIC METRICS
  // ------------------------

  const income = transactions
    ?.filter(t => t.categories?.type === "income")
    ?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;

  const burn = transactions
    ?.filter(t => t.categories?.type === "expense")
    ?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;

  const netBalance = income - burn;

  // ------------------------
  // MONTHLY BURN + RUNWAY
  // ------------------------

  const monthlyExpenses = {};
  transactions.forEach((t) => {
    if (t.categories?.type !== "expense") return;
    const d = new Date(t.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthlyExpenses[key] = (monthlyExpenses[key] || 0) + Number(t.amount || 0);
  });


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

  const growth =
    lastMonthIncome > 0
      ? ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100
      : 0;

  // ------------------------
  // HEALTH SCORE
  // ------------------------

  


      // ------------------------
// ------------------------
// STABILITY (SIMPLE + RELIABLE)
// ------------------------

let score = 0;

// 🔥 Burn Efficiency
const burnRatio = income > 0 ? burn / income : 1;

if (burnRatio <= 0.5) score += 25;
else if (burnRatio <= 0.7) score += 15;
else if (burnRatio <= 0.9) score += 8;
else score += 0;

// 💰 Profitability (reduced weight)
if (netBalance > 0) score += 10;
if (netBalance > income * 0.2) score += 5;

// 📈 Growth
if (growth > 10) score += 10;
else if (growth > 0) score += 5;

// 📊 Expense concentration
if (topCategoryPercent < 40) score += 10;
else if (topCategoryPercent < 60) score += 5;

// 📉 Stability (NEW)
if (stability.includes("Very stable")) score += 10;
else if (stability.includes("Moderately")) score += 5;

if (score > 100) score = 100;

let risk = "High";

if (score >= 75) risk = "Low";
else if (score >= 50) risk = "Moderate";


const trend =
  incomeGrowth > 5
    ? "Upward"
    : incomeGrowth < -5
    ? "Downward"
    : "Stable";


const getAIAdvice = async () => {

    if (
  !Number.isFinite(netBalance) ||
  !Number.isFinite(burn) ||
  !Number.isFinite(income)
) {
  console.error("Invalid data:", { netBalance, burn, income });
  throw new Error("Invalid financial data");
}

    const session = await supabase.auth.getSession();
    const token = session.data.session.access_token;

    console.log("Sending to API:", {
  netBalance,
  burn,
  income
});

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
  net: Number(netBalance),
  income: Number(income),
  burn: Number(burn),
  runwayMonths: Number(runwayMonths),
  runwayDays: Number(runwayDays),
  burnRatio: Number(totalIncome) > 0 ? Number(avgMonthlyBurn) / Number(totalIncome) : 0,
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
      AI Strategic Advisor
    </h1>

    <button
  onClick={handleGenerateAdvice}
  disabled={loadingAI}
  style={{
    padding: "10px 16px",
    borderRadius: "8px",
    background: loadingAI ? "#555" : "#38bdf8",
    border: "none",
    color: "#000",
    cursor: loadingAI ? "not-allowed" : "pointer",
    marginBottom: "20px"
  }}
>
  {loadingAI ? "Generating..." : "Generate AI Advice"}
</button>

{loadingAI && (
  <p style={{ color: "#aaa", marginTop: "10px" }}>
    Analyzing your financial data...
  </p>
)}

    {/* HEALTH CARD */}
    <div style={{
      background: "linear-gradient(145deg, #0f172a, #111827)",
      padding: "30px",
      borderRadius: "18px",
      marginBottom: "40px",
      boxShadow: "0 0 40px rgba(0, 255, 157, 0.05)"
    }}>
      <h2 style={{ fontSize: "26px" }}>
        Health Score:{" "}
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
  <strong>Financial Risk:</strong>{" "}
  {risk === "Low"
    ? "You're in a safe position ✅"
    : risk === "Moderate"
    ? "You're okay, but needs attention ⚠️"
    : "You're at risk, act immediately 🚨"}
</p>

<p>
  <strong>Income Trend:</strong>{" "}
  {trend === "Upward"
    ? "Your income is growing 📈"
    : trend === "Downward"
    ? "Your income is declining 📉"
    : "Your income is stable ➖"}
</p>

<p>
  <strong>Stability:</strong>{" "}
  {stability.replace("income", "")} {getStabilityIndicator(stability)}
</p>
    </div>

    {/* METRICS GRID */}
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "20px",
      marginBottom: "40px"
    }}>
      <MetricCard label="Net Position" value={`₹ ${netBalance}`} />
      <MetricCard label="Avg Monthly Burn" value={`₹ ${avgMonthlyBurn.toFixed(0)}`} />
      <MetricCard 
  label="Runway" 
  value={`${runwayDays.toFixed(0)} days`} 
/>
      <MetricCard label="Top Expense" value={`${topCategory} (${topCategoryPercent.toFixed(1)}%)`} />
    </div>

    {/* SUMMARY */}
    <PremiumSection title="AI Insights">

  <button
    onClick={handleGenerateAdvice}
    style={{
      padding: "10px 16px",
      borderRadius: "8px",
      background: "#38bdf8",
      border: "none",
      color: "#000",
      cursor: "pointer",
      marginBottom: "16px"
    }}
  >
    {loadingAI ? "Generating..." : "Generate AI Advice"}
  </button>

  {aiData ? (
  <div style={{
    padding: "16px",
    borderRadius: "10px",
    background: "#020617",
    border: "1px solid rgba(255,255,255,0.05)",
    lineHeight: "1.6"
  }}>
    {aiData && (
  <div style={{
    padding: "16px",
    borderRadius: "10px",
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
      ⚠️ {aiData.summary}
    </div>

    <div style={{
  padding: "12px",
  background: "#1e293b",
  borderRadius: "8px",
  marginBottom: "12px",
  borderLeft: "4px solid #ef4444"
}}>
  🚨 <strong>Priority:</strong> {aiData.priority}
</div> 

    {/* RISK LEVEL */}
    <h3>Risk Level: {aiData.riskLevel.toUpperCase()}</h3>

    {/* INSIGHTS */}
    <h3 style={{ marginTop: "16px" }}>Key Insights</h3>

    {aiData.insights.map((item, i) => (
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
        <p><b>Impact:</b> {item.impact}</p>
        <div style={{ marginTop: "6px" }}>
  <b>Numbers:</b>

  {item.numbers?.burn !== undefined && (
    <div>💸 Burn: ₹{Math.round(item.numbers.burn)}</div>
  )}

  {item.numbers?.income !== undefined && (
    <div>💰 Income: ₹{Math.round(item.numbers.income)}</div>
  )}

  {item.numbers?.runwayDays !== undefined && (
    <div>⏳ Runway: {item.numbers.runwayDays} days</div>
  )}

  {item.numbers?.burnRatio !== undefined && (
    <div>📊 Burn Ratio: {(item.numbers.burnRatio * 100).toFixed(1)}%</div>
  )}

  {item.numbers?.investableAmount !== undefined && (
  <div>📈 Investable: ₹{Math.round(item.numbers.investableAmount)}</div>
)}

  {item.numbers?.surplus !== undefined && (
  <div>💼 Surplus: ₹{Math.round(item.numbers.surplus)}</div>
)}

  {item.numbers?.gapToTarget !== undefined && (
  <div>📉 Gap to Target: {item.numbers.gapToTarget}%</div>
)}

  {item.numbers?.reinvestment !== undefined && (
  <div>🚀 Reinvestment: ₹{Math.round(item.numbers.reinvestment)}</div>
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