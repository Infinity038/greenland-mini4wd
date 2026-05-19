"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getMemberData } from "@/lib/member";

// Demo orders — replace with Supabase query later
const DEMO_ORDERS = [
  {
    id: "ORD-001",
    product: "Tamiya Mini 4WD — Avante Mk.III",
    type: "Boxed Kit",
    chassis: "MA Chassis",
    status: "pending_confirmation",
    date: "2026-05-10",
    price: "DKK 280",
  },
  {
    id: "ORD-002",
    product: "Tamiya Mini 4WD — Manta Ray",
    type: "Built Race-Ready",
    chassis: "S2 Chassis",
    status: "awaiting_stock",
    date: "2026-05-12",
    price: "DKK 480",
  },
];

const STATUS_CONFIG: any = {
  pending_confirmation: { label: "Pending Confirmation", color: "#FACC15", bg: "rgba(250,204,21,0.08)" },
  reserved: { label: "Reserved", color: "#60A5FA", bg: "rgba(96,165,250,0.08)" },
  awaiting_stock: { label: "Awaiting Stock", color: "#F97316", bg: "rgba(249,115,22,0.08)" },
  ready_for_pickup: { label: "Ready for Pickup", color: "#34D399", bg: "rgba(52,211,153,0.08)" },
  completed: { label: "Completed", color: "#B8C1CC", bg: "rgba(184,193,204,0.08)" },
  cancelled: { label: "Cancelled", color: "#DC2626", bg: "rgba(220,38,38,0.08)" },
};

export default function OrdersPage() {
  const [member, setMember] = useState<any>(null);

  useEffect(() => {
    setMember(getMemberData());
  }, []);

  return (
    <>
      <Navbar />
      <main style={{ background: "#050505", color: "#F5F5F5", minHeight: "100vh", paddingTop: 80, paddingBottom: 80 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>

          <div style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 8 }}>MEMBER ACCOUNT</div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(32px, 6vw, 56px)", color: "#F5F5F5", margin: 0, lineHeight: 1 }}>MY ORDERS</h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#B8C1CC", marginTop: 8 }}>
              Your preorders and purchase history. We will contact you to confirm payment and pickup.
            </p>
          </div>

          {/* Notice */}
          <div style={{ background: "rgba(250,204,21,0.05)", border: "1px solid rgba(250,204,21,0.15)", borderRadius: 10, padding: "16px 20px", marginBottom: 32 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FACC15", margin: 0, lineHeight: 1.6 }}>
              📦 All orders are preorder/reservation based. No online payment required. We will contact you via the details you provided during registration to confirm payment and arrange pickup or delivery.
            </p>
          </div>

          {/* Orders list */}
          {DEMO_ORDERS.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 24, color: "#F5F5F5", marginBottom: 8 }}>No orders yet</div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#B8C1CC", marginBottom: 24 }}>Visit the shop to browse and reserve your first car.</p>
              <a href="/shop" style={{ background: "#DC2626", color: "#fff", padding: "14px 32px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 2, textDecoration: "none" }}>BROWSE SHOP →</a>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {DEMO_ORDERS.map(order => {
                const s = STATUS_CONFIG[order.status];
                return (
                  <div key={order.id} style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 3, color: "#B8C1CC", marginBottom: 4 }}>ORDER {order.id}</div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, color: "#F5F5F5", lineHeight: 1 }}>{order.product}</div>
                      </div>
                      <div style={{ background: s.bg, border: `1px solid ${s.color}40`, borderRadius: 6, padding: "6px 14px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 2, color: s.color, whiteSpace: "nowrap" as const }}>
                        {s.label}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                      {[
                        { label: "Type", value: order.type },
                        { label: "Chassis", value: order.chassis },
                        { label: "Price", value: order.price },
                        { label: "Date", value: order.date },
                      ].map(d => (
                        <div key={d.label}>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#B8C1CC", marginBottom: 3 }}>{d.label.toUpperCase()}</div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#F5F5F5" }}>{d.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", margin: 0 }}>
                        We will contact you at <strong style={{ color: "#F5F5F5" }}>{member?.email || "your registered email"}</strong> to confirm payment and arrange pickup.
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 40, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="/shop" style={{ background: "#DC2626", color: "#fff", padding: "14px 28px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 2, textDecoration: "none" }}>BROWSE SHOP</a>
            <a href="/profile" style={{ background: "transparent", color: "#F5F5F5", padding: "14px 28px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 2, textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)" }}>MY PROFILE</a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}