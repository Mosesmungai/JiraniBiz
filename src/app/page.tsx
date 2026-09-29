import Image from "next/image";
import Link from "next/link";
import { categories } from "@/lib/data";
import { getBusinesses } from "@/lib/store";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export default async function Home() {
  const businesses = await getBusinesses();
  const recommendedBusinesses = [...businesses].sort((left, right) => {
    const leftRank = left.promotionEligible && left.subscription
      ? SUBSCRIPTION_PLANS[left.subscription.planId].rank
      : 0;
    const rightRank = right.promotionEligible && right.subscription
      ? SUBSCRIPTION_PLANS[right.subscription.planId].rank
      : 0;
    return rightRank - leftRank ||
      right.rating - left.rating ||
      right.reviews - left.reviews ||
      left.name.localeCompare(right.name);
  });
  const featuredBusinesses = recommendedBusinesses.slice(0, 3);
  const featuredBusiness = recommendedBusinesses[0];
  const averageRating = businesses.length
    ? (businesses.reduce((sum, business) => sum + business.rating, 0) / businesses.length).toFixed(1)
    : "0.0";
  const totalReviews = businesses.reduce((sum, business) => sum + business.reviews, 0);
  const countriesServed = new Set(businesses.map((business) => business.country)).size;
  const listingCount = businesses.length;
  const stats = [
    { value: String(countriesServed), label: "countries served" },
    { value: `${averageRating}/5`, label: "average business rating" },
    { value: `${listingCount}`, label: "business listings" },
    { value: `${totalReviews.toLocaleString()}`, label: "customer reviews" },
  ];

  return (
    <div className="min-h-screen text-slate-900">
      <header className="site-header sticky top-0 z-50 border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 font-semibold text-slate-900">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#0d2f3d] p-1 shadow-sm ring-1 ring-slate-200">
              <Image src="/jiranibiz-logo.png" alt="JiraniBiz logo" width={60} height={60} className="h-full w-full object-contain" />
            </div>
            <span className="text-xl tracking-[-0.05em] text-slate-900">JiraniBiz</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <Link href="/discover">Discover</Link>
            <Link href="#how-it-works">How it works</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="/dashboard">Dashboard</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/discover" className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 md:inline-flex">
              Explore businesses
            </Link>
            <Link href="/dashboard" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm">
              List your business
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-6 pb-12 pt-10 md:pb-14 md:pt-14">
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
                Trusted local growth engine
              </div>
              <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-[-0.045em] text-slate-900 md:text-5xl">
                Find trusted local experts in your area.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 md:text-lg">
                JiraniBiz helps people discover reliable, verified services and helps local businesses earn more leads, bookings and repeat customers.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/discover" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
                  Find a business
                </Link>
                <Link href="#pricing" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300">
                  Join as a business
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Verified businesses
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Fast local bookings
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Revenue tracking
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-3 shadow-[0_22px_60px_rgba(20,48,43,0.10)] backdrop-blur-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Popular search</div>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">Cleaning</div>
                      <div className="text-sm text-slate-500">Westlands & Kileleshwa</div>
                    </div>
                    <div className="rounded-2xl bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-700">4.9</div>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-900 p-4 text-white">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-300">Active listings</div>
                  <div className="mt-4 text-3xl font-semibold">{listingCount}</div>
                  <div className="mt-1 text-sm text-slate-300">Business profiles live across the region</div>
                </div>
                <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  {featuredBusiness ? (
                    <>
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Featured</div>
                          <div className="mt-2 text-xl font-semibold text-slate-900">{featuredBusiness.name}</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {featuredBusiness.promotionEligible && featuredBusiness.subscription && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-950">
                              Promoted · {SUBSCRIPTION_PLANS[featuredBusiness.subscription.planId].label}
                            </span>
                          )}
                          {featuredBusiness.verified && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Verified</span>}
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-2xl">
                        <Image
                          src={featuredBusiness.image}
                          alt={featuredBusiness.name}
                          width={800}
                          height={500}
                          className="h-56 w-full object-cover"
                        />
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm text-slate-500">Starting from</div>
                          <div className="text-lg font-semibold text-slate-900">KES {featuredBusiness.priceFrom.toLocaleString()}</div>
                        </div>
                        <Link href={`/business/${featuredBusiness.slug}`} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                          View profile
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center text-sm text-slate-600">No business listings are available yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white/75">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-5 px-6 py-6 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center md:border-r md:border-slate-200 md:last:border-r-0">
                <div className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">{stat.value}</div>
                <div className="mt-1 text-xs text-slate-600 md:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12 md:py-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-teal-700">Popular categories</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">Explore the needs people search for most</h2>
            </div>
            <Link href="/discover" className="hidden text-sm font-medium text-slate-700 md:inline-flex">
              View all categories →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <div key={category.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-xl">{category.icon}</div>
                <div className="mt-4 text-lg font-semibold text-slate-900">{category.name}</div>
                <div className="mt-2 text-sm text-slate-600">{category.subtitle}</div>
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-slate-500">{businesses.filter((business) => business.category === category.name).length} local listings</div>
                  <Link href="/discover" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">
                    Browse
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-12 md:pb-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-teal-700">Featured nearby</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">Trusted businesses ready to serve</h2>
            </div>
            <Link href="/discover" className="hidden text-sm font-medium text-slate-700 md:inline-flex">
              View all businesses →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {featuredBusinesses.length ? featuredBusinesses.map((business) => (
              <article key={business.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_24px_rgba(20,48,43,0.04)]">
                <div className="overflow-hidden rounded-xl">
                  <Image src={business.image} alt={business.name} width={800} height={600} className="h-52 w-full object-cover" />
                </div>
                <div className="p-2 pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xl font-semibold text-slate-900">{business.name}</div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {business.promotionEligible && business.subscription && (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-950">
                          Promoted · {SUBSCRIPTION_PLANS[business.subscription.planId].label}
                        </span>
                      )}
                      {business.verified && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Verified</span>}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">{business.category} • {business.area}, {business.city}</div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                    <span className="text-yellow-500">★</span>
                    <span className="font-semibold text-slate-900">{business.rating}</span>
                    <span>({business.reviews})</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{business.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">From</div>
                      <div className="text-lg font-semibold text-slate-900">KES {business.priceFrom.toLocaleString()}</div>
                    </div>
                    <Link href={`/business/${business.slug}`} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                      View
                    </Link>
                  </div>
                </div>
              </article>
            )) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600 xl:col-span-3">
                No business listings are available yet.
              </div>
            )}
          </div>
        </section>

        <section id="how-it-works" className="border-y border-slate-200 bg-[#173b37] py-12 text-white md:py-14">
          <div className="mx-auto max-w-7xl px-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">How it works</p>
            <h2 className="mt-2 text-3xl font-semibold">A simple system for trust, discovery and booking</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                {
                  number: "01",
                  title: "Search locally",
                  text: "Find nearby experts by category, area and service requirements in seconds.",
                },
                {
                  number: "02",
                  title: "Compare with confidence",
                  text: "Read reviews, view service lists and compare pricing before choosing a provider.",
                },
                {
                  number: "03",
                  title: "Book and grow",
                  text: "Businesses get leads, customers get a trustworthy booking flow and everyone wins.",
                },
              ].map((item) => (
                <div key={item.number} className="rounded-2xl border border-white/15 bg-white/[0.04] p-5">
                  <div className="text-sm uppercase tracking-[0.2em] text-slate-400">{item.number}</div>
                  <div className="mt-5 text-2xl font-semibold">{item.title}</div>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-6 py-12 md:py-14">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-teal-700">Pricing</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">Simple plans built for local business growth</h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { name: "Area reach", price: "KES 500", text: "Be recommended in your local service area.", features: ["Top 100 eligible businesses in your area", "Local customer recommendations", "Business photo gallery", "Location verification"] },
              { name: "Regional reach", price: "KES 1,000", text: "Reach customers across your selected region.", features: ["Top 100 eligible businesses in your region", "Regional customer recommendations", "Business photo gallery", "Location verification"], highlight: true },
              { name: "Country-wide reach", price: "KES 2,000", text: "Promote your business across your country.", features: ["Top 100 eligible businesses in your country", "Country-wide recommendations", "Business photo gallery", "Location verification"] },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-2xl border p-5 ${plan.highlight ? "border-[#173b37] bg-[#173b37] text-white shadow-sm" : "border-slate-200 bg-white text-slate-900"}`}>
                <div className="text-sm uppercase tracking-[0.2em] opacity-70">{plan.name}</div>
                <div className="mt-5 text-4xl font-semibold">{plan.price}<span className={`text-base ${plan.highlight ? "text-slate-300" : "text-slate-500"}`}>/month</span></div>
                <p className={`mt-3 text-sm leading-7 ${plan.highlight ? "text-slate-300" : "text-slate-600"}`}>{plan.text}</p>
                <ul className={`mt-6 space-y-3 text-sm ${plan.highlight ? "text-slate-200" : "text-slate-600"}`}>
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${plan.highlight ? "bg-white/10 text-white" : "bg-emerald-100 text-emerald-700"}`}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard#add-business" className={`mt-8 block w-full rounded-full px-4 py-3 text-center text-sm font-semibold ${plan.highlight ? "bg-white text-slate-900" : "bg-slate-900 text-white"}`}>
                  Start a 7-day trial
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs leading-5 text-slate-500">Each scope has up to 100 promoted placements. Placement depends on availability and customer relevance; payment is for a visibility subscription and verification review, not a guaranteed rank or verification outcome.</p>
        </section>

        <section className="border-t border-slate-200 bg-white/80">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-6 py-12 text-center md:flex-row md:py-14 md:text-left">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-teal-700">Ready to grow</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">Launch with a trusted local platform.</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/discover" className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
                Explore the platform
              </Link>
              <Link href="/dashboard" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
                List your business
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
