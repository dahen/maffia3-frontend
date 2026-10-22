import { useEffect, useRef } from 'react';
import type { GameView } from '../api.ts';
import { PHASES } from '../api.ts';
import { phaseReadiness, type PhaseGuard } from '../../../maffia3-backend/src/readiness.ts';

export function PhaseStatus({view,busy,onNext,onPending}:{view:GameView;busy:boolean;onNext:(phase:number)=>void;onPending:()=>void}) {
  const status=phaseReadiness(view.game.phase,view.roles);
  if(!status||view.viewedRound!==view.game.round)return null;
  const ready=status.missingCount===0;
  return <div className={`phase-status ${ready?'phase-complete':'phase-pending'}`}>
    <div role="status" aria-live="polite"><strong>{ready ? status.kind==='actions'?'✓ Alla natthandlingar är inskickade':'✓ Alla GM-besked är sparade' : `${status.missingCount} ${status.kind==='actions'?'val':'GM-besked'} återstår för ${status.pending.length} spelare`}</strong><span>{ready?`Klart att byta till ${PHASES[status.nextPhase]}.`:'Kontrollera det som saknas innan du byter fas.'}</span></div>
    {ready?<button className="phase-advance" disabled={busy} onClick={()=>onNext(status.nextPhase)}>Till {PHASES[status.nextPhase]} →</button>:<button className="show-pending" onClick={onPending}>Visa återstående</button>}
  </div>;
}

export function PhaseChangeDialog({guard,busy,onCancel,onContinue}:{guard:PhaseGuard;busy:boolean;onCancel:()=>void;onContinue:()=>void}) {
  const dialog=useRef<HTMLElement>(null);const cancel=useRef<HTMLButtonElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;cancel.current?.focus();return()=>previous?.focus();},[]);
  return <div className="modal-backdrop"><section className="phase-warning" ref={dialog} role="alertdialog" aria-modal="true" aria-labelledby="phase-warning-title" aria-describedby="phase-warning-description" onKeyDown={e=>{
    if(e.key==='Escape'){e.preventDefault();onCancel();}
    if(e.key==='Tab'){
      const buttons=Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]);const first=buttons[0];const last=buttons.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }
  }}><h2 id="phase-warning-title">{guard.kind==='actions'?'Natthandlingar saknas':guard.kind==='responses'?'GM-besked saknas':'Spelarval och GM-besked saknas'}</h2><p id="phase-warning-description">Du är på väg att byta till <strong>{PHASES[guard.toPhase]}</strong>, men {guard.missingCount} {guard.kind==='actions'?'val':guard.kind==='responses'?'besked':'val/besked'} återstår:</p>
    <ul>{guard.pending.map(role=><li key={role.roleId}><strong>{role.player}</strong><span>{role.powers.map(p=>p.name).join(', ')}</span></li>)}</ul>
    <p className="help">Om du går vidare ändå sparas det i partiloggen.</p><div className="phase-warning-buttons"><button ref={cancel} className="primary" disabled={busy} onClick={onCancel}>Stanna i {PHASES[guard.fromPhase]}</button><button className="override-phase" disabled={busy} onClick={onContinue}>Byt till {PHASES[guard.toPhase]} ändå</button></div>
  </section></div>;
}
