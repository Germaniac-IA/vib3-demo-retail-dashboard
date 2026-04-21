"use client";

import { useState, useEffect, useCallback } from "react";
import { postJson, fetchJson as getJson } from "../../lib";

type DesignStatus =
  | "pending_template"
  | "template_uploaded"
  | "rendering"
  | "rendered"
  | "feedback"
  | "approved"
  | "production_ready";

interface DesignRequest {
  id: number;
  order_id: number | null;
  contact_id: number | null;
  seña_amount: number;
  template_url: string;
  client_uploaded_image_url: string | null;
  rendered_image_url: string | null;
  designer_prompt: string | null;
  max_render_attempts: number;
  render_attempts: number;
  status: DesignStatus;
  token: string;
  token_expires_at: string;
  created_at: string;
  updated_at: string;
  order_number?: string;
  order_total?: number;
  contact_name?: string;
  contact_phone?: string;
  feedback?: FeedbackEntry[];
}

interface FeedbackEntry {
  id: number;
  author: "client" | "agent" | "designer";
  message: string;
  created_at: string;
}

const STATUS_LABELS: Record<DesignStatus, string> = {
  pending_template: "⏳ Esperando template",
  template_uploaded: "📤 Template subido",
  rendering: "🎨 Renderizando...",
  rendered: "✅ Render OK",
  feedback: "💬 Con feedback",
  approved: "👍 Aprobado",
  production_ready: "🚀 Listo para producción",
};

const STATUS_COLORS: Record<DesignStatus, string> = {
  pending_template: "#f39c12",
  template_uploaded: "#3498db",
  rendering: "#9b59b6",
  rendered: "#27ae60",
  feedback: "#e67e22",
  approved: "#2ecc71",
  production_ready: "#16a085",
};

