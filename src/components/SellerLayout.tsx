import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutGrid, Package, ShoppingCart, Wallet, User, Menu, X, ChevronDown, ChevronUp,
  BarChart3, Megaphone, DollarSign, MessageSquare, Settings, ArrowLeftRight, LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DrawerGroup {
  label: string;
  items: { label: string; path: string; icon: React.ComponentType<{ size?: number }> }[];
}

const GROUPS: DrawerGroup[] = [
  {
    label: "Commerce",
    items: [
      { label: "Products", path: "/seller/products", icon: Package },
      { label: "Add Product", path: "/seller/products/new", icon: Package },
      { label: "Orders", path: "/seller/orders", icon: ShoppingCart },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Overview", path: "/seller/analytics", icon: BarChart3 },
      { label: "Sales Chart", path: "/seller/analytics/sales", icon: BarChart3 },
      { label: "Visitors", path: "/seller/analytics/visitors", icon: BarChart3 },
      { label: "Conversion Rate", path: "/seller/analytics/conversion", icon: BarChart3 },
      { label: "Link Traffic", path: "/seller/analytics/traffic", icon: BarChart3 },
      { label: "Reports", path: "/seller/analytics/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Marketing Hub", path: "/seller/marketing", icon: Megaphone },
      { label: "Coupons", path: "/seller/coupons", icon: Megaphone },
      { label: "Affiliates", path: "/seller/affiliates", icon: Megaphone },
      { label: "Broadcasts", path: "/seller/broadcasts", icon: Megaphone },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Wallet & Payouts", path: "/seller/wallet", icon: DollarSign },
      { label: "Revenue", path: "/seller/revenue", icon: DollarSign },
      { label: "Custom Charges", path: "/seller/custom-charges", icon: DollarSign },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Notifications", path: "/seller/account", icon: MessageSquare },
    ],
  },
  {
    label: "Store Settings",
    items: [
      { label: "Storefront", path: "/seller/storefront", icon: Settings },
      { label: "Webhooks", path: "/seller/webhooks", icon: Settings },
      { label: "Account", path: "/seller/account", icon: Settings },
    ],
  },
];

function SellerDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>("Commerce");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[900] flex" onClick={onClose}>
      <div className="w-80 max-w-[85%] bg-slate-900 h-full overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="font-bold text-white">Seller Panel</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>

        <div className="mt-4 space-y-1">
          {GROUPS.map((group) => (
            <div key={group.label} className="border-b border-slate-800 pb-1 mb-1">
              <button
                onClick={() => setExpanded((e) => (e === group.label ? null : group.label))}
                className="w-full flex items-center justify-between py-3 text-xs font-bold text-slate-400 uppercase tracking-wider"
              >
                {group.label}
                {expanded === group.label ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expanded === group.label && (
                <div className="pb-2">
                  {group.items.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => { navigate(item.path); onClose(); }}
                      className="w-full flex items-center gap-3 py-2.5 text-sm text-slate-200 text-left"
                    >
                      <item.icon size={16} />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1">
          <button onClick={() => { navigate("/buyer"); onClose(); }} className="w-full flex items-center gap-2 py-2.5 text-sm font-medium text-emerald-400">
            <ArrowLeftRight size={16} /> Switch to Buyer
          </button>
          <button onClick={async () => { await signOut(); navigate("/seller/login"); }} className="w-full flex items-center gap-2 py-2.5 text-sm font-medium text-red-400">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SellerLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItem = (to: string, icon: React.ReactNode, label: string) => (
    <NavLink to={to} end className={({ isActive }) => `flex flex-col items-center gap-1 py-2 flex-1 ${isActive ? "text-blue-400" : "text-slate-500"}`}>
      {icon}
      <span className="text-[11px] font-medium">{label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 sticky top-0 z-40 bg-slate-950">
        <button onClick={() => setDrawerOpen(true)} aria-label="Menu"><Menu size={22} className="text-slate-300" /></button>
        <p className="font-bold text-blue-400 text-sm">SELLIZI <span className="text-slate-500 font-normal">Seller</span></p>
        <div className="w-[22px]" />
      </div>

      <SellerDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex">
        {navItem("/seller", <LayoutGrid size={20} />, "Dashboard")}
        {navItem("/seller/products", <Package size={20} />, "Products")}
        {navItem("/seller/orders", <ShoppingCart size={20} />, "Orders")}
        {navItem("/seller/analytics", <BarChart3 size={20} />, "Analytics")}
        {navItem("/seller/account", <User size={20} />, "Account")}
      </nav>
    </div>
  );
}
