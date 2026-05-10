"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Plan = {
  id: number; name: string; description: string; billing_cycle: string; amount: string;
  is_active: boolean; requires_contract: boolean; sort_order: number;
};

type Subscription = {
  id: number; contact_id: number; plan_id: number; start_date: string; status: string;
  next_billing_date: string; billing_amount: string; notes: string;
  contact_name: string; contact_phone: string; plan_name: string; billing_cycle: string;
};

type Contact = { id: number; name: string };

const CYCLE_LABELS: Record<string, string> = {
  weekly: "Semanal", biweekly: "Quincenal", monthly: "Mensual",
  quarterly: "Trimestral", semiannual: "Semestral", annual: "Anual",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#27ae60", suspended: "#f39c12", cancelled: "#e74c3c", expired: "#95a5a6",
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function postJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function putJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const btnPrimary: React.CSSProperties = {
  padding: "8px 16px", borderRadius: "10px", border: "none", background: "#6c63ff",
  color: "#fff", fontWeight: 600, fontSize: "13px", cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  padding: "8px 16px", borderRadius: "10px", border: "1px solid #e0e0e0",
  background: "transparent", fontWeight: 600, fontSize: "13px", cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #e0e0e0",
  fontSize: "14px", background: "#fff", boxSizing: "border-box", marginBottom: "8px",
};

export default function SuscripcionesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"plans" | "subscriptions">("subscriptions");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Plan form
  const [planForm, setPlanForm] = useState({ name: "", description: "", billing_cycle: "monthly", amount: "", requires_contract: false, sort_order: 0 });
  const [editPlanId, setEditPlanId] = useState<number | null>(null);

  // Sub form
  const [subForm, setSubForm] = useState({ contact_id: "", plan_id: "", start_date: "", billing_amount: "", notes: "" });
  const [editSubId, setEditSubId] = useState<number | null>(null);

  // Overview
  const [overview, setOverview] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s, c, ov] = await Promise.all([
        fetchJson<Plan[]>("/api/plans"),
        fetchJson<Subscription[]>("/api/subscriptions"),
        fetchJson<Contact[]>("/api/contacts?limit=500"),
        fetchJson<any>("/api/billing/overview").catch(() => null),
      ]);
      setPlans(p);
      setSubs(s);
      setContacts(c);
      setOverview(ov);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function savePlan() {
    setSaving(true);
    try {
      const body = { ...planForm, amount: Number(planForm.amount), sort_order: Number(planForm.sort_order) };
      if (editPlanId) {
        await putJson("/api/plans/" + editPlanId, body);
      } else {
        await postJson("/api/plans", body);
      }
      setShowPlanModal(false);
      await load();
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function deletePlan(id: number) {
    if (!confirm("Eliminar plan?")) return;
    try {
      await fetch("/api/plans/" + id, { method: "DELETE" });
      await load();
    } catch (e) { console.error(e); }
  }

  async function saveSub() {
    setSaving(true);
    try {
      const body = {
        contact_id: Number(subForm.contact_id),
        plan_id: Number(subForm.plan_id),
        start_date: subForm.start_date || new Date().toISOString().split("T")[0],
        billing_amount: Number(subForm.billing_amount) || undefined,
        notes: subForm.notes || undefined,
      };
      if (editSubId) {
        await putJson("/api/subscriptions/" + editSubId, { plan_id: body.plan_id, billing_amount: body.billing_amount, notes: body.notes });
      } else {
        await postJson("/api/subscriptions", body);
      }
      setShowSubModal(false);
      await load();
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function cancelSub(id: number) {
    if (!confirm("Cancelar suscripción?")) return;
    try {
      await fetch("/api/subscriptions/" + id, { method: "DELETE" });
      await load();
    } catch (e) { console.error(e); }
  }

  async function generateCycle(subId: number) {
    try {
      await postJson("/api/subscriptions/" + subId + "/generate-cycle", {});
      await load();
    } catch (e) { console.error(e); }
  }

  function openPlanForm(plan?: Plan) {
    if (plan) {
      setPlanForm({
        name: plan.name, description: plan.description, billing_cycle: plan.billing_cycle,
        amount: plan.amount, requires_contract: plan.requires_contract, sort_order: plan.sort_order,
      });
      setEditPlanId(plan.id);
    } else {
      setPlanForm({ name: "", description: "", billing_cycle: "monthly", amount: "", requires_contract: false, sort_order: 0 });
      setEditPlanId(null);
    }
    setShowPlanModal(true);
  }

  function openSubForm(sub?: Subscription) {
    if (sub) {
      setSubForm({
        contact_id: String(sub.contact_id), plan_id: String(sub.plan_id),
        start_date: sub.start_date ? sub.start_date.split("T")[0] : "",
        billing_amount: sub.billing_amount, notes: sub.notes || "",
      });
      setEditSubId(sub.id);
    } else {
      setSubForm({ contact_id: "", plan_id: "", start_date: new Date().toISOString().split("T")[0], billing_amount: "", notes: "" });
      setEditSubId(null);
    }
    setShowSubModal(true);
  }

  const containerStyle: React.CSSProperties = { padding: "24px", maxWidth: "1200px", margin: "0 auto" };
  const cardStyle: React.CSSProperties = {
    background: "#fff", borderRadius: "16px", padding: "20px 24px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: "16px",
  };

  if (loading) return <div style={containerStyle}><p>Cargando...</p></div>;

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "22px" }}>Suscripciones</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <button style={btnSecondary} onClick={() => setTab(tab === "plans" ? "subscriptions" : "plans")}>
            {tab === "plans" ? "📋 Ver suscripciones" : "📦 Ver planes"}
          </button>
        </div>
      </div>

      {/* Overview cards */}
      {overview && (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
          <div style={{ ...cardStyle, flex: "1", minWidth: "140px", textAlign: "center", padding: "16px" }}>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>{overview.active_subscriptions}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>Suscripciones activas</div>
          </div>
          <div style={{ ...cardStyle, flex: "1", minWidth: "140px", textAlign: "center", padding: "16px" }}>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#e74c3c" }}>${Number(overview.overdue_total).toLocaleString("es-AR", {minimumFractionDigits:2})}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>Vencido ({overview.overdue_cycles} ciclos)</div>
          </div>
          <div style={{ ...cardStyle, flex: "1", minWidth: "140px", textAlign: "center", padding: "16px" }}>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#f39c12" }}>${Number(overview.upcoming_total).toLocaleString("es-AR", {minimumFractionDigits:2})}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>Próximos 30 días ({overview.upcoming_cycles})</div>
          </div>
          <div style={{ ...cardStyle, flex: "1", minWidth: "140px", textAlign: "center", padding: "16px" }}>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#27ae60" }}>${Number(overview.monthly_revenue).toLocaleString("es-AR", {minimumFractionDigits:2})}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>Cobrado (30 días)</div>
          </div>
        </div>
      )}

      {tab === "plans" && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "16px" }}>Planes / Servicios</h2>
            <button style={btnPrimary} onClick={() => openPlanForm()}>+ Nuevo plan</button>
          </div>

          {plans.length === 0 ? (
            <p style={{ color: "#999" }}>No hay planes creados. Creá el primero.</p>
          ) : (
            <div>
              {plans.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid #f1f1f1" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>{p.description}</div>
                  </div>
                  <div style={{ fontSize: "13px", color: "#666", minWidth: "80px", textAlign: "right" }}>${Number(p.amount).toLocaleString("es-AR", {minimumFractionDigits:2})}</div>
                  <div style={{ fontSize: "12px", background: "#f0f0f0", padding: "2px 8px", borderRadius: "6px" }}>
                    {CYCLE_LABELS[p.billing_cycle] || p.billing_cycle}
                  </div>
                  <button style={{ ...btnSecondary, padding: "4px 10px" }} onClick={() => openPlanForm(p)}>✏️</button>
                  <button style={{ ...btnSecondary, padding: "4px 10px", color: "#e74c3c" }} onClick={() => deletePlan(p.id)}>🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "subscriptions" && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "16px" }}>Suscripciones activas</h2>
            <button style={btnPrimary} onClick={() => openSubForm()}>+ Nueva suscripción</button>
          </div>

          {subs.length === 0 ? (
            <p style={{ color: "#999" }}>No hay suscripciones activas.</p>
          ) : (
            <div>
              {subs.map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid #f1f1f1" }}>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => router.push("/contactos/" + s.contact_id)}>
                    <div style={{ fontWeight: 600 }}>{s.contact_name}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>{s.plan_name} · {CYCLE_LABELS[s.billing_cycle] || s.billing_cycle}</div>
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 600 }}>${Number(s.billing_amount).toLocaleString("es-AR", {minimumFractionDigits:2})}</div>
                  <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: (STATUS_COLORS[s.status] || "#999") + "22", color: STATUS_COLORS[s.status] || "#999" }}>
                    {s.status}
                  </span>
                  <div style={{ fontSize: "11px", color: "#999" }}>Próx: {new Date(s.next_billing_date).toLocaleDateString("es-AR")}</div>
                  <button style={{ ...btnSecondary, padding: "4px 10px" }} onClick={() => generateCycle(s.id)} title="Generar próximo ciclo">🔄</button>
                  {s.status === "active" && (
                    <button style={{ ...btnSecondary, padding: "4px 10px", color: "#e74c3c" }} onClick={() => cancelSub(s.id)}>✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PLAN MODAL ── */}
      {showPlanModal && (
        <div onClick={() => setShowPlanModal(false)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", zIndex:1000}}>
          <div onClick={e => e.stopPropagation()} style={{background:"#fff", borderRadius:"18px", padding:"24px", width:"100%", maxWidth:"420px"}}>
            <h3 style={{margin:"0 0 16px", fontSize:"18px"}}>{editPlanId ? "Editar plan" : "Nuevo plan"}</h3>

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Nombre *</div>
            <input value={planForm.name} onChange={e => setPlanForm(f => ({...f, name: e.target.value}))} style={inputStyle} placeholder="Ej: Plan Básico" />

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Descripción</div>
            <textarea value={planForm.description} onChange={e => setPlanForm(f => ({...f, description: e.target.value}))} style={{...inputStyle, minHeight:"60px", resize:"vertical"}} placeholder="¿Qué incluye?" />

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Ciclo de facturación</div>
            <select value={planForm.billing_cycle} onChange={e => setPlanForm(f => ({...f, billing_cycle: e.target.value}))} style={inputStyle}>
              {Object.entries(CYCLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Monto *</div>
            <input type="number" value={planForm.amount} min="0" step="0.01" onChange={e => setPlanForm(f => ({...f, amount: e.target.value}))} style={inputStyle} />

            <label style={{display:"flex", alignItems:"center", gap:"8px", fontSize:"13px", marginBottom:"8px"}}>
              <input type="checkbox" checked={planForm.requires_contract} onChange={e => setPlanForm(f => ({...f, requires_contract: e.target.checked}))} />
              Requiere contrato
            </label>

            <div style={{display:"flex", gap:"8px", justifyContent:"flex-end", marginTop:"16px"}}>
              <button onClick={() => setShowPlanModal(false)} style={btnSecondary}>Cancelar</button>
              <button onClick={savePlan} disabled={!planForm.name || !planForm.amount || saving} style={btnPrimary}>
                {saving ? "..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBSCRIPTION MODAL ── */}
      {showSubModal && (
        <div onClick={() => setShowSubModal(false)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", zIndex:1000}}>
          <div onClick={e => e.stopPropagation()} style={{background:"#fff", borderRadius:"18px", padding:"24px", width:"100%", maxWidth:"420px"}}>
            <h3 style={{margin:"0 0 16px", fontSize:"18px"}}>{editSubId ? "Editar suscripción" : "Nueva suscripción"}</h3>

            {!editSubId && (
              <>
                <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Contacto *</div>
                <select value={subForm.contact_id} onChange={e => setSubForm(f => ({...f, contact_id: e.target.value}))} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </>
            )}

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Plan *</div>
            <select value={subForm.plan_id} onChange={e => setSubForm(f => ({...f, plan_id: e.target.value}))} style={inputStyle}>
              <option value="">Seleccionar...</option>
              {plans.filter(p => p.is_active).map(p => (
                <option key={p.id} value={p.id}>{p.name} - ${Number(p.amount).toLocaleString("es-AR", {minimumFractionDigits:2})} ({CYCLE_LABELS[p.billing_cycle]})</option>
              ))}
            </select>

            {!editSubId && (
              <>
                <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Fecha de inicio</div>
                <input type="date" value={subForm.start_date} onChange={e => setSubForm(f => ({...f, start_date: e.target.value}))} style={inputStyle} />

                <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Monto (opcional, usa el del plan por defecto)</div>
                <input type="number" value={subForm.billing_amount} min="0" step="0.01" onChange={e => setSubForm(f => ({...f, billing_amount: e.target.value}))} style={inputStyle} />
              </>
            )}

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Notas</div>
            <textarea value={subForm.notes} onChange={e => setSubForm(f => ({...f, notes: e.target.value}))} style={{...inputStyle, minHeight:"60px", resize:"vertical"}} />

            <div style={{display:"flex", gap:"8px", justifyContent:"flex-end", marginTop:"16px"}}>
              <button onClick={() => setShowSubModal(false)} style={btnSecondary}>Cancelar</button>
              <button onClick={saveSub} disabled={!subForm.contact_id || !subForm.plan_id || saving} style={btnPrimary}>
                {saving ? "..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
