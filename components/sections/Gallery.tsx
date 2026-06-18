"use client";
import { useState } from "react";

const ITEMS = [
  { id: 1, label: "Race Day",      emoji: "🏎️", bg: "linear-gradient(135deg,#3b0000,#1a0000)" },
  { id: 2, label: "Custom Builds", emoji: "🔧", bg: "linear-gradient(135deg,#001a3b,#00082b)" },
  { id: 3, label: "Team Photo",    emoji: "📸", bg: "linear-gradient(135deg,#003b1a,#001a0a)" },
  { id: 4, label: "Workshop",      emoji: "🛠️", bg: "linear-gradient(135deg,#3b2e00,#1a1500)" },
  { id: 5, label: "Track Setup",   emoji: "🏁", bg: "linear-gradient(135deg,#1a003b,#0a001a)" },
  { id: 6, label: "Awards Night",  emoji: "🏆", bg: "linear-gradient(135deg,#003b3b,#001a1a)" },
];

export default function Gallery() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section id="gallery" style={{ background: "#F3F4F6", padding: "80px 20px" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600, color: "#D01B1B", letterSpacing: "0.3em", marginBottom: 8 }}>COMMUNITY</p>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, color: "#111827", lineHeight: 1, margin: 0, fontSize: "clamp(38px, 6vw, 58px)" }}>PHOTO GALLERY</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {ITEMS.map((item, i) => (
            <div key={item.id}
              style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", aspectRatio: "1/1", minHeight: i === 0 ? 220 : 100, gridColumn: i === 0 ? "span 2" : "span 1", gridRow: i === 0 ? "span 2" : "span 1", transform: hovered === item.id ? "translateY(-2px)" : "none", transition: "transform 0.2s" }}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}>
              <div style={{ width: "100%", height: "100%", background: item.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ fontSize: i === 0 ? 40 : 20 }}>{item.emoji}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, color: "rgba(255,255,255,0.9)", letterSpacing: "0.2em", fontSize: i === 0 ? 14 : 9 }}>
                  {item.label.toUpperCase()}
                </span>
              </div>
              {hovered === item.id && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(176,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 30 }}>🔍</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <a href="/gallery" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: "#D01B1B", letterSpacing: "0.2em", textDecoration: "none" }}>VIEW FULL GALLERY →</a>
        </div>
      </div>
    </section>
  );
}