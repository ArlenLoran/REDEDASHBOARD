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
    
    // Lista de URLs para tentar encontrar o arquivo
    const urls = [
      `/Consenso.xlsx?v=${Date.now()}`,
      `./Consenso.xlsx?v=${Date.now()}`,
      `/consenso.xlsx?v=${Date.now()}`,
      `Consenso.xlsx?v=${Date.now()}`,
      `consenso.xlsx?v=${Date.now()}`,
      `${window.location.origin}/Consenso.xlsx?v=${Date.now()}`,
    ];

    log(`Iniciando busca do Consenso.xlsx em ${urls.length} localizações possíveis...`);

    let lastResponse: Response | null = null;

    for (const url of urls) {
      try {
        log(`Tentando: ${url}`);
        const response = await fetch(url);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (!contentType.includes('text/html')) {
            log(`Sucesso! Arquivo encontrado em: ${url}`);
            return processResponse(response, log);
          } else {
            log(`Aviso: ${url} retornou HTML (provavelmente 404 redirecionado).`, 'warn');
          }
        } else {
          log(`Falha: ${url} retornou status ${response.status}`, 'warn');
        }
        lastResponse = response;
      } catch (e) {
        log(`Erro ao tentar ${url}: ${String(e)}`, 'warn');
      }
    }

    log("Erro: Não foi possível encontrar o arquivo Consenso.xlsx em nenhuma das localizações tentadas.", "error");
    return 0;
  } catch (error) {
    log(`Erro fatal ao processar Excel: ${String(error)}`, 'error');
    console.error(error);
    return 0;
  }
}

async function processResponse(response: Response, log: (msg: string, type?: 'info' | 'error' | 'warn') => void): Promise<number> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    log("Aviso: O servidor retornou HTML em vez do arquivo Excel. Isso sugere que o arquivo Consenso.xlsx não foi encontrado (404 redirecionado para index.html).", "error");
    return 0;
  }
  
  const arrayBuffer = await response.arrayBuffer();
  log(`Arquivo recebido (${arrayBuffer.byteLength} bytes). Processando workbook...`);
  
  const workbook = read(arrayBuffer, { type: 'array' });
  
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const data = utils.sheet_to_json(worksheet) as ConsensoData[];
  log(`Planilha lida: ${data.length} linhas encontradas.`);
  
  if (data.length === 0) {
    throw new Error("Planilha vazia ou sem dados válidos.");
  }

  const filtered = data.filter(row => {
    const info = String(row.INFORMACAO || '').trim();
    const periodo = String(row.PERIODO || '').trim();
    return info === 'Montagem Kit total' && periodo === 'M+1';
  });
  
  log(`Filtro aplicado (Montagem Kit total + M+1): ${filtered.length} linhas correspondentes.`);
  
  if (filtered.length === 0) {
    log("Aviso: Nenhuma linha correspondente ao filtro foi encontrada no Consenso.xlsx", "warn");
    return 0;
  }
  
  const total = filtered.reduce((acc, row) => {
    const val = Number(row.QTD_DIARIA);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);
  
  log(`Soma QTD_DIARIA calculada: ${total}`);
  return total;
}
