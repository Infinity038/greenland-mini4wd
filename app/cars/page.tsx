"use client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const CHASSIS = [
  {
    id: "ar",
    name: "AR Chassis",
    full: "Avante R",
    speed: 4,
    difficulty: 1,
    for: "Beginners & Competitive",
    price_boxed: 280,
    price_built: 450,
    badge: "RECOMMENDED",
    badgeColor: "#16A34A",
    desc: "The most popular chassis for box stock racing. Excellent stability, wide parts support, and forgiving on tight tracks. Best starting point for new racers.",
    specs: ["Rear-wheel drive", "Wide stance", "Great cornering", "Easy to tune"],
  },
  {
    id: "ma",
    name: "MA Chassis",
    full: "Mid-Motor All-Wheel",
    speed: 4,
    difficulty: 2,
    for: "Intermediate Racers",
    price_boxed: 260,
    price_built: 420,
    badge: "POPULAR",
    badgeColor: "#2563EB",
    desc: "Mid-motor layout gives excellent weight balance and handling consistency. A favorite for competitive box stock events.",
    specs: ["Mid-motor AWD", "Balanced weight", "Low center of gravity", "Race proven"],
  },
  {
    id: "vs",
    name: "VS Chassis",
    full: "Victorysaurus",
    speed: 5,
    difficulty: 3,
    for: "Experienced Racers",
    price_boxed: 270,
    price_built: 440,
    badge: "FAST",
    badgeColor: "#DC2626",
    desc: "Lightweight and built for speed. The VS chassis excels on high-speed tracks with its slim, aerodynamic profile.",
    specs: ["Lightweight body", "Speed focused", "Slim profile", "High top speed"],
  },
  {
    id: "fma",
    name: "FM-A Chassis",
    full: "Front Motor A",
    speed: 4,
    difficulty: 3,
    for: "Advanced Racers",
    price_boxed: 265,
    price_built: 435,
    badge: "UNIQUE",
    badgeColor: "#7C3AED",
    desc: "Front-motor layout creates a unique handling characteristic unlike any other chassis. For racers who want to stand out.",
    specs: ["Front-motor drive", "Unique handling", "Good acceleration", "Advanced tuning"],
  },
  {
    id: "s2",
    name: "S2 Chassis",
    full: "Super II",
    speed: 3,
    difficulty: 1,
    for: "Beginners",
    price_boxed: 240,
    price_built: 400,
    badge: "CLASSIC",
    badgeColor: "#B45309",
    desc: "The classic Super II. A timeless design that has been competitive for decades. Huge aftermarket support and beginner friendly.",
    specs: ["Classic design", "Huge parts support", "Easy to build", "Great for learning"],
  },
  {
    id: "ms",
    name: "MS Chassis",
    full: "Multi-Span",
    speed: 4,
    difficulty: 2,
    for: "All Levels",
    price_boxed: 275,
    price_built: 445,
    badge: "VERSATILE",
    badgeColor: "#0891B2",
    desc: "Modular design allows swapping between front, mid, and rear motor positions. Great for experimenting and learning tuning.",
    specs: ["Modular layout", "3 motor positions", "Experimental", "Great learning tool"],
  },
];

function SpeedDots({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < value ? "#DC2626" : "rgba(255,255,255,0.12)" }} />
      ))}
    </div>
  );
}

