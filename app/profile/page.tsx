"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getMemberData, getMemberDataFromSupabase, logout } from "@/lib/member";

const EXP_LABEL: any = {
  beginner: "Beginner — New to Mini 4WD",
  intermediate: "Intermediate — Built a few",
  advanced: "Advanced — Regular racer",
};

const STAT_PLACEHOLDER = [
  { label: "Races Entered", value: "0", icon: "🏁", note: "Coming soon" },
  { label: "Tournament Wins", value: "0", icon: "🏆", note: "Coming soon" },
  { label: "Best Lap Time", value: "—", icon: "⚡", note: "Coming soon" },
  { label: "Global Rank", value: "—", icon: "📊", note: "Coming soon" },
];

export default function ProfilePage() {
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      let data = getMemberData();
      if (data?.email) {
        const fresh = await getMemberDataFromSupabase(data.email);
        if (fresh) data = fresh;
      }
      setMember(data);
      setLoading(false);
    }
    load();
  }, []);

  const displayName = member
    ? (member.name || `${member.first_name || ""} ${member.last_name || ""}`.trim() || "Member")
    : "Loading...";

  const initial = displayName[0]?.toUpperCase() || "?";

  const registeredDate = member?.registered_at || member?.created_at
    ? new Date(member.registered_at || member.created_at).toLocaleDateString("en-GB", {
        year: "numeric", month: "long", day: "numeric",
      })
    : "—";

  return (
    <>
      <Navbar />
      <main style={{ background: "#050505", color: "#F5F5F5", minHeight: "100vh", paddingTop: 80, paddingBottom: 80 }}>
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40, paddingBottom: 32, borderBottom: "1px solid rgba(255,255,255,0.08)", flexWrap: "wrap" }}>
            <div style={{ width: 80, height: 80, background: "#DC2626", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, color: "#fff", flexShrink: 0, border: "3px solid rgba(220,38,38,0.3)" }}>
              {loading ? "..." : initial}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 4, color: "#DC2626", marginBottom: 4 }}>COMMUNITY MEMBER</div>
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(24px, 5vw, 40px)", color: "#F5F5F5", margin: 0, lineHeight: 1 }}>
                {displayName.toUpperCase()}
              </h1>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", marginTop: 6 }}>
                Member since {registeredDate} · {member?.city || "Nuuk, Greenland"}
              </div>
            </div>
            <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 6, padding: "6px 14px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 3, color: "#22C55E" }}>
              ✓ ACTIVE MEMBER
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 40 }}>
            {STAT_PLACEHOLDER.map(s => (
              <div key={s.label} style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "18px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: "#F5F5F5", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#B8C1CC", marginTop: 4 }}>{s.label.toUpperCase()}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#DC2626", marginTop: 3 }}>{s.note}</div>
              </div>
            ))}
          </div>

          {/* Member info */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 16 }}>MEMBER INFO</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
              {[
                { label: "Email", value: member?.email },
                { label: "Phone", value: member?.phone || "Not provided" },
                { label: "Nationality", value: member?.nationality || "Not provided" },
                { label: "City / Town", value: member?.city || "Not provided" },
                { label: "Experience Level", value: EXP_LABEL[member?.experience] || member?.experience || "Not provided" },
                { label: "Favorite Chassis", value: member?.favorite_chassis || "Not set yet" },
              ].map(item => (
                <div key={item.label} style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "16px 18px" }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 4, color: "#B8C1CC", marginBottom: 5 }}>{item.label.toUpperCase()}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#F5F5F5" }}>{item.value || "—"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* My Cars placeholder */}
          <div style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "24px", marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 4 }}>GARAGE</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, color: "#F5F5F5" }}>MY CARS</div>
              </div>
              <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 6, padding: "5px 12px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#DC2626" }}>COMING SOON</div>
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", margin: "0 0 16px", lineHeight: 1.6 }}>
              Track your Mini 4WD collection here. Add cars, log upgrades, and manage your race roster.
            </p>
            <a href="/shop" style={{ display: "inline-block", background: "#DC2626", color: "#fff", padding: "10px 22px", borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 2, textDecoration: "none" }}>
              PREORDER A CAR →
            </a>
          </div>

          {/* Race history placeholder */}
          <div style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "24px", marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#FACC15", marginBottom: 4 }}>HISTORY</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, color: "#F5F5F5" }}>RACE HISTORY</div>
              </div>
              <div style={{ background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.2)", borderRadius: 6, padding: "5px 12px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: 3, color: "#FACC15" }}>COMING SOON</div>
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", margin: "0 0 16px", lineHeight: 1.6 }}>
              Your full tournament and race history will appear here once events begin.
            </p>
            <a href="/tournament" style={{ display: "inline-block", background: "transparent", color: "#FACC15", padding: "10px 22px", borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 2, textDecoration: "none", border: "1px solid rgba(250,204,21,0.3)" }}>
              VIEW TOURNAMENTS →
            </a>
          </div>

          {/* Quick links */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 40 }}>
            <a href="/orders" style={{ background: "#DC2626", color: "#fff", padding: "14px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 2, textDecoration: "none", textAlign: "center" }}>MY ORDERS →</a>
            <a href="/tournament" style={{ background: "#071426", color: "#F5F5F5", padding: "14px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 2, textDecoration: "none", textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>TOURNAMENTS →</a>
            <a href="/shop" style={{ background: "#071426", color: "#F5F5F5", padding: "14px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 2, textDecoration: "none", textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>SHOP →</a>
          </div>

          {/* Social links */}
          <div style={{ background: "#071426", border: "1px solid rgba(250,204,21,0.12)", borderRadius: 12, padding: "22px 24px", marginBottom: 32 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 4, color: "#FACC15", marginBottom: 12 }}>FOLLOW THE ARCTIC HUSTLE</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                { label: "Facebook Group", href: "https://www.facebook.com/share/g/18gBxyY1Wd/?mibextid=wwXIfr" },
                { label: "Instagram", href: "https://www.instagram.com/thearctichustle" },
                { label: "TikTok", href: "https://www.tiktok.com/@the.arctic.hustle" },
                { label: "YouTube", href: "https://youtube.com/@thearctichustle-038" },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "8px 14px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: "#F5F5F5", textDecoration: "none", letterSpacing: 1 }}>
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <button onClick={logout}
            style={{ background: "transparent", border: "1px solid rgba(220,38,38,0.3)", color: "#DC2626", padding: "12px 28px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 2, cursor: "pointer" }}>
            LOGOUT
          </button>

        </div>
      </main>
      <Footer />
    </>
  );
}