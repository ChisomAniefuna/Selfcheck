import {build} from 'esbuild';import {mkdir} from 'node:fs/promises';
await mkdir(new URL('../dist/vendor/',import.meta.url),{recursive:true});
await build({stdin:{contents:"export { createClient } from '@supabase/supabase-js';",resolveDir:process.cwd(),sourcefile:'supabase-entry.js'},outfile:'dist/vendor/supabase.js',bundle:true,format:'esm',platform:'browser',target:['es2020'],minify:true,legalComments:'eof'});
console.log('Built the Supabase browser client.');
