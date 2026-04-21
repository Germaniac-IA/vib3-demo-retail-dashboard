"use client";

import { useState, useEffect, use } from "react";

type DesignStatus =
  | "pending_template"
  | "template_uploaded"
  | "rendering"
  | "rendered"
  | "feedback"
  | "approved"
  | "production_ready";

interface DesignData {
  id: number;
  order_id: number | null;
  status: DesignStatus;
  template_url: string;
  client_uploaded_image_url: string | null;
  rendered_image_url: string | null;
  designer_prompt: string | null;
  token: string;
  order_number?: string;
  estilo?: string;
  deporte?: string;
  corte?: string;
  rasgos?: string;
  feedback?: FeedbackEntry[];
}

interface FeedbackEntry {
  id: number;
  author: "client" | "agent" | "designer";
  message: string;
  created_at: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "";

const STATUS_LABELS: Record<DesignStatus, string> = {
  pending_template: "⏳ Esperando tu diseño",
  template_uploaded: "📤 Template subido",
  rendering: "🎨 Renderizando...",
  rendered: "✅ Diseño listo",
  feedback: "💬 Con comentarios",
  approved: "👍 Aprobado",
  production_ready: "🚀 ¡Listo para producción!",
};

export default function PublicDesignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [dr, setDr] = useState<DesignData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [wizard, setWizard] = useState({ estilo: "", deporte: "", corte: "", rasgos: "" });
  const [savingWizard, setSavingWizard] = useState(false);
  const [wizardSaved, setWizardSaved] = useState(false);

