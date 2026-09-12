const test=require('node:test');
const express=require('express');
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {setupShopRoutes}=require('../../routes/shop-routes');
const {setupProfileRoutes}=require('../../routes/profile-routes');
test('shop purchases and lesson hints work on mobile', { skip: process.env.RUN_PLAYWRIGHT_E2E !== '1' }, async()=>{
 let user={id:'shop-ui',name:'Aluno',email:'test@example.com',xp:500,lives:1,level:1,english_level:'A1',placement_completed:1,streak:0,achievements:'[]',favorites:'[]',has_free_hint:0,correct_answers:0,lessons_completed:0};
 const attempts=new Map();
 const deps={supabaseRecordChallengeAnswer:async(_id,key,correct)=>{ if(attempts.has(key)) return {data:{lives:user.lives,correct:attempts.get(key),replayed:true}}; if(user.lives===0)return {data:{lives:0,blocked:true}}; attempts.set(key,correct); if(!correct)user.lives--; return {data:{lives:user.lives,correct}}; },authenticateToken:(req,_res,next)=>{req.user={id:user.id};next();},supabaseGetUserById:async()=>({...user}),supabaseCompareUpdateUser:async(_id,updates,old)=>{if(user.xp!==old.xp)return {data:null};user={...user,...updates};return {data:user};},parseJsonField:(v,f)=>typeof v==='string'?JSON.parse(v):v||f};
 const app=express();app.use(express.json());setupShopRoutes(app,deps);setupProfileRoutes(app,deps);
 app.get('/api/auth/session',(_req,res)=>res.json({userId:user.id}));
 app.get('/api/activities',(_req,res)=>res.json({activities:[]}));
 app.use('/api',(_req,res)=>res.json({items:[],cards:[],activities:[],topics:[],quests:[],rewards:[],word:'hello',translation:'olá',success:true}));
 app.use(express.static(require('path').resolve(__dirname, '../../../client/dist')));
 const server=await new Promise(r=>{const s=app.listen(0,'127.0.0.1',()=>r(s));});let browser;
 try{
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.getByRole('button',{name:'Loja',exact:true}).click();
 const hint=page.locator('.shop-card').filter({hasText:'Dica de lição'});
 await hint.getByRole('button',{name:'Comprar',exact:true}).click();
 await page.getByText('Dicas disponíveis: 1', {exact:false}).waitFor();
 assert.equal(user.xp,470);
 const booster=page.locator('.shop-card').filter({hasText:'XP em dobro nas lições (24h)'});
 await booster.getByRole('button',{name:'Comprar',exact:true}).click();
 await booster.getByRole('button',{name:'Já ativo'}).waitFor();assert.equal(user.xp,320);
 await page.screenshot({path:'/tmp/shop-benefits-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Lições',exact:true}).click();
 await page.getByRole('button',{name:'Ver explicação · 1 dica(s)',exact:true}).click();
 await page.locator('.lesson-hint p[role="status"]').waitFor();assert.equal(user.has_free_hint,0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'/tmp/shop-hint-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Loja',exact:true}).click();
 await page.getByRole('button',{name:'Lições',exact:true}).click();
 await page.locator('.lesson-hint p[role="status"]').waitFor();assert.equal(user.has_free_hint,0);
 await page.getByRole('button',{name:'Desafio · usa vidas',exact:true}).click();
 const {lessonSets}=await import('../../../client/src/data/lessons.ts');
 const typed=page.getByLabel('Digite a resposta',{exact:true});
 if(await typed.isVisible()) {
   await typed.fill('deliberately wrong');await page.getByRole('button',{name:'Conferir',exact:true}).click();
 } else {
   const prompt=await page.locator('.lesson-question h3').innerText();
   const question=lessonSets.flatMap(set=>set.questions).find(q=>q.prompt===prompt);
   assert.ok(question);await page.locator('.lesson-choices button').nth((question.answer+1)%question.choices.length).click();
 }
 await page.getByText('Sem vidas para desafios',{exact:true}).waitFor();assert.equal(user.lives,0);assert.equal(attempts.size,1);
 await page.getByRole('button',{name:'Continuar na prática livre',exact:true}).click();
 await page.getByRole('button',{name:'Próxima',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Desafio · usa vidas',exact:true}).isEnabled(),false);
 if(await typed.isVisible()) { await typed.fill('wrong again');await page.getByRole('button',{name:'Conferir',exact:true}).click(); }
 else await page.locator('.lesson-choices button').first().click();
 assert.equal(user.lives,0);assert.equal(attempts.size,1);
 await page.getByRole('button',{name:'Loja',exact:true}).click();
 await page.locator('.shop-card').filter({hasText:'Vidas cheias'}).getByRole('button',{name:'Comprar',exact:true}).click();
 await page.locator('.lives-indicator').getByText('10/10',{exact:true}).waitFor();assert.equal(user.xp,120);
 assert.equal(await page.locator('.shop-card').filter({hasText:'Vida extra'}).getByRole('button',{name:'Vidas cheias',exact:true}).isEnabled(),false);
 await page.screenshot({path:'/tmp/ten-lives-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: mobile purchases, hints, last challenge life, free practice at zero and refill to ten');
 }finally{await browser?.close();server.close();}
});
