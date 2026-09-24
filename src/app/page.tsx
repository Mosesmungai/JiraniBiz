import Image from "next/image";
import Link from "next/link";
import { categories, featuredBusinesses, stats } from "@/lib/data";

export default function Home() {
  return (
    <div className="min-h-screen text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl">
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
        <section className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Trusted local growth engine
              </div>
              <h1 className="mt-6 max-w-xl text-5xl font-semibold tracking-[-0.04em] text-slate-900 md:text-6xl">
                Find trusted local experts in your area.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                JiraniBiz helps people discover reliable, verified services and helps local businesses earn more leads, bookings and repeat customers.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/discover" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
                  Find a business
                </Link>
                <Link href="#pricing" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300">
                  Join as a business
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-5 text-sm text-slate-600">
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

            <div className="rounded-[32px] border border-slate-200 bg-white/80 p-4 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm">
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
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-300">Live leads</div>
                  <div className="mt-4 text-3xl font-semibold">1,248</div>
                  <div className="mt-1 text-sm text-slate-300">New inquiries this week</div>
                </div>
                <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Featured</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900">Westgate Cleaning Co.</div>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Verified
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-2xl">
                    <Image
                      src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80"
                      alt="Featured business"
                      width={800}
                      height={500}
                      className="h-56 w-full object-cover"
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-slate-500">Starting from</div>
                      <div className="text-lg font-semibold text-slate-900">KES 2,200</div>
                    </div>
                    <Link href="/business/westgate-cleaning-co" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                      View profile
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white/75">
          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-3xl font-semibold text-slate-900">{stat.value}</div>
                <div className="mt-2 text-sm text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-teal-700">Popular categories</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">Explore the needs people search for most</h2>
            </div>
            <Link href="/discover" className="hidden text-sm font-medium text-slate-700 md:inline-flex">
              View all categories →
            </Link>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <div key={category.name} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">{category.icon}</div>
                <div className="mt-5 text-xl font-semibold text-slate-900">{category.name}</div>
                <div className="mt-2 text-sm text-slate-600">{category.subtitle}</div>
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-slate-500">1,200+ listings</div>
                  <Link href="/discover" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">
                    Browse
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-teal-700">Featured nearby</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">Trusted businesses ready to serve</h2>
            </div>
            <Link href="/discover" className="hidden text-sm font-medium text-slate-700 md:inline-flex">
              View all businesses →
            </Link>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-3">
            {featuredBusinesses.map((business) => (
              <article key={business.id} className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
                <div className="overflow-hidden rounded-[24px]">
                  <Image src={business.image} alt={business.name} width={800} height={600} className="h-52 w-full object-cover" />
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xl font-semibold text-slate-900">{business.name}</div>
                    {business.verified && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Verified</span>}
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
            ))}
          </div>
        </section>

        <section id="how-it-works" className="border-y border-slate-200 bg-slate-900 py-16 text-white">
          <div className="mx-auto max-w-7xl px-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">How it works</p>
            <h2 className="mt-2 text-3xl font-semibold">A simple system for trust, discovery and booking</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
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
                <div key={item.number} className="rounded-[28px] border border-slate-700 bg-white/5 p-6">
                  <div className="text-sm uppercase tracking-[0.2em] text-slate-400">{item.number}</div>
                  <div className="mt-5 text-2xl font-semibold">{item.title}</div>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-teal-700">Pricing</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">Simple plans built for local business growth</h2>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { name: "Starter", price: "KES 1,500", text: "Perfect for new local businesses", features: ["Business profile", "Up to 5 services", "Lead inbox", "Basic analytics"] },
              { name: "Pro", price: "KES 4,500", text: "Best for growing service providers", features: ["Everything in Starter", "Priority placement", "Booking management", "WhatsApp lead routing"], highlight: true },
              { name: "Featured", price: "KES 9,500", text: "For businesses that want stronger visibility", features: ["Everything in Pro", "Featured position", "Boosted exposure", "Dedicated support"] },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-[32px] border p-6 ${plan.highlight ? "border-slate-900 bg-slate-900 text-white shadow-sm" : "border-slate-200 bg-white text-slate-900"}`}>
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
                <button className={`mt-8 w-full rounded-full px-4 py-3 text-sm font-semibold ${plan.highlight ? "bg-white text-slate-900" : "bg-slate-900 text-white"}`}>
                  Choose plan
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white/80">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-16 text-center md:flex-row md:text-left">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-teal-700">Ready to grow</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">Launch with a trusted local platform.</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/discover" className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
                Explore the platform
              </Link>
              <Link href="#" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
                List your business
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
