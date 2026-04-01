import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useBusiness } from "../context/BusinessContext";
import { calculateFinancialHealth } from "../utils/financialHealthEngine";
import { calculateCashFlow } from "../utils/cashFlowEngine";
import Card from "../Components/ui/Card";
import { getCurrentUser } from "../utils/Auth";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function Dashboard() {
  const { session, businessId } = useBusiness();

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);

  const cashFlow = calculateCashFlow(transactions);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryType, setNewCategoryType] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [aiAdvice, setAiAdvice] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState("latest");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const result = calculateFinancialHealth(transactions) || {
  score: 0,
  breakdown: {},
};

const { score, breakdown } = result;
  const mappedBreakdown = {
  profitMargin: breakdown?.profit || 0,
  runway: breakdown?.runway || 0,
  incomeGrowth: breakdown?.growth || 0,
  expenseConcentration: breakdown?.concentration || 0,
  stability: breakdown?.stability || 0,
};
  const riskLevel =
  score >= 75 ? "Low" :
  score >= 50 ? "Moderate" :
  "High";
const getAIAdvice = async ({
  netBalance,
  burn,
  runway,
  trend,
  volatility,
  topExpense
}) => {
  const prompt = `
You are a financial advisor for a normal person (not an expert).

Explain clearly and simply.

User Data:
- Net Balance: ₹${netBalance}
- Monthly Burn: ₹${burn}
- Runway: ${runway} months
- Income Trend: ${trend}
- Income Stability: ${volatility}
- Highest Expense: ${topExpense}

Give:
1. Simple explanation of current situation
2. Key risks (if any)
3. Clear actions to improve

Keep it short, practical, and easy to understand.
`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_API_KEY_HERE",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "mistralai/mixtral-8x7b",
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await res.json();
  return data.choices[0].message.content;
};
  const [filter, setFilter] = useState("all");
  const visibleTransactions = showAll
  ? transactions
  : transactions.slice(0, 10);
  const now = new Date();

const filteredTransactions = transactions
  .filter((t) => {
    // 🔍 Search filter
    const matchesSearch = t.categories?.name
      ?.toLowerCase()
      .includes(search.toLowerCase());

    // 📊 Type filter
    const matchesType =
      filter === "all" || t.categories?.type === filter;

    // 📅 Date filter
    let matchesDate = true;
    if (dateRange !== "all") {
      const days = parseInt(dateRange);
      const txnDate = new Date(t.created_at);
      const diffTime = now - txnDate;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      matchesDate = diffDays <= days;
    }

    return matchesSearch && matchesType && matchesDate;
  })
  .sort((a, b) => {
    if (sortOrder === "latest") {
      return new Date(b.created_at) - new Date(a.created_at);
    } else {
      return new Date(a.created_at) - new Date(b.created_at);
    }
  });


  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "auto";
  }, [modalOpen]);

  useEffect(() => {
  const handleClickOutside = () => {
    setSortDropdownOpen(false);
    setDateDropdownOpen(false); // 🔥 ADD THIS
  };

  window.addEventListener("click", handleClickOutside);

  return () => window.removeEventListener("click", handleClickOutside);
}, []);

  async function fetchCategories() {
  const user = await getCurrentUser(); 

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error(error);
    return;
  }

  if (data) setCategories(data);
} 

