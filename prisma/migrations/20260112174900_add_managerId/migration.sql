-- Ajouter le champ managerId
ALTER TABLE "Project" ADD COLUMN "managerId" TEXT;

-- Créer un index pour les performances
CREATE INDEX "Project_managerId_idx" ON "Project"("managerId");

-- Assigner les projets existants au premier ADMIN/MANAGER de chaque company
UPDATE "Project" p
SET "managerId" = (
  SELECT cm."userId"
  FROM "CompanyMember" cm
  WHERE cm."companyId" = p."companyId"
    AND cm."role" IN ('ADMIN', 'MANAGER')
  ORDER BY cm."createdAt" ASC
  LIMIT 1
)
WHERE "managerId" IS NULL;