"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DiscoveryPreferencesProvider,
  DiscoveryPreferencesStatus,
  useDiscoveryPreferences,
} from "@/components/discovery-preferences-provider";
import { categories, type Business } from "@/lib/data";
import { distanceKm } from "@/lib/distance";
import {
  DISCOVERY_COUNTRIES,
  type PreferenceLocation,
  type RecentSearch,
} from "@/lib/discovery-preferences";
import { RecentSearches, rememberSearch } from "@/components/recent-activity";
import { formatDistance } from "@/lib/geo";

async function requestBusinesses(): Promise<Business[]> {
  const response = await fetch("/api/businesses");
  if (!response.ok) throw new Error(`Request failed (${response.status}).`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("The businesses response is invalid.");
  return data;
}

export default function DiscoverPage() {
  return (
    <DiscoveryPreferencesProvider>
      <DiscoverContent />
    </DiscoveryPreferencesProvider>
  );
}

type LocationMode = "device" | "manual" | null;

type DiscoveryLocation = {
  label: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

function DiscoverContent() {
  const { preferences, ready, saveSearch, saveCategory, saveLocation } = useDiscoveryPreferences();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [radiusKm, setRadiusKm] = useState(30);
  const [deviceLocation, setDeviceLocation] = useState<DiscoveryLocation | null>(null);
  const [locationMode, setLocationMode] = useState<LocationMode>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | "checking" | "unsupported" | "insecure">("checking");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [manualCountry, setManualCountry] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualArea, setManualArea] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const requestCurrentLocation = useCallback(() => {
    if (!window.isSecureContext) {
      setPermissionStatus("insecure");
      setLocationError("Device location requires HTTPS (or localhost). Choose a city or area instead.");
      return;
    }
    if (!navigator.geolocation) {
      setPermissionStatus("unsupported");
      setLocationError("This browser does not support device location. Choose a city or area instead.");
      return;
    }

    setLocationError(null);
    setRequestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setDeviceLocation({
          label: "Your device location",
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        });
        setLocationMode("device");
        setPermissionStatus("granted");
        setRequestingLocation(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) setPermissionStatus("denied");
        const message = error.code === error.PERMISSION_DENIED
          ? "Location permission was denied. Choose a city or area, or allow location in your browser settings."
          : error.code === error.TIMEOUT
            ? "The location request timed out. Try again or choose a city or area."
            : "The browser could not determine your location. Try again or choose a city or area.";
        setLocationError(message);
        setRequestingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }, []);

  useEffect(() => {
    let active = true;
    requestBusinesses().then(
      (data) => {
        if (!active) return;
        setBusinesses(data);
        setLoading(false);
      },
      (error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Unexpected response from the server.");
        setLoading(false);
      },
    );

    if (!navigator.geolocation) {
      queueMicrotask(() => {
        if (active) setPermissionStatus("unsupported");
      });
      return () => {
        active = false;
      };
    }
    if (!window.isSecureContext) {
      queueMicrotask(() => {
        if (active) setPermissionStatus("insecure");
      });
      return () => {
        active = false;
      };
    }
    if (!navigator.permissions?.query) {
      queueMicrotask(() => {
        if (active) setPermissionStatus("prompt");
      });
      return () => {
        active = false;
      };
    }

    let permission: PermissionStatus | null = null;
    const onPermissionChange = () => {
      if (!permission || !active) return;
      setPermissionStatus(permission.state);
      if (permission.state === "granted") requestCurrentLocation();
      if (permission.state === "denied") {
        setDeviceLocation(null);
        setLocationMode((current) => current === "device" ? null : current);
      }
    };
    navigator.permissions.query({ name: "geolocation" }).then(
      (status) => {
        if (!active) return;
        permission = status;
        setPermissionStatus(status.state);
        status.addEventListener("change", onPermissionChange);
        if (status.state === "granted") requestCurrentLocation();
      },
      () => {
        if (active) setPermissionStatus("prompt");
      },
    );

    return () => {
      active = false;
      permission?.removeEventListener("change", onPermissionChange);
    };
  }, [requestCurrentLocation]);

  const countries = useMemo(
    () => [...new Set([...DISCOVERY_COUNTRIES, ...businesses.map((business) => business.country)])]
      .sort((a, b) => a.localeCompare(b)),
    [businesses],
  );
  const cities = useMemo(
    () => [...new Set(businesses
      .filter((business) => business.country === manualCountry)
      .map((business) => business.city))].sort((a, b) => a.localeCompare(b)),
    [businesses, manualCountry],
  );
  const areas = useMemo(
    () => [...new Set(businesses.filter((business) =>
      business.country === manualCountry && business.city === manualCity,
    ).map((business) => business.area))]
      .sort((a, b) => a.localeCompare(b)),
    [businesses, manualCity, manualCountry],
  );
  const manualLocation = useMemo<DiscoveryLocation | null>(() => {
    if (!manualCountry || !manualCity) return null;
    const matchingBusinesses = businesses.filter((business) =>
      business.country === manualCountry &&
      business.city === manualCity &&
      (!manualArea || business.area === manualArea),
    );
    if (!matchingBusinesses.length) return null;
    const latitude = matchingBusinesses.reduce((sum, business) => sum + business.location.latitude, 0) / matchingBusinesses.length;
    const longitude = matchingBusinesses.reduce((sum, business) => sum + business.location.longitude, 0) / matchingBusinesses.length;
    return {
      label: manualArea
        ? `Approx. ${manualArea}, ${manualCity}, ${manualCountry}`
        : `Approx. ${manualCity}, ${manualCountry}`,
      latitude,
      longitude,
      accuracy: null,
    };
  }, [businesses, manualArea, manualCity, manualCountry]);
  const userLocation = locationMode === "device"
    ? deviceLocation
    : locationMode === "manual"
      ? manualLocation
      : null;
  const locationLabel = locationMode === "manual" && manualCountry && manualCity
    ? manualArea
      ? `Approx. ${manualArea}, ${manualCity}, ${manualCountry}`
      : `Approx. ${manualCity}, ${manualCountry}`
    : userLocation?.label ?? "Location not set";

  const applyManualLocation = () => {
    if (!manualCountry || !manualCity) return;
    setLocationMode("manual");
    setLocationError(null);
    saveLocation({ country: manualCountry, city: manualCity, area: manualArea });
  };

  const filteredBusinesses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...businesses]
      .filter((business) => {
        const matchesCategory = selectedCategory === "All" || business.category === selectedCategory;
        const matchesQuery =
          !normalizedQuery ||
          business.name.toLowerCase().includes(normalizedQuery) ||
          business.category.toLowerCase().includes(normalizedQuery) ||
          business.area.toLowerCase().includes(normalizedQuery) ||
          business.city.toLowerCase().includes(normalizedQuery) ||
          business.country.toLowerCase().includes(normalizedQuery);
        const matchesManualLocation = locationMode !== "manual" ||
          (business.country === manualCountry &&
            business.city.toLowerCase() === manualCity.trim().toLowerCase() &&
            (!manualArea || business.area.toLowerCase() === manualArea.trim().toLowerCase()));
        const withinRadius = !userLocation ||
          distanceKm(userLocation, business.location) <= radiusKm;

        return matchesCategory && matchesQuery && matchesManualLocation && withinRadius;
      })
      .sort((a, b) => {
        if (!userLocation) return a.name.localeCompare(b.name);
        return distanceKm(userLocation, a.location) - distanceKm(userLocation, b.location);
      });
  }, [businesses, locationMode, manualArea, manualCity, manualCountry, query, radiusKm, selectedCategory, userLocation]);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const location: PreferenceLocation | null = locationMode === "manual" && manualCountry && manualCity
      ? { country: manualCountry, city: manualCity, area: manualArea }
      : null;
    rememberSearch(query);
    saveSearch({ query: query.trim(), category: selectedCategory, location });
  };

  const restoreSearch = (search: RecentSearch) => {
    setQuery(search.query);
    setSelectedCategory(search.category);
    if (search.location) {
      setManualCountry(search.location.country);
      setManualCity(search.location.city);
      setManualArea(search.location.area);
      setLocationMode("manual");
    }
  };

  const nearbyCategories = preferences.preferredCategories
    .map(({ name }) => name)
    .filter((name) => name !== selectedCategory)
    .slice(0, 3);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 font-semibold text-slate-900">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#0d2f3d] p-1 shadow-sm ring-1 ring-slate-200">
              <Image src="/jiranibiz-logo.png" alt="JiraniBiz logo" width={60} height={60} className="h-full w-full object-contain" />
            </div>
            <span className="text-xl tracking-[-0.05em] text-slate-900">JiraniBiz</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <Link href="/discover">Discover</Link>
            <Link href="#">How it works</Link>
            <Link href="#">Pricing</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 md:inline-flex">
              Business dashboard
            </Link>
            <Link href="#" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm">
              List your business
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-teal-700">Trusted local discovery</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">Find reliable businesses near you</h1>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm text-slate-500">Location</div>
                <div className="mt-2 font-medium text-slate-900">{locationLabel}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm text-slate-500">Category</div>
                <div className="mt-2 font-medium text-slate-900">{selectedCategory === "All" ? "All services" : selectedCategory}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm text-slate-500">Search radius</div>
                <div className="mt-2 font-medium text-slate-900">{radiusKm} km</div>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Location settings">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <h2 className="font-semibold text-slate-900">Choose how to find nearby businesses</h2>
              <p className="mt-1 text-sm text-slate-600">
                Device location works across Kenya, Uganda, and Tanzania. Precise coordinates stay in memory for this visit; we never save them to your preferences.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {permissionStatus === "checking" && "Checking browser location permission…"}
                {permissionStatus === "prompt" && "Your browser will ask before sharing device location."}
                {permissionStatus === "granted" && "Browser location permission is granted."}
                {permissionStatus === "denied" && "Location is blocked in browser settings; manual selection is available."}
                {permissionStatus === "unsupported" && "Device location is unavailable in this browser; use manual selection."}
                {permissionStatus === "insecure" && "Device location requires HTTPS (or localhost); use manual selection here."}
              </p>
              {locationError && <p className="mt-2 text-sm text-rose-700" role="alert">{locationError}</p>}
            </div>
            <button
              type="button"
              onClick={requestCurrentLocation}
              disabled={requestingLocation || permissionStatus === "insecure" || permissionStatus === "unsupported"}
              className="shrink-0 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {requestingLocation ? "Finding your location…" : "Use my location"}
            </button>
          </div>
          {userLocation?.accuracy !== null && userLocation?.accuracy !== undefined && (
            <p className="mt-3 text-xs text-slate-500">
              Device-reported accuracy: ±{userLocation.accuracy < 1000
                ? `${Math.round(userLocation.accuracy)} m`
                : `${(userLocation.accuracy / 1000).toFixed(1)} km`}. Actual accuracy depends on your device and surroundings.
            </p>
          )}
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="text-sm font-medium text-slate-700">
              Country
              <select
                value={manualCountry}
                onChange={(event) => {
                  setManualCountry(event.target.value);
                  setManualCity("");
                  setManualArea("");
                }}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal"
              >
                <option value="">Select a country</option>
                {countries.map((country) => <option key={country} value={country}>{country}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              City
              <input
                list="discover-cities"
                value={manualCity}
                onChange={(event) => {
                  setManualCity(event.target.value);
                  setManualArea("");
                }}
                disabled={!manualCountry}
                placeholder="Enter or choose a city"
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal disabled:bg-slate-50"
              />
              <datalist id="discover-cities">
                {cities.map((city) => <option key={city} value={city} />)}
              </datalist>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Area (optional)
              <input
                list="discover-areas"
                value={manualArea}
                onChange={(event) => setManualArea(event.target.value)}
                disabled={!manualCity}
                placeholder="Enter or choose an area"
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal disabled:bg-slate-50"
              />
              <datalist id="discover-areas">
                {areas.map((area) => <option key={area} value={area} />)}
              </datalist>
            </label>
            <button
              type="button"
              onClick={applyManualLocation}
              disabled={!manualCountry || !manualCity.trim()}
              className="self-end rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Use selected area
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Manual locations match the selected country, city, and optional area. Distances use an approximate center when business coordinates exist; otherwise distance sorting is unavailable. Choose device location for device-reported coordinates.
          </p>
          <DiscoveryPreferencesStatus />
        </section>

        <form onSubmit={submitSearch} className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by business, service, area, city or country"
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none placeholder:text-slate-400"
          />
          <button type="submit" className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm">
            Search nearby
          </button>
        </form>
        <RecentSearches onSelect={setQuery} />

        <div className="mt-8 flex flex-wrap gap-3">
          {[
            "All",
            ...categories.map((category) => category.name),
          ].map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                saveCategory(category);
              }}
              className={`rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition ${
                selectedCategory === category
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {category === "All" ? "All services" : category}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
            <div className="mt-6 space-y-6 text-sm text-slate-600">
              <div>
                <label className="mb-2 block font-medium text-slate-700">Distance</label>
                <input
                  type="range"
                  min={5}
                  max={80}
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(Number(event.target.value))}
                  disabled={!userLocation}
                  className="w-full accent-slate-900"
                />
                <div className="mt-2 text-xs text-slate-500">
                  {userLocation ? `Within ${radiusKm} km` : "Choose a location to filter by distance."}
                </div>
              </div>
              <div>
                <label className="mb-2 block font-medium text-slate-700">Rating</label>
                <div className="space-y-2">
                  {["4.5+", "4.7+", "4.9+"].map((rating) => (
                    <label key={rating} className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500" />
                      {rating}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {preferences.preferredLocations.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="font-medium text-slate-800">Your locations</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {preferences.preferredLocations.slice(0, 4).map((location) => (
                    <button
                      key={`${location.country}:${location.city}:${location.area}`}
                      type="button"
                      onClick={() => {
                        setManualCountry(location.country);
                        setManualCity(location.city);
                        setManualArea(location.area);
                        setLocationMode("manual");
                      }}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-400"
                    >
                      {[location.area, location.city, location.country].filter(Boolean).join(", ")}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="font-medium text-slate-800">Recent searches</h3>
              {!ready && <p className="mt-2 text-xs text-slate-500">Loading saved searches…</p>}
              {ready && preferences.recentSearches.length === 0 && (
                <p className="mt-2 text-xs text-slate-500">Your searches will appear here.</p>
              )}
              <div className="mt-3 space-y-2">
                {preferences.recentSearches.slice(0, 5).map((search) => (
                  <button
                    key={`${search.createdAt}:${search.query}`}
                    type="button"
                    onClick={() => restoreSearch(search)}
                    className="block w-full rounded-xl bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                  >
                    <span className="block font-medium">{search.query}</span>
                    <span className="mt-1 block text-slate-500">
                      {[search.category, search.location?.city, search.location?.country].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="font-medium text-slate-800">Recently viewed</h3>
              <div className="mt-3 space-y-2">
                {preferences.recentlyViewedBusinesses.slice(0, 5).map((business) => (
                  <Link
                    key={business.id}
                    href={`/business/${business.slug}`}
                    className="block rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    <span className="block font-medium">{business.name}</span>
                    <span className="mt-1 block text-slate-500">
                      {[business.category, business.area, business.city].filter(Boolean).join(" · ")}
                    </span>
                  </Link>
                ))}
                {ready && preferences.recentlyViewedBusinesses.length === 0 && (
                  <p className="text-xs text-slate-500">Businesses you open will appear here.</p>
                )}
              </div>
            </div>
          </aside>

          <section className="space-y-5">
            <div className="rounded-[30px] border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-300">
                    {userLocation ? "Location-aware results" : "Local discovery"}
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold">
                    {userLocation
                      ? `Businesses near ${userLocation.label.replace(/^Your device location$/, "you")}`
                      : locationMode === "manual" && manualCountry && manualCity
                        ? `Businesses in ${locationLabel.replace(/^Approx\. /, "")}`
                        : "Businesses across Kenya, Uganda, and Tanzania"}
                  </h2>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  {filteredBusinesses.length} results
                </div>
              </div>
              {userLocation?.accuracy !== null && userLocation?.accuracy !== undefined && (
                <p className="mt-3 text-xs text-slate-300">
                  Device-reported location accuracy ±{Math.round(userLocation.accuracy)} m. Distances are estimates, not travel routes.
                </p>
              )}
              {nearbyCategories.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-xs text-slate-300">Popular with you:</span>
                  {nearbyCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category);
                        saveCategory(category);
                      }}
                      className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loadError ? (
              <div role="alert" className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-center text-rose-800">
                <p>Unable to load businesses from Firestore. {loadError}</p>
                <button
                  onClick={async () => {
                    setLoading(true);
                    setLoadError(null);
                    try {
                      setBusinesses(await requestBusinesses());
                    } catch (error) {
                      setLoadError(error instanceof Error ? error.message : "Unexpected response from the server.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
                >
                  Retry
                </button>
              </div>
            ) : loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-600" aria-live="polite">
                Loading businesses...
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
                No businesses match the current filters. Try widening your search radius, choosing another location, or changing the category.
              </div>
            ) : (
              filteredBusinesses.map((business) => (
                <article key={business.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="grid gap-5 p-4 md:grid-cols-[220px_1fr]">
                    <Image src={business.image} alt={business.name} width={800} height={600} className="h-52 w-full rounded-2xl object-cover md:h-full" />
                    <div className="flex flex-col justify-between gap-4 p-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                              {business.badge}
                            </span>
                            {business.verified && (
                              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                                Verified
                              </span>
                            )}
                          </div>
                          <h3 className="mt-3 text-2xl font-semibold text-slate-900">{business.name}</h3>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                            <span>{business.category}</span>
                            <span>•</span>
                            <span>{business.area}</span>
                            <span>•</span>
                            <span>{business.city}</span>
                            <span>•</span>
                            <span>{business.country}</span>
                            {userLocation && (
                              <>
                                <span>•</span>
                                <span className="font-medium text-teal-700">
                                  {distanceKm(userLocation, business.location) < 1
                                    ? userLocation.accuracy === null ? "Nearby (approx.)" : "Nearby"
                                    : `${userLocation.accuracy === null ? "~" : ""}${formatDistance(distanceKm(userLocation, business.location))} away`}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-semibold text-slate-900">KES {business.priceFrom.toLocaleString()}</div>
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">from</div>
                        </div>
                      </div>

                      <p className="text-sm leading-7 text-slate-600">{business.description}</p>

                      <div className="flex flex-wrap gap-2">
                        {business.services.map((service) => (
                          <span key={service} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                            {service}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <span className="text-yellow-500">★</span>
                          {business.rating} ({business.reviews})
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/business/${business.slug}`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                            View profile
                          </Link>
                          <Link href={`/business/${business.slug}`} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                            Book now
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
