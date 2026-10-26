import {test} from 'node:test';import assert from 'node:assert/strict';import {compare,products as p} from '../dist/catalog.js';
test('similar moisturizer returns hold with grounded reasons',()=>{const r=compare([p[1]],p[4]);assert.equal(r.decision,'hold');assert.ok(r.reasons.length>=2);assert.match(r.reasons[0].text,/Daily Dew/);assert.equal(r.scan_used,false);});
test('unknown ingredients produce transparent insufficiency',()=>assert.equal(compare([p[1]],p[15]).decision,'needs_more_info'));
test('budget overrun pauses a new category',()=>assert.equal(compare([p[0]],p[8],{budget:20}).decision,'hold'));
test('already-owned candidate returns skip',()=>assert.equal(compare([p[0]],p[0]).decision,'skip'));
test('empty shelf retains uncertainty',()=>{const r=compare([],p[0]);assert.equal(r.confidence,'Limited');assert.ok(r.unknowns.some(s=>s.includes('empty')));});
test('catalogue contains 16 explicitly fictional entries',()=>{assert.equal(p.length,16);assert.ok(p.every(x=>x.sample&&x.source));});
