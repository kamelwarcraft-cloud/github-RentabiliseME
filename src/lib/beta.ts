/**
 * Flags de build/produit pilotés via .env
 *
 * - BETA_MODE=ON  -> mode gratuit (bêta)
 * - BETA_MODE=OFF -> mode payant (UI placeholder pour l'instant)
 *
 * - BETA_LIMIT=ON  -> limites volontaires (3 projets actifs / 1 utilisateur / PDF watermark)
 * - BETA_LIMIT=OFF -> pas de limites (multi-workers, projets illimités, etc.)
 *
 * Compat ancienne variable: BETA_LIMITS=0 désactive les limites.
 */

export const BETA_LIMITS = {
  maxActiveProjects: 3,
  maxMembers: 1,
};

export function isBetaModeEnabled() {
  const v = (process.env.BETA_MODE ?? "ON").toUpperCase();
  return !(v === "OFF" || v === "0" || v === "FALSE");
}

export function isBetaLimitsEnabled() {
  // Ancien flag
  if (process.env.BETA_LIMITS === "0") return false;
  const v = (process.env.BETA_LIMIT ?? "ON").toUpperCase();
  return !(v === "OFF" || v === "0" || v === "FALSE");
}
