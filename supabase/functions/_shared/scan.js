export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export function validatePhoto(bytes,type){
 if(!['image/png','image/jpeg'].includes(type)||bytes.length>MAX_PHOTO_BYTES||bytes.length<24)throw Error('Choose a valid JPEG or PNG up to 10 MB.');
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let width=0,height=0;
 if(type==='image/png'){
  if(![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)||String.fromCharCode(...bytes.slice(12,16))!=='IHDR')throw Error('The file is not a supported PNG.');
  width=d.getUint32(16);height=d.getUint32(20);
 }else{
  if(bytes[0]!==255||bytes[1]!==216)throw Error('The file is not a supported JPEG.');
  let offset=2;
  while(offset+8<bytes.length){
   if(bytes[offset]!==255)break;
   const marker=bytes[offset+1];offset+=2;
   if(marker===255){offset--;continue;}
   if(marker===0xda||marker===0xd9)break;
   if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
   const size=d.getUint16(offset);if(size<2||offset+size>bytes.length)break;
   if([0xc0,0xc1,0xc2].includes(marker)){height=d.getUint16(offset+3);width=d.getUint16(offset+5);break;}
   offset+=size;
  }
 }
 if(width<480||height<480||Math.max(width,height)>4096)throw Error('Use a photo at least 480 pixels on each side, with a longest side no greater than 4096 pixels.');
 return {width,height};
}
export function normalizeObservations(value){const out=[];function walk(x,path='',depth=0){if(!x||typeof x!=='object'||depth>7)return;if(Number.isFinite(x.ui_score))out.push({name:String(x.type||x.name||path).replaceAll('_',' '),score:x.ui_score});for(const [k,a]of Object.entries(x))if(a&&typeof a==='object')walk(a,k,depth+1);}walk(value);return out.slice(0,20);}
