import { useState } from "react";
import { signUp, signIn } from "../utils/Auth";


export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
  if (!email || !password) {
    alert("Enter email & password");
    return;
  }

  setLoading(true);
  try {
    await signUp(email, password);
    alert("Signup successful! Check your email.");
  } catch (err) {
    alert(err.message);
  }
  setLoading(false);
}

async function handleLogin() {
  if (!email || !password) {
    alert("Enter email & password");
    return;
  }

  setLoading(true);
  try {
    await signIn(email, password);
    alert("Login successful!");
    window.location.href = "/dashboard";
  } catch (err) {
    alert(err.message);
  }
  setLoading(false);
}

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img
  src="/favicon.png"
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

        <input
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={styles.input}
      />

        <button
  onClick={handleSignup}
  disabled={loading}
  style={styles.button}
>
  {loading ? "Loading..." : "Sign Up"}
</button>

<br /><br />

<button
  onClick={handleLogin}
  disabled={loading}
  style={styles.button}
>
  {loading ? "Loading..." : "Login"}
</button>

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