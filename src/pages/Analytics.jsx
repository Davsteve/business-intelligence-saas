import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useBusiness } from "../context/BusinessContext";
import { formatCurrency } from "../utils/formatcurrency";
import Card from "../Components/ui/Card";

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
  const totalIncome = transactions
  .filter(t => t.categories?.type === "income")
  .reduce((acc, curr) => acc + curr.amount, 0);

const totalExpense = transactions
  .filter(t => t.categories?.type === "expense")
  .reduce((acc, curr) => acc + curr.amount, 0);

const savings = totalIncome - totalExpense;

const getSpendingMessage = () => {
  if (totalIncome === 0) return "Start tracking to see insights";

  if (savings < 0) {
    return `👉 You are overspending by ₹${Math.abs(savings)}`;
  }

  if (savings === 0) {
    return "👉 You're breaking even";
  }

  return `👉 You saved ₹${savings}`;
};
  const [filter, setFilter] = useState("all");

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

  const now = new Date();

  // -----------------------
  // FILTER
  // -----------------------

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

  // -----------------------
  // INCOME / EXPENSE
  // -----------------------

  const income = filteredTransactions
    .filter((t) => t.categories?.type === "income")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const expense = filteredTransactions
    .filter((t) => t.categories?.type === "expense")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netProfit = income - expense;
  const profitMargin =
    income > 0 ? ((netProfit / income) * 100).toFixed(1) : 0;

  // -----------------------
  // MONTH-OVER-MONTH INCOME GROWTH
  // -----------------------

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);

  let thisMonthIncome = 0;
  let lastMonthIncome = 0;

  transactions.forEach((t) => {
    const date = new Date(t.created_at);
    if (t.categories?.type !== "income") return;

    if (
      date.getMonth() === currentMonth &&
      date.getFullYear() === currentYear
    ) {
      thisMonthIncome += t.amount;
    }

    if (
      date.getMonth() === lastMonthDate.getMonth() &&
      date.getFullYear() === lastMonthDate.getFullYear()
    ) {
      lastMonthIncome += t.amount;
    }
  });

  const incomeGrowth =
    lastMonthIncome > 0
      ? (
          ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) *
          100
        ).toFixed(1)
      : 0;

  // -----------------------
  // CATEGORY BREAKDOWN
  // -----------------------

  const categoryMap = {};
  filteredTransactions.forEach((t) => {
    const name = t.categories?.name || "Other";
    categoryMap[name] = (categoryMap[name] || 0) + t.amount;
  });

  const pieData = Object.keys(categoryMap).map((key) => ({
    name: key,
    value: categoryMap[key],
  }));

  const COLORS = ["#00ff9d", "#ff4d4d", "#4db8ff", "#ffaa00", "#aa66ff"];

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
          <p>Income Growth (MoM)</p>
          <h2 style={{ color: incomeGrowth >= 0 ? "#00ff9d" : "#ff4d4d" }}>
            {incomeGrowth}%
          </h2>
        </div>

        <div style={kpiCard}>
          <p>Top Expense Category</p>
          <h2>
            {topExpenseCategory} ({formatCurrency(topExpenseAmount)})
          </h2>
        </div>
      </div>

      <Card
  style={{
    marginTop: "16px",
    padding: "16px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.05)",
    lineHeight: "1.6"
  }}
>
  <p>You earned: ₹{totalIncome}</p>
  <p>You spent: ₹{totalExpense}</p>
  <p>You saved: ₹{savings}</p>

  <p style={{ marginTop: "8px", fontWeight: "bold" }}>
    {getSpendingMessage()}
  </p>
</Card>

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

        <div style={{ width: "100%", maxWidth: "600px", height: "350px", minHeight: "350px" }}>
          <h3>Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                outerRadius={120}
                label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
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