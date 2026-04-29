import { read, utils } from 'xlsx';

export interface ConsensoData {
  INFORMACAO: string;
  PERIODO: string;
  QTD_DIARIA: number;
  [key: string]: any;
}

export async function fetchPlannedKitValue(logCallback?: (msg: string, type?: 'info' | 'error' | 'warn') => void): Promise<number> {
  const log = (msg: string, type: 'info' | 'error' | 'warn' = 'info') => {
    console.log(`[ExcelService] ${msg}`);
    if (logCallback) logCallback(msg, type);
  };

  try {
    log("Iniciando leitura do Consenso.xlsx...");
    
    // Tenta primeiro o caminho relativo ao root da app
    const fileUrl = new URL('Consenso.xlsx', window.location.href).href;
    log(`Buscando em: ${fileUrl}`);

    const response = await fetch(fileUrl);
    if (!response.ok) {
      log(`Falha ao carregar Consenso.xlsx: ${response.status} ${response.statusText}`, 'error');
      return 0;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    log(`Arquivo recebido (${arrayBuffer.byteLength} bytes). Processando workbook...`);
    
    const workbook = read(arrayBuffer, { type: 'array' });
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const data = utils.sheet_to_json(worksheet) as ConsensoData[];
    log(`Planilha lida: ${data.length} linhas encontradas.`);
    
    const filtered = data.filter(row => {
      const info = String(row.INFORMACAO || '').trim();
      const periodo = String(row.PERIODO || '').trim();
      return info === 'Montagem Kit total' && periodo === 'M+1';
    });
    
    log(`Filtro aplicado (Montagem Kit total + M+1): ${filtered.length} linhas correspondentes.`);
    
    const total = filtered.reduce((acc, row) => {
      const val = Number(row.QTD_DIARIA);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    
    log(`Soma QTD_DIARIA calculada: ${total}`);
    return total;
  } catch (error) {
    log(`Erro fatal ao processar Excel: ${String(error)}`, 'error');
    console.error(error);
    return 0;
  }
}
