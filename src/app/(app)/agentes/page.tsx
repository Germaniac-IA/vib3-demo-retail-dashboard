"use client";

import { useEffect, useState } from "react";
import { fetchJson, postJson, putJson, deleteJson } from "../../lib";
import { Card, IconButton, Button, Input, Select, PageTitle, Loading, Empty, Badge } from "../../components/shared/UI";

type AgentInstruction = {
  id?: number;
  agent_id: number;
  type: "permanent" | "transient";
  content: string;
  sort_order: number;
  is_active: boolean;
};

type Agent = {
  id: number;
  name: string;
  description: string;
  platform: string;
  is_active: boolean;
  working_hours: string;
  tone: string;
  industry_context: string;
  autonomy_level: string;
};

export default function AgentesPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [instructions, setInstructions] = useState<AgentInstruction[]>([]);
  const [newInstText, setNewInstText] = useState<Record<string, string>>({ permanent: "", transient: "" });
  const [form, setForm] = useState({
    name: "",
    description: "",
    platform: "web",
    tone: "casual",
    autonomy_level: "partial",
    working_hours: "09:00-18:00",
    industry_context: "",
  });

  function loadAgents() {
    setLoading(true);
    fetchJson<Agent[]>("/agents")
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadAgents(); }, []);

  useEffect(() => {
    if (editingId) {
      fetchJson<AgentInstruction[]>(`/agent-instructions?agent_id=${editingId}`)
        .then((rows) => {
          const normalized = rows.map((r: AgentInstruction) => ({
            ...r,
            type: r.type === "transient" ? "transient" : "permanent",
          }));
          setInstructions(normalized);
        })
        .catch(console.error);
    } else {
      setInstructions([]);
    }
  }, [editingId]);


  function openEdit(agent: Agent) {
    setEditingId(agent.id);
    setNewInstText({ permanent: "", transient: "" });
    setForm({
      name: agent.name,
      description: agent.description || "",
      platform: agent.platform,
      tone: agent.tone,
      autonomy_level: agent.autonomy_level,
      working_hours: agent.working_hours,
      industry_context: agent.industry_context || "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    try {
      const agentPayload = { ...form };
      let savedAgentId = editingId;

      if (editingId) {
        await putJson(`/agents/${editingId}`, agentPayload);
      } else {
        const created = await postJson<{ id: number }>("/agents", agentPayload);
        savedAgentId = created.id;
      }

      // Sync instructions
      const existing = instructions.filter((i) => i.id);
      for (const inst of existing) {
        if (inst.id) {
          await putJson(`/agent-instructions/${inst.id}`, {
            type: inst.type,
            content: inst.content,
            sort_order: inst.sort_order,
            is_active: inst.is_active,
          });
        }
      }

      // New instructions (no id yet)
      const newOnes = instructions.filter((i) => !i.id);
      for (const inst of newOnes) {
        await postJson("/agent-instructions", {
          agent_id: savedAgentId,
          type: inst.type,
          content: inst.content,
          sort_order: inst.sort_order,
        });
      }

      setShowForm(false);
      loadAgents();
    } catch (e) {
      console.error(e);
      alert("Error al guardar: " + (e as Error).message);
    }
  }

  async function handleDeleteAgent(id: number) {
    if (!confirm("¿Eliminar este agente?")) return;
    try {
      await deleteJson(`/agents/${id}`);
      loadAgents();
    } catch (e) { console.error(e); }
  }

  function addInstruction(type: "permanent" | "transient") {
    const text = newInstText[type].trim();
    if (!text) return;
    setInstructions([
      ...instructions,
      { agent_id: editingId || 0, type, content: text, sort_order: instructions.length, is_active: true },
    ]);
    setNewInstText({ ...newInstText, [type]: "" });
  }

  function removeInstruction(index: number) {
    setInstructions(instructions.filter((_, i) => i !== index));
  }

  function toggleActive(index: number) {
    setInstructions(
      instructions.map((inst, i) =>
        i === index ? { ...inst, is_active: !inst.is_active } : inst
      )
    );
  }

  function updateInstructionContent(index: number, content: string) {
    setInstructions(
      instructions.map((inst, i) => (i === index ? { ...inst, content } : inst))
    );
  }

  const TONE_ICONS: Record<string, string> = { formal: "🤵", casual: "😊", picarro: "😏" };
  const permanentInst = instructions.filter((i) => i.type === "permanent");
  const transientInst = instructions.filter((i) => i.type === "transient");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <PageTitle>🤖 Mis Agentes</PageTitle>
      </div>

      {loading ? <Loading /> : agents.length === 0 ? (
        <Empty message="No hay agentes. Creá el primero." />
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {agents.map((agent) => (
            <Card key={agent.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <strong style={{ fontSize: "16px" }}>{agent.name}</strong>
                    <Badge color={agent.is_active ? "#27ae60" : "#e74c3c"}>
                      {agent.is_active ? "●" : "○"}
                    </Badge>
                    <Badge>{agent.platform}</Badge>
                    <span style={{ fontSize: "14px" }}>{TONE_ICONS[agent.tone] || "💬"}</span>
                  </div>
                  {agent.description && (
                    <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#666" }}>{agent.description}</p>
                  )}
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#999" }}>
                    🕐 {agent.working_hours} · 🔒 {agent.autonomy_level}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <IconButton variant="ghost" title="Editar" onClick={() => openEdit(agent)}>✏️</IconButton>
                  <IconButton variant="danger" title="Eliminar" onClick={() => handleDeleteAgent(agent.id)}>🗑️</IconButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 100, display: "flex", alignItems: "center",
            justifyContent: "center", padding: "20px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div
            style={{
              background: "#fff", borderRadius: "16px", padding: "24px",
              width: "100%", maxWidth: "580px", maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px" }}>
              {editingId ? "✏️ Editar Agente" : "+ Nuevo Agente"}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Input label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Select label="Plataforma" value={form.platform} onChange={(v) => setForm({ ...form, platform: v })}
                options={[
                  { value: "web", label: "🌐 Web" },
                  { value: "whatsapp", label: "📱 WhatsApp" },
                  { value: "telegram", label: "✈️ Telegram" },
                  { value: "instagram", label: "📸 Instagram" },
                ]} />
            </div>

            <Input label="Descripción" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Select label="Tono" value={form.tone} onChange={(v) => setForm({ ...form, tone: v })}
                options={[
                  { value: "formal", label: "🤵 Formal" },
                  { value: "casual", label: "😊 Casual" },
                  { value: "picarro", label: "😏 Pícaro" },
                ]} />
              <Select label="Autonomía" value={form.autonomy_level} onChange={(v) => setForm({ ...form, autonomy_level: v })}
                options={[
                  { value: "full", label: "🔓 Total" },
                  { value: "partial", label: "🔒 Parcial" },
                  { value: "supervised", label: "👤 Supervisado" },
                ]} />
            </div>

            <Input label="Horario" value={form.working_hours} onChange={(v) => setForm({ ...form, working_hours: v })} placeholder="09:00-18:00" />

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>Contexto del negocio</label>
              <textarea value={form.industry_context} onChange={(e) => setForm({ ...form, industry_context: e.target.value })}
                placeholder="Vendo piscinas y productos de limpieza..." rows={2}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />
            </div>

            {/* Instrucciones permanentes */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "#333" }}>📌 Instrucciones Permanentes</label>
              </div>
              {permanentInst.length === 0 ? (
                <p style={{ fontSize: "12px", color: "#aaa" }}>Sin instrucciones permanentes</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                  {permanentInst.map((inst, idx) => {
                    const globalIdx = instructions.findIndex((i) => i === inst);
                    return (
                      <InstructionItem
                        key={globalIdx}
                        content={inst.content}
                        isActive={inst.is_active}
                        onContentChange={(v) => updateInstructionContent(globalIdx, v)}
                        onToggleActive={() => toggleActive(globalIdx)}
                        onRemove={() => removeInstruction(globalIdx)}
                      />
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", gap: "6px" }}>
                <textarea
                  value={newInstText.permanent}
                  onChange={(e) => setNewInstText({ ...newInstText, permanent: e.target.value })}
                  placeholder="Nueva instrucción permanente..."
                  rows={2}
                  style={{ flex: 1, padding: "6px 10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                />
                <Button variant="secondary" onClick={() => addInstruction("permanent")} style={{ alignSelf: "flex-end", padding: "6px 12px" }}>＋ Agregar</Button>
              </div>
            </div>

            {/* Instrucciones transitorias */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "#333" }}>🎯 Instrucciones Transitorias (promos)</label>
              </div>
              {transientInst.length === 0 ? (
                <p style={{ fontSize: "12px", color: "#aaa" }}>Sin instrucciones transitorias</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                  {transientInst.map((inst, idx) => {
                    const globalIdx = instructions.findIndex((i) => i === inst);
                    return (
                      <InstructionItem
                        key={globalIdx}
                        content={inst.content}
                        isActive={inst.is_active}
                        onContentChange={(v) => updateInstructionContent(globalIdx, v)}
                        onToggleActive={() => toggleActive(globalIdx)}
                        onRemove={() => removeInstruction(globalIdx)}
                      />
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", gap: "6px" }}>
                <textarea
                  value={newInstText.transient}
                  onChange={(e) => setNewInstText({ ...newInstText, transient: e.target.value })}
                  placeholder="Nueva instrucción transitoria..."
                  rows={2}
                  style={{ flex: 1, padding: "6px 10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                />
                <Button variant="secondary" onClick={() => addInstruction("transient")} style={{ alignSelf: "flex-end", padding: "6px 12px" }}>＋ Agregar</Button>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setShowForm(false)}>✕</Button>
              <Button onClick={handleSave}>{editingId ? "✓" : "+"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type InstructionItemProps = {
  content: string;
  isActive: boolean;
  onContentChange: (v: string) => void;
  onToggleActive: () => void;
  onRemove: () => void;
};

function InstructionItem({ content, isActive, onContentChange, onToggleActive, onRemove }: InstructionItemProps) {
  return (
    <div style={{
      display: "flex", gap: "6px", alignItems: "flex-start",
      background: isActive ? "#f0fff0" : "#fff5f5",
      border: `1px solid ${isActive ? "#b3e5b3" : "#ffb3b3"}`,
      borderRadius: "8px", padding: "8px 10px",
      opacity: isActive ? 1 : 0.6,
    }}>
      <span style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{isActive ? "📌" : "📍"}</span>
      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        rows={2}
        style={{
          flex: 1, border: "none", background: "transparent",
          fontSize: "13px", fontFamily: "inherit", resize: "none",
          outline: "none", boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <button
          onClick={onToggleActive}
          title={isActive ? "Desactivar" : "Activar"}
          style={{ fontSize: "11px", cursor: "pointer", border: "none", background: "none", padding: "2px" }}
        >
          {isActive ? "🔵" : "⚪"}
        </button>
        <button
          onClick={onRemove}
          title="Eliminar"
          style={{ fontSize: "11px", cursor: "pointer", border: "none", background: "none", padding: "2px" }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
