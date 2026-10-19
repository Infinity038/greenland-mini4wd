'use client';

import { useMemo, useState } from 'react';
import { calculateStandings, createMarbles, generateRegularSeason, type Marble } from '@/lib/mcl/league';
import styles from './MCLDashboard.module.css';

const roster = createMarbles();
const schedule = generateRegularSeason(roster);
// Only sample results for the non-transactional preview; no official or live data.
const exampleResults = schedule.filter(r => r.matchday <= 3).map(r => {
  const shift = (r.matchday + Number(r.id.slice(-2))) % 6;
  return { raceId: r.id, order: [...r.lineup.slice(shift), ...r.lineup.slice(0, shift)] };
});
const sampleStandings = calculateStandings(roster, schedule, exampleResults);
type Tab = 'overview' | 'champion' | 'races' | 'standings';
const formatPht = (utc: string) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date(utc)) + ' PHT';
function MarbleDot({ marble, size = 27 }: { marble: Marble; size?: number }) {
  return <span aria-hidden="true" className={styles.marble} style={{background: marble.hex, width:size, height:size}} />;
}
function Header() {
  return <header className={styles.banner}>
    <div className={styles.kicker}>PRIVATE PREDICTION PIT · MARBLE CHAMPIONSHIP LEAGUE</div>
    <h1>MARBLE <span>CHAMPIONSHIP</span></h1>
    <p>24 contenders · six per race · ten matchdays · top twelve playoffs · one champion</p>
    <div className={styles.previewFlag}>DESIGN PREVIEW ONLY — NO LIVE COINS, BETS OR RESULTS</div>
  </header>;
}
export default function MCLDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedRace, setSelectedRace] = useState(0);
  const [selectedPick, setSelectedPick] = useState<string | null>(null);
  const race = schedule[selectedRace];
  const raceMarbles = useMemo(() => race.lineup.map(id => roster.find(m => m.id === id)!), [race]);
  const tabs: {id:Tab; name:string}[] = [
    {id:'overview',name:'Home'}, {id:'champion',name:'Champion'}, {id:'races',name:'Races'}, {id:'standings',name:'Standings'},
  ];
  return <div className={styles.root}>
    <Header />
    <nav className={styles.tabs} aria-label="Marble championship preview">
      {tabs.map(t => <button key={t.id} type="button" className={tab===t.id?styles.active:''} onClick={()=>setTab(t.id)} aria-current={tab===t.id?'page':undefined}>{t.name}</button>)}
    </nav>
    {tab === 'overview' && <div className={styles.stack}>
      <section className={styles.stats}>
        {[['24','Competitors'],['6','Per race'],['10','Matchdays'],['43','Season races']].map(([a,b])=><div className={styles.stat} key={b}><strong>{a}</strong><span>{b}</span></div>)}
      </section>
      <section className={styles.card}>
        <div className={styles.sectionHeading}><h2>Season 01</h2><span className={styles.pill}>Planned</span></div>
        <p>Each marble races once per matchday, collecting 6, 5, 4, 3, 2 or 1 point by finishing position. The top twelve qualify for two playoff races; the top three from each race reach the six-marble final.</p>
        <div className={styles.progression}><span>24 regular season</span><b>→</b><span>Top 12</span><b>→</b><span>Final 6</span><b>→</b><span>Champion</span></div>
        <button className={styles.primary} onClick={()=>setTab('races')}>View scheduled races →</button>
      </section>
      <section className={styles.markets}>
        <button onClick={()=>setTab('champion')}><span>🏆 Season Champion</span><strong>Up to x8</strong><small>Preseason-only entries · final funded return may be lower</small></button>
        <button onClick={()=>setTab('races')}><span>🏁 Race Winner</span><strong>Up to x2</strong><small>Six competitors in every race</small></button>
        <button onClick={()=>setTab('races')}><span>🎯 Exact Position</span><strong>Up to x3</strong><small>Predict a numbered marble's exact place</small></button>
      </section>
    </div>}
    {tab === 'champion' && <div className={styles.stack}>
      <section className={styles.card}>
        <div className={styles.sectionHeading}><h2>Season Champion</h2><span className={styles.gold}>UP TO x8</span></div>
        <p>Choose any number of different marbles before the first race. Accepted selections and entry weights will be private to your own account. There is no cash or real-world value.</p>
        <p className={styles.notice}>Market not live. No starting wallet, ticket or multiplier is invented here. Quotes must come from the authenticated, funded server-side market once released.</p>
        <div className={styles.roster}>{roster.map(m=><div key={m.id} className={styles.rosterItem}><MarbleDot marble={m} /><strong>{m.id}</strong><small>{m.colorName}</small><span className={styles.noQuote}>—</span></div>)}</div>
      </section>
      <section className={styles.card}><h2>My Champion Tickets</h2><p>No virtual wallet or prediction data is connected to this preview. Future tickets will show your contribution, private entry weight, projected final return and separately funded cash-out offer. Other players' tickets and prize-pool totals remain private.</p></section>
    </div>}
    {tab === 'races' && <div className={styles.stack}>
      <section className={styles.card}>
        <div className={styles.sectionHeading}><h2>Race schedule</h2><span className={styles.pill}>Example schedule</span></div>
        <label className={styles.label} htmlFor="mcl-race">Choose matchday and race</label>
        <select id="mcl-race" className={styles.select} value={selectedRace} onChange={e=>{setSelectedRace(Number(e.target.value));setSelectedPick(null);}}>
          {schedule.map((r,i)=><option key={r.id} value={i}>Matchday {r.matchday} · Race {String.fromCharCode(65+i%4)} · {formatPht(r.scheduledAt)}</option>)}
        </select>
        <div className={styles.raceInfo}><span>⏱ {formatPht(race.scheduledAt)}</span><span className={styles.pill}>Automatic lock at start</span></div>
        <h3>Starting lineup</h3>
        <div className={styles.lineup}>{raceMarbles.map(m=><button type="button" key={m.id} className={selectedPick===m.id?styles.selected:styles.pick} onClick={()=>setSelectedPick(m.id)} aria-pressed={selectedPick===m.id}><MarbleDot marble={m} size={34}/><strong>{m.id}</strong><small>Lane {race.lanes[m.id]}</small></button>)}</div>
        <div className={styles.marketRows}>
          <div><strong>🏁 Winner prediction</strong><span>Up to x2</span></div>
          <div><strong>🎯 Exact finishing position</strong><span>Up to x3</span></div>
        </div>
        <p className={styles.notice}>{selectedPick ? `${selectedPick} selected for preview only. ` : ''}Selections cannot be submitted or funded yet. Market odds, lock state, livestream URL and confirmed results must be served by an authorized backend.</p>
      </section>
      <section className={styles.card}><h2>Race points</h2><div className={styles.points}>{[6,5,4,3,2,1].map((v,i)=><div key={v}><strong>{i+1}{['st','nd','rd'][i]||'th'}</strong><span>+{v} pts</span></div>)}</div></section>
    </div>}
    {tab === 'standings' && <div className={styles.stack}>
      <section className={styles.card}>
        <div className={styles.sectionHeading}><h2>Sample standings</h2><span className={styles.pill}>Demo results, MD 3/10</span></div>
        <p>Illustrative results only, generated for interface review. Actual league scores will come solely from host-confirmed physical race results.</p>
        <div className={styles.tableWrap}><table><thead><tr><th>Rank</th><th>Marble</th><th>Races</th><th>Pts</th></tr></thead><tbody>{sampleStandings.map((row,i)=>{const marble=roster.find(m=>m.id===row.id)!;return <tr key={row.id}><td>{i+1}{i<12?' · Q':''}</td><td><span className={styles.tableName}><MarbleDot marble={marble} size={17}/>{row.id}</span></td><td>{row.races}</td><td><strong>{row.points}</strong></td></tr>})}</tbody></table></div>
        <p className={styles.notice}>Q marks the current illustrative top twelve, not confirmed qualifiers. Qualification locks only when the regular season is complete and ties are resolved.</p>
      </section>
    </div>}
    <footer className={styles.footer}>Private 4W entertainment concept. No purchasing, withdrawal of real money, cash prizes or official Mini4WD record changes.</footer>
  </div>;
}
