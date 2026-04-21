"use client";

import { useEffect, useState } from "react";
import { fetchJson, formatDate, money, putJson } from "../lib";
import type { Complaint } from "../types";
import styles from "../page.module.css";

type Props = {
  complaintId: number;
  onClose: () => void;
  onUpdated: () => void;
};

export default function ComplaintDetailModal({ complaintId, onClose, onUpdated }: Props) {
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchJson<Complaint[]>(`/reclamos`)
      .then((all) => {
        const c = all.find((x) => x.id === complaintId);
        if (c) {
          setComplaint(c);
          setStatus(c.status);
        }
      })
      .catch(() => setError("No se pudo cargar"));
  }, [complaintId]);

  if (!complaint) return null;

  async function save() {
    try {
      await putJson(`/reclamos/${complaintId}`, { status });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{complaint.title || complaint.reason}</h2>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalSection}>
          <p><strong>Motivo:</strong> {complaint.reason}</p>
          {complaint.description && <p><strong>Descripción:</strong> {complaint.description}</p>}
          {complaint.product_name && <p><strong>Producto:</strong> {complaint.product_name}</p>}
          {complaint.order_number && <p><strong>Pedido:</strong> #{complaint.order_number}</p>}
          {complaint.client_name && <p><strong>Cliente:</strong> {complaint.client_name}</p>}
          {complaint.client_phone && <p><strong>Teléfono:</strong> {complaint.client_phone}</p>}
          <p><strong>Fecha:</strong> {formatDate(complaint.created_at)}</p>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
          <label className={styles.field} style={{ flex: 1, margin: 0 }}>
            Estado
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="open">Abierto</option>
              <option value="investigating">En investigación</option>
              <option value="resolved">Resuelto</option>
            </select>
          </label>
          <button className={styles.button} type="button" onClick={save}>Guardar</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {complaint.status === "resolved" && (
            <button className={styles.ghostButton} type="button" onClick={() => { setStatus("open"); save(); }}>Volver a abrir</button>
          )}
        </div>

        {error && <p style={{ color: "red", marginTop: 8 }}>{error}</p>}

        <div style={{ marginTop: 12 }}>
          <button className={styles.secondaryButton} type="button" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
