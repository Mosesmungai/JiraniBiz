import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadRequestForm } from "@/components/lead-request-form";
import { allBusinesses } from "@/lib/data";

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = allBusinesses.find((item) => item.slug === slug);

  if (!business) {
    notFound();
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${business.location.latitude},${business.location.longitude}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 font-semibold text-slate-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white">
              N
            </span>
            Nairobi Local
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/discover" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
              Back to results
            </Link>
            <Link href={mapsUrl} target="_blank" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Open map
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.6fr_0.8fr]">
          <section className="space-y-8">
            <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
              <Image src={business.image} alt={business.name} width={1200} height={700} className="h-[380px] w-full object-cover" />
              <div className="p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    {business.badge}
                  </span>
                  {business.verified && (
                    <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                      Verified
                    </span>
                  )}
                </div>
                <h1 className="mt-4 text-4xl font-semibold text-slate-900">{business.name}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span>{business.category}</span>
                  <span>•</span>
                  <span>{business.area}</span>
                  <span>•</span>
                  <span>{business.city}</span>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <span className="text-yellow-500">★</span>
                    <span className="font-semibold text-slate-900">{business.rating}</span>
                    <span>({business.reviews} reviews)</span>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    KES {business.priceFrom.toLocaleString()} starting price
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-semibold text-slate-900">About this business</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                {business.description} We help homeowners, landlords and growing businesses improve day-to-day operations with reliable, fast-turnaround support and transparent pricing.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {business.services.map((service) => (
                  <div key={service} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                    {service}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-semibold text-slate-900">Verified business details</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Verification status</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{business.verification.status}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Location proof</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{business.location.label}</div>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-700">
                Physical verification is mandatory for premium listings. GPS-tagged photos and storefront evidence are required before a business can unlock the full seller dashboard.
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-semibold text-slate-900">Customer reviews</h2>
              <div className="mt-6 space-y-4">
                {[
                  "Very professional team and quick turnaround. Great communication and reliable pricing.",
                  "They showed up on time and the work was neat and well done. Highly recommended.",
                  "Clean process, transparent quote and friendly support from start to finish.",
                ].map((review, index) => (
                  <div key={review} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center text-yellow-500">
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <span key={`${review}-${starIndex}`}>★</span>
                      ))}
                    </div>
                    <p className="text-sm leading-7 text-slate-600">“{review}”</p>
                    <div className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      Customer {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <LeadRequestForm businessSlug={business.slug} businessName={business.name} />

            <div className="rounded-[32px] border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Business contact</p>
              <div className="mt-4 text-2xl font-semibold">{business.phone ?? "+254 700 123 456"}</div>
              <div className="mt-2 text-sm text-slate-300">{business.email ?? `hello@${business.slug}.co.ke`}</div>
              <div className="mt-6 space-y-3 text-sm text-slate-200">
                <div>Mon - Sat: 8:00 AM - 7:00 PM</div>
                <div>{business.area}, {business.city}</div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {Object.entries(business.socials)
                  .filter(([, value]) => value)
                  .map(([platform, url]) => (
                    <Link key={platform} href={String(url)} target="_blank" className="rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-900">
                      {platform}
                    </Link>
                  ))}
              </div>
              <Link href={mapsUrl} target="_blank" className="mt-6 block w-full rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900">
                Open in Maps
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

