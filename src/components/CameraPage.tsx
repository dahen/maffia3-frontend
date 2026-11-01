import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from '../api.ts';
import type { User } from '../api.ts';
import { PlayerPhoto } from './PlayerPhoto.tsx';
import type { Arrival, CheckInView } from '../../../maffia3-backend/src/checkin.ts';

async function preparePhoto(file:File):Promise<Blob>{
  if(file.size>20*1024*1024)throw new Error('Välj en bild som är mindre än 20 MB.');
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();image.src=url;await image.decode();const scale=Math.min(1,640/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const context=canvas.getContext('2d');if(!context)throw new Error('Kunde inte förbereda bilden.');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
    const result=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Kunde inte läsa bilden.')),'image/jpeg',0.82));if(result.size>512*1024)throw new Error('Bilden är för stor. Prova att ta om fotot.');return result;
  }finally{URL.revokeObjectURL(url);}
}
export function CameraPanel({user,asGm=false,onSaved}:{user:User;asGm?:boolean;onSaved?:()=>void}){
  const [info,setInfo]=useState<CheckInView|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [preview,setPreview]=useState<{url:string;blob:Blob;key:string}|null>(null);
  const [webcam,setWebcam]=useState(()=>asGm&&Boolean(navigator.mediaDevices?.getUserMedia));
  const camera=useRef<HTMLInputElement>(null);const sequence=useRef(0);const contextKey=useRef('');contextKey.current=info?.contextKey??'';
  const load=useCallback(async()=>{const ticket=++sequence.current;const data=await request<{checkin:CheckInView|null}>('/checkin'+(asGm?'?userId='+encodeURIComponent(user.id):''));if(ticket===sequence.current){setInfo(data.checkin);setLoading(false);}},[asGm,user.id]);
  useEffect(()=>{const source=new EventSource('/api/events');const update=()=>void load().catch(e=>{setError(e.message);setLoading(false);});source.addEventListener('catalog',update);source.onopen=update;const visible=()=>{if(document.visibilityState==='visible')update();};document.addEventListener('visibilitychange',visible);update();return()=>{++sequence.current;source.close();document.removeEventListener('visibilitychange',visible);};},[load]);
  useEffect(()=>{setPreview(null);},[info?.contextKey]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview.url);},[preview]);
  async function choose(file:File|undefined){if(!file||!info)return;setWebcam(false);setError('');setBusy(true);const key=info.contextKey;try{const blob=await preparePhoto(file);if(contextKey.current!==key)throw new Error('Incheckningen har ändrats. Välj fotot igen.');setPreview({blob,url:URL.createObjectURL(blob),key});}catch(e){setError(e instanceof Error?e.message:'Kunde inte läsa fotot.');}finally{setBusy(false);}}
  async function save(){if(!preview)return;setBusy(true);setError('');try{const res=await fetch('/api/checkin/photo',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'image/jpeg','X-Checkin-Context':preview.key,...(asGm?{'X-Player-Id':user.id}:{})},body:preview.blob});const result=await res.json();if(!res.ok)throw new Error(result.error??'Kunde inte spara fotot.');setInfo(result.checkin);setPreview(null);onSaved?.();}catch(e){setError(e instanceof Error?e.message:'Kunde inte spara.');}finally{setBusy(false);}}
  return <section className="camera-panel"><h1>Foto & incheckning</h1>{error&&<p className="login-error" role="alert">{error}</p>}{loading?<p>Laddar incheckningen…</p>:!info?<p>Väntar på att GM öppnar en ankomstlista. Du behöver inget startat parti för att checka in.</p>:<>
    <p className="player-help">{info.name}</p><strong>{user.name}</strong><p className={info.player.checkedIn?'checkin-ready':'player-help'} role="status">{info.player.checkedIn?'Du är incheckad.': 'Ta ett tydligt foto av ditt ansikte och checka in.'}</p>
    {webcam&&<LiveCamera onPhoto={file=>{setWebcam(false);void choose(file);}} onCancel={()=>setWebcam(false)} onError={()=>{setWebcam(false);setError('Kameran kunde inte öppnas. Kontrollera kamerabehörigheten och försök igen.');}}/>}
    {!webcam&&(preview||info.player.photoId)&&<img className="camera-preview" src={preview?.url??`/api/photos/${info.player.photoId}`} alt={`Förhandsvisning av ${user.name}s foto`}/>}
    <input ref={camera} type="file" accept="image/*" capture="user" hidden onChange={e=>{void choose(e.target.files?.[0]);e.target.value='';}}/>
    {!webcam&&!preview&&<button disabled={busy} onClick={()=>{if(asGm&&typeof navigator.mediaDevices?.getUserMedia==='function')setWebcam(true);else camera.current?.click();}}>Ta foto</button>}
    {preview&&<><button className="primary" disabled={busy} onClick={()=>void save()}>{busy?'Sparar…':info.started?'Spara nytt foto':'Använd fotot och checka in'}</button><button disabled={busy} onClick={()=>setPreview(null)}>Avbryt nytt foto</button></>}
    {!preview&&info.player.photoId&&!info.player.checkedIn&&<button className="primary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await request('/checkin/confirm','POST',{contextKey:info.contextKey,...(asGm?{userId:user.id}:{})});await load();onSaved?.();}catch(e){setError(e instanceof Error?e.message:'Kunde inte checka in.');}finally{setBusy(false);}}}>Checka in med detta foto</button>}
    <p className="player-help">{info.started?'Fotot syns för de andra deltagarna i partiet.':'Rollerna visas först när GM har valt mall, granskat fördelningen och startat partiet.'}</p>
  </>}</section>;
}
export function CameraPage({user,onLogout}:{user:User;onLogout:()=>Promise<void>}){
  return <div className={user.admin?'player-app camera-kiosk':'player-app'}><header className="player-header"><strong>MAFFIA · Incheckning</strong><a href="/">{user.admin?'Till GM-vyn':'Till partiet'}</a><button onClick={()=>void onLogout()}>Logga ut</button></header>{user.admin?<SharedCamera/>:<main className="player-content"><CameraPanel user={user}/></main>}</div>;
}
function SharedCamera(){
  const [data,setData]=useState<{name:string;rosterId:string|null;players:Arrival[]} | null>(null);const [selected,setSelected]=useState('');const [error,setError]=useState('');
  const load=useCallback(async()=>setData(await request('/checkin/camera')),[]);
  useEffect(()=>{const source=new EventSource('/api/events');const update=()=>void load().catch(e=>setError(e.message));source.addEventListener('catalog',update);source.onopen=update;update();return()=>source.close();},[load]);
  const active=data?.players.filter(player=>player.active)??[];const chosen=active.find(player=>player.id===selected);
  return <main className="camera-kiosk-content"><h1>Välkommen! Checka in här.</h1><p>Tryck på ditt namn, ta ett foto och godkänn det. Lämna sedan över till nästa person.</p>{error&&<p className="login-error" role="alert">{error}</p>}{!data?<p>Laddar namnlistan…</p>:!active.length?<p>GM öppnar en ankomstlista under Spelare. Inget parti behöver vara startat eller förberett.</p>:<><div className="camera-kiosk-status"><strong>{data.name}</strong><span>{active.filter(player=>player.checkedIn).length} / {active.length} incheckade</span></div><div className="camera-name-grid">{active.map(player=><article key={player.id} className={player.checkedIn?'arrived':''}><button className="camera-person" onClick={()=>setSelected(player.id)}><PlayerPhoto photoId={player.photoId} name={player.name}/><strong>{player.name}</strong><span>{player.checkedIn?'✓ Incheckad':'Ej incheckad · ta foto'}</span></button></article>)}</div></>}
    {chosen&&<div className="camera-modal-backdrop"><section className="camera-modal" role="dialog" aria-modal="true" aria-label={`Foto för ${chosen.name}`}><button className="camera-close" aria-label="Stäng kamera" onClick={()=>setSelected('')}>Stäng</button><CameraPanel key={chosen.id} user={{id:chosen.id,name:chosen.name,admin:false}} asGm onSaved={()=>setSelected(current=>current===chosen.id?'':current)}/></section></div>}
  </main>;
}

