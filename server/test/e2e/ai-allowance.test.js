const test=require('node:test');const assert=require('node:assert/strict');const express=require('express');const {chromium}=require('playwright');
test('monthly allowance is visible, long conversations send bounded history, and server counts reconcile', {skip:process.env.RUN_PLAYWRIGHT_E2E!=='1'},async()=>{
 const app=express();app.use(express.static(require('path').resolve(__dirname,'../../../client/dist')));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});let browser;
 try{
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let used=12,fail=false;const sent=[];
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;let json={};
   const user={id:'test',name:'Ana',email:'test@example.com',role:'admin',plan:'pro',subscription_active:1,subscription_expires:9999999999999,ai_daily_limit:50,ai_uses_today:used,ai_monthly_limit:1000,ai_uses_month:used,level:1,xp:0,english_level:'A2',placement_completed:1,achievements:[],favorites:[]};
   if(path==='/api/auth/session')json={userId:'test'};
   else if(path==='/api/profile')json={user};
   else if(path==='/api/activities')json={activities:[{activity:'conversation',revision:0,state:{version:1,activeTopic:{id:'small_talk',name:'Conversa casual'},messages:Array.from({length:41},(_,i)=>({role:i%2?'user':'assistant',content:`Practice ${i}`}))}}]};
   else if(path.startsWith('/api/activities/'))json={revision:1};
   else if(path==='/api/conversation/topics')json={topics:[{id:'small_talk',name:'Conversa casual'}]};
   else if(path==='/api/conversation'){
    const body=route.request().postDataJSON();sent.push(body);assert.equal(body.history.length,10);
    if(fail)return route.fulfill({status:502,json:{error:'Provider unavailable'}});
    used++;json={reply:'How was your day?'};
   } else if(path==='/api/admin/summary')json={stats:{totalUsers:1,verifiedUsers:1,googleUsers:0,passwordUsers:1},recentUsers:[],topUsers:[]};
   else if(path==='/api/admin/product-usage')json={activeToday:0,active28Days:0,retention:[],features:[]};
   else if(path==='/api/admin/curation')json={reports:[]};
   else if(path==='/api/admin/ai-usage')json={rows:[{day:'2026-09-12',plan:'pro',model:'gemini-3.1-flash-lite',requests:50,failures:2,input_tokens:50000,output_tokens:5000,thinking_tokens:10000,cached_tokens:0,unknown_usage:2,estimated_usd:.035,duration_ms:1000}],limited:false};
   else if(path==='/api/subscription/status')json={active:true,plan:'pro',expires:9999999999999,price:45,aiDailyLimit:50,billingStatus:'active',aiUsage:{used,limit:50,remaining:50-used,resetsAt:'2099-09-13T00:00:00Z',monthlyUsed:used,monthlyLimit:1000,monthlyRemaining:1000-used,monthlyResetsAt:'2099-10-01T00:00:00Z'}};
   await route.fulfill({json});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole('button',{name:'Conversar',exact:true}).click();
  const input=page.getByRole('textbox',{name:'Sua resposta em inglês'});
  await input.fill('I am doing well');await page.getByRole('button',{name:'Enviar',exact:true}).click();
  await page.getByText('37/50 usos hoje',{exact:false}).waitFor();assert.equal(sent.length,1);
  fail=true;await input.fill('What about you?');await page.getByRole('button',{name:'Enviar',exact:true}).click();
  await page.getByText('Provider unavailable',{exact:true}).waitFor();
  assert.match(await page.locator('.conversation-room > .admin-note').innerText(),/987\/1000 neste mês/);
  await page.getByText('Opções da conversa',{exact:true}).click();await page.getByRole('button',{name:'Sair sem analisar'}).click();
  await page.getByRole('heading',{name:'Pratique inglês em cenários reais'}).waitFor();assert.equal(used,13);
  await page.getByRole('button',{name:'Perfil',exact:true}).click();
  await page.getByText('13 de 1000 usos neste mês',{exact:true}).waitFor();
  await page.locator('.subscription-panel').screenshot({path:'/tmp/ai-quota-mobile.png'});
  await page.getByRole('button',{name:'Admin',exact:true}).click();
  await page.getByRole('navigation',{name:'Seções do Admin'}).getByRole('button',{name:'IA e operação',exact:true}).click();
  await page.getByText('50 tentativas · 2 falhas (4%)',{exact:true}).waitFor();
  await page.getByText('2 tentativa(s) sem estimativa completa.',{exact:false}).waitFor();
  await page.locator('.admin-workspace').screenshot({path:'/tmp/ai-operation-mobile.png'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
