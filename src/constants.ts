import { SummaryMetric, ChartData } from './types';

export const COLORS = {
  dhlYellow: '#FFCC00',
  dhlRed: '#D40511',
  redeOrange: '#FF6600',
  red: '#FF0000',
  green: '#008000',
  bgGrey: '#E5E5E5',
  cardBg: '#CCCCCC',
  cardSubBg: '#B3B3B3',
  headerDark: '#D35400',
};

export const MOCK_SUMMARY_DATA: Record<string, SummaryMetric> = {
  'Teste API': {
    title: 'Teste API',
    plannedDay: 0,
    plannedToHour: 0,
    realToHour: 0,
    delta: 0,
    totalAvailable: 0,
    deltaProduction: 0,
    isLoading: false,
  },
  'RECEBIMENTO': {
    title: 'RECEBIMENTO',
    plannedDay: 3860,
    plannedToHour: 1178,
    realToHour: 1300,
    delta: -545,
    totalAvailable: 3900,
    deltaProduction: 40,
  },
  'CATALOGAÇÃO': {
    title: 'CATALOGAÇÃO',
    plannedDay: 3259,
    plannedToHour: 2145,
    realToHour: 2400,
    delta: 255,
    totalAvailable: 3900,
    deltaProduction: 40,
  },
  'TRIAGEM FUNCIONAL': {
    title: 'TRIAGEM FUNCIONAL',
    plannedDay: 3860,
    plannedToHour: 1178,
    realToHour: 1300,
    delta: 122,
    totalAvailable: 3900,
    deltaProduction: 40,
  },
  'CARGA DE APP': {
    title: 'CARGA DE APP',
    plannedDay: 3860,
    plannedToHour: 1178,
    realToHour: 1300,
    delta: 122,
    totalAvailable: 3900,
    deltaProduction: 40,
  },
  'SALA DE BATERIAS': {
    title: 'SALA DE BATERIAS',
    plannedDay: 3860,
    plannedToHour: 1178,
    realToHour: 1300,
    delta: 122,
    totalAvailable: 3900,
    deltaProduction: 40,
  },
  'MONTAGEM KIT': {
    title: 'MONTAGEM KIT',
    plannedDay: 3860,
    plannedToHour: 1178,
    realToHour: 1300,
    delta: 122,
    totalAvailable: 3900,
    deltaProduction: 40,
  },
  'CQ': {
    title: 'CQ',
    plannedDay: 3860,
    plannedToHour: 1178,
    realToHour: 1300,
    delta: 122,
    totalAvailable: 3900,
    deltaProduction: 40,
  },
  'EXPEDIÇÃO': {
    title: 'EXPEDIÇÃO',
    plannedDay: 3860,
    plannedToHour: 1178,
    realToHour: 1300,
    delta: 122,
    totalAvailable: 3900,
    deltaProduction: 40,
  },
};

export const MOCK_CHART_DATA: ChartData[] = [
  { hour: '06h - 07h', lab: 400, rev: 300, new: 500, total: 1200 },
  { hour: '07h - 08h', lab: 350, rev: 400, new: 450, total: 1100 },
  { hour: '08h - 09h', lab: 300, rev: 350, new: 400, total: 950 },
  { hour: '09h - 10h', lab: 450, rev: 500, new: 550, total: 1500 },
  { hour: '10h - 11h', lab: 500, rev: 400, new: 600, total: 1600 },
];

export const MOCK_QUALITY_DATA = [
  { label: 'LIBERADO TRIAGEM', plannedProfile: 80, realProfile: 85, plannedDay: 5, trend: 'up' },
  { label: 'DESCARTE', plannedProfile: 12, realProfile: 6, plannedDay: 6, trend: 'down' },
  { label: 'DOA', plannedProfile: 8, realProfile: 9, plannedDay: 1, trend: 'up' },
  { label: 'EXCEÇÃO', plannedProfile: 8, realProfile: 9, plannedDay: 1, trend: 'up' },
];

export const MOCK_AGE_DATA = [
  { os: 'OS001', dateTime: '27/04 08:30', pieces: 150, age: '10h', pwi: 'OK', psr: 'OK', pcg: 'OK', psk: 'OK', others: '-' },
  { os: 'OS002', dateTime: '27/04 09:15', pieces: 85, age: '22h', pwi: 'OK', psr: 'OK', pcg: 'PEND', psk: 'OK', others: '-' },
  { os: 'OS003', dateTime: '26/04 14:20', pieces: 300, age: '40h', pwi: 'OK', psr: 'FAIL', pcg: 'OK', psk: 'OK', others: 'Peça falta' },
];
