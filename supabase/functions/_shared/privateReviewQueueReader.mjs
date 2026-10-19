/** Non-public review queue reader: one private DB transaction per request. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createPrivateReviewQueueReader({withTransaction}){
 if(typeof withTransaction!=='function')throw new Error('Transaction provider required');
 return async (principal,offset=0)=>{
  if(!uuid.test(principal?.userId||'')||!uuid.test(principal?.sessionId||''))
   throw Object.assign(new Error('No verified identity'),{code:'28000'});
  if(!Number.isInteger(offset)||offset<0||offset>1000||offset%20!==0)
   throw Object.assign(new Error('Invalid page'),{code:'22023'});
  return withTransaction(async query=>{
   await query('SET LOCAL ROLE nfq_review_executor',[]);
   const sessions=await query(
    'SELECT 1 FROM auth.sessions WHERE id=$1::uuid AND user_id=$2::uuid AND (not_after IS NULL OR not_after>now()) LIMIT 1',
    [principal.sessionId,principal.userId]);
   if(!Array.isArray(sessions)||sessions.length!==1)
    throw Object.assign(new Error('No current session'),{code:'28000'});
   await query("SELECT set_config('request.jwt.claim.sub',$1,true)",[principal.userId]);
   const rows=await query('SELECT review_stage.review_queue($1) AS payload',[offset]);
   if(!Array.isArray(rows)||rows.length!==1||!rows[0]?.payload)
    throw new Error('Private review queue unavailable');
   return rows[0].payload;
  });
 };
}
