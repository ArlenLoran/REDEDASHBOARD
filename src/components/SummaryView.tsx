import React from 'react';
import { Fingerprint } from 'lucide-react';
import { DashboardTab, SummaryMetric } from '../types';
import { MOCK_SUMMARY_DATA, COLORS } from '../constants';

interface SummaryViewProps {
  onNavigate: (tab: DashboardTab) => void;
}

interface SummaryCardProps {
  metric: SummaryMetric;
  onClick: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ metric, onClick }) => {
  const isPositiveDelta = metric.delta >= 0;

  return (
    <div className="bg-[#CCCCCC] rounded-lg overflow-hidden shadow-md flex flex-col h-full border border-gray-400">
      {/* Header */}
      <div 
        className="flex items-center gap-2 p-2 cursor-pointer hover:brightness-110 transition-all"
        style={{ backgroundColor: COLORS.headerDark }}
        onClick={onClick}
      >
        <Fingerprint size={24} className="text-[#333]" />
        <span className="text-white font-bold text-sm uppercase tracking-tight truncate">
          {metric.title}
        </span>
      </div>

      {/* Main Stat */}
      <div className="p-3 bg-[#B3B3B3] flex-1">
        <div className="mb-2">
            <p className="text-[10px] font-bold text-[#444] uppercase leading-none">Planejado Dia</p>
            <p className="text-2xl font-bold text-[#111]">{metric.plannedDay.toLocaleString()}</p>
        </div>

        {/* Sub Stats Row */}
        <div className="grid grid-cols-3 gap-1 mb-2">
            <div className="bg-[#999999] p-1 rounded-sm text-center">
                <p className="text-[7px] font-bold text-[#333] uppercase leading-tight">Planejado até horário</p>
                <p className="text-xs font-bold">{metric.plannedToHour.toLocaleString()}</p>
            </div>
            <div className="bg-[#999999] p-1 rounded-sm text-center">
                <p className="text-[7px] font-bold text-[#333] uppercase leading-tight">Real até o horário</p>
                <p className="text-xs font-bold">{metric.realToHour.toLocaleString()}</p>
            </div>
            <div className="p-1 rounded-sm text-center bg-[#888888]">
                <p className="text-[7px] font-bold text-[#333] uppercase leading-tight">Delta</p>
                <p className={`text-sm font-bold ${isPositiveDelta ? 'text-[#008000]' : 'text-[#D40511]'}`}>
                    {isPositiveDelta ? '+' : ''}{metric.delta}
                </p>
            </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-2 gap-1">
            <div className="bg-[#999999] p-1 rounded-sm text-center">
                <p className="text-[7px] font-bold text-[#333] uppercase leading-tight">Total Disponível</p>
                <p className="text-sm font-bold">{metric.totalAvailable.toLocaleString()}</p>
            </div>
            <div className="bg-[#999999] p-1 rounded-sm text-center">
                <p className="text-[7px] font-bold text-[#333] uppercase leading-tight">Delta para produção</p>
                <p className="text-sm font-bold">+{metric.deltaProduction}</p>
            </div>
        </div>
      </div>
    </div>
  );
}

export default function SummaryView({ onNavigate }: SummaryViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Object.values(MOCK_SUMMARY_DATA).map((metric) => (
        <SummaryCard 
          key={metric.title} 
          metric={metric} 
          onClick={() => {
            if (metric.title === 'RECEBIMENTO' || metric.title === 'CATALOGAÇÃO') {
                onNavigate(metric.title as DashboardTab);
            }
          }} 
        />
      ))}
    </div>
  );
}
