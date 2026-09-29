"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export function BookingForm({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Submitting...");
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, scheduledAt, notes }),
    });
    const data = await response.json();
    setStatus(response.ok ? "Booking request sent." : data.error ?? "Unable to submit booking.");
    if (response.ok) {
      setScheduledAt("");
      setNotes("");
    }
  }

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-xs uppercase tracking-[0.2em] text-teal-700">Request a booking</div>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">Book {businessName}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">Choose a preferred date and time. The business owner will confirm the request.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Preferred date and time</label>
          <input required type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Tell the business what you need" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500" />
        </div>
        <button type="submit" className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Send booking request</button>
      </form>
      {status && <p className="mt-4 text-sm text-slate-600">{status}</p>}
      <p className="mt-4 text-xs text-slate-500">You need an account to request a booking. <Link href="/auth" className="font-semibold text-slate-900">Sign in</Link></p>
    </div>
  );
}
