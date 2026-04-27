import { ApiResponseItem } from '../types';

const API_URL = "https://51a805d34213e248a3506f5db8fe28.55.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/655aac37bdea49b1b1221a2f37198754/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=-2l0x4h5cwmpZ20RCIbMrzaR0860ka4aB8_dDOVQQHQ";

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

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Erro: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}
