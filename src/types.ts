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
