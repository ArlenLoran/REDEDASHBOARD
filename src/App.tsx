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

  useEffect(() => {
    async function loadApiData() {
      try {
        const apiResults = await fetchApiData();
        const totalQtd = apiResults.reduce((acc, item) => acc + item.QTD, 0);
        
        // Add or update the "Teste API" card
        setSummaryData(prev => ({
          ...prev,
          'Teste API': {
            title: 'Teste API',
            plannedDay: totalQtd, // using total QTD from API as a sample metric
            plannedToHour: Math.floor(totalQtd * 0.4),
            realToHour: Math.floor(totalQtd * 0.45),
            delta: Math.floor(totalQtd * 0.05),
            totalAvailable: totalQtd,
            deltaProduction: 10,
          }
        }));
      } catch (err) {
        console.error("Failed to load API data", err);
      }
    }
    loadApiData();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'RESUMO':
        return <SummaryView onNavigate={setActiveTab} data={summaryData} />;
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
    <div className="flex h-screen bg-[#E5E5E5] font-sans text-[#333]">
      <Sidebar activeTab={activeTab} onSelect={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
