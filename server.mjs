// Local static preview only. Supabase owns authentication, persistence and API calls.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('dist'),port=Number(process.env.PORT||4173);
http.createServer(async(req,res)=>{
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 try{
  if(!['GET','HEAD'].includes(req.method))return send(405,{error:'Use the Supabase backend for API requests.'});
  const url=new URL(req.url,'http://localhost');
  const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!path.startsWith(root+'/'))return send(403,{error:'Not allowed.'});
  const content=await readFile(path);
  res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json'})[extname(path)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
  res.end(req.method==='HEAD'?undefined:content);
 }catch{send(404,{error:'File not found.'});}
}).listen(port,'127.0.0.1',()=>console.log(`ShelfCheck ready at http://localhost:${port}`));
