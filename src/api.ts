import type { GameView, GameSummary, Message, User } from '../../maffia3-backend/src/contracts.ts';
import type { PhaseGuard } from '../../maffia3-backend/src/readiness.ts';
export type { GameView, GameSummary, Message, User, RoleView, PowerView, Theme } from '../../maffia3-backend/src/contracts.ts';
export const PHASES = ['Möte', 'Natt', 'Gryning', 'Morgon'];
export class ApiError extends Error {
  status:number;phaseGuard?:PhaseGuard;
  constructor(message:string,status:number,phaseGuard?:PhaseGuard){super(message);this.status=status;this.phaseGuard=phaseGuard;}
}
export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, { method, credentials: 'same-origin', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await res.json(); if (!res.ok) throw new ApiError(result.error || 'Anropet misslyckades.',res.status,result.phaseGuard); return result as T;
}
export const api = {
  session: () => request<{ user: User | null }>('/session'),
  login: (name: string, pin: string) => request<User>('/login','POST',{ name, pin }),
  logout: () => request('/logout','POST'),
  games: () => request<GameSummary[]>('/games'),
  view: (id: string, round = 0) => request<GameView>(`/games/${id}${round ? `?round=${round}` : ''}`),
  messages: (id: string, room: string) => request<Message[]>(`/games/${id}/rooms/${room}/messages`),
};
