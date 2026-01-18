"use client";

import { Suspense } from "react";
import TimeForm from "./TimeForm";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-400">Chargement…</div>}>
      <TimeForm />
    </Suspense>
  );
}
