"""Real local PostgreSQL verification. Creates/destroys an isolated temporary cluster only."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess, tempfile, shutil, json, uuid
root=Path(tempfile.mkdtemp(prefix='linguafire-quotas-pg-',dir='/tmp'));started=False
try:
 subprocess.run(['initdb','-D',str(root/'data'),'-A','trust','--no-locale','-E','UTF8'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 subprocess.run(['pg_ctl','-D',str(root/'data'),'-l',str(root/'log'),'-o',f"-h '' -k {root} -p 55443",'-w','start'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE);started=True
 def sql(text):
  return subprocess.run(['psql','-h',str(root),'-p','55443','-d','postgres','-v','ON_ERROR_STOP=1','-At','-c',text],check=True,capture_output=True,text=True).stdout.strip()
 sql("CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE TABLE users(id UUID PRIMARY KEY,plan TEXT DEFAULT 'free',subscription_active INTEGER DEFAULT 0,subscription_expires BIGINT DEFAULT 0,ai_uses_date TEXT DEFAULT '',ai_uses_today INTEGER DEFAULT 0);")
 old=str(uuid.uuid4());sql(f"INSERT INTO users(id,plan,subscription_active,subscription_expires) VALUES('{old}','max',1,9999999999999);")
 migration=(Path(__file__).resolve().parents[1]/'migrations/20260912-ai-plan-quotas.sql').read_text();sql(migration);sql(migration)
 def reserve(uid,rid=None):
  rid=rid or str(uuid.uuid4());return rid,json.loads(sql(f"SELECT consume_ai_use_v2('{uid}','{rid}')"))
 assert reserve(old)[1]['limit']==1000;assert reserve(old)[1]['monthlyLimit'] is None
 uid=str(uuid.uuid4());sql(f"INSERT INTO users(id,plan,subscription_active,subscription_expires) VALUES('{uid}','pro',1,9999999999999)")
 sql(f"UPDATE users SET ai_month_key=to_char(now() AT TIME ZONE 'UTC','YYYY-MM'),ai_uses_month=999 WHERE id='{uid}'")
 with ThreadPoolExecutor(max_workers=12) as pool: responses=list(pool.map(lambda _:reserve(uid),range(50)))
 assert sum(r[1]['allowed'] for r in responses)==1
 rid=next(r[0] for r in responses if r[1]['allowed'])
 with ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(lambda _:sql(f"SELECT finish_ai_use('{rid}',false)"),range(8)))
 assert sql(f"SELECT ai_uses_month||','||ai_uses_today FROM users WHERE id='{uid}'")=='999,0'
 assert reserve(uid,rid)[1]['allowed'] is False
 sql(f"UPDATE users SET ai_month_key='2020-01',ai_uses_month=1000,ai_uses_date='2020-01-01',ai_uses_today=50 WHERE id='{uid}'")
 rid,usage=reserve(uid);assert usage['used']==1 and usage['monthlyUsed']==1
 # Late refunds cannot subtract from a later month/day.
 sql(f"UPDATE users SET ai_month_key='2099-01',ai_uses_month=8,ai_uses_date='2099-01-01',ai_uses_today=8 WHERE id='{uid}'")
 sql(f"SELECT finish_ai_use('{rid}',false)");assert sql(f"SELECT ai_uses_month||','||ai_uses_today FROM users WHERE id='{uid}'")=='8,8'
 users=[str(uuid.uuid4()) for _ in range(50)]
 sql('INSERT INTO users(id) VALUES '+','.join(f"('{u}')" for u in users))
 with ThreadPoolExecutor(max_workers=50) as pool: responses=list(pool.map(reserve,users))
 assert all(r[1]['allowed'] for r in responses)
 same=users[0]
 with ThreadPoolExecutor(max_workers=12) as pool: responses=list(pool.map(lambda _:reserve(same),range(50)))
 assert sum(r[1]['allowed'] for r in responses)==9 # prior call + 9 = daily Free cap
 rateuser=str(uuid.uuid4());sql(f"INSERT INTO users(id,plan,subscription_active,subscription_expires) VALUES('{rateuser}','pro',1,9999999999999)")
 with ThreadPoolExecutor(max_workers=12) as pool: responses=list(pool.map(lambda _:reserve(rateuser),range(50)))
 assert sum(r[1]['allowed'] for r in responses)==30
 assert any(r[1]['reason']=='rate_limit' for r in responses)
 event=json.dumps({'plan':'pro','model':'test','inputTokens':100,'outputTokens':20,'thinkingTokens':10,'estimatedUsd':0.5})
 with ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(lambda _:sql(f"SELECT record_ai_provider_usage('{event}'::jsonb)"),range(20)))
 assert sql('SELECT requests||\',\'||thinking_tokens||\',\'||estimated_usd FROM ai_provider_daily')=='20,200,10.0'
 for fn in ['consume_ai_use_v2(uuid,uuid)','finish_ai_use(uuid,boolean)','record_ai_provider_usage(jsonb)']:
  assert sql(f"SELECT has_function_privilege('anon','public.{fn}','EXECUTE')")=='f'
  assert sql(f"SELECT has_function_privilege('service_role','public.{fn}','EXECUTE')")=='t'
 print('PASS: rerunnable migration, legacy plan preserved, 50 concurrent users, atomic monthly/daily caps, per-user rate limit, idempotent refunds, rollover, aggregate costs, RPC permissions')
finally:
 if started:subprocess.run(['pg_ctl','-D',str(root/'data'),'-m','fast','-w','stop'],check=True,stdout=subprocess.DEVNULL)
 shutil.rmtree(root)
