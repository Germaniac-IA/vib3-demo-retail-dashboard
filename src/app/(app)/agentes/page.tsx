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

type AgentProcedure = {
  id?: number;
  agent_id: number;
  context: string;
  step_order: number;
  step_name: string;
  step_prompt: string;
  active: boolean;
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

const CONTEXTS = [
  { value: "lead_nuevo", label: "🆕 Lead nuevo" },
  { value: "lead_caliente", label: "🔥 Lead caliente" },
  { value: "cliente", label: "🤝 Cliente" },
  { value: "admin", label: "👤 Admin" },
];

export default function AgentesPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"instrucciones" | "procedimientos">("instrucciones");

  // Instrucciones state
  const [instructions, setInstructions] = useState<AgentInstruction[]>([]);
  const [newInstText, setNewInstText] = useState<Record<string, string>>({ permanent: "", transient: "" });

  // Procedimientos state
  const [procedures, setProcedures] = useState<AgentProcedure[]>([]);
  const [newProcStep, setNewProcStep] = useState<Omit<AgentProcedure, "id" | "agent_id" | "active">>({
    context: "lead_nuevo", step_order: 0, step_name: "", step_prompt: "",
  });

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
      fetchJson<AgentProcedure[]>(`/agent-procedures?agent_id=${editingId}`)
        .then(setProcedures)
        .catch(console.error);
    } else {
      setInstructions([]);
      setProcedures([]);
    }
  }, [editingId]);

  function openEdit(agent: Agent) {
    setEditingId(agent.id);
    setActiveTab("instrucciones");
    setNewInstText({ permanent: "", transient: "" });
    setNewProcStep({ context: "lead_nuevo", step_order: 0, step_name: "", step_prompt: "" });
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

      const newOnes = instructions.filter((i) => !i.id);
      for (const inst of newOnes) {
        await postJson("/agent-instructions", {
          agent_id: savedAgentId,
          type: inst.type,
          content: inst.content,
          sort_order: inst.sort_order,
        });
      }

      // Sync procedures
      const existingProcs = procedures.filter((p) => p.id);
      for (const proc of existingProcs) {
        if (proc.id) {
          await putJson(`/agent-procedures/${proc.id}`, {
            context: proc.context,
            step_order: proc.step_order,
            step_name: proc.step_name,
            step_prompt: proc.step_prompt,
            active: proc.active,
          });
        }
      }

      const newProcs = procedures.filter((p) => !p.id);
      for (const proc of newProcs) {
        await postJson("/agent-procedures", {
          agent_id: savedAgentId,
          context: proc.context,
          step_order: proc.step_order,
          step_name: proc.step_name,
          step_prompt: proc.step_prompt,
          active: proc.active,
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

  // ── Instrucciones helpers ──

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

  function toggleInstActive(index: number) {
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

  // ── Procedimientos helpers ──

  function addProcedureStep() {
    const prompt = newProcStep.step_prompt.trim();
    if (!prompt) return;
    const stepsThisContext = procedures.filter((p) => p.context === newProcStep.context);
    setProcedures([
      ...procedures,
      {
        agent_id: editingId || 0,
        context: newProcStep.context,
        step_order: stepsThisContext.length,
        step_name: newProcStep.step_name,
        step_prompt: prompt,
        active: true,
      },
    ]);
    setNewProcStep({ context: newProcStep.context, step_order: 0, step_name: "", step_prompt: "" });
  }

  function removeProcedureStep(index: number) {
    setProcedures(procedures.filter((_, i) => i !== index));
  }

  function toggleProcActive(index: number) {
    setProcedures(
      procedures.map((p, i) => (i === index ? { ...p, active: !p.active } : p))
    );
  }

  function updateProcedureStep(index: number, field: keyof AgentProcedure, value: string | boolean | number) {
    setProcedures(
      procedures.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  }

  function moveStep(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= procedures.length) return;
    const list = [...procedures];
    const currentContext = list[index].context;
    const targetContext = list[target].context;
    // Only allow reorder within same context
    if (currentContext !== targetContext) return;
    [list[index], list[target]] = [list[target], list[index]];
    // Fix step_order
    const grouped = groupBy(list, "context");
    for (const ctx of Object.keys(grouped)) {
      grouped[ctx].forEach((p, i) => { p.step_order = i; });
    }
    setProcedures(list);
  }

  function groupBy<T extends Record<string, any>>(arr: T[], key: string): Record<string, T[]> {
    return arr.reduce((acc, item) => {
      const k = String(item[key]);
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }

  const TONE_ICONS: Record<string, string> = { formal: "🤵", casual: "😊", picarro: "😏" };
  const permanentInst = instructions.filter((i) => i.type === "permanent");
  const transientInst = instructions.filter((i) => i.type === "transient");

  // Group procedures by context
  const procByContext = groupBy(procedures, "context");

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
              width: "100%", maxWidth: "620px", maxHeight: "90vh",
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

            {/* ── TABS ── */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: "2px solid #eee" }}>
              <TabButton
                label="📋 Instrucciones"
                active={activeTab === "instrucciones"}
                onClick={() => setActiveTab("instrucciones")}
              />
              <TabButton
                label="📋 Procedimientos"
                active={activeTab === "procedimientos"}
                onClick={() => setActiveTab("procedimientos")}
              />
            </div>

            {/* ── INSTRUCCIONES TAB ── */}
            {activeTab === "instrucciones" && (
              <div>
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
                            onToggleActive={() => toggleInstActive(globalIdx)}
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
                            onToggleActive={() => toggleInstActive(globalIdx)}
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
              </div>
            )}

            {/* ── PROCEDIMIENTOS TAB ── */}
            {activeTab === "procedimientos" && (
              <div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#333", marginBottom: "8px", display: "block" }}>
                    🧭 Procedimientos de Interacción
                  </label>
                  <p style={{ fontSize: "12px", color: "#888", marginBottom: "12px" }}>
                    Definí paso a paso cómo el agente debe atender según el contexto del usuario.
                    Los procedimientos se aplican por encima de las instrucciones en la jerarquía.
                  </p>
                </div>

                {procedures.length === 0 ? (
                  <div style={{
                    padding: "20px", textAlign: "center", border: "2px dashed #ddd",
                    borderRadius: "12px", marginBottom: "16px",
                  }}>
                    <p style={{ fontSize: "13px", color: "#999" }}>Sin procedimientos aún</p>
                    <p style={{ fontSize: "11px", color: "#bbb" }}>Creá pasos para que el agente sepa cómo vender</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                    {/* Show procedures grouped by context */}
                    {CONTEXTS.map((ctx) => {
                      const steps = procByContext[ctx.value] || [];
                      if (steps.length === 0) return null;
                      return (
                        <div key={ctx.value} style={{ border: "1px solid #e0e0e0", borderRadius: "10px", padding: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                            <span style={{ fontWeight: 700, fontSize: "13px" }}>{ctx.label}</span>
                            <span style={{ fontSize: "11px", color: "#999" }}>({steps.length} pasos)</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {steps.map((proc, idx) => {
                              const globalIdx = procedures.findIndex((p) => p === proc);
                              return (
                                <ProcedureItem
                                  key={globalIdx}
                                  step={proc}
                                  stepIndex={idx}
                                  totalInContext={steps.length}
                                  canMoveUp={procByContext[proc.context] ? procByContext[proc.context].indexOf(proc) > 0 : false}
                                  canMoveDown={procByContext[proc.context] ? procByContext[proc.context].indexOf(proc) < procByContext[proc.context].length - 1 : false}
                                  onUpdate={(field, value) => updateProcedureStep(globalIdx, field, value)}
                                  onToggleActive={() => toggleProcActive(globalIdx)}
                                  onRemove={() => removeProcedureStep(globalIdx)}
                                  onMoveUp={() => moveStep(globalIdx, "up")}
                                  onMoveDown={() => moveStep(globalIdx, "down")}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add new step form */}
                <div style={{
                  background: "#f9f9fb", borderRadius: "10px", padding: "12px",
                  border: "1px solid #eee",
                }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "8px", display: "block" }}>
                    ＋ Nuevo paso
                  </label>
                  <div style={{ display: "grid", gap: "8px" }}>
                    <Select
                      label="Contexto"
                      value={newProcStep.context}
                      onChange={(v) => setNewProcStep({ ...newProcStep, context: v })}
                      options={CONTEXTS}
                    />
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>Nombre del paso</label>
                      <input
                        value={newProcStep.step_name}
                        onChange={(e) => setNewProcStep({ ...newProcStep, step_name: e.target.value })}
                        placeholder="Ej: Saludo, Descubrimiento, Cierre"
                        style={{
                          width: "100%", padding: "8px 12px", border: "1px solid #ddd",
                          borderRadius: "8px", fontSize: "13px", boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>Prompt / Instrucción</label>
                      <textarea
                        value={newProcStep.step_prompt}
                        onChange={(e) => setNewProcStep({ ...newProcStep, step_prompt: e.target.value })}
                        placeholder="Saludar al lead y preguntar qué busca..."
                        rows={3}
                        style={{
                          width: "100%", padding: "8px 12px", border: "1px solid #ddd",
                          borderRadius: "8px", fontSize: "13px", fontFamily: "inherit",
                          resize: "vertical", boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <Button variant="secondary" onClick={addProcedureStep} style={{ alignSelf: "flex-end" }}>＋ Agregar paso</Button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "20px" }}>
              <Button variant="secondary" onClick={() => setShowForm(false)}>✕ Cerrar</Button>
              <Button onClick={handleSave}>{editingId ? "✓ Guardar cambios" : "✓ Crear agente"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab Button ──

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        fontSize: "13px",
        fontWeight: active ? 700 : 500,
        border: "none",
        background: "none",
        cursor: "pointer",
        borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
        color: active ? "#2563eb" : "#888",
        marginBottom: "-2px",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

// ── Instruction Item ──

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

// ── Procedure Item ──

type ProcedureItemProps = {
  step: AgentProcedure;
  stepIndex: number;
  totalInContext: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onUpdate: (field: keyof AgentProcedure, value: string | boolean | number) => void;
  onToggleActive: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function ProcedureItem({
  step, stepIndex, canMoveUp, canMoveDown,
  onUpdate, onToggleActive, onRemove, onMoveUp, onMoveDown,
}: ProcedureItemProps) {
  return (
    <div style={{
      display: "flex", gap: "6px", alignItems: "flex-start",
      background: step.active ? "#f0f7ff" : "#f5f5f5",
      border: `1px solid ${step.active ? "#b3d4ff" : "#ddd"}`,
      borderRadius: "8px", padding: "8px 10px",
      opacity: step.active ? 1 : 0.5,
    }}>
      {/* Step number + reorder */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center", minWidth: "20px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#999", lineHeight: "1" }}>#{stepIndex + 1}</span>
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          title="Mover arriba"
          style={{
            fontSize: "9px", cursor: canMoveUp ? "pointer" : "default",
            border: "none", background: "none", padding: "1px",
            opacity: canMoveUp ? 1 : 0.3,
          }}
        >▲</button>
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          title="Mover abajo"
          style={{
            fontSize: "9px", cursor: canMoveDown ? "pointer" : "default",
            border: "none", background: "none", padding: "1px",
            opacity: canMoveDown ? 1 : 0.3,
          }}
        >▼</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <input
          value={step.step_name}
          onChange={(e) => onUpdate("step_name", e.target.value)}
          placeholder="Nombre del paso"
          style={{
            width: "100%", border: "none", background: "transparent",
            fontWeight: 600, fontSize: "13px", padding: "2px 0",
            outline: "none", boxSizing: "border-box",
          }}
        />
        <textarea
          value={step.step_prompt}
          onChange={(e) => onUpdate("step_prompt", e.target.value)}
          rows={2}
          style={{
            width: "100%", border: "none", background: "transparent",
            fontSize: "12px", fontFamily: "inherit", resize: "none",
            outline: "none", marginTop: "4px", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <button
          onClick={onToggleActive}
          title={step.active ? "Desactivar" : "Activar"}
          style={{ fontSize: "11px", cursor: "pointer", border: "none", background: "none", padding: "2px" }}
        >
          {step.active ? "🔵" : "⚪"}
        </button>
        <button
          onClick={onRemove}
          title="Eliminar paso"
          style={{ fontSize: "11px", cursor: "pointer", border: "none", background: "none", padding: "2px" }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
