import React, { useState } from "react";
import { sb } from "@/lib/supabase";
import { Button, Input, Card, showToast, Spinner } from "@/components/ui";
import { Seo } from "@/components/Seo";
import { Package } from "lucide-react";

interface AccessRow {
  id: string;
  product_id: string;
  order_id: string | null;
  product?: { title: string; cover_url: string | null };
  order?: { delivery_link: string | null } | null;
}

/**
 * Lets a guest buyer (no account) retrieve their purchases from any device
 * using the email + 6-digit PIN they were given at checkout confirmation.
 */
export default function GuestPurchases() {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AccessRow[] | null>(null);

  async function lookup() {
    if (!email.trim() || pin.trim().length !== 6) {
      showToast("Enter your email and 6-digit PIN", "error");
      return;
    }
    setLoading(true);
    const { data, error } = await sb.from("buyer_access")
      .select("id, product_id, order_id, product:product_id(title,cover_url)")
      .eq("email", email.trim().toLowerCase())
      .eq("pin", pin.trim())
      .eq("is_active", true);
    setLoading(false);
    if (error) { showToast("Could not look up your purchases", "error"); return; }
    if (!data || data.length === 0) { showToast("No purchases found for that email and PIN", "error"); setResults([]); return; }
    setResults(data as any[]);

    // best-effort access tracking
    sb.from("buyer_access").update({ access_count: 1, last_accessed_at: new Date().toISOString() })
      .eq("email", email.trim().toLowerCase()).eq("pin", pin.trim()).then(() => {});
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <Seo title="Find your purchases" description="Retrieve your Sellizi purchases using your email and PIN." path="/purchases" noindex />
      <h1 className="text-xl font-extrabold text-slate-900 mb-1">Find your purchases</h1>
      <p className="text-sm text-slate-500 mb-4">
        Enter the email you used at checkout and the 6-digit PIN shown on your order confirmation.
      </p>

      <Input label="Email" value={email} onChange={setEmail} placeholder="you@email.com" type="email" />
      <Input label="6-digit PIN" value={pin} onChange={setPin} placeholder="123456" />
      <Button fullWidth disabled={loading} onClick={lookup}>{loading ? "Searching…" : "Find my purchases"}</Button>

      {loading && <div className="flex justify-center py-10"><Spinner className="text-blue-600" /></div>}

      {results && results.length > 0 && (
        <div className="mt-6 space-y-3">
          {results.map((r) => (
            <Card key={r.id} className="flex gap-3 items-center">
              {r.product?.cover_url ? (
                <img src={r.product.cover_url} className="w-12 h-12 rounded-lg object-cover" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center"><Package size={18} className="text-slate-400" /></div>
              )}
              <p className="text-sm font-semibold text-slate-800 flex-1">{r.product?.title}</p>
            </Card>
          ))}
        </div>
      )}

      {results && results.length === 0 && (
        <p className="text-center text-slate-400 text-sm mt-8">No purchases found. Double check your email and PIN.</p>
      )}
    </div>
  );
}