function ChassisCard({ c }: { c: typeof CHASSIS[0] }) {
  return (
    <div style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Image placeholder */}
      <div style={{ background: "#0D1B2A", height: 160, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div style={{ fontSize: 56 }}>🏎️</div>
        <div style={{ position: "absolute", top: 12, left: 12, background: c.badgeColor + "22", border: `1px solid ${c.badgeColor}55`, borderRadius: 4, padding: "3px 10px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: c.badgeColor }}>
          {c.badge}
        </div>
      </div>

      <div style={{ padding: "20px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 4, color: "#DC2626", marginBottom: 4 }}>{c.full.toUpperCase()}</div>
        <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 24, color: "#F5F5F5", margin: "0 0 12px" }}>{c.name}</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: 3, color: "#B8C1CC", marginBottom: 5 }}>SPEED</div>
            <SpeedDots value={c.speed} />
          </div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: 3, color: "#B8C1CC", marginBottom: 5 }}>DIFFICULTY</div>
            <SpeedDots value={c.difficulty} />
          </div>
        </div>

        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", lineHeight: 1.6, margin: "0 0 14px", flex: 1 }}>{c.desc}</p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
          {c.specs.map(s => (
            <span key={s} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "3px 8px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: 2, color: "#B8C1CC" }}>{s}</span>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <div style={{ background: "#050505", borderRadius: 6, padding: "10px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: 2, color: "#B8C1CC", marginBottom: 3 }}>BOXED KIT</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: "#F5F5F5" }}>DKK {c.price_boxed}</div>
          </div>
          <div style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: 6, padding: "10px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: 2, color: "#B8C1CC", marginBottom: 3 }}>RACE READY</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: "#DC2626" }}>DKK {c.price_built}</div>
          </div>
        </div>

        <a href="/shop" style={{ display: "block", width: "100%", background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 2, cursor: "pointer", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
          PREORDER →
        </a>
      </div>
    </div>
  );
}

export default function CarsPage() {
  return (
    <>
      <Navbar />
      <main style={{ background: "#050505", color: "#F5F5F5", paddingTop: 60 }}>

        {/* Hero */}
        <section style={{ background: "#071426", borderBottom: "1px solid rgba(220,38,38,0.2)", padding: "64px 24px 56px", textAlign: "center" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 12 }}>CHASSIS GUIDE</div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(42px, 9vw, 80px)", color: "#F5F5F5", lineHeight: 0.95, marginBottom: 16 }}>
              TAMIYA<br /><span style={{ color: "#DC2626" }}>MINI 4WD</span><br />CARS
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#B8C1CC", lineHeight: 1.7, maxWidth: 480, margin: "0 auto 28px" }}>
              All chassis are box stock legal for our weekly tournaments. Choose your weapon.
            </p>
            <a href="/shop" style={{ display: "inline-block", background: "#DC2626", color: "#fff", padding: "13px 32px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 2, textDecoration: "none" }}>
              PREORDER A CAR →
            </a>
          </div>
        </section>

        {/* Beginner tip */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 0" }}>
          <div style={{ background: "rgba(250,204,21,0.05)", border: "1px solid rgba(250,204,21,0.15)", borderRadius: 10, padding: "16px 20px", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FACC15", margin: 0, lineHeight: 1.6 }}>
              <strong>New to Mini 4WD?</strong> Start with the AR or S2 chassis. Both are beginner friendly, widely available, and fully legal for box stock tournaments. Race ready builds are assembled and tested — just add batteries and race.
            </p>
          </div>
        </div>

        {/* Chassis grid */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 8 }}>ALL CHASSIS</div>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(28px, 5vw, 48px)", color: "#F5F5F5", margin: 0 }}>CHOOSE YOUR CHASSIS</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {CHASSIS.map(c => <ChassisCard key={c.id} c={c} />)}
          </div>
        </div>

        {/* Box stock rules section */}
        <div style={{ background: "#071426", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "56px 24px" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#FACC15", marginBottom: 8 }}>TOURNAMENT RULES</div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(28px, 5vw, 48px)", color: "#F5F5F5", margin: 0 }}>BOX STOCK RULES</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {[
                { icon: "📦", title: "Unmodified Kit", desc: "Car must be built straight from the box. No aftermarket parts." },
                { icon: "🔋", title: "Alkaline AA Only", desc: "Standard alkaline AA batteries only. No rechargeables or lithium." },
                { icon: "🏁", title: "Any Tamiya Chassis", desc: "All official Tamiya chassis are allowed. No third-party frames." },
                { icon: "✅", title: "Members Only", desc: "Must be a registered club member to enter tournaments." },
              ].map(r => (
                <div key={r.title} style={{ background: "#050505", borderRadius: 10, padding: "22px 18px" }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{r.icon}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: "#F5F5F5", marginBottom: 6 }}>{r.title}</div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", lineHeight: 1.6, margin: 0 }}>{r.desc}</p>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 36 }}>
              <a href="/tournament" style={{ display: "inline-block", background: "transparent", color: "#F5F5F5", padding: "13px 32px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 2, textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)" }}>
                VIEW TOURNAMENT INFO →
              </a>
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </>
  );
}