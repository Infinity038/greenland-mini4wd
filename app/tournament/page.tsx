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

  const inputStyle = {
    background: "#0D1B2A", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "12px 16px", color: "#F5F5F5",
    fontSize: 18, fontWeight: 700, width: "100%", outline: "none",
    fontFamily: "'Barlow Condensed', sans-serif"
  };

  return (
    <div style={{ background: "#071426", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 16, padding: "32px 28px" }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 5, color: "#DC2626", marginBottom: 8 }}>LIVE CALCULATOR</div>
      <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: "#F5F5F5", marginBottom: 28 }}>PRIZE POOL ESTIMATOR</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        <div>
          <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 4, color: "#B8C1CC", display: "block", marginBottom: 8 }}>TICKET PRICE (DKK)</label>
          <input type="number" value={ticketPrice} min={10} onChange={e => setTicketPrice(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 4, color: "#B8C1CC", display: "block", marginBottom: 8 }}>NUMBER OF RACERS</label>
          <input type="number" value={racers} min={2} onChange={e => setRacers(Number(e.target.value))} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ background: "#050505", borderRadius: 10, padding: "16px 18px", gridColumn: "span 2" }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 4, color: "#B8C1CC", marginBottom: 4 }}>TOTAL TICKET SALES</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, color: "#F5F5F5" }}>DKK {total.toLocaleString()}</div>
        </div>
        <div style={{ background: "#050505", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 4, color: "#B8C1CC", marginBottom: 4 }}>ORGANIZER / RESERVE (35%)</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 24, color: "#FACC15" }}>DKK {organizer.toLocaleString()}</div>
        </div>
        <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 4, color: "#B8C1CC", marginBottom: 4 }}>TOTAL PRIZE POOL (65%)</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 24, color: "#DC2626" }}>DKK {prizePool.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {[
          { place: "1ST", pct: "60%", amount: first, color: "#FACC15" },
          { place: "2ND", pct: "25%", amount: second, color: "#B8C1CC" },
          { place: "3RD", pct: "15%", amount: third, color: "#DC2626" },
        ].map((p) => (
          <div key={p.place} style={{ background: "#050505", borderRadius: 10, padding: "16px 12px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, color: p.color }}>{p.place}</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: "#B8C1CC", letterSpacing: 2 }}>{p.pct}</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: "#F5F5F5", marginTop: 4 }}>DKK {p.amount.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TournamentsPage() {
  return (
    <>
      <Navbar />
      <main style={{ background: "#050505", color: "#F5F5F5", paddingTop: 80 }}>

        {/* Hero */}
        <section style={{ background: "#071426", padding: "64px 24px", borderBottom: "1px solid rgba(220,38,38,0.2)", textAlign: "center" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 5, color: "#DC2626", marginBottom: 12 }}>REGISTERED MEMBERS ONLY</div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(42px, 7vw, 80px)", color: "#F5F5F5", lineHeight: 1, marginBottom: 20 }}>
              WEEKLY<br /><span style={{ color: "#DC2626" }}>TOURNAMENTS</span>
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "#B8C1CC", lineHeight: 1.7, marginBottom: 32, maxWidth: 560, margin: "0 auto 32px" }}>
              Box stock racing. Real prize pools. Every week. You must be a registered member before purchasing race tickets or entering any tournament.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/register" style={{ background: "#DC2626", color: "#fff", padding: "14px 36px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: 2, textDecoration: "none" }}>
                REGISTER FIRST (FREE) →
              </a>
              <a href="#rules" style={{ background: "transparent", color: "#F5F5F5", padding: "14px 36px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: 2, textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)" }}>
                SEE RULES
              </a>
            </div>
          </div>
        </section>

        {/* Tournament Format */}
        <section id="rules" style={{ padding: "72px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 5, color: "#DC2626", marginBottom: 8 }}>FORMAT</div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(32px, 5vw, 52px)", color: "#F5F5F5" }}>WEEKLY BOX STOCK TOURNAMENT</h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginBottom: 48 }}>
              {[
                { icon: "🎟️", title: "Ticket = Car Entry", desc: "1 ticket = 1 car entry. Each ticket gives you 2 lives during qualification. Use them wisely." },
                { icon: "🚗", title: "One Car Per Ticket", desc: "The same car cannot be entered twice under one ticket. Each entry must be a unique car." },
                { icon: "⚡", title: "Single Elimination Finals", desc: "Qualification rounds determine finalists. The final round is single elimination — no second chances." },
                { icon: "📦", title: "Box Stock Only", desc: "All cars must be box stock Tamiya builds. Any official Tamiya chassis is allowed." },
                { icon: "🔋", title: "Alkaline AA Only", desc: "Only alkaline AA batteries are permitted during race events. No rechargeables." },
                { icon: "🏅", title: "Members Only", desc: "You must be a registered community member before purchasing tickets or entering any race." },
              ].map((item) => (
                <div key={item.title} style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "28px 24px" }}>
                  <div style={{ fontSize: 32, marginBottom: 14 }}>{item.icon}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: "#F5F5F5", marginBottom: 10, letterSpacing: 1 }}>{item.title}</div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#B8C1CC", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Prize Pool */}
            <div style={{ marginBottom: 72 }}>
              <div style={{ textAlign: "center", marginBottom: 36 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 5, color: "#DC2626", marginBottom: 8 }}>PRIZE STRUCTURE</div>
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(28px, 4vw, 48px)", color: "#F5F5F5" }}>HOW THE PRIZE POOL WORKS</h2>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#B8C1CC", marginTop: 12 }}>65% of all ticket sales goes directly into the prize pool. The more racers, the bigger the prizes.</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
                {[
                  { label: "Prize Pool", pct: "65%", desc: "Goes to winners", color: "#DC2626" },
                  { label: "Organizer / Reserve", pct: "35%", desc: "Operations & growth", color: "#FACC15" },
                ].map((item) => (
                  <div key={item.label} style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "24px", textAlign: "center" }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 52, color: item.color, lineHeight: 1 }}>{item.pct}</div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: "#F5F5F5", marginTop: 8 }}>{item.label}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", marginTop: 4 }}>{item.desc}</div>
                  </div>
                ))}
                {[
                  { place: "1st Place", pct: "60%", desc: "of prize pool", color: "#FACC15" },
                  { place: "2nd Place", pct: "25%", desc: "of prize pool", color: "#B8C1CC" },
                  { place: "3rd Place", pct: "15%", desc: "of prize pool", color: "#DC2626" },
                ].map((item) => (
                  <div key={item.place} style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "24px", textAlign: "center" }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 52, color: item.color, lineHeight: 1 }}>{item.pct}</div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: "#F5F5F5", marginTop: 8 }}>{item.place}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", marginTop: 4 }}>{item.desc}</div>
                  </div>
                ))}
              </div>

              <PrizeCalculator />
            </div>

            {/* Side Recognition */}
            <div style={{ marginBottom: 72 }}>
              <div style={{ textAlign: "center", marginBottom: 36 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 5, color: "#FACC15", marginBottom: 8 }}>COMMUNITY RECOGNITION</div>
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(28px, 4vw, 48px)", color: "#F5F5F5" }}>SIDE AWARDS</h2>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#B8C1CC", marginTop: 12, maxWidth: 500, margin: "12px auto 0" }}>Recognition and bragging rights. Social media shoutouts and community status. No physical prizes until capital is recovered.</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                {[
                  { icon: "⚡", title: "Fastest Clean Run", desc: "Best qualifying time with zero lane changes or penalties." },
                  { icon: "🎥", title: "Crowd Favorite Moment", desc: "Most exciting or memorable moment voted by the community." },
                  { icon: "🏎️", title: "Best Lap Time", desc: "Fastest single lap recorded during the tournament." },
                  { icon: "🔥", title: "Fastest Car of the Week", desc: "Top speed across all heat runs. Pure performance recognition." },
                ].map((award) => (
                  <div key={award.title} style={{ background: "#071426", border: "1px solid rgba(250,204,21,0.1)", borderRadius: 12, padding: "24px 20px" }}>
                    <div style={{ fontSize: 28, marginBottom: 12 }}>{award.icon}</div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 17, color: "#FACC15", marginBottom: 8, letterSpacing: 1 }}>{award.title}</div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", lineHeight: 1.6, margin: 0 }}>{award.desc}</p>
                    <div style={{ marginTop: 12, display: "inline-block", background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.15)", borderRadius: 4, padding: "4px 10px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#FACC15" }}>SOCIAL MEDIA SHOUTOUT</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Track Access */}
            <div style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "40px 32px", marginBottom: 48 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 5, color: "#DC2626", marginBottom: 8 }}>TRACK ACCESS</div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, color: "#F5F5F5", marginBottom: 24 }}>WHO CAN USE THE TRACK</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
                {[
                  { title: "Registered Members", desc: "Full access to community track sessions. Join races and tournaments with race ticket.", badge: "FULL ACCESS", badgeColor: "#DC2626" },
                  { title: "First-Time Visitors", desc: "Must register before track or race participation. House cars available for a demo session to try before you register.", badge: "REGISTER FIRST", badgeColor: "#FACC15" },
                  { title: "House Cars & Batteries", desc: "Club demo cars available for first-try sessions. Batteries provided for testing only and must be returned after the session.", badge: "DEMO ONLY", badgeColor: "#B8C1CC" },
                ].map((item) => (
                  <div key={item.title} style={{ background: "#050505", borderRadius: 10, padding: "22px 20px" }}>
                    <div style={{ display: "inline-block", background: "rgba(220,38,38,0.1)", border: `1px solid ${item.badgeColor}30`, borderRadius: 4, padding: "3px 10px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: item.badgeColor, marginBottom: 12 }}>{item.badge}</div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: "#F5F5F5", marginBottom: 8 }}>{item.title}</div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#B8C1CC", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div style={{ textAlign: "center", padding: "20px 0 40px" }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 36, color: "#F5F5F5", marginBottom: 8 }}>READY TO RACE?</h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#B8C1CC", marginBottom: 28 }}>Register for free first. Race tickets are sold separately per tournament.</p>
              <a href="/register" style={{ display: "inline-block", background: "#DC2626", color: "#fff", padding: "16px 48px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: 3, textDecoration: "none" }}>
                REGISTER FREE →
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}