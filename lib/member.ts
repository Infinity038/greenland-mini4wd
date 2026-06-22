import { supabase } from './supabase';

export type MemberStatus = 'guest' | 'registered' | 'official';
export type MemberRank = 'Rookie' | 'Builder' | 'Racer' | 'Tuner' | 'Contender' | 'Champion' | 'Legend';

export interface Member {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  nationality?: string;
  city?: string;
  password_hash?: string;
  experience?: string;
  favorite_chassis?: string;
  member_status?: MemberStatus;
  referral_code?: string;
  referred_by?: string;
  rank?: MemberRank;
  total_points?: number;
  created_at?: string;
}

export interface TicketWallet {
  paid_total: number;
  paid_used: number;
  paid_available: number;
  bonus_available: number;
  loyalty_progress: number;
  loyalty_needed: number;
}

export interface ReferralStats {
  referral_code: string;
  referral_link: string;
  confirmed_referrals: number;
  pending_referrals: number;
  bonus_tickets_earned: number;
}

// ─── Session ─────────────────────────────────────────────────
export function isRegistered(): boolean {
  if (typeof window === 'undefined') return false;
  const hasCookie = document.cookie.includes('gm4wd_registered=1');
  const hasMember = !!localStorage.getItem('gm4wd_member');
  return hasCookie || hasMember;
}

export function getMemberData(): Member | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('gm4wd_member');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveMemberData(member: Member): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('gm4wd_member', JSON.stringify(member));
}

export function logout(): void {
  if (typeof window === 'undefined') return;
  document.cookie = 'gm4wd_registered=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  localStorage.removeItem('gm4wd_member');
  window.location.href = '/register';
}

// ─── Supabase fetches ────────────────────────────────────────
export async function getMemberDataFromSupabase(email: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('email', email)
    .single();
  if (error || !data) return null;
  return data as Member;
}

export async function getMemberOrdersFromSupabase(email: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('member_email', email)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// ─── Ticket wallet ───────────────────────────────────────────
// Table: race_tickets
// ticket_type: 'weekly' | 'weekly_earlybird' | 'season' | 'bonus'
// payment_status: 'awaiting_payment' | 'proof_uploaded' | 'payment_confirmed' | 'cancelled'
// quantity field stores how many tickets per order row — must SUM not COUNT rows
export async function getTicketWallet(email: string): Promise<TicketWallet> {
  const { data: tickets } = await supabase
    .from('race_tickets')
    .select('*')
    .eq('member_email', email);

  const all: any[] = tickets || [];

  // Confirmed paid ticket rows (weekly + earlybird + season, payment confirmed)
  const confirmedRows = all.filter((t: any) =>
    (t.ticket_type === 'weekly' || t.ticket_type === 'weekly_earlybird' || t.ticket_type === 'season') &&
    t.payment_status === 'payment_confirmed'
  );

  // Sum quantity field — each row may represent multiple tickets
  const paidTotal = confirmedRows.reduce((sum: number, t: any) => sum + (Number(t.quantity) || 1), 0);

  // Used = rows marked used, sum their quantities
  const paidUsed = confirmedRows
    .filter((t: any) => t.used === true || t.status === 'used')
    .reduce((sum: number, t: any) => sum + (Number(t.quantity) || 1), 0);

  // Also deduct tickets consumed by race entries
  const { data: raceEntries } = await supabase
    .from('race_entries')
    .select('id')
    .eq('member_email', email);
  const entriesUsed: number = (raceEntries || []).length;
  const paidAvailable = Math.max(0, paidTotal - paidUsed - entriesUsed);

  // Bonus tickets
  const bonusAvailable = all
    .filter((t: any) => t.ticket_type === 'bonus' && t.payment_status !== 'cancelled')
    .reduce((sum: number, t: any) => sum + (Number(t.quantity) || 1), 0);

  // Loyalty punch card: every 10 confirmed paid tickets = 1 free
  const loyaltyProgress = paidTotal % 10;

  return {
    paid_total: paidTotal,
    paid_used: paidUsed,
    paid_available: paidAvailable,
    bonus_available: bonusAvailable,
    loyalty_progress: loyaltyProgress,
    loyalty_needed: 10 - loyaltyProgress,
  };
}

// ─── Referral stats ──────────────────────────────────────────
export async function getReferralStats(member: Member): Promise<ReferralStats> {
  const code = member.referral_code || '';
  const link = typeof window !== 'undefined'
    ? `${window.location.origin}/register?ref=${code}`
    : `https://greenland-mini4wd.vercel.app/register?ref=${code}`;

  const { data: referrals } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_email', member.email);

  const all: any[] = referrals || [];
  const confirmed: number = all.filter((r: any) => r.status === 'rewarded' || r.status === 'qualified').length;
  const pending: number = all.filter((r: any) => r.status === 'pending').length;
  const bonusEarned: number = all.filter((r: any) => r.reward_given).length;

  return {
    referral_code: code,
    referral_link: link,
    confirmed_referrals: confirmed,
    pending_referrals: pending,
    bonus_tickets_earned: bonusEarned,
  };
}

// ─── Order helpers ───────────────────────────────────────────
export function generatePaymentRef(orderId: string): string {
  return `GM4WD-${orderId.slice(0, 8).toUpperCase()}`;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  awaiting_payment: 'Awaiting MobilePay Payment',
  proof_uploaded: 'Proof Uploaded',
  payment_confirmed: 'Payment Confirmed',
  rejected: 'Proof Rejected',
  pending: 'Pending',
  reserved: 'Reserved',
  awaiting_stock: 'Awaiting Stock',
  in_transit: 'In Transit',
  ready_for_pickup: 'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  awaiting_payment: '#FACC15',
  proof_uploaded: '#3B82F6',
  payment_confirmed: '#22C55E',
  rejected: '#DC2626',
  pending: '#FACC15',
  reserved: '#22C55E',
  awaiting_stock: '#F97316',
  in_transit: '#3B82F6',
  ready_for_pickup: '#10B981',
  completed: '#6B7280',
  cancelled: '#DC2626',
};

// ─── Rank system ─────────────────────────────────────────────
export function getRankFromPoints(points: number): MemberRank {
  if (points >= 1500) return 'Legend';
  if (points >= 750) return 'Champion';
  if (points >= 300) return 'Contender';
  if (points >= 150) return 'Tuner';
  if (points >= 60) return 'Racer';
  if (points >= 15) return 'Builder';
  return 'Rookie';
}

export const RANK_COLORS: Record<MemberRank, string> = {
  Rookie: '#6B7280',
  Builder: '#3B82F6',
  Racer: '#22C55E',
  Tuner: '#F97316',
  Contender: '#A855F7',
  Champion: '#FACC15',
  Legend: '#DC2626',
};

export const RANK_NEXT_POINTS: Record<MemberRank, number> = {
  Rookie: 15,
  Builder: 60,
  Racer: 150,
  Tuner: 300,
  Contender: 750,
  Champion: 1500,
  Legend: Infinity,
};