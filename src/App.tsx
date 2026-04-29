/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { DashboardTab, SummaryMetric } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SummaryView from './components/SummaryView';
import DetailedView from './components/DetailedView';
import { MOCK_SUMMARY_DATA } from './constants';
import { fetchApiData, fetchKitData } from './services/apiService';
import { fetchPlannedKitValue } from './services/excelService';
import { hasSpContext } from './services/sharepoint';
import { Activity } from 'lucide-react';
import { ensureConfigList, getAppConfig, acquireLock, releaseLock, updateApiCache, AppConfig, getSaoPauloDate } from './services/configService';

export default function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('RESUMO');
  const [summaryData, setSummaryData] = useState<Record<string, SummaryMetric>>(() => {
    const initial = { ...MOCK_SUMMARY_DATA };
    const cached = localStorage.getItem('cockpit_summary_data');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        Object.keys(parsed).forEach(k => {
          if (initial[k]) {
            initial[k] = { 
              ...initial[k], 
              ...parsed[k], 
              isLoading: false 
            };
          }
        });
        return initial;
      } catch (e) {
        return initial;
      }
    }
    return initial;
  });
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(() => {
    return Number(import.meta.env.VITE_DEFAULT_REFRESH_MINUTES) || 5;
  });
  const [configItemId, setConfigItemId] = useState<number | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(getSaoPauloDate());
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [logs, setLogs] = useState<{timestamp: string, message: string, type: 'error' | 'info' | 'warn'}[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const formatTimeSP = (date: Date) => {
    try {
      return date.toLocaleTimeString('pt-BR', { 
        hour12: false, 
        timeZone: 'America/Sao_Paulo' 
      });
    } catch (e) {
      return date.toLocaleTimeString('pt-BR', { hour12: false });
    }
  };

  const addLog = (message: string, type: 'error' | 'info' | 'warn' = 'info') => {
    const timestamp = formatTimeSP(new Date());
    setLogs(prev => [{timestamp, message, type}, ...prev].slice(0, 50));
  };

  const isDebugEnabled = import.meta.env.VITE_SHOW_DEBUG_LOGS !== 'false' || (typeof window !== 'undefined' && window.location.search.includes('debug=true'));

  function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 180000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error('TIMEOUT'));
        }, timeoutMs);
      })
    ]);
  }

  const API_KEYS = ['Teste API', 'MONTAGEM KIT'];

  const updateStateWithCalculatedResults = (results: { teste?: any; kit?: any; kitPlanned?: number }) => {
    addLog(`Atualizando estado com: ${JSON.stringify(results)}`);
    setSummaryData(prev => {
      const next = { ...prev };
      
      if (results.teste) {
        const { totalQtd } = results.teste;
        next['Teste API'] = {
          ...next['Teste API'],
          plannedDay: totalQtd,
          plannedToHour: Math.floor(totalQtd * 0.4),
          realToHour: Math.floor(totalQtd * 0.45),
          delta: Math.floor(totalQtd * 0.05),
          totalAvailable: totalQtd,
          isLoading: false,
        };
      }

        if (results.kit || results.kitPlanned !== undefined) {
          const kitMetric = next['MONTAGEM KIT'];
          
          // Só atualiza se recebermos dados válidos ou se for uma atualização de meta deliberada
          const totalDisp = (results.kit && results.kit.totalDisp !== undefined) ? results.kit.totalDisp : (kitMetric.totalAvailable || MOCK_SUMMARY_DATA['MONTAGEM KIT'].totalAvailable);
          const hourlyReal = (results.kit && results.kit.hourlyReal !== undefined) ? results.kit.hourlyReal : (kitMetric.realToHour || MOCK_SUMMARY_DATA['MONTAGEM KIT'].realToHour);
          const pDay = results.kitPlanned ?? results.kit?.plannedValue ?? kitMetric.plannedDay;
          
          if (pDay <= 0 && kitMetric.plannedDay > 0) {
            addLog("Meta do Dia recebida como 0 ou nula - mantendo valor anterior.", "error");
          }
          
          let finalPlannedDay = (pDay > 0) ? pDay : kitMetric.plannedDay;
          if (finalPlannedDay <= 0) {
            finalPlannedDay = MOCK_SUMMARY_DATA['MONTAGEM KIT'].plannedDay || 3860;
          }
          
          if (isDebugEnabled && finalPlannedDay <= 0) {
            addLog("Crítico: finalPlannedDay ainda é 0 mesmo com fallback!", "error");
          }

        // Definição da Janela: 05:20 até 23:00
        const startHour = 5 + 20 / 60; // 5.333
        const endHour = 23;
        const windowDuration = endHour - startHour; // 17.666 horas de janela operacional
        
        // Tempo de Trabalho Real: 2 turnos de 06:39 (6.65h) = 13.3h
        const totalWorkHours = 13.3;
        
        const now = getSaoPauloDate();
        const currentHourDecimal = now.getHours() + (now.getMinutes() / 60);
        
        // Horas decorridas na janela operacional (entre 0 e 17.666)
        const windowElapsed = Math.max(0, Math.min(windowDuration, currentHourDecimal - startHour));
        
        // Janela total restante no relógio (até as 23:00)
        const remainingWindow = Math.max(0, windowDuration - windowElapsed);
        
        // Proporção de tempo de trabalho: Convertendo horas de relógio em horas produtivas (13.3 / 17.6)
        const workToWindowRatio = totalWorkHours / windowDuration;
        const elapsedWorkHours = windowElapsed * workToWindowRatio;
        const remainingWorkHours = remainingWindow * workToWindowRatio; 
        
        const kitPlannedValue = finalPlannedDay;

        // 2. Expectativa Acumulada (O que já deveria estar pronto de forma linear):
        const hourlyRateBase = kitPlannedValue ? (kitPlannedValue / totalWorkHours) : 0;
        const expectedAccumulated = Math.floor(hourlyRateBase * elapsedWorkHours);
        
        // 3. Delta (Status Atual): Apenas do tempo que já passou.
        // Diferença entre o que fiz (totalDisp) e o que deveria ter feito (expectedAccumulated).
        const deltaResult = totalDisp - expectedAccumulated;

        // 4. Plan. Hor. (Taxa de Recuperação): 
        // Meta restante dividida pelo tempo de turno que ainda resta.
        let recoveryRate = 0;
        if (remainingWorkHours > 0.05) { 
          recoveryRate = Math.ceil(Math.max(0, kitPlannedValue - totalDisp) / remainingWorkHours);
        }
        
        // 5. Tempo Restante e Meta Base
        const remHours = Math.floor(remainingWorkHours);
        const remMinutes = Math.round((remainingWorkHours - remHours) * 60);
        // Garante que não mostre negativo se passar das 23:00
        const remainingTimeText = remainingWorkHours > 0 ? `${remHours}h ${remMinutes}m` : '0h 0m';
        const baseHourlyRate = Math.floor(hourlyRateBase);
        
        const rToHour = hourlyReal; 
        
        addLog(`KIT LOGIC: Delta(${deltaResult}) | RecoveryRate(${recoveryRate})/h | Restante(${remainingTimeText})`);
        
        /**
         * DETALHAMENTO DO CÁLCULO - MONTAGEM KIT (DINÂMICO)
         * - plannedDay: Meta total do dia.
         * - plannedToHour: "Taxa de Recuperação" (O que falta / Tempo restante).
         * - delta: "Status do Passado" (Produzido Total - O que deveria ter sido feito até agora).
         */

        next['MONTAGEM KIT'] = {
          ...next['MONTAGEM KIT'],
          totalAvailable: totalDisp,
          isLoading: false,
          plannedDay: kitPlannedValue,
          plannedToHour: recoveryRate,
          realToHour: rToHour,
          delta: deltaResult,
          deltaProduction: deltaResult,
          remainingTimeText: remainingTimeText,
          baseHourlyRate: baseHourlyRate
        };
      }

      localStorage.setItem('cockpit_summary_data', JSON.stringify(next));
      return next;
    });
  };

  const loadApiData = async (key?: string) => {
    addLog(`loadApiData(key=${key || 'global'}) chamada.`);
    const keysToUpdate = (key ? [key] : Object.keys(summaryData))
      .filter(k => API_KEYS.includes(k) && !summaryData[k].isLoading);

    // Ensure mock cards are NEVER in loading state
    setSummaryData(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (!API_KEYS.includes(k)) {
          next[k] = { ...next[k], isLoading: false };
        }
      });
      return next;
    });

    if (keysToUpdate.length === 0) return;

    addLog(`Iniciando atualização: ${keysToUpdate.join(', ')}`);

    // Set targeted keys to loading
    setSummaryData(prev => {
      const next = { ...prev };
      keysToUpdate.forEach(k => {
        next[k] = { ...next[k], isLoading: true };
      });
      return next;
    });

    try {
      if (hasSpContext()) {
        addLog("Buscando configurações no SharePoint...");
        let config = await withTimeout(getAppConfig(), 8000).catch(e => {
          addLog(`Erro ao buscar config: ${String(e)}`, 'error');
          return null;
        });
        
        if (!config) {
          addLog("Configuração não encontrada no SP, tentando forçar criação...");
          await ensureConfigList();
          config = await getAppConfig();
        }

        if (config) {
          addLog(`Configuração SP ativa (ID: ${config.id}).`);
          const last = new Date(config.lastUpdate);
          const now = new Date();
          const diffSeconds = (now.getTime() - last.getTime()) / 1000;
          const intervalSeconds = (config.intervalMinutes || 5) * 60;

          if (!key) {
            setLastUpdateTime(last);
            const remaining = Math.max(0, Math.ceil(intervalSeconds - diffSeconds));
            setSecondsUntilRefresh(remaining);
            addLog(`Próxima atualização em ${remaining}s (Sync SP)`);
          }

          const isExpired = diffSeconds >= intervalSeconds || diffSeconds < 0;
          const isManualApiClick = key && API_KEYS.includes(key);

          // If cache is fresh and not manual click, load from cache columns
          if (!isExpired && !isManualApiClick) {
            addLog("Cache do SharePoint ainda é válido.");
            try {
              const res: any = {};
              if (config.cacheTeste && config.cacheTeste.length > 2) {
                res.teste = JSON.parse(config.cacheTeste);
              }
              if (config.cacheKit && config.cacheKit.length > 2) {
                const kitObj = JSON.parse(config.cacheKit);
                res.kit = kitObj;
                addLog(`Cache Kit carregado. Planejado: ${kitObj.plannedValue || 'N/A'}`);
              }
              
              if (res.teste || res.kit) {
                updateStateWithCalculatedResults(res);
                addLog("Dados carregados do cache do SharePoint");
                return; // Early return, finally will clear isLoading
              } else {
                addLog("Colunas de cache do SP vazias. Forçando busca na API.");
                // Fall through to update logic
              }
            } catch (e) {
              addLog(`Erro ao ler cache SP: ${String(e)}`, 'error');
            }
          }

          // Need update: Try to get lock
          const userMail = (window as any)._spPageContextInfo?.userEmail || "Desconhecido";
          addLog(`Obtendo trava para ${userMail}...`);
          const locked = await withTimeout(acquireLock(config.id, userMail), 8000);

          if (locked) {
            try {
              if (!config.apiUrl) {
                addLog("AVISO: URL da API não está preenchida na lista SharePoint (ConfiguracoesApp).", "error");
                // Allow fallback to env var if available
              }
              addLog(`Buscando dados externos do servidor...`);
              const plannedKitPromise = fetchPlannedKitValue(addLog);
              const [apiData, kitData, kitPlanned] = await Promise.all([
            withTimeout(fetchApiData(config.apiUrl), 45000),
            withTimeout(fetchKitData(config.apiUrl), 45000),
            withTimeout(plannedKitPromise, 45000)
          ]);

              const rawApi = Array.isArray(apiData) ? apiData : ((apiData as any)?.value || []);
              const rawKit = Array.isArray(kitData) ? kitData : ((kitData as any)?.value || []);

              const nowBR = getSaoPauloDate();
              const day = String(nowBR.getDate()).padStart(2, '0');
              const month = String(nowBR.getMonth() + 1).padStart(2, '0');
              const yearFull = nowBR.getFullYear();
              const yearShort = String(yearFull).slice(-2);
              
              const todayStrFull = `${day}/${month}/${yearFull}`;
              const todayStrShort = `${day}/${month}/${yearShort}`;
              const currentH = nowBR.getHours();

              // Filtro para TESTE (Data vem como string ISO ou similar do banco)
              const rawApiFiltered = rawApi.filter((item: any) => {
                const dStr = item.DATA ?? item.data;
                if (!dStr) return false;
                const d = new Date(dStr);
                return d.toLocaleDateString('pt-BR') === todayStrFull;
              });

              // Filtro para KIT mais flexível (aceita DD/MM/YYYY ou DD/MM/YY)
              const rawKitToday = rawKit.filter((item: any) => {
                const dStr = String(item.DATA ?? item.data ?? '').trim();
                return dStr.startsWith(todayStrFull) || dStr.startsWith(todayStrShort);
              });

              const testeCalculated = {
                totalQtd: rawApiFiltered.reduce((acc: number, item: any) => acc + Number(item.QTD ?? item.qtd ?? 0), 0)
              };
              
              const kitCalculated = {
                totalDisp: rawKitToday.reduce((acc: number, item: any) => acc + Number(item.QUANTIDADE ?? item.quantidade ?? 0), 0),
                plannedValue: kitPlanned,
                hourlyReal: rawKitToday.filter((item: any) => {
                  const dStr = item.DATA ?? item.data;
                  const m = String(dStr).match(/\d{2}\/\d{2}\/\d{2,4} (\d{2}):/);
                  return m ? parseInt(m[1], 10) === currentH : false;
                }).reduce((acc: number, item: any) => acc + Number(item.QUANTIDADE ?? item.quantidade ?? 0), 0)
              };

              addLog(`AUDIT KIT: Meta=${kitPlanned}, ProduzidoToday=${kitCalculated.totalDisp}, HoraAtualProd=${kitCalculated.hourlyReal}`);
              await withTimeout(updateApiCache(config.id, {
                teste: JSON.stringify(testeCalculated),
                kit: JSON.stringify(kitCalculated)
              }), 8000);

              updateStateWithCalculatedResults({ teste: testeCalculated, kit: kitCalculated });
              
              if (!key) {
                setLastUpdateTime(new Date());
                setSecondsUntilRefresh(config.intervalMinutes * 60);
              }
              addLog("Ciclo de atualização SP concluído");
            } catch (err) {
              addLog(`Erro no processo SP: ${String(err)}`, 'error');
              throw err;
            } finally {
              await releaseLock(config.id).catch(() => {});
            }
            return;
          } else {
            addLog("Outro usuário já está atualizando. Lendo cache...");
            const freshConfig = await withTimeout(getAppConfig(), 5000);
            if (freshConfig) {
              try {
                const res: any = {};
                if (freshConfig.cacheTeste) res.teste = JSON.parse(freshConfig.cacheTeste);
                if (freshConfig.cacheKit) {
                  const kitObj = JSON.parse(freshConfig.cacheKit);
                  res.kit = kitObj;
                  addLog("Cache Kit lido da trava ocupada (incluindo planejado).");
                }
                updateStateWithCalculatedResults(res);
              } catch (e) { /* ignore */ }
            }
            setSecondsUntilRefresh(30);
            return;
          }
        }
      }

      // Default logic (Non-SP or fallback)
      addLog(`Fallback: Buscando APIs diretamente para ${keysToUpdate.join(', ')}...`);
      const updatePromises = keysToUpdate.map(async (k) => {
        try {
          addLog(`Iniciando fetch direto para ${k}...`);
          if (k === 'Teste API') {
            const rawData = await withTimeout(fetchApiData(), 90000);
            addLog(`Dados Teste API recebidos: ${Array.isArray(rawData) ? rawData.length : 'objeto'} itens.`);
            const apiResults = Array.isArray(rawData) ? rawData : ((rawData as any)?.value || []);
            const totalQtd = apiResults.reduce((acc: number, item: any) => acc + Number(item.QTD ?? item.qtd ?? 0), 0);
            updateStateWithCalculatedResults({ teste: { totalQtd } });
          } else if (k === 'MONTAGEM KIT') {
            const plannedKitPromise = fetchPlannedKitValue(addLog);
            const [rawData, kitPlanned] = await Promise.all([
              withTimeout(fetchKitData(), 120000),
              withTimeout(plannedKitPromise, 120000)
            ]);
            addLog(`Dados Kit: ${Array.isArray(rawData) ? rawData.length : 0} itens recebidos.`);
            const kitResults = Array.isArray(rawData) ? rawData : ((rawData as any)?.value || []);
            
            if (kitResults.length > 0 && isDebugEnabled) {
              addLog(`DEBUG KIT: Primeiro item data: "${kitResults[0].DATA || kitResults[0].data}"`, "info");
            }

            const nowBR = getSaoPauloDate();
            // ... (rest of filtering) ...
            const day = String(nowBR.getDate()).padStart(2, '0');
            const month = String(nowBR.getMonth() + 1).padStart(2, '0');
            const yearFull = nowBR.getFullYear();
            const yearShort = String(yearFull).slice(-2);
            const todayStrFull = `${day}/${month}/${yearFull}`;
            const todayStrShort = `${day}/${month}/${yearShort}`;
            const currentH = nowBR.getHours();

            const kitResultsToday = kitResults.filter((item: any) => {
              const dStr = String(item.DATA ?? item.data ?? '').trim();
              return dStr.startsWith(todayStrFull) || dStr.startsWith(todayStrShort);
            });

            // Se o array de hoje estiver vazio mas o rawData geral não, logar aviso.
            if (kitResultsToday.length === 0 && kitResults.length > 0) {
                addLog(`Nenhum item do Kit encontrado para HOJE (${todayStrFull}) no servidor. Total bruto: ${kitResults.length}`, "warn");
            }

            const kitCalculated = {
              totalDisp: kitResultsToday.reduce((acc: number, item: any) => acc + Number(item.QUANTIDADE ?? item.quantidade ?? 0), 0),
              plannedValue: kitPlanned > 0 ? kitPlanned : undefined, // pass undefined if 0 to keep existing
              hourlyReal: kitResultsToday.filter((item: any) => {
                const dStr = item.DATA ?? item.data;
                const m = String(dStr).match(/\d{2}\/\d{2}\/\d{2,4} (\d{2}):/);
                return m ? parseInt(m[1], 10) === currentH : false;
              }).reduce((acc: number, item: any) => acc + Number(item.QUANTIDADE ?? item.quantidade ?? 0), 0)
            };

            updateStateWithCalculatedResults({ kit: kitCalculated });
          }
        } catch (err) {
          addLog(`Erro em ${k}: ${String(err)}`, 'error');
        }
      });

      await Promise.all(updatePromises);
      if (!key) {
        setLastUpdateTime(new Date());
        if (autoRefreshInterval > 0) setSecondsUntilRefresh(autoRefreshInterval * 60);
      }
      addLog("Atualização concluída");
    } catch (error) {
      addLog(`Falha Geral: ${String(error)}`, 'error');
    } finally {
      // CLEAR ALL LOADING STATES
      setSummaryData(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          next[k] = { ...next[k], isLoading: false };
        });
        return next;
      });
    }
  };

  useEffect(() => {
    const initSpAndData = async () => {
      addLog("Iniciando Sistema...");
      if (hasSpContext()) {
        try {
          addLog("Verificando Listas SharePoint...");
          await ensureConfigList();
          addLog("Listas verificadas/criadas.");
          const config = await getAppConfig();
          if (config) {
            addLog(`Configuração carregada. Intervalo: ${config.intervalMinutes}min`);
            setConfigItemId(config.id);
            setAutoRefreshInterval(config.intervalMinutes);
          } else {
            addLog("Aviso: Configuração não encontrada após inicialização.", "error");
          }
        } catch (err) {
          addLog(`Erro crítico na inicialização SP: ${String(err)}`, "error");
          console.error("SharePoint init failed", err);
        }
      }
      
      // Load initial data (handles caching internally)
      await loadApiData();
    };

    initSpAndData();
  }, []);

  useEffect(() => {
    if (autoRefreshInterval > 0) {
      setSecondsUntilRefresh(autoRefreshInterval * 60);
      
      const intervalId = setInterval(() => {
        setSecondsUntilRefresh(prev => {
          if (prev === null || prev <= 1) {
            // Logic to trigger refresh handled by checking 0 or null is tricky here
            // because of interval closure. Use a separate effect for the trigger.
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(intervalId);
    } else {
      setSecondsUntilRefresh(null);
    }
  }, [autoRefreshInterval]);

  // Trigger refresh when countdown hits 0
  useEffect(() => {
    if (secondsUntilRefresh === 0) {
      loadApiData();
    }
  }, [secondsUntilRefresh]);

  // NOVO: Effect para atualizar o relógio do KIT em tempo real
  useEffect(() => {
    const updateKitClock = () => {
      setSummaryData(prev => {
        if (!prev['MONTAGEM KIT']) return prev;
        const kit = prev['MONTAGEM KIT'];
        
        // Re-calcula apenas se tivermos uma meta definida
        if (kit.plannedDay <= 0) return prev;

        const startHour = 5 + 20 / 60;
        const endHour = 23;
        const windowDuration = endHour - startHour;
        const totalWorkHours = 13.3;
        
        const now = getSaoPauloDate();
        const currentHourDecimal = now.getHours() + (now.getMinutes() / 60);
        const windowElapsed = Math.max(0, Math.min(windowDuration, currentHourDecimal - startHour));
        
        const remainingWindow = Math.max(0, windowDuration - windowElapsed);
        const workToWindowRatio = totalWorkHours / windowDuration;
        const remainingWorkHours = remainingWindow * workToWindowRatio;
        const elapsedWorkHours = windowElapsed * workToWindowRatio;

        const hourlyRateBase = kit.plannedDay / totalWorkHours;
        const expectedAccumulated = Math.floor(hourlyRateBase * elapsedWorkHours);
        const deltaResult = kit.totalAvailable - expectedAccumulated;

        let recoveryRate = 0;
        if (remainingWorkHours > 0.05) {
          recoveryRate = Math.ceil(Math.max(0, kit.plannedDay - kit.totalAvailable) / remainingWorkHours);
        }

        const remHours = Math.floor(remainingWorkHours);
        const remMinutes = Math.round((remainingWorkHours - remHours) * 60);
        const remainingTimeText = remainingWorkHours > 0 ? `${remHours}h ${remMinutes}m` : '0h 0m';

        // Só atualiza se houver mudança relevante
        if (kit.remainingTimeText === remainingTimeText && 
            kit.plannedToHour === recoveryRate && 
            kit.delta === deltaResult) {
          return prev;
        }

        return {
          ...prev,
          'MONTAGEM KIT': {
            ...kit,
            plannedToHour: recoveryRate,
            delta: deltaResult,
            deltaProduction: deltaResult,
            remainingTimeText,
            baseHourlyRate: Math.floor(hourlyRateBase)
          }
        };
      });
    };

    updateKitClock(); // Executa imediatamente
    const timer = setInterval(updateKitClock, 30000); // Depois a cada 30 segundos

    return () => clearInterval(timer);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'RESUMO':
        return (
          <SummaryView 
            onNavigate={setActiveTab} 
            data={summaryData} 
            autoRefreshInterval={autoRefreshInterval}
            lastUpdateTime={lastUpdateTime}
            secondsUntilRefresh={secondsUntilRefresh}
          />
        );
      case 'RECEBIMENTO':
        return (
          <DetailedView 
            title="RECEBIMENTO" 
            metrics={[
              { label: 'NEW GOOD', plannedDay: 3000, plannedToHour: 2000, realToHour: 1300, delta: -700 },
              { label: 'LAB', plannedDay: 2000, plannedToHour: 1100, realToHour: 1300, delta: 200 },
              { label: 'REVERSA', plannedDay: 1786, plannedToHour: 900, realToHour: 855, delta: -45 },
            ]}
          />
        );
      case 'CATALOGAÇÃO':
        return (
          <DetailedView 
            title="CATALOGAÇÃO" 
            metrics={[
              { label: 'LIBERADO TRIAGEM', plannedDay: 3000, plannedToHour: 2000, realToHour: 2100, delta: 100 },
              { label: 'DESCARTE', plannedDay: 2000, plannedToHour: 1100, realToHour: 1300, delta: 200 },
              { label: 'DOA', plannedDay: 1786, plannedToHour: 900, realToHour: 855, delta: -45 },
              { label: 'EXCEÇÃO', plannedDay: 100, plannedToHour: 30, realToHour: 10, delta: -20 },
            ]}
            hasBuffer={true}
          />
        );
      case 'CARGA APP + TRIAGEM':
      case 'SALA BATERIAS':
      case 'SEPARAÇÃO COMPONENTES':
      case 'MONTAGEM KIT':
      case 'CQ':
      case 'EXPEDIÇÃO':
        const metric = summaryData[activeTab];
        return (
          <DetailedView 
            title={activeTab} 
            metrics={[
              { 
                label: 'PADRÃO', 
                plannedDay: metric.plannedDay, 
                plannedToHour: metric.plannedToHour, 
                realToHour: metric.realToHour, 
                delta: metric.delta 
              },
            ]}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-grey-500">
            <h2 className="text-2xl font-bold uppercase italic tracking-tighter">Selecione uma opção no menu lateral</h2>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#E5E5E5] font-sans text-[#333] overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        onSelect={(tab) => {
          setActiveTab(tab);
          // On mobile, close sidebar after selection
          if (window.innerWidth < 1024) {
            setIsSidebarVisible(false);
          }
        }} 
        isVisible={isSidebarVisible}
      />
      
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarVisible && (
        <div 
          className="fixed inset-0 bg-black/50 z-15 lg:hidden" 
          onClick={() => setIsSidebarVisible(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header 
          toggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
          isSidebarVisible={isSidebarVisible}
          isSpConnected={hasSpContext()}
        />
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 scrollbar-hide">
          {renderContent()}
        </main>
      </div>

      {/* Floating Debug Button - Moved outside main flex for better visibility */}
      {isDebugEnabled && (
        <div className="fixed bottom-6 right-6 z-[9999]">
          <button
            id="debug-trigger"
            onClick={() => setShowLogs(!showLogs)}
            className={`${showLogs ? 'bg-red-600' : 'bg-black'} text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-2 border-2 border-white`}
          >
            <Activity size={24} />
            {logs.some(l => l.type === 'error') && (
              <span className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full border-2 border-white animate-bounce" />
            )}
          </button>

          {showLogs && (
            <div className="absolute bottom-20 right-0 w-[90vw] sm:w-[400px] max-h-[70vh] bg-white border border-zinc-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-zinc-900 p-4 border-b border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white">Console de Diagnóstico</h3>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setLogs([])} className="text-[10px] text-zinc-400 hover:text-white uppercase font-bold">Limpar</button>
                  <button onClick={() => setShowLogs(false)} className="text-[10px] text-zinc-400 hover:text-white uppercase font-bold">Fechar</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[11px] bg-zinc-50">
                {logs.length === 0 ? (
                  <div className="text-zinc-400 italic text-center py-12">Sem eventos para exibir no momento</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`p-3 rounded-lg border leading-relaxed ${
                      log.type === 'error' 
                        ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' 
                        : log.type === 'warn' 
                          ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm'
                          : 'bg-white border-zinc-200 text-zinc-700 shadow-sm'
                    }`}>
                      <div className="flex justify-between mb-1 opacity-60 text-[9px] font-bold">
                        <span>{log.type.toUpperCase()}</span>
                        <span>{log.timestamp}</span>
                      </div>
                      <div className="break-words font-medium">{log.message}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 bg-zinc-100 border-t border-zinc-200 text-[9px] text-zinc-500 flex justify-between">
                <span>V: 1.0.4</span>
                <span>Contexto: {hasSpContext() ? 'SharePoint' : 'Local'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
