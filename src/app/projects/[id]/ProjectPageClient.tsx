"use client";

import { useState } from "react";
import ProjectClient from "./ProjectClient";
import ProjectRevenueEditor from "./ProjectRevenueEditor";
import ProjectManagementClient from "./ProjectManagementClient";

export default function ProjectPageClient({
  projectId,
  initialRevenueCents,
  userRole,
  userId,
}: {
  projectId: string;
  initialRevenueCents: number;
  userRole: "ADMIN" | "MANAGER" | "WORKER";
  userId: string;
}) {
  // Key pour forcer le rechargement de tous les composants
  const [refreshKey, setRefreshKey] = useState(0);

  // Source de vérité côté client pour le CA (évite un "initial" figé)
  const [currentRevenueCents, setCurrentRevenueCents] = useState(initialRevenueCents);

  // Valeur temporaire pendant l'édition (mise à jour en temps réel entre widgets)
  const [revenueDraftCents, setRevenueDraftCents] = useState<number | null>(null);

  function triggerRefresh() {
    setRefreshKey(prev => prev + 1);
  }

  return (
    <div className="space-y-4">
      {/* Vue financière avec key pour forcer re-render */}
      <ProjectClient
        key={`client-${refreshKey}`}
        projectId={projectId}
        onDataChanged={triggerRefresh}
        revenueOverrideCents={revenueDraftCents}
      />

      {/* Éditeur de CA (uniquement MANAGER/ADMIN) */}
      {(userRole === "ADMIN" || userRole === "MANAGER") && (
        <ProjectRevenueEditor
          key={`revenue-${refreshKey}`}
          projectId={projectId}
          initialRevenueCents={currentRevenueCents}
          userRole={userRole}
          onLiveChange={(cents) => setRevenueDraftCents(cents)}
          onCancel={() => setRevenueDraftCents(null)}
          onUpdate={(newRevenueCents) => {
            setCurrentRevenueCents(newRevenueCents);
            setRevenueDraftCents(null);
            triggerRefresh();
          }}
        />
      )}

      {/* Gestion des heures et dépenses */}
      <ProjectManagementClient
        key={`management-${refreshKey}`}
        projectId={projectId}
        userRole={userRole}
        userId={userId}
        onDataChanged={triggerRefresh}
      />
    </div>
  );
}
