import { useEffect, useState } from 'react';
import type { GameView } from '../api.ts';

export function PlayerCountdown({countdown,finished}:{countdown:NonNullable<GameView['countdown']>;finished:boolean}) {
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
  const urgent=!finished&&!countdown.paused&&seconds<=60;
  const label=finished?'Alla nattval inskickade':countdown.paused?'Nedräkning pausad':seconds===0?'Tiden är slut':urgent?'Sista minuten':'Nattval återstår';
  return <section className={`player-countdown ${finished?'complete':'pending'} ${urgent?'urgent':''} ${countdown.paused?'paused':''}`} aria-label="Nattens nedräkning">
    <div><strong role="status">{label}</strong><small>{countdown.paused?'Väntar på GM':seconds===0?'GM avslutar snart natten':finished?'Du har inga nattval kvar':'Skicka in dina återstående nattval'}</small></div>
    <b role="timer" aria-live="off">{countdown.paused?'Pausad':`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`}</b>
  </section>;
}
