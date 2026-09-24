import Link from "next/link";
import Image from "next/image";
import { BusinessForm } from "@/components/business-form";
import { getDashboardData } from "@/lib/store";

const accessHierarchy = [
  { role: "Admin", description: "Approves listings, monitors compliance and payment disputes." },
  { role: "Business owner", description: "Manages profile, updates services, attends lead requests and reviews reports." },
  { role: "Moderator", description: "Checks physical verification evidence and flags suspicious listings." },
  { role: "Customer", description: "Searches, books, pays and leaves reviews after completion." },
];

export default async function DashboardPage() {
  const dashboard = await getDashboardData();
  const overview = [
    { label: "Profile views", value: "2,480", change: "+18%" },
    { label: "New leads", value: String(dashboard.leadCount), change: "+12%" },
    { label: "Businesses", value: String(dashboard.businessCount), change: "+9%" },
    { label: "Revenue", value: `KES ${dashboard.totalRevenue.toLocaleString()}`, change: "+22%" },
  ];

  const recentLeads = dashboard.leads.map((lead) => ({
    name: lead.name,
    service: lead.businessName,
    status: lead.status,
    time: new Date(lead.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" }),
  }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 font-semibold text-slate-900">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[#0d2f3d] p-1 shadow-sm ring-1 ring-slate-200">
              <Image src="/jiranibiz-logo.png" alt="JiraniBiz logo" width={50} height={50} className="h-full w-full object-contain" />
            </div>
            <span className="text-lg tracking-[-0.05em] text-slate-900">JiraniBiz</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/discover" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
              Public profile
            </Link>
            <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Upgrade plan
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-teal-700">Business dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Welcome back, Westgate Cleaning Co.</h1>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
            Active plan: Pro • KES 4,500 / month
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {overview.map((item) => (
            <div key={item.label} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-slate-500">{item.label}</div>
              <div className="mt-4 flex items-end justify-between">
                <div className="text-3xl font-semibold text-slate-900">{item.value}</div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{item.change}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
          <section className="space-y-6">
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Recent leads</h2>
                <button className="text-sm font-medium text-slate-700">Export</button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Business</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLeads.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-slate-500">No leads yet. New customer requests will appear here.</td>
                      </tr>
                    ) : (
                      recentLeads.map((lead) => (
                        <tr key={`${lead.name}-${lead.service}-${lead.time}`} className="border-t border-slate-200">
                          <td className="px-4 py-4 font-medium text-slate-800">{lead.name}</td>
                          <td className="px-4 py-4">{lead.service}</td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lead.status === "Booked" ? "bg-emerald-50 text-emerald-700" : lead.status === "Contacted" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">{lead.time}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Access hierarchy</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {accessHierarchy.map((item) => (
                  <div key={item.role} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.role}</div>
                    <div className="mt-3 text-sm leading-6 text-slate-700">{item.description}</div>
                  </div>
                ))}
              </div>
            </div>

            <BusinessForm />
          </section>

          <aside className="space-y-6">
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Quick actions</h2>
              <div className="mt-5 space-y-3">
                <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">+ Add new service</button>
                <button className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">Update business profile</button>
                <button className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">Promote listing</button>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">This month</p>
              <div className="mt-4 text-4xl font-semibold">KES {dashboard.totalRevenue.toLocaleString()}</div>
              <p className="mt-3 text-sm text-slate-300">Generated from {dashboard.businessCount} active listings and {dashboard.leadCount} customer leads.</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

