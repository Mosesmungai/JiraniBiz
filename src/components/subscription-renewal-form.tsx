"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId, type SubscriptionStatus } from "@/lib/subscription";

type PaymentInstructions = {
  paybill: string;
  till: string;
};

export function SubscriptionRenewalForm({
  businessId,
  planId,
  status,
  expiresAt,
  paymentInstructions,
}: {
  businessId: string;
  planId: SubscriptionPlanId;
  status: SubscriptionStatus;
  expiresAt: string;
  paymentInstructions: PaymentInstructions;
}) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const plan = SUBSCRIPTION_PLANS[planId];

  if (status === "payment_review" || status === "renewal_review") {
    return <p className="mt-3 text-sm text-amber-800">Payment reference submitted; waiting for administrator confirmation.</p>;
  }

  if (status !== "awaiting_payment" && status !== "trialing" && status !== "active" && status !== "expired") {
    return null;
  }

  const merchantConfigured = Boolean(paymentInstructions.paybill || paymentInstructions.till);

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      const payload: unknown = await response.json();
      const error = typeof payload === "object" && payload !== null && "error" in payload &&
        typeof payload.error === "string" ? payload.error : "Unable to submit the payment reference.";
      if (!response.ok) throw new Error(error);
      setSubmitted(true);
      setMessage("Reference received. The subscription will activate or extend after an administrator confirms the payment.");
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to submit the payment reference.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="text-sm font-semibold text-slate-900">
        {status === "awaiting_payment" ? "Complete your first month" : "Renew or extend visibility"}
      </h4>
      {merchantConfigured ? (
        <>
          <p className="mt-2 text-sm text-slate-700">
            Pay KES {plan.monthlyPriceKsh.toLocaleString()} for one month by M-Pesa{" "}
            {paymentInstructions.paybill
              ? <>to Paybill <strong>{paymentInstructions.paybill}</strong>, using the business name as the account number</>
              : <>to Till <strong>{paymentInstructions.till}</strong></>}.
            {expiresAt && status !== "awaiting_payment"
              ? ` Any confirmed renewal extends from ${new Date(expiresAt).toLocaleDateString("en-KE")} if your current access is still active.`
              : ""}
            {" "}We verify each transaction manually before activating or extending visibility.
          </p>
          {submitted ? (
            <p className="mt-3 text-sm font-medium text-emerald-800" role="status">{message}</p>
          ) : (
            <form onSubmit={submitPayment} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value.toUpperCase())}
                placeholder="M-Pesa transaction code"
                autoComplete="off"
                minLength={6}
                maxLength={32}
                pattern="[A-Za-z0-9]{6,32}"
                required
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
              />
              <button type="submit" disabled={submitting} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {submitting ? "Submitting…" : "Submit reference"}
              </button>
            </form>
          )}
          {message && !submitted && <p className="mt-2 text-sm text-rose-700" role="alert">{message}</p>}
        </>
      ) : (
        <p className="mt-2 text-sm text-amber-900">
          Payment instructions are not configured. Do not send money; contact JiraniBiz support for payment instructions.
        </p>
      )}
    </div>
  );
}
