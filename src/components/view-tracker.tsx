"use client";

import { useEffect } from "react";
import { rememberViewedBusiness } from "./recent-activity";

const pendingViews = new Set<string>();

export function ViewTracker({ businessId, slug }: { businessId: string; slug: string }) {
  useEffect(() => {
    rememberViewedBusiness(slug);
    const key = `jiranibiz:profile-view:${businessId}`;
    if (pendingViews.has(key)) return;
    try {
      if (sessionStorage.getItem(key)) return;
      pendingViews.add(key);
    } catch {
      pendingViews.add(key);
    }

    void fetch(`/api/businesses/${encodeURIComponent(businessId)}/views`, {
      method: "POST",
      keepalive: true,
    }).then((response) => {
      if (!response.ok) throw new Error(`Profile view tracking failed (${response.status}).`);
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        return;
      }
    }).catch((error: unknown) => {
      console.error("Unable to record business profile view", error);
    }).finally(() => {
      pendingViews.delete(key);
    });
  }, [businessId, slug]);
  return null;
}