async function fetchTransactions() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("transactions")
    .select("*, categories(name, type)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  if (data) setTransactions(data);
}

  useEffect(() => {
    if (session && businessId) {
      fetchCategories();
      fetchTransactions();
    }
  }, [session, businessId]);

  async function createCategory() {
  if (!newCategoryName) return;

  const user = await getCurrentUser();

  const cleanedName = newCategoryName.trim();

  if (cleanedName.length < 2) {
    alert("Category name too short");
    return;
  }

  if (cleanedName.length > 30) {
    alert("Category name too long");
    return;
  }

  // Allow only letters, numbers, spaces
  const valid = /^[a-zA-Z0-9 ]+$/.test(cleanedName);

  if (!valid) {
    alert("Only letters and numbers allowed");
    return;
  }

  const { error } = await supabase.from("categories").insert([
    {
  name: newCategoryName.trim().toLowerCase(),
  type: newCategoryType.trim().toLowerCase(),
  business_id: businessId,
}
  ]);

  if (error) {
  if (error.message.includes("duplicate")) {
    alert("Category already exists");
  } else {
    console.error(error);
  }
  return;
}

  setNewCategoryName("");
  setCategoryModalOpen(false);

  await fetchCategories();  // 🔥 IMPORTANT
}

  async function deleteCategory(id, e) {
    e.stopPropagation();
    if (!window.confirm("Delete this category?")) return;


    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      alert("Cannot delete category with transactions.");
      return;
    }

    fetchCategories();
  }

  const handleGenerateAdvice = async () => {
  setLoadingAI(true);

  const advice = await getAIAdvice({
    netBalance,
    burn: totalExpense,
    runway,
    trend: cashFlow.trend,
    volatility: cashFlow.volatilityLevel,
    topExpense
  });

  setAiAdvice(advice);
  setLoadingAI(false);
};

  async function addTransaction() {
  if (!amount || !selectedCategory) return;

  const user = await getCurrentUser();

  if (amount <= 0) {
  alert("Invalid amount");
  return;
}

if (!selectedCategory) {
  alert("Select a category");
  return;
}

  await supabase.from("transactions").insert([
    {
      amount: parseFloat(amount),
      category_id: selectedCategory,
      business_id: businessId,
      user_id: user.id   // 🔥 IMPORTANT
    }
  ]);

  setAmount("");
  setSelectedCategory("");
  setSelectedCategoryName("");
  setDropdownOpen(false);
  setModalOpen(false);
  fetchTransactions();
}

  async function deleteTransaction(id) {
    if (!window.confirm("Delete this transaction?")) return;

    const user = await getCurrentUser();

await supabase
  .from("transactions")
  .delete()
  .eq("id", id)
  .eq("business_id", businessId);

    fetchTransactions();
  }

  const totalIncome = transactions
    .filter((t) => t.categories?.type === "income")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.categories?.type === "expense")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netBalance = totalIncome - totalExpense;

  const trendColor =
  cashFlow?.trend === "Upward"
    ? "#00ff9d"
    : cashFlow?.trend === "Downward"
    ? "#ef4444"
    : "#f59e0b";

