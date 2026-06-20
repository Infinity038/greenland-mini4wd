import { supabase } from './supabase';

interface HofCheckResult {
  broke_record: boolean;
  category: string;
}

// Call this any time a stat that could be a record changes (e.g. after saving a race result).
// If the new value beats the current holder, archives the old holder to hall_of_fame_history
// (with held_from/held_until so "how long they held it" is tracked) and installs the new one.
// lowerIsBetter=true for things like fastest lap time; false for wins/points/championships.
export async function checkAndUpdateHOF(
  category: string,
  memberId: string,
  memberName: string,
  value: number,
  recordLabel: string,
  lowerIsBetter: boolean
): Promise<HofCheckResult> {
  const { data: current } = await supabase.from('hall_of_fame').select('*').eq('category', category).single();

  if (!current) return { broke_record: false, category };

  const isUnset = current.member_name === 'TBD' || current.member_name == null;
  const beats = isUnset
    ? true
    : lowerIsBetter
      ? value < Number(current.record_value)
      : value > Number(current.record_value);

  if (!beats) return { broke_record: false, category };

  // Don't dethrone yourself — if you already hold the record and just extended your own lead,
  // update in place without creating a (pointless) history entry for yourself.
  const isSelf = current.member_id === memberId;

  if (!isUnset && !isSelf) {
    await supabase.from('hall_of_fame_history').insert({
      category,
      member_name: current.member_name,
      record_value: current.record_value,
      record_label: current.record_label,
      held_from: current.achieved_at,
      held_until: new Date().toISOString(),
    });
  }

  await supabase.from('hall_of_fame').update({
    member_id: memberId,
    member_name: memberName,
    record_value: value,
    record_label: recordLabel,
    achieved_at: isSelf ? current.achieved_at : new Date().toISOString(),
    previous_record_value: isSelf ? current.previous_record_value : current.record_value,
    previous_holder_name: isSelf ? current.previous_holder_name : (isUnset ? null : current.member_name),
    previous_achieved_at: isSelf ? current.previous_achieved_at : current.achieved_at,
  }).eq('id', current.id);

  // Crown them with the Hall of Fame loyalty tier (highest earn rate) if they don't already
  // hold a higher one — same behavior as the manual admin/hall-of-fame edit already does.
  if (!isSelf) {
    await supabase.from('members').update({ loyalty_tier: 'hall_of_fame', points_rate: 8.0 }).eq('id', memberId);
    await supabase.from('loyalty_points').upsert(
      { member_id: memberId, member_name: memberName, tier: 'hall_of_fame', points_rate: 8.0 },
      { onConflict: 'member_id' }
    );
  }

  return { broke_record: true, category };
}

// Sums a member's lifetime wins/points across all race_results — used to feed
// the most_wins / most_points HOF categories after every new result is saved.
export async function getMemberLifetimeStat(memberId: string, field: 'wins' | 'points_earned'): Promise<number> {
  const { data } = await supabase.from('race_results').select(field).eq('member_id', memberId);
  return (data || []).reduce((sum: number, r: any) => sum + (Number(r[field]) || 0), 0);
}