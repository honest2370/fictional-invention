import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Users2, Megaphone, Plus, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { sb } from "@/lib/supabase";
import { PageHeader, LoadingBlock, EmptyState, Button, Input, showToast } from "@/components/ui";

export function SellerMarketing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ coupons: 0, affiliates: 0 });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      sb.from("discount_codes").select("id", { count: "exact", head: true }).eq("seller_id", user.id),
      sb.from("affiliates").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([c, a]) => setStats({ coupons: c.count || 0, affiliates: a.count || 0 }));
  }, [user?.id]);

  const cards = [
    { label: "Coupons", desc: `${stats.coupons} active codes`, icon: Tag, path: "/seller/coupons" },
    { label: "Affiliates", desc: `${stats.affiliates} promoters`, icon: Users2, path: "/seller/affiliates" },
    { label: "Broadcasts", desc: "Message your customers", icon: Megaphone, path: "/seller/broadcasts" },
  ];

  return (
    <div className="p-4">
      <PageHeader title="Marketing" subtitle="Grow your store" />
      <div className="space-y-3">
        {cards.map((c) => (
          <button key={c.path} onClick={() => navigate(c.path)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 flex items-center gap-3 text-left">
            <div className="w-11 h-11 rounded-xl bg-blue-600/10 flex items-center justify-center shrink-0">
              <c.icon size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{c.label}</p>
              <p className="text-xs text-slate-400">{c.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

interface Coupon {
  id: string; code: string; discount_percent: number; max_uses: number; used_count: number; valid_until: string | null; is_active: boolean;
}

export function SellerCoupons() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validUntil, setValidUntil] = useState("");

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await sb.from("discount_codes").select("*").eq("seller_id", user.id).order("created_at", { ascending: false });
    setCoupons((data as Coupon[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user?.id]);

  async function createCoupon() {
    if (!user) return;
    if (!code.trim()) { showToast("Enter a coupon code", "error"); return; }
    if (!discountPercent || isNaN(Number(discountPercent))) { showToast("Enter a valid discount %", "error"); return; }

    const { error } = await sb.from("discount_codes").insert({
      seller_id: user.id, code: code.trim().toUpperCase(), discount_percent: Number(discountPercent),
      max_uses: maxUses ? Number(maxUses) : 1,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
    });
    if (error) { showToast(error.message.includes("duplicate") ? "That code already exists" : "Could not create coupon", "error"); return; }
    showToast("Coupon created", "success");
    setShowForm(false);
    setCode(""); setDiscountPercent(""); setMaxUses(""); setValidUntil("");
    load();
  }

  async function toggleActive(c: Coupon) {
    const { error } = await sb.from("discount_codes").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) { showToast("Could not update", "error"); return; }
    setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_active: !x.is_active } : x)));
  }

  async function remove(c: Coupon) {
    if (!window.confirm(`Delete coupon "${c.code}"?`)) return;
    const { error } = await sb.from("discount_codes").delete().eq("id", c.id);
    if (error) { showToast("Could not delete", "error"); return; }
    setCoupons((prev) => prev.filter((x) => x.id !== c.id));
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    showToast("Code copied", "success");
  }

  return (
    <div className="p-4">
      <PageHeader
        title="Coupons" subtitle={`${coupons.length} created`} back
        action={<Button size="sm" onClick={() => setShowForm((s) => !s)}><Plus size={14} className="inline mr-1" />New</Button>}
      />

      {showForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4 space-y-3">
          <Input label="Code" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="SAVE20" />
          <Input label="Discount %" value={discountPercent} onChange={setDiscountPercent} placeholder="20" />
          <Input label="Max uses (optional)" value={maxUses} onChange={setMaxUses} placeholder="100" />
          <Input label="Expires (optional)" value={validUntil} onChange={setValidUntil} type="date" />
          <Button fullWidth onClick={createCoupon}>Create coupon</Button>
        </div>
      )}

      {loading ? (
        <LoadingBlock rows={3} />
      ) : coupons.length === 0 ? (
        <EmptyState icon={Tag} title="No coupons yet" description="Create discount codes to encourage purchases." />
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => (
            <div key={c.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <button onClick={() => copyCode(c.code)} className="text-sm font-bold text-white">{c.code}</button>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? "bg-emerald-600/20 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>{c.is_active ? "Active" : "Off"}</span>
              </div>
              <p className="text-xs text-slate-400 mb-2">{c.discount_percent}% off · {c.used_count}/{c.max_uses} used{c.valid_until ? ` · expires ${new Date(c.valid_until).toLocaleDateString()}` : ""}</p>
              <div className="flex gap-3">
                <button onClick={() => toggleActive(c)} className="text-xs font-medium text-blue-400">{c.is_active ? "Deactivate" : "Reactivate"}</button>
                <button onClick={() => remove(c)} className="text-xs font-medium text-red-400">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SellerBroadcasts() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<"all" | "one">("all");
  const [searchEmail, setSearchEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!user) return;
    sb.from("broadcasts").select("*").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { setHistory(data || []); setLoadingHistory(false); });
  }, [user?.id]);

  async function send() {
    if (!user) return;
    if (!title.trim() || !message.trim()) { showToast("Add a title and message", "error"); return; }
    setSending(true);

    let buyerIds: string[] = [];
    if (target === "all") {
      const { data } = await sb.from("order_items")
        .select("order:order_id(buyer_id,status)")
        .eq("seller_id", user.id);
      buyerIds = Array.from(new Set(
        (data || [])
          .map((row: any) => row.order)
          .filter((o: any) => o?.status === "confirmed" && o.buyer_id)
          .map((o: any) => o.buyer_id),
      ));
    } else {
      if (!searchEmail.trim()) { setSending(false); showToast("Enter a customer email", "error"); return; }
      const { data } = await sb.from("order_items")
        .select("order:order_id(buyer_id,buyer_email)")
        .eq("seller_id", user.id);
      const match = (data || []).find((row: any) => row.order?.buyer_email === searchEmail.trim().toLowerCase() && row.order?.buyer_id);
      buyerIds = match ? [match.order.buyer_id] : [];
    }

    if (buyerIds.length === 0) {
      setSending(false);
      showToast("No customers with a Sellizi account found to notify. Guest buyers can't receive in-app notifications.", "error");
      return;
    }

    const rows = buyerIds.map((id) => ({ user_id: id, type: "promo", title: title.trim(), body: message.trim(), link: null }));
    const { error } = await sb.from("notifications").insert(rows);
    if (error) { setSending(false); showToast("Could not send broadcast", "error"); return; }

    await sb.from("broadcasts").insert({
      seller_id: user.id, title: title.trim(), message: message.trim(),
      target, target_email: target === "one" ? searchEmail.trim().toLowerCase() : null, recipient_count: rows.length,
    });

    setSending(false);
    showToast(`Sent to ${rows.length} customer${rows.length > 1 ? "s" : ""}`, "success");
    setTitle(""); setMessage("");
    sb.from("broadcasts").select("*").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(20).then(({ data }) => setHistory(data || []));
  }

  return (
    <div className="p-4">
      <PageHeader title="Broadcasts" subtitle="Message your customers" back />
      <p className="text-xs text-slate-400 mb-4">
        Delivered as an in-app notification. Only customers with a registered Sellizi account can receive it — guest buyers cannot.
      </p>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4 space-y-3">
        <Input label="Title" value={title} onChange={setTitle} placeholder="Flash sale!" />
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Message</label>
          <textarea
            value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Your message..."
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 resize-none"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTarget("all")} className={`flex-1 py-2 rounded-lg text-xs font-medium ${target === "all" ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400"}`}>All customers</button>
          <button onClick={() => setTarget("one")} className={`flex-1 py-2 rounded-lg text-xs font-medium ${target === "one" ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400"}`}>One customer</button>
        </div>
        {target === "one" && (
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} placeholder="customer@email.com" className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-9 pr-4 py-3 text-sm text-white outline-none" />
          </div>
        )}
        <Button fullWidth disabled={sending} onClick={send}><Megaphone size={14} className="inline mr-1" />{sending ? "Sending..." : "Send broadcast"}</Button>
      </div>

      <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent</p>
      {loadingHistory ? (
        <LoadingBlock rows={2} />
      ) : history.length === 0 ? (
        <EmptyState icon={Megaphone} title="No broadcasts sent yet" />
      ) : (
        <div className="space-y-2">
          {history.map((h) => (
            <div key={h.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <p className="text-sm font-medium text-white">{h.title}</p>
              <p className="text-xs text-slate-400">{h.message}</p>
              <p className="text-xs text-slate-500 mt-1">{new Date(h.created_at).toLocaleDateString()} · {h.recipient_count} recipient{h.recipient_count === 1 ? "" : "s"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
