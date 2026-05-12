"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchJson, postJson, putJson, deleteJson } from "../../lib";

type BudgetItem = {
  id?: number;
  product_id?: number;
  service_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal?: number;
  product_name?: string;
  service_name?: string;
};

type Budget = {
  id: number;
  client_id: number;
  number: string;
  subtotal: number;
  discount: number;
  total: number;
  notes: string;
  status: string;
  valid_until: string;
  created_at: string;
  updated_at: string;
  converted_to_order_id: number | null;
  client_name?: string;
  items?: BudgetItem[];
};

type Contact = {
  id: number;
  name: string;
};

const cardStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  borderRadius: "16px",
  padding: "20px",
  border: "1px solid var(--border-color)",
};

const statusColors: Record<string, string> = {
  pendiente: "#3b82f6",
  aprobado: "#22c55e",
  vencido: "#6b7280",
  convertido: "#a855f7",
};

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  vencido: "Vencido",
  convertido: "Convertido",
};

export default function PresupuestosPage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<Budget | null>(null);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [search, setSearch] = useState("");

  // Form state
  const [formClient, setFormClient] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formDiscount, setFormDiscount] = useState("0");
  const [formItems, setFormItems] = useState<BudgetItem[]>([{ description: "", quantity: 1, unit_price: 0 }]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "todos") params.set("status", statusFilter);
      if (search) params.set("q", search);
      const res = await fetchJson<any>("/budgets?" + params.toString());
      setBudgets(res.budgets || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetchJson<Contact[]>("/contacts?limit=500").then(setContacts).catch(() => {});
  }, []);

  function resetForm() {
    setFormClient("");
    setFormValidUntil("");
    setFormNotes("");
    setFormDiscount("0");
    setFormItems([{ description: "", quantity: 1, unit_price: 0 }]);
    setEditing(null);
  }

  async function handleCreate() {
    if (!formClient) return alert("Seleccioná un cliente");
    if (!formItems.length || !formItems[0].description) return alert("Agregá al menos un item con descripción");

    const body = {
      client_id: Number(formClient),
      notes: formNotes,
      valid_until: formValidUntil || null,
      discount: Number(formDiscount) || 0,
      items: formItems.map(i => ({
        product_id: i.product_id || null,
        service_id: i.service_id || null,
        description: i.description,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
      })),
    };

    try {
      const url = editing ? `/api/budgets/${editing.id}` : "/api/budgets";
      const method = editing ? "PUT" : "POST";
      editing ? await putJson(url.replace("/api", ""), body) : await postJson("/budgets", body);
      setShowModal(false);
      resetForm();
      load();
    } catch (e: any) { alert("Error: " + e.message); }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar presupuesto?")) return;
    try {
      await deleteJson(`/budgets/${id}`);
      load();
    } catch (e: any) { alert("Error: " + e.message); }
  }

  async function handleConvert(id: number) {
    if (!confirm("¿Convertir este presupuesto en Nota de Venta?")) return;
    try {
      const res = await postJson<any>(`/budgets/${id}/convert`, {});
      alert(`Presupuesto convertido a NV ${res.order_number}`);
      load();
    } catch (e: any) { alert("Error: " + e.message); }
  }

  function openDetail(id: number) {
    setDetailId(id);
    setShowDetail(true);
    fetchJson<any>(`/budgets/${id}`).then(setDetailData).catch(() => {});
  }

  function openEdit(b: Budget) {
    setEditing(b);
    setFormClient(String(b.client_id));
    setFormValidUntil(b.valid_until ? b.valid_until.slice(0, 10) : "");
    setFormNotes(b.notes || "");
    setFormDiscount(String(b.discount));
    setFormItems((b.items || []).map(i => ({
      product_id: i.product_id,
      service_id: i.service_id,
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price,
    })));
    setShowModal(true);
  }

  function addItem() {
    setFormItems([...formItems, { description: "", quantity: 1, unit_price: 0 }]);
  }

  function removeItem(idx: number) {
    if (formItems.length <= 1) return;
    setFormItems(formItems.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof BudgetItem, value: any) {
    const updated = [...formItems];
    (updated[idx] as any)[field] = value;
    setFormItems(updated);
  }

  function calcSubtotal(items: BudgetItem[]) {
    return items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  }

  const itemsSubtotal = calcSubtotal(formItems);
  const itemsTotal = Math.max(0, itemsSubtotal - Number(formDiscount || 0));

  const formatMoney = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>Cargando...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>Presupuestos</h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "6px 0 0" }}>Cotizaciones para clientes</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={() => router.push("/presupuestos/diseno")}
            style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "8px 14px", cursor: "pointer", color: "var(--text-primary)", fontSize: "13px" }}>
            🎨 Diseño PDF
          </button>
          <button onClick={() => { resetForm(); setShowModal(true); }}
            style={{ background: "var(--accent)", border: "none", borderRadius: "10px", padding: "8px 16px", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>
            + Nuevo Presupuesto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "6px", background: "var(--bg-secondary)", borderRadius: "10px", padding: "4px", border: "1px solid var(--border-color)" }}>
          {["todos", "pendiente", "aprobado", "vencido", "convertido"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{
                padding: "6px 14px", borderRadius: "8px", border: "none", cursor: "pointer",
                background: statusFilter === s ? "var(--accent)" : "transparent",
                color: statusFilter === s ? "#fff" : "var(--text-secondary)",
                fontSize: "12px", fontWeight: 600, transition: "all 0.15s",
              }}>
              {statusLabels[s] || s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por número o cliente..."
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "8px 14px", color: "var(--text-primary)", fontSize: "13px", flex: 1, minWidth: "200px" }} />
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "700px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>NÚMERO</th>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>CLIENTE</th>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>FECHA</th>
              <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>TOTAL</th>
              <th style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-secondary)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>ESTADO</th>
              <th style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-secondary)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>VENCE</th>
              <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map(b => (
              <tr key={b.id} style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-input)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px", fontWeight: 700, color: "var(--text-primary)", cursor: "pointer" }} onClick={() => openDetail(b.id)}>{b.number}</td>
                <td style={{ padding: "12px", color: "var(--text-primary)" }}>{b.client_name || "—"}</td>
                <td style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "12px" }}>{new Date(b.created_at).toLocaleDateString("es-AR")}</td>
                <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>{formatMoney(b.total)}</td>
                <td style={{ padding: "12px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: (statusColors[b.status] || "#888") + "22", color: statusColors[b.status] || "#888" }}>
                    {statusLabels[b.status] || b.status}
                  </span>
                </td>
                <td style={{ padding: "12px", textAlign: "center", color: "var(--text-secondary)", fontSize: "12px" }}>
                  {b.valid_until ? new Date(b.valid_until).toLocaleDateString("es-AR") : "—"}
                </td>
                <td style={{ padding: "12px", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                    <button onClick={() => openDetail(b.id)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "12px", color: "var(--text-primary)" }}>👁</button>
                    {b.status === "pendiente" && (
                      <>
                        <button onClick={() => openEdit(b)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "12px", color: "var(--text-primary)" }}>✏️</button>
                        <button onClick={() => handleConvert(b.id)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "12px", color: "var(--text-primary)" }}>📄</button>
                        <button onClick={() => handleDelete(b.id)} style={{ background: "none", border: "1px solid #ef4444", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "12px", color: "#ef4444" }}>🗑</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {budgets.length === 0 && (
              <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>No hay presupuestos aún</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: "var(--bg-secondary)", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "640px", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>
              {editing ? "Editar Presupuesto" : "Nuevo Presupuesto"}
            </h3>

            {/* Client selector */}
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 4px", display: "block" }}>Cliente *</label>
              <select value={formClient} onChange={e => setFormClient(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "13px" }}>
                <option value="">Seleccionar cliente...</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Validity + Discount */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 4px", display: "block" }}>Válido hasta</label>
                <input type="date" value={formValidUntil} onChange={e => setFormValidUntil(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 4px", display: "block" }}>Descuento ($)</label>
                <input type="number" value={formDiscount} onChange={e => setFormDiscount(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 4px", display: "block" }}>Notas</label>
              <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Condiciones, observaciones..."
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "13px", minHeight: "50px", resize: "vertical" }} />
            </div>

            {/* Items */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)" }}>Items</label>
                <button onClick={addItem} style={{ background: "var(--accent)", border: "none", borderRadius: "6px", padding: "4px 10px", color: "#fff", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}>+ Agregar</button>
              </div>
              {formItems.map((item, idx) => (
                <div key={idx} style={{ display: "flex", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
                  <input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Descripción"
                    style={{ flex: 2, padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "12px" }} />
                  <input type="number" value={item.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)} placeholder="Cant"
                    style={{ width: "60px", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "12px", textAlign: "right" }} />
                  <input type="number" value={item.unit_price} onChange={e => updateItem(idx, "unit_price", e.target.value)} placeholder="Precio"
                    style={{ width: "80px", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "12px", textAlign: "right" }} />
                  <span style={{ width: "70px", textAlign: "right", fontSize: "12px", color: "var(--text-primary)", fontWeight: 600 }}>
                    {formatMoney(Number(item.quantity) * Number(item.unit_price))}
                  </span>
                  <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#ef4444", padding: "4px" }}>✕</button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px", marginBottom: "16px", textAlign: "right" }}>
              <p style={{ margin: "2px 0", fontSize: "13px", color: "var(--text-secondary)" }}>Subtotal: {formatMoney(itemsSubtotal)}</p>
              {Number(formDiscount) > 0 && <p style={{ margin: "2px 0", fontSize: "13px", color: "#ef4444" }}>Descuento: -{formatMoney(Number(formDiscount))}</p>}
              <p style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800, color: "var(--accent)" }}>Total: {formatMoney(itemsTotal)}</p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => { setShowModal(false); resetForm(); }}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "transparent", cursor: "pointer", color: "var(--text-primary)", fontSize: "13px" }}>Cancelar</button>
              <button onClick={handleCreate}
                style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>
                {editing ? "Guardar cambios" : "Crear Presupuesto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && detailData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => e.target === e.currentTarget && setShowDetail(false)}>
          <div style={{ background: "var(--bg-secondary)", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "560px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>{detailData.number}</h3>
                <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, marginTop: "4px", background: (statusColors[detailData.status] || "#888") + "22", color: statusColors[detailData.status] || "#888" }}>
                  {statusLabels[detailData.status] || detailData.status}
                </span>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                {detailData.status === "pendiente" && (
                  <>
                    <button onClick={() => { setShowDetail(false); openEdit(detailData); }}
                      style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "12px", color: "var(--text-primary)" }}>✏️</button>
                    <button onClick={() => { setShowDetail(false); handleConvert(detailData.id); }}
                      style={{ background: "var(--accent)", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", color: "#fff", fontSize: "12px", fontWeight: 600 }}>Convertir a NV</button>
                  </>
                )}
                <a href={`/api/budgets/${detailData.id}/pdf`} target="_blank"
                  style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "12px", color: "var(--text-primary)", textDecoration: "none" }}>📄 PDF</a>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ margin: "2px 0", fontSize: "13px", color: "var(--text-primary)" }}><strong>Cliente:</strong> {detailData.client_name || "—"}</p>
              <p style={{ margin: "2px 0", fontSize: "13px", color: "var(--text-primary)" }}><strong>Fecha:</strong> {new Date(detailData.created_at).toLocaleDateString("es-AR")}</p>
              {detailData.valid_until && <p style={{ margin: "2px 0", fontSize: "13px", color: "var(--text-primary)" }}><strong>Válido hasta:</strong> {new Date(detailData.valid_until).toLocaleDateString("es-AR")}</p>}
              {detailData.notes && <p style={{ margin: "2px 0", fontSize: "13px", color: "var(--text-primary)" }}><strong>Notas:</strong> {detailData.notes}</p>}
              {detailData.converted_to_order_id && <p style={{ margin: "2px 0", fontSize: "13px", color: "#a855f7" }}><strong>Convertido a NV #{detailData.converted_to_order_id}</strong></p>}
            </div>

            {/* Items */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "8px" }}>ITEMS</p>
              {(detailData.items || []).map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <div>
                    <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>{item.product_name || item.service_name || item.description}</span>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginLeft: "6px" }}>x{Number(item.quantity).toFixed(2)}</span>
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{formatMoney(Number(item.subtotal || Number(item.quantity) * Number(item.unit_price)))}</span>
                </div>
              ))}
              <div style={{ borderTop: "2px solid var(--border-color)", marginTop: "8px", paddingTop: "8px", textAlign: "right" }}>
                <p style={{ margin: "2px 0", fontSize: "13px", color: "var(--text-secondary)" }}>Subtotal: {formatMoney(detailData.subtotal)}</p>
                {detailData.discount > 0 && <p style={{ margin: "2px 0", fontSize: "13px", color: "#ef4444" }}>Descuento: -{formatMoney(detailData.discount)}</p>}
                <p style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800, color: "var(--accent)" }}>Total: {formatMoney(detailData.total)}</p>
              </div>
            </div>

            <button onClick={() => setShowDetail(false)}
              style={{ width: "100%", marginTop: "16px", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "transparent", cursor: "pointer", color: "var(--text-primary)", fontSize: "13px" }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
