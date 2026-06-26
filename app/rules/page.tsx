// @ts-nocheck
'use client';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const CLASSES = [
  {
    id: 'boxstock',
    label: 'Box Stock',
    color: '#22C55E',
    icon: '📦',
    rules: [
      'Contents inside the box are fixed — what comes in the box is what you use.',
      'Starter pack or advance pack upgrades are NOT included.',
      'No modifications of any kind allowed.',
      'Stock motor, stock gear ratio, stock rollers.',
      'Body, chassis, and all internal parts must remain as shipped.',
    ],
  },
  {
    id: 'open_boxstock',
    label: 'Open Box Stock',
    color: '#3B82F6',
    icon: '🔓',
    rules: [
      'Same as Box Stock with limited cosmetic replacement options.',
      'Allowed replacements: mag color, cowl color, chassis color.',
      'Replacement permitted ONLY for appearance or damage repair.',
      'You CANNOT change the type — only the color.',
      'Example: Spiral mags CANNOT be replaced with spoke mags.',
      'Example: Soft tires CANNOT be replaced with hard tires.',
      'If in doubt, check with admin before race day.',
    ],
  },
  {
    id: 'bmax',
    label: 'B-Max',
    color: '#F97316',
    icon: '⚡',
    rules: [
      'Carbon reinforcement parts allowed.',
      'Gimmick parts allowed (dampers, stabilizers).',
      'Slide damper systems permitted.',
      'Performance tuning for intermediate to advanced builders.',
      'Motor and battery restrictions still apply (see General Rules).',
    ],
  },
  {
    id: 'open',
    label: 'Open Class',
    color: '#DC2626',
    icon: '🔥',
    rules: [
      'No restrictions on modifications or performance parts.',
      'Any Tamiya-legal motor permitted.',
      'Full carbon, gimmicks, dampers — all allowed.',
      'Most competitive class on the track.',
      'Motor and battery restrictions still apply (see General Rules).',
    ],
  },
];

const GENERAL_RULES = [
  { icon: '🔋', title: 'Motors & Batteries', desc: 'Only approved unmodified Tamiya motors. Only alkaline or NiMH batteries. Lithium batteries are prohibited in all classes.' },
  { icon: '🎟️', title: '1 Ticket = 1 Entry', desc: 'Each ticket lets you enter 1 car into 1 race category. Buy more tickets to enter more cars or more categories.' },
  { icon: '🔄', title: 'Multi-Category Entry', desc: 'The same car can enter multiple different categories on the same race day. However, the same car CANNOT enter the same category twice.' },
  { icon: '📐', title: 'Car Dimensions', desc: 'Max width 105mm · Max height 70mm · Max length 165mm · Min ground clearance 1mm · Min weight 90g · Tires 22–26mm diameter.' },
  { icon: '🏁', title: 'Qualification Format', desc: '2 timed runs per entry. Best run counts. Top qualifiers advance to single-elimination finals.' },
  { icon: '⚡', title: 'Finals Format', desc: 'Single elimination head-to-head racing. Win or go home. No second chances in the finals.' },
  { icon: '🚫', title: 'Disqualification', desc: 'Oil/grease leaks, illegal parts, false starts (2nd offense), non-approved motors or batteries result in race or event disqualification.' },
  { icon: '👤', title: 'Official Members Only', desc: 'Tournament entry requires Official Member status. Complete a qualifying purchase to unlock race entry.' },
];

const SINGLE_FORMAT_STEPS = [
  { n: 1, label: 'QUALIFYING', desc: 'Every entrant gets 2 timed runs. Best time counts.', color: '#3B82F6' },
  { n: 2, label: 'ELIMINATION BRACKET', desc: 'Top qualifiers face off head-to-head. Win and advance, lose and you\u2019re out.', color: '#F97316' },
  { n: 3, label: 'FINAL', desc: 'Last two standing race once more. Winner takes the category.', color: '#DC2626' },
];

const TEAM_FORMAT_STEPS = [
  { n: 1, label: 'GROUP STAGE', desc: 'Teams split into groups of 3. Each member races their own round \u2014 the team\u2019s scores get added together. Highest combined score in the group advances.', color: '#3B82F6', note: 'Tied scores trigger a tiebreaker round.' },
  { n: 2, label: '3 PARALLEL FINALS', desc: 'Group winners race the Championship Final (1st\u20133rd). Runners-up race the Consolation Final (4th\u20136th). Third-placers race the Placement Final (7th+).', color: '#FACC15' },
  { n: 3, label: 'FINAL STANDINGS', desc: 'Placement is set by each team\u2019s final-round result \u2014 nobody is ranked on leftover group-stage scores.', color: '#22C55E' },
];

