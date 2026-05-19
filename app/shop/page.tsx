"use client";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import { getMemberData } from "@/lib/member";

const PRODUCTS = [
  {
    id: "ar-chassis",
    name: "Tamiya AR Chassis",
    subtitle: "Avante R — All-Round Performer",
    price_boxed: 280,
    price_built: 450,
    badge: "IN STOCK",
    badgeColor: "#16A34A",
    chassis: "AR",
    description: "One of the most versatile and stable chassis for beginners and experienced racers alike. Great for box stock racing.",
    specs: ["AR Chassis", "Rear-wheel drive", "Great stability", "Beginner friendly"],
    available: true,
  },
  {
    id: "ma-chassis",
    name: "Tamiya MA Chassis",
    subtitle: "Mini 4WD — Mid-Motor Layout",
    price_boxed: 260,
    price_built: 420,
    badge: "IN STOCK",
    badgeColor: "#16A34A",
    chassis: "MA",
    description: "Mid-motor layout provides excellent balance and handling. Popular choice for competitive box stock racing.",
    specs: ["MA Chassis", "Mid-motor layout", "Balanced weight", "Race proven"],
    available: true,
  },
  {
    id: "vs-chassis",
    name: "Tamiya VS Chassis",
    subtitle: "Victorysaurus — Speed Focused",
    price_boxed: 270,
    price_built: 440,
    badge: "PREORDER",
    badgeColor: "#FACC15",
    chassis: "VS",
    description: "Lightweight and fast. The VS chassis is built for speed with a slim profile and efficient motor placement.",
    specs: ["VS Chassis", "Lightweight body", "Speed optimized", "Slim profile"],
    available: true,
  },
  {
    id: "fma-chassis",
    name: "Tamiya FM-A Chassis",
    subtitle: "Front-Motor — Unique Handling",
    price_boxed: 265,
    price_built: 435,
    badge: "PREORDER",
    badgeColor: "#FACC15",
    chassis: "FM-A",
    description: "Front-motor layout gives a distinct handling feel. Great for racers who want something different.",
    specs: ["FM-A Chassis", "Front-motor drive", "Unique handling", "Advanced racers"],
    available: true,
  },
  {
    id: "s2-chassis",
    name: "Tamiya S2 Chassis",
    subtitle: "Super II — Classic Choice",
    price_boxed: 240,
    price_built: 400,
    badge: "PREORDER",
    badgeColor: "#FACC15",
    chassis: "S2",
    description: "The classic Super II chassis. A timeless design that remains competitive and easy to tune.",
    specs: ["S2 Chassis", "Classic design", "Easy to tune", "Wide parts support"],
    available: true,
  },
  {
    id: "accessories-bundle",
    name: "Starter Bundle",
    subtitle: "Everything to get racing",
    price_boxed: 150,
    price_built: null,
    badge: "IN STOCK",
    badgeColor: "#16A34A",
    chassis: "N/A",
    description: "Alkaline AA batteries (8 pack), pit mat, and club sticker pack. Perfect for your first race day.",
    specs: ["8x Alkaline AA", "Pit mat", "Club stickers", "Race day essentials"],
    available: true,
  },
];

type Product = typeof PRODUCTS[0];

function ProductCard({ product, onPreorder }: { product: Product; onPreorder: (p: Product) => void }) {
  return (
    <div style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Image placeholder */}
      <div style={{ background: "#0D1B2A", height: 180, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div style={{ fontSize: 64 }}>🏎️</div>
        <div style={{ position: "absolute", top: 12, left: 12, background: product.badgeColor + "22", border: `1px solid ${product.badgeColor}55`, borderRadius: 4, padding: "3px 10px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: product.badgeColor }}>
          {product.badge}
        </div>
      </div>

      <div style={{ padding: "22px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 4, color: "#DC2626", marginBottom: 4 }}>{product.chassis} CHASSIS</div>
        <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, color: "#F5F5F5", margin: "0 0 4px" }}>{product.name}</h3>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", marginBottom: 12 }}>{product.subtitle}</div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", lineHeight: 1.6, margin: "0 0 16px", flex: 1 }}>{product.description}</p>

        {/* Specs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          {product.specs.map(s => (
            <span key={s} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "3px 8px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 2, color: "#B8C1CC" }}>{s}</span>
          ))}
        </div>

        {/* Pricing */}
        <div style={{ display: "grid", gridTemplateColumns: product.price_built ? "1fr 1fr" : "1fr", gap: 8, marginBottom: 16 }}>
          <div style={{ background: "#050505", borderRadius: 8, padding: "12px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#B8C1CC", marginBottom: 4 }}>BOXED KIT</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, color: "#F5F5F5" }}>DKK {product.price_boxed}</div>
          </div>
          {product.price_built && (
            <div style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: 8, padding: "12px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#B8C1CC", marginBottom: 4 }}>RACE READY</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, color: "#DC2626" }}>DKK {product.price_built}</div>
            </div>
          )}
        </div>

        <button
          onClick={() => onPreorder(product)}
          style={{ width: "100%", background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, padding: "13px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 2, cursor: "pointer" }}
        >
          PREORDER NOW →
        </button>
      </div>
    </div>
  );
}

function PreorderModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const member = getMemberData();
  const [type, setType] = useState<"boxed" | "built">("boxed");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const price = type === "boxed" ? product.price_boxed : product.price_built;

  const handleSubmit = async () => {
    setError("");
    if (!member?.email) {
      setError("Could not find your member data. Please log out and register again.");
      return;
    }
    setLoading(true);
    try {
      const { error: insertError } = await supabase.from("orders").insert([{
        member_email: member.email,
        member_name: member.name || member.first_name || "Member",
        product_name: product.name,
        chassis: product.chassis,
        type,
        notes: notes.trim() || null,
        status: "pending",
      }]);
      if (insertError) throw insertError;
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit preorder. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#071426", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 16, padding: "32px 28px", width: "100%", maxWidth: 480 }}>
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: "#F5F5F5", marginBottom: 8 }}>PREORDER SUBMITTED!</h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#B8C1CC", lineHeight: 1.6, marginBottom: 24 }}>
              We'll contact you at <strong style={{ color: "#FACC15" }}>{member?.email}</strong> to confirm payment and pickup details.
            </p>
            <button onClick={onClose} style={{ background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, padding: "12px 32px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 2, cursor: "pointer" }}>
              CLOSE
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 4, color: "#DC2626", marginBottom: 6 }}>PREORDER</div>
            <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 26, color: "#F5F5F5", marginBottom: 20, marginTop: 0 }}>{product.name}</h3>

            {/* Member info */}
            <div style={{ background: "#050505", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#B8C1CC", marginBottom: 4 }}>ORDERING AS</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: "#F5F5F5" }}>{member?.name || member?.first_name || "Member"}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#B8C1CC" }}>{member?.email}</div>
            </div>

            {/* Type selector */}
            {product.price_built && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#B8C1CC", marginBottom: 10 }}>SELECT TYPE</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {(["boxed", "built"] as const).map(t => (
                    <button key={t} onClick={() => setType(t)}
                      style={{ background: type === t ? "rgba(220,38,38,0.15)" : "#050505", border: `1px solid ${type === t ? "#DC2626" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, padding: "14px", cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: type === t ? "#DC2626" : "#F5F5F5", letterSpacing: 2, textTransform: "uppercase" }}>{t === "boxed" ? "Boxed Kit" : "Race Ready"}</div>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: "#F5F5F5", marginTop: 4 }}>DKK {t === "boxed" ? product.price_boxed : product.price_built}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#B8C1CC", marginBottom: 8 }}>NOTES (OPTIONAL)</div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any special requests or questions..."
                rows={3}
                style={{ width: "100%", background: "#050505", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "12px 14px", color: "#F5F5F5", fontFamily: "'DM Sans', sans-serif", fontSize: 13, resize: "none", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Notice */}
            <div style={{ background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.15)", borderRadius: 8, padding: "12px 14px", marginBottom: 20 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#FACC15", margin: 0, lineHeight: 1.6 }}>
                ⚠️ No payment required now. We'll contact you to confirm payment and arrange pickup.
              </p>
            </div>

            {error && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#DC2626", marginBottom: 12 }}>{error}</p>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={onClose}
                style={{ background: "transparent", color: "#B8C1CC", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "13px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 2, cursor: "pointer" }}>
                CANCEL
              </button>
              <button onClick={handleSubmit} disabled={loading}
                style={{ background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, padding: "13px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 2, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
                {loading ? "SUBMITTING..." : `CONFIRM — DKK ${price}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ShopPage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <>
      <Navbar />
      <main style={{ background: "#050505", color: "#F5F5F5", paddingTop: 60 }}>

        {/* Hero */}
        <section style={{ background: "#071426", borderBottom: "1px solid rgba(220,38,38,0.2)", padding: "64px 24px 56px", textAlign: "center" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 20, padding: "5px 14px", marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, background: "#DC2626", borderRadius: "50%", display: "inline-block" }} />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 10, color: "#FACC15", letterSpacing: 4 }}>PREORDER — NO PAYMENT REQUIRED</span>
            </div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(42px, 9vw, 80px)", color: "#F5F5F5", lineHeight: 0.95, marginBottom: 16 }}>
              TAMIYA CARS<br /><span style={{ color: "#DC2626" }}>& PARTS</span>
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#B8C1CC", lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>
              Reserve your car now. No payment needed — we'll contact you to confirm and arrange pickup in Nuuk.
            </p>
          </div>
        </section>

        {/* Products grid */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {PRODUCTS.map(p => (
              <ProductCard key={p.id} product={p} onPreorder={setSelectedProduct} />
            ))}
          </div>

          {/* Info banner */}
          <div style={{ marginTop: 56, background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "32px 28px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
            {[
              { icon: "📦", title: "Boxed Kit", desc: "Build it yourself. Great for learning and customizing your own car." },
              { icon: "🏎️", title: "Race Ready", desc: "Assembled and tested. Just add batteries and race." },
              { icon: "💬", title: "Preorder Only", desc: "No online payment. We contact you to confirm and arrange pickup." },
              { icon: "📍", title: "Pickup in Nuuk", desc: "All orders are collected in person. Location shared on confirmation." },
            ].map(item => (
              <div key={item.title}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: "#F5F5F5", marginBottom: 6 }}>{item.title}</div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />

      {selectedProduct && (
        <PreorderModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </>
  );
}