const test=require('node:test');const assert=require('node:assert/strict');
const {usageEvent,requestIssue,context}=require('../services/ai-policy');
const {createGeminiService}=require('../services/gemini-service');
const {aiUsage,subscriptionUpdates}=require('../services/subscription-state');
test('new plans reset monthly quotas and old subscribers retain their allowance',()=>{
 const now=Date.parse('2026-09-30T23:59:59Z');
 const user={plan:'pro',subscription_active:1,subscription_expires:now+86400000,ai_policy_version:2,ai_uses_date:'2026-09-30',ai_uses_today:12,ai_month_key:'2026-09',ai_uses_month:999};
 const usage=aiUsage(user,now);assert.equal(usage.monthlyRemaining,1);assert.equal(usage.limit,50);
 assert.equal(aiUsage(user,now+1000).monthlyUsed,0);assert.equal(aiUsage(user,now+1000).used,0);
 const old=aiUsage({...user,ai_policy_version:1},now);assert.equal(old.limit,300);assert.equal(old.monthlyLimit,null);
 assert.equal(aiUsage({...user,subscription_active:0},now).monthlyLimit,100);
 const sub={status:'active',items:{data:[{price:'price',current_period_end:Date.now()/1000+86400}]}};
 assert.equal(subscriptionUpdates(sub,()=> 'max').ai_policy_version,1);
 assert.equal(subscriptionUpdates({...sub,metadata:{ai_policy_version:'2'}},()=> 'max').ai_daily_limit,150);
});
test('cost includes thinking, discounts cached input, and never treats unknown usage as free',()=>{
 const data={model:'gemini-3.1-flash-lite',metadata:{promptTokenCount:1000,candidatesTokenCount:100,thoughtsTokenCount:200,cachedContentTokenCount:400},failed:false,durationMs:20};
 const event=context.run({plan:'max'},()=>usageEvent(data));
 assert.equal(event.plan,'max');assert.equal(event.estimatedUsd,(600*.25+400*.025+300*1.5)/1e6);
 assert.equal(usageEvent({...data,metadata:undefined}).estimatedUsd,null);
 assert.equal(usageEvent({...data,model:'unknown'}).estimatedUsd,null);
 assert.ok(usageEvent({...data,model:'gemini-3.6-flash'},new Date('2027-01-01')).estimatedUsd>usageEvent({...data,model:'gemini-3.6-flash'},new Date('2026-12-31')).estimatedUsd);
});
test('provider attempts report retries and truncated paid output without storing messages',async()=>{
 const events=[];let calls=0;
 const service=createGeminiService({onAttempt:async e=>events.push(e),fetchImpl:async()=>{
  calls++;return calls===1?new Response('',{status:503}):Response.json({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'partial'}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:20,thoughtsTokenCount:80}});
 }});
 await assert.rejects(service.callGeminiChat({apiKey:'test',messages:[{role:'user',content:'private text'}]}),{code:'AI_RESPONSE_TRUNCATED'});
 assert.equal(events.length,2);assert.equal(events[1].metadata.thoughtsTokenCount,80);assert.equal(events[1].failed,true);
 assert.ok(!JSON.stringify(events).includes('private text'));
});
test('all Gemini entry points enforce input and output bounds before network work',async()=>{
 let calls=0;const service=createGeminiService({fetchImpl:async()=>{calls++;return Response.json({});}});
 await assert.rejects(service.callGeminiChat({apiKey:'test',messages:[{role:'user',content:'x'.repeat(32001)}]}),{status:400});
 await assert.rejects(service.callGeminiChat({apiKey:'test',messages:[],maxTokens:999999}),{status:400});
 assert.equal(calls,0);assert.ok(requestIssue({message:'x'.repeat(24000)}));assert.ok(requestIssue({max_tokens:Infinity}));
});
