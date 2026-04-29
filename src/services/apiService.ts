import { ApiResponseItem } from '../types';

const DEFAULT_API_URL = import.meta.env.VITE_API_URL;

function getUrl(override?: string) {
  const url = override || DEFAULT_API_URL;
  if (!url) {
    throw new Error("API URL não configurado. Verifique as configurações no SharePoint ou variáveis de ambiente.");
  }
  return url;
}

const QUERY = `
select 
trndte as data,
sum(trnqty) as qtd,
prtnum as item,
lotnum as mascara,
frinvs as status,
case 
    when usr_id = 'API' then 'CATALOGACAO'
    else usr_id 
end as usuario,
case 
    when frinvs in('GKI','TKI') then 'Work Order'
    when frinvs not in('GKI','TKI') then frinvs
end as statuses2
from (
    select
        trndte,
        trnqty,
        prtnum,
        lotnum,
        frinvs,
        usr_id
    from dlytrn
    where actcod in('RCV')
      and fr_arecod like 'RDTS'
      and trndte >= CURRENT_DATE - 1

    union all

    select
        trndte,
        trnqty,
        prtnum,
        lotnum,
        frinvs,
        usr_id
    from dlytrn
    where actcod in('IDNTFY','RCV')
      and usr_id = 'API'
      and trndte >= CURRENT_DATE - 1
)
group by
trndte,
prtnum,
lotnum,
frinvs,
usr_id
fetch first 500 rows only
`;

export async function fetchApiData(urlOverride?: string): Promise<ApiResponseItem[]> {
  const url = getUrl(urlOverride);
  const body = {
    query: QUERY,
    id_score: "recebimentos_rdts"
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Erro: ${response.status} ao acessar ${url}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}

export async function fetchKitData(urlOverride?: string): Promise<any[]> {
  const KIT_QUERY = `
SELECT 
    TO_CHAR(trndte, 'DD/MM/YYYY HH24:MI:SS') AS data,
    item,
    mascara,
    SUM(quantidade) quantidade,
    status_inicial,
    status_final
FROM (
    SELECT 
        trndte,
        dtlnum,
        prtnum AS item,
        lotnum AS mascara,
        trnqty AS quantidade,
        dscmst.lngdsc AS status_inicial,
        dscmst2.lngdsc AS status_final,
        ROW_NUMBER() OVER (
            PARTITION BY dtlnum
            ORDER BY trndte DESC
        ) AS rn
    FROM dlytrn
    INNER JOIN dscmst 
        ON dscmst.colval = dlytrn.frinvs 
       AND dscmst.locale_id = 'US_ENGLISH' 
       AND dscmst.colnam = 'invsts' 
    INNER JOIN dscmst dscmst2 
        ON dscmst2.colval = dlytrn.toinvs 
       AND dscmst2.locale_id = 'US_ENGLISH' 
       AND dscmst2.colnam = 'invsts'
    WHERE actcod = 'INVSTSCHG' 
      AND dlytrn.frinvs IN ('GKI','TKI') 
      AND dlytrn.toinvs IN ('GDK','GGRK','TRRK') 
      AND usr_id = 'API'
      AND trndte >= CURRENT_DATE - 1
)
WHERE rn = 1
  AND status_final = 'GDK - Good Disponivel KIT'
GROUP BY
    TO_CHAR(trndte, 'DD/MM/YYYY HH24:MI:SS'),
    item,
    mascara,
    status_inicial,
    status_final
ORDER BY
    data ASC
  `;

  const body = {
    query: KIT_QUERY,
    id_score: "recebimentos_rdts"
  };

  const url = getUrl(urlOverride);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Erro: ${response.status} ao acessar ${url}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch error Kit:", error);
    throw error;
  }
}
