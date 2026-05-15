export const SECTORS = [
  'Dirección de Sede',
  'Nivel Inicial',
  'Nivel Primario',
  'Tecnología',
  'DOE',
  'Mantenimiento',
  'Capital Humano',
] as const;

export type Sector = (typeof SECTORS)[number];

export interface Visitor {
  id: number;
  firstName: string;
  lastName: string;
  dni: string;
  sector: string;
  photoBase64: string | null;
  entryTime: string;
  exitTime: string | null;
  createdAt: string;
}

export interface Movement {
  visitorId: number;
  firstName: string;
  lastName: string;
  sector: string;
  type: 'entry' | 'exit';
  time: string;
}

export interface Stats {
  currentlyInside: number;
  entriesToday: number;
  exitsToday: number;
  totalVisitors: number;
  last7Days: Array<{ date: string; entries: number; exits: number }>;
}

export interface DashboardFilters {
  from: string;
  to: string;
  sector: string;
  status: 'all' | 'inside' | 'left';
}

export interface VisitorWithoutExit {
  id: number;
  firstName: string;
  lastName: string;
  dni: string;
  sector: string;
  entryTime: string;
  elapsedMinutes: number;
}

export interface DashboardData {
  summary: {
    currentlyInside: number;
    entriesToday: number;
    exitsToday: number;
    totalVisitors: number;
    withoutExit: number;
    avgStayToday: number | null;
  };
  bySector: Array<{ sector: string; entries: number }>;
  byHour: Array<{ hour: number; entries: number }>;
  avgStay: {
    overall: number | null;
    bySector: Array<{ sector: string; avgMinutes: number | null }>;
  };
  withoutExit: VisitorWithoutExit[];
  byWeekday: Array<{ weekday: string; entries: number }>;
  sectorRanking: Array<{ sector: string; entries: number }>;
  entriesVsExits: Array<{ date: string; entries: number; exits: number }>;
  recentMovements: Movement[];
  history: Visitor[];
}
