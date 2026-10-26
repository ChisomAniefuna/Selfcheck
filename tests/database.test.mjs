import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
test('PostgreSQL RLS isolates saved decisions and protects scan references',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated; insert into auth.users values ('${a}'),('${b}');`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261026000100_shelfcheck.sql',import.meta.url),'utf8'));
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${a}',false);`);
  await db.query('insert into public.saved_decisions(user_id,product_name,decision,summary) values ($1,$2,$3,$4)',[a,'Quiet Cream','hold','Text only']);
  await assert.rejects(()=>db.query('insert into public.saved_decisions(user_id,product_name,decision,summary) values ($1,$2,$3,$4)',[b,'Foreign','hold','Text only']),/row-level security/);
  await assert.rejects(()=>db.query('select * from public.scan_jobs'),/permission denied/);
  await db.exec(`select set_config('request.jwt.claim.sub','${b}',false);`);
  assert.equal((await db.query('select * from public.saved_decisions')).rows.length,0);
  assert.equal((await db.query('delete from public.saved_decisions returning id')).rows.length,0);
  await db.exec(`select set_config('request.jwt.claim.sub','${a}',false);`);
  assert.equal((await db.query('select * from public.saved_decisions')).rows.length,1);
  await assert.rejects(()=>db.query("update public.saved_decisions set summary='edited'"),/permission denied/);
  await db.exec('reset role; set role anon;');
  await assert.rejects(()=>db.query('select * from public.saved_decisions'),/permission denied/);
  await db.exec('reset role;');
  const id='00000000-0000-4000-8000-000000000003';
  assert.equal((await db.query('select public.reserve_scan($1,$2) as allowed',[a,id])).rows[0].allowed,true);
  assert.equal((await db.query('select public.reserve_scan($1,$2) as allowed',[a,'00000000-0000-4000-8000-000000000004'])).rows[0].allowed,false);
  await db.query('delete from auth.users where id=$1',[a]);
  assert.equal((await db.query('select * from public.saved_decisions')).rows.length,0);
  assert.equal((await db.query('select * from public.scan_jobs')).rows.length,0);
 }finally{await db.close();}
});
