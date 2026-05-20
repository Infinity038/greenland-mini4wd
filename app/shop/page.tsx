'use client';

import { useState, useEffect, useRef } from 'react';
import { getMemberData, isRegistered, generatePaymentRef } from '@/lib/member';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const PRODUCTS = [
  {
    id: 'ar-boxed',
    name: 'Tamiya AR Chassis Kit',
    chassis: 'AR',
    type: 'boxed',
    price_dkk: 280,
    description: 'Build-your-own AR chassis. Great beginner kit with wide compatibility.',
    badge: 'POPULAR',
    badgeColor: '#22C55E',
  },
  {
    id: 'ma-boxed',
    name: 'Tamiya MA Chassis Kit',
    chassis: 'MA',
    type: 'boxed',
    price_dkk: 290,
    description: 'Mid-range all-rounder. Ideal for technical tracks.',
    badge: null,
    badgeColor: null,
  },
  {
    id: 'vs-boxed',
    name: 'Tamiya VS Chassis Kit',
    chassis: 'VS',
    type: 'boxed',
    price_dkk: 295,
    description: 'Vertical layout for low center of gravity and speed.',
    badge: null,
    badgeColor: null,
  },
  {
    id: 'ar-built',
    name: 'AR Race-Ready (Built)',
    chassis: 'AR',
    type: 'built',
    price_dkk: 450,
    description: 'Assembled, tuned, and tested. Race the same day you pick it up.',
    badge: 'READY TO RACE',
    badgeColor: '#DC2626',
  },
  {
    id: 'ms-boxed',
    name: 'Tamiya MS Chassis Kit',
    chassis: 'MS',
    type: 'boxed',
    price_dkk: 310,
    description: 'Mid-ship layout for balance and acceleration.',
    badge: 'PREORDER',
    badgeColor: '#FACC15',
  },
  {
    id: 'fma-boxed',
    name: 'Tamiya FM-A Chassis Kit',
    chassis: 'FM-A',
    type: 'boxed',
    price_dkk: 300,
    description: 'Front motor for unique handling. Great for experienced builders.',
    badge: 'PREORDER',
    badgeColor: '#FACC15',
  },
];

type ModalStep = 'confirm' | 'payment' | 'upload' | 'done';