function FormatFlow({ steps }: { steps: typeof SINGLE_FORMAT_STEPS }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {steps.map((s, i) => (
        <div key={s.n}>
          <div style={{ background: '#0A0F1C', border: `1px solid ${s.color}44`, borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ ...F, fontWeight: 900, fontSize: 20, color: s.color, flexShrink: 0, width: 26 }}>{s.n}</div>
            <div>
              <div style={{ ...F, fontWeight: 800, fontSize: 14, letterSpacing: 1, color: s.color, marginBottom: 4 }}>{s.label}</div>
              <div style={{ ...FB, fontSize: 13.5, color: '#B8C1CC', lineHeight: 1.6 }}>{s.desc}</div>
              {('note' in s) && s.note && <div style={{ ...FB, fontSize: 12, color: '#6B7280', marginTop: 6, fontStyle: 'italic' }}>{s.note}</div>}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ textAlign: 'center', color: '#374151', fontSize: 16, padding: '4px 0' }}>↓</div>
          )}
        </div>
      ))}
    </div>
  );
}

function MiniTeamBox({ label, score, win }: { label: string; score: string; win?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 10px', borderRadius: 7, marginBottom: 5, fontSize: 12.5,
      background: win ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.03)',
      border: win ? '1px solid rgba(220,38,38,0.35)' : '1px solid transparent',
      fontWeight: win ? 700 : 500,
    }}>
      <span>{label}</span>
      <span style={{ color: '#FACC15', fontWeight: 800 }}>{score}</span>
    </div>
  );
}

