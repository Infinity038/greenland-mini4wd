import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
export const metadata = { title: 'Filming & CCTV Notice | Greenland Mini 4WD Club', description: 'How event media recording differs from security CCTV at Greenland Mini 4WD Club.' };
const font = { fontFamily: "'DM Sans', sans-serif", color:'#B8C1CC', lineHeight:1.8 } as const;
const heading = { fontFamily: "'Barlow Condensed', sans-serif", color:'#F5F5F5', fontWeight:900 } as const;
export default function FilmingPolicyPage() {
 return <><Navbar/><main style={{background:'#050505',minHeight:'100vh',padding:'110px 20px 80px'}}><div style={{maxWidth:850,margin:'0 auto'}}>
   <p style={{...heading,color:'#DC2626',letterSpacing:4,fontSize:12}}>VISITOR INFORMATION</p><h1 style={{...heading,fontSize:'clamp(36px,6vw,62px)',margin:'12px 0 20px'}}>FILMING & SECURITY CAMERAS</h1>
   <section style={{background:'#071426',border:'1px solid #334155',padding:22,borderRadius:14,marginBottom:18}}>
   <h2 style={{...heading,fontSize:28}}>Event photos, streams and promotional video</h2>
   <p style={font}>Some announced race events may have cameras aimed at a clearly marked racing/filming area for event coverage and promotional highlights on Facebook, Instagram, TikTok and YouTube. The filming area and active recording periods will be signposted before recording starts. A separate non-filmed waiting route or area will be offered where the physical venue permits. Please speak to the organiser before entering a marked filming area if you prefer not to appear.</p>
   <p style={font}>We will seek appropriate permission before using identifiable close-ups, interviews, featured racer portraits or a child's image in promotional material. Parent/guardian permission is required where applicable. An entrance sign alone is not blanket permission for publishing identifiable footage. Do not assume attendance or free account registration is consent to promotional publication.</p>
   <p style={font}>Staff should make practical efforts to avoid or crop people who do not wish to appear. Live coverage cannot always be edited after transmission, so the camera angle and designated area must be organised before going live. Public racer profile photos remain optional and separate from event-video permissions.</p>
   </section>
   <section style={{background:'#071426',border:'1px solid #334155',padding:22,borderRadius:14,marginBottom:18}}>
   <h2 style={{...heading,fontSize:28}}>Security CCTV is separate</h2>
   <p style={font}>Any installed CCTV is intended for premises security, protection of visitors, staff and inventory, and incident investigation—not social media, entertainment content or routine employee performance monitoring. It will have its own entrance notice identifying the responsible operating business, purpose, contact method, coverage and actual retention period. Access is restricted to authorised personnel. No CCTV footage is used in race highlights.</p>
   <p style={font}>Security recording still processes personal information and requires a lawful basis, appropriate transparency, access controls and retention limits. CCTV should not record private toilet areas or capture unrelated neighbouring property. Routine CCTV audio recording is not planned.</p>
   </section>
   <section style={{background:'#071426',border:'1px solid #334155',padding:22,borderRadius:14}}>
   <h2 style={{...heading,fontSize:28}}>Questions or objection</h2>
   <p style={font}>Speak with the event organiser or duty manager before a race is filmed, or raise a concern about an already published image. Requests will be assessed under applicable Greenland personal-data rules. The specific privacy contact and retention period will be posted at the premises once the operating entity and CCTV setup are finalised.</p>
   <p style={{...font,fontSize:12}}>For general guidance: <a href="https://da.datatilsynet.gl/regler-og-vejledning/tv-overvaagning" style={{color:'#FACC15'}}>Datatilsynet — CCTV in Greenland</a>.</p>
   </section></div></main><Footer/></>;
}
