import { Link, useLocation } from "react-router-dom";
import logo from "../assets/clariflowpic.jpeg";

export default function Sidebar({ collapsed, toggleSidebar }) {
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
      position: "relative",
      cursor: !collapsed ? "pointer" : "default",
    }}
  >
      {/* 3 DOT MENU BUTTON */}
      <div
        onClick={toggleSidebar}
        style={{
          position: "absolute",
          top: "15px",
          right: collapsed ? "20px" : "20px",
          cursor: "pointer",
          fontSize: "20px",
          opacity: 0.6,
          userSelect: "none",
        }}
      >
        ☰
      </div>

      {/* LOGO */}
      <div
style={{
marginBottom: "40px",
display: "flex",
alignItems: "center",
gap: "10px"
}}
>
<img
src={logo}
alt="Clariflow"
style={{
width: collapsed ? "30px" : "36px",
height: collapsed ? "30px" : "36px"
}}
/>

{!collapsed && (
<span
style={{
fontWeight: "700",
fontSize: "20px",
color: "#f8fafc",
letterSpacing: "-1px"
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
      </div>
    </div>
  );
}