export default function RulesPage() {
  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60 }}>

        {/* Hero */}
        <section style={{ background: 'linear-gradient(180deg, #071426 0%, #050505 100%)', borderBottom: '1px solid rgba(220,38,38,0.2)', padding: '64px 24px 56px', textAlign: 'center' }}>
          <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 12 }}>GREENLAND MINI 4WD CLUB</div>
          <h1 style={{ ...F, fontWeight: 900, fontSize: 'clamp(48px, 10vw, 96px)', lineHeight: 0.9, margin: '0 0 20px' }}>
            RACE<br /><span style={{ color: '#DC2626' }}>RULES</span>
          </h1>
          <p style={{ ...FB, fontSize: 16, color: '#B8C1CC', maxWidth: 520, margin: '0 auto' }}>
            Official racing rules for the Greenland Mini 4WD Club. Know your class. Race clean. Win fair.
          </p>
        </section>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px' }}>

          {/* General Rules */}
          <section style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>ALL CLASSES</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 32px' }}>GENERAL RULES</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {GENERAL_RULES.map(r => (
                <div key={r.title} style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '18px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{r.icon}</span>
                  <div>
                    <div style={{ ...F, fontWeight: 800, fontSize: 17, color: '#F5F5F5', marginBottom: 4 }}>{r.title}</div>
                    <div style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.6 }}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Race Classes */}
          <section style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>CATEGORIES</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 32px' }}>RACING CLASSES</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {CLASSES.map(cls => (
                <div key={cls.id} style={{ background: '#071426', border: `1.5px solid ${cls.color}44`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ height: 4, background: cls.color }} />
                  <div style={{ padding: '24px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <span style={{ fontSize: 28 }}>{cls.icon}</span>
                      <span style={{ ...F, fontWeight: 900, fontSize: 28, color: cls.color }}>{cls.label}</span>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {cls.rules.map((rule, i) => (
                        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ color: cls.color, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span>
                          <span style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.6 }}>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* HOW RACE DAY WORKS — visual formats */}
          <section style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>FORMATS</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 12px' }}>HOW RACE DAY WORKS</h2>
            <p style={{ ...FB, fontSize: 14, color: '#B8C1CC', marginBottom: 36, maxWidth: 600, lineHeight: 1.6 }}>
              Two formats run at the club. Here's how each one decides a winner — step by step, with a worked example.
            </p>

            {/* Single Race Format */}
            <div style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 22 }}>🏁</span>
                <span style={{ ...F, fontWeight: 800, fontSize: 20 }}>SINGLE RACE FORMAT</span>
              </div>
              <FormatFlow steps={SINGLE_FORMAT_STEPS} />

              {/* Worked example */}
              <div style={{ marginTop: 18, background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
                <div style={{ ...F, fontSize: 11, letterSpacing: 2, color: '#6B7280', marginBottom: 10 }}>EXAMPLE — 4 RACERS</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 140px', minWidth: 130 }}>
                    <MiniTeamBox label="Racer A" score="WIN" win />
                    <MiniTeamBox label="Racer B" score="OUT" />
                  </div>
                  <div style={{ flex: '1 1 140px', minWidth: 130 }}>
                    <MiniTeamBox label="Racer C" score="WIN" win />
                    <MiniTeamBox label="Racer D" score="OUT" />
                  </div>
                </div>
                <div style={{ textAlign: 'center', color: '#374151', fontSize: 14, padding: '6px 0' }}>↓ winners meet in the final ↓</div>
                <div style={{ maxWidth: 200, margin: '0 auto' }}>
                  <MiniTeamBox label="🏆 Racer A — Champion" score="" win />
                </div>
              </div>
            </div>

            {/* Coop & Team Battle Format */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>👥</span>
                <span style={{ ...F, fontWeight: 800, fontSize: 20 }}>COOP & TEAM BATTLE FORMAT</span>
              </div>
              <p style={{ ...FB, fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 1.6 }}>
                Coop = 2-member teams. Team Battle = same idea, up to 5 members. Every member races their own round — the team's combined score decides the result.
              </p>
              <FormatFlow steps={TEAM_FORMAT_STEPS} />

              {/* Worked example */}
              <div style={{ marginTop: 18, background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
                <div style={{ ...F, fontSize: 11, letterSpacing: 2, color: '#6B7280', marginBottom: 10 }}>EXAMPLE — 9 TEAMS, 3 GROUPS</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                  <div style={{ flex: '1 1 150px', minWidth: 140 }}>
                    <div style={{ ...F, fontSize: 10, letterSpacing: 1, color: '#6B7280', marginBottom: 6 }}>GROUP 1</div>
                    <MiniTeamBox label="Team B" score="6" win />
                    <MiniTeamBox label="Team A" score="5" />
                    <MiniTeamBox label="Team C" score="2" />
                  </div>
                  <div style={{ flex: '1 1 150px', minWidth: 140 }}>
                    <div style={{ ...F, fontSize: 10, letterSpacing: 1, color: '#6B7280', marginBottom: 6 }}>GROUP 2 — tied, tiebreaker run</div>
                    <MiniTeamBox label="Team E" score="6*" win />
                    <MiniTeamBox label="Team F" score="6*" />
                    <MiniTeamBox label="Team D" score="1" />
                  </div>
                  <div style={{ flex: '1 1 150px', minWidth: 140 }}>
                    <div style={{ ...F, fontSize: 10, letterSpacing: 1, color: '#6B7280', marginBottom: 6 }}>GROUP 3</div>
                    <MiniTeamBox label="Team G" score="5" win />
                    <MiniTeamBox label="Team I" score="4" />
                    <MiniTeamBox label="Team H" score="3" />
                  </div>
                </div>
                <div style={{ textAlign: 'center', color: '#374151', fontSize: 14, padding: '6px 0' }}>↓ group winners advance to the Championship Final ↓</div>
                <div style={{ maxWidth: 220, margin: '0 auto' }}>
                  <MiniTeamBox label="🏆 Team E — Champion" score="6" win />
                  <MiniTeamBox label="🥈 Team B — 2nd" score="5" />
                  <MiniTeamBox label="🥉 Team G — 3rd" score="3" />
                </div>
                <div style={{ ...FB, fontSize: 11.5, color: '#6B7280', marginTop: 10, textAlign: 'center', lineHeight: 1.5 }}>
                  Runners-up (Team A, F, I) and third-placers (Team C, D, H) race their own finals for 4th–9th — nobody gets ranked without racing for it.
                </div>
              </div>
            </div>
          </section>

          {/* Entry rules */}
          <section style={{ marginBottom: 64 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>MULTI-CLASS</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 20px' }}>CAR ENTRY RULES</h2>
            <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: '✅ ALLOWED', text: 'A stock car (Box Stock) can enter B-Max or Open Class races.', color: '#22C55E' },
                { label: '✅ ALLOWED', text: 'The same car can race in multiple different categories in one race day.', color: '#22C55E' },
                { label: '❌ NOT ALLOWED', text: 'A modified car (B-Max / Open Class) cannot enter Box Stock or Open Box Stock.', color: '#DC2626' },
                { label: '❌ NOT ALLOWED', text: 'The same car cannot enter the same category twice in one race day.', color: '#DC2626' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ ...F, fontWeight: 700, fontSize: 11, letterSpacing: 1, color: r.color, flexShrink: 0, paddingTop: 2 }}>{r.label}</span>
                  <span style={{ ...FB, fontSize: 14, color: '#B8C1CC', lineHeight: 1.6 }}>{r.text}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Source credit */}
          <div style={{ textAlign: 'center', ...FB, fontSize: 12, color: '#6B7280' }}>
            Full class rules based on <a href="https://mini4wdracing.com/mini-4wd-racing-classes-explained/" target="_blank" rel="noreferrer" style={{ color: '#DC2626' }}>mini4wdracing.com</a> · Adapted for Greenland Mini 4WD Club
          </div>

          {/* CTA */}
          <section style={{ marginTop: 48, background: '#071426', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 16, padding: '36px 28px', textAlign: 'center' }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 10 }}>READY?</div>
            <h3 style={{ ...F, fontWeight: 900, fontSize: 'clamp(28px, 6vw, 46px)', margin: '0 0 20px' }}>REGISTER YOUR CAR & RACE</h3>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/tickets" style={{ background: '#DC2626', color: '#fff', padding: '13px 28px', borderRadius: 8, ...F, fontWeight: 900, fontSize: 16, letterSpacing: 2, textDecoration: 'none' }}>🎟️ BUY TICKETS →</a>
              <a href="/tournament" style={{ background: 'transparent', color: '#F5F5F5', padding: '13px 28px', borderRadius: 8, ...F, fontWeight: 700, fontSize: 16, letterSpacing: 2, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>VIEW TOURNAMENT</a>
            </div>
          </section>

        </div>
      </main>
      <Footer />
    </>
  );
}