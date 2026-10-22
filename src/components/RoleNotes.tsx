import { useState } from 'react';
import type { RoleView } from '../api.ts';
import type { Command } from './GmTable.tsx';
import { SavedField } from './SavedField.tsx';

export function RoleNotes({role,round,disabled,command}:{role:RoleView;round:number;disabled:boolean;command:Command}) {
  const [scope,setScope]=useState<'persistent'|'round'|'morning'>('persistent');
  return <div className="inline-notes">
    <div className="note-scope" role="group" aria-label={`Anteckningstyp för ${role.player}`}>
      <button type="button" aria-pressed={scope==='persistent'} className={scope==='persistent'?'selected':''} onClick={()=>setScope('persistent')}>Bestående{role.notes ? ' •' : ''}</button>
      <button type="button" aria-pressed={scope==='round'} className={scope==='round'?'selected':''} onClick={()=>setScope('round')} title="Börjar tomt nästa dygn; tidigare text finns kvar i historiken">Dygn {round}{role.roundNotes ? ' •' : ''}</button>
      <button type="button" aria-pressed={scope==='morning'} className={scope==='morning'?'selected':''} onClick={()=>setScope('morning')} title="Visas i GM:s morgonvy för det här dygnet">Morgon{role.morningNotes ? ' •' : ''}</button>
    </div>
    {/* Keep both editors mounted so switching scope cannot discard an unsaved draft. */}
    <div hidden={scope!=='persistent'}><SavedField multiline rows={2} disabled={disabled} value={role.notes} label={`Bestående anteckningar om ${role.player}`} placeholder="Föremål, tillstånd…" save={notes=>command(`/roles/${role.id}`,{notes},'PATCH')}/></div>
    <div hidden={scope!=='round'}><SavedField multiline rows={2} disabled={disabled} value={role.roundNotes} label={`Dygnsanteckningar om ${role.player}`} placeholder="Bara detta dygn…" save={roundNotes=>command(`/roles/${role.id}`,{roundNotes},'PATCH')}/></div>
    <div hidden={scope!=='morning'}><SavedField multiline rows={2} disabled={disabled} value={role.morningNotes} label={`Morgonanteckningar om ${role.player}`} placeholder="Att berätta på morgonen…" save={morningNotes=>command(`/roles/${role.id}`,{morningNotes},'PATCH')}/></div>
  </div>;
}
