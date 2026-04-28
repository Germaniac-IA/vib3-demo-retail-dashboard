"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "../lib";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }, []);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/negocio");
    }
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await postJson<{ token: string; user: unknown }>("/auth/login", {
        username,
        password,
      });
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      router.push("/negocio");
    } catch {
      setError("Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper" style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
      <div className="login-box"
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "40px",
          width: "100%",
          maxWidth: "380px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>🦫</div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "4px" }}>Baver.Arg</h1>
          <p style={{ color: "#888", fontSize: "14px" }}>Panel de control</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{ color: "#e74c3c", fontSize: "13px", textAlign: "center" }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px",
              background: loading ? "#ccc" : "#6c63ff",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "8px",
            }}
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "12px", color: "#aaa", marginTop: "24px" }}>
          Baver.Arg · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
