const VALUES = [
  { icon: "🏎️", title: "Race Together", desc: "Monthly races and open track days for all skill levels in Nuuk." },
  { icon: "🔧", title: "Build & Learn", desc: "Hands-on workshops on tuning, building, and upgrading your car." },
  { icon: "🤝", title: "Real Community", desc: "A welcoming space for OFWs and Greenlandic locals to connect." },
  { icon: "🏆", title: "Compete & Grow", desc: "Season rankings, leaderboards, and championship events." },
];

export default function About() {
  return (
    <section id="about" className="bg-[#0F1923] px-5 py-20">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-xs font-semibold text-[#D01B1B] tracking-[0.3em] mb-4"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>OUR STORY</p>
          <h2 className="font-black text-[#F4F4F0] leading-none mb-6"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(38px, 6vw, 62px)" }}>
            MORE THAN<br /><span className="text-[#D01B1B]">JUST RACING</span>
          </h2>
          <p className="text-gray-500 leading-relaxed mb-5 text-base"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Far from home, we found something unexpected: community. Greenland Mini 4WD Club started as a small gathering of Filipinos in Nuuk who wanted a clean, fun hobby outside of work — and it grew into something much bigger.
          </p>
          <p className="text-gray-500 leading-relaxed mb-8 text-base"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            We welcome everyone — OFWs, Greenlandic locals, beginners, and seasoned racers alike. If you love Tamiya cars or just want to try something new, you belong here.
          </p>
          <a href="#register"
            className="inline-block border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-[#0d0d0d] px-7 py-3 rounded font-bold text-sm tracking-widest no-underline transition-all duration-200"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            BECOME A MEMBER
          </a>
        </div>

        <div className="grid gap-4">
          {VALUES.map((v) => (
            <div key={v.title}
              className="flex gap-4 items-start bg-white/[0.02] border border-white/[0.07] hover:border-red-700/40 rounded-lg px-6 py-5 transition-colors duration-200">
              <span className="text-3xl leading-none flex-shrink-0">{v.icon}</span>
              <div>
                <div className="font-bold text-lg text-[#F4F4F0] mb-1"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{v.title}</div>
                <div className="text-sm text-gray-600 leading-relaxed"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}>{v.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}