/**
 * REVIEW-ONLY Pit standalone receiver contract, not deployed.
 * Must be placed into the actual Pit Next.js source tree and backed by an
 * independently audited owner/member permission check and real auth broker.
 *
 * Never mint a user session from a signed claim alone. A signed, valid ticket
 * only proves a club issuer recently attested the member UUID; it is not
 * proof of Pit player ownership or a Supabase Auth session.
 */
import { verifyHandoffTicket } from './sso-handoff-contract.mjs';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail = code => ({ok:false,code});
const normalize = x => typeof x==='string' ? x.toLowerCase() : '';

export function parsePitHandoffPost({
 method, origin, contentType, body, expectedClubOrigin, enabled,
}) {
 if(!enabled) return fail('FEATURE_DISABLED');
 if(method!=='POST'||origin!==expectedClubOrigin||
    !/^https:\/\/[^/?#]+$/i.test(expectedClubOrigin??''))return fail('INVALID_ORIGIN');
 if(typeof contentType!=='string'||
    !/^application\/x-www-form-urlencoded(?:\s*;\s*charset=utf-8)?$/i.test(contentType))
   return fail('INVALID_CONTENT_TYPE');
 if(typeof body!=='string'||Buffer.byteLength(body,'utf8')>2600)
   return fail('INVALID_BODY');
 const params=new URLSearchParams(body);
 if([...params.keys()].length!==1||params.getAll('ticket').length!==1)
   return fail('INVALID_FIELDS');
 const ticket=params.get('ticket');
 if(!ticket||ticket.length<70||ticket.length>2400)
   return fail('INVALID_TICKET');
 return {ok:true,ticket};
}

/**
 * All trusted callbacks are SERVER-ONLY:
 * isCurrentlyApproved: live GM4WD owner+18+ policy query (no cached flag)
 * lookupLinkedPlayer: Pit DB query for exactly one existing VERIFIED link
 * atomicConsume: unique nonce INSERT via locked privileged Pit RPC
 * obtainUncommittedSession: authenticate exact *existing* Supabase Auth user
 * commitSession: securely persist SSR auth cookies after identity verification.
 *
 * On any error, issue a generic denial to the browser (specific code only
 * for tests/structured server logs that exclude personal data/secrets).
 */
export async function completePitHandoff({
 ticket,secret,nowSeconds,isCurrentlyApproved,lookupLinkedPlayer,
 atomicConsume,obtainUncommittedSession,commitSession
}) {
 const v=verifyHandoffTicket(ticket,{secret,nowSeconds});
 if(!v.accepted)return fail('INVALID_TICKET');
 if([isCurrentlyApproved,lookupLinkedPlayer,atomicConsume,
     obtainUncommittedSession,commitSession].some(f=>typeof f!=='function'))
   return fail('SERVER_DEPENDENCY_MISSING');
 try {
   if((await isCurrentlyApproved(v.memberId))!==true)return fail('NOT_APPROVED');
   const p=await lookupLinkedPlayer(v.memberId);
   // "verified" must come from an owner-controlled, audited linking record,
   // not similarity of member email, Pit email, name or phone number.
   if(!p||!UUID.test(p.id??'')||!UUID.test(p.authUserId??'')||
      normalize(p.memberId)!==v.memberId||p.verified!==true)
       return fail('VERIFIED_EXISTING_LINK_REQUIRED');
   // This MUST be an atomic cross-request uniqueness operation. Denied
   // redemptions do not issue sessions or modify the original wallet.
   const consumed=await atomicConsume({
     memberId:v.memberId,playerId:normalize(p.id),
     nonceHash:v.nonceHash,expiresAt:v.expiresAt,
   });
   if(consumed!==true)return fail('REPLAY_OR_EXPIRED');
   // Recheck owner approval after consumption. A revocation during the
   // exchange must not establish a usable new session.
   if((await isCurrentlyApproved(v.memberId))!==true)return fail('REVOKED');
   const candidate=await obtainUncommittedSession({
     existingAuthUserId:normalize(p.authUserId),
   });
   // Candidate holds server-only access/refresh credentials. It must NEVER
   // set browser cookies until identity is independently verified here.
   if(!candidate||normalize(candidate.authUserId)!==normalize(p.authUserId)||
      typeof candidate.accessToken!=='string'||
      typeof candidate.refreshToken!=='string'||
      !candidate.accessToken||!candidate.refreshToken)
     return fail('AUTH_SESSION_MISMATCH');
   if((await isCurrentlyApproved(v.memberId))!==true)return fail('REVOKED');
   if((await commitSession({
       expectedAuthUserId:normalize(p.authUserId),
       accessToken:candidate.accessToken,
       refreshToken:candidate.refreshToken,
     }))!==true)return fail('SESSION_COMMIT_DENIED');
   // Do not serialize email, player ID, member UUID, auth IDs or tokens.
   return {ok:true,code:'AUTHENTICATED',redirectTo:'/'};
 }catch{return fail('SERVER_ERROR')}
}

/** Never reflect identity or token in HTTP responses / error pages. */
export function pitHandoffResponse(outcome) {
 const ok=outcome?.ok===true;
 return {
  status:ok?303:403,
  headers:{
   'cache-control':'no-store, private',
   'referrer-policy':'no-referrer',
   'x-content-type-options':'nosniff',
   'content-security-policy':"default-src 'none'; base-uri 'none'; form-action 'none'",
   location:ok?'/':'/access-denied',
  },
  body:'',
 };
}
