import React, { useState } from "react";
import loginBg from "../../../public/login.png";
import logo from "../../../public/logo.png";

export default function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      if (!email || !password) {
        setError("Please fill in all fields.");
        setLoading(false);
        return;
      }
      if (mode === "register") {
        if (localStorage.getItem(`user:${email}`)) {
          setError("User already exists.");
          setLoading(false);
          return;
        }
        localStorage.setItem(`user:${email}` , password);
        onLogin({ email });
      } else {
        const saved = localStorage.getItem(`user:${email}`);
        if (!saved || saved !== password) {
          setError("Invalid email or password.");
          setLoading(false);
          return;
        }
        onLogin({ email });
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Montserrat, sans-serif',
      background: '#18181b',
    }}>
      {/* Background image and overlay */}
      <img
        src={loginBg}
        alt="Login background"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          zIndex: 0,
          filter: 'blur(6px) brightness(0.6)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'linear-gradient(120deg,#18181b 60%,#23272f 100%)',
          opacity: 0.82,
          zIndex: 1,
        }}
      />
      {/* Wavy bottom SVG */}
      <svg
        style={{ position: 'absolute', bottom: 0, left: 0, width: '100vw', zIndex: 2 }}
        height="220"
        viewBox="0 0 1440 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d="M0,80 C400,200 1040,0 1440,120 L1440,220 L0,220 Z"
          fill="#23272f"
          opacity="0.93"
        />
        <path
          d="M0,140 C600,260 1040,40 1440,180 L1440,220 L0,220 Z"
          fill="#ffe082"
          opacity="0.15"
        />
      </svg>
      {/* Login Card */}
      <div style={{
        position: 'relative',
        zIndex: 3,
        background: 'rgba(18,18,20,0.96)',
        borderRadius: 22,
        border: '1.5px solid #23272f',
        padding: '2.8rem 2.3rem 2.2rem 2.3rem',
        minWidth: 370,
        maxWidth: 400,
        boxShadow: '0 8px 40px 0 rgba(31, 38, 40, 0.45)',
        color: '#e5e5e5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.7rem',
        backdropFilter: 'blur(2.5px)',
      }}>
        <img src={logo} alt="Absolute Cinema Logo" style={{ width: 64, height: 64, marginBottom: 12, borderRadius: 16, boxShadow: '0 2px 12px #23272f77' }} />
        <div style={{ fontWeight: 900, fontSize: 26, letterSpacing: 1, textAlign: 'center', color: '#ffe082', marginBottom: 6 }}>
          Welcome Back
        </div>
        <div style={{ fontSize: 16, color: '#bcbcbc', marginBottom: 18, textAlign: 'center', fontWeight: 500 }}>
          {mode === "login" ? "Sign in to your Absolute Cinema account" : "Register a new Absolute Cinema account"}
        </div>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 0, alignItems: 'center', marginBottom: 10 }}>
          <button
            type="button"
            onClick={() => { setMode("login"); setError(""); }}
            style={{
              borderRadius: '18px 0 0 18px',
              border: 'none',
              background: mode === "login" ? '#ffe082' : '#23272f',
              color: mode === "login" ? '#18181b' : '#ffe082',
              fontWeight: 700,
              fontSize: 15,
              padding: '8px 28px',
              cursor: 'pointer',
              transition: 'background 0.2s',
              outline: 'none',
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(""); }}
            style={{
              borderRadius: '0 18px 18px 0',
              border: 'none',
              background: mode === "register" ? '#ffe082' : '#23272f',
              color: mode === "register" ? '#18181b' : '#ffe082',
              fontWeight: 700,
              fontSize: 15,
              padding: '8px 28px',
              cursor: 'pointer',
              transition: 'background 0.2s',
              outline: 'none',
            }}
          >
            Register
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
            style={{ width: '100%', fontSize: 16, marginBottom: 12, borderRadius: 12, border: '1.5px solid #353535', background: '#18181b', color: '#e5e5e5', padding: '13px 16px', outline: error ? '1.5px solid #ffb300' : 'none', boxShadow: '0 1px 8px #23272f22' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', fontSize: 16, marginBottom: 12, borderRadius: 12, border: '1.5px solid #353535', background: '#18181b', color: '#e5e5e5', padding: '13px 16px', outline: error ? '1.5px solid #ffb300' : 'none', boxShadow: '0 1px 8px #23272f22' }}
          />
          {error && <div style={{ color: '#ffb300', fontSize: 14, marginBottom: 6, fontWeight: 600 }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
            <button type="submit" disabled={loading} style={{ fontWeight: 700, fontSize: 17, borderRadius: 10, background: loading ? '#ffe08288' : '#ffe082', color: '#18181b', padding: '12px 0', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', width: 120, boxShadow: '0 2px 12px #ffe08244', transition: 'background 0.2s' }}>
              {loading ? (mode === "login" ? "Signing In..." : "Registering...") : (mode === "login" ? "Sign In" : "Register")}
            </button>
            <span style={{ color: '#bcbcbc', fontSize: 14, cursor: 'pointer', textDecoration: 'underline', marginLeft: 8 }} onClick={() => alert('Password reset is not implemented yet.')}>Forgot password?</span>
          </div>
        </form>
      </div>
    </div>
  );
}
