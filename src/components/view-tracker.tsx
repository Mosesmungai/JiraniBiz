"use client";

import { useEffect } from "react";
import { rememberViewedBusiness } from "./recent-activity";

export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => { rememberViewedBusiness(slug); }, [slug]);
  return null;
}
