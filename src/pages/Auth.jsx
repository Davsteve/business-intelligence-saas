import { useState } from "react";
import { supabase } from "../supabaseClient";
import logo from "../assets/clariflowpic.jpeg";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn() {
  if (!email) return;

  setLoading(true);
  setMessage("");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin
    }
  });

  if (error) {
    setMessage("Error sending magic link.");
  } else {
    setMessage("Check your email. We've sent you a login link.");
  }

  setLoading(false);
}

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img
  src={logo}
  alt="Clariflow"
  style={{
    width: "60px",
    marginBottom: "15px"
  }}
/>

<h2 style={{ marginBottom: "10px" }}>Clariflow</h2>
<p style={{ opacity: 0.7, marginBottom: "25px" }}>
  Simplifying Cash Flow
</p>

<h3 style={{ marginBottom: "15px" }}>
  Enter your email to continue
</h3>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />

        <button
  onClick={signIn}
  disabled={loading}
  style={styles.button}
>
  {loading ? "Sending..." : "Continue"}
</button>
          {message && (
  <p style={{ marginTop: "12px", opacity: 0.8 }}>
    {message}
  </p>
)}

        <p
  style={{
    fontSize: "13px",
    opacity: 0.6,
    marginTop: "12px",
  }}
>
  We'll send a secure login link to your inbox. No password required.
</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
    color: "white",
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    padding: "40px",
    borderRadius: "15px",
    backdropFilter: "blur(10px)",
    width: "350px",
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "8px",
    border: "none",
  },
  button: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "#3b82f6",
    color: "white",
    cursor: "pointer",
  },
};