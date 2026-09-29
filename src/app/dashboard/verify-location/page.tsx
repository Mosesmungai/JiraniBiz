"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Business } from "@/lib/data";
import { LocationButton, type DeviceLocation } from "@/components/location-button";
import { formatDistance } from "@/lib/geo";

export default function VerifyLocationPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [location, setLocation] = useState<DeviceLocation | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetch("/api/businesses").then(r => r.json()).then(data => Array.isArray(data) && setBusinesses(data)).catch(() => setMessage("Could not load businesses.")); }, []);

  async function submit() {
    if (!businessId || !location || !photo) { setMessage("Select a business, allow precise location, and upload a photo."); return; }
    setSubmitting(true); setMessage("");
    const form = new FormData();
    form.append("businessId", businessId); form.append("photo", photo);
    form.append("latitude", String(location.latitude)); form.append("longitude", String(location.longitude)); form.append("accuracy", String(location.accuracy));
    try {
      const response = await fetch("/api/businesses/verify-location", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Verification failed.");
      setMessage(`Verification result: ${data.status}. Live location is ${formatDistance(data.liveDistanceKm)} from the registered business location.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Verification failed."); }
    finally { setSubmitting(false); }
  }

  return <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900"><div className="mx-auto max-w-3xl"><div className="mb-6 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-teal-700">Business verification</p><h1 className="mt-2 text-3xl font-semibold">Verify your physical location</h1><p className="mt-2 text-sm text-slate-600">JiraniBiz compares your live device location and the photo's embedded GPS metadata with the registered business coordinates.</p></div><Link href="/dashboard" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm">Dashboard</Link></div>
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <label className="block text-sm font-medium">Business<select value={businessId} onChange={e => setBusinessId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"><option value="">Select business</option>{businesses.map(b => <option key={b.id} value={b.id}>{b.name} — {b.area}, {b.city}</option>)}</select></label>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-sm font-semibold">1. Capture your current location</div><p className="mt-1 text-xs text-slate-500">High-accuracy browser geolocation is requested only when you press the button.</p><div className="mt-3"><LocationButton onLocation={setLocation} /></div>{location && <p className="mt-3 text-xs text-emerald-700">Location captured: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)} ± {Math.round(location.accuracy)} m</p>}</div>
      <label className="block text-sm font-medium">2. Upload a current photo of the business<input type="file" accept="image/*" capture="environment" onChange={e => setPhoto(e.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm" /></label>
      <button type="button" disabled={submitting} onClick={submit} className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Verifying…" : "Verify business location"}</button>
      {message && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">{message}</div>}
    </section></div></main>;
}
