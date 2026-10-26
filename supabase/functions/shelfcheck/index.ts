import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {validatePhoto,normalizeObservations} from '../_shared/scan.js';

const base='https://yce-api-01.makeupar.com/s2s/v2.0';
const publicKey=()=>JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}').default||Deno.env.get('SUPABASE_ANON_KEY');
const secretKey=()=>JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
async function provider(path:string,body?:unknown){
 const response=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${Deno.env.get('YOUCAM_API_KEY')}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(response.status===429?'YouCam rate limit or credits exhausted. Retry later.':'YouCam could not process the request. Try a clear photo with one face.');
 return response.json();
}
async function limitedBody(req:Request,max:number){
 const reader=req.body?.getReader();if(!reader)throw Error('Request body is required.');
 const parts:Uint8Array[]=[];let total=0;
 while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>max){await reader.cancel();throw Error('Request exceeds the allowed size.');}parts.push(value);}
 const bytes=new Uint8Array(total);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;
}
Deno.serve(async req=>{
 const origin=req.headers.get('Origin')||'';
 const allowed=(Deno.env.get('ALLOWED_ORIGINS')||'').split(',').map(x=>x.trim()).filter(Boolean);
 const cors:Record<string,string>={'Vary':'Origin','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
 if(origin&&allowed.includes(origin))cors['Access-Control-Allow-Origin']=origin;
 const reply=(status:number,data:unknown)=>Response.json(data,{status,headers:cors});
 if(origin&&!allowed.includes(origin))return reply(403,{error:'This app origin is not allowed. Configure ALLOWED_ORIGINS in Supabase.'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply(405,{error:'Use POST.'});
 try{
  const url=Deno.env.get('SUPABASE_URL'),pub=publicKey(),secret=secretKey();
  if(!url||!pub||!secret)return reply(503,{error:'Supabase function keys are not configured.'});
  const auth=req.headers.get('Authorization')||'';
  if(!auth.startsWith('Bearer '))return reply(401,{error:'Sign in to a guest session first.'});
  const scoped=createClient(url,pub,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await scoped.auth.getUser(auth.slice(7));
  if(authError||!user)return reply(401,{error:'Session expired. Reload and try again.'});
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const type=req.headers.get('Content-Type')||'';
  const raw=await limitedBody(req,type.includes('multipart/form-data')?11*1024*1024:4096);
  const input=type.includes('multipart/form-data')?await new Request(req.url,{method:'POST',headers:{'Content-Type':type},body:raw}).formData():JSON.parse(new TextDecoder().decode(raw));
  const action=input instanceof FormData?input.get('action'):input.action;
  if(action==='config')return reply(200,{youcamConfigured:!!Deno.env.get('YOUCAM_API_KEY')});
  if(action==='delete-session'){
   // Cascades delete all saved_decisions and scan_jobs for this guest only.
   const {error}=await admin.auth.admin.deleteUser(user.id);
   if(error)return reply(502,{error:'Could not delete your Supabase session. Please retry; nothing has been cleared locally.'});
   return reply(200,{deleted:true});
  }
  if(!Deno.env.get('YOUCAM_API_KEY'))return reply(503,{error:'YouCam is not connected. No photo was sent to YouCam.'});
  if(action==='scan'&&input instanceof FormData){
   if(input.get('consent')!=='true')return reply(400,{error:'Explicit image consent is required.'});
   const photo=input.get('photo');if(!(photo instanceof File))return reply(400,{error:'Choose a photo first.'});
   const bytes=new Uint8Array(await photo.arrayBuffer());
   try{validatePhoto(bytes,photo.type);}catch(e){return reply(400,{error:(e as Error).message});}
   const id=crypto.randomUUID();
   const {data:reserved,error:reservationError}=await admin.rpc('reserve_scan',{p_user_id:user.id,p_job_id:id});
   if(reservationError)return reply(503,{error:'Could not reserve a scan. Check the database migration.'});
   if(!reserved)return reply(429,{error:'Please wait one minute between scans.'});
   const f=await provider('/file',{files:[{content_type:photo.type,file_name:photo.type==='image/png'?'photo.png':'photo.jpg',file_size:photo.size}]});
   const entry=(f.data?.files||f.files)?.[0],upload=entry?.requests?.[0];
   if(!entry?.file_id||!upload?.url)throw Error('Unexpected YouCam upload response. No observations were created.');
   const target=new URL(upload.url);if(target.protocol!=='https:')throw Error('Invalid provider upload destination.');
   const uploaded=await fetch(target,{method:upload.method||'PUT',headers:upload.headers||{'Content-Type':photo.type},body:bytes,signal:AbortSignal.timeout(45000)});
   if(!uploaded.ok)throw Error('Photo upload failed. Please retry later.');
   const task=await provider('/task/skin-analysis',{src_file_id:entry.file_id,dst_actions:['pore','texture','redness','moisture'],format:'json'});
   if(!task.data?.task_id)throw Error('No task identifier returned.');
   // A deletion during upload must not recreate a deleted session's task.
   const {data:stored,error}=await admin.from('scan_jobs').update({provider_task_id:task.data.task_id}).eq('id',id).eq('user_id',user.id).select('id').single();
   if(error||!stored)throw Error('The scan session was deleted or could not be saved.');
   return reply(202,{id});
  }
  if(action==='poll'){
   const id=input.id;
   if(typeof id!=='string'||!(/^[0-9a-f-]{36}$/i).test(id))return reply(400,{error:'Invalid scan identifier.'});
   const {data:job,error}=await admin.from('scan_jobs').select('id').eq('id',id).eq('user_id',user.id).gt('expires_at',new Date().toISOString()).maybeSingle();
   if(error||!job)return reply(404,{error:'Scan expired or unavailable.'});
   const {data:taskId,error:pollError}=await admin.rpc('claim_scan_poll',{p_user_id:user.id,p_job_id:id});
   if(pollError)return reply(503,{error:'Could not retrieve scan status. Please retry.'});
   if(!taskId)return reply(200,{status:'running'});
   const r=await provider(`/task/skin-analysis/${encodeURIComponent(taskId)}`),d=r.data||{},status=d.task_status||d.status;
   if(status==='success'){
    const fields=normalizeObservations(d);
    return fields.length?reply(200,{status,fields,timestamp:new Date().toISOString()}):reply(200,{status:'error',error:'No supported observation scores were returned. Continue without a scan.'});
   }
   return reply(200,status==='error'?{status,error:'YouCam could not analyze this photo. Try one clear face in even lighting.'}:{status:'running'});
  }
  return reply(400,{error:'Unknown action.'});
 }catch(e){
  // Do not return provider URLs, secrets, raw response bodies or images.
  const message=e instanceof Error?e.message:'Request failed.';
  const safe=['YouCam ','Photo upload failed.','No task identifier','Unexpected YouCam','Invalid provider','The scan session'].some(prefix=>message.startsWith(prefix));
  return reply(502,{error:safe?message:'The backend request could not complete. Retry or continue without a scan.'});
 }
});
