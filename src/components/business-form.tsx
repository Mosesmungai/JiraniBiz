"use client";

import { useState } from "react";

export function BusinessForm() {
  const [form, setForm] = useState({
    name: "",
    category: "Cleaning",
    city: "Nairobi",
    area: "Westlands",
    country: "Kenya",
    description: "",
    phone: "",
    email: "",
  });
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message: string }>({
    type: "idle",
    message: "",
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ type: "idle", message: "Submitting..." });

    const response = await fetch("/api/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const result = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: result.error || "Unable to add business." });
      return;
    }

    setStatus({ type: "success", message: "Business added successfully and is now live." });
    setForm({
      name: "",
      category: "Cleaning",
      city: "Nairobi",
      area: "Westlands",
      country: "Kenya",
      description: "",
      phone: "",
      email: "",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-700">New listing</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Add a local business</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Business name
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300"
            placeholder="e.g. Kingsway Cleaning"
            required
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Category
          <select
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none focus:border-slate-300"
          >
            <option>Cleaning</option>
            <option>Plumbing</option>
            <option>Beauty</option>
            <option>Repair</option>
            <option>Events</option>
            <option>Tutors</option>
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          City
          <input
            value={form.city}
            onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300"
            placeholder="Nairobi"
            required
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Country
          <select
            value={form.country}
            onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none focus:border-slate-300"
          >
            <option value="Kenya">Kenya</option>
            <option value="Uganda">Uganda</option>
            <option value="Tanzania">Tanzania</option>
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Area
          <input
            value={form.area}
            onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300"
            placeholder="Westlands"
            required
          />
        </label>

        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Description
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            className="mt-2 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300"
            placeholder="Tell customers what services you offer, how quickly you respond and what makes your business reliable."
            required
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Phone
          <input
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300"
            placeholder="+254 700 123 456"
            required
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300"
            placeholder="hello@business.co.ke"
            required
          />
        </label>
      </div>

      {status.message && (
        <div
          className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
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

      <button type="submit" className="mt-6 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
        Submit business
      </button>
    </form>
  );
}
