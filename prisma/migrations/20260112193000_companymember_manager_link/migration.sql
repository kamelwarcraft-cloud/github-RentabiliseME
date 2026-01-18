-- Ajout du rattachement WORKER -> MANAGER (inviteur)
ALTER TABLE "CompanyMember" ADD COLUMN IF NOT EXISTS "managerUserId" TEXT;

-- FK vers User (si supporté)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CompanyMember_managerUserId_fkey'
  ) THEN
    ALTER TABLE "CompanyMember"
    ADD CONSTRAINT "CompanyMember_managerUserId_fkey"
    FOREIGN KEY ("managerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "CompanyMember_managerUserId_idx" ON "CompanyMember"("managerUserId");
