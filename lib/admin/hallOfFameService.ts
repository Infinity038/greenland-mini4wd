import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Hall of Fame record check, run on the SERVER after a race result is saved.
 * Differences from the old browser-side lib/hallOfFame.ts (documented in docs/phase1/ROLE_REVIEW.md):
 *  - the candidate value is computed here from `race_results` rows, never taken from the request;
 *  - the member name comes from the members table, never from the request;
 *  - the old side effects `members.points_rate = 8.0` and the partial `loyalty_points` upsert are REMOVED. Rewards are
 *    fixed (one point per 100 DKK) and Hall of Fame is a prestige title only, as the admin Hall of Fame page already states.
 */
export const HOF_CATEGORIES = ['fastest_lap', 'most_wins', 'most_points', 'most_races'] as const;
export type HofCategory = (typeof HOF_CATEGORIES)[number];
export class HofError extends Error { constructor(public status: 400 | 404 | 500, message: string) { super(message); } }

export async function checkRecord(client: SupabaseClient, category: HofCategory, memberId: string): Promise<{ broke_record: boolean; category: string }> {
  const { data: m } = await client.from('members').select('id,name,first_name,last_name').eq('id', memberId).maybeSingle();
  if (!m) throw new HofError(404, 'member not found');
  const memberName = (m as any).name || `${(m as any).first_name || ''} ${(m as any).last_name || ''}`.trim() || 'Racer';

  let value = 0, label = '', lowerIsBetter = false;
  if (category === 'fastest_lap') {
    const { data } = await client.from('race_results').select('lap_time_seconds').eq('member_id', memberId).gt('lap_time_seconds', 0).order('lap_time_seconds', { ascending: true }).limit(1);
    value = Number(data?.[0]?.lap_time_seconds) || 0; label = `${value}s`; lowerIsBetter = true;
  } else if (category === 'most_races') {
    const { count } = await client.from('race_results').select('id', { count: 'exact', head: true }).eq('member_id', memberId);
    value = count || 0; label = `${value} races`;
  } else {
    const col = category === 'most_wins' ? 'wins' : 'points_earned';
    const { data } = await client.from('race_results').select(col).eq('member_id', memberId);
    value = (data || []).reduce((sum: number, r: any) => sum + (Number(r[col]) || 0), 0);
    label = category === 'most_wins' ? `${value} wins` : `${value} pts`;
  }
  if (!(value > 0)) return { broke_record: false, category };

  const { data: current } = await client.from('hall_of_fame').select('*').eq('category', category).maybeSingle();
  if (!current) return { broke_record: false, category };
  const isUnset = current.member_name === 'TBD' || current.member_name == null;
  const beats = isUnset ? true : lowerIsBetter ? value < Number(current.record_value) : value > Number(current.record_value);
  if (!beats) return { broke_record: false, category };
  const isSelf = current.member_id === memberId;
  const now = new Date().toISOString();

  if (!isUnset && !isSelf) {
    const { error } = await client.from('hall_of_fame_history').insert({
      category, member_name: current.member_name, record_value: current.record_value, record_label: current.record_label,
      held_from: current.achieved_at, held_until: now,
    });
    if (error) throw new HofError(500, 'history write failed');
  }
  // Compare-and-set on the previous holder/value so two simultaneous results cannot both overwrite the same record.
  const { data: upd, error: ue } = await client.from('hall_of_fame').update({
    member_id: memberId, member_name: memberName, record_value: value, record_label: label,
    achieved_at: isSelf ? current.achieved_at : now,
    previous_record_value: isSelf ? current.previous_record_value : current.record_value,
    previous_holder_name: isSelf ? current.previous_holder_name : (isUnset ? null : current.member_name),
    previous_achieved_at: isSelf ? current.previous_achieved_at : current.achieved_at,
  }).eq('id', current.id).eq('record_value', current.record_value).select('id');
  if (ue) throw new HofError(500, 'record write failed');
  if (!upd?.length) return { broke_record: false, category };  // lost the race to a newer record; nothing to crown
  if (!isSelf) await client.from('members').update({ loyalty_tier: 'hall_of_fame' }).eq('id', memberId);
  return { broke_record: true, category };
}
