import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays, parseISO, startOfMonth } from "date-fns";
import {
  AreaChart, Area, LineChart, Line, XAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Eye, TrendingUp, Globe, FileDown, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { sb } from "@/lib/supabase";
import { PageHeader, LoadingBlock, EmptyState, fmtMoney, showToast } from "@/components/ui";
import type { AnalyticsSaleRow, AnalyticsViewRow } from "@/types";

function useRangeData(days: number) {
  const { user } = useAuth();
  const [sales, setSales] = useState<AnalyticsSaleRow[]>([]);
  const [views, setViews] = useState<AnalyticsViewRow[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    const since = subDays(new Date(), days).toISOString();

    (async () => {
      const [salesRes, viewsRes, productsRes] = await Promise.all([
        sb.from("analytics_sales").select("amount, currency, date, product_id").eq("seller_id", user.id).gte("date", since),
        sb.from("analytics_views").select("created_at, referrer, country_code, product_id").eq("store_id", user.id).gte("created_at", since),
        sb.from("products").select("id, title").eq("seller_id", user.id),
      ]);
      if (!active) return;
      setSales((salesRes.data as AnalyticsSaleRow[]) || []);
      setViews((viewsRes.data as AnalyticsViewRow[]) || []);
      const map: Record<string, string> = {};
      (productsRes.data || []).forEach((p: any) => (map[p.id] = p.title));
      setProductNames(map);
      setLoading(false);
    })();

    return () => { active = false; };
  }, [user?.id, days]);

  return { sales, views, productNames, loading, currency: user?.currency || "XAF" };
}

function groupByDay(items: { date: string }[], days: number, valueFn: (item: any) => number) {
  const buckets: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) buckets[format(subDays(new Date(), i), "MMM d")] = 0;
  items.forEach((it) => {
    const key = format(parseISO(it.date), "MMM d");
    if (key in buckets) buckets[key] += valueFn(it);
  });
  return Object.entries(buckets).map(([date, value]) => ({ date, value }));
}

