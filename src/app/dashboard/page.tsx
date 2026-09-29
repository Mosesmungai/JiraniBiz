import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { BusinessForm } from "@/components/business-form";
import { AdminReviewQueue } from "@/components/admin-review-queue";
import { SubscriptionRenewalForm } from "@/components/subscription-renewal-form";
import { getBusinessReviewQueue, getDashboardData } from "@/lib/store";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { isSubscriptionEntitled, SUBSCRIPTION_PLANS } from "@/lib/subscription";

const accessHierarchy = [
  { role: "Admin", description: "Approves listings, monitors compliance and payment disputes." },
  { role: "Business owner", description: "Manages profile, updates services, attends lead requests and reviews reports." },
  { role: "Moderator", description: "Checks physical verification evidence and flags suspicious listings." },
  { role: "Customer", description: "Searches, books, pays and leaves reviews after completion." },
];

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);

  if (!user || (user.role !== "business_owner" && user.role !== "admin")) {
    redirect("/auth");
  }

  const [dashboard, reviewQueue] = await Promise.all([
    getDashboardData(user.role === "business_owner" ? user.id : undefined),
    user.role === "admin" ? getBusinessReviewQueue() : Promise.resolve([]),
  ]);
  const paymentInstructions = {
    paybill: process.env.MPESA_PAYBILL?.trim() ?? "",
    till: process.env.MPESA_TILL_NUMBER?.trim() ?? "",
  };
  const overview = [
    { label: "Customer leads", value: String(dashboard.leadCount) },
    { label: "Business listings", value: String(dashboard.businessCount) },
    { label: "Combined starting prices", value: `KES ${dashboard.totalRevenue.toLocaleString()}` },
  ];

  const recentLeads = dashboard.leads.map((lead) => ({
    name: lead.name,
    service: lead.businessName,
    status: lead.status,
    time: new Date(lead.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" }),
  }));

  return (
    <div className="min-h-screen text-slate-900">
      <header className="site-header border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 font-semibold text-slate-900">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[#0d2f3d] p-1 shadow-sm ring-1 ring-slate-200">
              <Image src="/jiranibiz-logo.png" alt="JiraniBiz logo" width={50} height={50} className="h-full w-full object-contain" />
            </div>
            <span className="text-lg tracking-[-0.05em] text-slate-900">JiraniBiz</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{user.name}</span>
            <Link href="/discover" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Public profile</Link>
            <form action="/api/auth/logout" method="post"><button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Sign out</button></form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 md:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-teal-700">Business dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Welcome back, {user.name}</h1>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">Role: {user.role === "business_owner" ? "Business owner" : "Admin"}</div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {overview.map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(20,48,43,0.04)]"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{item.label}</div><div className="mt-3 break-words text-2xl font-semibold tracking-tight text-slate-900">{item.value}</div></div>)}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <section className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)]">
              <div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-semibold text-slate-900">Recent leads</h2></div>
              <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-left text-sm text-slate-600"><thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Business</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Date</th></tr></thead><tbody>{recentLeads.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">No leads yet. New customer requests will appear here.</td></tr> : recentLeads.map((lead) => <tr key={`${lead.name}-${lead.service}-${lead.time}`} className="border-t border-slate-200"><td className="px-4 py-4 font-medium text-slate-800">{lead.name}</td><td className="px-4 py-4">{lead.service}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lead.status === "Booked" ? "bg-emerald-50 text-emerald-800" : lead.status === "Closed" ? "bg-slate-100 text-slate-700" : lead.status === "Contacted" ? "bg-sky-50 text-sky-800" : "bg-amber-50 text-amber-800"}`}>{lead.status}</span></td><td className="px-4 py-4">{lead.time}</td></tr>)}</tbody></table></div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)]"><h2 className="text-lg font-semibold text-slate-900">Platform roles</h2><div className="mt-3 divide-y divide-slate-100">{accessHierarchy.map((item) => <div key={item.role} className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{item.role}</div><div className="text-sm leading-6 text-slate-700">{item.description}</div></div>)}</div></div>
            {user.role === "admin" && <AdminReviewQueue businesses={reviewQueue} />}
            {user.role === "business_owner" && dashboard.businesses.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)]">
                <p className="eyebrow">Your portfolio</p>
                <h2 className="mt-1 text-xl font-semibold">Listings and subscriptions</h2>
                <div className="mt-4 divide-y divide-slate-100">
                  {dashboard.businesses.map((business) => {
                    const subscriptionEntitled = business.subscription
                      ? isSubscriptionEntitled(business.subscription)
                      : false;
                    const subscriptionStatus = business.subscription
                      ? !subscriptionEntitled &&
                        (business.subscription.status === "trialing" || business.subscription.status === "active")
                        ? "expired"
                        : business.subscription.status.replaceAll("_", " ")
                      : "";
                    const listingVisible = business.publicationStatus === undefined ||
                      (business.publicationStatus === "published" && subscriptionEntitled);
                    return (
                      <article key={business.id} className="py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-semibold">{business.name}</h3>
                            <p className="mt-1 text-sm text-slate-600">{business.area}, {business.city} · {business.country}{business.region ? ` · ${business.region}` : ""}</p>
                            <p className="mt-1 text-xs font-medium capitalize text-slate-500">
                              {business.publicationStatus?.replaceAll("_", " ") ?? "Legacy listing"}
                              {business.subscription && ` · ${SUBSCRIPTION_PLANS[business.subscription.planId].label} · ${subscriptionStatus}`}
                              {business.subscription?.expiresAt && ` · expires ${new Date(business.subscription.expiresAt).toLocaleDateString("en-KE")}`}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {business.publicationStatus !== "published" &&
                              business.subscription &&
                              subscriptionEntitled && (
                                <Link href="/dashboard/verify-location" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Verify location</Link>
                              )}
                            {listingVisible && (
                              <Link href={`/business/${business.slug}`} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">View listing</Link>
                            )}
                          </div>
                        </div>
                        {business.subscription && (
                          <SubscriptionRenewalForm
                            businessId={business.id}
                            planId={business.subscription.planId}
                            status={business.subscription.status}
                            expiresAt={business.subscription.expiresAt}
                            paymentInstructions={paymentInstructions}
                          />
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
            <div id="add-business"><BusinessForm paymentInstructions={paymentInstructions} /></div>
          </section>
          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)]">
              <h2 className="text-lg font-semibold text-slate-900">Next steps</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Keep your business presence up to date and respond promptly to new customer requests.</p>
              <Link href="#add-business" className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Add a business listing</Link>
              <Link href="/discover" className="ml-3 inline-flex rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Explore marketplace</Link>
            </div>
            <div className="rounded-2xl border border-emerald-900/10 bg-[#173b37] p-5 text-white shadow-[0_12px_30px_rgba(20,48,43,0.12)]"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-100">Listing snapshot</p><div className="mt-3 text-3xl font-semibold">KES {dashboard.totalRevenue.toLocaleString()}</div><p className="mt-2 text-sm leading-6 text-emerald-50/80">Combined starting prices across {dashboard.businessCount} listings. This is not booking revenue.</p></div>
          </aside>
        </div>
      </main>
    </div>
  );
}
