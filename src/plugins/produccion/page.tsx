"use client";
import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "/baver/api";

interface StageItem {
  id: number; stage_name: string; sort_order: number;
  product_name: string; quantity: number; order_number: string;
  client_name: string; status: string; assigned_to: string | null;
  started_at: string; notes: string | null;
  order_id: number; order_item_id: number;
}

interface Stage {
  id: number; name: string; sort_order: number;
  items: StageItem[];
}

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { "Content-Type": "application/json", "Authorization": "Bearer " + token };
}

export default function ProduccionPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [allItems, setAllItems] = useState<StageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<StageItem | null>(null);
  const [noteText, setNoteText] = useState("");
  const [assignText, setAssignText] = useState("");

  const loadPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API + "/plugins/produccion/pipeline", { headers: authHeaders() });
      if (!res.ok) throw new Error("Error " + res.status);
      const data = await res.json();
      setStages(data.stages || []);
      setAllItems(data.all_items || []);
    } catch (e: any) { console.error(e); alert("Error cargando pipeline"); }
    setLoading(false);
  }, []);

  useEffect(() => { loadPipeline(); }, [loadPipeline]);

  async function advance(itemId: number) {
    if (!confirm("Avanzar al siguiente stage?")) return;
    try {
      const res = await fetch(API + "/plugins/produccion/advance/" + itemId, {
        method: "PATCH", headers: authHeaders(),
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      loadPipeline();
    } catch (e: any) { alert("Error: " + e.message); }
  }

  async function rollback(itemId: number) {
    if (!confirm("Retroceder al stage anterior?")) return;
    try {
      const res = await fetch(API + "/plugins/produccion/rollback/" + itemId, {
        method: "PATCH", headers: authHeaders(),
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      loadPipeline();
    } catch (e: any) { alert("Error: " + e.message); }
  }

  async function toggleBlock(item: StageItem) {
    if (item.status === "blocked") {
      await fetch(API + "/plugins/produccion/unblock/" + item.id, { method: "PATCH", headers: authHeaders() });
    } else {
      const reason = prompt("Motivo del bloqueo:");
      if (!reason) return;
      await fetch(API + "/plugins/produccion/block/" + item.id, {
        method: "PATCH", headers: authHeaders(),
        body: JSON.stringify({ notes: reason }),
      });
    }
    loadPipeline();
  }

  async function saveItem(itemId: number) {
    const body: any = {};
    if (noteText) body.notes = noteText;
    if (assignText) body.assigned_to = assignText;
    if (!Object.keys(body).length) return;
    await fetch(API + "/plugins/produccion/item/" + itemId, {
      method: "PATCH", headers: authHeaders(),
      body: JSON.stringify(body),
    });
    setNoteText("");
    setAssignText("");
    loadPipeline();
  }

  function statusColor(status: string) {
    switch (status) {
      case "completed": return "#2ecc71";
      case "blocked": return "#e74c3c";
      case "in_progress": return "#3498db";
      default: return "#95a5a6";
    }
  }

  function timeInStage(started: string) {
    const diff = Date.now() - new Date(started).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return hours + "h";
    return Math.floor(hours / 24) + "d " + (hours % 24) + "h";
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Producción</h1>
        <button onClick={loadPipeline} style={{ padding: "8px 16px", background: "#6c63ff", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
          Refrescar
        </button>
      </div>

      {loading ? <p>Cargando...</p> : (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", minHeight: "60vh" }}>
          {stages.map(stage => (
            <div key={stage.id} style={{
              minWidth: 260, maxWidth: 300, flex: 1,
              background: "#f5f5f5", borderRadius: 12, padding: 12,
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: "#555" }}>
                {stage.name}
                <span style={{ marginLeft: 8, fontSize: 12, color: "#999" }}>({stage.items.length})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stage.items.length === 0 && (
                  <div style={{ fontSize: 12, color: "#bbb", textAlign: "center", padding: 20 }}>
                    Vacío
                  </div>
                )}
                {stage.items.map(item => (
                  <div key={item.id} onClick={() => { setSelectedItem(item); setNoteText(""); setAssignText(item.assigned_to || ""); }}
                    style={{
                      padding: 10, borderRadius: 8, cursor: "pointer",
                      background: "#fff", border: item.notes ? "2px solid #f39c12" : "2px solid transparent",
                      borderLeft: "4px solid " + statusColor(item.status), fontSize: 13,
                      opacity: item.status === "completed" ? 0.7 : 1,
                    }}>
                    <div style={{ fontWeight: 700 }}>{item.product_name}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>NV #{item.order_number}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{item.client_name}</div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>x{item.quantity}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: statusColor(item.status), fontWeight: 700 }}>
                        {item.status === "completed" ? "Listo" : item.status === "blocked" ? "Bloqueado" : item.status === "in_progress" ? "En curso" : "Pendiente"}
                      </span>
                      <span style={{ fontSize: 10, color: "#aaa" }}>{timeInStage(item.started_at)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                      {item.status !== "completed" && stage.sort_order < 5 && (
                        <button onClick={(e) => { e.stopPropagation(); advance(item.id); }}
                          style={{ flex: 1, padding: "3px 0", fontSize: 11, background: "#6c63ff", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                          Avanzar
                        </button>
                      )}
                      {stage.sort_order > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); rollback(item.id); }}
                          style={{ padding: "3px 6px", fontSize: 11, background: "#f0f0f0", color: "#555", border: "none", borderRadius: 4, cursor: "pointer" }}>
                          ↩
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); toggleBlock(item); }}
                        style={{ padding: "3px 6px", fontSize: 11,
                          background: item.status === "blocked" ? "#2ecc71" : "#e74c3c",
                          color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                        {item.status === "blocked" ? "↻" : "⚠"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000,
        }} onClick={() => setSelectedItem(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#fff", borderRadius: 12, padding: 24, maxWidth: 500, width: "90%",
          }}>
            <h3 style={{ margin: "0 0 12px" }}>{selectedItem.product_name}</h3>
            <div style={{ fontSize: 13, lineHeight: 1.8 }}>
              <div><strong>NV:</strong> #{selectedItem.order_number}</div>
              <div><strong>Cliente:</strong> {selectedItem.client_name}</div>
              <div><strong>Cantidad:</strong> {selectedItem.quantity}</div>
              <div><strong>Stage:</strong> {selectedItem.stage_name}</div>
              <div><strong>Estado:</strong> {selectedItem.status}</div>
              <div><strong>Iniciado:</strong> {new Date(selectedItem.started_at).toLocaleString()}</div>
              {selectedItem.assigned_to && <div><strong>Responsable:</strong> {selectedItem.assigned_to}</div>}
              {selectedItem.notes && <div><strong>Notas:</strong><br/>{selectedItem.notes}</div>}
            </div>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={assignText} onChange={e => setAssignText(e.target.value)}
                placeholder="Responsable..." style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} />
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="Notas..." style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, minHeight: 60 }} />
              <button onClick={() => saveItem(selectedItem.id)}
                style={{ padding: "8px 16px", background: "#6c63ff", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
                Guardar
              </button>
            </div>
            <button onClick={() => setSelectedItem(null)} style={{ marginTop: 12, padding: "8px 16px", background: "#f0f0f0", border: "none", borderRadius: 8, cursor: "pointer" }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
