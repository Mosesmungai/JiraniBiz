"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isDeviceLocation,
  MAX_BUSINESS_LOCATION_ACCURACY_METERS,
  type DeviceLocation,
} from "@/lib/location";

export function BusinessForm() {
  const [form, setForm] = useState({
    name: "",
    category: "Cleaning",
    city: "",
    area: "",
    country: "",
    description: "",
    phone: "",
    email: "",
  });
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<{
    type: "loading" | "success" | "error";
    message: string;
  }>({ type: "loading", message: "Requesting your precise location…" });
  const [submitting, setSubmitting] = useState(false);
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!deviceLocation) {
      setStatus({ type: "error", message: "Capture your precise device location before submitting this listing." });
      return;
    }
    setSubmitting(true);
    setStatus({ type: "idle", message: "Submitting..." });

    try {
      const response = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, location: deviceLocation }),
      });

      const result: unknown = await response.json();
      const errorMessage =
        typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : "Unable to add business.";

      if (!response.ok) {
        setStatus({ type: "error", message: errorMessage });
        return;
      }

      setStatus({ type: "success", message: "Business added successfully with its captured device coordinates." });
      setForm({
        name: "",
        category: "Cleaning",
        city: "",
        area: "",
        country: "",
        description: "",
        phone: "",
        email: "",
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

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)] md:p-6">
      <div className="mb-6">
        <p className="eyebrow">New listing</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Add a local business</h2>
      </div>

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
            onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none"
            required
          >
            <option value="">Select a country</option>
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

      <button
        type="submit"
        disabled={submitting || !deviceLocation}
        className="mt-6 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit business"}
      </button>
    </form>
  );
}
