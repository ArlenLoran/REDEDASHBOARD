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
import { fetchApiData } from './services/apiService';

export default function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('RESUMO');
  const [summaryData, setSummaryData] = useState<Record<string, SummaryMetric>>(MOCK_SUMMARY_DATA);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0); // 0 means disabled
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const loadApiData = async (key?: string) => {
    // Only refresh keys that are not already loading
    const keysToUpdate = (key ? [key] : Object.keys(summaryData))
      .filter(k => !summaryData[k].isLoading);

    if (keysToUpdate.length === 0) return;

    // Set specified keys to loading
    setSummaryData(prev => {
      const next = { ...prev };
      keysToUpdate.forEach(k => {
        next[k] = { ...next[k], isLoading: true };
      });
      return next;
    });

    // Create a list of update promises
    const updatePromises = keysToUpdate.map(async (k) => {
      try {
        if (k === 'Teste API') {
          const apiResults = await fetchApiData();
          const totalQtd = apiResults.reduce((acc, item: any) => {
            const val = item.QTD || item.qtd || 0;
            return acc + Number(val);
          }, 0);

          setSummaryData(prev => ({
            ...prev,
            [k]: {
              ...prev[k],
              plannedDay: totalQtd,
              plannedToHour: Math.floor(totalQtd * 0.4),
              realToHour: Math.floor(totalQtd * 0.45),
              delta: Math.floor(totalQtd * 0.05),
              totalAvailable: totalQtd,
              deltaProduction: 10,
              isLoading: false,
            }
          }));
        } else {
          // Simulate network delay for mock data
          const randomDelay = 500 + Math.random() * 1500;
          await new Promise(resolve => setTimeout(resolve, randomDelay));
          
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

    // If it's a full refresh, update the timestamps when all started ones are tracked
    // Actually, we can update the "Last Update" time immediately for the overview,
    // and individuals as they finish.
    if (!key) {
      setLastUpdateTime(new Date());
      if (autoRefreshInterval > 0) {
        setSecondsUntilRefresh(autoRefreshInterval * 60);
      }
    }

    await Promise.all(updatePromises);
  };

  useEffect(() => {
    loadApiData();
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
            onReloadOne={loadApiData}
            onReloadAll={() => loadApiData()}
            autoRefreshInterval={autoRefreshInterval}
            onAutoRefreshChange={setAutoRefreshInterval}
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
        />
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 scrollbar-hide">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
