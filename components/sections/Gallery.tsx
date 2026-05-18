"use client";
import { useState } from "react";

const ITEMS = [
  { id: 1, label: "Race Day", emoji: "🏎️" },
  { id: 2, label: "Custom Builds", emoji: "🔧" },
  { id: 3, label: "Team Photo", emoji: "📸" },
  { id: 4, label: "Workshop", emoji: "🛠️" },
  { id: 5, label: "Track Setup", emoji: "🏁" },
  { id: 6, label: "Awards Night", emoji: "🏆" },
];

const BG = [
  "from-red-950/80 to-red-900/20",
  "from-blue-950/80 to-blue-900/20",
  "from-emerald-950/80 to-emerald-900/20",
  "from-yellow-950/80 to-yellow-900/20",
  "from-purple-950/80 to-purple-900/20",
  "from-cyan-950/80 to-cyan-900/20",
];

export default function Gallery() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section id="gallery" className="bg-[#0F1923] px-5 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-[#D01B1B] tracking-[0.3em] mb-2"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>COMMUNITY</p>
          <h2 className="font-black text-[#F4F4F0] leading-none"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(38px, 6vw, 58px)" }}>
            PHOTO GALLERY
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {ITEMS.map((item, i) => (
            <div key={item.id}
              className={`relative rounded-lg overflow-hidden border border-white/5 cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 ${i === 0 ? "col-span-2 row-span-2" : ""}`}
              style={{ aspectRatio: "1/1", minHeight: i === 0 ? 220 : 100 }}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}>
              <div className={`w-full h-full bg-gradient-to-br ${BG[i]} flex flex-col items-center justify-center gap-2`}>
                <span style={{ fontSize: i === 0 ? 40 : 20 }}>{item.emoji}</span>
                <span className={`text-white/70 tracking-widest font-semibold ${i === 0 ? "text-sm" : "text-[9px]"}`}
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {item.label.toUpperCase()}
                </span>
              </div>
              <div className={`absolute inset-0 bg-red-700/70 flex items-center justify-center transition-opacity duration-200 ${hovered === item.id ? "opacity-100" : "opacity-0"}`}>
                <span className="text-3xl">🔍</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <a href="#" className="font-bold text-sm text-[#D01B1B] tracking-[0.2em] no-underline hover:text-red-400"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>VIEW FULL GALLERY →</a>
        </div>
      </div>
    </section>
  );
}
