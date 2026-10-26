import {test} from 'node:test';import assert from 'node:assert/strict';
import {validatePhoto,normalizeObservations} from '../supabase/functions/_shared/scan.js';
function png(w,h){const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10]);bytes.set([73,72,68,82],12);const d=new DataView(bytes.buffer);d.setUint32(16,w);d.setUint32(20,h);return bytes;}
test('photo validator enforces real header dimensions and types',()=>{assert.deepEqual(validatePhoto(png(480,640),'image/png'),{width:480,height:640});assert.throws(()=>validatePhoto(png(100,640),'image/png'),/480/);assert.throws(()=>validatePhoto(png(480,5000),'image/png'),/4096/);assert.throws(()=>validatePhoto(png(480,640),'image/jpeg'),/JPEG/);});
test('normalizer returns only finite supported provider scores',()=>{assert.deepEqual(normalizeObservations({redness:{ui_score:42},pore:{ui_score:'82'},texture:{ui_score:Infinity}}),[{name:'redness',score:42}]);});
