"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const PASSWORD = "mini4wd2026";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending Confirmation", color: "#FACC15" },
  { value: "reserved", label: "Reserved", color: "#60A5FA" },
  { value: "awaiting_stock", label: "Awaiting Stock", color: "#F97316" },
  { value: "in_transit", label: "In Transit", color: "#A78BFA" },
  { value: "ready_for_pickup", label: "Ready for Pickup", color: "#34D399" },
  { value: "completed", label: "Completed", color: "#B8C1CC" },
  { value: "cancelled", label: "Cancelled", color: "#DC2626" },
];

function statusColor(s: string) {
  return STATUS_OPTIONS.find(o => o.value === s)?.color || "#B8C1CC";
}
function statusLabel(s: string) {
  return STATUS_OPTIONS.find(o => o.value === s)?.label || s;
}

export default function AdminOrdersPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (authed) fetchOrders();
  }, [authed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === PASSWORD) { setAuthed(true); setPwError(""); }
    else setPwError("Incorrect password.");
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    await supabase.from("orders").update({ status }).eq("id", id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    setUpdating(null);
  };

  const saveNote = async (id: string) => {
    setUpdating(id);
    await supabase.from("orders").update({ notes: adminNotes[id] }).eq("id", id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, notes: adminNotes[id] } : o));
    setUpdating(null);
  };

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const counts: Record<string, number> = {};
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });

  const s: React.CSSProperties = {
    background: "#050505", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
    color: "#F5F5F5", fontFamily: "'DM Sans', sans-serif", fontSize: 13,
    padding: "8px 12px", outline: "none", width: "100%",
  };

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 8 }}>ADMIN PANEL</div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 36, color: "#F5F5F5", margin: 0 }}>ORDER MANAGEMENT</h1>
          </div>
          <form onSubmit={handleLogin} style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "32px 28px" }}>
            <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 4, color: "#B8C1CC", display: "block", marginBottom: 8 }}>ADMIN PASSWORD</label>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter password" style={{ ...s, marginBottom: 8 }} />
            {pwError && <p style={{ color: "#DC2626", fontSize: 12, marginBottom: 8 }}>{pwError}</p>}
            <button type="submit" style={{ width: "100%", background: "#DC2626", color: "#fff", border: "none", borderRadius: 6, padding: "12px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 2, cursor: "pointer", marginTop: 8 }}>
              LOGIN →
            </button>
          </form>
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <a href="/admin" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: "#B8C1CC", textDecoration: "none", letterSpacing: 2 }}>← BACK TO ADMIN</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#F5F5F5", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 4 }}>ADMIN PANEL</div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 36, color: "#F5F5F5", margin: 0 }}>PREORDER MANAGEMENT</h1>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={fetchOrders} style={{ background: "#071426", color: "#F5F5F5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "10px 18px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 2, cursor: "pointer" }}>
              REFRESH
            </button>
            <a href="/admin" style={{ background: "transparent", color: "#B8C1CC", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "10px 18px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 2, textDecoration: "none" }}>
              ← ADMIN HOME
            </a>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 32 }}>
          {[
            { label: "Total", value: orders.length, color: "#F5F5F5" },
            { label: "Pending", value: counts["pending"] || 0, color: "#FACC15" },
            { label: "Reserved", value: counts["reserved"] || 0, color: "#60A5FA" },
            { label: "Pickup Ready", value: counts["ready_for_pickup"] || 0, color: "#34D399" },
            { label: "Completed", value: counts["completed"] || 0, color: "#B8C1CC" },
            { label: "Cancelled", value: counts["cancelled"] || 0, color: "#DC2626" },
          ].map(stat => (
            <div key={stat.label} style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "16px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#B8C1CC", marginTop: 4 }}>{stat.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {[{ value: "all", label: "All" }, ...STATUS_OPTIONS].map(opt => (
            <button key={opt.value} onClick={() => setFilter(opt.value)}
              style={{ background: filter === opt.value ? "#DC2626" : "#071426", color: filter === opt.value ? "#fff" : "#B8C1CC", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "7px 14px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 2, cursor: "pointer" }}>
              {opt.label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Orders */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, color: "#B8C1CC", letterSpacing: 3 }}>LOADING...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, color: "#B8C1CC" }}>No orders found.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {filtered.map(order => (
              <div key={order.id} style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "24px" }}>
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#B8C1CC", marginBottom: 4 }}>ORDER #{order.id?.toString().slice(0, 8).toUpperCase()}</div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, color: "#F5F5F5" }}>{order.product_name}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#B8C1CC", marginTop: 4 }}>
                      {new Date(order.created_at).toLocaleString("en-GB")}
                    </div>
                  </div>
                  <div style={{ background: statusColor(order.status) + "20", border: `1px solid ${statusColor(order.status)}40`, borderRadius: 6, padding: "6px 14px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 2, color: statusColor(order.status) }}>
                    {statusLabel(order.status)}
                  </div>
                </div>

                {/* Customer + order info */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Customer", value: order.member_name },
                    { label: "Email", value: order.member_email },
                    { label: "Chassis", value: order.chassis },
                    { label: "Type", value: order.type === "built" ? "Race Ready" : order.type === "boxed" ? "Boxed Kit" : order.type },
                  ].map(d => (
                    <div key={d.label} style={{ background: "#050505", borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: 3, color: "#B8C1CC", marginBottom: 4 }}>{d.label.toUpperCase()}</div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#F5F5F5", wordBreak: "break-all" }}>{d.value || "—"}</div>
                    </div>
                  ))}
                </div>

                {/* Admin notes */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#B8C1CC", marginBottom: 6 }}>ADMIN NOTES</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={adminNotes[order.id] ?? order.notes ?? ""}
                      onChange={e => setAdminNotes(prev => ({ ...prev, [order.id]: e.target.value }))}
                      placeholder="Add a note..."
                      style={{ ...s, flex: 1 }}
                    />
                    <button onClick={() => saveNote(order.id)} disabled={updating === order.id}
                      style={{ background: "#071426", color: "#F5F5F5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 14px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: "pointer", whiteSpace: "nowrap" }}>
                      SAVE
                    </button>
                  </div>
                </div>

                {/* Status controls */}
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#B8C1CC", marginBottom: 8 }}>UPDATE STATUS</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {STATUS_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => updateStatus(order.id, opt.value)}
                        disabled={order.status === opt.value || updating === order.id}
                        style={{ background: order.status === opt.value ? opt.color + "22" : "#050505", color: order.status === opt.value ? opt.color : "#B8C1CC", border: `1px solid ${order.status === opt.value ? opt.color + "55" : "rgba(255,255,255,0.08)"}`, borderRadius: 6, padding: "7px 12px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: 1, cursor: order.status === opt.value ? "default" : "pointer", opacity: updating === order.id ? 0.5 : 1 }}>
                        {opt.label.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}