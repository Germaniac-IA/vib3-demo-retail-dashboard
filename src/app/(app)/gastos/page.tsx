"use client";

import { useEffect, useState } from "react";
import { fetchJson, postJson, putJson, deleteJson } from "../../lib";
import { Card, PageTitle, Loading, Empty, Badge } from "../../components/shared/UI";

type Expense = { id:number; expense_number:string; description:string; category_id?:number; category_name?:string; provider_id?:number; provider_name?:string; issue_date:string; due_date?:string; total:number; payment_paid:number; payment_pending:number; payment_status_name?:string; payment_status_color?:string; notes?:string };
type Category = { id:number; name:string };
type Provider = { id:number; name:string };
type PaymentMethod = { id:number; name:string };
type Period = "today" | "week" | "month" | "custom";

export default function GastosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showPay, setShowPay] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category_id:"", provider_id:"", description:"", issue_date:new Date().toISOString().slice(0,10), due_date:"", total:"", notes:"" });
  const [payForm, setPayForm] = useState({ financial_account_id:"", amount:"", notes:"" });

  function load() {
    setLoading(true);
    const qs = period === "custom" && customFrom && customTo ? `?period=custom&from=${customFrom}&to=${customTo}` : `?period=${period}`;
    Promise.all([
      fetchJson<Expense[]>("/expenses" + qs),
      fetchJson<Category[]>("/expense-categories"),
      fetchJson<Provider[]>("/providers"),
      fetchJson<PaymentMethod[]>("/payment-methods"),
    ]).then(([e,c,p,m]) => { setExpenses(e); setCategories(c); setProviders(p); setMethods(m); })
      .catch(console.error).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [period, customFrom, customTo]);

  function openNew() { setEditing(null); setForm({ category_id:"", provider_id:"", description:"", issue_date:new Date().toISOString().slice(0,10), due_date:"", total:"", notes:"" }); setShowForm(true); }
  function openEdit(e: Expense) { setEditing(e); setForm({ category_id:e.category_id?String(e.category_id):"", provider_id:e.provider_id?String(e.provider_id):"", description:e.description, issue_date:String(e.issue_date).slice(0,10), due_date:e.due_date?String(e.due_date).slice(0,10):"", total:String(e.total), notes:e.notes||"" }); setShowForm(true); }

  async function saveExpense() {
    if (!form.description.trim() || !Number(form.total)) { alert("Descripción y monto son requeridos"); return; }
    setSaving(true);
    const payload = { ...form, category_id: form.category_id ? Number(form.category_id) : null, provider_id: form.provider_id ? Number(form.provider_id) : null, total: Number(form.total), due_date: form.due_date || null };
    try {
      if (editing) await putJson(`/expenses/${editing.id}`, payload);
      else await postJson("/expenses", payload);
      setShowForm(false); load();
    } catch(e:any) { alert("Error: " + (e?.message || e)); }
    finally { setSaving(false); }
  }

  function openPay(e: Expense) { setShowPay(e); setPayForm({ financial_account_id:"", amount:String(e.payment_pending || e.total), notes:"" }); }
  async function payExpense() {
    if (!showPay) return;
    if (!payForm.financial_account_id || !Number(payForm.amount)) { alert("Cuenta y monto son requeridos"); return; }
    setSaving(true);
    try {
      await postJson(`/expenses/${showPay.id}/payments`, { financial_account_id:Number(payForm.financial_account_id), amount:Number(payForm.amount), notes:payForm.notes || undefined });
      setShowPay(null); load();
    } catch(e:any) { alert("Error: " + (e?.message || e)); }
    finally { setSaving(false); }
  }

  async function remove(e: Expense) { if (!confirm(`¿Eliminar ${e.expense_number}?`)) return; await deleteJson(`/expenses/${e.id}`); load(); }

  const total = expenses.reduce((s,e)=>s+Number(e.total||0),0);
  const paid = expenses.reduce((s,e)=>s+Number(e.payment_paid||0),0);
  const pending = expenses.reduce((s,e)=>s+Number(e.payment_pending||0),0);

  return <div>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
      <div><PageTitle>🧾 Gastos</PageTitle><p style={{fontSize:13,color:"#888",margin:"2px 0 0"}}>Devengamientos y egresos no inventariables del negocio.</p></div>
      <button onClick={openNew} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#27ae60", color:"#fff", fontWeight:700, cursor:"pointer" }}>➕ Nuevo gasto</button>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:10, marginBottom:14 }}>
      <Card><div style={{fontSize:12,color:"#888"}}>Total período</div><strong>${total.toLocaleString("es-AR")}</strong></Card>
      <Card><div style={{fontSize:12,color:"#888"}}>Pagado</div><strong style={{color:"#27ae60"}}>${paid.toLocaleString("es-AR")}</strong></Card>
      <Card><div style={{fontSize:12,color:"#888"}}>Pendiente</div><strong style={{color:"#f39c12"}}>${pending.toLocaleString("es-AR")}</strong></Card>
    </div>

    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
      {(["today","week","month"] as Period[]).map(p => <button key={p} onClick={()=>setPeriod(p)} style={{padding:"6px 12px",borderRadius:8,border:"none",background:period===p?"#1a1a2e":"#eee",color:period===p?"#fff":"#333",cursor:"pointer"}}>{p==="today"?"Hoy":p==="week"?"7 días":"30 días"}</button>)}
      <button onClick={()=>setPeriod("custom")} style={{padding:"6px 12px",borderRadius:8,border:"none",background:period==="custom"?"#1a1a2e":"#eee",color:period==="custom"?"#fff":"#333",cursor:"pointer"}}>Personalizado</button>
      {period==="custom" && <><input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} style={{padding:"6px 10px",border:"1px solid #ddd",borderRadius:8}}/><input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} style={{padding:"6px 10px",border:"1px solid #ddd",borderRadius:8}}/></>}
    </div>

    {loading ? <Loading/> : expenses.length===0 ? <Empty message="Sin gastos registrados"/> : <div style={{display:"grid", gap:10}}>{expenses.map(e => <Card key={e.id}>
      <div style={{display:"flex", justifyContent:"space-between", gap:12, alignItems:"flex-start"}}>
        <div style={{minWidth:0}}>
          <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:4}}><strong>{e.expense_number}</strong>{e.category_name && <Badge>{e.category_name}</Badge>}{e.payment_status_name && <Badge color={e.payment_status_color||"#888"}>{e.payment_status_name}</Badge>}</div>
          <div style={{fontSize:14,fontWeight:700}}>{e.description}</div>
          <div style={{fontSize:12,color:"#888",marginTop:3}}>{e.provider_name || "Sin proveedor"} · {new Date(e.issue_date).toLocaleDateString("es-AR")}{e.due_date ? ` · vence ${new Date(e.due_date).toLocaleDateString("es-AR")}` : ""}</div>
          {e.notes && <div style={{fontSize:12,color:"#666",marginTop:5}}>{e.notes}</div>}
        </div>
        <div style={{textAlign:"right", minWidth:130}}><div style={{fontSize:18,fontWeight:800}}>${Number(e.total).toLocaleString("es-AR")}</div>{Number(e.payment_pending)>0 && <div style={{fontSize:12,color:"#f39c12"}}>Pend. ${Number(e.payment_pending).toLocaleString("es-AR")}</div>}
          <div style={{display:"flex", gap:4, justifyContent:"flex-end", marginTop:8, flexWrap:"wrap"}}><button onClick={()=>openEdit(e)} title="Editar" style={{padding:"5px 8px",border:"1px solid #ddd",borderRadius:6,background:"#fff",cursor:"pointer"}}>✏️</button>{Number(e.payment_pending)>0 && <button onClick={()=>openPay(e)} title="Pagar" style={{padding:"5px 8px",border:"1px solid #27ae60",borderRadius:6,background:"#f0fff4",cursor:"pointer"}}>💸</button>}<button onClick={()=>remove(e)} title="Eliminar" style={{padding:"5px 8px",border:"1px solid #ddd",borderRadius:6,background:"#fff",cursor:"pointer",color:"#e74c3c"}}>🗑️</button></div>
        </div>
      </div>
    </Card>)}</div>}

    {showForm && <Modal onClose={()=>setShowForm(false)} title={editing?"Editar gasto":"Nuevo gasto"}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <select value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})} style={input}><option value="">Categoría</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select value={form.provider_id} onChange={e=>setForm({...form,provider_id:e.target.value})} style={input}><option value="">Proveedor/beneficiario</option>{providers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Descripción" style={{...input,gridColumn:"1/-1"}} />
        <input type="date" value={form.issue_date} onChange={e=>setForm({...form,issue_date:e.target.value})} style={input}/>
        <input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} style={input}/>
        <input type="number" value={form.total} onChange={e=>setForm({...form,total:e.target.value})} placeholder="Monto" style={input}/>
        <input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notas" style={input}/>
      </div>
      <Actions onCancel={()=>setShowForm(false)} onSave={saveExpense} saving={saving}/>
    </Modal>}

    {showPay && <Modal onClose={()=>setShowPay(null)} title={`Pagar ${showPay.expense_number}`}>
      <select value={payForm.financial_account_id} onChange={e=>setPayForm({...payForm,financial_account_id:e.target.value})} style={input}><option value="">Cuenta de pago</option>{methods.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
      <input type="number" value={payForm.amount} onChange={e=>setPayForm({...payForm,amount:e.target.value})} placeholder="Monto" style={input}/>
      <input value={payForm.notes} onChange={e=>setPayForm({...payForm,notes:e.target.value})} placeholder="Notas" style={input}/>
      <Actions onCancel={()=>setShowPay(null)} onSave={payExpense} saving={saving}/>
    </Modal>}
  </div>;
}

const input: React.CSSProperties = { width:"100%", padding:"9px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13, boxSizing:"border-box" };
function Modal({children,title,onClose}:{children:React.ReactNode;title:string;onClose:()=>void}) { return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&onClose()}><div style={{background:"#fff",borderRadius:16,padding:22,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto"}}><h3 style={{margin:"0 0 14px"}}>{title}</h3>{children}</div></div>; }
function Actions({onCancel,onSave,saving}:{onCancel:()=>void;onSave:()=>void;saving:boolean}) { return <div style={{display:"flex",gap:8,marginTop:14}}><button onClick={onCancel} style={{flex:1,padding:10,borderRadius:8,border:"1px solid #ddd",background:"#fff",cursor:"pointer"}}>Cancelar</button><button onClick={onSave} disabled={saving} style={{flex:1,padding:10,borderRadius:8,border:"none",background:"#1a1a2e",color:"#fff",fontWeight:700,cursor:"pointer"}}>{saving?"Guardando...":"Guardar"}</button></div>; }
