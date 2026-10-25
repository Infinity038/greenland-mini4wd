/**
 * Staging-only Pit Supabase Auth session broker. This must execute on the
 * *separate Pit server*, with isolated clients. NEVER import into a browser,
 * share the service-role key, set cookies early, email a token to a member,
 * or use account matching by email as a substitute for verified UUID linking.
 *
 * Supabase officially documents admin.generateLink({type:'magiclink',email})
 * and auth.verifyOtp({token_hash,type:'email'}). Production validation against
 * the actual Pit Supabase Auth configuration is required before deployment.
 * The target user ID MUST be previously verified and bound to one Pit player.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const deny=reason=>({ok:false,reason});

/** return only uncommitted server-side credentials. Caller validates IDs. */
export async function prepareExistingPitAuthSession({
 existingAuthUserId,adminClient,isolatedAuthClient,
}) {
 if(!UUID.test(existingAuthUserId??'') ||
   typeof adminClient?.auth?.admin?.getUserById!=='function' ||
   typeof adminClient?.auth?.admin?.generateLink!=='function' ||
   typeof isolatedAuthClient?.auth?.verifyOtp!=='function' ||
   typeof isolatedAuthClient?.auth?.getUser!=='function')return deny('MISSING_DEPENDENCY');
 try {
  const looked=await adminClient.auth.admin.getUserById(existingAuthUserId);
  const user=looked?.data?.user;
  if(looked?.error||!user||
    user.id?.toLowerCase()!==existingAuthUserId.toLowerCase()||
    !user.email||!user.email_confirmed_at)
    return deny('EXISTING_AUTH_USER_NOT_VERIFIED');
  // Email comes ONLY from the exact server-side Auth user returned by
  // getUserById(UUID), never from a signed member claim or incoming form.
  const generated=await adminClient.auth.admin.generateLink({
    type:'magiclink',email:user.email,
  });
  const tokenHash=generated?.data?.properties?.hashed_token;
  if(generated?.error||typeof tokenHash!=='string'||tokenHash.length<16)
    return deny('AUTH_LINK_FAILURE');
  // This must be an isolated (persistSession:false) client — no response
  // cookies can be written until the caller has independently verified ID.
  const verified=await isolatedAuthClient.auth.verifyOtp({
    type:'email',token_hash:tokenHash,
  });
  if(verified?.error||!verified?.data?.session)
    return deny('AUTH_VERIFICATION_FAILURE');
  const fresh=await isolatedAuthClient.auth.getUser();
  if(fresh?.error||fresh?.data?.user?.id?.toLowerCase()!==existingAuthUserId.toLowerCase()||
     verified.data.session.user?.id?.toLowerCase()!==existingAuthUserId.toLowerCase())
    return deny('AUTH_USER_MISMATCH');
  const ses=verified.data.session;
  if(typeof ses.access_token!=='string'||!ses.access_token||
     typeof ses.refresh_token!=='string'||!ses.refresh_token)
    return deny('AUTH_TOKEN_MISSING');
  return {ok:true,authUserId:existingAuthUserId.toLowerCase(),
    accessToken:ses.access_token,refreshToken:ses.refresh_token};
 }catch{return deny('AUTH_BROKER_UNAVAILABLE')}
}

/** Persist SSR cookies ONLY after caller checked the proposed session ID. */
export async function commitVerifiedPitSession({
 existingAuthUserId,accessToken,refreshToken,ssrClient
}) {
 if(!UUID.test(existingAuthUserId??'')||
    typeof accessToken!=='string'||!accessToken||
    typeof refreshToken!=='string'||!refreshToken||
    typeof ssrClient?.auth?.setSession!=='function'||
    typeof ssrClient?.auth?.getUser!=='function')return false;
 try {
  const set=await ssrClient.auth.setSession({
    access_token:accessToken,refresh_token:refreshToken,
  });
  const actual=await ssrClient.auth.getUser();
  if(set?.error||actual?.error||
      set?.data?.user?.id?.toLowerCase()!==existingAuthUserId.toLowerCase()||
      actual?.data?.user?.id?.toLowerCase()!==existingAuthUserId.toLowerCase()) {
    await ssrClient.auth.signOut?.();
    return false;
  }
  return true;
 }catch {
  try{await ssrClient?.auth?.signOut?.()}catch{}
  return false;
 }
}
