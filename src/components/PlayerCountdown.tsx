import { useEffect, useState } from 'react';
import type { GameView } from '../api.ts';

export function PlayerCountdown({countdown}:{countdown:NonNullable<GameView['countdown']>}) {
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{
    const update=()=>setNow(Date.now());update();
    if(countdown.paused)return;
    const timer=setInterval(update,1000);
    const visible=()=>{if(document.visibilityState==='visible')update();};
    document.addEventListener('visibilitychange',visible);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[countdown.deadline,countdown.paused]);
  const seconds=Math.max(0,Math.ceil((Date.parse(countdown.deadline)-now)/1000));
  const urgent=!countdown.paused&&seconds<=60;
  const label=countdown.paused?'Nedräkning pausad':seconds===0?'Tiden är slut':urgent?'Sista minuten':'Nattens nedräkning';
  return <section className={`player-countdown ${urgent?'urgent':''} ${countdown.paused?'paused':''}`} aria-label="Nattens nedräkning">
    <div><strong role="status">{label}</strong><small>{countdown.paused?'Väntar på GM':seconds===0?'GM avslutar natten':'Tid kvar för nattens handlingar'}</small></div>
    <b role="timer" aria-live="off">{countdown.paused?'Pausad':`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`}</b>
  </section>;
}
