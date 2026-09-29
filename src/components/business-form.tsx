"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  isDeviceLocation,
  MAX_BUSINESS_LOCATION_ACCURACY_METERS,
  type DeviceLocation,
} from "@/lib/location";
import {
  REGIONS_BY_COUNTRY,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanId,
} from "@/lib/subscription";

type PaymentInstructions = {
  paybill: string;
  till: string;
};

async function prepareBusinessPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
    throw new Error("Choose an image smaller than 10 MB.");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the selected photo.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("This browser could not prepare the selected photo.")),
      "image/jpeg",
      0.88,
    );
  });
  const filename = file.name.replace(/\.[^.]+$/, "") || "business-photo";
  return new File([blob], `${filename}.jpg`, { type: "image/jpeg" });
}

function regionsForCountry(country: string): readonly string[] {
  if (country === "Kenya") return REGIONS_BY_COUNTRY.Kenya;
  if (country === "Uganda") return REGIONS_BY_COUNTRY.Uganda;
  if (country === "Tanzania") return REGIONS_BY_COUNTRY.Tanzania;
  return [];
}

export function BusinessForm({ paymentInstructions }: { paymentInstructions: PaymentInstructions }) {
  const [form, setForm] = useState({
    name: "",
    category: "Cleaning",
    city: "",
    area: "",
    country: "",
    description: "",
    phone: "",
    email: "",
    region: "",
  });
  const [planId, setPlanId] = useState<SubscriptionPlanId>("area");
  const [trial, setTrial] = useState(true);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoStatus, setPhotoStatus] = useState("");
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<{
    type: "loading" | "success" | "error";
    message: string;
  }>({ type: "loading", message: "Requesting your precise location…" });
  const [submitting, setSubmitting] = useState(false);
  const [createdBusinessId, setCreatedBusinessId] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentReferenceSubmitted, setPaymentReferenceSubmitted] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message: string }>({
    type: "idle",
    message: "",
  });

  const captureLocation = useCallback(() => {
    if (!window.isSecureContext) {
      setDeviceLocation(null);
      setLocationStatus({
        type: "error",
        message: "Precise location requires HTTPS (or localhost). Open the secure site and try again.",
      });
      return;
    }
    if (!navigator.geolocation) {
      setDeviceLocation(null);
      setLocationStatus({
        type: "error",
        message: "This browser does not support device location. Use a location-enabled browser to create this listing.",
      });
      return;
    }

    setLocationStatus({ type: "loading", message: "Requesting your precise location…" });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        };
        if (!isDeviceLocation(location)) {
          setDeviceLocation(null);
          setLocationStatus({
            type: "error",
            message: `The device-reported accuracy is ±${Math.round(coords.accuracy)} m. Move to a place with better reception and retry; a location accuracy of ${MAX_BUSINESS_LOCATION_ACCURACY_METERS} m or better is required.`,
          });
          return;
        }
        setDeviceLocation(location);
        setLocationStatus({
          type: "success",
          message: `Location captured from this device (reported accuracy ±${Math.round(coords.accuracy)} m).`,
        });
      },
      (error) => {
        setDeviceLocation(null);
        const message = error.code === error.PERMISSION_DENIED
          ? "Location permission was denied. Allow it in your browser settings and retry; business coordinates are required."
          : error.code === error.TIMEOUT
            ? "The location request timed out. Move to an area with a clearer signal and retry."
            : "Unable to read device location. Check your device location services and retry.";
        setLocationStatus({ type: "error", message });
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) captureLocation();
    });
    return () => {
      active = false;
    };
  }, [captureLocation]);

  async function selectPhotos(files: FileList | null) {
    const selected = files ? Array.from(files) : [];
    if (selected.length < 2) {
      setPhotos([]);
      setPhotoStatus("Upload at least two photos to continue.");
      return;
    }
    if (selected.length > 5) {
      setPhotos([]);
      setPhotoStatus("Upload no more than five photos.");
      return;
    }
    setPhotoStatus("Preparing photos and removing embedded location metadata…");
    try {
      const prepared = await Promise.all(selected.map(prepareBusinessPhoto));
      setPhotos(prepared);
      setPhotoStatus(`${prepared.length} photos ready. Private GPS metadata has been removed.`);
    } catch (error) {
      setPhotos([]);
      setPhotoStatus(error instanceof Error ? error.message : "Unable to prepare the selected photos.");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!deviceLocation) {
      setStatus({ type: "error", message: "Capture your precise device location before submitting this listing." });
      return;
    }
    setSubmitting(true);
    setStatus({ type: "idle", message: "Submitting..." });

    try {
      const body = new FormData();
      body.set("name", form.name);
      body.set("category", form.category);
      body.set("city", form.city);
      body.set("area", form.area);
      body.set("country", form.country);
      body.set("region", form.region);
      body.set("description", form.description);
      body.set("phone", form.phone);
      body.set("email", form.email);
      body.set("planId", planId);
      body.set("trial", String(trial));
      body.set("location", JSON.stringify(deviceLocation));
      photos.forEach((photo) => body.append("photos", photo));
      const response = await fetch("/api/businesses", { method: "POST", body });

      const result: unknown = await response.json();
      const errorMessage =
        typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : "Unable to add business.";

      if (!response.ok) {
        setStatus({ type: "error", message: errorMessage });
        return;
      }
      if (typeof result !== "object" || result === null || !("id" in result) || typeof result.id !== "string") {
        throw new Error("The listing was created but the server returned an invalid response.");
      }
      setCreatedBusinessId(result.id);
      setStatus({
        type: "success",
        message: trial
          ? "Your 7-day trial listing is created. Submit location verification to publish it."
          : "Your listing is created and will publish after payment and location approval.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to add business.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPaymentReference(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createdBusinessId) return;
    setPaymentSubmitting(true);
    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(createdBusinessId)}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: paymentReference }),
      });
      const payload: unknown = await response.json();
      const message = typeof payload === "object" && payload !== null && "error" in payload &&
        typeof payload.error === "string" ? payload.error : "Unable to submit payment reference.";
      if (!response.ok) throw new Error(message);
      setPaymentReferenceSubmitted(true);
      setStatus({ type: "success", message: "Payment reference submitted. Your subscription will activate after an administrator confirms it." });
      setPaymentReference("");
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Unable to submit payment reference." });
    } finally {
      setPaymentSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)] md:p-6">
      <div className="mb-6">
        <p className="eyebrow">New listing</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Add a local business</h2>
      </div>

      <fieldset disabled={Boolean(createdBusinessId)} className="contents">
      <section className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4" aria-label="Business GPS location">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Business location coordinates</h3>
            <p className="mt-1 text-xs text-slate-600">
              Your browser asks permission when this form opens. The device-reported coordinates fill in automatically and are saved with this listing.
            </p>
          </div>
          <button
            type="button"
            onClick={captureLocation}
            disabled={locationStatus.type === "loading"}
            className="rounded-full border border-emerald-800 px-4 py-2 text-xs font-semibold text-emerald-950 disabled:opacity-50"
          >
            {locationStatus.type === "loading" ? "Locating…" : "Refresh location"}
          </button>
        </div>
        <p
          className={`mt-3 text-sm ${
            locationStatus.type === "error"
              ? "text-rose-700"
              : locationStatus.type === "success"
                ? "text-emerald-800"
                : "text-slate-700"
          }`}
          role={locationStatus.type === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {locationStatus.message}
        </p>
        {deviceLocation && (
          <dl className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-3">
            <div><dt className="font-medium">Latitude</dt><dd>{deviceLocation.latitude.toFixed(7)}</dd></div>
            <div><dt className="font-medium">Longitude</dt><dd>{deviceLocation.longitude.toFixed(7)}</dd></div>
            <div><dt className="font-medium">Reported accuracy</dt><dd>±{Math.round(deviceLocation.accuracy)} m</dd></div>
          </dl>
        )}
        <p className="mt-2 text-xs text-slate-500">
          GPS precision varies by device, signal, and environment. For a useful business pin, the reported accuracy must be 100 m or better. Coordinates are required to create the listing; permission denial means the form cannot submit.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Business name
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="e.g. Kingsway Cleaning"
            required
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Category
          <select
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none"
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
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="City"
            required
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Country
          <select
            value={form.country}
            onChange={(event) => setForm((current) => ({ ...current, country: event.target.value, region: "" }))}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none"
            required
          >
            <option value="">Select a country</option>
            <option value="Kenya">Kenya</option>
            <option value="Uganda">Uganda</option>
            <option value="Tanzania">Tanzania</option>
          </select>
        </label>

        {planId === "region" && (
          <label className="text-sm font-medium text-slate-700">
            Service region
            <select
              value={form.region}
              onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none"
              required
            >
              <option value="">Select a region</option>
              {regionsForCountry(form.country).map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </label>
        )}

        <label className="text-sm font-medium text-slate-700">
          Area
          <input
            value={form.area}
            onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="Westlands"
            required
          />
        </label>

        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Description
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            className="mt-1.5 min-h-[112px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="Tell customers what services you offer, how quickly you respond and what makes your business reliable."
            required
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Phone
          <input
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400"
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
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="hello@business.co.ke"
            required
          />
        </label>

        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Business photos (2–5)
          <input
            type="file"
            accept="image/*"
            multiple
            required
            onChange={(event) => void selectPhotos(event.target.files)}
            className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">Photos are resized to protect customer privacy; embedded GPS and camera metadata are removed before storage.</span>
          {photoStatus && <span className="mt-1 block text-xs font-normal text-emerald-800" aria-live="polite">{photoStatus}</span>}
        </label>

        <div className="md:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800">Choose your visibility plan</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {(Object.values(SUBSCRIPTION_PLANS)).map((plan) => (
              <label key={plan.id} className={`cursor-pointer rounded-xl border p-3 ${planId === plan.id ? "border-emerald-800 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                <input type="radio" name="visibilityPlan" value={plan.id} checked={planId === plan.id} onChange={() => setPlanId(plan.id)} className="sr-only" />
                <span className="block text-sm font-semibold text-slate-900">{plan.label}</span>
                <span className="mt-1 block text-sm text-slate-600">KES {plan.monthlyPriceKsh.toLocaleString()} / month</span>
                <span className="mt-1 block text-xs text-slate-500">Top 100 eligible listings in this scope</span>
              </label>
            ))}
          </div>
          <label className="mt-3 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <input type="checkbox" checked={trial} onChange={(event) => setTrial(event.target.checked)} className="mt-0.5 accent-emerald-800" />
            <span><strong>Start with a 7-day free trial</strong><span className="block text-xs text-slate-500">Try the selected visibility scope for one week. After the trial, visibility pauses until payment is confirmed.</span></span>
          </label>
        </div>
      </div>
      </fieldset>

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

      {createdBusinessId ? (
        <div className="mt-5 space-y-4">
          {trial && (
            <Link href="/dashboard/verify-location" className="block w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white">
              Continue to location verification
            </Link>
          )}
          {!trial && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Pay for your first month</h3>
              {paymentInstructions.paybill || paymentInstructions.till ? (
                <>
                  <p className="mt-2 text-sm text-slate-700">
                    Send KES {SUBSCRIPTION_PLANS[planId].monthlyPriceKsh.toLocaleString()} by M-Pesa{" "}
                    {paymentInstructions.paybill
                      ? <>to Paybill <strong>{paymentInstructions.paybill}</strong>, using the business name as the account number</>
                      : <>to Till <strong>{paymentInstructions.till}</strong></>}.
                    We will verify the transaction before activating the subscription.
                  </p>
                  <form onSubmit={submitPaymentReference} className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={paymentReference}
                      onChange={(event) => setPaymentReference(event.target.value)}
                      placeholder="M-Pesa transaction code"
                      autoComplete="off"
                      minLength={6}
                      maxLength={32}
                      required
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
                    />
                    <button type="submit" disabled={paymentSubmitting} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                      {paymentSubmitting ? "Submitting…" : "Submit reference"}
                    </button>
                  </form>
                  {paymentReferenceSubmitted && <Link href="/dashboard/verify-location" className="mt-3 inline-block text-sm font-semibold text-emerald-800 underline">Continue to location verification</Link>}
                </>
              ) : (
                <p className="mt-2 text-sm text-amber-900">Payment details are not configured yet. Do not send money. You can use the 7-day trial or contact JiraniBiz support for payment instructions.</p>
              )}
              <Link href="/dashboard/verify-location" className="mt-3 inline-block text-sm font-semibold text-emerald-800 underline">Continue to location verification</Link>
            </div>
          )}
        </div>
      ) : (
        <button
          type="submit"
          disabled={submitting || !deviceLocation || photos.length < 2 || Boolean(photoStatus && !photos.length)}
          className="mt-6 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Submitting…" : trial ? "Create listing & start free trial" : "Create listing & subscribe"}
        </button>
      )}
    </form>
  );
}
