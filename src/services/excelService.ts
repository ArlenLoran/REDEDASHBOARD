import { read, utils } from 'xlsx';

export interface ConsensoData {
  INFORMACAO: string;
  PERIODO: string;
  QTD_DIARIA: number;
  [key: string]: any;
}

export async function fetchPlannedKitValue(): Promise<number> {
  try {
    const response = await fetch('/Consenso.xlsx');
    if (!response.ok) {
      console.warn('Consenso.xlsx não encontrado ou erro ao carregar.');
      return 0;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = read(arrayBuffer, { type: 'array' });
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const data = utils.sheet_to_json(worksheet) as ConsensoData[];
    
    // Filtros:
    // INFORMACAO == "Montagem Kit total"
    // PERIODO == "M+1"
    const filtered = data.filter(row => 
      String(row.INFORMACAO).trim() === 'Montagem Kit total' && 
      String(row.PERIODO).trim() === 'M+1'
    );
    
    const total = filtered.reduce((acc, row) => {
      const val = Number(row.QTD_DIARIA);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    
    return total;
  } catch (error) {
    console.error('Erro ao processar Consenso.xlsx:', error);
    return 0;
  }
}
