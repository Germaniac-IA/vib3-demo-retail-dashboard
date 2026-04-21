"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchJson, postJson, putJson, deleteJson } from "../../lib";
import { Card, IconButton, Input, PageTitle, Loading, Empty } from "../../components/shared/UI";
import StatsCards from "../../components/shared/StatsCards";

type CondicionIva = { value: string; label: string };

type Contact = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  location: string;
  notes: string;
  whatsapp: string;
  instagram: string;
  tiktok: string;
  condicion_iva: string;
  cuit: string;
  condicion_iibb: string;
  calificacion: number;
  deleted_at: string | null;
};

type SortField = "name" | "phone" | "email" | "location" | "condicion_iva" | "calificacion";

export default function ContactosPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [period, setPeriod] = useState<"today"|"week"|"month">("today");
  const [editing, setEditing] = useState<Contact | null>(null);
  const [condicionesIva, setCondicionesIva] = useState<CondicionIva[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [form, setForm] = useState({
    name: "", phone: "", email: "", address: "", location: "", notes: "",
    whatsapp: "", instagram: "", tiktok: "",
    condicion_iva: "", cuit: "", condicion_iibb: "", calificacion: 5,
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isTiny, setIsTiny] = useState(false);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 900);
      setIsTiny(window.innerWidth < 500);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function loadContacts() {
    fetchJson<Contact[]>("/contacts").then(setContacts).catch(console.error);
  }

  useEffect(() => {
    Promise.all([
      fetchJson<Contact[]>("/contacts"),
      fetchJson<CondicionIva[]>("/condiciones-iva"),
    ]).then(([c, iva]) => {
      setContacts(c);
      setCondicionesIva(iva);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function openNew() {
    setEditing(null);
    setForm({
      name: "", phone: "", email: "", address: "", location: "", notes: "",
      whatsapp: "", instagram: "", tiktok: "", condicion_iva: "", cuit: "", condicion_iibb: "", calificacion: 5,
    });
    setShowForm(true);
  }

  function openEdit(c: Contact) {
    setEditing(c);
    setForm({
      name: c.name || "", phone: c.phone || "", email: c.email || "", address: c.address || "", location: c.location || "",
      notes: c.notes || "", whatsapp: c.whatsapp || "", instagram: c.instagram || "", tiktok: c.tiktok || "",
      condicion_iva: c.condicion_iva || "", cuit: c.cuit || "", condicion_iibb: c.condicion_iibb || "", calificacion: c.calificacion || 5,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name && !form.phone) return;
    try {
      if (editing) {
        await putJson(`/contacts/${editing.id}`, form);
      } else {
        await postJson("/contacts", form);
      }
      setShowForm(false);
      loadContacts();
    } catch (e) { console.error(e); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Eliminar contacto?")) return;
    try {
      await deleteJson(`/contacts/${id}`);
      loadContacts();
    } catch (e) { console.error(e); }
  }

  const isConsumidorFinal = form.condicion_iva === "consumidor_final";

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = !q ? contacts : contacts.filter((c) => (
      (c.name || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.whatsapp || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.location || "").toLowerCase().includes(q) ||
      (c.address || "").toLowerCase().includes(q) ||
      (c.instagram || "").toLowerCase().includes(q) ||
      (c.tiktok || "").toLowerCase().includes(q) ||
      (c.cuit || "").toLowerCase().includes(q) ||
      (c.condicion_iibb || "").toLowerCase().includes(q) ||
      (condicionesIva.find(x => x.value === c.condicion_iva)?.label || c.condicion_iva || "").toLowerCase().includes(q)
    ));

    return [...base].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = (a.name || "").localeCompare(b.name || "");
      else if (sortField === "phone") cmp = (a.phone || a.whatsapp || "").localeCompare(b.phone || b.whatsapp || "");
      else if (sortField === "email") cmp = (a.email || "").localeCompare(b.email || "");
      else if (sortField === "location") cmp = (a.location || "").localeCompare(b.location || "");
      else if (sortField === "condicion_iva") cmp = (condicionesIva.find(x => x.value === a.condicion_iva)?.label || a.condicion_iva || "").localeCompare(condicionesIva.find(x => x.value === b.condicion_iva)?.label || b.condicion_iva || "");
      else if (sortField === "calificacion") cmp = (Number(a.calificacion) || 0) - (Number(b.calificacion) || 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [contacts, search, sortField, sortDir, condicionesIva]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function sortLabel(field: SortField, label: string) {
    return `${label}${sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : ""}`;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <PageTitle>👥 Contactos</PageTitle>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <IconButton variant={viewMode === "cards" ? "primary" : "ghost"} title="Vista tarjetas" onClick={() => setViewMode("cards")}>▦</IconButton>
            <IconButton variant={viewMode === "list" ? "primary" : "ghost"} title="Vista lista" onClick={() => setViewMode("list")}>☰</IconButton>
          </div>
          <IconButton variant="primary" onClick={openNew}>+</IconButton>
        </div>
      </div>

      <Card style={{ marginBottom: "16px" }}>
        <Input label="Buscar contacto" value={search} onChange={setSearch} placeholder="Nombre, teléfono, WhatsApp, email, localidad, CUIT..." />
      </Card>

      {showForm && (
        <div onClick={() => setShowForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "center", padding: isMobile ? "12px" : "24px", paddingTop: isMobile ? "16px" : "24px", zIndex: 1000, overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(1100px, 100%)", maxHeight: isMobile ? "none" : "92vh", overflow: "auto", background: "#fff", borderRadius: isMobile ? "16px" : "18px", padding: isMobile ? "16px" : "22px", boxShadow: "0 24px 70px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", marginBottom: "16px", gap: "12px", flexDirection: isMobile ? "column" : "row" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>{editing ? "Editar contacto" : "Nuevo contacto"}</h3>
              {editing && (
                <button onClick={() => { handleDelete(editing.id); setShowForm(false); }}
                  style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
                  🗑️ Eliminar
                </button>
              )}
            </div>
          <div style={{ display: "grid", gridTemplateColumns: isTiny ? "1fr" : "1fr 1fr", gap: "12px" }}>
            <Input label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Input label="Teléfono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Input label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} />
            <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Input label="Instagram" value={form.instagram} onChange={(v) => setForm({ ...form, instagram: v })} />
            <Input label="TikTok" value={form.tiktok} onChange={(v) => setForm({ ...form, tiktok: v })} />
            <Input label="Dirección" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
            <Input label="Localidad" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
          </div>

          <div style={{ marginTop: "16px", padding: "12px", background: "#f8f8f8", borderRadius: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: isTiny ? "1fr" : "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>Condición IVA</label>
                <select value={form.condicion_iva} onChange={(e) => setForm({ ...form, condicion_iva: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px" }}>
                  <option value="">Sin asignar</option>
                  {condicionesIva.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <Input label="CUIL/CUIT" value={form.cuit} onChange={(v) => setForm({ ...form, cuit: v })} />
              <Input label="Condición IIBB" value={form.condicion_iibb} onChange={(v) => setForm({ ...form, condicion_iibb: v })} />
              {!isConsumidorFinal && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", padding: "8px", background: "#fff3cd", borderRadius: "8px", border: "1px solid #ffc107" }}>
                  <span style={{ fontSize: "12px" }}>⚠️ Estos campos son obligatorios para responsable inscripto</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>
              Calificación: {form.calificacion}/10
            </label>
            <input type="range" min="1" max="10" value={form.calificacion}
              onChange={(e) => setForm({ ...form, calificacion: parseInt(e.target.value) })}
              style={{ width: "100%", accentColor: "#6c63ff" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#888", marginTop: "2px" }}>
              <span>1 - Bajo</span>
              <span>10 - Alto</span>
            </div>
          </div>

          <div style={{ marginTop: "12px" }}>
            <Input label="Notas" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          </div>

          <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
            <IconButton variant="primary" onClick={handleSave}>✓</IconButton>
            <IconButton variant="secondary" onClick={() => setShowForm(false)}>✕</IconButton>
          </div>
          </div>
        </div>
      )}

      {loading ? <Loading /> : filteredContacts.length === 0 ? (
        <Empty message="Sin contactos" />
      ) : viewMode === "cards" ? (
        <div style={{ display: "grid", gap: "10px" }}>
          {filteredContacts.map((c) => (
            <Card key={c.id} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }} onClick={() => openEdit(c)}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 700, fontSize: "15px" }}>{c.name || "Sin nombre"}</span>
                    {c.calificacion > 0 && (
                      <span style={{ fontSize: "11px", background: c.calificacion >= 7 ? "#27ae6022" : c.calificacion >= 4 ? "#f39c1215" : "#e74c3c22", color: c.calificacion >= 7 ? "#27ae60" : c.calificacion >= 4 ? "#f39c12" : "#e74c3c", padding: "2px 6px", borderRadius: "8px" }}>
                        ★ {c.calificacion}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px", color: "#666" }}>
                    {c.phone && <span>📞 {c.phone}</span>}
                    {c.whatsapp && <span>💬 {c.whatsapp}</span>}
                    {c.email && <span>✉️ {c.email}</span>}
                    {c.location && <span>📍 {c.location}</span>}
                  </div>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "12px", color: "#888", marginTop: "4px" }}>
                    {c.instagram && <span>📷 @{c.instagram.replace('@', '')}</span>}
                    {c.tiktok && <span>🎵 @{c.tiktok.replace('@', '')}</span>}
                    {c.condicion_iva && <span>🏛️ {condicionesIva.find(x => x.value === c.condicion_iva)?.label || c.condicion_iva}</span>}
                    {c.cuit && <span>🔢 {c.cuit}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} style={{ background: "none", border: "1px solid #ddd", borderRadius: "8px", cursor: "pointer", padding: "6px 10px", fontSize: "13px" }}>✏️</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} style={{ background: "none", border: "1px solid #e74c3c", borderRadius: "8px", cursor: "pointer", padding: "6px 10px", fontSize: "13px" }}>🗑️</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ border: "1px solid #eee", borderRadius: "12px", overflow: "hidden", background: "#fff" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.1fr 1.2fr 1fr 1.3fr 90px 90px", gap: "0", background: "#f8f8f8", padding: "8px 12px", fontSize: "11px", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid #eee" }}>
            <div onClick={() => toggleSort("name")} style={{ cursor: "pointer" }}>{sortLabel("name", "Contacto")}</div>
            <div onClick={() => toggleSort("phone")} style={{ cursor: "pointer" }}>{sortLabel("phone", "Teléfono")}</div>
            <div onClick={() => toggleSort("email")} style={{ cursor: "pointer" }}>{sortLabel("email", "Email")}</div>
            <div onClick={() => toggleSort("location")} style={{ cursor: "pointer" }}>{sortLabel("location", "Localidad")}</div>
            <div onClick={() => toggleSort("condicion_iva")} style={{ cursor: "pointer" }}>{sortLabel("condicion_iva", "IVA")}</div>
            <div onClick={() => toggleSort("calificacion")} style={{ cursor: "pointer" }}>{sortLabel("calificacion", "Score")}</div>
            <div>Acciones</div>
          </div>
          {filteredContacts.map((c) => (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.1fr 1.2fr 1fr 1.3fr 90px 90px", gap: "0", padding: "12px", borderBottom: "1px solid #f5f5f5", alignItems: "center", fontSize: "13px" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{c.name || "Sin nombre"}</div>
                {(c.whatsapp || c.instagram || c.tiktok) && (
                  <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                    {[c.whatsapp ? "WA" : "", c.instagram ? "IG" : "", c.tiktok ? "TT" : ""].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
              <div>{c.phone || c.whatsapp || "-"}</div>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email || "-"}</div>
              <div>{c.location || "-"}</div>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{condicionesIva.find(x => x.value === c.condicion_iva)?.label || c.condicion_iva || "-"}</div>
              <div>
                <span style={{ fontSize: "11px", background: c.calificacion >= 7 ? "#27ae6022" : c.calificacion >= 4 ? "#f39c1215" : "#e74c3c22", color: c.calificacion >= 7 ? "#27ae60" : c.calificacion >= 4 ? "#f39c12" : "#e74c3c", padding: "2px 6px", borderRadius: "8px" }}>
                  ★ {c.calificacion || 0}
                </span>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => openEdit(c)} style={{ background: "none", border: "1px solid #ddd", borderRadius: "8px", cursor: "pointer", padding: "6px 10px", fontSize: "13px" }}>✏️</button>
                <button onClick={() => handleDelete(c.id)} style={{ background: "none", border: "1px solid #e74c3c", borderRadius: "8px", cursor: "pointer", padding: "6px 10px", fontSize: "13px" }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
