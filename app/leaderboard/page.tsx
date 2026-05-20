"use client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Demo data — replace with Supabase race_results query later
const DEMO_RACERS = [
  { rank: 1, name: "Jovannie A.", chassis: "AR Chassis", wins: 8, races: 10, podiums: 9, best_lap: "4.21s", nationality: "🇵🇭" },
  { rank: 2, name: "Takeshi N.", chassis: "MA Chassis", wins: 6, races: 10, podiums: 8, best_lap: "4.35s", nationality: "🇯🇵" },
  { rank: 3, name: "Erik H.", chassis: "VS Chassis", wins: 5, races: 9, podiums: 7, best_lap: "4.40s", nationality: "🇬🇱" },
  { rank: 4, name: "Marco R.", chassis: "S2 Chassis", wins: 4, races: 8, podiums: 5, best_lap: "4.52s", nationality: "🇵🇭" },
  { rank: 5, name: "Lars B.", chassis: "FM-A Chassis", wins: 3, races: 7, podiums: 4, best_lap: "4.60s", nationality: "🇩🇰" },
  { rank: 6, name: "Rico M.", chassis: "AR Chassis", wins: 2, races: 6, podiums: 3, best_lap: "4.71s", nationality: "🇵🇭" },
  { rank: 7, name: "Nuuk Racer", chassis: "MS Chassis", wins: 1, races: 5, podiums: 2, best_lap: "4.88s", nationality: "🇬🇱" },
];

const PODIUM_COLORS = ["#FACC15", "#B8C1CC", "#DC2626"];
const PODIUM_LABELS = ["🥇 1ST", "🥈 2ND", "🥉 3RD"];
const PODIUM_SIZES = [120, 90, 90];

export default function LeaderboardPage() {
  const top3 = DEMO_RACERS.slice(0, 3);
  const rest = DEMO_RACERS.slice(3);

  return (
    <>
      <Navbar />
      <main style={{ background: "#050505", color: "#F5F5F5", paddingTop: 60 }}>

        {/* Hero */}
        <section style={{ background: "#071426", borderBottom: "1px solid rgba(220,38,38,0.2)", padding: "64px 24px 56px", textAlign: "center" }}>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#FACC15", marginBottom: 12 }}>SEASON STANDINGS</div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(48px, 10vw, 96px)", color: "#F5F5F5", lineHeight: 0.9, marginBottom: 16 }}>
              LEADER<br /><span style={{ color: "#DC2626" }}>BOARD</span>
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#B8C1CC", lineHeight: 1.7 }}>
              Weekly box stock tournament rankings. Updated after every race event.
            </p>
          </div>
        </section>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px 80px" }}>

          {/* Demo notice */}
          <div style={{ background: "rgba(250,204,21,0.05)", border: "1px solid rgba(250,204,21,0.15)", borderRadius: 10, padding: "12px 18px", marginBottom: 48, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FACC15", margin: 0 }}>
              Demo data shown. Live rankings will update after the first official tournament.
            </p>
          </div>

          {/* Podium — top 3 */}
          <div style={{ marginBottom: 56 }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 8 }}>TOP RACERS</div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(28px, 5vw, 44px)", color: "#F5F5F5", margin: 0 }}>PODIUM</h2>
            </div>

            {/* Podium cards — reordered: 2nd, 1st, 3rd */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, alignItems: "end" }}>
              {[top3[1], top3[0], top3[2]].map((racer, i) => {
                const realRank = i === 0 ? 1 : i === 1 ? 0 : 2;
                const color = PODIUM_COLORS[racer.rank - 1];
                const label = PODIUM_LABELS[racer.rank - 1];
                const isFirst = racer.rank === 1;
                return (
                  <div key={racer.name} style={{ background: isFirst ? "rgba(250,204,21,0.06)" : "#071426", border: `1px solid ${color}30`, borderRadius: 14, padding: isFirst ? "32px 20px" : "24px 16px", textAlign: "center" }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: isFirst ? 18 : 14, color, marginBottom: 12, letterSpacing: 2 }}>{label}</div>
                    <div style={{ width: isFirst ? 72 : 56, height: isFirst ? 72 : 56, background: color + "22", border: `2px solid ${color}55`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: isFirst ? 28 : 22, color }}>
                      {racer.name[0]}
                    </div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: isFirst ? 20 : 16, color: "#F5F5F5", marginBottom: 4 }}>{racer.name}</div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#B8C1CC", marginBottom: 12 }}>{racer.chassis.toUpperCase()}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <div style={{ background: "#050505", borderRadius: 6, padding: "8px 6px" }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color, lineHeight: 1 }}>{racer.wins}</div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, letterSpacing: 2, color: "#B8C1CC", marginTop: 2 }}>WINS</div>
                      </div>
                      <div style={{ background: "#050505", borderRadius: 6, padding: "8px 6px" }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: "#F5F5F5", lineHeight: 1 }}>{racer.best_lap}</div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, letterSpacing: 2, color: "#B8C1CC", marginTop: 2 }}>BEST LAP</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full rankings table */}
          <div>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 8 }}>FULL STANDINGS</div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(24px, 4vw, 40px)", color: "#F5F5F5", margin: 0 }}>ALL RACERS</h2>
            </div>

            <div style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 100px 60px 60px 70px 80px", gap: 8, padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#050505" }}>
                {["#", "RACER", "CHASSIS", "WINS", "RACES", "PODIUMS", "BEST LAP"].map(h => (
                  <div key={h} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: 3, color: "#B8C1CC" }}>{h}</div>
                ))}
              </div>

              {/* All racers */}
              {DEMO_RACERS.map((racer, i) => (
                <div key={racer.name} style={{ display: "grid", gridTemplateColumns: "48px 1fr 100px 60px 60px 70px 80px", gap: 8, padding: "16px 20px", borderBottom: i < DEMO_RACERS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", alignItems: "center", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: racer.rank <= 3 ? PODIUM_COLORS[racer.rank - 1] : "#B8C1CC" }}>{racer.rank}</div>
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: "#F5F5F5" }}>{racer.nationality} {racer.name}</div>
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#B8C1CC" }}>{racer.chassis}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: "#FACC15" }}>{racer.wins}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: "#F5F5F5" }}>{racer.races}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: "#F5F5F5" }}>{racer.podiums}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: "#34D399" }}>{racer.best_lap}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ textAlign: "center", marginTop: 56 }}>
            <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 36, color: "#F5F5F5", marginBottom: 8 }}>WANT YOUR NAME HERE?</h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#B8C1CC", marginBottom: 24 }}>Register free and join the next tournament.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/tournament" style={{ background: "#DC2626", color: "#fff", padding: "13px 28px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 2, textDecoration: "none" }}>VIEW TOURNAMENTS →</a>
              <a href="/register" style={{ background: "transparent", color: "#F5F5F5", padding: "13px 28px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 2, textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)" }}>REGISTER FREE</a>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}