const volatilityColor =
  cashFlow?.volatilityLevel === "Low"
    ? "#00ff9d"
    : cashFlow?.volatilityLevel === "Moderate"
    ? "#f59e0b"
    : "#ef4444";

  return (
    <div>
      <h1 style={styles.title}>ClariFlow Dashboard</h1>

      <button style={styles.addButton} onClick={() => setModalOpen(true)}>
        + Add Transaction
      </button>

      {/* FINANCIAL HEALTH */}
      {score !== undefined && (
        <Card>
          <h3>Financial Health Index</h3>
          <h1>{score} / 100</h1>

          <div style={styles.progressBar}>
            <div
              style={{
  width: `${score}%`,
  height: "100%",
  background:
    score >= 70
      ? "#16c625"
      : score >= 40
      ? "#f59e0b"
      : "#ef4444",
}}
            />
          </div>

          <p>Risk Level: {riskLevel}</p>

          <button
            onClick={() => setShowBreakdown((prev) => !prev)}
            style={styles.breakdownButton}
          >
            {showBreakdown ? "Hide Breakdown ▲" : "View Breakdown ▼"}
          </button>

          {showBreakdown && breakdown && Object.keys(breakdown).length > 0 && (
  <div style={{ marginTop: "20px" }}>
    {Object.entries(breakdown).map(([key, value], index) => (
                <div key={index} style={styles.breakdownCard}>
                  <div style={styles.breakdownRow}>
                    <span>{value.name}</span>
<span>{value.score} / 100</span>
                  </div>

                  <div style={styles.innerProgress}>
                    <div
                      style={{
                        width: `${value.score}%`,
                        height: "100%",
                        background:
  value.score >= 75
    ? "#22c55e"   // green
    : value.score >= 50
    ? "#f59e0b"   // yellow
    : "#ef4444",  // red
                      }}
                    />
                  </div>

                  <div style={styles.breakdownMeta}>
  <span>Status: {value.status}</span>
</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* CASH FLOW */}
      {cashFlow && cashFlow.monthlyData?.length > 0 && (
        <>
          <Card>
            <h3>Cash Flow Intelligence ({cashFlow.periodLabel})</h3>

            <div style={styles.cashFlowGrid}>
              <div>
                <p>Latest Month Net</p>
                <h2>₹ {Number(cashFlow.latestMonthNet ?? 0).toFixed(0)}</h2>
              </div>

              <div>
                <p>Average Net</p>
                <h2>₹ {Number(cashFlow.averageNet ?? 0).toFixed(0)}</h2>
              </div>

              <div>
                <p>Trend</p>
                <span style={{
  ...styles.badge,
  background: trendColor,
  boxShadow: `0 0 12px ${trendColor}55`
}}>
  {cashFlow.trend}
</span>
              </div>

              <div>
                <p>Volatility</p>
                <span style={{
  ...styles.badge,
  background: volatilityColor,
  boxShadow: `0 0 12px ${volatilityColor}55`
}}>
  {cashFlow.volatilityLevel}
</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3>12-Month Net Cash Flow Trend</h3>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cashFlow.monthlyData}>
                <CartesianGrid stroke="#333" />
                <XAxis dataKey="label" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#00ff9d"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {/* KPI SECTION - EXPANSIVE VERSION */}
<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "30px",
    marginTop: "40px",
    marginBottom: "40px",
  }}
>
  <Card>
    <div style={{ textAlign: "center", padding: "20px 10px" }}>
      <p style={{ opacity: 0.7, marginBottom: "12px", fontSize: "14px" }}>
        Total Income
      </p>
      <h1
        style={{
          color: "#00ff9d",
          fontSize: "42px",
          fontWeight: "800",
          letterSpacing: "-1px",
        }}
      >
        ₹ {totalIncome}
      </h1>
    </div>
  </Card>

  <Card>
    <div style={{ textAlign: "center", padding: "20px 10px" }}>
      <p style={{ opacity: 0.7, marginBottom: "12px", fontSize: "14px" }}>
        Total Expense
      </p>
      <h1
        style={{
          color: "#ff4d4d",
          fontSize: "42px",
          fontWeight: "800",
          letterSpacing: "-1px",
        }}
      >
        ₹ {totalExpense}
      </h1>
    </div>
  </Card>

  <Card>
    <div style={{ textAlign: "center", padding: "20px 10px" }}>
      <p style={{ opacity: 0.7, marginBottom: "12px", fontSize: "14px" }}>
        Net Balance
      </p>
      <h1
        style={{
          color: "#4db8ff",
          fontSize: "42px",
          fontWeight: "800",
          letterSpacing: "-1px",
        }}
      >
        ₹ {netBalance}
      </h1>
    </div>
  </Card>
</div>

      {/* TRANSACTIONS */}
      <Card>
  <h2>Transactions</h2>

  <div style={{ marginBottom: "15px", display: "flex", gap: "10px", flexWrap: "wrap" }}>

    {/* Search */}
    <input
      type="text"
      placeholder="Search category..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      style={{
        padding: "8px 12px",
        borderRadius: "6px",
        border: "1px solid #1e293b",
        background: "#020617",
        color: "#e2e8f0"
      }}
    />

    {/* Date Filter */}
    <div style={{ position: "relative" }}>
  <button
    onClick={(e) => {
      e.stopPropagation();
      setDateDropdownOpen(!dateDropdownOpen);
    }}
    style={{
      padding: "8px 14px",
      background: "#0b1120",
      border: "1px solid #1e293b",
      borderRadius: "8px",
      color: "#e2e8f0",
      cursor: "pointer"
    }}
  >
    {
      {
        all: "All Time",
        1: "1 Day",
        3: "3 Days",
        7: "1 Week",
        30: "1 Month",
        365: "1 Year"
      }[dateRange]
    } ▼
  </button>

  {dateDropdownOpen && (
    <div
      style={{
        position: "absolute",
        top: "110%",
        left: 0,
        width: "140px",
        background: "#020617",
        border: "1px solid #1e293b",
        borderRadius: "8px",
        overflow: "hidden",
        zIndex: 1000,
        boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
      }}
    >
      {[
        { label: "All Time", value: "all" },
        { label: "1 Day", value: "1" },
        { label: "3 Days", value: "3" },
        { label: "1 Week", value: "7" },
        { label: "1 Month", value: "30" },
        { label: "1 Year", value: "365" }
      ].map((item) => (
        <div
          key={item.value}
          onClick={(e) => {
            e.stopPropagation();
            setDateRange(item.value);
            setDateDropdownOpen(false);
          }}
          style={{
            padding: "10px",
            cursor: "pointer",
            background:
              dateRange === item.value ? "#1e293b" : "transparent",
            color:
              dateRange === item.value ? "#38bdf8" : "#e2e8f0"
          }}
          onMouseEnter={(e) =>
            (e.target.style.background = "#1e293b")
          }
          onMouseLeave={(e) =>
            (e.target.style.background =
              dateRange === item.value ? "#1e293b" : "transparent")
          }
        >
          {item.label}
        </div>
      ))}
    </div>
  )}
</div>

    {/* Sort */}
    <div style={{ position: "relative" }}>
  <button
  onClick={(e) => {
    e.stopPropagation();
    setSortDropdownOpen(!sortDropdownOpen);
  }}
  style={{
    padding: "8px 14px",
    background: "#0b1120",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    color: "#e2e8f0",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  }}
>
  {sortOrder === "latest" ? "Latest" : "Oldest"} ▼
</button>

  {sortDropdownOpen && (
    <div
      style={{
        position: "absolute",
        top: "110%",
        left: 0,
        width: "120px",
        background: "#020617",
        border: "1px solid #1e293b",
        borderRadius: "8px",
        overflow: "hidden",
        zIndex: 1000,
        boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
      }}
    >
      {[
        { label: "Latest", value: "latest" },
        { label: "Oldest", value: "oldest" }
      ].map((item) => (
        <div
          key={item.value}
          onClick={(e) => {
  e.stopPropagation();
  setSortOrder(item.value);
  setSortDropdownOpen(false);
}}
          style={{
            padding: "10px",
            cursor: "pointer",
            background:
              sortOrder === item.value ? "#1e293b" : "transparent",
            color:
              sortOrder === item.value ? "#38bdf8" : "#e2e8f0"
          }}
          onMouseEnter={(e) =>
            (e.target.style.background = "#1e293b")
          }
          onMouseLeave={(e) =>
            (e.target.style.background =
              sortOrder === item.value ? "#1e293b" : "transparent")
          }
        >
          {item.label}
        </div>
      ))}
    </div>
  )}
</div>

  </div>

  <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
    {["all", "income", "expense"].map((type) => (
      <button
        key={type}
        onClick={() => setFilter(type)}
        style={{
          padding: "6px 12px",
          borderRadius: "6px",
          border: "1px solid #1e293b",
          background: filter === type ? "#1e293b" : "transparent",
          color: "#e2e8f0",
          cursor: "pointer",
        }}
      >
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </button>
    ))}
  </div>

  {/* ✅ SORT + SLICE LOGIC */}
  {(() => {
    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
      if (sortOrder === "latest") {
        return new Date(b.created_at) - new Date(a.created_at);
      } else {
        return new Date(a.created_at) - new Date(b.created_at);
      }
    });

    const DEFAULT_VISIBLE = 15;

    const visibleTransactions = showAll
      ? sortedTransactions
      : sortedTransactions.slice(0, DEFAULT_VISIBLE);

    return (
      <>
        {/* ✅ RENDER FIXED */}
        {visibleTransactions.map((t) => (
          <div key={t.id} style={styles.transactionRow}>
            <div>
              <div>{t.categories?.name}</div>
              <div style={{ fontSize: "12px", opacity: 0.6 }}>
                {new Date(t.created_at).toLocaleDateString()}
              </div>
            </div>

            <div style={{ display: "flex", gap: "15px" }}>
              <span
                style={{
                  color:
                    t.categories?.type === "income"
                      ? "#00ff9d"
                      : "#ff4d4d",
                }}
              >
                ₹ {t.amount}
              </span>

              <span
                style={styles.trash}
                onClick={() => deleteTransaction(t.id)}
              >
                🗑
              </span>
            </div>
          </div>
        ))}

        {/* ✅ BUTTON FIXED */}
        {sortedTransactions.length > DEFAULT_VISIBLE && (
          <div style={{ textAlign: "center", marginTop: "10px" }}>
            <button
              onClick={() => setShowAll(!showAll)}
              style={{
                padding: "6px 12px",
                background: "#0b1120",
                border: "1px solid #1e293b",
                borderRadius: "6px",
                color: "#e2e8f0",
                cursor: "pointer"
              }}
            >
              {showAll
                ? "Show Less"
                : `Show ${sortedTransactions.length - DEFAULT_VISIBLE} More`}
            </button>
          </div>
        )}
      </>
    );
  })()}
</Card>

      {/* MODAL */}
      {modalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2>Add Transaction</h2>

            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={styles.input}
            />

            <div style={{ position: "relative" }}>
              <button
                style={styles.selectButton}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {selectedCategoryName || "Select Category"}
              </button>

              {dropdownOpen && (
                <div style={styles.dropdown}>
                  <p style={styles.groupLabel}>Income</p>

                  {categories
                    .filter((c) => c.type?.trim().toLowerCase() === "income")
                    .map((c) => (
                      <div
                        key={c.id}
                        style={styles.dropdownItem}
                        onClick={() => {
                          setSelectedCategory(c.id);
                          setSelectedCategoryName(c.name);
                          setDropdownOpen(false);
                        }}
                      >
                        <span>{c.name}</span>
                        <span
                          style={styles.trash}
                          onClick={(e) => deleteCategory(c.id, e)}
                        >
                          🗑
                        </span>
                      </div>
                    ))}

                  <div
                    style={styles.addNew}
                    onClick={() => {
  setNewCategoryType("income");
  setCategoryModalOpen(true);
}}
                  >
                    + Add new income category
                  </div>

                  <p style={{ ...styles.groupLabel, marginTop: 15 }}>
                    Expense
                  </p>

                  {categories
                    .filter((c) => c.type?.trim().toLowerCase() === "expense")
                    .map((c) => (
                      <div
                        key={c.id}
                        style={styles.dropdownItem}
                        onClick={() => {
                          setSelectedCategory(c.id);
                          setSelectedCategoryName(c.name);
                          setDropdownOpen(false);
                        }}
                      >
                        <span>{c.name}</span>
                        <span
                          style={styles.trash}
                          onClick={(e) => deleteCategory(c.id, e)}
                        >
                          🗑
                        </span>
                      </div>
                    ))}

                  <div
                    style={styles.addNew}
                    onClick={() => {
  setNewCategoryType("expense");
  setCategoryModalOpen(true);
}}
                  >
                    + Add new expense category
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
              <button onClick={addTransaction} style={styles.primaryButton}>
                Add
              </button>

              <button
                onClick={() => setModalOpen(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {categoryModalOpen && (
  <div style={styles.modalOverlay}>
    <div style={styles.modal}>
      <h3>Add New {newCategoryType} Category</h3>

      <input
        type="text"
        placeholder="Category name"
        value={newCategoryName}
        onChange={(e) => setNewCategoryName(e.target.value)}
        style={styles.modalInput}
      />

      <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
        <button style={styles.modalButton} onClick={createCategory}>
          Add Category
        </button>

        <button
          style={styles.modalCancel}
          onClick={() => setCategoryModalOpen(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

const styles = {
  title: {
    marginBottom: "20px",
    color: "#f8fafc",
    fontWeight: "600",
    letterSpacing: "-0.5px",
  },

  addButton: {
    marginBottom: "20px",
    padding: "10px 18px",
    background: "linear-gradient(135deg, #4db8ff, #3b82f6)",
    borderRadius: "8px",
    cursor: "pointer",
    color: "#0f172a",
    fontWeight: "600",
  },

  progressBar: {
    height: "10px",
    background: "rgba(255,255,255,0.06)",
    borderRadius: "8px",
    overflow: "hidden",
    marginTop: "10px",
    marginBottom: "10px",
  },

  breakdownButton: {
    marginTop: "15px",
    padding: "6px 12px",
    background: "#4db8ff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  },

  breakdownCard: {
    marginBottom: "15px",
    padding: "12px",
    background: "#1f2937",
    borderRadius: "8px",
  },

  breakdownRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px",
  },

  innerProgress: {
    height: "6px",
    background: "#333",
    borderRadius: "4px",
    overflow: "hidden",
  },

  breakdownMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    marginTop: "6px",
    opacity: 0.8,
  },

  cashFlowGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "24px",
    marginTop: "20px",
  },

  cards: {
  display: "flex",
  gap: "24px",
  marginBottom: "40px",
},

card: {
  background:
    "linear-gradient(145deg, #0b1220, #0f172a)",
  padding: "32px",
  borderRadius: "18px",
  flex: 1,
  border: "1px solid rgba(59,130,246,0.15)",
  boxShadow:
    "0 0 30px rgba(59,130,246,0.08)",
},

  transactionRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },

  trash: {
    cursor: "pointer",
    opacity: 0.7,
  },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backdropFilter: "blur(4px)",
    zIndex: 1000,
  },

  modal: {
    background: "linear-gradient(145deg, #111827, #1f2937)",
    padding: "32px",
    borderRadius: "16px",
    width: "420px",
    maxHeight: "85vh",
    overflowY: "auto",
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
  },

  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "12px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "#0f172a",
    color: "#e2e8f0",
  },

  primaryButton: {
    padding: "10px 16px",
    background: "linear-gradient(135deg, #10b981, #34d399)",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  cancelButton: {
    padding: "10px 16px",
    background: "linear-gradient(135deg, #ef4444, #f87171)",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  selectButton: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "#0f172a",
    color: "#e2e8f0",
    cursor: "pointer",
  },

  dropdown: {
    position: "absolute",
    top: "48px",
    width: "100%",
    background: "linear-gradient(145deg, #111827, #1f2937)",
    padding: "12px",
    borderRadius: "12px",
    zIndex: 1000,
    maxHeight: "250px",
    overflowY: "auto",
    border: "1px solid rgba(255,255,255,0.06)",
  },

  dropdownItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    cursor: "pointer",
  },

  groupLabel: {
    fontWeight: "600",
    marginBottom: "6px",
    color: "#94a3b8",
  },

  addNew: {
    marginTop: "6px",
    color: "#60a5fa",
    cursor: "pointer",
    fontSize: "13px",
  },

  modalOverlay: {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
},

modal: {
  background: "#0b1120",
  padding: "25px",
  borderRadius: "10px",
  width: "320px",
  border: "1px solid #1e293b",
},

modalInput: {
  width: "100%",
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #1e293b",
  background: "#020617",
  color: "#e2e8f0",
  marginTop: "10px",
},

modalButton: {
  padding: "8px 14px",
  background: "#0284c7",
  border: "none",
  borderRadius: "6px",
  color: "white",
  cursor: "pointer",
},

modalCancel: {
  padding: "8px 14px",
  background: "#1e293b",
  border: "none",
  borderRadius: "6px",
  color: "#e2e8f0",
  cursor: "pointer",
},

};