export default function DisenoPage() {
  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DesignRequest | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [newOrderId, setNewOrderId] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      const data = await getJson<DesignRequest[]>("/design-requests");
      setRequests(data);
    } catch (e) {
      console.error("Error loading design requests:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrderId.trim()) return;
    setCreateLoading(true);
    setCreateError("");
    try {
      await postJson("/design-requests", { order_id: Number(newOrderId) });
      setNewOrderId("");
      loadRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("409")) {
        setCreateError("Ya existe un pedido de diseño para este pedido");
      } else {
        setCreateError(msg);
      }
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleSendFeedback() {
    if (!selected || !feedbackText.trim()) return;
    setSendingFeedback(true);
    try {
      await postJson(`/design-requests/${selected.id}/feedback`, {
        message: feedbackText,
        author: "agent",
      });
      setFeedbackText("");
      const updated = await getJson<DesignRequest>(`/design-requests/${selected.id}`);
      setSelected(updated);
      loadRequests();
    } catch (e) {
      console.error(e);
    } finally {
      setSendingFeedback(false);
    }
  }

  async function handleRender() {
    if (!selected || !selected.client_uploaded_image_url) return;
    setRendering(true);
    try {
      await postJson(`/design-requests/${selected.id}/render`, {
        image_url: selected.client_uploaded_image_url,
      });
      const updated = await getJson<DesignRequest>(`/design-requests/${selected.id}`);
      setSelected(updated);
      loadRequests();
    } catch (e) {
      console.error(e);
      alert("Error al renderizar: " + (e as Error).message);
    } finally {
      setRendering(false);
    }
  }

  async function handleApprove() {
    if (!selected) return;
    try {
      await postJson(`/design-requests/${selected.id}/approve`, {});
      const updated = await getJson<DesignRequest>(`/design-requests/${selected.id}`);
      setSelected(updated);
      loadRequests();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleGenerateLink() {
    if (!selected) return;
    try {
      const result = await postJson<{ token: string }>(`/design-requests/${selected.id}/generate-link`, {});
      const updated = await getJson<DesignRequest>(`/design-requests/${selected.id}`);
      setSelected(updated);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCopyLink() {
    if (!selected?.token) return;
    const link = `${window.location.origin}/d/${selected.token}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Cargando...</div>;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* LEFT PANEL — Card list */}
      <div style={{ width: 380, borderRight: "1px solid #eee", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee", background: "#f9f9f9" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 800 }}>🎨 Módulo de Diseño</h2>
          <form onSubmit={handleCreate} style={{ display: "flex", gap: 6 }}>
            <input
              type="number"
              value={newOrderId}
              onChange={e => setNewOrderId(e.target.value)}
              placeholder="N° Pedido"
              style={{ flex: 1, padding: "7px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }}
            />
            <button
              type="submit"
              disabled={createLoading}
              style={{ padding: "7px 14px", background: "#6c63ff", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: createLoading ? "not-allowed" : "pointer" }}
            >
              {createLoading ? "..." : "+ Crear"}
            </button>
          </form>
          {createError && <div style={{ color: "#e74c3c", fontSize: 11, marginTop: 6 }}>{createError}</div>}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {requests.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Sin pedidos de diseño</div>
          )}
          {requests.map(r => (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #f0f0f0",
                cursor: "pointer",
                background: selected?.id === r.id ? "#f0edff" : "#fff",
                borderLeft: selected?.id === r.id ? "3px solid #6c63ff" : "3px solid transparent",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Pedido #{r.order_id ?? r.id}</span>
                <span style={{ fontSize: 11, color: STATUS_COLORS[r.status], fontWeight: 600 }}>
                  {r.render_attempts}/{r.max_render_attempts} renders
                </span>
              </div>
              {r.contact_name && (
                <div style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>👤 {r.contact_name}</div>
              )}
              <div style={{ fontSize: 12, color: "#888" }}>
                Seña: <strong style={{ color: r.seña_amount > 0 ? "#27ae60" : "#999" }}>
                  {r.seña_amount > 0 ? `$${Number(r.seña_amount).toLocaleString("es-AR")} ✅` : "Sin seña"}
                </strong>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: STATUS_COLORS[r.status] }}>
                {STATUS_LABELS[r.status]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL — Detail */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        {!selected ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#ccc", fontSize: 18 }}>
            Seleccioná un pedido para ver el detalle
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: "0 0 4px" }}>Pedido #{selected.order_id ?? selected.id}</h2>
                <div style={{ color: "#888", fontSize: 13 }}>
                  {selected.contact_name} · {selected.contact_phone ?? "sin teléfono"}
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: STATUS_COLORS[selected.status], fontWeight: 700 }}>
                  {STATUS_LABELS[selected.status]}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={handleGenerateLink} style={{ padding: "8px 14px", background: "#3498db", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                  🔗 Generar Link
                </button>
                {selected.token && (
                  <button onClick={handleCopyLink} style={{ padding: "8px 14px", background: copiedLink ? "#27ae60" : "#2ecc71", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                    {copiedLink ? "✅ Copiado!" : "📋 Copiar Link"}
                  </button>
                )}
                {selected.client_uploaded_image_url && selected.status !== "rendering" && (
                  <button onClick={handleRender} disabled={rendering} style={{ padding: "8px 14px", background: rendering ? "#aaa" : "#9b59b6", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: rendering ? "not-allowed" : "pointer", fontWeight: 600 }}>
                    {rendering ? "🎨 Renderizando..." : "🎨 Re-renderizar"}
                  </button>
                )}
                {(selected.status === "rendered" || selected.status === "feedback") && (
                  <button onClick={handleApprove} style={{ padding: "8px 14px", background: "#16a085", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                    ✅ Aprobar para Producción
                  </button>
                )}
              </div>
            </div>

            {/* Images */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 8 }}>📤 Template del Cliente</div>
                {selected.client_uploaded_image_url ? (
                  <img src={selected.client_uploaded_image_url} alt="Uploaded" style={{ width: "100%", borderRadius: 8, objectFit: "contain", maxHeight: 280 }} />
                ) : (
                  <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f9f9", borderRadius: 8, color: "#ccc", fontSize: 13 }}>
                    Aún no subido
                  </div>
                )}
              </div>
              <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 8 }}>🎨 Diseño Renderizado</div>
                {selected.rendered_image_url ? (
                  <img src={selected.rendered_image_url} alt="Rendered" style={{ width: "100%", borderRadius: 8, objectFit: "contain", maxHeight: 280 }} />
                ) : (
                  <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f9f9", borderRadius: 8, color: "#ccc", fontSize: 13 }}>
                    {selected.status === "rendering" ? "🎨 Renderizando..." : "Sin render"}
                  </div>
                )}
              </div>
            </div>

            {/* Link */}
            {selected.token && (
              <div style={{ background: "#f0f8ff", border: "1px solid #d0e8ff", borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 13 }}>
                <strong>🔗 Link para el cliente:</strong><br />
                <code style={{ color: "#3498db", wordBreak: "break-all" }}>
                  {typeof window !== "undefined" ? `${window.location.origin}/d/${selected.token}` : `/d/${selected.token}`}
                </code>
                <span style={{ color: "#888", marginLeft: 12, fontSize: 11 }}>
                  (vence {new Date(selected.token_expires_at).toLocaleString("es-AR")})
                </span>
              </div>
            )}

            {/* Designer prompt */}
            {selected.designer_prompt && (
              <div style={{ background: "#fff9e6", border: "1px solid #f0d060", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 4 }}>📝 Prompt del Diseñador</div>
                <div style={{ fontSize: 14 }}>{selected.designer_prompt}</div>
              </div>
            )}

            {/* Feedback thread */}
            <div>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>💬 Feedback</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {(selected.feedback ?? []).map(fb => (
                  <div
                    key={fb.id}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: fb.author === "client" ? "#e8f5e9" : fb.author === "designer" ? "#f3e5f5" : "#e3f2fd",
                      border: `1px solid ${fb.author === "client" ? "#a5d6a7" : fb.author === "designer" ? "#ce93d8" : "#90caf9"}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 12, textTransform: "capitalize" }}>
                        {fb.author === "client" ? "👤 Cliente" : fb.author === "designer" ? "🎨 Diseñador" : "🤖 Agente"}
                      </span>
                      <span style={{ fontSize: 11, color: "#888" }}>
                        {new Date(fb.created_at).toLocaleString("es-AR")}
                      </span>
                    </div>
                    <div style={{ fontSize: 14 }}>{fb.message}</div>
                  </div>
                ))}
                {(selected.feedback ?? []).length === 0 && (
                  <div style={{ color: "#ccc", fontSize: 13, fontStyle: "italic" }}>Sin feedback aún</div>
                )}
              </div>

              {/* Add feedback */}
              <div style={{ display: "flex", gap: 8 }}>
                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="Escribí feedback para el cliente o diseñador..."
                  rows={2}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, resize: "vertical", fontFamily: "inherit" }}
                />
                <button
                  onClick={handleSendFeedback}
                  disabled={sendingFeedback || !feedbackText.trim()}
                  style={{ padding: "10px 18px", background: sendingFeedback ? "#aaa" : "#6c63ff", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, cursor: sendingFeedback ? "not-allowed" : "pointer", fontWeight: 700, alignSelf: "flex-end" }}
                >
                  {sendingFeedback ? "Enviando..." : "Enviar 💬"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
