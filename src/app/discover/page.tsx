"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { categories, defaultBusinesses, type Business } from "@/lib/data";

const userLocationDefaults = {
  label: "Nairobi, Kenya",
  latitude: -1.2864,
  longitude: 36.8172,
};

function distanceBetween(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadius = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [radiusKm, setRadiusKm] = useState(30);
  const [userLocation, setUserLocation] = useState(userLocationDefaults);
  const [businesses, setBusinesses] = useState<Business[]>(defaultBusinesses);

  useEffect(() => {
    async function loadBusinesses() {
      try {
        const response = await fetch("/api/businesses");
        if (!response.ok) return;

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setBusinesses(data as Business[]);
        }
      } catch {
        setBusinesses(defaultBusinesses);
      }
    }

    loadBusinesses();

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({
          label: "Your current location",
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      },
      () => {
        setUserLocation(userLocationDefaults);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

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
          business.city.toLowerCase().includes(normalizedQuery);
        const distance = distanceBetween(
          userLocation.latitude,
          userLocation.longitude,
          business.location.latitude,
          business.location.longitude,
        );
        const withinRadius = distance <= radiusKm;

        return matchesCategory && matchesQuery && withinRadius;
      })
      .sort((a, b) => {
        const distanceA = distanceBetween(userLocation.latitude, userLocation.longitude, a.location.latitude, a.location.longitude);
        const distanceB = distanceBetween(userLocation.latitude, userLocation.longitude, b.location.latitude, b.location.longitude);
        return distanceA - distanceB;
      });
  }, [query, radiusKm, selectedCategory, userLocation]);

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
                <div className="mt-2 font-medium text-slate-900">{userLocation.label}</div>
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

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by business, service, area or city"
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none placeholder:text-slate-400"
          />
          <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm">
            Search nearby
          </button>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {[
            "All",
            ...categories.map((category) => category.name),
          ].map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
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
                  className="w-full accent-slate-900"
                />
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">Within {radiusKm} km</div>
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
              <div>
                <label className="mb-2 block font-medium text-slate-700">Nearby areas</label>
                <div className="space-y-2">
                  {["Westlands", "Kilimani", "Roysambu", "CBD", "Kibra"].map((area) => (
                    <label key={area} className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500" />
                      {area}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <section className="space-y-5">
            <div className="rounded-[30px] border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-300">Location-aware results</div>
                  <h2 className="mt-2 text-2xl font-semibold">Businesses matched for your area</h2>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  {filteredBusinesses.length} results
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {["Westlands", "Kilimani", "CBD"].map((pin) => (
                  <div key={pin} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-300">Pinned</div>
                    <div className="mt-2 text-base font-semibold">{pin}</div>
                  </div>
                ))}
              </div>
            </div>

            {filteredBusinesses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
                No businesses match the current filters. Try widening your search radius or changing the category.
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

