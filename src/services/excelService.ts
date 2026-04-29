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
    
    // Usando URL relativa ao local do script/html para maior compatibilidade em subdiretórios (SharePoint)
    // Isso garante que se o app estiver em /sites/pages/app/index.html, ele busque em /sites/pages/app/Consenso.xlsx
    const baseUrl = window.location.href.split('?')[0].split('#')[0];
    const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
    const fileUrl = `${baseDir}Consenso.xlsx?v=${Date.now()}`;
    
    log(`Buscando em: ${fileUrl}`);

    let response = await fetch(fileUrl);
    
    if (!response.ok) {
        log(`Falha no caminho relativo (Status: ${response.status}). Tentando caminho absoluto...`, 'warn');
        const rootUrl = `/Consenso.xlsx?v=${Date.now()}`;
        const rootResponse = await fetch(rootUrl);
        if (rootResponse.ok) {
            response = rootResponse;
        } else {
            throw new Error(`Não foi possível encontrar o arquivo Consenso.xlsx em ${fileUrl} ou no root.`);
        }
    }
    
    return processResponse(response, log);
  } catch (error) {
    log(`Erro fatal ao processar Excel: ${String(error)}`, 'error');
    console.error(error);
    return 0;
  }
}

async function processResponse(response: Response, log: (msg: string, type?: 'info' | 'error' | 'warn') => void): Promise<number> {
  const contentType = response.headers.get('content-type') || '';
  
  // Se for HTML, é quase certo que é uma página de erro 404 do servidor capturada
  if (contentType.includes('text/html')) {
    log("Erro: O servidor retornou HTML em vez de Excel (provável 404 redirecionado). Verifique se o arquivo Consenso.xlsx está na pasta public.", "error");
    return 0;
  }
  
  const arrayBuffer = await response.arrayBuffer();
  
  // Arquivos XLSX são Zips, precisam ter um tamanho mínimo
  if (arrayBuffer.byteLength < 100) {
    log(`Erro: Arquivo recebido é inválido ou muito pequeno (${arrayBuffer.byteLength} bytes).`, "error");
    return 0;
  }

  log(`Arquivo recebido (${arrayBuffer.byteLength} bytes). Processando workbook...`);
  
  try {
    const workbook = read(arrayBuffer, { type: 'array' });
    
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
        throw new Error("O arquivo Excel não contém planilhas.");
    }
    
    const worksheet = workbook.Sheets[firstSheetName];
    const data = utils.sheet_to_json(worksheet) as ConsensoData[];
    log(`Planilha lida: ${data.length} linhas encontradas.`);
    
    if (data.length === 0) {
      log("Aviso: Planilha vazia ou sem dados.", "warn");
      return 0;
    }

    const filtered = data.filter(row => {
      const info = String(row.INFORMACAO || '').trim();
      const periodo = String(row.PERIODO || '').trim();
      return info === 'Montagem Kit total' && periodo === 'M+1';
    });
    
    log(`Filtro aplicado (Montagem Kit total + M+1): ${filtered.length} linhas correspondentes.`);
    
    if (filtered.length === 0) {
      log("Aviso: Nenhuma linha correspondente ao filtro (Montagem Kit total + M+1) foi encontrada no Excel.", "warn");
      return 0;
    }
    
    const total = filtered.reduce((acc, row) => {
      const val = Number(row.QTD_DIARIA);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    
    log(`Soma QTD_DIARIA calculada: ${total}`);
    return total;
  } catch (e) {
    log(`Erro ao ler formato ZIP/Excel: ${String(e)}. Verifique se o arquivo não está corrompido.`, 'error');
    return 0;
  }
}
