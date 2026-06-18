'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

const FALLBACK = [
  { id:1, tag:'NEWS',  date:'May 10, 2026', title:'Club Membership Now Open for 2026 Season', excerpt:"We're officially opening registration for our growing Nuuk community. First 50 members get a free starter kit and club sticker.", emoji:'📢' },
  { id:2, tag:'GUIDE', date:'May 3, 2026',  title:"Choosing Your First Mini 4WD: A Beginner's Guide", excerpt:"Not sure where to start? We break down the best entry-level Tamiya kits for new racers joining us here in Greenland.", emoji:'🔧' },
];

const TAG_COLORS: Record<string,string> = { NEWS:'#DC2626', GUIDE:'#3B82F6', RACE:'#22C55E', UPDATE:'#FACC15' };

export default function Blog() {
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('news_posts').select('*').eq('published', true).order('created_at', { ascending: false }).limit(2)
      .then(({ data }: { data: any[] | null }) => setPosts(data && data.length > 0 ? data : FALLBACK));
  }, []);

  return (
    <section id="blog" style={{ background: '#071426', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '80px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 48 }}>
          <div>
            <p style={{ ...F, fontSize:12, fontWeight:600, color:'#DC2626', letterSpacing:'0.3em', marginBottom:8 }}>LATEST</p>
            <h2 style={{ ...F, fontWeight:900, color:'#F5F5F5', lineHeight:1, margin:0, fontSize:'clamp(38px,6vw,58px)' }}>NEWS &amp;<br />UPDATES</h2>
          </div>
          <a href="/blog" style={{ ...F, fontWeight:700, fontSize:14, color:'#DC2626', letterSpacing:'0.2em', textDecoration:'none' }}>ALL POSTS →</a>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20 }}>
          {posts.map((post, i) => {
            const tagColor = TAG_COLORS[post.tag] || '#FACC15';
            const gradients = ['linear-gradient(135deg,#3b0000,#1a0000)','linear-gradient(135deg,#001a3b,#00082b)'];
            return (
              <article key={post.id} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden', cursor:'pointer' }}>
                {post.image_url ? (
                  <img src={post.image_url} alt={post.title} style={{ width:'100%', height:160, objectFit:'cover' }} />
                ) : (
                  <div style={{ height:160, background: gradients[i%2], display:'flex', alignItems:'center', justifyContent:'center', fontSize:48 }}>
                    {post.emoji || '📰'}
                  </div>
                )}
                <div style={{ padding:24 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                    <span style={{ ...F, fontSize:10, fontWeight:700, letterSpacing:'0.2em', color:tagColor, background:tagColor+'18', padding:'2px 10px', borderRadius:20 }}>{post.tag}</span>
                    <span style={{ ...FB, fontSize:12, color:'#6B7280' }}>{post.date || (post.created_at && new Date(post.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}))}</span>
                  </div>
                  <h3 style={{ ...F, fontWeight:700, fontSize:22, color:'#F5F5F5', lineHeight:1.2, marginBottom:12 }}>{post.title}</h3>
                  <p style={{ ...FB, fontSize:14, color:'#B8C1CC', lineHeight:1.6, marginBottom:16 }}>{post.excerpt || post.content?.slice(0,120)+'...'}</p>
                  <a href="/blog" style={{ ...F, fontSize:12, fontWeight:700, color:'#DC2626', letterSpacing:'0.2em', textDecoration:'none' }}>READ MORE →</a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}