export default function ShopPage() {
  const [member, setMember] = useState<any>(null);
  const [selected, setSelected] = useState<typeof PRODUCTS[0] | null>(null);
  const [step, setStep] = useState<ModalStep>('confirm');
  const [orderId, setOrderId] = useState('');
  const [payRef, setPayRef] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMember(getMemberData());
  }, []);

  const openModal = (product: typeof PRODUCTS[0]) => {
    if (!isRegistered()) {
      window.location.href = '/register';
      return;
    }
    setSelected(product);
    setStep('confirm');
    setOrderId('');
    setPayRef('');
    setProofFile(null);
    setProofPreview(null);
    setError('');
  };

  const placeOrder = async () => {
    if (!selected || !member) return;
    setUploading(true);
    setError('');
    try {
      const { data, error: err } = await supabase.from('orders').insert({
        member_email: member.email,
        member_name: member.name,
        product_name: selected.name,
        chassis: selected.chassis,
        type: selected.type,
        status: 'pending',
        payment_status: 'awaiting_payment',
        notes: `Price: ${selected.price_dkk} DKK`,
      }).select().single();

      if (err || !data) throw new Error('Order failed');

      const ref = generatePaymentRef(data.id);
      await supabase.from('orders').update({ payment_reference: ref }).eq('id', data.id);

      setOrderId(data.id);
      setPayRef(ref);
      setStep('payment');
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadProof = async () => {
    if (!proofFile || !orderId) return;
    setUploading(true);
    setError('');
    try {
      // Convert to base64 and store in payment_proofs table as data URL
      // (No Supabase Storage bucket needed for MVP)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await supabase.from('payment_proofs').insert({
          order_id: orderId,
          member_email: member.email,
          proof_url: base64,
          status: 'pending',
        });
        await supabase.from('orders').update({ payment_status: 'proof_uploaded' }).eq('id', orderId);
        setStep('done');
        setUploading(false);
      };
      reader.readAsDataURL(proofFile);
    } catch {
      setError('Upload failed. Try again.');
      setUploading(false);
    }
  };

  const closeModal = () => setSelected(null);

  return (
    <div className="min-h-screen bg-[#050505]">
      <Navbar />

      <div className="pt-24 pb-16 px-4 max-w-6xl mx-auto">
        <div className="mb-10">
          <div className="text-[#DC2626] font-barlow font-black text-sm uppercase tracking-widest mb-2">Shop</div>
          <h1 className="text-4xl font-barlow font-black text-white uppercase leading-tight">
            Mini 4WD Cars & Kits
          </h1>
          <p className="text-[#B8C1CC] mt-2 max-w-xl">
            Preorder only — no online payment. Pay via MobilePay after reserving. Pickup in Nuuk.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRODUCTS.map(p => (
            <div
              key={p.id}
              className="bg-[#071426] border border-white/10 rounded-2xl p-5 flex flex-col relative overflow-hidden hover:border-white/20 transition-colors"
            >
              {p.badge && (
                <div
                  className="absolute top-0 right-0 px-3 py-1 text-xs font-barlow font-black uppercase tracking-wider rounded-bl-xl"
                  style={{ backgroundColor: p.badgeColor + '22', color: p.badgeColor, borderLeft: `2px solid ${p.badgeColor}`, borderBottom: `2px solid ${p.badgeColor}` }}
                >
                  {p.badge}
                </div>
              )}
              {/* Chassis icon area */}
              <div className="h-24 bg-[#050505] rounded-xl mb-4 flex items-center justify-center border border-white/5">
                <span className="text-5xl font-barlow font-black text-white/10">{p.chassis}</span>
              </div>
              <div className="text-xs text-[#B8C1CC] uppercase tracking-wider mb-1">{p.type === 'built' ? '⚡ Built & Ready' : '🔧 Build Yourself'}</div>
              <h3 className="font-barlow font-black text-white text-xl mb-2">{p.name}</h3>
              <p className="text-[#B8C1CC] text-sm flex-1">{p.description}</p>
              <div className="flex items-center justify-between mt-5">
                <span className="text-[#FACC15] font-barlow font-black text-2xl">{p.price_dkk} kr</span>
                <button
                  onClick={() => openModal(p)}
                  className="bg-[#DC2626] hover:bg-red-700 text-white font-barlow font-bold uppercase tracking-wider text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  Reserve
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-[#071426] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-barlow font-black text-white text-xl uppercase">
                {step === 'confirm' && 'Confirm Order'}
                {step === 'payment' && 'Pay via MobilePay'}
                {step === 'upload' && 'Upload Payment Proof'}
                {step === 'done' && 'Order Placed! 🎉'}
              </h2>
              <button onClick={closeModal} className="text-[#B8C1CC] hover:text-white text-xl">✕</button>
            </div>

            <div className="p-5">
              {/* STEP: Confirm */}
              {step === 'confirm' && (
                <div className="space-y-4">
                  <div className="bg-[#050505] rounded-xl p-4 border border-white/10">
                    <div className="font-barlow font-black text-white text-lg">{selected.name}</div>
                    <div className="text-sm text-[#B8C1CC] mt-1">{selected.description}</div>
                    <div className="text-[#FACC15] font-barlow font-black text-2xl mt-3">{selected.price_dkk} DKK</div>
                  </div>
                  <div className="bg-[#050505] rounded-xl p-4 border border-white/10 text-sm text-[#B8C1CC] space-y-1">
                    <div>👤 <span className="text-white">{member?.name}</span></div>
                    <div>📧 <span className="text-white">{member?.email}</span></div>
                    <div>📍 Pickup: Nuuk, Greenland</div>
                    <div>💳 Payment: MobilePay (after reservation)</div>
                  </div>
                  {error && <div className="text-red-400 text-sm">{error}</div>}
                  <button
                    onClick={placeOrder}
                    disabled={uploading}
                    className="w-full bg-[#DC2626] hover:bg-red-700 disabled:opacity-50 text-white font-barlow font-black uppercase tracking-wider py-3 rounded-xl transition-colors"
                  >
                    {uploading ? 'Placing Order...' : 'Reserve Now →'}
                  </button>
                </div>
              )}

              {/* STEP: Payment */}
              {step === 'payment' && (
                <div className="space-y-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <div className="text-yellow-400 font-barlow font-black text-lg mb-2">💳 MobilePay Instructions</div>
                    <ol className="text-sm text-yellow-200 space-y-2 list-decimal list-inside">
                      <li>Open MobilePay on your phone</li>
                      <li>Send <strong>{selected.price_dkk} DKK</strong> to <strong>+299 XXXX XXXX</strong></li>
                      <li>Use this reference in the message: <strong className="text-yellow-400 font-mono">{payRef}</strong></li>
                      <li>Take a screenshot of the confirmation</li>
                      <li>Upload the screenshot below</li>
                    </ol>
                  </div>
                  <div className="bg-[#050505] rounded-xl p-3 border border-white/10 text-center">
                    <div className="text-xs text-[#B8C1CC]">Order Reference</div>
                    <div className="text-[#FACC15] font-mono font-black text-xl tracking-widest">{payRef}</div>
                  </div>
                  <button
                    onClick={() => setStep('upload')}
                    className="w-full bg-[#DC2626] hover:bg-red-700 text-white font-barlow font-black uppercase tracking-wider py-3 rounded-xl transition-colors"
                  >
                    I've Paid — Upload Proof →
                  </button>
                  <button onClick={closeModal} className="w-full text-[#B8C1CC] text-sm text-center hover:text-white">
                    I'll pay later (order is saved)
                  </button>
                </div>
              )}

              {/* STEP: Upload */}
              {step === 'upload' && (
                <div className="space-y-4">
                  <p className="text-[#B8C1CC] text-sm">Upload your MobilePay payment screenshot. Admin will verify and confirm your order.</p>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-[#DC2626]/50 transition-colors"
                  >
                    {proofPreview ? (
                      <img src={proofPreview} alt="proof" className="max-h-40 mx-auto rounded-lg" />
                    ) : (
                      <>
                        <div className="text-4xl mb-2">📷</div>
                        <div className="text-white font-barlow font-bold">Tap to select screenshot</div>
                        <div className="text-[#B8C1CC] text-xs mt-1">JPG, PNG, or HEIC</div>
                      </>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  {error && <div className="text-red-400 text-sm">{error}</div>}
                  <button
                    onClick={uploadProof}
                    disabled={!proofFile || uploading}
                    className="w-full bg-[#DC2626] hover:bg-red-700 disabled:opacity-40 text-white font-barlow font-black uppercase tracking-wider py-3 rounded-xl transition-colors"
                  >
                    {uploading ? 'Uploading...' : 'Submit Proof →'}
                  </button>
                </div>
              )}

              {/* STEP: Done */}
              {step === 'done' && (
                <div className="text-center space-y-4 py-4">
                  <div className="text-5xl">🏁</div>
                  <h3 className="font-barlow font-black text-white text-2xl uppercase">Proof Submitted!</h3>
                  <p className="text-[#B8C1CC] text-sm">Admin will verify your payment and confirm your order. Check your order status in your profile.</p>
                  <div className="bg-[#050505] rounded-xl p-3 border border-white/10">
                    <div className="text-xs text-[#B8C1CC]">Reference</div>
                    <div className="text-[#FACC15] font-mono font-black">{payRef}</div>
                  </div>
                  <a
                    href="/profile"
                    className="block w-full bg-[#DC2626] hover:bg-red-700 text-white font-barlaw font-black uppercase tracking-wider py-3 rounded-xl transition-colors"
                  >
                    View My Orders →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}