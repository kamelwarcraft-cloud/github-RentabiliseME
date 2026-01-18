import { Suspense } from "react";
import SetPasswordClient from "./SetPasswordClient";

// Cette page dépend des query params (?token=...), on évite le prerender statique.
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={<p className="mt-6 text-sm text-zinc-400">Chargement…</p>}>
        <SetPasswordClient />
      </Suspense>
    </div>
  );
}