  useEffect(() => {
    fetch(`${API}/design-requests/public/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); }
        else {
          setDr(d);
          setWizard({ estilo: d.estilo || "", deporte: d.deporte || "", corte: d.corte || "", rasgos: d.rasgos || "" });
        }
      })
      .catch(() => setError("Error al cargar"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!imageUrl.trim()) return;
    setUploading(true);
    try {
      const r = await fetch(`${API}/design-requests/public/${token}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl }),
      });
      const data = await r.json();
      if (data.error) { alert(data.error); return; }
      const r2 = await fetch(`${API}/design-requests/public/${token}`);
      setDr(await r2.json());
    } catch { alert("Error al subir imagen"); }
    finally { setUploading(false); }
  }

  async function handleFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setSendingFeedback(true);
    try {
      await fetch(`${API}/design-requests/public/${token}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedbackText }),
      });
      setFeedbackText("");
      const r = await fetch(`${API}/design-requests/public/${token}`);
      setDr(await r.json());
    } catch { alert("Error al enviar"); }
    finally { setSendingFeedback(false); }
  }

  async function handleSaveWizard() {
    setSavingWizard(true);
    try {
      const r = await fetch(`${API}/design-requests/${dr!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wizard),
      });
      if (r.ok) {
        setWizardSaved(true);
        setTimeout(() => setWizardSaved(false), 2000);
      }
    } catch { alert("Error al guardar"); }
    finally { setSavingWizard(false); }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", background: "#f5f5f5" }}>
      <p style={{ color: "#888" }}>Cargando...</p>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", background: "#f5f5f5" }}>
      <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <h2 style={{ margin: "0 0 8px", color: "#333" }}>Link inválido o expirado</h2>
        <p style={{ color: "#888", margin: 0 }}>Este link ya no es válido. Contactá a la tienda para pedir uno nuevo.</p>
      </div>
    </div>
  );

  if (!dr) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "system-ui, sans-serif", padding: "20px 16px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, background: "#6c63ff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎨</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#333" }}>Tu Diseño</h1>
              {dr.order_number && <p style={{ margin: 0, fontSize: 13, color: "#888" }}>Pedido #{dr.order_number}</p>}
            </div>
          </div>
          <div style={{ background: "#f0edff", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#6c63ff", fontWeight: 600, textAlign: "center" }}>
            {STATUS_LABELS[dr.status]}
          </div>
        </div>

        {/* Template reference */}
        {dr.template_url && (
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#333" }}>📐 Plantilla de referencia</h2>
            <img src={dr.template_url} alt="Plantilla" style={{ width: "100%", borderRadius: 10, border: "1px solid #eee" }} />
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#aaa" }}>Usá esta plantilla como referencia para diseñar</p>
          </div>
        )}

        {/* Wizard */}
        {dr.status === "pending_template" && (
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#333" }}>🎨 Personalizá tu diseño</h2>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#666" }}>Completá estos datos para personalizar el render de tu camiseta</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Estilo</label>
                <select value={wizard.estilo} onChange={e => setWizard({ ...wizard, estilo: e.target.value })} style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }}>
                  <option value="">Seleccionar...</option>
                  <option value="Actual">Actual</option>
                  <option value="Novedoso">Novedoso</option>
                  <option value="Ochentoso">Ochentoso</option>
                  <option value="Clasico">Clasico</option>
                  <option value="Minimalista">Minimalista</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Deporte</label>
                <select value={wizard.deporte} onChange={e => setWizard({ ...wizard, deporte: e.target.value })} style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }}>
                  <option value="">Seleccionar...</option>
                  <option value="Voley">Voley</option>
                  <option value="Futbol">Futbol</option>
                  <option value="Basketball">Basketball</option>
                  <option value="Rugby">Rugby</option>
                  <option value="Running">Running</option>
                  <option value="Gym">Gym</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Corte</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["Masculino", "Femenino", "Unisex"].map(c => (
                  <button key={c} onClick={() => setWizard({ ...wizard, corte: c })} style={{ flex: 1, padding: "8px", borderRadius: 8, border: wizard.corte === c ? "2px solid #6c63ff" : "1px solid #ddd", background: wizard.corte === c ? "#f0edff" : "#fff", cursor: "pointer", fontWeight: wizard.corte === c ? 700 : 400, fontSize: 13 }}>{c}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Otros rasgos</label>
              <input type="text" value={wizard.rasgos} onChange={e => setWizard({ ...wizard, rasgos: e.target.value })} placeholder="Ej: Fondo rojo, detalles dorados, lineas blancas..." style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
            </div>

            <button onClick={handleSaveWizard} disabled={savingWizard} style={{ width: "100%", padding: "10px", background: wizardSaved ? "#27ae60" : savingWizard ? "#aaa" : "#6c63ff", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: savingWizard ? "not-allowed" : "pointer" }}>
              {wizardSaved ? "✅ Guardado!" : savingWizard ? "Guardando..." : "Guardar personalizacion"}
            </button>
          </div>
        )}

        {/* Upload section */}
        {(dr.status === "pending_template" || dr.status === "template_uploaded") && (
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#333" }}>📤 Subí tu diseño</h2>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#666" }}>
              Pegá la URL de la imagen con tu diseño. Podés usar servicios gratuitos como <strong>imgBB.com</strong> o <strong>imgur.com</strong>.
            </p>
            <form onSubmit={handleUpload} style={{ display: "flex", gap: 8 }}>
              <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://... (URL de tu imagen)" required style={{ flex: 1, padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, fontSize: 13 }} />
              <button type="submit" disabled={uploading} style={{ padding: "10px 20px", background: "#6c63ff", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1 }}>
                {uploading ? "Subiendo..." : "Subir ✅"}
              </button>
            </form>
          </div>
        )}

        {/* Rendered result */}
        {dr.rendered_image_url && (
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#333" }}>🎨 Tu diseño renderizado</h2>
            <img src={dr.rendered_image_url} alt="Renderizado" style={{ width: "100%", borderRadius: 10, border: "1px solid #eee" }} />
          </div>
        )}

        {/* Production ready */}
        {dr.status === "production_ready" && (
          <div style={{ background: "#e8f5e9", borderRadius: 16, padding: 24, marginBottom: 20, textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🚀</div>
            <h2 style={{ margin: "0 0 8px", color: "#2e7d32", fontSize: 22 }}>¡Listo para producción!</h2>
            <p style={{ margin: 0, color: "#555", fontSize: 14 }}>Tu diseño fue aprobado y pasará a producción.</p>
          </div>
        )}

        {/* Feedback */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#333" }}>💬 Comentarios</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {(dr.feedback ?? []).map(fb => (
              <div key={fb.id} style={{ padding: "10px 14px", borderRadius: 10, background: fb.author === "client" ? "#e8f5e9" : fb.author === "designer" ? "#f3e5f5" : "#e3f2fd", border: `1px solid ${fb.author === "client" ? "#a5d6a7" : fb.author === "designer" ? "#ce93d8" : "#90caf9"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, textTransform: "capitalize" }}>
                    {fb.author === "client" ? "👤 Vos" : fb.author === "designer" ? "🎨 Diseñador" : "🤖 Tienda"}
                  </span>
                  <span style={{ fontSize: 11, color: "#888" }}>{new Date(fb.created_at).toLocaleString("es-AR")}</span>
                </div>
                <div style={{ fontSize: 14 }}>{fb.message}</div>
              </div>
            ))}
            {(!dr.feedback || dr.feedback.length === 0) && (
              <p style={{ color: "#ccc", fontStyle: "italic", margin: 0 }}>Sin comentarios aún</p>
            )}
          </div>
          <form onSubmit={handleFeedback} style={{ display: "flex", gap: 8 }}>
            <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Escribí tu comentario..." rows={2} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, resize: "vertical", fontFamily: "inherit" }} />
            <button type="submit" disabled={sendingFeedback || !feedbackText.trim()} style={{ padding: "10px 18px", background: sendingFeedback ? "#aaa" : "#6c63ff", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, cursor: sendingFeedback ? "not-allowed" : "pointer", fontWeight: 700, alignSelf: "flex-end" }}>
              {sendingFeedback ? "Enviando..." : "Enviar 💬"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 20, padding: "16px", color: "#aaa", fontSize: 12 }}>
          Powered by <strong>Baver</strong>
        </div>
      </div>
    </div>
  );
}
