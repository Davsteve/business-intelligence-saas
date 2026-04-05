import { Link, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
<img src="/favicon.png" alt="Clariflow Logo" />

export default function Sidebar({ collapsed, toggleSidebar }) {
  const handleLogout = async () => {
  await supabase.auth.signOut();
  window.location.href = "/auth";
};
  const location = useLocation();

  const menuItems = [
 { name: "Dashboard", path: "/", icon: "📊" },
 { name: "Analytics", path: "/analytics", icon: "📈" },
 { name: "Forecast", path: "/forecast", icon: "🔮" },
 { name: "AI Advisor", path: "/advisor", icon: "🤖" }
];

  return (
  <div
  style={{
    width: collapsed ? "80px" : "240px",
    flexShrink: 0,
    transition: "width 0.3s ease",
    background: "linear-gradient(180deg, #0b1220, #0f172a)",
    borderRight: "1px solid rgba(255,255,255,0.05)",
    minHeight: "100vh",
    padding: collapsed ? "30px 10px" : "40px 25px",

    position: "relative", // ✅ ADD THIS HERE

    display: "flex",              // ✅ ADD
    flexDirection: "column",      // ✅ ADD
  }}
>
      {/* 3 DOT MENU BUTTON */}
      <div
        onClick={toggleSidebar}
        style={{
          position: "absolute",
          top: "32px",
          right: collapsed ? "20px" : "20px",
          cursor: "pointer",
          fontSize: "20px",
          opacity: 0.6,
          userSelect: "none",

          zIndex: 10   // ✅ ADD THIS
        }}
      >
        ☰
      </div>

      {/* LOGO */}
      <div
  style={{
    marginBottom: "42px",
    display: "flex",
    alignItems: "center",
    gap: "12px"
  }}
>
  <img
    src="/favicon.png"
    alt="Clariflow"
    style={{
      width: collapsed ? "34px" : "42px",
      height: "auto", 
      objectFit: "contain",
      filter: "drop-shadow(0px 0px 6px rgba(56,189,248,0.25))"
    }}
  />

  {!collapsed && (
    <span
      style={{
        fontWeight: "600",
        fontSize: "20px",
        color: "#f8fafc",
        letterSpacing: "-0.4px"
      }}
    >
      Clariflow
    </span>
  )}
</div>

      {/* MENU */}
      <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "22px",
      marginTop: collapsed ? "60px" : "0",
    }}
  >
    {menuItems.map((item) => {
      const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}

              onMouseEnter={(e) => {
  if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
}}
onMouseLeave={(e) => {
  if (!isActive) e.currentTarget.style.background = "transparent";
}}

              style={{
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: collapsed ? "12px" : "12px 16px",
  borderRadius: "10px",
  textDecoration: "none",
  color: isActive ? "#38bdf8" : "#94a3b8",
  background: isActive ? "rgba(56,189,248,0.12)" : "transparent",
  transition: "all 0.2s ease"
}}

            >
              <>
  <span style={{ fontSize: "18px" }}>{item.icon}</span>
  {!collapsed && item.name}
</>
            </Link>
          );
        })}

        {/* LOGOUT BUTTON */}
<div
    style={{
      marginTop: "auto",   // ✅ PUSHES TO BOTTOM
      paddingTop: "20px"
    }}
  >
  <button
    onClick={handleLogout}

    onMouseEnter={(e) => {
  e.currentTarget.style.background = "rgba(239,68,68,0.25)";
  e.currentTarget.style.transform = "scale(1.02)";
}}
onMouseLeave={(e) => {
  e.currentTarget.style.background = "rgba(239,68,68,0.15)";
  e.currentTarget.style.transform = "scale(1)";
}}

    style={{
      width: "100%",
      padding: "12px",
      borderRadius: "10px",
      border: "none",
      background: "rgba(239,68,68,0.15)",
      color: "#ef4444",
      cursor: "pointer",
      fontSize: "14px",
      display: "flex",
      alignItems: "center",
      justifyContent: collapsed ? "center" : "flex-start",
      gap: "10px",
      transition: "all 0.2s ease"
    }}
  >
    <span>🚪</span>
    {!collapsed && "Logout"}
  </button>
</div>
      </div>
    </div>
  );
}