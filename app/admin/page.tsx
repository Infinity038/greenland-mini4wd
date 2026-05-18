"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const PASSWORD = "mini4wd2026";

type Member = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  nationality: string;
  city: string;
  experience: string;
  created_at: string;
};

export default function AdminPage() {
  const [auth, setAuth] = useState(false);
  const [pw, setPw] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  const login = () => {
    if (pw === PASSWORD) setAuth(true);
  };

  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    supabase.from("members").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { setMembers(data || []); setLoading(false); });
  }, [auth]);

  if (!auth) return (
    <main style={{ background: "#0D0D0D", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: 48, width: "100%", maxWidth: 400, textAlign: "center" }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 900, color: "#fff", marginBottom: 8 }}>
          ADMIN <span style={{ color: "#D01B1B" }}>ACCESS</span>
        </div>
        <p style={{ color: "#555", marginBottom: 32, fontSize: 14 }}>Greenland Mini 4WD Club</p>
        <input
          type="password" placeholder="Enter password"
          value={pw} onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          style={{ width: "100%", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "14px 16px", color: "#fff", fontSize: 16, outline: "none", marginBottom: 16 }}
        />
        <button onClick={login}
          style={{ width: "100%", background: "#D01B1B", color: "#fff", border: "none", borderRadius: 8, padding: 16, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 2, cursor: "pointer" }}>
          LOGIN
        </button>
      </div>
    </main>
  );

  return (
    <main style={{ background: "#0D0D0D", minHeight: "100vh", padding: "40px 24px", color: "#fff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 40, fontWeight: 900 }}>
              ADMIN <span style={{ color: "#D01B1B" }}>DASHBOARD</span>
            </div>
            <div style={{ color: "#555", fontSize: 14 }}>Greenland Mini 4WD Club</div>
          </div>
          <button onClick={() => setAuth(false)}
            style={{ background: "#F9FAFB", color: "#aaa", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontSize: 14 }}>
            Logout
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Total Members", value: members.length },
            { label: "Beginners", value: members.filter(m => m.experience === "beginner").length },
            { label: "Intermediate", value: members.filter(m => m.experience === "intermediate").length },
            { label: "Advanced", value: members.filter(m => m.experience === "advanced").length },
          ].map((s) => (
            <div key={s.label} style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: 24 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 40, fontWeight: 900, color: "#D01B1B" }}>{s.value}</div>
              <div style={{ color: "#555", fontSize: 13, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #222", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 700 }}>
            MEMBERS ({members.length})
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#555" }}>Loading...</div>
          ) : members.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#555" }}>No members yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#0D0D0D" }}>
                    {["Name", "Email", "Phone", "Nationality", "City", "Experience", "Joined"].map((h) => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#555", fontSize: 11, letterSpacing: 2, fontWeight: 600, whiteSpace: "nowrap" }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, i) => (
                    <tr key={m.id} style={{ borderTop: "1px solid #1a1a1a", background: i % 2 === 0 ? "#111" : "#0f0f0f" }}>
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap", fontWeight: 600 }}>{m.first_name} {m.last_name}</td>
                      <td style={{ padding: "14px 16px", color: "#aaa" }}>{m.email}</td>
                      <td style={{ padding: "14px 16px", color: "#aaa" }}>{m.phone}</td>
                      <td style={{ padding: "14px 16px", color: "#aaa" }}>{m.nationality}</td>
                      <td style={{ padding: "14px 16px", color: "#aaa" }}>{m.city}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ background: m.experience === "advanced" ? "#D01B1B" : m.experience === "intermediate" ? "#b8860b" : "#1a3a1a", color: "#fff", padding: "4px 10px", borderRadius: 4, fontSize: 11, letterSpacing: 1 }}>
                          {m.experience || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "#555", whiteSpace: "nowrap" }}>
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
