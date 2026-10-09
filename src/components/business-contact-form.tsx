"use client";

import { useState } from "react";
import type { SocialLinks } from "@/lib/data";
import { whatsappNumberFromLink } from "@/lib/business-contact";

type ContactFormState = {
  whatsappNumber: string;
  instagram: string;
  facebook: string;
  x: string;
  website: string;
};

type ContactStatus = { type: "idle" | "success" | "error"; message: string };

const fields: Array<{ key: Exclude<keyof ContactFormState, "whatsappNumber">; label: string; placeholder: string }> = [
  { key: "instagram", label: "Instagram profile", placeholder: "https://instagram.com/yourbusiness" },
  { key: "facebook", label: "Facebook page", placeholder: "https://facebook.com/yourbusiness" },
  { key: "x", label: "X profile", placeholder: "https://x.com/yourbusiness" },
  { key: "website", label: "Website", placeholder: "https://yourbusiness.com" },
];

export function BusinessContactForm({
  businessId,
  socials,
}: {
  businessId: string;
  socials: SocialLinks;
}) {
  const [form, setForm] = useState<ContactFormState>({
    whatsappNumber: whatsappNumberFromLink(socials.whatsapp),
    instagram: socials.instagram ?? "",
    facebook: socials.facebook ?? "",
    x: socials.x ?? "",
    website: socials.website ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<ContactStatus>({ type: "idle", message: "" });

  async function saveContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: "idle", message: "" });
    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/contact`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result: unknown = await response.json();
      const message = typeof result === "object" && result !== null && "error" in result &&
        typeof result.error === "string" ? result.error : "Unable to save contact links.";
      if (!response.ok) throw new Error(message);
      setStatus({ type: "success", message: "Your public contact links are up to date." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to save contact links.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-800 marker:hidden">
        Edit WhatsApp and social links
      </summary>
      <form onSubmit={saveContact} className="space-y-4 border-t border-slate-200 p-4">
        <label className="block text-sm font-medium text-slate-700">
          WhatsApp number
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.whatsappNumber}
            onChange={(event) => setForm((current) => ({ ...current, whatsappNumber: event.target.value }))}
            placeholder="+254 700 123 456"
            aria-describedby={`${businessId}-whatsapp-help`}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal outline-none"
          />
          <span id={`${businessId}-whatsapp-help`} className="mt-1 block text-xs font-normal text-slate-500">
            Use the international format with country code. We’ll create the WhatsApp chat link for you.
          </span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(({ key, label, placeholder }) => (
            <label key={key} className="block text-sm font-medium text-slate-700">
              {label}
              <input
                type="url"
                inputMode="url"
                autoComplete="url"
                value={form[key]}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                placeholder={placeholder}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal outline-none"
              />
            </label>
          ))}
        </div>
        <p className="text-xs leading-5 text-slate-500">
          Add full HTTPS links to your public profiles. For privacy and reliability, JiraniBiz links to profiles but does not fetch profile photos or embed third-party previews.
        </p>
        {status.message && (
          <p role={status.type === "error" ? "alert" : "status"} aria-live="polite" className={`rounded-xl px-3 py-2 text-sm ${status.type === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>
            {status.message}
          </p>
        )}
        <button type="submit" disabled={submitting} aria-busy={submitting} className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
          {submitting ? "Saving…" : "Save contact links"}
        </button>
      </form>
    </details>
  );
}
