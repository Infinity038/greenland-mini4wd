"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getMemberData, getMemberOrdersFromSupabase } from "@/lib/member";

const STATUS_CONFIG: any = {
  pending: { label: "Pending Confirmation", color: "#FACC15", bg: "rgba(250,204,21,0.08)" },
  pending_confirmation: { label: "Pending Confirmation", color: "#FACC15", bg: "rgba(250,204,21,0.08)" },
  reserved: { label: "Reserved", color: "#60A5FA", bg: "rgba(96,165,250,0.08)" },
  awaiting_stock: { label: "Awaiting Stock", color: "#F97316", bg: "rgba(249,115,22,0.08)" },
  ready_for_pickup: { label: "Ready for Pickup ✓", color: "#34D399", bg: "rgba(52,211,153,0.08)" },
  completed: { label: "Completed", color: "#B8C1CC", bg: "rgba(184,193,204,0.08)" },
  cancelled: { label: "Cancelled", color: "#DC2626", bg: "rgba(220,38,38,0.08)" },
};

const STEPS = ["pending", "reserved", "awaiting_stock", "ready_for_pickup", "completed"];

function StatusBar({ status }: { status: string }) {
  const current = STEPS.indexOf(status);
  if (current === -1 || status === "cancelled") return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 16, overflowX: "auto" }}>
      {STEPS.map((step, i) => {
        const done = i <= current;
        const labels: any = {
          pending: "Received",
          reserved: "Reserved",
          awaiting_stock: "In Transit",
          ready_for_pickup: "Pickup Ready",
          completed: "Done",
        };
        return (
          <div key={step} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: done ? "#DC2626" : "rgba(255,255,255,0.15)", border: `2px solid ${done ? "#DC2626" : "rgba(255,255,255,0.1)"}`, flexShrink: 0 }} />
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: 1, color: done ? "#F5F5F5" : "#B8C1CC", marginTop: 4, textAlign: "center" }}>{labels[step]}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < current ? "#DC2626" : "rgba(255,255,255,0.08)", margin: "0 2px", marginBottom: 16 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrdersPage() {
  const [member, setMember] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = getMemberData();
      setMember(data);
      if (data?.email) {
        const fetched = await getMemberOrdersFromSupabase(data.email);
        setOrders(fetched);
      }
      setLoading(false);
    }
    load();
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });

  return (
    <>
      <Navbar />
      <main style={{ background: "#050505", color: "#F5F5F5", minHeight: "100vh", paddingTop: 80, paddingBottom: 80 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>

          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 8 }}>MEMBER ACCOUNT</div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(32px, 6vw, 56px)", color: "#F5F5F5", margin: 0, lineHeight: 1 }}>MY ORDERS</h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#B8C1CC", marginTop: 8 }}>
              Your preorders and reservation history.
            </p>
          </div>

          {/* Notice */}
          <div style={{ background: "rgba(250,204,21,0.05)", border: "1px solid rgba(250,204,21,0.15)", borderRadius: 10, padding: "14px 18px", marginBottom: 32 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FACC15", margin: 0, lineHeight: 1.6 }}>
              📦 All orders are reservation-based. No online payment required. We will contact you via <strong>{member?.email || "your registered email"}</strong> to confirm payment and arrange pickup.
            </p>
          </div>

          {/* Orders */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, color: "#B8C1CC", letterSpacing: 3 }}>LOADING ORDERS...</div>
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 24, color: "#F5F5F5", marginBottom: 8 }}>No orders yet</div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#B8C1CC", marginBottom: 24 }}>Visit the shop to browse and reserve your first car.</p>
              <a href="/shop" style={{ background: "#DC2626", color: "#fff", padding: "14px 32px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 2, textDecoration: "none" }}>BROWSE SHOP →</a>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {orders.map((order, i) => {
                const s = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                const orderId = order.id?.toString().slice(0, 8).toUpperCase() || `ORD-${i + 1}`;
                return (
                  <div key={order.id || i} style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "24px" }}>
                    {/* Top row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#B8C1CC", marginBottom: 4 }}>ORDER #{orderId}</div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: "#F5F5F5", lineHeight: 1 }}>{order.product_name}</div>
                      </div>
                      <div style={{ background: s.bg, border: `1px solid ${s.color}40`, borderRadius: 6, padding: "5px 12px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 2, color: s.color, whiteSpace: "nowrap" as const }}>
                        {s.label}
                      </div>
                    </div>

                    {/* Details */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 8 }}>
                      {[
                        { label: "Type", value: order.type === "built" ? "Race Ready" : order.type === "boxed" ? "Boxed Kit" : order.type },
                        { label: "Chassis", value: order.chassis },
                        { label: "Ordered", value: order.created_at ? formatDate(order.created_at) : "—" },
                        { label: "Notes", value: order.notes || "None" },
                      ].map(d => (
                        <div key={d.label}>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#B8C1CC", marginBottom: 3 }}>{d.label.toUpperCase()}</div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#F5F5F5" }}>{d.value || "—"}</div>
                        </div>
                      ))}
                    </div>

                    {/* Status progress bar */}
                    <StatusBar status={order.status} />

                    {order.status === "cancelled" && (
                      <div style={{ marginTop: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#DC2626" }}>
                        This order has been cancelled. Contact us if you have questions.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer links */}
          <div style={{ marginTop: 40, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="/shop" style={{ background: "#DC2626", color: "#fff", padding: "13px 24px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 2, textDecoration: "none" }}>BROWSE SHOP</a>
            <a href="/profile" style={{ background: "transparent", color: "#F5F5F5", padding: "13px 24px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 2, textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)" }}>MY PROFILE</a>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}