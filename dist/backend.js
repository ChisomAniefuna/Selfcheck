export function createBackend(config,loadClient){
 const configured=Boolean(config.url&&config.publishableKey);
 let clientPromise,sessionPromise;
 const client=()=>clientPromise??=(async()=>{const {createClient}=await loadClient();return createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'shelfcheck-auth'}});})();
 async function authenticated(){
  if(!configured)throw Error('Supabase is not configured.');
  if(!sessionPromise)sessionPromise=(async()=>{const c=await client();const existing=await c.auth.getSession();if(existing.error)throw existing.error;if(existing.data.session)return c;const signed=await c.auth.signInAnonymously();if(signed.error)throw Error('Guest sign-in failed. Check that Anonymous Sign-Ins are enabled in Supabase.');return c;})();
  try{return await sessionPromise;}catch(e){sessionPromise=null;throw e;}
 }
 async function invoke(body,signal){const c=await authenticated();const {data,error}=await c.functions.invoke('shelfcheck',{body,signal});if(error){let message='Supabase request failed. Please retry.';try{const payload=await error.context?.json();if(payload?.error)message=payload.error;}catch{}throw Error(message);}if(data?.error)throw Error(data.error);return data;}
 return {
  configured,
  async listSaved(){const c=await authenticated();const {data,error}=await c.from('saved_decisions').select('id,product_name,decision,summary,created_at').order('created_at',{ascending:false}).limit(100);if(error)throw Error('Could not load saved decisions from Supabase. Please retry.');return data.map(r=>({id:r.id,name:r.product_name,decision:r.decision,summary:r.summary,date:new Date(r.created_at).toLocaleDateString()}));},
  async saveSaved(item){const c=await authenticated();const {data:{user},error:authError}=await c.auth.getUser();if(authError||!user)throw Error('Your session expired. Reload and try again.');const {data,error}=await c.from('saved_decisions').insert({user_id:user.id,product_name:item.name,decision:item.decision,summary:item.summary}).select('id,created_at').single();if(error)throw Error('Could not save to Supabase. Your summary is still available to download.');return {...item,id:data.id,date:new Date(data.created_at).toLocaleDateString()};},
  async removeSaved(id){const c=await authenticated();const {error}=await c.from('saved_decisions').delete().eq('id',id);if(error)throw Error('Could not delete the saved summary. Please retry.');},
  scanConfig(signal){return invoke({action:'config'},signal);},
  startScan(form,signal){form.set('action','scan');return invoke(form,signal);},
  pollScan(id,signal){return invoke({action:'poll',id},signal);},
  async deleteSession(){await invoke({action:'delete-session'});const c=await client();await c.auth.signOut({scope:'local'});sessionPromise=null;}
 };
}
