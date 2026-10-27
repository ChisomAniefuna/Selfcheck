// Opt-in live smoke test. Creates and deletes two disposable guests; no photographs.
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {supabaseConfig as config} from '../dist/config.js';
import {createBackend} from '../dist/backend.js';
if(!process.argv.includes('--live'))throw Error('Run with --live to create temporary guests in the configured project.');
const clients=[],backends=[];
const origin=process.env.SHELFCHECK_ORIGIN||'http://localhost:4173';
try{
 for(let i=0;i<2;i++){
  const client=createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Origin:origin}}});
  const {data,error}=await client.auth.signInAnonymously();if(error)throw Error('Guest sign-in failed: '+error.message);
  assert.ok(data.user?.is_anonymous);clients.push(client);
  backends.push(createBackend(config,async()=>({createClient:()=>client})));
 }
 console.log('PASS: two isolated guest sessions sign in.');
 const [a,b]=backends;
 const saved=await a.saveSaved({name:'ShelfCheck live smoke test',decision:'hold',summary:'Disposable backend verification. No photo or personal information.'});
 assert.ok((await a.listSaved()).some(x=>x.id===saved.id));
 console.log('PASS: a guest saves and reloads a text summary.');
 assert.equal((await b.listSaved()).some(x=>x.id===saved.id),false);
 await b.removeSaved(saved.id);
 assert.ok((await a.listSaved()).some(x=>x.id===saved.id));
 const {data:{user:bUser}}=await clients[1].auth.getUser();
 const forbidden=await clients[1].from('saved_decisions').insert({user_id:(await clients[0].auth.getUser()).data.user.id,product_name:'Foreign owner',decision:'hold',summary:'Should be denied'});
 assert.ok(forbidden.error);assert.ok(bUser);
 console.log('PASS: the second guest cannot read, delete or create data owned by the first.');
 const scan=await a.scanConfig();assert.equal(typeof scan.youcamConfigured,'boolean');
 const preflight=await fetch(config.url+'/functions/v1/shelfcheck',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,apikey,content-type'}});
 assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
 console.log('PASS: authenticated Edge Function and CORS preflight accept '+origin+'.');
 console.log('YouCam connection: '+(scan.youcamConfigured?'configured (no scan performed)':'not configured; no photo sent.'));
 const denied=await fetch(config.url+'/functions/v1/shelfcheck',{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json',Origin:origin},body:JSON.stringify({action:'config'})});
 assert.equal(denied.status,401);
 console.log('PASS: unauthenticated function requests are rejected.');
 await a.removeSaved(saved.id);assert.equal((await a.listSaved()).some(x=>x.id===saved.id),false);
 console.log('PASS: the owner can delete a saved summary.');
}finally{
 let failed=false;
 for(const [i,backend]of backends.entries()){
  try{await backend.deleteSession();console.log('PASS: disposable guest '+(i+1)+' and its app data deleted.');}
  catch(error){failed=true;console.error('CLEANUP FAILED for disposable guest '+(i+1)+': '+error.message);}
 }
 if(failed)process.exitCode=1;
}
