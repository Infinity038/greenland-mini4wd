import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import KnowledgeTabs from '@/components/knowledge/KnowledgeTabs';
import {
  CLASS_MATRIX,
  GENERAL_RULES,
  INSPECTION_CHECKLIST,
  MACHINE_LIMITS,
  MOTOR_MATRIX,
  OFFICIAL_SOURCES,
  PENALTY_STEPS,
  RULE_CLASSES,
  RULEBOOK_VERSION,
} from '@/lib/rulesGuidesContent';

const headingFont = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const bodyFont = { fontFamily: "'DM Sans', sans-serif" } as const;

function SectionTitle({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ ...headingFont, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 8 }}>{eyebrow}</div>
      <h2 style={{ ...headingFont, fontWeight: 900, fontSize: 'clamp(32px, 6vw, 52px)', margin: 0 }}>{title}</h2>
      {intro && (
        <p style={{ ...bodyFont, fontSize: 14, color: '#B8C1CC', lineHeight: 1.7, maxWidth: 720, margin: '12px 0 0' }}>
          {intro}
        </p>
      )}
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680, background: '#071426' }}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                style={{
                  ...headingFont,
                  textAlign: 'left',
                  padding: '13px 14px',
                  fontSize: 12,
                  letterSpacing: 1,
                  color: '#F5F5F5',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  background: '#0A0F1C',
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`${cell}-${cellIndex}`}
                  style={{
                    ...bodyFont,
                    padding: '12px 14px',
                    fontSize: 13,
                    color: cellIndex === 0 ? '#F5F5F5' : '#B8C1CC',
                    fontWeight: cellIndex === 0 ? 600 : 400,
                    lineHeight: 1.5,
                    borderBottom: rowIndex === rows.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RulesPage() {
  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60 }}>
        <section
          style={{
            background: 'linear-gradient(180deg, #071426 0%, #050505 100%)',
            borderBottom: '1px solid rgba(220,38,38,0.2)',
            padding: '64px 24px 56px',
            textAlign: 'center',
          }}
        >
          <div style={{ ...headingFont, fontSize: 11, letterSpacing: 5, color: '#DC2626', marginBottom: 12 }}>
            GREENLAND MINI 4WD CLUB
          </div>
          <h1 style={{ ...headingFont, fontWeight: 900, fontSize: 'clamp(46px, 10vw, 92px)', lineHeight: 0.9, margin: '0 0 20px' }}>
            RULES <span style={{ color: '#DC2626' }}>&amp; GUIDES</span>
          </h1>
          <p style={{ ...bodyFont, fontSize: 16, color: '#B8C1CC', maxWidth: 650, margin: '0 auto', lineHeight: 1.7 }}>
            The official Greenland club rulebook, inspection standard and class reference. Use the Guides library to build and tune with a clear understanding of what is legal.
          </p>
          <KnowledgeTabs active="rules" />
        </section>

        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '52px 24px 72px' }}>
          <section
            style={{
              background: 'linear-gradient(135deg, rgba(220,38,38,0.16), rgba(7,20,38,0.92))',
              border: '1px solid rgba(220,38,38,0.35)',
              borderRadius: 16,
              padding: '24px 26px',
              marginBottom: 56,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div>
                <div style={{ ...headingFont, fontSize: 12, letterSpacing: 3, color: '#FACC15' }}>CLUB RULEBOOK</div>
                <div style={{ ...headingFont, fontWeight: 900, fontSize: 30, marginTop: 4 }}>VERSION {RULEBOOK_VERSION.version}</div>
                <p style={{ ...bodyFont, color: '#B8C1CC', fontSize: 13, lineHeight: 1.6, margin: '6px 0 0', maxWidth: 650 }}>
                  Effective {RULEBOOK_VERSION.effectiveDate}. Reviewed against {RULEBOOK_VERSION.reviewedAgainst}. Greenland class rules apply at Greenland club events; the race director has final authority over unlisted configurations.
                </p>
              </div>
              <a
                href="/guides/start-here"
                style={{
                  ...headingFont,
                  background: '#DC2626',
                  color: '#FFFFFF',
                  borderRadius: 8,
                  padding: '11px 18px',
                  textDecoration: 'none',
                  fontWeight: 900,
                  letterSpacing: 1.5,
                  whiteSpace: 'nowrap',
                }}
              >
                NEW RACER START HERE →
              </a>
            </div>
          </section>

          <section style={{ marginBottom: 64 }}>
            <SectionTitle
              eyebrow="ALL CLASSES"
              title="GENERAL REGULATIONS"
              intro="These requirements apply before class-specific allowances. A class may be stricter, but it cannot waive safety, dimensions, four-wheel drive or motor integrity."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
              {GENERAL_RULES.map((rule) => (
                <article
                  key={rule.title}
                  style={{
                    background: '#071426',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12,
                    padding: '20px',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{rule.icon}</div>
                  <h3 style={{ ...headingFont, fontSize: 19, margin: '0 0 7px', letterSpacing: 0.5 }}>{rule.title}</h3>
                  <p style={{ ...bodyFont, fontSize: 13, color: '#B8C1CC', lineHeight: 1.65, margin: 0 }}>{rule.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: 64 }}>
            <SectionTitle eyebrow="MEASUREMENT" title="MACHINE LIMITS" />
            <DataTable headers={['Inspection item', 'Requirement']} rows={MACHINE_LIMITS} />
          </section>

          <section style={{ marginBottom: 64 }}>
            <SectionTitle
              eyebrow="RACING CATEGORIES"
              title="CHOOSE YOUR CLASS"
              intro="Open the detailed page before buying or modifying parts. The detailed class page controls when a summary and a class-specific rule appear to conflict."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
              {RULE_CLASSES.map((entry) => (
                <a
                  key={entry.slug}
                  href={`/rules/${entry.slug}`}
                  style={{
                    display: 'block',
                    background: '#071426',
                    border: `1px solid ${entry.color}55`,
                    borderRadius: 14,
                    overflow: 'hidden',
                    color: '#F5F5F5',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ height: 4, background: entry.color }} />
                  <div style={{ padding: 22 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 30 }}>{entry.icon}</span>
                      <span style={{ ...headingFont, fontSize: 11, letterSpacing: 2, color: entry.color }}>{entry.skillLevel.toUpperCase()}</span>
                    </div>
                    <h3 style={{ ...headingFont, fontSize: 28, margin: '12px 0 8px', color: entry.color }}>{entry.name}</h3>
                    <p style={{ ...bodyFont, fontSize: 13, color: '#B8C1CC', lineHeight: 1.65, minHeight: 64, margin: 0 }}>{entry.summary}</p>
                    <div style={{ ...headingFont, fontWeight: 800, letterSpacing: 1.5, fontSize: 13, marginTop: 18 }}>VIEW FULL RULES →</div>
                  </div>
                </a>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: 64 }}>
            <SectionTitle eyebrow="QUICK COMPARISON" title="CLASS MATRIX" />
            <DataTable headers={['Configuration', 'Box Stock', 'Open Box', 'B-Max', 'Open']} rows={CLASS_MATRIX} />
          </section>

          <section id="motor-matrix" style={{ marginBottom: 64, scrollMarginTop: 84 }}>
            <SectionTitle
              eyebrow="CLUB MOTOR LIST"
              title="MOTOR LEGALITY"
              intro="A checkmark means the motor is permitted only when it is genuine, unopened and compatible with the chassis. Event announcements may impose a lower motor limit."
            />
            <DataTable headers={['Motor group', 'Box Stock', 'Open Box', 'B-Max', 'Open', 'Notes']} rows={MOTOR_MATRIX} />
          </section>

          <section style={{ marginBottom: 64 }}>
            <SectionTitle
              eyebrow="RACE CONTROL"
              title="INSPECTION CHECKLIST"
              intro="Passing inspection is not permanent permission to alter the car. Any approved repair or setup change must be presented for reinspection."
            />
            <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '10px 24px' }}>
              {INSPECTION_CHECKLIST.map((item, index) => (
                <div
                  key={item}
                  style={{
                    display: 'flex',
                    gap: 14,
                    padding: '15px 0',
                    borderBottom: index === INSPECTION_CHECKLIST.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span style={{ ...headingFont, color: '#22C55E', fontWeight: 900, minWidth: 24 }}>{index + 1}</span>
                  <span style={{ ...bodyFont, fontSize: 14, color: '#B8C1CC', lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: 64 }}>
            <SectionTitle eyebrow="ENFORCEMENT" title="PENALTIES" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PENALTY_STEPS.map((step, index) => (
                <article
                  key={step.level}
                  style={{
                    background: '#071426',
                    border: `1px solid ${index < 2 ? 'rgba(250,204,21,0.25)' : 'rgba(220,38,38,0.28)'}`,
                    borderRadius: 12,
                    padding: '18px 20px',
                    display: 'flex',
                    gap: 16,
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      ...headingFont,
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: index < 2 ? '#FACC15' : '#DC2626',
                      color: index < 2 ? '#050505' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontWeight: 900,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <h3 style={{ ...headingFont, fontSize: 18, margin: '0 0 5px' }}>{step.level}</h3>
                    <p style={{ ...bodyFont, fontSize: 13, color: '#B8C1CC', lineHeight: 1.6, margin: 0 }}>{step.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: 56 }}>
            <SectionTitle
              eyebrow="SOURCE HIERARCHY"
              title="WHAT THESE RULES ARE BASED ON"
              intro="Official Tamiya regulations are the baseline. Greenland house rules define our local classes and battery availability. Third-party educational sites are used for topic organization, not copied as official authority."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {OFFICIAL_SOURCES.map((source) => (
                <a
                  key={source.href}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: '#071426',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: 18,
                    color: '#F5F5F5',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ ...headingFont, fontSize: 11, letterSpacing: 2, color: '#FACC15', marginBottom: 7 }}>{source.type.toUpperCase()}</div>
                  <div style={{ ...bodyFont, fontSize: 13, lineHeight: 1.55 }}>{source.label} ↗</div>
                </a>
              ))}
            </div>
          </section>

          <section
            style={{
              background: 'linear-gradient(135deg, #071426, #0A0F1C)',
              border: '1px solid rgba(59,130,246,0.28)',
              borderRadius: 16,
              padding: '34px 26px',
              textAlign: 'center',
            }}
          >
            <div style={{ ...headingFont, fontSize: 11, letterSpacing: 4, color: '#3B82F6' }}>BUILD SMARTER</div>
            <h2 style={{ ...headingFont, fontSize: 'clamp(30px, 6vw, 48px)', margin: '8px 0 10px' }}>CONTINUE TO THE GUIDE LIBRARY</h2>
            <p style={{ ...bodyFont, color: '#B8C1CC', fontSize: 14, lineHeight: 1.65, maxWidth: 620, margin: '0 auto 22px' }}>
              Learn motors, gearing, chassis, tires, rollers, brakes, maintenance and parts compatibility without confusing setup advice with race legality.
            </p>
            <a
              href="/guides"
              style={{
                ...headingFont,
                display: 'inline-block',
                background: '#3B82F6',
                color: '#FFFFFF',
                borderRadius: 8,
                padding: '12px 24px',
                textDecoration: 'none',
                fontWeight: 900,
                letterSpacing: 2,
              }}
            >
              OPEN BUILD GUIDES →
            </a>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
