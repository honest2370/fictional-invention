import { useEffect, useState } from "react";
import { TrendingUp, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { sb } from "@/lib/supabase";
import { PageHeader, LoadingBlock, EmptyState, Button, Input, fmtMoney, showToast } from "@/components/ui";
import type { CustomCharge } from "@/types";

export function SellerRevenue() {
  const { user } = useAuth();
  const [monthly, setMonthly] = useState<{ month: string; amount: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const currency = user?.currency || "XAF";

  useEffect(() => {
    if (!user) return;
    sb.from("analytics_sales").select("amount, date").eq("seller_id", user.id).then(({ data }) => {
      const totals: Record<string, number> = {};
      let sum = 0;
      (data || []).forEach((r: any) => {
        const month = new Date(r.date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
        totals[month] = (totals[month] || 0) + Number(r.amount);
        sum += Number(r.amount);
      });
      setMonthly(Object.entries(totals).map(([month, amount]) => ({ month, amount })).slice(-6));
      setTotal(sum);
      setLoading(false);
    });
  }, [user?.id]);

  return (
    <div className="p-4">
      <PageHeader title="Revenue" subtitle="Lifetime earnings" back />
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4">
        <p className="text-xs text-slate-400 mb-1">Total revenue</p>
        <p className="text-2xl font-bold text-white">{fmtMoney(total, currency)}</p>
      </div>
      <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">By month</p>
      {loading ? (
        <LoadingBlock rows={3} />
      ) : monthly.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No revenue yet" description="Completed sales will be broken down by month here." />
      ) : (
        <div className="space-y-2">
          {monthly.map((m) => (
            <div key={m.month} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm text-white">{m.month}</span>
              <span className="text-sm font-semibold text-white">{fmtMoney(m.amount, currency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SellerCustomCharges() {
  const { user } = useAuth();
  const [charges, setCharges] = useState<CustomCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState("");

  async function load() {
    if (!user) return;
    const { data } = await sb.from("custom_charges").select("*").eq("store_id", user.id).order("created_at", { ascending: false });
    setCharges((data as CustomCharge[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user?.id]);

  async function create() {
    if (!user) return;
    if (!name.trim() || !value || isNaN(Number(value))) { showToast("Enter a charge name and value", "error"); return; }
    const { error } = await sb.from("custom_charges").insert({ store_id: user.id, name: name.trim(), type, value: Number(value) });
    if (error) { showToast(error.message, "error"); return; }
    showToast("Charge added", "success");
    setShowForm(false); setName(""); setValue("");
    load();
  }

  async function toggle(c: CustomCharge) {
    await sb.from("custom_charges").update({ is_active: !c.is_active }).eq("id", c.id);
    load();
  }

  async function remove(c: CustomCharge) {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    await sb.from("custom_charges").delete().eq("id", c.id);
    load();
  }

  return (
    <div className="p-4">
      <PageHeader
        title="Custom Charges" subtitle="Extra fees applied at checkout" back
        action={<Button size="sm" onClick={() => setShowForm((s) => !s)}><Plus size={14} className="inline mr-1" />New</Button>}
      />

      {showForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4 space-y-3">
          <Input label="Charge name" value={name} onChange={setName} placeholder="Handling fee" />
          <div className="grid grid-cols-2 gap-2">
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white">
              <option value="percentage">Percentage %</option>
              <option value="fixed">Fixed amount</option>
            </select>
            <Input value={value} onChange={setValue} placeholder="Value" />
          </div>
          <Button fullWidth onClick={create}>Add charge</Button>
        </div>
      )}

      {loading ? (
        <LoadingBlock rows={3} />
      ) : charges.length === 0 ? (
        <EmptyState icon={Plus} title="No custom charges" description="Add fees like handling or service charges that apply at checkout." />
      ) : (
        <div className="space-y-2">
          {charges.map((c) => (
            <div key={c.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{c.name}</p>
                <p className="text-xs text-slate-400">{c.type === "percentage" ? `${c.value}%` : fmtMoney(c.value, user?.currency)}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => toggle(c)} className={`text-xs px-2 py-1 rounded-full ${c.is_active ? "bg-emerald-600/20 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>{c.is_active ? "Active" : "Off"}</button>
                <button onClick={() => remove(c)}><Trash2 size={15} className="text-red-400" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
