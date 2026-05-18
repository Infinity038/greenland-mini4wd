import type { Event } from "@/types";

const EVENTS = [
  { id: 1, date: "7", month: "JUN", title: "Nuuk Summer Sprint Race", location: "Nuuk Community Center, Nuuk", type: "Race" as const, spots: 14 },
  { id: 2, date: "21", month: "JUN", title: "Beginner Build Workshop", location: "Hans Egede Skole, Nuuk", type: "Workshop" as const, spots: 18 },
  { id: 3, date: "5", month: "JUL", title: "Open Track Friday Night", location: "Nuuk Community Center, Nuuk", type: "Open Track" as const, spots: null },
];

const TYPE_STYLES: Record<Event["type"], string> = {
  Race: "text-red-500 bg-red-500/10",
  Workshop: "text-blue-400 bg-blue-400/10",
  "Open Track": "text-emerald-400 bg-emerald-400/10",
};

export default function Events() {
  return (
    <section id="events" className="bg-[#0d0d0d] px-5 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <p className="text-xs font-semibold text-[#D01B1B] tracking-[0.3em] mb-2"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>UPCOMING</p>
            <h2 className="font-black text-[#F4F4F0] leading-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(38px, 6vw, 58px)" }}>
              EVENTS &<br />RACES
            </h2>
          </div>
          <a href="/events" className="font-bold text-sm text-[#D01B1B] tracking-widest no-underline hover:text-red-400"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>VIEW ALL →</a>
        </div>

        <div className="flex flex-col gap-4">
          {EVENTS.map((ev) => (
            <div key={ev.id}
              className="bg-[#0F1923] border border-white/[0.07] hover:border-red-700/50 rounded-lg p-5 md:p-6 grid grid-cols-[72px_1fr] md:grid-cols-[80px_1fr_auto] gap-4 md:gap-6 items-center transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
              <div className="text-center bg-red-900/10 border border-red-900/20 rounded-md py-3 px-2">
                <div className="font-black text-xl text-[#D01B1B] leading-none"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{ev.date}</div>
                <div className="text-[10px] text-gray-400 tracking-widest mt-0.5"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{ev.month}</div>
              </div>
              <div className="min-w-0">
                <div className="mb-2">
                  <span className={`text-[10px] font-bold tracking-widest px-2.5 py-0.5 rounded-full ${TYPE_STYLES[ev.type]}`}
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{ev.type.toUpperCase()}</span>
                </div>
                <div className="font-bold text-xl md:text-2xl text-[#F4F4F0] leading-tight mb-1"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{ev.title}</div>
                <div className="text-sm text-gray-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>📍 {ev.location}</div>
              </div>
              <div className="hidden md:block text-right flex-shrink-0">
                {ev.spots && <p className="text-xs text-gray-400 mb-2">{ev.spots} spots left</p>}
                <button className="bg-[#D01B1B] hover:bg-red-700 text-white px-5 py-2.5 rounded font-bold text-sm tracking-widest border-none cursor-pointer"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>RSVP</button>
              </div>
              <div className="col-span-2 flex items-center justify-between md:hidden pt-2 border-t border-white/5">
                <span className="text-xs text-gray-400">{ev.spots ? `${ev.spots} spots left` : "Open to all"}</span>
                <button className="bg-[#D01B1B] text-white px-5 py-2 rounded font-bold text-sm tracking-widest border-none cursor-pointer"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>RSVP</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