export function SellerAnalytics() {
  const navigate = useNavigate();
  const { sales, views, productNames, loading, currency } = useRangeData(14);

  const totalRevenue = sales.reduce((s, r) => s + Number(r.amount), 0);
  const totalViews = views.length;
  const totalOrders = sales.length;
  const conversion = totalViews > 0 ? ((totalOrders / totalViews) * 100).toFixed(1) : "0.0";
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const chartData = useMemo(() => groupByDay(sales, 14, (r) => Number(r.amount)), [sales]);

  const topProducts = useMemo(() => {
    const totals: Record<string, number> = {};
    sales.forEach((s) => {
      if (!s.product_id) return;
      totals[s.product_id] = (totals[s.product_id] || 0) + Number(s.amount);
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([id, amount]) => ({ name: productNames[id] || "Product", amount }));
  }, [sales, productNames]);

  const links = [
    { label: "Sales Chart", path: "/seller/analytics/sales" },
    { label: "Visitors", path: "/seller/analytics/visitors" },
    { label: "Conversion", path: "/seller/analytics/conversion" },
    { label: "Link Traffic", path: "/seller/analytics/traffic" },
    { label: "Reports", path: "/seller/analytics/reports" },
  ];

  return (
    <div className="p-4">
      <PageHeader title="Analytics" subtitle="Store performance (last 14 days)" />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card bg-slate-800 border border-slate-700 rounded-xl p-3"><p className="text-xs text-slate-400 mb-1">Total Views</p><p className="text-xl font-bold text-white">{loading ? "—" : totalViews}</p></div>
        <div className="card bg-slate-800 border border-slate-700 rounded-xl p-3"><p className="text-xs text-slate-400 mb-1">Conversion</p><p className="text-xl font-bold text-white">{loading ? "—" : `${conversion}%`}</p></div>
        <div className="card bg-slate-800 border border-slate-700 rounded-xl p-3"><p className="text-xs text-slate-400 mb-1">Revenue</p><p className="text-lg font-bold text-white">{loading ? "—" : fmtMoney(totalRevenue, currency)}</p></div>
        <div className="card bg-slate-800 border border-slate-700 rounded-xl p-3"><p className="text-xs text-slate-400 mb-1">Avg Order</p><p className="text-lg font-bold text-white">{loading ? "—" : fmtMoney(avgOrder, currency)}</p></div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4">
        <p className="text-sm font-semibold text-white mb-3">Revenue trend</p>
        {loading ? (
          <LoadingBlock rows={1} />
        ) : totalRevenue === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No sales in this period yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={2} />
              <Tooltip formatter={(v: number) => fmtMoney(v, currency)} />
              <Area type="monotone" dataKey="value" stroke="#2563eb" fill="url(#rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Top Products</p>
      {!loading && topProducts.length === 0 ? (
        <EmptyState icon={BarChart3} title="No product sales yet" description="Once you make sales, your top products show up here." />
      ) : (
        <div className="space-y-2 mb-4">
          {topProducts.map((p) => (
            <div key={p.name} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm text-white">{p.name}</span>
              <span className="text-sm font-semibold text-white">{fmtMoney(p.amount, currency)}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Deep Dive</p>
      <div className="grid grid-cols-2 gap-3">
        {links.map((l) => (
          <button key={l.path} onClick={() => navigate(l.path)} className="bg-slate-800 border border-slate-700 rounded-xl text-sm font-medium text-white text-left py-3 px-3">
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SellerSalesChart() {
  const [range, setRange] = useState(30);
  const { sales, loading, currency } = useRangeData(range);
  const data = useMemo(() => groupByDay(sales, range, (r) => Number(r.amount)), [sales, range]);
  const total = sales.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="p-4">
      <PageHeader title="Sales Chart" subtitle={fmtMoney(total, currency)} back />
      <div className="flex gap-2 mb-4">
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setRange(d)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${range === d ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>{d}d</button>
        ))}
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        {loading ? (
          <LoadingBlock rows={1} />
        ) : total === 0 ? (
          <EmptyState icon={TrendingUp} title="No sales in this range" description="Sales recorded through completed orders will appear here." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="rev2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={Math.ceil(range / 8)} />
              <Tooltip formatter={(v: number) => fmtMoney(v, currency)} />
              <Area type="monotone" dataKey="value" stroke="#2563eb" fill="url(#rev2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function SellerVisitors() {
  const [range, setRange] = useState(30);
  const { views, loading } = useRangeData(range);

  const data = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = range - 1; i >= 0; i--) buckets[format(subDays(new Date(), i), "MMM d")] = 0;
    views.forEach((v) => {
      const key = format(parseISO(v.created_at), "MMM d");
      if (key in buckets) buckets[key] += 1;
    });
    return Object.entries(buckets).map(([date, value]) => ({ date, value }));
  }, [views, range]);

  return (
    <div className="p-4">
      <PageHeader title="Visitors" subtitle={`${views.length} views`} back />
      <div className="flex gap-2 mb-4">
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setRange(d)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${range === d ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>{d}d</button>
        ))}
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        {loading ? (
          <LoadingBlock rows={1} />
        ) : views.length === 0 ? (
          <EmptyState icon={Eye} title="No visitors yet" description="Storefront and product page visits will appear here." />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={Math.ceil(range / 8)} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function SellerConversionRate() {
  const [range, setRange] = useState(30);
  const { views, sales, loading } = useRangeData(range);

  const data = useMemo(() => {
    const viewBuckets: Record<string, number> = {};
    const saleBuckets: Record<string, number> = {};
    for (let i = range - 1; i >= 0; i--) {
      const key = format(subDays(new Date(), i), "MMM d");
      viewBuckets[key] = 0;
      saleBuckets[key] = 0;
    }
    views.forEach((v) => {
      const key = format(parseISO(v.created_at), "MMM d");
      if (key in viewBuckets) viewBuckets[key]++;
    });
    sales.forEach((s) => {
      const key = format(parseISO(s.date), "MMM d");
      if (key in saleBuckets) saleBuckets[key]++;
    });
    return Object.keys(viewBuckets).map((date) => ({
      date, rate: viewBuckets[date] > 0 ? Number(((saleBuckets[date] / viewBuckets[date]) * 100).toFixed(1)) : 0,
    }));
  }, [views, sales, range]);

  const overall = views.length > 0 ? ((sales.length / views.length) * 100).toFixed(1) : "0.0";

  return (
    <div className="p-4">
      <PageHeader title="Conversion Rate" subtitle={`${overall}% overall`} back />
      <div className="flex gap-2 mb-4">
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setRange(d)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${range === d ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>{d}d</button>
        ))}
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        {loading ? (
          <LoadingBlock rows={1} />
        ) : views.length === 0 ? (
          <EmptyState icon={TrendingUp} title="Not enough data yet" description="Conversion rate needs both storefront views and sales to calculate." />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={Math.ceil(range / 8)} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Line type="monotone" dataKey="rate" stroke="#ec4899" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function SellerLinkTraffic() {
  const [range, setRange] = useState(30);
  const { views, loading } = useRangeData(range);

  const byReferrer = useMemo(() => {
    const counts: Record<string, number> = {};
    views.forEach((v) => {
      let ref = v.referrer || "Direct";
      try { if (ref !== "Direct") ref = new URL(ref).hostname.replace("www.", ""); } catch { /* keep raw value */ }
      counts[ref] = (counts[ref] || 0) + 1;
    });
    const total = views.length || 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([ref, count]) => ({ ref, count, pct: Math.round((count / total) * 100) }));
  }, [views]);

  return (
    <div className="p-4">
      <PageHeader title="Link Traffic" subtitle="Referrer breakdown" back />
      <div className="flex gap-2 mb-4">
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setRange(d)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${range === d ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>{d}d</button>
        ))}
      </div>
      {loading ? (
        <LoadingBlock rows={4} />
      ) : byReferrer.length === 0 ? (
        <EmptyState icon={Globe} title="No traffic data yet" description="Referrer data is captured when someone visits your store or product link." />
      ) : (
        <div className="space-y-2">
          {byReferrer.map((r) => (
            <div key={r.ref} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-white">{r.ref}</span>
                <span className="text-sm text-slate-400">{r.count} · {r.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${r.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SellerReports() {
  const { user } = useAuth();
  const [rows, setRows] = useState<{ month: string; revenue: number; orders: number; views: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const currency = user?.currency || "XAF";

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = startOfMonth(subDays(new Date(), 180)).toISOString();
      const [salesRes, viewsRes] = await Promise.all([
        sb.from("analytics_sales").select("amount, date").eq("seller_id", user.id).gte("date", since),
        sb.from("analytics_views").select("created_at").eq("store_id", user.id).gte("created_at", since),
      ]);
      const months: Record<string, { revenue: number; orders: number; views: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const key = format(startOfMonth(subDays(new Date(), i * 30)), "MMM yyyy");
        months[key] = { revenue: 0, orders: 0, views: 0 };
      }
      (salesRes.data || []).forEach((s: any) => {
        const key = format(startOfMonth(parseISO(s.date)), "MMM yyyy");
        if (months[key]) { months[key].revenue += Number(s.amount); months[key].orders += 1; }
      });
      (viewsRes.data || []).forEach((v: any) => {
        const key = format(startOfMonth(parseISO(v.created_at)), "MMM yyyy");
        if (months[key]) months[key].views += 1;
      });
      setRows(Object.entries(months).map(([month, v]) => ({ month, ...v })));
      setLoading(false);
    })();
  }, [user?.id]);

  const exportCsv = () => {
    const header = "Month,Revenue,Orders,Views\n";
    const body = rows.map((r) => `${r.month},${r.revenue},${r.orders},${r.views}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sellizi-report.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Report downloaded", "success");
  };

  return (
    <div className="p-4">
      <PageHeader
        title="Reports" subtitle="Last 6 months" back
        action={<button onClick={exportCsv} className="border border-slate-700 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1"><FileDown size={14} /> CSV</button>}
      />
      {loading ? (
        <LoadingBlock rows={4} />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.month} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <p className="text-sm font-semibold text-white mb-2">{r.month}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xs text-slate-400">Revenue</p><p className="text-sm font-medium text-white">{fmtMoney(r.revenue, currency)}</p></div>
                <div><p className="text-xs text-slate-400">Orders</p><p className="text-sm font-medium text-white">{r.orders}</p></div>
                <div><p className="text-xs text-slate-400">Views</p><p className="text-sm font-medium text-white">{r.views}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
