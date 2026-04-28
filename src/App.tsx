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
import { hasSpContext } from './services/sharepoint';
import { ensureConfigList, getAppConfig, acquireLock, releaseLock, updateApiCache, AppConfig } from './services/configService';

export default function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('RESUMO');
  const [summaryData, setSummaryData] = useState<Record<string, SummaryMetric>>(() => {
    const cached = localStorage.getItem('cockpit_summary_data');
    if (cached) {
      try {
        return JSON.parse(cached);
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
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  const updateStateWithResults = (results: { teste?: any[], kit?: any[] }) => {
    setSummaryData(prev => {
      const next = { ...prev };
      
      if (results.teste) {
        const totalQtd = results.teste.reduce((acc: number, item: any) => {
          const val = item.QTD ?? item.qtd ?? 0;
          return acc + Number(val);
        }, 0);
        
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
        const totalDisp = results.kit.reduce((acc: number, item: any) => {
          const val = item.QUANTIDADE ?? item.quantidade ?? 0;
          return acc + Number(val);
        }, 0);

        next['MONTAGEM KIT'] = {
          ...next['MONTAGEM KIT'],
          totalAvailable: totalDisp,
          isLoading: false,
        };
      }

      localStorage.setItem('cockpit_summary_data', JSON.stringify(next));
      return next;
    });
  };

  const loadApiData = async (key?: string) => {
    // If we are in SharePoint, use centralized caching logic
    if (hasSpContext()) {
      const config = await getAppConfig();
      if (config) {
        const last = new Date(config.lastUpdate);
        const diffSeconds = (Date.now() - last.getTime()) / 1000;
        const intervalSeconds = config.intervalMinutes * 60;

        // If it was a manual key refresh OR time has passed, try to refresh from API
        const isExpired = diffSeconds >= intervalSeconds || diffSeconds < 0;
        const shouldRefreshPool = !key && isExpired;
        const isManualSingle = !!key;

        // Sync local timers with SharePoint source of truth
        if (!key) {
          setLastUpdateTime(last);
          const remaining = Math.max(0, Math.ceil(intervalSeconds - diffSeconds));
          setSecondsUntilRefresh(remaining);
        }

        // If time hasn't passed and it's not a manual refresh, just use the cache from columns
        if (!isManualSingle && !isExpired) {
          try {
            const results: any = {};
            if (config.cacheTeste) results.teste = JSON.parse(config.cacheTeste);
            if (config.cacheKit) results.kit = JSON.parse(config.cacheKit);
            if (Object.keys(results).length > 0) {
              updateStateWithResults(results);
              return;
            }
          } catch (e) {
            console.error("Failed to parse SP cache", e);
          }
        }

        // We need to refresh (either because of timer or manual click)
        const userMail = (window as any)._spPageContextInfo?.userEmail || 'Desconhecido';
        const locked = await acquireLock(config.id, userMail);

        if (locked) {
          try {
            // If it was a manual refresh for one key, we could fetch just one, 
            // but for simplicity and to keep cache consistent, we fetch all.
            const apiData = await fetchApiData();
            const rawApi = Array.isArray(apiData) ? apiData : ((apiData as any)?.value || []);
            
            const kitData = await fetchKitData();
            const rawKit = Array.isArray(kitData) ? kitData : ((kitData as any)?.value || []);

            // Save to SharePoint
            await updateApiCache(config.id, {
              teste: JSON.stringify(rawApi),
              kit: JSON.stringify(rawKit)
            });

            // Update local state
            updateStateWithResults({ teste: rawApi, kit: rawKit });
            
            if (!key) {
              setLastUpdateTime(new Date());
              setSecondsUntilRefresh(config.intervalMinutes * 60);
            }

          } catch (err) {
            console.error("Refresh failed", err);
          } finally {
            await releaseLock(config.id);
          }
        } else {
          // Lock held by someone else, pull current cache which might be being updated
          // We can wait a few seconds or just pull what is there.
          const freshConfig = await getAppConfig();
          if (freshConfig) {
            try {
              const res: any = {};
              if (freshConfig.cacheTeste) res.teste = JSON.parse(freshConfig.cacheTeste);
              if (freshConfig.cacheKit) res.kit = JSON.parse(freshConfig.cacheKit);
              updateStateWithResults(res);
            } catch (e) { /* ignore */ }
          }
        }
        return;
      }
    }

    // Default logic (Non-SP)
    const keysToUpdate = (key ? [key] : Object.keys(summaryData))
      .filter(k => !summaryData[k].isLoading);

    if (keysToUpdate.length === 0) return;

    setSummaryData(prev => {
      const next = { ...prev };
      keysToUpdate.forEach(k => {
        next[k] = { ...next[k], isLoading: true };
      });
      return next;
    });

    const updatePromises = keysToUpdate.map(async (k) => {
      try {
        if (k === 'Teste API') {
          const rawData = await fetchApiData();
          const apiResults = Array.isArray(rawData) ? rawData : ((rawData as any)?.value || []);
          updateStateWithResults({ teste: apiResults });
        } else if (k === 'MONTAGEM KIT') {
          const rawData = await fetchKitData();
          const kitResults = Array.isArray(rawData) ? rawData : ((rawData as any)?.value || []);
          updateStateWithResults({ kit: kitResults });
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
          setSummaryData(prev => ({
            ...prev,
            [k]: { ...prev[k], isLoading: false }
          }));
        }
      } catch (err) {
        console.error(`Failed to load data for ${k}`, err);
        setSummaryData(prev => ({
          ...prev,
          [k]: { ...prev[k], isLoading: false }
        }));
      }
    });

    await Promise.all(updatePromises);
    
    if (!key) {
      setLastUpdateTime(new Date());
      if (autoRefreshInterval > 0) {
        setSecondsUntilRefresh(autoRefreshInterval * 60);
      }
    }
  };

  useEffect(() => {
    const initSpAndData = async () => {
      if (hasSpContext()) {
        try {
          await ensureConfigList();
          const config = await getAppConfig();
          if (config) {
            setConfigItemId(config.id);
            setAutoRefreshInterval(config.intervalMinutes);
          }
        } catch (err) {
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
        return (
          <DetailedView 
            title={activeTab} 
            metrics={[
              { label: 'PADRÃO', plannedDay: 3860, plannedToHour: 1178, realToHour: 1300, delta: 122 },
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
    </div>
  );
}
