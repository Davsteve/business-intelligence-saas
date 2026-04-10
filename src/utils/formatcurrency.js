export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return "₹ 0";

  return "₹ " + Number(amount).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
}