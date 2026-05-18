const POSTS = [
  {
    id: 1, tag: "NEWS", date: "May 10, 2026", emoji: "📢",
    title: "Club Membership Now Open for 2026 Season",
    excerpt: "We're officially opening registration for our growing Nuuk community. First 50 members get a free starter kit and club sticker.",
  },
  {
    id: 2, tag: "GUIDE", date: "May 3, 2026", emoji: "🔧",
    title: "Choosing Your First Mini 4WD: A Beginner's Guide",
    excerpt: "Not sure where to start? We break down the best entry-level Tamiya kits for new racers joining us here in Greenland.",
  },
];

const POST_BG = ["from-red-950 to-[#1a0505]", "from-blue-950 to-[#050d1a]"];

export default function Blog() {
  return (
    <section id="blog" className="bg-[#F3F4F6] px-5 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <p className="text-xs font-semibold text-[#D01B1B] tracking-[0.3em] mb-2"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>LATEST</p>
            <h2 className="font-black text-[#111827] leading-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(38px, 6vw, 58px)" }}>
              NEWS &<br />UPDATES
            </h2>
          </div>
          <a href="#" className="font-bold text-sm text-[#D01B1B] tracking-widest no-underline hover:text-red-400"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>ALL POSTS →</a>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {POSTS.map((post, i) => (
            <article key={post.id}
              className="bg-white border border-[#E5E7EB] hover:border-red-700/40 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1">
              <div className={`h-40 bg-gradient-to-br ${POST_BG[i]} flex items-center justify-center text-5xl`}>
                {post.emoji}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-bold tracking-widest text-yellow-400 bg-yellow-400/10 px-2.5 py-0.5 rounded-full"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{post.tag}</span>
                  <span className="text-xs text-slate-300" style={{ fontFamily: "'DM Sans', sans-serif" }}>{post.date}</span>
                </div>
                <h3 className="font-bold text-xl md:text-2xl text-[#111827] leading-tight mb-3"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{post.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-4"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}>{post.excerpt}</p>
                <a href="#" className="text-xs font-bold text-[#D01B1B] tracking-widest no-underline hover:text-red-400"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>READ MORE →</a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
