"use client";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

function PrizeCalculator() {
  const [ticketPrice, setTicketPrice] = useState(100);
  const [racers, setRacers] = useState(20);

  const total = ticketPrice * racers;
  const organizer = Math.round(total * 0.35);
  const prizePool = Math.round(total * 0.65);
  const first = Math.round(prizePool * 0.60);
  const second = Math.round(prizePool * 0.25);
  const third = Math.round(prizePool * 0.15);

  const inp: React.CSSProperties = {
    background: "#0D1B2A", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "12px 16px", color: "#F5F5F5",
    fontSize: 20, fontWeight: 700, width: "100%", outline: "none",
    fontFamily: "'Barlow Condensed', sans-serif", boxSizing: "border-box"
  };

  return (
    <div style={{ background: "#071426", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 16, padding: "32px 28px" }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 6 }}>LIVE CALCULATOR</div>
      <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: "#F5F5F5", marginBottom: 28, marginTop: 0 }}>PRIZE POOL ESTIMATOR</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 4, color: "#B8C1CC", display: "block", marginBottom: 8 }}>TICKET PRICE (DKK)</label>
          <input type="number" value={ticketPrice} min={10} onChange={e => setTicketPrice(Number(e.target.value))} style={inp} />
        </div>
        <div>
          <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 4, color: "#B8C1CC", display: "block", marginBottom: 8 }}>NUMBER OF RACERS</label>
          <input type="number" value={racers} min={2} onChange={e => setRacers(Number(e.target.value))} style={inp} />
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ background: "#050505", borderRadius: 10, padding: "18px 20px" }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 4, color: "#B8C1CC", marginBottom: 4 }}>TOTAL TICKET SALES</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 36, color: "#F5F5F5" }}>DKK {total.toLocaleString()}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: "#050505", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 3, color: "#B8C1CC", marginBottom: 4 }}>ORGANIZER 35%</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 24, color: "#FACC15" }}>DKK {organizer.toLocaleString()}</div>
          </div>
          <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 3, color: "#B8C1CC", marginBottom: 4 }}>PRIZE POOL 65%</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 24, color: "#DC2626" }}>DKK {prizePool.toLocaleString()}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[
            { place: "🥇 1ST", pct: "60%", amount: first, color: "#FACC15" },
            { place: "🥈 2ND", pct: "25%", amount: second, color: "#B8C1CC" },
            { place: "🥉 3RD", pct: "15%", amount: third, color: "#DC2626" },
          ].map(p => (
            <div key={p.place} style={{ background: "#050505", borderRadius: 10, padding: "14px 10px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 14, color: p.color, marginBottom: 2 }}>{p.place}</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: "#B8C1CC", letterSpacing: 1 }}>{p.pct}</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: "#F5F5F5", marginTop: 4 }}>DKK {p.amount.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const RULES = [
  { icon: "🎟️", title: "1 Ticket = 1 Car Entry", desc: "Each ticket enters one car. You get 2 lives during qualification rounds." },
  { icon: "🚗", title: "One Car Per Ticket", desc: "The same car cannot be entered twice under one ticket." },
  { icon: "⚡", title: "Single Elimination Finals", desc: "Top qualifiers advance to a single elimination final round." },
  { icon: "📦", title: "Box Stock Only", desc: "Any official Tamiya chassis allowed. Must be unmodified box stock." },
  { icon: "🔋", title: "Alkaline AA Only", desc: "Only standard alkaline AA batteries permitted. No rechargeables." },
  { icon: "✅", title: "Members Only", desc: "Must be a registered community member before buying tickets or racing." },
];

const AWARDS = [
  { icon: "⚡", title: "Fastest Clean Run", desc: "Best qualifying time with zero penalties or lane changes." },
  { icon: "🎥", title: "Crowd Favorite Moment", desc: "Most exciting moment voted by the community." },
  { icon: "🏎️", title: "Best Lap Time", desc: "Fastest single lap recorded during the event." },
  { icon: "🔥", title: "Fastest Car of the Week", desc: "Top speed across all heat runs." },
];

export default function TournamentsPage() {
  return (
    <>
      <Navbar />
      <main style={{ background: "#050505", color: "#F5F5F5", paddingTop: 60 }}>

        {/* Hero */}
        <section style={{ background: "#071426", borderBottom: "1px solid rgba(220,38,38,0.2)", padding: "72px 24px 64px", textAlign: "center" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 20, padding: "5px 14px", marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, background: "#DC2626", borderRadius: "50%", display: "inline-block" }} />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 10, color: "#FACC15", letterSpacing: 4 }}>REGISTERED MEMBERS ONLY</span>
            </div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(48px, 10vw, 96px)", color: "#F5F5F5", lineHeight: 0.9, marginBottom: 20 }}>
              WEEKLY<br /><span style={{ color: "#DC2626" }}>BOX STOCK</span><br />TOURNAMENT
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "#B8C1CC", lineHeight: 1.7, marginBottom: 32, maxWidth: 520, margin: "0 auto 32px" }}>
              Real prize pools funded by ticket sales. Box stock only. Any Tamiya chassis. Alkaline AA batteries. Registered members only.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/register" style={{ background: "#DC2626", color: "#fff", padding: "14px 32px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: 2, textDecoration: "none" }}>
                REGISTER FREE FIRST →
              </a>
              <a href="#calculator" style={{ background: "transparent", color: "#F5F5F5", padding: "14px 32px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: 2, textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)" }}>
                PRIZE CALCULATOR
              </a>
            </div>
          </div>
        </section>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 24px" }}>

          {/* Rules grid */}
          <div style={{ marginBottom: 80 }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 8 }}>FORMAT & RULES</div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(30px, 5vw, 52px)", color: "#F5F5F5", margin: 0 }}>HOW IT WORKS</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {RULES.map(r => (
                <div key={r.title} style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "28px 24px" }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{r.icon}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: "#F5F5F5", marginBottom: 8, letterSpacing: 1 }}>{r.title}</div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#B8C1CC", lineHeight: 1.6, margin: 0 }}>{r.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Prize structure */}
          <div style={{ marginBottom: 80 }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 8 }}>PRIZE STRUCTURE</div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(30px, 5vw, 52px)", color: "#F5F5F5", margin: 0 }}>HOW THE MONEY WORKS</h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#B8C1CC", marginTop: 12 }}>65% of all ticket sales goes directly to winners. More racers = bigger prizes.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 32 }}>
              {[
                { label: "Prize Pool", pct: "65%", sub: "To winners", color: "#DC2626" },
                { label: "Organizer/Reserve", pct: "35%", sub: "Operations", color: "#FACC15" },
                { label: "1st Place", pct: "60%", sub: "Of prize pool", color: "#FACC15" },
                { label: "2nd Place", pct: "25%", sub: "Of prize pool", color: "#B8C1CC" },
                { label: "3rd Place", pct: "15%", sub: "Of prize pool", color: "#DC2626" },
              ].map(p => (
                <div key={p.label} style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "24px 16px", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 44, color: p.color, lineHeight: 1 }}>{p.pct}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: "#F5F5F5", marginTop: 6 }}>{p.label}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#B8C1CC", marginTop: 3 }}>{p.sub}</div>
                </div>
              ))}
            </div>

            <div id="calculator">
              <PrizeCalculator />
            </div>
          </div>

          {/* Side awards */}
          <div style={{ marginBottom: 80 }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#FACC15", marginBottom: 8 }}>COMMUNITY RECOGNITION</div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(30px, 5vw, 52px)", color: "#F5F5F5", margin: 0 }}>SIDE AWARDS</h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#B8C1CC", marginTop: 12 }}>Social media shoutouts and community bragging rights. No physical prizes until capital is recovered.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
              {AWARDS.map(a => (
                <div key={a.title} style={{ background: "#071426", border: "1px solid rgba(250,204,21,0.1)", borderRadius: 12, padding: "24px 20px" }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{a.icon}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 17, color: "#FACC15", marginBottom: 8 }}>{a.title}</div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#B8C1CC", lineHeight: 1.6, margin: "0 0 12px" }}>{a.desc}</p>
                  <div style={{ display: "inline-block", background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.15)", borderRadius: 4, padding: "4px 10px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#FACC15" }}>SOCIAL SHOUTOUT</div>
                </div>
              ))}
            </div>
          </div>

          {/* Track access */}
          <div style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "40px 32px", marginBottom: 48 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 8 }}>TRACK ACCESS</div>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, color: "#F5F5F5", marginBottom: 24, marginTop: 0 }}>WHO CAN USE THE TRACK</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              {[
                { badge: "FULL ACCESS", badgeColor: "#DC2626", title: "Registered Members", desc: "Full access to community track sessions. Enter tournaments by buying race tickets." },
                { badge: "REGISTER FIRST", badgeColor: "#FACC15", title: "First-Time Visitors", desc: "Must register (free) before any track or race participation." },
                { badge: "RENTAL AVAILABLE", badgeColor: "#B8C1CC", title: "House Cars & Batteries", desc: "House car rental: 25 kr/hour (batteries included). Battery rental only: 15 kr. Batteries are for use during the session and must be returned." },
              ].map(t => (
                <div key={t.title} style={{ background: "#050505", borderRadius: 10, padding: "22px 20px" }}>
                  <div style={{ display: "inline-block", border: `1px solid ${t.badgeColor}40`, borderRadius: 4, padding: "3px 10px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: t.badgeColor, marginBottom: 12 }}>{t.badge}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: "#F5F5F5", marginBottom: 8 }}>{t.title}</div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#B8C1CC", lineHeight: 1.6, margin: 0 }}>{t.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ textAlign: "center", padding: "20px 0 20px" }}>
            <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 40, color: "#F5F5F5", marginBottom: 8 }}>READY TO RACE?</h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#B8C1CC", marginBottom: 28 }}>Register free first. Race tickets sold separately per tournament.</p>
            <a href={typeof window !== 'undefined' && document.cookie.includes('gm4wd_registered=1') ? '/shop' : '/register'} style={{ background: "#DC2626", color: "#fff", padding: "14px 32px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: 2, textDecoration: "none" }}>
              {typeof window !== 'undefined' && document.cookie.includes('gm4wd_registered=1') ? 'BUY RACE TICKETS →' : 'REGISTER FREE FIRST →'}
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}