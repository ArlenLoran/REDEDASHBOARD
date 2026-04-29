export interface ApiResponseItem {
  DATA: string;
  QTD: number;
  ITEM: string;
  MASCARA: string;
  STATUS: string;
  USUARIO: string;
  STATUSES2: string;
}

export type DashboardTab = 
  | 'RESUMO' 
  | 'RECEBIMENTO' 
  | 'CATALOGAÇÃO' 
  | 'CARGA APP + TRIAGEM' 
  | 'SALA BATERIAS' 
  | 'SEPARAÇÃO COMPONENTES' 
  | 'MONTAGEM KIT' 
  | 'CQ' 
  | 'EXPEDIÇÃO';

export interface SummaryMetric {
  title: string;
  plannedDay: number;
  plannedToHour: number;
  realToHour: number;
  delta: number; // calculated as real - planned
  totalAvailable: number;
  deltaProduction: number;
  isLoading?: boolean;
  remainingTimeText?: string;
  baseHourlyRate?: number;
}

export interface DetailedMetric {
  label: string;
  plannedDay: number;
  plannedToHour: number;
  realToHour: number;
  delta: number;
}

export interface ChartData {
  hour: string;
  lab: number;
  rev: number;
  new: number;
  total: number;
}

export interface QualityMetric {
  label: string;
  plannedProfile: number;
  realProfile: number;
  plannedDay: number;
  trend: 'up' | 'down';
}

export interface AgeMetric {
  os: string;
  dateTime: string;
  pieces: number;
  age: string;
  pwi: string;
  psr: string;
  pcg: string;
  psk: string;
  others: string;
}
