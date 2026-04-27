/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { DashboardTab } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SummaryView from './components/SummaryView';
import DetailedView from './components/DetailedView';

export default function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('RESUMO');

  const renderContent = () => {
    switch (activeTab) {
      case 'RESUMO':
        return <SummaryView onNavigate={setActiveTab} />;
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
      default:
        return (
          <div className="flex items-center justify-center h-full text-grey-500">
            <h2 className="text-2xl font-bold uppercase italic tracking-tighter">Em desenvolvimento: {activeTab}</h2>
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
