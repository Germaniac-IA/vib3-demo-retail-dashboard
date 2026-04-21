"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchJson, postJson, putJson, deleteJson } from "../../lib";
import { Card, CardHeader, Empty, IconButton, Input, Loading, PageTitle } from "../../components/shared/UI";

type Provider = {
  id: number;
  name: string;
  business_name?: string | null;
  tax_id?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

type FormState = {
  name: string;
  business_name: string;
  tax_id: string;
  contact_person: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  business_name: "",
  tax_id: "",
  contact_person: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  notes: "",
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12, color: "#777" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#1a1a2e" }}>{value}</div>
    </Card>
  );
}

export default function ProveedoresPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "with-contact" | "with-tax" | "with-email">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  async function loadProviders() {
    setLoading(true);
    try {
      const q = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
      const rows = await fetchJson<Provider[]>(`/providers${q}`);
      setProviders(rows || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProviders(); }, []);
  useEffect(() => {
    const t = setTimeout(loadProviders, 250);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => providers.filter((p) => {
    if (filter === "with-contact") return Boolean(p.contact_person || p.phone || p.whatsapp);
    if (filter === "with-tax") return Boolean(p.tax_id);
    if (filter === "with-email") return Boolean(p.email);
    return true;
  }), [providers, filter]);

  const stats = useMemo(() => ({
    total: providers.length,
    withContact: providers.filter((p) => Boolean(p.contact_person || p.phone || p.whatsapp)).length,
    withTax: providers.filter((p) => Boolean(p.tax_id)).length,
    withEmail: providers.filter((p) => Boolean(p.email)).length,
  }), [providers]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(provider: Provider) {
    setEditing(provider);
    setForm({
      name: provider.name || "",
      business_name: provider.business_name || "",
      tax_id: provider.tax_id || "",
      contact_person: provider.contact_person || "",
      phone: provider.phone || "",
      whatsapp: provider.whatsapp || "",
      email: provider.email || "",
      address: provider.address || "",
      notes: provider.notes || "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return alert("El nombre es obligatorio");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        business_name: form.business_name.trim() || null,
        tax_id: form.tax_id.trim() || null,
        contact_person: form.contact_person.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editing) await putJson(`/providers/${editing.id}`, payload);
      else await postJson(`/providers`, payload);
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await loadProviders();
    } catch (e: any) {
      alert(e?.message || "No se pudo guardar el proveedor");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(provider: Provider) {
    if (!confirm(`¿Eliminar proveedor ${provider.name}?`)) return;
    try {
      await deleteJson(`/providers/${provider.id}`);
      await loadProviders();
    } catch (e: any) {
      alert(e?.message || "No se pudo eliminar el proveedor");
    }
  }

  return (
    <div>
      <PageTitle title="🏭 Proveedores" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Con contacto" value={stats.withContact} />
        <StatCard label="Con CUIT" value={stats.withTax} />
        <StatCard label="Con email" value={stats.withEmail} />
      </div>

      <Card>
        <CardHeader
          title="Gestión de proveedores"
          action={<IconButton variant="primary" onClick={openCreate}>➕</IconButton>}
        />

        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ minWidth: 320, flex: 1 }}>
              <Input value={query} onChange={setQuery} placeholder="Buscar por nombre, razón social, CUIT, contacto, teléfono o email" />
            </div>
            <IconButton variant={filter === "all" ? "primary" : "secondary"} onClick={() => setFilter("all")}>📋</IconButton>
            <IconButton variant={filter === "with-contact" ? "primary" : "secondary"} onClick={() => setFilter("with-contact")}>👤</IconButton>
            <IconButton variant={filter === "with-tax" ? "primary" : "secondary"} onClick={() => setFilter("with-tax")}>📄</IconButton>
            <IconButton variant={filter === "with-email" ? "primary" : "secondary"} onClick={() => setFilter("with-email")}>✉️</IconButton>
          </div>

          {loading ? <Loading /> : filtered.length === 0 ? <Empty message="No hay proveedores para mostrar" /> : (
            <div style={{ display: "grid", gap: 10 }}>
              {filtered.map((p) => (
                <div key={p.id} style={{ border: "1px solid #ececec", borderRadius: 12, padding: 14, display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 800 }}>{p.name}</div>
                      {p.business_name && <div style={{ color: "#666" }}>{p.business_name}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <IconButton variant="secondary" onClick={() => openEdit(p)} title="Editar">✏️</IconButton>
                      <IconButton variant="danger" onClick={() => handleDelete(p)} title="Eliminar">🗑️</IconButton>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8, color: "#333", fontSize: 14 }}>
                    <div><b>CUIT:</b> {p.tax_id || "—"}</div>
                    <div><b>Contacto:</b> {p.contact_person || "—"}</div>
                    <div><b>Tel:</b> {p.phone || "—"}</div>
                    <div><b>WhatsApp:</b> {p.whatsapp || "—"}</div>
                    <div><b>Email:</b> {p.email || "—"}</div>
                    <div><b>Dirección:</b> {p.address || "—"}</div>
                  </div>
                  {p.notes && <div style={{ color: "#555" }}><b>Notas:</b> {p.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid", placeItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", width: "min(760px, 92vw)", borderRadius: 16, padding: 18, display: "grid", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>{editing ? "✏️" : "➕"}</h3>
              <button onClick={() => setModalOpen(false)} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input label="Nombre *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Nombre" />
              <Input label="Razón social" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} placeholder="Razón social" />
              <Input label="CUIT" value={form.tax_id} onChange={(v) => setForm({ ...form, tax_id: v })} placeholder="CUIT" />
              <Input label="Persona de contacto" value={form.contact_person} onChange={(v) => setForm({ ...form, contact_person: v })} placeholder="Contacto" />
              <Input label="Teléfono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="Teléfono" />
              <Input label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="WhatsApp" />
              <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="Email" />
              <Input label="Dirección" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="Dirección" />
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4, color: "#555" }}>Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ width: "100%", minHeight: 90, border: "1px solid #ddd", borderRadius: 10, padding: 12, font: "inherit" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <IconButton variant="ghost" onClick={() => setModalOpen(false)}>❌</IconButton>
              <IconButton variant="primary" onClick={handleSave} disabled={saving}>{saving ? "..." : (editing ? "💾" : "✅")}</IconButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}