import { ApiResponseItem } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

function checkConfig() {
  if (!API_URL) {
    throw new Error("VITE_API_URL não configurado nas variáveis de ambiente.");
  }
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
)
group by
trndte,
prtnum,
lotnum,
frinvs,
usr_id
fetch first 10 rows only
`;

export async function fetchApiData(): Promise<ApiResponseItem[]> {
  const body = {
    query: QUERY,
    id_score: "recebimentos_rdts"
  };

  checkConfig();
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Erro: ${response.status} ao acessar ${API_URL}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}

export async function fetchKitData(): Promise<any[]> {
  const KIT_QUERY = `
SELECT 
    TRUNC(trndte) data,
    item,
    mascara,
    SUM(quantidade) quantidade,
    status_inicial,
    status_final
FROM (
    SELECT 
        trndte,
        dtlnum,
        trndte AS data,
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
      -- AND TRUNC(trndte) = TRUNC(SYSDATE - 1) 
      AND usr_id = 'API'
)
WHERE rn = 1
  AND status_final = 'GDK - Good Disponivel KIT'
GROUP BY
    TRUNC(trndte),
    item,
    mascara,
    status_inicial,
    status_final
    fetch first 10 rows only
  `;

  const body = {
    query: KIT_QUERY,
    id_score: "recebimentos_rdts"
  };

  checkConfig();
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Erro: ${response.status} ao acessar ${API_URL}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch error Kit:", error);
    throw error;
  }
}
