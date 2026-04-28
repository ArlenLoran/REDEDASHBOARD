import { 
  hasSpContext, 
  spListExists, 
  spCreateList, 
  spListEnsureTextField, 
  spListEnsureNumberField,
  spListEnsureMultiLineTextField,
  spListGetItems,
  spListAddItem,
  spListUpdateItem
} from './sharepoint';

const LIST_NAME = 'ConfiguracoesApp';
const COL_DATE = 'DataUltimaAtualizacao';
const COL_INTERVAL = 'IntervaloMinutos';

// Cache and Lock Columns
const COL_CACHE_TESTE = 'CacheTesteAPI';
const COL_CACHE_KIT = 'CacheMontagemKit';
const COL_STATUS = 'StatusAtualizacao';
const COL_USER = 'UsuarioAtualizacao';
const COL_LOCK_TIME = 'DataTrava';
const COL_API_URL = 'URL_da_API';

export interface AppConfig {
  id: number;
  lastUpdate: string;
  intervalMinutes: number;
  status: string;
  lockUser: string;
  lockTime: string;
  cacheTeste: string;
  cacheKit: string;
  apiUrl: string;
}

export function getSaoPauloDate(): Date {
  return new Date(); // Return actual current Date (UTC internal)
}

function getSaoPauloISOString(): string {
  return new Date().toISOString(); // Real UTC ISO
}

export async function ensureConfigList(): Promise<void> {
  if (!hasSpContext()) return;

  const exists = await spListExists(LIST_NAME);
  if (!exists) {
    console.log(`Creating list ${LIST_NAME}...`);
    const createRes = await spCreateList(LIST_NAME);
    if (!createRes.status) {
      console.error(`Failed to create list: ${createRes.message}`);
      return;
    }
  }

  // Ensure columns
  console.log("Ensuring columns exist...");
  await Promise.all([
    spListEnsureTextField(LIST_NAME, COL_DATE),
    spListEnsureNumberField(LIST_NAME, COL_INTERVAL),
    spListEnsureMultiLineTextField(LIST_NAME, COL_CACHE_TESTE),
    spListEnsureMultiLineTextField(LIST_NAME, COL_CACHE_KIT),
    spListEnsureTextField(LIST_NAME, COL_STATUS),
    spListEnsureTextField(LIST_NAME, COL_USER),
    spListEnsureTextField(LIST_NAME, COL_LOCK_TIME),
    spListEnsureTextField(LIST_NAME, COL_API_URL)
  ]);

  // Check if we have an item, if not create one
  const items = await spListGetItems(LIST_NAME);
  if (items.status && items.data.length === 0) {
    console.log("Creating default configuration item...");
    await spListAddItem(LIST_NAME, {
      Title: 'Configuracao Geral',
      [COL_DATE]: getSaoPauloISOString(),
      [COL_INTERVAL]: 5,
      [COL_STATUS]: 'LIVRE',
      [COL_USER]: '',
      [COL_LOCK_TIME]: '',
      [COL_API_URL]: import.meta.env.VITE_API_URL || ''
    });
  }
}

export async function getAppConfig(): Promise<AppConfig | null> {
  if (!hasSpContext()) return null;

  const res = await spListGetItems<any>(LIST_NAME, {
    select: ['Id', COL_DATE, COL_INTERVAL, COL_STATUS, COL_USER, COL_LOCK_TIME, COL_CACHE_TESTE, COL_CACHE_KIT, COL_API_URL]
  });

  if (res.status && res.data.length > 0) {
    const item = res.data[0];
    return {
      id: item.Id,
      lastUpdate: item[COL_DATE] || '',
      intervalMinutes: item[COL_INTERVAL] || 5,
      status: item[COL_STATUS] || 'LIVRE',
      lockUser: item[COL_USER] || '',
      lockTime: item[COL_LOCK_TIME] || '',
      cacheTeste: item[COL_CACHE_TESTE] || '',
      cacheKit: item[COL_CACHE_KIT] || '',
      apiUrl: item[COL_API_URL] || ''
    };
  }
  return null;
}

export async function acquireLock(id: number, userEmail: string): Promise<boolean> {
  if (!hasSpContext()) return false;

  // Try to set status to ATUALIZANDO only if it was LIVRE or expired
  // SharePoint REST doesn't have a native compare-and-swap that is easy without Etag
  // but we can try to "peek" the status first.
  const config = await getAppConfig();
  if (!config) return false;

  const timeoutMinutes = Number(import.meta.env.VITE_LOCK_TIMEOUT_MINUTES) || 3;
  const lockDate = config.lockTime ? new Date(config.lockTime).getTime() : 0;
  const now = Date.now();
  const isExpired = lockDate === 0 || (now - lockDate) > timeoutMinutes * 60 * 1000;

  if (config.status === 'LIVRE' || isExpired) {
    const res = await spListUpdateItem(LIST_NAME, id, {
      [COL_STATUS]: 'ATUALIZANDO',
      [COL_USER]: userEmail,
      [COL_LOCK_TIME]: getSaoPauloISOString()
    });
    return res.status;
  }

  return false;
}

export async function releaseLock(id: number): Promise<void> {
  if (!hasSpContext()) return;
  await spListUpdateItem(LIST_NAME, id, {
    [COL_STATUS]: 'LIVRE',
    [COL_USER]: '',
    [COL_LOCK_TIME]: ''
  });
}

export async function updateApiCache(id: number, data: { teste?: string; kit?: string }): Promise<void> {
  if (!hasSpContext()) return;
  const fields: any = {
    [COL_DATE]: getSaoPauloISOString()
  };
  if (data.teste !== undefined) fields[COL_CACHE_TESTE] = data.teste;
  if (data.kit !== undefined) fields[COL_CACHE_KIT] = data.kit;

  console.log(`Atualizando cache SP (ID: ${id}) colunas:`, Object.keys(fields));
  try {
    const res = await spListUpdateItem(LIST_NAME, id, fields);
    if (!res.status) {
      console.error(`Erro SP: ${res.message}`, res);
      throw new Error(`FALHA_UPDATE_LISTA: ${res.message}`);
    }
  } catch (err) {
    console.error("Erro fatal ao atualizar SharePoint:", err);
    throw err;
  }
}
