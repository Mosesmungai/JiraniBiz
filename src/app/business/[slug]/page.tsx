import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking-form";
import {
  DiscoveryPreferencesProvider,
  DiscoveryPreferencesStatus,
} from "@/components/discovery-preferences-provider";
import { LeadRequestForm } from "@/components/lead-request-form";
import { RecentBusinessTracker } from "@/components/recent-business-tracker";
import { ViewTracker } from "@/components/view-tracker";
import { getBusinessBySlug, getServicesForBusiness } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();

  const services = await getServicesForBusiness(business.id);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${business.location.latitude},${business.location.longitude}`;

  return (
    <DiscoveryPreferencesProvider>
    <div className="min-h-screen text-slate-900">
      <RecentBusinessTracker business={{
        id: business.id,
        slug: business.slug,
        name: business.name,
        category: business.category,
        city: business.city,
        area: business.area,
      }} />
      <ViewTracker slug={business.slug} />
      <header className="site-header border-b"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 md:px-6">
        <Link href="/" className="flex items-center gap-3 font-semibold"><div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[#0d2f3d] p-1"><Image src="/jiranibiz-logo.png" alt="JiraniBiz logo" width={52} height={52} className="h-full w-full object-contain" /></div><span className="text-lg tracking-[-0.05em]">JiraniBiz</span></Link>
        <div className="flex items-center gap-3"><Link href="/discover" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium">Back to results</Link><Link href={mapsUrl} target="_blank" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Open map</Link></div>
      </div></header>
      <main className="mx-auto max-w-7xl px-5 py-7 md:px-6 md:py-9"><DiscoveryPreferencesStatus /><div className="mt-4 grid gap-6 lg:grid-cols-[1.6fr_0.8fr]">
        <section className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(20,48,43,0.05)]"><Image src={business.image} alt={business.name} width={1200} height={700} className="h-[280px] w-full object-cover md:h-[340px]" /><div className="p-5 md:p-7">
            <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">{business.badge}</span>{business.verified && <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">Verified</span>}</div>
            <h1 className="mt-4 text-4xl font-semibold">{business.name}</h1><div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600"><span>{business.category}</span><span>•</span><span>{business.area}</span><span>•</span><span>{business.city}</span></div>
            <div className="mt-6 flex flex-wrap items-center gap-4"><div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><span className="text-yellow-500">★</span><span className="font-semibold">{business.rating}</span><span>({business.reviews} reviews)</span></div><div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm">KES {business.priceFrom.toLocaleString()} starting price</div></div>
          </div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)] md:p-6"><h2 className="text-xl font-semibold">Services & pricing</h2><p className="mt-1.5 text-sm text-slate-500">Choose from services published by this business.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">
            {services.length ? services.map((service) => <div key={service.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{service.name}</h3><span className="font-semibold">KES {Number(service.price).toLocaleString()}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{service.description || "Service details available from the business."}</p></div>) : <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">No individual services have been published yet.</div>}
          </div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)] md:p-6"><h2 className="text-xl font-semibold">About this business</h2><p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">{business.description}</p><div className="mt-5 flex flex-wrap gap-2">{business.services.map((service) => <span key={service} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900">{service}</span>)}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)] md:p-6"><h2 className="text-xl font-semibold">Verified business details</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Verification status</div><div className="mt-1.5 font-semibold">{business.verification.status}</div></div><div><div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Location proof</div><div className="mt-1.5 font-semibold">{business.location?.label ?? `${business.area}, ${business.city}`}</div></div></div></div>
        </section>
        <aside className="space-y-4"><BookingForm businessId={business.id} businessName={business.name} /><LeadRequestForm businessSlug={business.slug} businessName={business.name} /><div className="rounded-2xl border border-emerald-950/10 bg-[#173b37] p-5 text-white shadow-[0_12px_30px_rgba(20,48,43,0.12)]"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-100">Business contact</p><div className="mt-3 space-y-2 text-sm text-emerald-50">{business.phone && <div>{business.phone}</div>}{business.email && <div className="break-all">{business.email}</div>}{!business.phone && !business.email && <div>Contact details have not been provided yet.</div>}</div><div className="mt-4 border-t border-white/15 pt-4 text-sm text-emerald-50/80">{business.area}, {business.city}</div><Link href={mapsUrl} target="_blank" rel="noreferrer" className="mt-4 block w-full rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-[#173b37]">Open in Maps</Link></div></aside>
      </div></main>
    </div>
    </DiscoveryPreferencesProvider>
  );
}
