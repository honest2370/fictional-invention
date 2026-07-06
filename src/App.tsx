import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastHost } from "@/components/ui";
import RequireRole from "@/components/RequireRole";

import RoleSelect from "@/pages/RoleSelect";
import BuyerLogin from "@/pages/auth/BuyerLogin";
import BuyerSignup from "@/pages/auth/BuyerSignup";
import SellerLogin from "@/pages/auth/SellerLogin";
import SellerSignup from "@/pages/auth/SellerSignup";

import BuyerLayout from "@/components/BuyerLayout";
import BuyerHome from "@/pages/buyer/BuyerHome";
import ProductDetail from "@/pages/buyer/ProductDetail";
import Checkout from "@/pages/buyer/Checkout";
import MyOrders from "@/pages/buyer/MyOrders";
import MyCourses from "@/pages/buyer/MyCourses";
import Cart from "@/pages/buyer/Cart";
import Wishlist from "@/pages/buyer/Wishlist";
import BuyerAccount from "@/pages/buyer/BuyerAccount";
import GuestPurchases from "@/pages/buyer/GuestPurchases";

import SellerLayout from "@/components/SellerLayout";
import SellerDashboard from "@/pages/seller/SellerDashboard";
import SellerProducts from "@/pages/seller/SellerProducts";
import AddProduct from "@/pages/seller/AddProduct";
import ProductDetailSeller from "@/pages/seller/ProductDetailSeller";
import SellerOrders from "@/pages/seller/SellerOrders";
import SellerWallet from "@/pages/seller/SellerWallet";
import SellerAccount from "@/pages/seller/SellerAccount";
import SellerStorefrontSettings from "@/pages/seller/SellerStorefrontSettings";
import SellerWebhooks from "@/pages/seller/SellerWebhooks";
import SellerAffiliates from "@/pages/seller/SellerAffiliates";
import {
  SellerAnalytics, SellerSalesChart, SellerVisitors, SellerConversionRate, SellerLinkTraffic, SellerReports,
} from "@/pages/seller/SellerAnalytics";
import { SellerMarketing, SellerCoupons, SellerBroadcasts } from "@/pages/seller/SellerMarketing";
import { SellerRevenue, SellerCustomCharges } from "@/pages/seller/SellerFinance";

import StorefrontPage from "@/pages/store/StorefrontPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastHost />
        <Routes>
          <Route path="/" element={<RoleSelect />} />

          <Route path="/buyer/login" element={<BuyerLogin />} />
          <Route path="/buyer/signup" element={<BuyerSignup />} />
          <Route path="/seller/login" element={<SellerLogin />} />
          <Route path="/seller/signup" element={<SellerSignup />} />
          <Route path="/purchases" element={<GuestPurchases />} />

          {/* Public storefront — no auth required, crawlable by Google */}
          <Route path="/store/:storeSlug" element={<StorefrontPage />} />

          <Route path="/buyer" element={<RequireRole role="buyer"><BuyerLayout /></RequireRole>}>
            <Route index element={<BuyerHome />} />
            <Route path="product/:slug" element={<ProductDetail />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="checkout/:slug" element={<Checkout />} />
            <Route path="orders" element={<MyOrders />} />
            <Route path="courses" element={<MyCourses />} />
            <Route path="cart" element={<Cart />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="account" element={<BuyerAccount />} />
          </Route>

          <Route path="/seller" element={<RequireRole role="seller"><SellerLayout /></RequireRole>}>
            <Route index element={<SellerDashboard />} />
            <Route path="products" element={<SellerProducts />} />
            <Route path="products/new" element={<AddProduct />} />
            <Route path="products/:id" element={<ProductDetailSeller />} />
            <Route path="orders" element={<SellerOrders />} />
            <Route path="wallet" element={<SellerWallet />} />
            <Route path="storefront" element={<SellerStorefrontSettings />} />
            <Route path="webhooks" element={<SellerWebhooks />} />
            <Route path="affiliates" element={<SellerAffiliates />} />
            <Route path="account" element={<SellerAccount />} />

            {/* Analytics */}
            <Route path="analytics" element={<SellerAnalytics />} />
            <Route path="analytics/sales" element={<SellerSalesChart />} />
            <Route path="analytics/visitors" element={<SellerVisitors />} />
            <Route path="analytics/conversion" element={<SellerConversionRate />} />
            <Route path="analytics/traffic" element={<SellerLinkTraffic />} />
            <Route path="analytics/reports" element={<SellerReports />} />

            {/* Marketing */}
            <Route path="marketing" element={<SellerMarketing />} />
            <Route path="coupons" element={<SellerCoupons />} />
            <Route path="broadcasts" element={<SellerBroadcasts />} />

            {/* Finance */}
            <Route path="revenue" element={<SellerRevenue />} />
            <Route path="custom-charges" element={<SellerCustomCharges />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
