import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ProjectPageClient from "./ProjectPageClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const p = await Promise.resolve(params);
  const auth = await getAuth();

  if (!auth) {
    redirect("/login");
  }

  // Récupérer les infos du projet
  const project = await prisma.project.findFirst({
    where: { id: p.id, companyId: auth.companyId },
    select: { revenueCents: true, name: true },
  });

  if (!project) {
    redirect("/dashboard");
  }

  return (
    <ProjectPageClient
      projectId={p.id}
      initialRevenueCents={project.revenueCents}
      userRole={auth.role}
      userId={auth.userId}
    />
  );
}
