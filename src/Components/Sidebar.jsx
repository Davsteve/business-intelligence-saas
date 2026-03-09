import { Link, useLocation } from "react-router-dom";

export default function Sidebar({ collapsed, toggleSidebar }) {
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard", path: "/" },
    { name: "Analytics", path: "/analytics" },
    { name: "Forecast", path: "/forecast" },
    { name: "AI Advisor", path: "/advisor" },
  ];

  return (
  <div
    onClick={!collapsed ? toggleSidebar : undefined}
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
        ⋮
      </div>

      {/* LOGO */}
      {!collapsed && (
  <h1
    style={{
      color: "#f8fafc",
      fontWeight: "700",
      marginBottom: "50px",
      letterSpacing: "-1px",
    }}
  >
    Clariflow
  </h1>
)}

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
              style={{
                textDecoration: "none",
                padding: collapsed ? "10px" : "12px 15px",
                borderRadius: "12px",
                color: isActive ? "#00bfff" : "#94a3b8",
                background: isActive
                  ? "rgba(0,191,255,0.08)"
                  : "transparent",
                transition: "all 0.2s ease",
                textAlign: collapsed ? "center" : "left",
                fontSize: collapsed ? "18px" : "15px",
              }}
            >
              {collapsed ? item.name[0] : item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}