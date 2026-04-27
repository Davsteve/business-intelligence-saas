import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useBusiness } from "../context/BusinessContext";
import { formatCurrency } from "../utils/formatcurrency";
import Card from "../Components/ui/Card";
import { calculateFinancialHealth } from "../utils/financialHealthEngine";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

export default function Analytics() {
  const { businessId, loading } = useBusiness();
  const [transactions, setTransactions] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filter, setFilter] = useState("thisMonth");
  const now = new Date();

  const filteredTransactions = transactions.filter((t) => {
    if (filter === "all") return true;

    const date = new Date(t.created_at);

    if (filter === "thisMonth") {
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }

    if (filter === "lastMonth") {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return (
        date.getMonth() === lastMonth.getMonth() &&
        date.getFullYear() === lastMonth.getFullYear()
      );
    }

    return true;
  });

  const income = filteredTransactions
    .filter((t) => t.categories?.type === "income")
    .reduce((acc, curr) => acc + curr.amount, 0);

    const expense = filteredTransactions
    .filter((t) => t.categories?.type === "expense")
    .reduce((acc, curr) => acc + curr.amount, 0);

    const netSavings = income - expense;

    const savings = netSavings;

const getSpendingMessage = () => {
  if (filteredTransactions.length === 0) {
    return "Add your first transaction this month 🚀";
  }

  if (savings < 0) {
    return `⚠️ You're overspending by ${formatCurrency(Math.abs(savings))}`;
  }

  if (savings === 0) {
    return "👉 You're breaking even";
  }

  return `💰 You saved ${formatCurrency(savings)} — Well done, good job!`;
};

  useEffect(() => {
    if (!businessId) return;
    fetchTransactions();
  }, [businessId]);

  useEffect(() => {
  const close = () => setDropdownOpen(false);
  window.addEventListener("click", close);
  return () => window.removeEventListener("click", close);
}, []);

  async function fetchTransactions() {
    const { data, error } = await supabase
      .from("transactions")
      .select("*, categories(name, type)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });

    if (!error) setTransactions(data);
  }

  if (loading) return <div>Loading...</div>;

  if (!transactions.length) {
  return <p>No financial data yet.</p>
}

const financials = calculateFinancialHealth(transactions);
const { incomeTrendData } = financials || {};

const formattedGrowth =
  incomeTrendData?.shortTermChange?.toFixed(1) || "0.0";

  // -----------------------
  // FILTER
  // -----------------------

  

  // -----------------------
  // INCOME / EXPENSE
  // -----------------------

  

  

  const netProfit = income - expense;
  

  const totalIncome = income;
const totalExpense = expense;

const profitMargin =
  income > 0 ? ((netSavings / income) * 100).toFixed(1) : 0;

  // -----------------------
  // MONTH-OVER-MONTH INCOME GROWTH
  // -----------------------

console.log("Growth:", incomeGrowth);

  // -----------------------
  // CATEGORY BREAKDOWN
  // -----------------------

  const categoryMap = {};

filteredTransactions.forEach((t) => {
  if (t.categories?.type !== "expense") return; // 🔥 FIX

  const name = t.categories?.name || "Other";
  categoryMap[name] = (categoryMap[name] || 0) + t.amount;
});

  const pieData = Object.entries(categoryMap)
  .map(([name, value]) => ({ name, value }))
  .sort((a, b) => b.value - a.value);

  const COLORS = ["#00ff9d", "#ff4d4d", "#4db8ff", "#ffaa00", "#aa66ff"];

  const incomeCategoryMap = {};

filteredTransactions.forEach((t) => {
  if (t.categories?.type !== "income") return;

  const name = t.categories?.name || "Other";
  incomeCategoryMap[name] =
    (incomeCategoryMap[name] || 0) + t.amount;
});

const incomePieData = Object.entries(incomeCategoryMap)
  .map(([name, value]) => ({ name, value }))
  .sort((a, b) => b.value - a.value);

  // -----------------------
  // TOP EXPENSE CATEGORY
  // -----------------------

  let expenseCategoryMap = {};

  filteredTransactions.forEach((t) => {
    if (t.categories?.type !== "expense") return;
    const name = t.categories?.name || "Other";
    expenseCategoryMap[name] =
      (expenseCategoryMap[name] || 0) + t.amount;
  });

  let topExpenseCategory = "None";
  let topExpenseAmount = 0;

  Object.entries(expenseCategoryMap).forEach(([name, value]) => {
    if (value > topExpenseAmount) {
      topExpenseAmount = value;
      topExpenseCategory = name;
    }
  });

  // -----------------------
  // MONTHLY TREND (LAST 6 MONTHS)
  // -----------------------

  function formatMonth(date) {
    return date.toLocaleString("default", {
      month: "short",
      year: "numeric",
    });
  }

  const last6Months = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

    last6Months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: formatMonth(d),
      income: 0,
      expense: 0,
    });
  }

  transactions.forEach((t) => {
    const date = new Date(t.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}`;

    const monthObj = last6Months.find((m) => m.key === key);
    if (!monthObj) return;

    if (t.categories?.type === "income") {
      monthObj.income += t.amount;
    } else {
      monthObj.expense += t.amount;
    }
  });

  const lineData = last6Months.map(({ label, income, expense }) => ({
    month: label,
    income,
    expense,
  }));

  const barData = [
    { name: "Income", value: income },
    { name: "Expense", value: expense },
  ];

  // -----------------------
  // UI
  // -----------------------

  return (
    <div style={{ padding: "40px" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "30px" }}>
        Analytics Overview
      </h1>

      {/* KPI CARDS */}
      <div style={kpiContainer}>
        <div style={kpiCard}>
          <p>Net Savings Margin</p>
          <h2 style={{ color: profitMargin >= 0 ? "#00ff9d" : "#ff4d4d" }}>
            {profitMargin}%
          </h2>
        </div>

        <div style={kpiCard}>
          <p>Income Growth (This month vs last month)</p>
          <h2 style={{ color: incomeTrendData?.shortTermChange >= 0 ? "#00ff9d" : "#ff4d4d" }}>
            {formattedGrowth}% (recent change)
          </h2>
        </div>

        <div style={kpiCard}>
          <p>Top Expense Category</p>
          <h2>
            {topExpenseCategory} ({formatCurrency(topExpenseAmount)})
          </h2>
        </div>
      </div>

<div style={{ marginTop: "30px", marginBottom: "20px" }}>
  <Card>
    <h3 style={{ marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
      💡 {
    filter === "thisMonth"
      ? "This Month Summary"
      : filter === "lastMonth"
      ? "Last Month Summary"
      : "All Time Summary"
  }
    </h3>

    <p>💰 You earned: {formatCurrency(totalIncome)}</p>
    <p>💸 You spent: {formatCurrency(totalExpense)}</p>
    <p>📈 You saved: {formatCurrency(savings)}</p>

    <p
      style={{
        marginTop: "12px",
        fontWeight: "bold",
        color:
          savings < 0
            ? "#ef4444"
            : savings === 0
            ? "#f59e0b"
            : "#00ff9d",
      }}
    >
      {getSpendingMessage()}
    </p>
  </Card>
</div>

      {/* FILTER */}
      <div style={{ marginBottom: "30px" }}>
        <div style={{ position: "relative", marginBottom: "30px" }}>
  <button
    onClick={(e) => {
      e.stopPropagation();
      setDropdownOpen(!dropdownOpen);
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
        thisMonth: "This Month",
        lastMonth: "Last Month"
      }[filter]
    } ▼
  </button>

  {dropdownOpen && (
    <div
      style={{
        position: "absolute",
        top: "110%",
        left: 0,
        width: "160px",
        background: "#020617",
        border: "1px solid #1e293b",
        borderRadius: "8px",
        overflow: "hidden",
        zIndex: 1000
      }}
    >
      {[
        { label: "All Time", value: "all" },
        { label: "This Month", value: "thisMonth" },
        { label: "Last Month", value: "lastMonth" }
      ].map((item) => (
        <div
          key={item.value}
          onClick={(e) => {
            e.stopPropagation();
            setFilter(item.value);
            setDropdownOpen(false);
          }}
          style={{
            padding: "10px",
            cursor: "pointer",
            background:
              filter === item.value ? "#1e293b" : "transparent",
            color:
              filter === item.value ? "#38bdf8" : "#e2e8f0"
          }}
        >
          {item.label}
        </div>
      ))}
    </div>
  )}
</div>
      </div>

      {/* CHARTS */}
      <div
  style={{
    display: "flex",
    gap: "60px",
    flexWrap: "wrap",
    alignItems: "stretch"
  }}
>
        <div style={{ width: "100%", maxWidth: "600px", height: "350px", minHeight: "350px" }}>
          <h3>Income vs Expense</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Bar dataKey="value" fill="#4db8ff" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div
  style={{
    display: "flex",
    gap: "40px",
    flexWrap: "wrap", // keeps responsive
    justifyContent: "center",
    alignItems: "flex-start",
  }}
>

  {/* INCOME PIE */}
  <div style={{ width: "400px" }}>
    <h3>Income Breakdown</h3>
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={incomePieData}
          dataKey="value"
          nameKey="name"
          outerRadius={120}
          label={({ name, value }) =>
            `${name}: ${formatCurrency(value)}`
          }
        >
          {incomePieData.map((entry, index) => (
            <Cell
              key={`income-cell-${index}`}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatCurrency(value)} />
      </PieChart>
    </ResponsiveContainer>
  </div>

  {/* EXPENSE PIE */}
  <div style={{ width: "400px" }}>
    <h3>Expense Breakdown</h3>
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          outerRadius={120}
          label={({ name, value }) =>
            `${name}: ${formatCurrency(value)}`
          }
        >
          {pieData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatCurrency(value)} />
      </PieChart>
    </ResponsiveContainer>
  </div>
</div>

      {/* MONTHLY TREND */}
      <div style={{ marginTop: "60px", height: "400px" }}>
        <h3>Monthly Income vs Expense Trend (Last 6 Months)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#00ff9d"
              strokeWidth={3}
              dot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              stroke="#ff4d4d"
              strokeWidth={3}
              dot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const kpiContainer = {
  display: "flex",
  gap: "20px",
  marginBottom: "40px",
  flexWrap: "wrap",
};

const kpiCard = {
  background: "#111827",
  padding: "20px",
  borderRadius: "10px",
  minWidth: "220px",
  flex: 1,
};