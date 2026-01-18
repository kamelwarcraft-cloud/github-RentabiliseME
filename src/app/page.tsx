"use client";

import { useState } from "react";
import { Btn, Card, H1, Label } from "./_ui/ui";

export default function Home() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const res = await fetch("/api/waitlist", {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "landing_rentabilise" }),
    });

    setLoading(false);
    if (!res.ok) {
      setMsg("Erreur. Réessaie ou contacte-nous.");
      return;
    }
    setMsg("✅ Demande reçue. On te contacte pour l’accès bêta.");
    setEmail("");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        {/* LEFT */}
        <div className="pt-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1 text-xs text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Bêta ouverte — places limitées
          </div>

          <div className="mt-3 text-xs text-zinc-400">rentabilise.me</div>

          <H1>
            Saisis tes heures + dépenses.
            <br />
            Rentabilise.me te dit si tu gagnes ou si tu perds.
          </H1>

          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            Pour indépendants & petites entreprises : une rentabilité{" "}
            <b>instantanée</b> par activité (mission, projet, projet, client…).
            Marge €, marge %, statut clair et surtout :{" "}
            <b>combien de temps il te reste avant d’être en perte</b>.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Btn href="/login">Accéder à l’app</Btn>
            <Btn href="#beta" variant="secondary">
              Demander accès bêta
            </Btn>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Card>
              <Label>Saisie terrain</Label>
              <div className="mt-1 text-sm font-semibold">10 secondes</div>
              <div className="mt-1 text-xs text-zinc-400">
                Heures + dépenses, mobile-first.
              </div>
            </Card>

            <Card>
              <Label>Rentabilité</Label>
              <div className="mt-1 text-sm font-semibold">Marge € / % + seuil</div>
              <div className="mt-1 text-xs text-zinc-400">
                RENTABLE • À RISQUE • NON RENTABLE
              </div>
            </Card>

            <Card>
              <Label>Décision</Label>
              <div className="mt-1 text-sm font-semibold">Tu sais quand agir</div>
              <div className="mt-1 text-xs text-zinc-400">
                Avant qu’il ne soit trop tard.
              </div>
            </Card>
          </div>

          <div className="mt-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-xs text-zinc-400">Le “moment wow”</div>
            <div className="mt-2 text-sm text-zinc-200">
              <span className="font-semibold text-emerald-200">RENTABLE</span>{" "}
              → “Tu gagnes actuellement <b>+420 €</b>. Il te reste environ <b>12h</b>{" "}
              avant d’être en perte.”
            </div>
            <div className="mt-1 text-sm text-zinc-200">
              <span className="font-semibold text-amber-200">À RISQUE</span>{" "}
              → “Attention, tu arrives au seuil de rentabilité.”
            </div>
            <div className="mt-1 text-sm text-zinc-200">
              <span className="font-semibold text-red-200">NON RENTABLE</span>{" "}
              → “Tu perds actuellement <b>180 €</b>. Tu as dépassé le seuil de{" "}
              rentabilité de <b>8h</b>.”
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <Card>
          <div className="text-sm font-semibold">Démo en 30 secondes</div>
          <p className="mt-2 text-sm text-zinc-300">
            1) Crée une activité • 2) Ajoute 3h • 3) Ajoute 120€ • 4) Le statut
            et la phrase “temps avant perte” apparaissent.
          </p>

          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-zinc-400">Résultat (exemple)</div>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-900/60 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-200">
                  RENTABLE
                </div>
                <div className="mt-3 text-sm text-zinc-200">
                  Tu gagnes actuellement <b>+420 €</b>.
                </div>
                <div className="mt-1 text-sm text-zinc-300">
                  Il te reste environ <b>12 h</b> avant d’être en perte.
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-zinc-400">Marge</div>
                <div className="mt-1 text-lg font-extrabold text-zinc-100">
                  +420 €
                </div>
                <div className="text-xs text-zinc-400">+18%</div>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="text-xs text-zinc-400">Coûts réels</div>
                <div className="mt-1 text-sm font-semibold">1 140 €</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="text-xs text-zinc-400">Chiffre d’affaires</div>
                <div className="mt-1 text-sm font-semibold">2 500 €</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="text-xs text-zinc-400">Heures réelles</div>
                <div className="mt-1 text-sm font-semibold">3 h</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="text-xs text-zinc-400">Seuil critique</div>
                <div className="mt-1 text-sm font-semibold">~ 12 h restantes</div>
              </div>
            </div>
          </div>

          <div id="beta" className="mt-6">
            <div className="text-sm font-semibold">Demander l’accès bêta</div>
            <p className="mt-1 text-sm text-zinc-400">
              On active ton compte et on t’accompagne sur ta première activité.
            </p>

            <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
                placeholder="Email pro"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Btn type="submit" disabled={loading}>
                {loading ? "Envoi..." : "Demander"}
              </Btn>
            </form>

            {msg && (
              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                {msg}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-sm font-semibold">Bêta — limites (volontaires)</div>
            <ul className="mt-2 list-disc pl-5 text-sm text-zinc-300">
              <li>3 activités actives maximum</li>
              <li>1 utilisateur</li>
              <li>Export PDF avec watermark</li>
            </ul>
          </div>
        </Card>
      </div>

      <div className="mt-10 border-t border-zinc-800 pt-6 text-xs text-zinc-500">
        © {new Date().getFullYear()} Rentabilise.me — Version bêta
      </div>
    </div>
  );
}
