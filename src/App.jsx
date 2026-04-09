import { Routes, Route, useNavigate } from "react-router-dom";
import { useBusiness } from "./context/BusinessContext";
import { Toaster } from "react-hot-toast";
import { useState, useEffect } from "react";

import Sidebar from "./Components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Forecast from "./pages/Forecast";
import Advisor from "./pages/Advisor";
import Auth from "./pages/Auth";
import { supabase } from "./supabaseClient";

export default function App() {
  const { session, loading } = useBusiness();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/auth");
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) navigate("/auth");
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!session) {
    return <Auth />;
  }

  return (
    <>
      {/* ✅ TOASTER ADDED HERE */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#111827",
            color: "#fff",
            borderRadius: "12px",
            padding: "12px 16px",
          },
        }}
      />

      {/* ✅ YOUR ORIGINAL APP UI */}
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          background: "#0B1120",
          color: "#e2e8f0",
          width: "100vw",
          overflow: "hidden",
        }}
      >
        <Sidebar
          collapsed={collapsed}
          toggleSidebar={() => setCollapsed(!collapsed)}
        />

        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: "40px",
            transition: "all 0.3s ease",
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/advisor" element={<Advisor />} />
          </Routes>
        </div>
      </div>
    </>
  );
}