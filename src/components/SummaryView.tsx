import React from 'react';
import { MousePointerClick, Loader2, RefreshCw } from 'lucide-react';
import { DashboardTab, SummaryMetric } from '../types';
import { MOCK_SUMMARY_DATA, COLORS } from '../constants';

interface SummaryViewProps {
  onNavigate: (tab: DashboardTab) => void;
  data?: Record<string, SummaryMetric>;
  autoRefreshInterval: number;
  lastUpdateTime: Date;
  secondsUntilRefresh: number | null;
}

interface SummaryCardProps {
  metric: SummaryMetric;
  onClick: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ metric, onClick }) => {
  const isPositiveDelta = metric.delta >= 0;

  return (
    <div className="bg-[#CCCCCC] rounded-lg overflow-hidden shadow-md flex flex-col h-full border border-gray-400 group">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-2 cursor-pointer hover:brightness-110 transition-all"
        style={{ backgroundColor: COLORS.headerDark }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0" onClick={onClick}>
          <MousePointerClick size={20} className="text-[#333] shrink-0" />
          <span className="text-white font-bold text-xs uppercase tracking-tight truncate">
            {metric.title}
          </span>
        </div>
      </div>

      {/* Main Stat */}
      <div className="p-3 bg-[#B3B3B3] flex-1 relative min-h-[120px]">
        <div className={`transition-opacity duration-300 ${metric.isLoading ? 'opacity-60' : 'opacity-100'}`}>
          <div className="mb-2">
              <p className="text-[10px] font-bold text-[#444] uppercase leading-none">
                {metric.title === 'Teste API' ? 'Resultados API (QTD)' : 'Planejado Dia'}
              </p>
              <p className="text-2xl font-bold text-[#111]">{metric.plannedDay.toLocaleString()}</p>
          </div>

          {/* Sub Stats Row */}
          <div className="grid grid-cols-3 gap-1 mb-2">
              <div className="bg-[#999999] p-1 rounded-sm text-center">
                  <p className="text-[7px] font-bold text-[#333] uppercase leading-tight text-nowrap">
                    {metric.title === 'Teste API' ? 'Projetado' : 'Plan. hor.'}
                  </p>
                  <p className="text-xs font-bold">{metric.plannedToHour.toLocaleString()}</p>
              </div>
              <div className="bg-[#999999] p-1 rounded-sm text-center">
                  <p className="text-[7px] font-bold text-[#333] uppercase leading-tight text-nowrap">
                    {metric.title === 'Teste API' ? 'Atual' : 'Real hor.'}
                  </p>
                  <p className="text-xs font-bold">{metric.realToHour.toLocaleString()}</p>
              </div>
              <div className="p-1 rounded-sm text-center bg-[#888888]">
                  <p className="text-[7px] font-bold text-[#333] uppercase leading-tight">
                    {metric.title === 'Teste API' ? 'Diferença' : 'Delta'}
                  </p>
                  <p className={`text-sm font-bold ${isPositiveDelta ? 'text-[#008000]' : 'text-[#D40511]'}`}>
                      {isPositiveDelta ? '+' : ''}{metric.delta}
                  </p>
              </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-2 gap-1">
              <div className="bg-[#999999] p-1 rounded-sm text-center">
                  <p className="text-[7px] font-bold text-[#333] uppercase leading-tight">
                    {metric.title === 'Teste API' ? 'Total' : 'Total Disp.'}
                  </p>
                  <p className="text-sm font-bold">{metric.totalAvailable.toLocaleString()}</p>
              </div>
              <div className="bg-[#999999] p-1 rounded-sm text-center">
                  <p className="text-[7px] font-bold text-[#333] uppercase leading-tight">
                    {metric.title === 'Teste API' ? 'Margem' : 'Delta prod.'}
                  </p>
                  <p className="text-sm font-bold">+{metric.deltaProduction}</p>
              </div>
          </div>
        </div>
        {metric.isLoading && (
          <div className="absolute top-1 right-1">
             <div className="w-2 h-2 bg-[#D35400] rounded-full animate-ping"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SummaryView({ 
  onNavigate, 
  data = MOCK_SUMMARY_DATA, 
  autoRefreshInterval,
  lastUpdateTime,
  secondsUntilRefresh
}: SummaryViewProps) {
  const isAnyLoading = Object.values(data).some(m => m.isLoading);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour12: false });
  };

  const formatCountdown = (totalSeconds: number | null) => {
    if (totalSeconds === null) return '';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/50 p-3 rounded-lg border border-gray-300">
        <div className="flex flex-row justify-between md:flex-col gap-2 md:gap-0">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-[#555] tracking-tight whitespace-nowrap">
              Última Atualização: <span className="text-black">{formatTime(lastUpdateTime)}</span>
            </span>
            {secondsUntilRefresh !== null && autoRefreshInterval > 0 && (
              <span className="text-[10px] font-bold uppercase text-[#555] tracking-tight whitespace-nowrap">
                Próxima Atualização: <span className="text-[#D35400]">{formatCountdown(secondsUntilRefresh)}</span>
              </span>
            )}
          </div>
          
          <div className="md:hidden">
             {/* Small indicator on mobile if anything is loading */}
             {isAnyLoading && (
               <div className="flex items-center gap-1 text-[#D35400]">
                 <Loader2 size={12} className="animate-spin" />
                 <span className="text-[8px] font-bold">CARREGANDO...</span>
               </div>
             )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
          {isAnyLoading && (
            <div className="flex items-center gap-1.5 bg-[#D35400]/10 px-3 py-1.5 rounded border border-[#D35400]/20">
              <Loader2 size={14} className="animate-spin text-[#D35400]" />
              <span className="text-[10px] font-bold text-[#D35400] uppercase tracking-wider">Carregando...</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {Object.values(data).map((metric) => (
          <SummaryCard 
            key={metric.title} 
            metric={metric} 
            onClick={() => {
              if (metric.title === 'RECEBIMENTO' || metric.title === 'CATALOGAÇÃO' || metric.title === 'CARGA APP + TRIAGEM' || metric.title === 'CQ' || metric.title === 'EXPEDIÇÃO') {
                  onNavigate(metric.title as DashboardTab);
              }
            }} 
          />
        ))}
      </div>
    </div>
  );
}
