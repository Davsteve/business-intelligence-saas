import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useBusiness } from "../context/BusinessContext";
import { calculateForecast } from "../utils/forecastEngine";
import { formatCurrency } from "../utils/formatcurrency";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

export default function Forecast() {
  const { session, businessId } = useBusiness();
  const [transactions, setTransactions] = useState([]);
  const [cashReserve, setCashReserve] = useState("");
  const [revenueGrowth, setRevenueGrowth] = useState("");
  const [expenseReduction, setExpenseReduction] = useState("");
  const [targetSavings, setTargetSavings] = useState("");

  useEffect(() => {
    if (session && businessId) {
      fetchTransactions();
    }
  }, [session, businessId]);

  async function fetchTransactions() {
    const { data } = await supabase
      .from("transactions")
      .select("*, categories(name, type)")
      .eq("business_id", businessId);

    if (data) setTransactions(data);
  }

  const forecastData = calculateForecast(transactions);
  const latestMonthNet = forecastData?.latestMonthNet || 0;

  if (!forecastData) {
    return <h2 style={{ color: "#fff" }}>No data available</h2>;
  }

  const {
    monthlyData,
    projectionData,
    averageExpense,
    averageNet,
  } = forecastData;

  // ---------------- TARGET PARSE ----------------
const parsedTarget =
  targetSavings && !isNaN(targetSavings)
    ? parseFloat(targetSavings)
    : null;

  const combinedData = forecastData
  ? [
      ...forecastData.monthlyData,
      ...forecastData.projectionData,
    ]
      .filter((item) => item.actualNet !== 0 || item.projectedNet !== null)
      .map((item) => ({
        ...item,
        average: forecastData.averageNet,
      }))
  : [];

  // ---------------- RUNWAY ----------------

  const runwayDays =
  cashReserve && averageExpense > 0
    ? Math.floor((parseFloat(cashReserve) / averageExpense) * 30)
    : null;

const depletionDate =
  runwayDays
    ? new Date(
        new Date().getTime() + runwayDays * 24 * 60 * 60 * 1000
      ).toLocaleDateString()
    : null;

  // ---------------- MONTHLY NET TARGET ----------------

  const requiredSavingsIncrease =
  targetSavings && averageNet
    ? parseFloat(targetSavings) - averageNet
    : null;

const progressPercent =
  targetSavings && averageNet
    ? (averageNet / parseFloat(targetSavings)) * 100
    : null;

const monthsToTarget =
  requiredSavingsIncrease && averageNet > 0
    ? requiredSavingsIncrease / averageNet
    : null;

  let progressColor = "#666";
  let performanceMessage = "";

  if (progressPercent !== null) {
    if (averageNet < 0) {
      progressColor = "#ff4d4d";
      performanceMessage =
        "Currently operating at a net loss. Stabilization required before scaling.";
    } else if (progressPercent < 50) {
      progressColor = "#ff4d4d";
      performanceMessage =
        "Significant performance acceleration required.";
    } else if (progressPercent < 80) {
      progressColor = "#ffaa00";
      performanceMessage =
        "Healthy progress. Maintain operational momentum.";
    } else if (progressPercent < 100) {
      progressColor = "#4db8ff";
      performanceMessage =
        "Strong positioning. Target nearly achieved.";
    } else {
      progressColor = "#00ff9d";
      performanceMessage =
        "Target achieved. Consider raising next milestone.";
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Financial Forecast</h1>

      {/* ---------- PROJECTION CHART ---------- */}
      <div style={styles.fullWidthCard}>
        <h2>Net Cash Flow Projection</h2>

        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={combinedData}>
            <CartesianGrid stroke="#222" />
            <XAxis dataKey="label" stroke="#aaa" />
            <YAxis
  stroke="#aaa"
  tickFormatter={(value) => formatCurrency(value)}
/>
            <Tooltip
  formatter={(value, name) => {
    const formatted = formatCurrency(value);

    if (name === "actualNet") return [formatted, "Actual"];
    if (name === "projectedNet") return [formatted, "Projected"];
    if (name === "average") return [formatted, "Average"];

    return [formatted, name];
  }}
/>

            <Line
              type="monotone"
              dataKey="actualNet"
              stroke="#00ff9d"
              strokeWidth={3}
              dot={{ r: 4 }}
              connectNulls={false}
            />

            <Line
              type="monotone"
              dataKey="projectedNet"
              stroke="#ffaa00"
              strokeWidth={3}
              strokeDasharray="6 6"
              dot={false}
              connectNulls={false}
            />

            <Line
            type="monotone"
            dataKey="average"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="6 6"
            dot={false}
            opacity={0.6}
          />

            {parsedTarget && (
  <ReferenceLine
    y={parsedTarget}
    stroke="#ff4d4d"
    strokeWidth={2}
    strokeDasharray="4 4"
    label={{
  value: `Target (${formatCurrency(parsedTarget)})`,
      position: "right",
      fill: "#ff4d4d",
      fontSize: 12,
    }}
  />
)}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ---------- GRID ---------- */}
      <div style={styles.grid}>

        {/* RUNWAY */}
        <div style={styles.card}>
          <h2>Cash Runway</h2>

          <input
            type="number"
            placeholder="Available Cash (₹)"
            value={cashReserve}
            onChange={(e) => setCashReserve(e.target.value)}
            style={styles.input}
          />

          {runwayDays !== null && (
  <>
    <div style={styles.metricRow}>
      <p>Cash lasts for</p>
      <h3>{runwayDays} days</h3>
    </div>

    <div style={styles.metricRow}>
      <p>You’ll run out by</p>
      <h3>{depletionDate}</h3>
    </div>
  </>
)}
        </div>

        {/* MONTHLY NET TARGET PANEL */}


        <div style={styles.card}>
          <h2>Monthly Net Savings Target</h2>

          <div style={styles.metricRow}>
            <p>Average Monthly Net</p>
            <h3>{formatCurrency(averageNet)}</h3>
          </div>

          <p className="text-sm text-gray-400">Latest Month Net</p>
          <h2 className="text-xl font-bold">
          {formatCurrency(forecastData?.latestMonthNet)}
          </h2>

          <input
  type="number"
  placeholder="Target Monthly Savings (₹)"
  value={targetSavings}
  onChange={(e) => setTargetSavings(e.target.value)}
  style={styles.input}
/>

          {targetSavings && (
            <>
              <div style={styles.metricRow}>
                <p>Required Savings Increase</p>
                <h3 style={{ color: requiredSavingsIncrease > 0 ? "#ff4d4d" : "#00ff9d" }}>
                  {formatCurrency(requiredSavingsIncrease)}
                </h3>
              </div>

              {progressPercent !== null && (
                <>
                  <div style={styles.progressContainer}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${Math.min(progressPercent, 120)}%`,
                        background: progressColor,
                      }}
                    />
                  </div>

                  <p style={{ marginTop: "15px", opacity: 0.8 }}>
                    {performanceMessage}
                  </p>
                </>
              )}

              {monthsToTarget && averageNet > 0 && (
                <div style={{ marginTop: "15px", fontSize: "14px", opacity: 0.7 }}>
                  Estimated {Math.ceil(monthsToTarget)} months
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: { padding: "40px" },
  title: { marginBottom: "30px", color: "#fff" },
  fullWidthCard: {
    background: "#111827",
    padding: "30px",
    borderRadius: "16px",
    marginBottom: "40px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "30px",
  },
  card: {
    background: "#111827",
    padding: "30px",
    borderRadius: "16px",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1px solid #333",
    background: "#1f2937",
    color: "#fff",
  },
  metricRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "15px",
  },
  progressContainer: {
    width: "100%",
    height: "14px",
    background: "#1f2937",
    borderRadius: "20px",
    overflow: "hidden",
    marginTop: "20px",
  },
  progressFill: {
    height: "100%",
    borderRadius: "20px",
    transition: "width 0.6s ease",
  },
};