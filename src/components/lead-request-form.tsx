"use client";

import { useState } from "react";

export function LeadRequestForm({ businessSlug, businessName }: { businessSlug: string; businessName: string }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    message: "",
  });
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message: string }>({
    type: "idle",
    message: "",
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ type: "idle", message: "Sending request..." });

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessSlug,
        businessName,
        ...form,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: result.error || "Unable to send request." });
      return;
    }

    setStatus({ type: "success", message: "Your request has been submitted successfully." });
    setForm({ name: "", phone: "", message: "" });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)]">
      <h2 className="text-lg font-semibold text-slate-900">Request a service</h2>
      <div className="mt-4 space-y-3">
        <input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400"
          placeholder="Your name"
          required
        />
        <input
          value={form.phone}
          onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400"
          placeholder="Phone number"
          required
        />
        <textarea
          value={form.message}
          onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
          className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400"
          placeholder="Tell us what you need"
          required
        />
        <button type="submit" className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
          Send request
        </button>
      </div>

      {status.message && (
        <div
          className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
            status.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : status.type === "error"
                ? "bg-red-50 text-red-700"
                : "bg-slate-100 text-slate-700"
          }`}
        >
          {status.message}
        </div>
      )}
    </form>
  );
}
