import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createInvitationGateway,normalizeInvitation} from './adminInvitationGateway.mjs';

const origin='https://fq.neumact.org';
const url='https://example.supabase.co/functions/v1/nfq-admin-invite';
function request(body,token='signed-admin-token',remoteOrigin=origin,method='POST'){
 return new Request(url,{
  method,headers:{Origin:remoteOrigin,Authorization:'Bearer '+token,'Content-Type':'application/json'},
  ...(method==='POST'?{body:JSON.stringify(body)}:{})
 });
}
function setup({enabled=true,administrator=true,brokenAudit=false,brokenDelivery=false,brokenStatus=false}={}){
 const calls={audit:[],deliver:[],status:[],verify:[],history:[]};
 let seq=0;
 const handle=createInvitationGateway({
  enabled,verifyAdministrator:async token=>{
   calls.verify.push(token);
   return administrator?{id:'c3d1f0fd-2f70-4414-8f89-147602af726d',email:'admin@example.org'}:null;
  },
  listDispatch:async actor=>{calls.history.push(actor);return [{id:'cd11b504-ed0e-4091-a71f-e2d5288c44c4',email:'clinician@example.org',kind:'clinician',status:'sent',createdAt:'2026-11-10T12:00:00Z',updatedAt:'2026-11-10T12:00:00Z'}];},
  recordDispatch:async input=>{
   calls.audit.push(input);
   if(brokenAudit)throw Error('duplicate or unavailable');
   return 'test-audit-'+(++seq);
  },
  sendInvitation:async(email,kind)=>{
   calls.deliver.push({email,kind});
   if(brokenDelivery)throw Error('provider unavailable');
   return '8ac7177e-4a91-4e69-a327-3709cb782117';
  },
  markStatus:async(id,status,userId)=>{
   calls.status.push({id,status,userId});
   if(brokenStatus)throw Error('write uncertain');
  }
 });
 return {handle,calls};
}
test('accepts only clinician or guest email and forbids self-invitation',()=>{
 assert.deepEqual(normalizeInvitation({email:'  CLINICIAN@EXAMPLE.ORG ',kind:'clinician'}),{email:'clinician@example.org',kind:'clinician'});
 assert.equal(normalizeInvitation({email:'admin@example.org',kind:'guest'},'admin@example.org'),null);
 assert.equal(normalizeInvitation({email:'clinician@example.org',kind:'administrator'}),null);
 assert.equal(normalizeInvitation({email:'clinician@example.org',kind:'guest',role:'administrator'}),null);
 assert.equal(normalizeInvitation({email:'not-valid',kind:'guest'}),null);
});
test('enforces trusted frontend origin and allowed methods',async()=>{
 const t=setup();
 assert.equal((await t.handle(request({email:'doctor@example.org',kind:'clinician'},'x','https://evil.example'))).status,403);
 assert.equal((await t.handle(request(null,'x',origin,'DELETE'))).status,405);
 const preflight=new Request(url,{method:'OPTIONS',headers:{Origin:origin}});
 const res=await t.handle(preflight);
 assert.equal(res.status,204);
 assert.equal(await res.text(),'');
 assert.deepEqual(t.calls.deliver,[]);
});
test('disabled deployment cannot invite anyone',async()=>{
 const t=setup({enabled:false});
 assert.equal((await t.handle(request({email:'doctor@example.org',kind:'clinician'}))).status,503);
 assert.equal(t.calls.verify.length,0);
 assert.equal(t.calls.deliver.length,0);
});
test('rejects missing and unauthorized actor before reserving recipient data',async()=>{
 const t=setup({administrator:false});
 assert.equal((await t.handle(request({email:'doctor@example.org',kind:'clinician'}))).status,403);
 assert.equal(t.calls.audit.length,0);
 assert.equal(t.calls.deliver.length,0);
 const noToken=new Request(url,{method:'POST',headers:{Origin:origin},body:'{}'});
 assert.equal((await t.handle(noToken)).status,401);
});
test('invalid request and attempted privilege injection never reach email provider',async()=>{
 const t=setup();
 assert.equal((await t.handle(request({email:'doctor@example.org',kind:'clinician',role:'administrator'}))).status,400);
 assert.equal((await t.handle(request({email:'admin@example.org',kind:'guest'}))).status,400);
 assert.equal(t.calls.audit.length,0);
 assert.equal(t.calls.deliver.length,0);
});
test('reserves an audit record before requesting a private invitation email',async()=>{
 const t=setup();
 const response=await t.handle(request({email:' CLINICIAN@example.org ',kind:'clinician'}));
 assert.equal(response.status,202);
 assert.deepEqual(t.calls.audit,[{
  email:'clinician@example.org',kind:'clinician',actorId:'c3d1f0fd-2f70-4414-8f89-147602af726d'
 }]);
 assert.deepEqual(t.calls.deliver,[{email:'clinician@example.org',kind:'clinician'}]);
 assert.equal(t.calls.status[0].status,'sent');
 const output=await response.text();
 assert.ok(!output.includes('access_token')&&!output.includes('password')&&!output.includes('magiclink'));
 assert.equal(JSON.parse(output).status,'invitation-requested');
});
test('audit reservation failures cannot trigger email dispatch',async()=>{
 const t=setup({brokenAudit:true});
 const response=await t.handle(request({email:'doctor@example.org',kind:'clinician'}));
 assert.equal(response.status,409);
 assert.equal(t.calls.deliver.length,0);
});
test('delivery failure is recorded without assigning any research role',async()=>{
 const t=setup({brokenDelivery:true});
 const response=await t.handle(request({email:'doctor@example.org',kind:'clinician'}));
 assert.equal(response.status,422);
 assert.equal(t.calls.status[0].status,'uncertain');
 assert.equal(t.calls.status[0].userId,null);
});
test('uncertain delivery cannot trigger a second automatic attempt',async()=>{
 const t=setup({brokenStatus:true});
 const response=await t.handle(request({email:'doctor@example.org',kind:'guest'}));
 assert.equal(response.status,503);
 assert.equal(t.calls.deliver.length,1);
 assert.equal(t.calls.status.length,1);
 assert.match((await response.text()),/Verify invitation history before retrying/i);
});

test('history is visible only to verified Administrator, and GET never sends mail',async()=>{
 const t=setup();
 const response=await t.handle(request(null,'x',origin,'GET'));
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.status,'ready');
 assert.equal(body.invitations.length,1);
 assert.equal(body.invitations[0].email,'clinician@example.org');
 assert.deepEqual(t.calls.history,['c3d1f0fd-2f70-4414-8f89-147602af726d']);
 assert.equal(t.calls.deliver.length,0);
 const denied=setup({administrator:false});
 assert.equal((await denied.handle(request(null,'x',origin,'GET'))).status,403);
 assert.deepEqual(denied.calls.history,[]);
});
test('disabled delivery and history reject without user enumeration',async()=>{
 const t=setup({enabled:false});
 assert.equal((await t.handle(request(null,'x',origin,'GET'))).status,503);
 assert.equal((await t.handle(request({email:'missing@example.org',kind:'guest'}))).status,503);
 assert.equal(t.calls.history.length,0);
 assert.equal(t.calls.deliver.length,0);
});