function LiveCamera({onPhoto,onCancel,onError}:{onPhoto:(file:File)=>void;onCancel:()=>void;onError:()=>void}){
  const video=useRef<HTMLVideoElement>(null);const [ready,setReady]=useState(false);const [count,setCount]=useState<number|null>(null);const callbacks=useRef({onPhoto,onError});callbacks.current={onPhoto,onError};
  useEffect(()=>{let cancelled=false;let stream:MediaStream|undefined;navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false}).then(media=>{if(cancelled){media.getTracks().forEach(track=>track.stop());return;}stream=media;if(video.current){video.current.srcObject=media;void video.current.play().catch(()=>callbacks.current.onError());}}).catch(()=>{if(!cancelled)callbacks.current.onError();});return()=>{cancelled=true;stream?.getTracks().forEach(track=>track.stop());};},[]);
  useEffect(()=>{if(count===null)return;if(count>0){const timer=setTimeout(()=>setCount(count-1),1000);return()=>clearTimeout(timer);}const frame=video.current;if(!frame?.videoWidth){callbacks.current.onError();return;}const canvas=document.createElement('canvas');const scale=Math.min(1,640/Math.max(frame.videoWidth,frame.videoHeight));canvas.width=Math.round(frame.videoWidth*scale);canvas.height=Math.round(frame.videoHeight*scale);const context=canvas.getContext('2d');if(!context){callbacks.current.onError();return;}context.drawImage(frame,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{if(blob)callbacks.current.onPhoto(new File([blob],'portratt.jpg',{type:'image/jpeg'}));else callbacks.current.onError();},'image/jpeg',0.82);},[count]);
  return <div className="live-camera"><div className="live-camera-frame" onClick={()=>{if(ready&&count===null)setCount(3);}}><video ref={video} autoPlay muted playsInline onLoadedData={()=>setReady(true)}/>{count!==null&&<strong className="live-camera-count">{count||'✓'}</strong>}</div><div className="camera-actions"><button disabled={!ready||count!==null} onClick={()=>setCount(3)}>{count!==null?'Fotograferar…':ready?'Ta bilden · 3 sek':'Startar kameran…'}</button><button onClick={onCancel}>Avbryt kamera</button></div></div>;
}
