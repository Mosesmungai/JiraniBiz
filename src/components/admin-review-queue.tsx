"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Business } from "@/lib/data";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription";

type ReviewAction = "confirm_payment" | "reject_payment" | "approve_verification" | "reject_verification";

export function AdminReviewQueue({ businesses }: { businesses: Business[] }) {
  const router = useRouter();
  const [busyBusinessId, setBusyBusinessId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function review(businessId: string, action: ReviewAction) {
    setBusyBusinessId(businessId);
    setError("");
    try {
      const response = await fetch(`/api/admin/businesses/${encodeURIComponent(businessId)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = typeof payload === "object" && payload !== null && "error" in payload &&
          typeof payload.error === "string" ? payload.error : "Review action failed.";
        throw new Error(message);
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Review action failed.");
    } finally {
      setBusyBusinessId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)]">
      <div>
        <p className="eyebrow">Operations</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">Payment and verification review</h2>
        <p className="mt-1 text-sm text-slate-600">Confirm mobile-money receipts against your provider statement. Approve location evidence only after checking the submitted photos and verification result.</p>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {businesses.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No subscriptions or location checks are waiting for review.</p>
      ) : (
        <div className="mt-5 divide-y divide-slate-100">
          {businesses.map((business) => {
            const paymentPending = business.subscription?.status === "payment_review" ||
              business.subscription?.status === "renewal_review";
            const verificationPending = business.verification.status === "review";
            return (
              <article key={business.id} className="grid gap-4 py-5 sm:grid-cols-[112px_1fr]">
                <Image
                  src={business.image}
                  alt={`${business.name} business photo`}
                  width={224}
                  height={168}
                  className="h-28 w-full rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">{business.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">{business.area}, {business.city}, {business.country}{business.region ? ` · ${business.region}` : ""}</p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">{business.publicationStatus?.replaceAll("_", " ")}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    {business.subscription && <span>{SUBSCRIPTION_PLANS[business.subscription.planId].label} · KES {business.subscription.monthlyPriceKsh.toLocaleString()}/month · {business.subscription.status.replaceAll("_", " ")}</span>}
                    <span>Location check: {business.verification.status}</span>
                    {business.subscription?.paymentReference && <span>Payment reference: <strong>{business.subscription.paymentReference}</strong></span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                    {(business.photos ?? []).map((photo, index) => (
                      <a key={photo} href={photo} target="_blank" rel="noreferrer" className="text-xs font-medium text-emerald-800 underline">
                        Open listing photo {index + 1}
                      </a>
                    ))}
                    {business.verification.photoUploads.map((photo, index) => photo.startsWith("https://")
                      ? <a key={photo} href={photo} target="_blank" rel="noreferrer" className="text-xs font-medium text-emerald-800 underline">Open verification photo {index + 1}</a>
                      : null)}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {paymentPending && (
                      <>
                        <button type="button" disabled={busyBusinessId === business.id} onClick={() => review(business.id, "confirm_payment")} className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Confirm payment</button>
                        <button type="button" disabled={busyBusinessId === business.id} onClick={() => review(business.id, "reject_payment")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Reject payment</button>
                      </>
                    )}
                    {verificationPending && (
                      <>
                        <button type="button" disabled={busyBusinessId === business.id} onClick={() => review(business.id, "approve_verification")} className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Approve location</button>
                        <button type="button" disabled={busyBusinessId === business.id} onClick={() => review(business.id, "reject_verification")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Reject verification</button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
