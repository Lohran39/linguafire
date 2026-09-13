const test=require('node:test');const assert=require('node:assert/strict');const express=require('express');
const {createAIQuota}=require('../middleware/ai-quota');const {createRateLimiter}=require('../middleware/rate-limiter');
const {setupConversationRoutes}=require('../routes/conversation-routes');const {setupAIRoutes}=require('../routes/ai-routes');
const {context}=require('../services/ai-policy');
test('50 learners share an IP; validation is free; provider errors refund; account throttle survives refunds',async()=>{
 const users=new Map(), reservations=new Map();let calls=0,failProvider=false;
 const supabase={rpc:async(name,args)=>{
  if(name==='consume_ai_use_v2') {
   const u=users.get(args.p_user_id)||{used:0,rate:0};users.set(args.p_user_id,u);
   if(u.rate>=30)return {data:{allowed:false,reason:'rate_limit'}};
   u.used++;u.rate++;reservations.set(args.p_request_id,{u,done:false});
   return {data:{allowed:true,plan:'pro',used:u.used,limit:50,monthlyLimit:1000}};
  }
  const r=reservations.get(args.p_request_id);if(r&&!r.done){r.done=true;if(!args.p_success)r.u.used--;}
  return {data:null};
 }};
 const authenticateToken=(req,res,next)=>{if(!req.headers['x-test-user'])return res.sendStatus(401);req.user={id:req.headers['x-test-user']};next();};
 const app=express();app.use(express.json());app.use(createRateLimiter());
 const checkAILimit=createAIQuota({supabase});
 const callGeminiChat=async()=>{calls++;assert.equal(context.getStore().plan,'pro');await new Promise(resolve=>setTimeout(resolve,10));if(failProvider)throw Object.assign(new Error('Provider failed'),{status:502});return {content:'Hello, how are you?',usage:{promptTokens:10,completionTokens:5}};};
 setupConversationRoutes(app,{authenticateToken,checkAILimit,callGeminiChat});
 setupAIRoutes(app,{authenticateToken,checkAILimit,callGeminiChat,aiApiKey:'test'});
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const base=`http://127.0.0.1:${server.address().port}`;
 async function post(user,body,path='/api/conversation'){
  const start=performance.now();const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','x-test-user':user},body:JSON.stringify(body)});const json=await response.json();return {status:response.status,json,ms:performance.now()-start};
 }
 try {
  const body={topicId:'small_talk',message:'Hello'};
  const results=await Promise.all(Array.from({length:50},(_,i)=>post(`student-${i}`,body)));
  assert.ok(results.every(r=>r.status===200));assert.equal(calls,50);const times=results.map(r=>r.ms).sort((a,b)=>a-b);
  console.log(JSON.stringify({test:'50 concurrent HTTP learners sharing one IP',provider:'simulated 10ms',quotaStore:'mock; atomic DB checked separately',passed:50,p95Ms:Math.round(times[47])}));
  assert.equal((await post('invalid',{topicId:'unknown',message:'Hi'})).status,400);
  assert.equal((await post('invalid',{...body,message:'x'.repeat(25000)})).status,400);
  assert.equal((await post('invalid',{messages:[{role:'user',content:'Hi'}],max_tokens:99999},'/v1/chat/completions')).status,400);
  assert.equal((await post('invalid',{messages:[{role:'user',content:'Hi'}],stream:true},'/v1/chat/completions')).status,400);
  assert.equal(users.has('invalid'),false);
  failProvider=true;assert.equal((await post('student-0',body)).status,502);assert.equal(users.get('student-0').used,1);
  await Promise.all(Array.from({length:35},()=>post('abuse',body)));
  assert.equal(users.get('abuse').rate,30);assert.equal(users.get('abuse').used,0);
  assert.equal((await post('abuse',body)).status,429);
 } finally {await new Promise(resolve=>server.close(resolve));}
});

test('cost summary requires database admin role and reports unavailable storage',async()=>{
 const {setupProductUsageRoutes}=require('../routes/product-usage-routes');let role='user',failed=false,queries=0;
 const app=express();setupProductUsageRoutes(app,{authenticateToken:(req,res,next)=>{req.user={id:'u',role:'admin'};next();},supabaseGetUserById:async()=>({role}),supabase:{from:()=>{queries++;return {select(){return this;},gte(){return this;},order(){return this;},limit:async()=>failed?{error:'offline'}:{data:[]}};}}});
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 try{
  const url=`http://127.0.0.1:${server.address().port}/api/admin/ai-usage`;
  assert.equal((await fetch(url)).status,403);assert.equal(queries,0);
  role='admin';const res=await fetch(url);assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store');assert.deepEqual((await res.json()).rows,[]);
  failed=true;assert.equal((await fetch(url)).status,503);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
