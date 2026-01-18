import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db.js";

const email = "admin@clairprojet.fr";
const newPassword = "Sleazy@68100!"; // <-- change ici

async function main() {
  const hash = await bcrypt.hash(newPassword, 12);

  const user = await prisma.user.update({
    where: { email },
    data: { passwordHash: hash },
  });

  console.log("✅ Mot de passe mis à jour pour :", user.email);
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
