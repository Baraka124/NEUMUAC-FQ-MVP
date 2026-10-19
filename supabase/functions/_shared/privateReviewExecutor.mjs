/**
 * Private DB adapter: caller supplies a transaction runner (one connection,
 * BEGIN..COMMIT/ROLLBACK, server-side credentials only). The actor is not
 * accepted from the command or a browser body.
 */
const id=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createPrivateReviewExecutor({withTransaction}){
 if(typeof withTransaction!=='function')throw new Error('Private transaction runner required');
 return async (principal,command)=>{
  if(!id.test(principal?.userId||'')||!id.test(principal?.sessionId||''))
   throw Object.assign(new Error('Actor verification required'),{code:'28000'});
  return withTransaction(async query=>{
   // Mandatory dedicated-role scope on this SAME transaction/connection.
   await query('SET LOCAL ROLE nfq_review_executor',[]);
   const sessions=await query(
    'SELECT 1 FROM auth.sessions WHERE id=$1::uuid AND user_id=$2::uuid AND (not_after IS NULL OR not_after>now()) LIMIT 1',
    [principal.sessionId,principal.userId]);
   if(!Array.isArray(sessions)||sessions.length!==1)
    throw Object.assign(new Error('Session not active'),{code:'28000'});
   await query("SELECT set_config('request.jwt.claim.sub',$1,true)",[principal.userId]);
   const rows=await query(
    'SELECT review_stage.review_command($1,$2,$3,$4,$5,$6,$7,$8) AS outcome',
    [command.decisionId,command.revision,command.expectedVersion,command.action,
     command.vote,command.role,command.idempotencyKey,command.rationale]);
   if(!Array.isArray(rows)||rows.length!==1||!rows[0]?.outcome)
    throw new Error('Private review returned no result');
   return rows[0].outcome;
  });
 };
}
