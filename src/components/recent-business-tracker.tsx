"use client";

import { useEffect } from "react";
import { useDiscoveryPreferences } from "@/components/discovery-preferences-provider";

type RecentBusinessTrackerProps = {
  business: {
    id: string;
    slug: string;
    name: string;
    category: string;
    city: string;
    area: string;
  };
};

export function RecentBusinessTracker({ business }: RecentBusinessTrackerProps) {
  const { ready, saveBusinessView } = useDiscoveryPreferences();

  useEffect(() => {
    if (!ready) return;
    saveBusinessView(business);
  }, [
    business.area,
    business.category,
    business.city,
    business.id,
    business.name,
    business.slug,
    business,
    ready,
    saveBusinessView,
  ]);

  return null;
}
