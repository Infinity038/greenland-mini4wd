import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const panel = { background: "#071426", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 24 } as const;
const heading = { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, color: "#F5F5F5" } as const;
const body = { fontFamily: "'DM Sans', sans-serif", color: "#B8C1CC", lineHeight: 1.75 } as const;

export const metadata = {
  title: "Club Experience | Greenland Mini 4WD Club",
  description: "How visits, safe practice, supervised introductory runs, community racing and the club leaderboard work.",
};

export default function ClubGuide() {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: "100vh", background: "#050505", padding: "112px 20px 72px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <p style={{ ...heading, fontSize: 13, letterSpacing: 4, color: "#DC2626" }}>GREENLAND MINI 4WD CLUB</p>
          <h1 style={{ ...heading, fontSize: "clamp(42px, 7vw, 70px)", lineHeight: 1, margin: "14px 0 18px" }}>COME WATCH. TRY. BUILD. RACE.</h1>
          <p style={{ ...body, fontSize: 17, maxWidth: 720 }}>New to Mini 4WD? You are welcome to discover the club before deciding whether to buy a car. Check the events page for the next confirmed opening; weekly hours and future subscriptions will be announced when finalised.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "24px 0 36px" }}>
            <a href="/events" style={{ ...heading, padding: "13px 22px", borderRadius: 8, background: "#DC2626", color: "white", fontSize: 16, textDecoration: "none" }}>CONFIRMED EVENT DATES →</a>
            <a href="/register" style={{ ...heading, padding: "13px 22px", borderRadius: 8, border: "1px solid #52525B", color: "white", fontSize: 16, textDecoration: "none" }}>REGISTER FREE →</a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            <section style={panel}>
              <h2 style={{ ...heading, fontSize: 28, margin: "0 0 8px" }}>1. VISIT & TRY</h2>
              <p style={body}>A newcomer may join a short supervised demonstration using a designated house car when a trial session is available. A trial is for fun, not entry into a paid championship. Staff control the launch and retrieval.</p>
            </section>
            <section style={panel}>
              <h2 style={{ ...heading, fontSize: 28, margin: "0 0 8px" }}>2. ONE START LINE</h2>
              <p style={body}>Join the walk-in queue. A marshal assigns lanes and releases a heat from the designated starting position. Never place or retrieve a running car anywhere along the circuit. Wait for an authorised stop.</p>
            </section>
            <section style={panel}>
              <h2 style={{ ...heading, fontSize: 28, margin: "0 0 8px" }}>3. JOIN THE COMMUNITY</h2>
              <p style={body}>Account registration is free. Track usage, competition tickets and any future paid passes are separate offers with their own published terms. Previously earned loyalty entitlements remain subject to the existing programme.</p>
            </section>
            <section style={panel}>
              <h2 style={{ ...heading, fontSize: 28, margin: "0 0 8px" }}>4. BUILD & UPGRADE</h2>
              <p style={body}>Beginner kits are different from tuned demonstration builds. A proposed introductory-kit promotion, if launched, will apply only to clearly marked standard cars; B-MAX builds and special editions remain separate retail products.</p>
            </section>
            <section style={panel}>
              <h2 style={{ ...heading, fontSize: 28, margin: "0 0 8px" }}>5. GET ON THE BOARD</h2>
              <p style={body}>Registered competitors build a season record. A public racer nickname is encouraged, and a profile photograph is optional. A generic avatar appears if no public photo is authorised.</p>
              <a href="/leaderboard" style={{ color: "#FACC15", fontWeight: 700 }}>View the leaderboard →</a>
            </section>
            <section style={panel}>
              <h2 style={{ ...heading, fontSize: 28, margin: "0 0 8px" }}>6. PIT STOP</h2>
              <p style={body}>Our planned refreshments include coffee, bottled water, juice, soda, chips and packaged snacks. Potable tap water will be available free where facilities permit. Product availability and any complimentary-drink offer will be posted at each event. This is a smoke-free hobby club.</p>
            </section>
          </div>
          <section style={{ ...panel, marginTop: 18 }}>
            <h2 style={{ ...heading, fontSize: 28, margin: "0 0 10px" }}>CAMERAS & VISITOR CHOICE</h2>
            <p style={body}>Announced race media may be filmed in a marked area. If you do not wish to appear, speak to the organiser and use the non-filmed area where available. Security CCTV, if installed, has a different purpose and is never used as social-media content. A sign alone is not blanket permission for publishing identifiable images, especially of children.</p>
            <a href="/filming-policy" style={{ color:"#FACC15", fontWeight:700 }}>Read the filming & CCTV policy →</a>
          </section>
          <section style={{ ...panel, marginTop: 18 }}>
            <h2 style={{ ...heading, fontSize: 28, margin: "0 0 10px" }}>RACE DAY QUESTIONS</h2>
            <p style={body}><strong style={{ color: "white" }}>Must I book regular practice?</strong> No advance booking is planned. Track access is managed through fair, supervised walk-in turns subject to event capacity.</p>
            <p style={body}><strong style={{ color: "white" }}>Can I enter a tournament using a house car?</strong> A free introductory trial does not include tournament entry. Each tournament publishes its entry and car-eligibility rules separately.</p>
            <p style={body}><strong style={{ color: "white" }}>Are subscriptions on sale now?</strong> This page does not offer a paid subscription or promise a giveaway. Prices and the first-car offer will only be published after the final terms, stock and payment processes are approved.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
