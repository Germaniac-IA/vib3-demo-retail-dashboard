"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Resumen" },
  { href: "/clients", label: "Clientes" },
  { href: "/orders", label: "Pedidos" },
  { href: "/entregas", label: "Entregas" },
  { href: "/leads", label: "Leads" },
  { href: "/reclamos", label: "Reclamos" },
  { href: "/products", label: "Productos" },
  { href: "/users", label: "Usuarios" },
];

export function DashboardShell({
  styles,
  title,
  subtitle,
  actions,
  children,
}: {
  styles: Record<string, string>;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.brandOverline}>Panel comercial</p>
          <h1 className={styles.brand}>Cristal Piscinas</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        {actions ? <div className={styles.headerCard}>{actions}</div> : null}
      </header>

      <nav className={styles.tabs}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.tab} ${pathname === item.href ? styles.tabActive : ""}`.trim()}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <section className={styles.heroCard}>
        <div>
          <p className={styles.sectionEyebrow}>Dashboard</p>
          <h2 className={styles.heroTitle}>{title}</h2>
        </div>
      </section>

      {children}
    </main>
  );
}

export function Panel({
  styles,
  title,
  description,
  children,
}: {
  styles: Record<string, string>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({
  styles,
  status,
  label,
}: {
  styles: Record<string, string>;
  status: string;
  label?: string;
}) {
  const normalized = status.toLowerCase();
  const cls =
    normalized === "delivered" || normalized === "paid"
      ? styles.statusDelivered
      : normalized === "confirmed"
        ? styles.statusConfirmed
        : normalized === "cancelled"
          ? styles.statusCancelled
          : styles.statusPending;

  return <span className={`${styles.statusBadge} ${cls}`}>{label || status}</span>;
}
