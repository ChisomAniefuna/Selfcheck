// Read existing decision text only; no generated claims or microphone input.
export function decisionNarration(product,result){
 return [
  `ShelfCheck. ${product.name}. ${({hold:'Hold. Give this purchase a pause.',consider:'Consider. Worth a closer look.',skip:'Skip. You may not need another.',needs_more_info:'Need more information. A little more information first.'})[result.decision]} ${result.confidence} confidence.`,
  `What this is based on. ${result.reasons.map(r=>`${r.text} Source: ${r.source}.`).join(' ')}`,
  `What we don’t know. ${result.unknowns.join(' ')}`,
  `Your next steps. ${result.next.join(' ')}`,
  `${result.scan_used?'YouCam observations were available; the verdict uses routine data.':'No skin scan was used.'} All catalogue products are fictional samples. This is educational shopping support, not a medical diagnosis or an individual safety assessment. The final choice is yours.`
 ];
}
export function createReader({synth,Utterance,onState=()=>{}}){
 let generation=0,utterance=null,segments=[],position=0,rate=1,voice=null,status='idle',timer;
 const supported=!!(synth&&Utterance);
 const emit=(next,message)=>{status=next;onState({status,message});};
 function stop(message='Reading stopped.'){generation++;clearTimeout(timer);if(supported&&utterance)synth.cancel();utterance=null;segments=[];emit('idle',message);}
 function speakPart(token){
  if(token!==generation)return;
  if(position>=segments.length){utterance=null;emit('idle','Finished reading.');return;}
  const u=new Utterance(segments[position]);utterance=u;u.lang=voice?.lang||'en-US';u.rate=rate;if(voice)u.voice=voice;
  u.onstart=()=>{if(token!==generation)return;clearTimeout(timer);emit('speaking',`Reading section ${position+1} of ${segments.length}.`);};
  u.onend=()=>{if(token!==generation)return;clearTimeout(timer);position++;speakPart(token);};
  u.onerror=()=>{if(token!==generation)return;stop('Voice playback is unavailable. Try another voice or keep reading the text.');};
  timer=setTimeout(()=>{if(token===generation&&status==='starting')stop('The voice did not start. Try another voice or check your device’s speech settings.');},8000);
  try{synth.speak(u);}catch{stop('Voice playback is unavailable. The full text is still available below.');}
 }
 return {
  supported,
  start(texts,options={}){if(!supported){emit('unavailable','Read aloud is not supported in this browser. The full text is available below.');return;}stop('');segments=texts.filter(t=>typeof t==='string'&&t.trim());if(!segments.length)return;position=0;rate=options.rate||1;voice=options.voice||null;const token=generation;emit('starting','Preparing your voice…');synth.resume();speakPart(token);},
  pause(){if(status!=='speaking'&&status!=='starting')return;clearTimeout(timer);synth.pause();emit('paused','Reading paused.');},
  resume(){if(status!=='paused')return;synth.resume();emit('speaking',`Reading section ${position+1} of ${segments.length}.`);},
  stop,
  get status(){return status;}
 };
}
