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
    const cached = localStorage.getItem('cockpit_summary_data');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        Object.keys(parsed).forEach(k => {
          if (parsed[k]) parsed[k].isLoading = false;
        });
        return parsed;
      } catch (e) {
        return MOCK_SUMMARY_DATA;
      }
    }
    return MOCK_SUMMARY_DATA;
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
  const [logs, setLogs] = useState<{timestamp: string, message: string, type: 'error' | 'info'}[]>([]);
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

  const addLog = (message: string, type: 'error' | 'info' = 'info') => {
    const timestamp = formatTimeSP(new Date());
    setLogs(prev => [{timestamp, message, type}, ...prev].slice(0, 50));
  };

  const isDebugEnabled = import.meta.env.VITE_SHOW_DEBUG_LOGS !== 'false' || (typeof window !== 'undefined' && window.location.search.includes('debug=true'));

  function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 15000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
      )
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

      if (results.kit) {
        const { totalDisp } = results.kit;
        next['MONTAGEM KIT'] = {
          ...next['MONTAGEM KIT'],
          totalAvailable: totalDisp,
          isLoading: false,
        };
        
        if (results.kitPlanned !== undefined) {
          next['MONTAGEM KIT'].plannedDay = results.kitPlanned;
        }
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
                res.kit = JSON.parse(config.cacheKit);
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
              const [apiData, kitData, kitPlanned] = await Promise.all([
                withTimeout(fetchApiData(config.apiUrl), 12000),
                withTimeout(fetchKitData(config.apiUrl), 12000),
                fetchPlannedKitValue()
              ]);

              const rawApi = Array.isArray(apiData) ? apiData : ((apiData as any)?.value || []);
              const rawKit = Array.isArray(kitData) ? kitData : ((kitData as any)?.value || []);

              const testeCalculated = {
                totalQtd: rawApi.reduce((acc: number, item: any) => acc + Number(item.QTD ?? item.qtd ?? 0), 0)
              };
              const kitCalculated = {
                totalDisp: rawKit.reduce((acc: number, item: any) => acc + Number(item.QUANTIDADE ?? item.quantidade ?? 0), 0)
              };

              addLog(`Gravando cache no SP (T:${rawApi.length}, K:${rawKit.length})...`);
              await withTimeout(updateApiCache(config.id, {
                teste: JSON.stringify(testeCalculated),
                kit: JSON.stringify(kitCalculated)
              }), 8000);

              updateStateWithCalculatedResults({ teste: testeCalculated, kit: kitCalculated, kitPlanned });
              
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
                if (freshConfig.cacheKit) res.kit = JSON.parse(freshConfig.cacheKit);
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
            const rawData = await withTimeout(fetchApiData(), 15000);
            addLog(`Dados Teste API recebidos: ${Array.isArray(rawData) ? rawData.length : 'objeto'} itens.`);
            const apiResults = Array.isArray(rawData) ? rawData : ((rawData as any)?.value || []);
            const totalQtd = apiResults.reduce((acc: number, item: any) => acc + Number(item.QTD ?? item.qtd ?? 0), 0);
            updateStateWithCalculatedResults({ teste: { totalQtd } });
          } else if (k === 'MONTAGEM KIT') {
            const [rawData, kitPlanned] = await Promise.all([
              withTimeout(fetchKitData(), 15000),
              fetchPlannedKitValue()
            ]);
            addLog(`Dados Montagem Kit recebidos: ${Array.isArray(rawData) ? rawData.length : 'objeto'} itens.`);
            const kitResults = Array.isArray(rawData) ? rawData : ((rawData as any)?.value || []);
            const totalDisp = kitResults.reduce((acc: number, item: any) => acc + Number(item.QUANTIDADE ?? item.quantidade ?? 0), 0);
            updateStateWithCalculatedResults({ kit: { totalDisp }, kitPlanned });
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
                    <div key={i} className={`p-3 rounded-lg border leading-relaxed ${log.type === 'error' ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' : 'bg-white border-zinc-200 text-zinc-700 shadow-sm'}`}>
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
