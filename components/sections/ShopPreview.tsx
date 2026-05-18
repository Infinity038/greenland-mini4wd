const ITEMS = [
  { id: 1, name: "Tamiya Avante", category: "Chassis Kit", price: "DKK 299", emoji: "🚗" },
  { id: 2, name: "Club Racing Tires", category: "Parts", price: "DKK 89", emoji: "🔩" },
  { id: 3, name: "GM4WD Jersey", category: "Apparel", price: "DKK 199", emoji: "👕" },
  { id: 4, name: "Motor Upgrade Set", category: "Parts", price: "DKK 149", emoji: "⚡" },
];

export default function ShopPreview() {
  return (
    <section id="shop" className="relative bg-[#111827] px-5 py-20 overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full pointer-events-none"
        style={{ background: "linear-gradient(135deg, transparent 0%, rgba(208,27,27,0.04) 100%)" }} />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-4">
          <p className="text-xs font-semibold text-[#D01B1B] tracking-[0.3em] mb-2"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>COMING SOON</p>
          <h2 className="font-black text-[#F8FAFC] leading-none mb-4"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(38px, 6vw, 58px)" }}>
            CLUB SHOP
          </h2>
          <p className="text-gray-400 max-w-md mx-auto mb-12 text-base"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Cars, parts, apparel, and accessories — delivered to Nuuk and across Greenland.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {ITEMS.map((item) => (
            <div key={item.id} className="relative bg-[#1E293B] border border-white/[0.07] rounded-lg overflow-hidden">
              <div className="absolute top-3 right-3 text-[10px] font-bold tracking-widest text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-2.5 py-0.5"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>SOON</div>
              <div className="h-36 bg-gradient-to-br from-[#111] to-[#1a1a1a] flex items-center justify-center text-4xl">
                {item.emoji}
              </div>
              <div className="p-4">
                <p className="text-[10px] text-gray-400 tracking-widest mb-1 uppercase"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.category}</p>
                <p className="font-bold text-lg text-[#F8FAFC] leading-tight mb-2"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{item.name}</p>
                <p className="font-black text-xl text-[#D01B1B]"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{item.price}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button className="border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-[#1E293B] px-10 py-3.5 rounded font-bold text-sm tracking-widest transition-all duration-200 cursor-pointer bg-transparent"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            NOTIFY ME WHEN SHOP OPENS
          </button>
        </div>
      </div>
    </section>
  );
}
