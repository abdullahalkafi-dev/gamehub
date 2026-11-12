export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  createdAt: string;
}
export interface MeResponse {
  user: User;
  balance: number | null;
}
export interface RoomView {
  key: string;
  name: string;
  isGlobal: boolean;
  visibility: 'public' | 'private';
  online: number;
  capacity: number | null;
  owner: { id: string; displayName: string } | null;
  isMine: boolean;
  inviteCode?: string;
  chips?: number[];
  maxPerTarget?: number;
  timing?: { betSeconds: number; spinSeconds: number; resultSeconds: number };
}
export interface CreateRoomInput {
  name: string;
  visibility: 'public' | 'private';
  capacity: number;
  chips: number[];
  maxPerTarget: number;
  timing: { betSeconds: number; spinSeconds: number; resultSeconds: number };
}
export interface JoinResponse {
  playUrl: string;
  expiresIn: number;
  room: { key: string; name: string };
}
export interface Round {
  room: string;
  roomName: string;
  round: number | null;
  result: string[];
  bet: number;
  win: number;
  net: number;
  bets: { option: string; label?: string; amount: number; win: number }[] | null;
  time: number;
}
export interface HistoryResponse {
  rounds: Round[];
  nextBefore: number | null;
}
export interface Totals {
  rounds: number;
  wagered: number;
  won: number;
  net: number;
}
export interface Stats extends Totals {
  winRate: number;
  biggestWin: number;
  truncated: boolean;
  byRoom: (Totals & { room: string; roomName: string })[];
}
export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  baseCoins: number;
  bonusPercent: number;
  priceCents: number;
  highlight?: 'popular' | 'best-value';
}
export interface PurchaseRow {
  id: string;
  packageId: string;
  packageName: string;
  coins: number;
  priceCents: number;
  createdAt: string;
}
export interface BoardEntry {
  rank: number;
  displayName: string;
  value: number;
  rounds: number;
  biggestWin: number;
  isMe: boolean;
}
export interface Board {
  period: string;
  metric: string;
  entries: BoardEntry[];
  me: { rank: number; value: number; rounds: number } | null;
}
