const STATS = [
  { value: "42+", label: "Members" },
  { value: "8", label: "Races Run" },
  { value: "3", label: "Cities" },
  { value: "2026", label: "Season" },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen bg-[#0B1220] flex items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: "linear-gradient(rgba(208,27,27,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(208,27,27,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(208,27,27,0.15) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 text-center px-5 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-red-900/20 border border-red-700/40 rounded-full px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 bg-[#D01B1B] rounded-full animate-pulse" />
          <span className="font-semibold text-xs text-yellow-400 tracking-[0.25em]"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            GREENLAND'S PREMIER TAMIYA COMMUNITY
          </span>
        </div>

        <h1 className="font-black text-[#F4F4F0] leading-[0.9] mb-6 tracking-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(56px, 13vw, 112px)" }}>
          RACE.<br />
          <span className="text-[#D01B1B]">CONNECT.</span><br />
          BUILD.
        </h1>

        <p className="text-slate-400 leading-relaxed max-w-lg mx-auto mb-10 text-base md:text-lg"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Greenland Mini 4WD Club is a passionate Tamiya racing community for Filipinos and locals in Nuuk — built for speed, craft, and real connection.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="/register"
            className="bg-[#D01B1B] hover:bg-red-700 text-white px-9 py-4 rounded font-bold text-base tracking-widest no-underline transition-colors duration-200"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            JOIN THE CLUB
          </a>
          <a href="#events"
            className="border border-white/20 hover:border-[#D01B1B] hover:text-[#D01B1B] text-white px-9 py-4 rounded font-bold text-base tracking-widest no-underline transition-colors duration-200"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            SEE EVENTS →
          </a>
        </div>

        <div className="mt-16 pt-10 border-t border-white/8 grid grid-cols-4 gap-0">
          {STATS.map((stat, i) => (
            <div key={stat.label} className={`text-center px-4 ${i < 3 ? "border-r border-white/8" : ""}`}>
              <div className={`font-black text-3xl md:text-4xl leading-none ${i === 0 ? "text-[#D01B1B]" : "text-[#F4F4F0]"}`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{stat.value}</div>
              <div className="text-[10px] text-gray-600 tracking-widest mt-1 uppercase"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
