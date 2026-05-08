"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "../../lib";
import { Card, Badge, PageTitle, Loading, Empty } from "../../components/shared/UI";
import * as XLSX from "xlsx";

type AdvanceRow = {
  id: number;
  entity_type: "client" | "provider" | string;
  entity_id: number;
  entity_name: string;
  amount: number;
  used_amount: number;
  remaining: number;
  notes: string;
  created_at: string;
};

type Stats = {
  total_count: number;
  total_amount: number;
  total_used: number;
  total_remaining: number;
  client_count: number;
  provider_count: number;
};

type Period = "today" | "week" | "month" | "custom";

export default function AnticiposPage() {
  const [advances, setAdvances] = useState<AdvanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterConsumed, setFilterConsumed] = useState("");
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  function load() {
    setLoading(true);
    const qs = "?period=" + period + (period === "custom" && customFrom && customTo ? "&from=" + customFrom + "&to=" + customTo : "");
    fetchJson<AdvanceRow[]>("/advances" + qs)
      .then(setAdvances)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [period, customFrom, customTo]);

  const filtered = advances.filter((a) => {
    if (search && !a.entity_name?.toLowerCase().includes(search.toLowerCase()) && !String(a.id).includes(search)) return false;
    if (filterType && a.entity_type !== filterType) return false;
    if (filterConsumed === "consumed" && Number(a.used_amount || 0) === 0) return false;
    if (filterConsumed === "available" && Number(a.used_amount || 0) > 0) return false;
    return true;
  });

  const stats: Stats = {
    total_count: advances.length,
    total_amount: advances.reduce((s, a) => s + Number(a.amount || 0), 0),
    total_used: advances.reduce((s, a) => s + Number(a.used_amount || 0), 0),
    total_remaining: advances.reduce((s, a) => s + Number(a.remaining || 0), 0),
    client_count: advances.filter(a => a.entity_type === "client").length,
    provider_count: advances.filter(a => a.entity_type === "provider").length,
  };

  function handleExportExcel() {
    const data = filtered.map(a => ({
      "ID": a.id,
      "Fecha": new Date(a.created_at).toLocaleDateString("es-AR"),
      "Tipo": a.entity_type === "provider" ? "Proveedor" : "Cliente",
      "Entidad": a.entity_name || "-",
      "Total": Number(a.amount || 0),
      "Usado": Number(a.used_amount || 0),
      "Disponible": Number(a.remaining || 0),
      "Notas": a.notes || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Anticipos");
    XLSX.writeFile(wb, "Anticipos.xlsx");
  }

  const periodTabs = [
    { label: "Hoy", value: "today" },
    { label: "Semana", value: "week" },
    { label: "Mes", value: "month" },
    { label: "Personalizado", value: "custom" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <PageTitle>Anticipos</PageTitle>
        <p style={{ fontSize: "13px", color: "#888", margin: "2px 0 0" }}>
          Consultá los anticipos cargados de clientes y proveedores.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        <div style={{ background: "#1a1a2e", borderRadius: "12px", padding: "14px", color: "#fff" }}>
          <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Anticipos activos</div>
          <div style={{ fontSize: "24px", fontWeight: 800 }}>{stats.total_count}</div>
          <div style={{ fontSize: "12px", color: "#27ae60", marginTop: "2px" }}>
            ${stats.total_amount.toLocaleString("es-AR")} cargado
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", border: "1px solid #eee" }}>
          <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Disponible</div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#27ae60" }}>${stats.total_remaining.toLocaleString("es-AR")}</div>
          {stats.total_used > 0 && (
            <div style={{ fontSize: "12px", color: "#f39c12", marginTop: "2px" }}>
              ${stats.total_used.toLocaleString("es-AR")} aplicado
            </div>
          )}
        </div>
        <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", border: "1px solid #eee" }}>
          <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Clientes</div>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>{stats.client_count}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", border: "1px solid #eee" }}>
          <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Proveedores</div>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>{stats.provider_count}</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "4px", background: "#f0f0f0", padding: "3px", borderRadius: "8px" }}>
          {(["today", "week", "month", "custom"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: "5px 12px", borderRadius: "6px", border: "none", background: period === p ? "#1a1a2e" : "transparent", color: period === p ? "#fff" : "#666", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>
              {p === "today" ? "Hoy" : p === "week" ? "Semana" : p === "custom" ? "Personalizado" : "Mes"}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "6px" }}>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px" }} />
            <span style={{ fontSize: "12px", color: "#888" }}>hasta</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px" }} />
            {(customFrom || customTo) && (
              <button onClick={() => { setCustomFrom(""); setCustomTo(""); }}
                style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", fontSize: "12px", cursor: "pointer" }}>
                Limpiar
              </button>
            )}
            <button onClick={load}
              style={{ padding: "5px 12px", borderRadius: "6px", border: "none", background: "#27ae60", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Aplicar</button>
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
          <button
            onClick={handleExportExcel}
            disabled={filtered.length === 0}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: filtered.length === 0 ? "not-allowed" : "pointer",
              fontSize: "12px",
              background: filtered.length === 0 ? "#cfcfcf" : "#27ae60",
              color: "#fff",
              fontWeight: 700,
              opacity: filtered.length === 0 ? 0.7 : 1,
            }}
          >
            ⬇ Excel
          </button>
          <button onClick={() => setViewMode("cards")}
            style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: viewMode === "cards" ? "#1a1a2e" : "#e0e0e0", color: viewMode === "cards" ? "#fff" : "#333", cursor: "pointer", fontSize: "13px" }}>
            Cards
          </button>
          <button onClick={() => setViewMode("list")}
            style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: viewMode === "list" ? "#1a1a2e" : "#e0e0e0", color: viewMode === "list" ? "#fff" : "#333", cursor: "pointer", fontSize: "13px" }}>
            Lista
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..."
          style={{ flex: 1, minWidth: "160px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minWidth: "140px" }}>
          <option value="">Tipo: Todos</option>
          <option value="client">Clientes</option>
          <option value="provider">Proveedores</option>
        </select>
        <select value={filterConsumed} onChange={e => setFilterConsumed(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minWidth: "160px" }}>
          <option value="">Consumo: Todos</option>
          <option value="consumed">Consumidos</option>
          <option value="available">Sin consumir</option>
        </select>
      </div>

      {loading ? <Loading /> : filtered.length === 0 ? (
        <Empty message="Sin anticipos cargados" />
      ) : viewMode === "cards" ? (
        <div style={{ display: "grid", gap: "10px" }}>
          {filtered.map(a => (
            <Card key={a.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: "14px", color: "#1a1a2e" }}>#{a.id}</span>
                    <Badge color={a.entity_type === "provider" ? "#e67e22" : "#27ae60"}>
                      {a.entity_type === "provider" ? "Proveedor" : "Cliente"}
                    </Badge>
                    {Number(a.used_amount || 0) > 0 && (
                      <Badge color="#3498db">Consumido</Badge>
                    )}
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#222", marginBottom: "6px" }}>
                    {a.entity_name || "Sin nombre"}
                  </div>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "12px", color: "#666", marginBottom: "8px" }}>
                    <span>Total: <b style={{ color: "#1a1a2e" }}>${Number(a.amount).toLocaleString("es-AR")}</b></span>
                    <span>Usado: <b style={{ color: "#f39c12" }}>${Number(a.used_amount || 0).toLocaleString("es-AR")}</b></span>
                    <span>Disponible: <b style={{ color: "#27ae60" }}>${Number(a.remaining || 0).toLocaleString("es-AR")}</b></span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#999" }}>
                    {new Date(a.created_at).toLocaleDateString("es-AR")}
                    {a.notes ? ` · ${a.notes}` : ""}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eee", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "90px 1.1fr 120px 140px 140px 140px", gap: "8px", padding: "10px 12px", background: "#f8f8f8", fontSize: "11px", fontWeight: 800, color: "#666", textTransform: "uppercase" }}>
            <div>ID</div>
            <div>Entidad</div>
            <div>Tipo</div>
            <div>Total</div>
            <div>Usado</div>
            <div>Disponible</div>
          </div>
          {filtered.map(a => (
            <div key={a.id} style={{ display: "grid", gridTemplateColumns: "90px 1.1fr 120px 140px 140px 140px", gap: "8px", padding: "12px", borderTop: "1px solid #f0f0f0", fontSize: "13px", alignItems: "center" }}>
              <div style={{ fontWeight: 800, color: "#1a1a2e" }}>#{a.id}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{a.entity_name || "Sin nombre"}</div>
                <div style={{ fontSize: "11px", color: "#999" }}>{new Date(a.created_at).toLocaleDateString("es-AR")}</div>
              </div>
              <div>
                <Badge color={a.entity_type === "provider" ? "#e67e22" : "#27ae60"}>
                  {a.entity_type === "provider" ? "Proveedor" : "Cliente"}
                </Badge>
              </div>
              <div style={{ fontWeight: 700 }}>${Number(a.amount).toLocaleString("es-AR")}</div>
              <div style={{ fontWeight: 700, color: "#f39c12" }}>${Number(a.used_amount || 0).toLocaleString("es-AR")}</div>
              <div style={{ fontWeight: 700, color: "#27ae60" }}>${Number(a.remaining || 0).toLocaleString("es-AR")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
