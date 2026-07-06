export type UserRole = "buyer" | "seller" | "admin";

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: UserRole;
  balance: number;
  currency: string;
  country_code: string | null;
  store_name?: string | null;
  store_slug?: string | null;
  store_bio?: string | null;
  store_logo_url?: string | null;
  store_banner_url?: string | null;
  store_theme_color?: string | null;
  is_store_public?: boolean;
  is_verified?: boolean;
  push_enabled?: boolean;
  follower_count?: number;
  custom_domain?: string | null;
  checkout_settings?: CheckoutSettings;
}

export type ProductType = "digital" | "account" | "course" | "link" | "service";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  seller_id: string;
  seller_name: string;
  title: string;
  slug: string;
  short_desc: string | null;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  discount_percent: number | null;
  discount_until: string | null;
  currency: string;
  cover_url: string | null;
  gallery_urls: string[] | null;
  file_url: string | null;
  delivery_link: string | null;
  type: ProductType;
  status: "pending" | "approved" | "rejected" | "archived";
  category_id: string | null;
  total_slots: number | null;
  available_slots: number | null;
  account_platform: string | null;
  cred1_label: string | null;
  cred2_label: string | null;
  slot_instructions: string | null;
  curriculum: CourseModule[] | null;
  affiliate_enabled: boolean | null;
  affiliate_commission: number | null;
  allow_reviews: boolean;
  is_featured: boolean;
  view_count: number;
  purchase_count: number;
  rating_avg: number;
  rating_count: number;
  wishlist_count: number;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  og_image_url: string | null;
  created_at: string;
  compare_price?: number | null;
  is_digital?: boolean;
  stock_count?: number; // -1 = unlimited
  content_data?: Record<string, any>;
  delivery_method?: "instant" | "manual" | "scheduled" | "account_slot";
  metadata?: Record<string, any>;
}

export interface CourseModule {
  title: string;
  lessons: CourseLesson[];
}

export interface CourseLesson {
  title: string;
  duration: string;
  video_url: string;
  attachment_url: string;
  notes: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

export interface Order {
  id: string;
  order_ref: string;
  buyer_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  subtotal: number;
  discount_code: string | null;
  discount_amount: number;
  final_price: number;
  currency: string;
  payment_method: "ashtech" | "wallet";
  status: "awaiting_payment" | "confirmed" | "failed" | "amount_mismatch" | "pending_review" | "refunded";
  ashtech_transaction_id: string | null;
  source: string | null;
  created_at: string;
  confirmed_at: string | null;
  delivery_status?: "pending" | "delivered" | "failed";
  delivery_data?: Record<string, any>;
  buyer_pin?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_title: string;
  product_cover: string | null;
  unit_price: number;
  quantity: number;
  seller_id: string;
  seller_name: string;
  seller_credit: number;
  delivery_link: string | null;
  account_slot_id: string | null;
}

export interface AccountSlot {
  id: string;
  product_id: string;
  seller_id: string;
  platform: string;
  cred1_label: string;
  cred2_label: string;
  cred1_value: string;
  cred2_value: string;
  status: "available" | "assigned";
  order_id: string | null;
}

export interface Review {
  id: string;
  product_id: string;
  buyer_id: string | null;
  order_id: string | null;
  buyer_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  seller_reply: string | null;
  seller_replied_at: string | null;
  is_verified_purchase: boolean;
  is_hidden: boolean;
  created_at: string;
}

export interface Wishlist {
  id: string;
  buyer_id: string;
  product_id: string;
  product?: Product;
  created_at: string;
}

export interface Affiliate {
  id: string;
  user_id: string;
  product_id: string;
  affiliate_code: string;
  clicks: number;
  conversions: number;
  total_earned: number;
}

export interface LiveCountry {
  code: string;
  name: string;
  currency: string;
  operators: string[];
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: "credit" | "withdrawal" | "adjustment" | "refund_debit";
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: "mtn" | "orange" | "paypal" | "bitcoin";
  status: "pending" | "completed" | "rejected";
  created_at: string;
}

export interface ProductContent {
  id: string;
  product_id: string;
  content_type: 'video' | 'file' | 'link' | 'text' | 'credential' | 'license_key' | 'proxy' | 'bundle_item';
  title: string | null;
  description: string | null;
  url: string | null;
  file_url: string | null;
  file_size: number | null;
  duration: number | null;
  order_index: number;
  is_preview: boolean;
  metadata: Record<string, any>;
}

export interface StoreFollower {
  id: string;
  store_id: string;
  user_id: string;
  created_at: string;
}

export interface CustomCharge {
  id: string;
  store_id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  is_active: boolean;
}

export interface Webhook {
  id: string;
  store_id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  payload: Record<string, any>;
  status_code: number | null;
  succeeded: boolean;
  attempted_at: string;
}

export interface Broadcast {
  id: string;
  seller_id: string;
  title: string;
  message: string;
  target: 'all' | 'one';
  target_email: string | null;
  recipient_count: number;
  created_at: string;
}

export interface AnalyticsSaleRow {
  amount: number;
  currency: string;
  date: string;
  product_id: string | null;
}

export interface AnalyticsViewRow {
  created_at: string;
  referrer: string | null;
  country_code: string | null;
  product_id: string | null;
}

export interface CheckoutSettings {
  collect_phone: boolean;
  collect_address_city: boolean;
  show_category_sidebar: boolean;
  buy_button_text: string | null;
  fee_payer: 'customer' | 'seller';
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

