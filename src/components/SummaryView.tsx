import React from 'react';
import { MousePointerClick, Loader2, RefreshCw } from 'lucide-react';
import { DashboardTab, SummaryMetric } from '../types';
import { MOCK_SUMMARY_DATA, COLORS } from '../constants';

interface SummaryViewProps {
  onNavigate: (tab: DashboardTab) => void;
  data?: Record<string, SummaryMetric>;
  onReloadOne: (key: string) => void;
  onReloadAll: () => void;
  autoRefreshInterval: number;
  onAutoRefreshChange: (interval: number) => void;
  lastUpdateTime: Date;
  secondsUntilRefresh: number | null;
}

interface SummaryCardProps {
  metric: SummaryMetric;
  onClick: () => void;
  onReload: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ metric, onClick, onReload }) => {
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
        <button 
          id={`refresh-${metric.title.toLowerCase().replace(/ \+ /g, '-').replace(/ /g, '-')}`}
          onClick={(e) => {
            e.stopPropagation();
            onReload();
          }}
          disabled={metric.isLoading}
          className="p-1 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
          title="Recarregar dados"
        >
          <RefreshCw size={14} className={`text-white ${metric.isLoading ? 'animate-spin' : ''}`} />
        </button>
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
  onReloadOne, 
  onReloadAll,
  autoRefreshInterval,
  onAutoRefreshChange,
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
          <div className="flex items-center gap-2 bg-[#CCCCCC] px-3 py-1.5 rounded shadow-sm border border-gray-400 flex-1 sm:flex-none">
            <span className="text-[10px] font-bold uppercase text-[#444] whitespace-nowrap">Auto:</span>
            <select 
              value={autoRefreshInterval}
              onChange={(e) => onAutoRefreshChange(Number(e.target.value))}
              className="bg-transparent text-[10px] font-bold uppercase border-none focus:ring-0 cursor-pointer p-0 w-full"
            >
              <option value={0}>NÃO</option>
              <option value={1}>1M</option>
              <option value={5}>5M</option>
              <option value={15}>15M</option>
              <option value={30}>30M</option>
              <option value={60}>1H</option>
            </select>
          </div>

          <button 
            onClick={onReloadAll}
            disabled={isAnyLoading}
            className="flex items-center justify-center gap-2 bg-[#D35400] hover:bg-[#A04000] text-white px-3 sm:px-4 py-2 rounded shadow-md transition-all font-bold text-[10px] sm:text-xs uppercase disabled:opacity-50 flex-1 sm:flex-none"
          >
            <RefreshCw size={14} className={isAnyLoading ? 'animate-spin' : ''} />
            <span className="whitespace-nowrap">Atualizar</span>
          </button>
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
            onReload={() => onReloadOne(metric.title)}
          />
        ))}
      </div>
    </div>
  );
}
