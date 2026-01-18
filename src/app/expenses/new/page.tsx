"use client";

import { Suspense } from "react";
import ExpenseForm from "./ExpenseForm";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-400">Chargement…</div>}>
      <ExpenseForm />
    </Suspense>
  );
}
