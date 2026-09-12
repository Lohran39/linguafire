const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { purchase, lessonXp, streakUpdates, studyDay } = require('../services/shop-benefits');
const { setupShopRoutes } = require('../routes/shop-routes');
const { setupProfileRoutes } = require('../routes/profile-routes');

test('purchases grant hints and reject duplicate active benefits', () => {
  assert.equal(purchase({xp:100,has_free_hint:2},'free_hint').updates.has_free_hint,3);
  assert.equal(purchase({xp:100},'free_hint').updates.xp,70);
  assert.throws(()=>purchase({xp:29},'free_hint'),/insuficiente/);

  assert.throws(()=>purchase({xp:1000,streak_freeze_active:1},'streak_freeze'),/ativa/);
  assert.throws(()=>purchase({xp:1000,xp_multiplier:2,xp_multiplier_until:2000},'xp_booster',1000),/ativo/);
  assert.equal(purchase({xp:1000},'streak_freeze').updates.streak_freeze_active,1);
});
test('life purchases recover from zero, cap at ten and reject full balances without a debit', () => {
  assert.deepEqual(purchase({xp:500,lives:0},'extra_life').updates,{xp:450,lives:1});
  assert.deepEqual(purchase({xp:500,lives:9},'extra_life').updates,{xp:450,lives:10});
  assert.deepEqual(purchase({xp:500,lives:0},'all_lives').updates,{xp:300,lives:10});
  assert.deepEqual(purchase({xp:500,lives:8},'all_lives').updates,{xp:300,lives:10});
  for(const id of ['extra_life','all_lives']) assert.throws(()=>purchase({xp:500,lives:10},id),/cheias/);
});
test('booster expires exactly at boundary and box always grants its announced reward', () => {
  const user={xp:200,...purchase({xp:200},'xp_booster',1000).updates};
  assert.equal(lessonXp(user,25,1001),50);
  assert.equal(lessonXp(user,25,1000+86400000),25);
  for(const [roll,expected] of [[0,50],[0.6,100],[0.9,200]])
    assert.equal(purchase({xp:75},'mystery_box',0,()=>roll).updates.xp,expected);
});
test('sequence uses local study day, consumes one freeze only for a single missed day', () => {
  const u={streak:8,last_study_date:'2026-09-08',streak_freeze_active:1};
  assert.deepEqual(streakUpdates(u,'2026-09-08'),{});
  assert.deepEqual(streakUpdates(u,'2026-09-07'),{});
  assert.equal(streakUpdates(u,'2026-09-09').streak,9);
  assert.deepEqual(streakUpdates(u,'2026-09-10'),{last_study_date:'2026-09-10',streak:9,streak_freeze_active:0});
  assert.equal(streakUpdates(u,'2026-09-11').streak,1);
  assert.equal(streakUpdates({...u,streak_freeze_active:0},'2026-09-10').streak,1);
  assert.equal(studyDay(new Date('2026-09-10T02:59:00Z')),'2026-09-09');
});
test('routes persist benefits, guard concurrent spending, and surface database failure', async () => {
  let user={id:'u',xp:50,has_free_hint:0,level:1};
  let fail=false;
  const deps={
    authenticateToken:(req,_res,next)=>{req.user={id:'u'};next();},
    supabaseRecordChallengeAnswer:async(id, attempt, correct)=>{ assert.equal(id,'u'); return {data:{lives:correct?10:9,correct}}; },
    supabaseGetUserById:async()=>({...user}),
    supabaseCompareUpdateUser:async(_id,updates,expected)=>{
      await new Promise(resolve=>setImmediate(resolve));
      if(fail) return {error:'offline'};
      if([...new Set(['xp',...Object.keys(updates)])].some(key=>user[key]!==expected[key])) return {data:null};
      user={...user,...updates}; return {data:user};
    }
  };
  const app=express(); app.use(express.json()); setupShopRoutes(app,deps); setupProfileRoutes(app,deps);
  const server=await new Promise(resolve=>{const value=app.listen(0,'127.0.0.1',()=>resolve(value));});
  const call=(path,body,method='POST')=>fetch(`http://127.0.0.1:${server.address().port}/api/${path}`,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  try {
    assert.equal((await call('lessons/challenge-answer',{attemptId:'run:1',correct:'false'})).status,400);
    const challenge=await call('lessons/challenge-answer',{attemptId:'run:1',correct:false,userId:'other'});
    assert.equal(challenge.status,200); assert.equal((await challenge.json()).lives,9);
    const results=await Promise.all([call('shop/buy',{itemId:'free_hint'}),call('shop/buy',{itemId:'free_hint'})]);
    assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
    assert.equal(user.xp,20); assert.equal(user.has_free_hint,1);
    assert.equal((await call('shop/use-hint',{})).status,200);
    assert.equal(user.has_free_hint,0);
    assert.equal((await call('shop/use-hint',{})).status,400);
    user.xp=500; fail=true;
    assert.equal((await call('shop/buy',{itemId:'free_hint'})).status,503);
    assert.equal(user.xp,500);
    fail=false; user.xp_multiplier=2; user.xp_multiplier_until=Date.now()+60000;
    const reward=await call('profile',{xp_base:500,lesson_xp:100,xp:600},'PUT');
    assert.equal(reward.status,200); assert.equal(user.xp,700);
    assert.equal((await call('profile',{xp_base:500,lesson_xp:100},'PUT')).status,409);
    assert.equal(user.xp,700);
  } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
});
