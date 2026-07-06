import { useEffect, useState } from "react";
import { Plus, Trash2, Copy, Webhook as WebhookIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { sb } from "@/lib/supabase";
import { PageHeader, LoadingBlock, EmptyState, Button, Input, showToast } from "@/components/ui";
import type { Webhook } from "@/types";

const AVAILABLE_EVENTS = ["order.completed", "order.failed", "product.reviewed", "affiliate.converted"];

export default function SellerWebhooks() {
  const { user } = useAuth();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["order.completed"]);

  async function load() {
    if (!user) return;
    const { data } = await sb.from("webhooks").select("*").eq("store_id", user.id).order("created_at", { ascending: false });
    setWebhooks((data as Webhook[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user?.id]);

  function toggleEvent(evt: string) {
    setEvents((prev) => (prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]));
  }

  async function create() {
    if (!user) return;
    if (!url.trim() || !url.startsWith("http")) { showToast("Enter a valid HTTPS URL", "error"); return; }
    if (events.length === 0) { showToast("Select at least one event", "error"); return; }
    const { error } = await sb.from("webhooks").insert({ store_id: user.id, url: url.trim(), events });
    if (error) { showToast(error.message, "error"); return; }
    showToast("Webhook added", "success");
    setShowForm(false); setUrl(""); setEvents(["order.completed"]);
    load();
  }

  async function toggle(w: Webhook) {
    await sb.from("webhooks").update({ is_active: !w.is_active }).eq("id", w.id);
    load();
  }

  async function remove(w: Webhook) {
    if (!window.confirm("Delete this webhook?")) return;
    await sb.from("webhooks").delete().eq("id", w.id);
    load();
  }

  function copySecret(secret: string) {
    navigator.clipboard.writeText(secret);
    showToast("Secret copied", "success");
  }

  return (
    <div className="p-4">
      <PageHeader
        title="Webhooks" subtitle="Notify your systems on events" back
        action={<Button size="sm" onClick={() => setShowForm((s) => !s)}><Plus size={14} className="inline mr-1" />New</Button>}
      />

      {showForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4 space-y-3">
          <Input label="Endpoint URL" value={url} onChange={setUrl} placeholder="https://yourapp.com/webhooks/sellizi" />
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Events</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_EVENTS.map((evt) => (
                <button
                  key={evt} onClick={() => toggleEvent(evt)}
                  className={`text-xs px-3 py-1.5 rounded-full ${events.includes(evt) ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400"}`}
                >
                  {evt}
                </button>
              ))}
            </div>
          </div>
          <Button fullWidth onClick={create}>Add webhook</Button>
        </div>
      )}

      {loading ? (
        <LoadingBlock rows={3} />
      ) : webhooks.length === 0 ? (
        <EmptyState icon={WebhookIcon} title="No webhooks configured" description="Add an endpoint to receive real-time order and sales events." />
      ) : (
        <div className="space-y-2">
          {webhooks.map((w) => (
            <div key={w.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white truncate max-w-[70%]">{w.url}</p>
                <button onClick={() => toggle(w)} className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${w.is_active ? "bg-emerald-600/20 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>{w.is_active ? "Active" : "Off"}</button>
              </div>
              <p className="text-xs text-slate-400 mb-2">{w.events.join(", ")}</p>
              <div className="flex items-center gap-3">
                <button onClick={() => copySecret(w.secret)} className="text-xs font-medium text-blue-400 flex items-center gap-1"><Copy size={12} /> Copy secret</button>
                <button onClick={() => remove(w)}><Trash2 size={14} className="text-red-400" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
