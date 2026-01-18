export function inviteEmailTemplate(params: {
  inviteUrl: string;
  invitedBy?: string;
  companyName?: string;
  role: "MANAGER" | "WORKER";
}) {
  const { inviteUrl, invitedBy, companyName, role } = params;

  const roleLabel = role === "MANAGER" ? "Gestionnaire" : "Collaborateur";
  const subject = `🎉 Invitation à rejoindre ${companyName ?? "Rentabilise.me"}`;

  const text = `Bonjour,

${invitedBy ? `${invitedBy} vous invite` : "Vous êtes invité"} à rejoindre ${companyName ?? "Rentabilise.me"} en tant que ${roleLabel}.

Créez votre compte ici :
${inviteUrl}

Ce lien expire dans 7 jours.
`;

  const html = `<!doctype html>
<html><body style="margin:0;background:#0b0f19;padding:24px;font-family:Arial">
  <div style="max-width:640px;margin:0 auto;background:#0f172a;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden">
    <div style="padding:18px 22px;background:#0b1220;color:#fff">
      <div style="font-size:16px;font-weight:700">Rentabilise.me</div>
      <div style="opacity:.7;font-size:12px">${companyName ?? ""}</div>
    </div>
    <div style="padding:22px;color:#e5e7eb">
      <h1 style="margin:0 0 10px;font-size:20px">Bienvenue 👋</h1>
      <p style="margin:0 0 14px;line-height:1.6;color:#cbd5e1">
        ${invitedBy ? `<b>${invitedBy}</b> vous invite` : "Vous êtes invité"} à rejoindre
        <b>${companyName ?? "Rentabilise.me"}</b> en tant que <b>${roleLabel}</b>.
      </p>
      <p style="margin:0 0 18px;line-height:1.6;color:#cbd5e1">
        Cliquez ci-dessous pour créer votre mot de passe et activer votre compte.
      </p>

      <p style="text-align:center;margin:18px 0 22px">
        <a href="${inviteUrl}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">
          Créer mon compte
        </a>
      </p>

      <p style="margin:0 0 8px;font-size:12px;color:#94a3b8">Lien de secours :</p>
      <p style="margin:0;font-size:12px;word-break:break-all">
        <a href="${inviteUrl}" style="color:#60a5fa">${inviteUrl}</a>
      </p>

      <hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:18px 0" />
      <p style="margin:0;font-size:12px;color:#94a3b8">
        Ce lien expire dans 7 jours. Si vous n’êtes pas concerné, ignorez cet email.
      </p>
    </div>
  </div>
</body></html>`;

  return { subject, html, text };
}
