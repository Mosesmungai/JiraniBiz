import type { BusinessAnalytics } from "@/lib/store";

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(20,48,43,0.04)] sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

export function BusinessInsights({ businesses }: { businesses: BusinessAnalytics[] }) {
  if (!businesses.length) return null;

  const totals = businesses.reduce((summary, business) => ({
    views: summary.views + business.views,
    uniqueVisitors: summary.uniqueVisitors + business.uniqueVisitors,
    bookingRequests: summary.bookingRequests + business.bookingRequests,
    leadEnquiries: summary.leadEnquiries + business.leadEnquiries,
  }), { views: 0, uniqueVisitors: 0, bookingRequests: 0, leadEnquiries: 0 });
  const bookingConversion = totals.views
    ? `${((totals.bookingRequests / totals.views) * 100).toFixed(1)}%`
    : "—";
  const daily = businesses.reduce((days, business) => {
    for (const metric of business.daily) {
      const day = days.get(metric.day) ?? { views: 0, bookingRequests: 0 };
      day.views += metric.views;
      day.bookingRequests += metric.bookingRequests;
      days.set(metric.day, day);
    }
    return days;
  }, new Map<string, { views: number; bookingRequests: number }>());
  const chartDays = [...daily.entries()].sort(([left], [right]) => left.localeCompare(right)).slice(-14);
  const chartMaximum = Math.max(1, ...chartDays.map(([, metrics]) => Math.max(metrics.views, metrics.bookingRequests)));
  const serviceTotals = new Map<string, number>();
  for (const business of businesses) {
    for (const service of business.requestedServices) {
      serviceTotals.set(service.name, (serviceTotals.get(service.name) ?? 0) + service.requests);
    }
  }
  const topServices = [...serviceTotals.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5);
  const serviceMaximum = Math.max(1, ...topServices.map(([, requests]) => requests));

  return (
    <section aria-labelledby="business-insights-heading" className="space-y-4">
      <div>
        <p className="eyebrow">Last 30 days</p>
        <h2 id="business-insights-heading" className="mt-1 text-xl font-semibold text-slate-900">Business performance</h2>
        <p className="mt-1 text-sm text-slate-600">See which listings are attracting attention and what customers are asking to book.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Profile views" value={totals.views.toLocaleString()} detail="Business profile visits from browser sessions" />
        <MetricCard label="Estimated visitors" value={totals.uniqueVisitors.toLocaleString()} detail="Approx. unique browser/IP combinations per day" />
        <MetricCard label="Booking requests" value={totals.bookingRequests.toLocaleString()} detail="Bookings created in the last 30 days" />
        <MetricCard label="View-to-booking rate" value={bookingConversion} detail="Booking requests divided by profile views" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section aria-label="Daily profile views and booking requests" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">Views and booking requests</h3>
              <p className="mt-1 text-xs text-slate-500">Daily totals for the last 14 days</p>
            </div>
            <div className="flex gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-emerald-700" />Views</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-amber-400" />Bookings</span>
            </div>
          </div>
          {chartDays.length ? (
            <div className="mt-5 grid h-40 grid-cols-7 items-end gap-2 sm:grid-cols-[repeat(14,minmax(0,1fr))]" role="img" aria-label={chartDays.map(([day, counts]) => `${day}: ${counts.views} views, ${counts.bookingRequests} booking requests`).join("; ")}>
              {chartDays.map(([day, counts]) => (
                <div key={day} className="flex h-full min-w-0 flex-col justify-end gap-1">
                  <div className="flex h-full items-end justify-center gap-1" title={`${day}: ${counts.views} views, ${counts.bookingRequests} bookings`}>
                    <span className="w-2 rounded-t bg-emerald-700" style={{ height: `${Math.max(counts.views ? 5 : 0, (counts.views / chartMaximum) * 100)}%` }} />
                    <span className="w-2 rounded-t bg-amber-400" style={{ height: `${Math.max(counts.bookingRequests ? 5 : 0, (counts.bookingRequests / chartMaximum) * 100)}%` }} />
                  </div>
                  <span className="truncate text-center text-[10px] text-slate-500">{day.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-600">Daily activity will appear here as customers visit your profiles.</p>
          )}
        </section>

        <section aria-labelledby="service-demand-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)]">
          <h3 id="service-demand-heading" className="font-semibold text-slate-900">Most requested services</h3>
          <p className="mt-1 text-xs text-slate-500">Booking requests and direct enquiries</p>
          {topServices.length ? (
            <ol className="mt-5 space-y-4">
              {topServices.map(([name, requests]) => (
                <li key={name}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium text-slate-700">{name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">{requests}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-700" style={{ width: `${(requests / serviceMaximum) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-5 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-600">Requested services will show here after your first booking request.</p>
          )}
          {totals.leadEnquiries > 0 && (
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              {totals.leadEnquiries.toLocaleString()} direct {totals.leadEnquiries === 1 ? "enquiry" : "enquiries"} in this period.
            </p>
          )}
        </section>
      </div>

      {businesses.length > 1 && (
        <section aria-label="Performance by business" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)]">
          <h3 className="font-semibold text-slate-900">Performance by listing</h3>
          <div className="mt-3 divide-y divide-slate-100">
            {businesses.map((business) => (
              <div key={business.businessId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="font-medium text-slate-800">{business.businessName}</span>
                <span className="text-sm text-slate-600">{business.views} views · {business.bookingRequests} bookings · {business.leadEnquiries} enquiries</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
