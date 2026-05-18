import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata = {
  title: "Events & Races — Greenland Mini 4WD Club",
};

const ALL_EVENTS = [
  { id: 1, date: "7", month: "JUN", title: "Nuuk Summer Sprint Race", location: "Nuuk Community Center, Nuuk", type: "Race" as const, spots: 14 },
  { id: 2, date: "21", month: "JUN", title: "Beginner Build Workshop", location: "Hans Egede Skole, Nuuk", type: "Workshop" as const, spots: 18 },
  { id: 3, date: "5", month: "JUL", title: "Open Track Friday Night", location: "Nuuk Community Center, Nuuk", type: "Open Track" as const, spots: null },
  { id: 4, date: "19", month: "JUL", title: "Nuuk Championship Qualifier", location: "Nuuk Community Center, Nuuk", type: "Race" as const, spots: 10 },
  { id: 5, date: "2", month: "AUG", title: "Advanced Tuning Clinic", location: "Hans Egede Skole, Nuuk", type: "Workshop" as const, spots: 12 },
  { id: 6, date: "16", month: "AUG", title: "Open Track Saturday", location: "Nuuk Community Center, Nuuk", type: "Open Track" as const, spots: null },
  { id: 7, date: "6", month: "SEP", title: "2026 Season Grand Finale", location: "Nuuk Community Center, Nuuk", type: "Race" as const, spots: 20 },
];

const TYPE_STYLES = {
  Race: { pill: "text-red-500 bg-red-500/10", border: "hover:border-red-700/50" },
  Workshop: { pill: "text-blue-400 bg-blue-400/10", border: "hover:border-blue-700/50" },
  "Open Track": { pill: "text-emerald-400 bg-emerald-400/10", border: "hover:border-emerald-700/50" },
};

export default function EventsPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#0d0d0d] min-h-screen pt-16">

        {/* Page Hero */}
        <div className="relative bg-[#0F1923] px-5 py-20 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(rgba(208,27,27,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(208,27,27,0.05) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }} />
          <div className="relative z-10 max-w-6xl mx-auto">
            <p className="text-xs font-semibold text-[#D01B1B] tracking-[0.3em] mb-3"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              GREENLAND MINI 4WD CLUB
            </p>
            <h1 className="font-black text-[#F4F4F0] leading-none mb-4"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(48px, 8vw, 80px)" }}>
              EVENTS & RACES
            </h1>
            <p className="text-gray-500 max-w-lg text-base" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              All upcoming race days, workshops, and open track sessions for the 2026 season in Nuuk, Greenland.
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="border-b border-white/5 px-5 py-4">
          <div className="max-w-6xl mx-auto flex gap-3 flex-wrap">
            {["All", "Race", "Workshop", "Open Track"].map((f) => (
              <button key={f}
                className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest border transition-colors duration-200 cursor-pointer
                  ${f === "All"
                    ? "bg-[#D01B1B] border-[#D01B1B] text-white"
                    : "bg-transparent border-white/10 text-gray-500 hover:border-white/30 hover:text-white"}`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Events list */}
        <div className="max-w-6xl mx-auto px-5 py-12">
          <div className="flex flex-col gap-4">
            {ALL_EVENTS.map((ev) => (
              <div key={ev.id}
                className={`bg-[#0F1923] border border-white/[0.07] ${TYPE_STYLES[ev.type].border} rounded-lg p-5 md:p-6 grid grid-cols-[72px_1fr] md:grid-cols-[80px_1fr_auto] gap-4 md:gap-6 items-center transition-all duration-200 hover:-translate-y-0.5 cursor-pointer`}>

                {/* Date */}
                <div className="text-center bg-red-900/10 border border-red-900/20 rounded-md py-3 px-2">
                  <div className="font-black text-xl text-[#D01B1B] leading-none"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{ev.date}</div>
                  <div className="text-[10px] text-gray-600 tracking-widest mt-0.5"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{ev.month}</div>
                </div>

                {/* Info */}
                <div className="min-w-0">
                  <div className="mb-2">
                    <span className={`text-[10px] font-bold tracking-widest px-2.5 py-0.5 rounded-full ${TYPE_STYLES[ev.type].pill}`}
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {ev.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="font-bold text-xl md:text-2xl text-[#F4F4F0] leading-tight mb-1"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{ev.title}</div>
                  <div className="text-sm text-gray-600" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    📍 {ev.location}
                  </div>
                </div>

                {/* RSVP desktop */}
                <div className="hidden md:block text-right flex-shrink-0">
                  <p className="text-xs text-gray-600 mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {ev.spots != null ? `${ev.spots} spots left` : "Open to all"}
                  </p>
                  <button className="bg-[#D01B1B] hover:bg-red-700 text-white px-5 py-2.5 rounded font-bold text-sm tracking-widest border-none cursor-pointer transition-colors"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>RSVP</button>
                </div>

                {/* RSVP mobile */}
                <div className="col-span-2 flex items-center justify-between md:hidden pt-3 border-t border-white/5">
                  <span className="text-xs text-gray-600" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {ev.spots != null ? `${ev.spots} spots left` : "Open to all"}
                  </span>
                  <button className="bg-[#D01B1B] text-white px-5 py-2 rounded font-bold text-sm tracking-widest border-none cursor-pointer"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>RSVP</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}