"use client";

import { useState } from "react";

export type DeviceLocation = { latitude: number; longitude: number; accuracy: number };

export function LocationButton({ onLocation }: { onLocation: (location: DeviceLocation) => void }) {
  const [state, setState] = useState<"idle" | "loading" | "denied" | "error">("idle");

  function locate() {
    if (!("geolocation" in navigator)) { setState("error"); return; }
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { onLocation({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }); setState("idle"); },
      (error) => { setState(error.code === 1 ? "denied" : "error"); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  return (
    <div>
      <button type="button" onClick={locate} disabled={state === "loading"} className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {state === "loading" ? "Locating…" : "Use my precise location"}
      </button>
      {state === "denied" && <p className="mt-2 text-xs text-amber-700">Location permission was denied. Enable location permission in your browser settings.</p>}
      {state === "error" && <p className="mt-2 text-xs text-amber-700">Could not obtain your device location. Make sure the site is using HTTPS.</p>}
    </div>
  );
}
