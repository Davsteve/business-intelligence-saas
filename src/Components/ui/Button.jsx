import { theme } from "../../styles/theme";

export default function Button({ children, onClick, variant = "primary" }) {
  const base = {
    padding: "10px 16px",
    borderRadius: theme.radius.md,
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
    transition: theme.transition,
  };

  const variants = {
    primary: {
      background: "linear-gradient(135deg, #3b82f6, #60a5fa)",
      color: "#fff",
    },
    success: {
      background: "linear-gradient(135deg, #10b981, #34d399)",
      color: "#022c22",
    },
    danger: {
      background: "linear-gradient(135deg, #ef4444, #f87171)",
      color: "#fff",
    },
  };

  return (
    <button
      onClick={onClick}
      style={{ ...base, ...variants[variant] }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {children}
    </button>
  );
}