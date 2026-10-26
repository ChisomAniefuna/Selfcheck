import {writeFile} from 'node:fs/promises';
const url=process.env.SUPABASE_URL||'',publishableKey=process.env.SUPABASE_PUBLISHABLE_KEY||'';
if(!url||!publishableKey)throw Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in your local .env first.');
const parsed=new URL(url);if(parsed.protocol!=='https:'&&!(parsed.protocol==='http:'&&['127.0.0.1','localhost'].includes(parsed.hostname)))throw Error('Use HTTPS, or HTTP for local Supabase only.');
if(!publishableKey.startsWith('sb_publishable_'))throw Error('Use a Supabase publishable key (sb_publishable_...), never a secret or service-role key.');
await writeFile(new URL('../dist/config.js',import.meta.url),`// Public Supabase configuration. RLS protects user data.\nexport const supabaseConfig = ${JSON.stringify({url:parsed.origin,publishableKey})};\n`);
console.log('Public Supabase configuration written. No server secrets were copied.');
