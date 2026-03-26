import { useState, useMemo } from "react";

function Transactions({ transactions = [] }) {
  const [showAll, setShowAll] = useState(false);

  // ✅ Sort transactions (latest first)
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
  }, [transactions]);

  // ✅ Control visible transactions
  const visibleTransactions = showAll
    ? sortedTransactions
    : sortedTransactions.slice(0, 1);

  return (
    <div className="w-full max-w-3xl mx-auto mt-6">
      {/* ✅ Empty State */}
      {sortedTransactions.length === 0 && (
        <p className="text-gray-400 text-center py-6">
          No transactions yet.
        </p>
      )}

      {/* ✅ Transactions List */}
      <div className="space-y-3">
        {visibleTransactions.map((t, index) => (
          <div
            key={t.id || index}
            className="flex justify-between items-center p-4 rounded-xl bg-[#0f1b2b] border border-gray-800 hover:border-gray-600 transition"
          >
            {/* Left */}
            <div>
              <p className="font-medium">
                {t.name || t.category || "Transaction"}
              </p>
              <p className="text-sm text-gray-400">
                {t.date
                  ? new Date(t.date).toLocaleDateString()
                  : "No date"}
              </p>
            </div>

            {/* Right */}
            <div
              className={`font-semibold ${
                t.type === "income"
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {t.type === "income" ? "+" : "-"}₹
              {Number(t.amount || 0).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* ✅ Show More / Show Less Button */}
      {sortedTransactions.length > 10 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setShowAll((prev) => !prev)}
            className="px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-800 transition"
          >
            {showAll
              ? "Show Less"
              : `Show ${sortedTransactions.length - 10} More`}
          </button>
        </div>
      )}
    </div>
  );
}

export default Transactions;