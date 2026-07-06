import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { sb } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, Spinner } from "@/components/ui";
import { Seo, breadcrumbJsonLd } from "@/components/Seo";
import { toggleFollowStore, isFollowingStore } from "@/lib/follow";
import { Star, Menu, X, Home, ShoppingBag, LogOut, Heart, Search } from "lucide-react";
import type { Product, AppUser } from "@/types";

export default function StorefrontPage() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [seller, setSeller] = useState<AppUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!storeSlug) return;
    async function load() {
      // Support lookup by store_slug (public URL) or raw user id (internal links from product pages).
      const bySlug = await sb.from("users").select("*").eq("store_slug", storeSlug).eq("is_store_public", true).maybeSingle();
      const sellerRow = bySlug.data || (await sb.from("users").select("*").eq("id", storeSlug).eq("is_store_public", true).maybeSingle()).data;
      if (!sellerRow) { setNotFound(true); setLoading(false); return; }
      setSeller(sellerRow as AppUser);

      const [{ data: p }, { data: cats }] = await Promise.all([
        sb.from("products").select("*").eq("seller_id", sellerRow.id).eq("status", "approved").order("created_at", { ascending: false }),
        sb.from("products").select("category_id, categories:category_id(id,name)").eq("seller_id", sellerRow.id).eq("status", "approved"),
      ]);
      setProducts((p as Product[]) || []);
      const uniqueCats = new Map<string, string>();
      (cats as any[] || []).forEach((row) => { if (row.categories) uniqueCats.set(row.categories.id, row.categories.name); });
      setCategories(Array.from(uniqueCats, ([id, name]) => ({ id, name })));

      // Track this storefront visit for the seller's analytics.
      sb.from("analytics_views").insert({ store_id: sellerRow.id, product_id: null, referrer: document.referrer || null }).then(() => {});

      if (user) setFollowing(await isFollowingStore(user.id, sellerRow.id));
      setLoading(false);
    }
    load();
  }, [storeSlug, user?.id]);

  async function handleFollow() {
    if (!user) { navigate("/buyer/login"); return; }
    if (!seller) return;
    const newState = await toggleFollowStore(user.id, seller.id);
    setFollowing(newState);
    setSeller((s) => (s ? { ...s, follower_count: (s.follower_count || 0) + (newState ? 1 : -1) } : s));
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-blue-600" /></div>;
  if (notFound || !seller) return <p className="text-center text-slate-400 py-20">Store not found.</p>;

  const filtered = products.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !activeCategory || p.category_id === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pb-8 relative">
      <Seo
        title={`${seller.store_name || seller.name} — Store`}
        description={seller.store_bio || `Browse digital products from ${seller.store_name || seller.name} on Sellizi.`}
        path={`/store/${seller.store_slug || seller.id}`}
        image={seller.store_banner_url}
        type="profile"
        jsonLd={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: seller.store_name || "Store", path: `/store/${seller.store_slug}` }])}
      />

      {/* Top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <button onClick={() => setDrawerOpen(true)} aria-label="Menu"><Menu size={22} className="text-slate-700" /></button>
        <p className="font-bold text-sm text-slate-900 truncate max-w-[60%]">{seller.store_name || seller.name}</p>
        <button onClick={() => navigate("/buyer/wishlist")} aria-label="Wishlist"><Heart size={20} className="text-slate-700" /></button>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[900] flex" onClick={() => setDrawerOpen(false)}>
          <div className="w-72 bg-white h-full shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <p className="font-extrabold text-slate-900">{(seller.store_name || "Store").toUpperCase()}</p>
              <button onClick={() => setDrawerOpen(false)}><X size={20} className="text-slate-400" /></button>
            </div>

            <button onClick={() => { setDrawerOpen(false); }} className="w-full flex items-center justify-between py-3 border-b border-slate-100">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700"><Home size={16} /> Store Home</span>
            </button>

            {user ? (
              <>
                <p className="text-xs font-semibold text-slate-400 uppercase mt-4 mb-2">My Account</p>
                <div className="flex items-center gap-2 py-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">{(user.name || "U")[0]}</div>
                  <span className="text-sm font-medium text-slate-800">{user.name}</span>
                </div>
                <button onClick={() => { navigate("/buyer/account"); setDrawerOpen(false); }} className="w-full text-left text-sm text-slate-700 py-2">Dashboard</button>
                <button onClick={() => { navigate("/buyer/orders"); setDrawerOpen(false); }} className="w-full text-left text-sm text-slate-700 py-2 flex items-center gap-2"><ShoppingBag size={15} /> Purchases</button>
                <button
                  onClick={async () => { await signOut(); setDrawerOpen(false); navigate("/"); }}
                  className="w-full mt-4 bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <LogOut size={15} /> Logout
                </button>
              </>
            ) : (
              <button onClick={() => navigate("/buyer/login")} className="w-full mt-4 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold">
                Sign in
              </button>
            )}
          </div>
        </div>
      )}

      {seller.store_banner_url ? (
        <img src={seller.store_banner_url} className="w-full h-32 object-cover" alt="" />
      ) : (
        <div className="w-full h-32" style={{ backgroundColor: seller.store_theme_color || "#2563eb" }} />
      )}

      <div className="px-4 -mt-8 flex items-end justify-between gap-3 mb-4">
        <div className="flex items-end gap-3">
          {seller.store_logo_url ? (
            <img src={seller.store_logo_url} className="w-16 h-16 rounded-2xl border-4 border-white object-cover" alt="" />
          ) : (
            <div className="w-16 h-16 rounded-2xl border-4 border-white bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-500">
              {(seller.store_name || seller.name || "S")[0]}
            </div>
          )}
        </div>
        <button
          onClick={handleFollow}
          className={`mb-1 flex items-center gap-1 text-xs font-semibold px-3.5 py-2 rounded-full border ${following ? "bg-blue-600 text-white border-blue-600" : "border-blue-600 text-blue-600"}`}
        >
          <Heart size={13} className={following ? "fill-white" : ""} /> {following ? "Following" : "Follow"}
        </button>
      </div>

      <div className="px-4">
        <h1 className="text-xl font-extrabold text-slate-900">{seller.store_name || seller.name}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{(seller.follower_count || 0).toLocaleString()} follower{seller.follower_count === 1 ? "" : "s"} · {products.length} product{products.length === 1 ? "" : "s"}</p>
        {seller.store_bio && <p className="text-sm text-slate-500 mt-2 mb-4">{seller.store_bio}</p>}

        <div className="relative my-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4 no-scrollbar">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${!activeCategory ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id} onClick={() => setActiveCategory(c.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${activeCategory === c.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-16 text-sm">No products found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => (
              <Card key={p.id} className="cursor-pointer p-2.5">
                <div onClick={() => navigate(`/buyer/product/${p.slug}`)}>
                  {p.cover_url ? (
                    <img src={p.cover_url} className="w-full h-28 object-cover rounded-xl mb-2" alt={p.title} />
                  ) : (
                    <div className="w-full h-28 bg-slate-100 rounded-xl mb-2 flex items-center justify-center text-3xl">📦</div>
                  )}
                  <p className="font-semibold text-sm line-clamp-2 mb-1">{p.title}</p>
                  {p.rating_count > 0 && (
                    <div className="flex items-center gap-1 mb-1">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span className="text-xs text-slate-500">{p.rating_avg.toFixed(1)} ({p.rating_count})</span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-blue-600 font-bold">{p.price.toLocaleString()} {p.currency}</p>
                    {p.compare_price && p.compare_price > p.price && (
                      <p className="text-xs text-slate-400 line-through">{p.compare_price.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-400 mt-8">
        Powered by <span className="font-bold text-blue-600">SELLIZI</span>
      </p>
    </div>
  );
}
