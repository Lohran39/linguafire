const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');
test('catalog and restored songs fetch complete lyrics beyond 80 lines', { skip: process.env.RUN_PLAYWRIGHT_E2E !== '1' }, async () => {
 const { SONGS } = await import('../../../client/src/data/music.ts');
 const oldSong = SONGS.find(song => song.key === 'shape-of-you');
 const app=express(); app.use(express.static(require('path').resolve(__dirname,'../../../client/dist')));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 let browser;
 try {
  browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:390,height:844}});
  const calls=[]; const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{
   const url=new URL(route.request().url()); let json={};
   if(url.pathname==='/api/auth/session') json={userId:'lyrics-test'};
   else if(url.pathname==='/api/profile') json={user:{id:'lyrics-test',name:'Aluno',email:'test@example.com',level:1,english_level:'A1',placement_completed:1,xp:0,achievements:[],favorites:[]}};
   else if(url.pathname==='/api/activities') json={activities:[{activity:'music',revision:0,state:{version:1,activeSong:oldSong}}]};
   else if(url.pathname.startsWith('/api/activities/')) json={revision:1};
   else if(url.pathname==='/api/curation') json={items:[]};
   else if(url.pathname==='/api/lyrics/find') {
     const track=url.searchParams.get('track_name'); calls.push(track);
     json={success:true,synced:true,syncedLyrics:Array.from({length:105},(_,i)=>`[${String(Math.floor(i/60)).padStart(2,'0')}:${String(i%60).padStart(2,'0')}.00]Fictional ${track} example ${i}`).join('\n')};
   } else if(url.pathname==='/api/translate') json={responseStatus:200,responseData:{translatedText:route.request().postDataJSON().q.replaceAll('Fictional','Exemplo')}};
   await route.fulfill({json});
  });
  await page.route('**/www.youtube.com/**',r=>r.fulfill({body:'',contentType:'text/html'}));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole('button',{name:'Música',exact:true}).click();
  await page.locator('.lyric-card').nth(104).waitFor();
  assert.ok(calls.includes('Shape of You')); assert.equal(await page.locator('.lyric-card').count(),105);
  await page.getByText('Letra sincronizada disponível.',{exact:true}).waitFor();
  const search=page.getByPlaceholder('Ex: stay, adele ou link do YouTube');
  await search.fill('Stay'); await search.press('Enter');
  await page.getByRole('heading',{name:'Stay',exact:true}).waitFor();
  await page.locator('.lyric-card').nth(104).waitFor();
  assert.ok(calls.includes('Stay')); assert.match(await page.locator('.lyric-card').last().innerText(),/Stay example 104/);
  await page.getByText('Letra sincronizada disponível.',{exact:true}).waitFor();
  const before=calls.length;
  await page.getByRole('button',{name:'Lições',exact:true}).click();
  await page.getByRole('button',{name:'Música',exact:true}).click();
  await page.locator('.lyric-card').nth(104).waitFor(); assert.equal(calls.length,before);
  assert.deepEqual(errors,[]);
 } finally { await browser?.close(); server.close(); }
});
