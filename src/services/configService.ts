import { 
  hasSpContext, 
  spListExists, 
  spCreateList, 
  spListEnsureTextField, 
  spListEnsureNumberField,
  spListGetItems,
  spListAddItem,
  spListUpdateItem
} from './sharepoint';

const LIST_NAME = 'ConfiguracoesApp';
const COL_DATE = 'DataUltimaAtualizacao';
const COL_INTERVAL = 'IntervaloMinutos';

export interface AppConfig {
  id: number;
  lastUpdate: string;
  intervalMinutes: number;
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
  await spListEnsureTextField(LIST_NAME, COL_DATE);
  await spListEnsureNumberField(LIST_NAME, COL_INTERVAL);

  // Check if we have an item, if not create one
  const items = await spListGetItems(LIST_NAME);
  if (items.status && items.data.length === 0) {
    console.log("Creating default configuration item...");
    await spListAddItem(LIST_NAME, {
      Title: 'Configuracao Geral',
      [COL_DATE]: new Date().toISOString(),
      [COL_INTERVAL]: 5
    });
  }
}

export async function getAppConfig(): Promise<AppConfig | null> {
  if (!hasSpContext()) return null;

  const res = await spListGetItems<any>(LIST_NAME, {
    select: ['Id', COL_DATE, COL_INTERVAL]
  });

  if (res.status && res.data.length > 0) {
    const item = res.data[0];
    return {
      id: item.Id,
      lastUpdate: item[COL_DATE] || '',
      intervalMinutes: item[COL_INTERVAL] || 5
    };
  }
  return null;
}

export async function updateLastUpdate(id: number): Promise<void> {
  if (!hasSpContext()) return;

  await spListUpdateItem(LIST_NAME, id, {
    [COL_DATE]: new Date().toISOString()
  });
}
