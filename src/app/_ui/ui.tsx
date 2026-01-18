export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={"rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-sm " + className}>
      {children}
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-zinc-400">{children}</div>;
}

export function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>;
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold tracking-tight">{children}</h2>;
}

export function Btn({
  children,
  href,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const cls =
    variant === "primary"
      ? "bg-sky-600 hover:bg-sky-500 text-white"
      : variant === "secondary"
      ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800"
      : variant === "danger"
      ? "bg-red-600/20 hover:bg-red-600/30 text-red-200 border border-red-900/40"
      : "hover:bg-zinc-900 text-zinc-200";

  const base = `inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition disabled:opacity-60 ${cls}`;

  if (href) return <a className={base} href={href}>{children}</a>;
  return (
    <button type={type} className={base} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export type ProjectStatus = "RENTABLE" | "A_RISQUE" | "NON_RENTABLE";

export function statusLabel(status: ProjectStatus) {
  if (status === "A_RISQUE") return "À RISQUE";
  if (status === "NON_RENTABLE") return "NON RENTABLE";
  return "RENTABLE";
}

export function Badge({
  status,
  children,
}: {
  status: ProjectStatus;
  children?: React.ReactNode;
}) {
  const cls =
    status === "RENTABLE"
      ? "bg-emerald-600/15 text-emerald-200 ring-1 ring-emerald-600/30"
      : status === "A_RISQUE"
      ? "bg-amber-600/15 text-amber-200 ring-1 ring-amber-600/30"
      : "bg-red-600/15 text-red-200 ring-1 ring-red-600/30";

  return (
    <span className={`inline-flex items-center rounded-xl px-3 py-1 text-xs font-semibold ${cls}`}>
      {children ?? statusLabel(status)}
    </span>
  );
}

export function euros(cents: number) {
  const v = (cents / 100).toFixed(2).replace(".", ",");
  return `${v} €`;
}
