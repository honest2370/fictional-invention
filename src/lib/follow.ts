import { sb } from "./supabase";

export async function toggleFollowStore(userId: string, storeId: string): Promise<boolean> {
  const { data: existing } = await sb.from("store_followers").select("id").eq("store_id", storeId).eq("user_id", userId).maybeSingle();
  if (existing) {
    await sb.from("store_followers").delete().eq("id", existing.id);
    return false;
  }
  await sb.from("store_followers").insert({ store_id: storeId, user_id: userId });
  return true;
}

export async function isFollowingStore(userId: string, storeId: string): Promise<boolean> {
  const { data } = await sb.from("store_followers").select("id").eq("store_id", storeId).eq("user_id", userId).maybeSingle();
  return !!data;
}

export async function loadFollowedStores(userId: string) {
  const { data } = await sb.from("store_followers")
    .select("*, store:store_id(id,store_name,store_slug,store_logo_url,follower_count)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data || [];
}
