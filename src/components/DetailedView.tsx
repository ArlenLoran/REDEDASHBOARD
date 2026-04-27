import { useState } from 'react';
import { DetailedMetric } from '../types';
import { MOCK_CHART_DATA, COLORS, MOCK_QUALITY_DATA, MOCK_AGE_DATA } from '../constants';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface DetailedViewProps {
  title: string;
  metrics: DetailedMetric[];
  hasBuffer?: boolean;
}

type SubTab = 'PLAN X REAL' | 'QUALIDADE' | 'AGE' | 'MODO FALHA';

export default function DetailedView({ title, metrics, hasBuffer }: DetailedViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('PLAN X REAL');
  
  const totalPlanned = metrics.reduce((acc, m) => acc + m.plannedDay, 0);
  const totalDelta = metrics.reduce((acc, m) => acc + m.delta, 0);

  const isStandardLayout = title === 'CARGA APP + TRIAGEM' || title === 'SALA BATERIAS' || title === 'SEPARAÇÃO COMPONENTES';

  const subTabs: SubTab[] = title === 'CATALOGAÇÃO' 
    ? ['PLAN X REAL', 'QUALIDADE', 'AGE', 'MODO FALHA'] 
    : isStandardLayout
      ? ['PLAN X REAL', 'QUALIDADE', 'MODO FALHA']
      : ['PLAN X REAL', 'MODO FALHA'];

  return (
    <div className="flex flex-col min-h-full space-y-4 pb-8">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto py-2 -mx-2 px-2 scrollbar-hide">
        {subTabs.map((tab) => (
            <button 
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                className={`px-4 py-2 font-bold text-xs sm:text-sm rounded shadow uppercase tracking-tight transition-all whitespace-nowrap border ${
                    activeSubTab === tab 
                        ? 'bg-[#D35400] text-white border-[#D35400]' 
                        : 'bg-[#999] text-black border-gray-400 hover:bg-[#aaa]'
                }`}
            >
                {tab}
            </button>
        ))}
      </div>

      {/* Filter */}
      {!isStandardLayout && (
        <div>
          <button className="px-6 py-1 bg-[#888] text-white font-bold text-sm rounded uppercase italic tracking-tighter shadow-sm">
            FILTRO TECNOLOGIA
          </button>
        </div>
      )}

      {activeSubTab === 'PLAN X REAL' && (
        <div className="flex flex-col h-full space-y-4">
            {isStandardLayout ? (
                <>
                    {/* Filters Row */}
                    <div className="flex flex-wrap gap-2 sm:gap-4">
                        <button className="px-4 sm:px-6 py-1 bg-[#888] text-white font-bold text-xs sm:text-sm rounded uppercase italic tracking-tighter shadow-sm">
                            {title === 'SEPARAÇÃO COMPONENTES' ? 'TIPO DE COMPONENTE' : 'FILTRO TECNOLOGIA'}
                        </button>
                        {(title === 'CARGA APP + TRIAGEM' || title === 'SALA BATERIAS') && (
                            <button className="px-4 sm:px-6 py-1 bg-[#888] text-white font-bold text-xs sm:text-sm rounded uppercase italic tracking-tighter shadow-sm">
                                LINHA DE TRIAGEM
                            </button>
                        )}
                    </div>

                    {/* Content Grid */}
                    <div className="flex flex-col lg:flex-row gap-4 items-start pb-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-grow w-full lg:max-w-[800px]">
                            {/* Left Stats Section */}
                            <div className="bg-[#B3B3B3] p-3 rounded-xl shadow-inner flex flex-col items-center justify-center min-h-[80px] md:min-h-[100px]">
                                <p className="text-[10px] font-bold text-[#444] mb-2 uppercase text-center leading-tight">Estoque disponível</p>
                                <p className="text-xl md:text-3xl font-bold text-[#008000]">+100</p>
                            </div>
                            <div className="bg-[#B3B3B3] p-3 rounded-xl shadow-inner flex flex-col items-center justify-center min-h-[80px] md:min-h-[100px]">
                                <p className="text-[10px] font-bold text-[#444] mb-2 uppercase text-center leading-tight">Planejado dia</p>
                                <p className="text-xl md:text-3xl font-bold text-[#111]">3.000</p>
                            </div>
                            <div className="bg-[#B3B3B3] p-3 rounded-xl shadow-inner flex flex-col items-center justify-center min-h-[80px] md:min-h-[100px]">
                                <p className="text-[10px] font-bold text-[#444] mb-2 uppercase text-center leading-tight">Plan. Horário</p>
                                <p className="text-xl md:text-3xl font-bold text-[#111]">2.000</p>
                            </div>
                            <div className="bg-[#B3B3B3] p-3 rounded-xl shadow-inner flex flex-col items-center justify-center min-h-[80px] md:min-h-[100px]">
                                <p className="text-[10px] font-bold text-[#444] mb-2 uppercase text-center leading-tight">Real Horário</p>
                                <p className="text-xl md:text-3xl font-bold text-[#111]">2.100</p>
                            </div>

                            <div className="hidden md:block col-span-1"></div>
                            <div className="bg-[#B3B3B3] p-3 rounded-xl shadow-inner flex flex-col items-center justify-center min-h-[80px] md:min-h-[100px]">
                                <p className="text-[10px] font-bold text-[#444] mb-2 uppercase text-center leading-tight">Pendente Produc.</p>
                                <p className="text-xl md:text-3xl font-bold text-[#111]">900</p>
                            </div>
                            <div className="hidden md:block col-span-1"></div>
                            <div className="bg-[#B3B3B3] p-3 rounded-xl shadow-inner flex flex-col items-center justify-center min-h-[80px] md:min-h-[100px]">
                                <p className="text-[10px] font-bold text-[#444] mb-2 uppercase text-center leading-tight">Delta</p>
                                <p className="text-xl md:text-3xl font-bold text-[#008000]">+100</p>
                            </div>
                        </div>

                        {/* Right GOOD/BAD Sections */}
                        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full lg:w-auto">
                            {/* BAD Row */}
                            <div className="flex items-center gap-2 flex-1">
                                <div className="transform lg:-rotate-90 text-[10px] font-black uppercase text-[#111] whitespace-nowrap lg:w-0">BAD</div>
                                <div className="bg-[#B3B3B3] p-2 md:p-3 rounded-xl flex flex-col items-center justify-center flex-1 lg:min-w-[120px] min-h-[70px] md:min-h-[80px]">
                                    <p className="text-[8px] font-bold text-[#444] mb-1 uppercase text-center leading-tight">Real Horário</p>
                                    <p className="text-xl md:text-2xl font-bold">1.000</p>
                                </div>
                                <div className="bg-[#B3B3B3] p-2 md:p-3 rounded-xl flex flex-col items-center justify-center flex-1 lg:min-w-[120px] min-h-[70px] md:min-h-[80px]">
                                    <p className="text-[8px] font-bold text-[#444] mb-1 uppercase text-center leading-tight">Perc. Real</p>
                                    <p className="text-xl md:text-2xl font-bold">47%</p>
                                </div>
                            </div>
                            {/* GOOD Row */}
                            <div className="flex items-center gap-2 flex-1">
                                <div className="transform lg:-rotate-90 text-[10px] font-black uppercase text-[#111] whitespace-nowrap lg:w-0">GOOD</div>
                                <div className="bg-[#B3B3B3] p-2 md:p-3 rounded-xl flex flex-col items-center justify-center flex-1 lg:min-w-[120px] min-h-[70px] md:min-h-[80px]">
                                    <p className="text-[8px] font-bold text-[#444] mb-1 uppercase text-center leading-tight">Real Horário</p>
                                    <p className="text-xl md:text-2xl font-bold">1.100</p>
                                </div>
                                <div className="bg-[#B3B3B3] p-2 md:p-3 rounded-xl flex flex-col items-center justify-center flex-1 lg:min-w-[120px] min-h-[70px] md:min-h-[80px]">
                                    <p className="text-[8px] font-bold text-[#444] mb-1 uppercase text-center leading-tight">Perc. Real</p>
                                    <p className="text-xl md:text-2xl font-bold">53%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Content Grid for non-standard */}
                    <div className="flex flex-col lg:flex-row gap-3 items-stretch">
                        <div className="flex flex-col gap-3">
                            {/* Total Planned Card */}
                            <div className="bg-[#B3B3B3] p-4 rounded-xl shadow-inner flex flex-col items-center justify-center lg:min-w-[140px]">
                                <p className="text-[10px] font-bold text-[#444] mb-4 uppercase text-center leading-tight">Planejado Dia</p>
                                <p className="text-3xl lg:text-4xl font-bold text-[#111]">{totalPlanned.toLocaleString()}</p>
                            </div>

                            {/* Cataloging Specific: Pendente */}
                            {title === 'CATALOGAÇÃO' && (
                                <div className="bg-[#B3B3B3] p-4 rounded-xl shadow-inner flex flex-col items-center justify-center lg:min-w-[140px]">
                                    <p className="text-[10px] font-bold text-[#444] mb-4 uppercase text-center leading-tight">Pendente<br/>Catalogação</p>
                                    <p className="text-3xl lg:text-4xl font-bold text-[#111]">7.200</p>
                                </div>
                            )}
                        </div>

                        {/* Categories Column Labels */}
                        <div className="hidden lg:flex flex-col gap-1 justify-center">
                            {metrics.map((m) => (
                                <div key={m.label} className="h-[60px] flex items-center justify-center">
                                    <div className="transform -rotate-90 text-[10px] font-black uppercase text-[#111] whitespace-nowrap w-0 flex justify-center items-center">
                                        {m.label}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Metrics Grid */}
                        <div className="flex flex-col gap-1 flex-grow">
                            {metrics.map((m, idx) => (
                                <div key={idx} className="flex gap-1 h-auto lg:h-[60px] flex-wrap lg:flex-nowrap">
                                    {/* Mobile label */}
                                    <div className="lg:hidden w-full text-[10px] font-black uppercase text-[#333] pt-2 px-1">{m.label}</div>
                                    
                                    {hasBuffer && (
                                        <div className="bg-[#B3B3B3] p-2 rounded-xl flex flex-col items-center justify-center min-w-[80px] lg:min-w-[100px] flex-1">
                                            <p className="text-[8px] font-bold text-[#444] uppercase mb-0.5">Buffer</p>
                                            <p className={`text-xl lg:text-2xl font-bold ${idx >= 2 ? 'text-[#D40511]' : 'text-[#008000]'}`}>
                                                {idx === 0 ? '1.000' : idx === 1 ? '100' : idx === 2 ? '123' : '154'}
                                            </p>
                                        </div>
                                    )}

                                    <div className="bg-[#B3B3B3] p-2 rounded-xl flex flex-col items-center justify-center flex-1">
                                        <p className="text-[8px] font-bold text-[#444] uppercase mb-0.5">Plan. Dia</p>
                                        <p className="text-xl lg:text-2xl font-bold opacity-80">{m.plannedDay.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-[#B3B3B3] p-2 rounded-xl flex flex-col items-center justify-center flex-1">
                                        <p className="text-[8px] font-bold text-[#444] uppercase mb-0.5 text-center leading-tight">Plan. Horário</p>
                                        <p className="text-xl lg:text-2xl font-bold opacity-80">{m.plannedToHour.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-[#B3B3B3] p-2 rounded-xl flex flex-col items-center justify-center flex-1">
                                        <p className="text-[8px] font-bold text-[#444] uppercase mb-0.5 text-center leading-tight">Real Horário</p>
                                        <p className="text-xl lg:text-2xl font-bold">{m.realToHour.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-[#B3B3B3] p-2 rounded-xl flex flex-col items-center justify-center min-w-[80px] lg:min-w-[100px] flex-1">
                                        <p className="text-[8px] font-bold text-[#444] uppercase mb-0.5">Delta</p>
                                        <p className={`text-xl lg:text-2xl font-bold ${m.delta >= 0 ? 'text-[#008000]' : 'text-[#D40511]'}`}>
                                        {m.delta >= 0 ? '+' : ''}{m.delta}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total Delta Card */}
                        <div className="bg-[#B3B3B3] p-4 rounded-xl shadow-inner flex flex-col items-center justify-center lg:min-w-[140px]">
                            <p className="text-[10px] font-bold text-[#444] mb-4 uppercase text-center leading-tight">Delta total</p>
                            <p className={`text-4xl lg:text-5xl font-bold ${totalDelta >= 0 ? 'text-[#008000]' : 'text-[#D40511]'}`}>
                                {totalDelta >= 0 ? '+' : ''}{totalDelta}
                            </p>
                        </div>
                    </div>
                </>
            )}

            {/* Chart Section */}
            <div className="flex-1 bg-transparent min-h-[250px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={MOCK_CHART_DATA} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="0" vertical={false} stroke="#555" strokeWidth={1} />
                        <XAxis 
                            dataKey="hour" 
                            axisLine={{ stroke: '#000', strokeWidth: 2 }} 
                            tickLine={false} 
                            tick={{fontSize: 11, fontWeight: '900', fill: '#000'}} 
                        />
                        <YAxis hide />
                        <Tooltip 
                            cursor={{fill: 'rgba(255, 255, 255, 0.2)'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="lab" name="LAB" stackId="a" fill="#D40511" barSize={35} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="rev" name="REV" stackId="a" fill="#008000" barSize={35} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="new" name="NEW" stackId="a" fill="#D4A017" barSize={35} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="total" name="TOTAL" fill="#888" barSize={35} radius={[4, 4, 0, 0]} />
                        <Line type="monotone" name="Tendência" dataKey="total" stroke="#001529" strokeWidth={3} dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
      )}

      {activeSubTab === 'QUALIDADE' && (
          <div className="flex flex-col h-full space-y-6 p-2 sm:p-4">
              {isStandardLayout ? (
                  <>
                    <div className="flex flex-wrap gap-2 sm:gap-4">
                        <button className="px-4 sm:px-6 py-1 bg-[#888] text-white font-bold text-xs sm:text-sm rounded uppercase italic tracking-tighter shadow-sm">
                            {title === 'SEPARAÇÃO COMPONENTES' ? 'TIPO DE COMPONENTE' : 'FILTRO TECNOLOGIA'}
                        </button>
                        {(title === 'CARGA APP + TRIAGEM' || title === 'SALA BATERIAS') && (
                            <button className="px-4 sm:px-6 py-1 bg-[#888] text-white font-bold text-xs sm:text-sm rounded uppercase italic tracking-tighter shadow-sm">
                                LINHA DE TRIAGEM
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col gap-4">
                        {/* GOOD Row */}
                        <div className="flex flex-col lg:flex-row items-center gap-4">
                            <div className="lg:transform lg:-rotate-90 text-[10px] font-black uppercase text-[#111] whitespace-nowrap lg:w-8">GOOD</div>
                            <div className="flex gap-2 w-full lg:w-auto">
                                <div className="bg-[#B3B3B3] p-3 rounded-xl flex flex-col items-center justify-center flex-1 lg:min-w-[120px] min-h-[80px] lg:min-h-[90px]">
                                    <p className="text-[8px] font-bold text-[#444] uppercase mb-2">Plan.</p>
                                    <p className="text-2xl lg:text-3xl font-bold">80%</p>
                                </div>
                                <div className="bg-[#B3B3B3] p-3 rounded-xl flex flex-col items-center justify-center flex-1 lg:min-w-[120px] min-h-[80px] lg:min-h-[90px]">
                                    <p className="text-[8px] font-bold text-[#444] uppercase mb-2">Real</p>
                                    <p className="text-2xl lg:text-3xl font-bold">85%</p>
                                </div>
                                <div className="bg-[#B3B3B3] p-3 rounded-xl flex flex-col items-center justify-center flex-1 lg:min-w-[120px] min-h-[80px] lg:min-h-[90px] relative">
                                    <p className="text-[8px] font-bold text-[#444] uppercase mb-2">Delta</p>
                                    <div className="flex items-center gap-1">
                                        <p className="text-2xl lg:text-3xl font-bold">5%</p>
                                        <ArrowUp className="text-[#008000] absolute right-1 lg:right-2" size={24} strokeWidth={4} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BAD Row */}
                        <div className="flex flex-col lg:flex-row items-center gap-4">
                            <div className="lg:transform lg:-rotate-90 text-[10px] font-black uppercase text-[#111] whitespace-nowrap lg:w-8">BAD</div>
                            <div className="flex gap-2 w-full lg:w-auto">
                                <div className="bg-[#B3B3B3] p-3 rounded-xl flex flex-col items-center justify-center flex-1 lg:min-w-[120px] min-h-[80px] lg:min-h-[90px]">
                                    <p className="text-[8px] font-bold text-[#444] uppercase mb-2">Plan.</p>
                                    <p className="text-2xl lg:text-3xl font-bold">12%</p>
                                </div>
                                <div className="bg-[#B3B3B3] p-3 rounded-xl flex flex-col items-center justify-center flex-1 lg:min-w-[120px] min-h-[80px] lg:min-h-[90px]">
                                    <p className="text-[8px] font-bold text-[#444] uppercase mb-2">Real</p>
                                    <p className="text-2xl lg:text-3xl font-bold">6%</p>
                                </div>
                                <div className="bg-[#B3B3B3] p-3 rounded-xl flex flex-col items-center justify-center flex-1 lg:min-w-[120px] min-h-[80px] lg:min-h-[90px] relative">
                                    <p className="text-[8px] font-bold text-[#444] uppercase mb-2">Delta</p>
                                    <div className="flex items-center gap-1">
                                        <p className="text-2xl lg:text-3xl font-bold">6%</p>
                                        <ArrowDown className="text-[#D40511] absolute right-1 lg:right-2" size={24} strokeWidth={4} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quality Chart Container */}
                    <div className="flex-1 min-h-[250px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={[
                                { name: 'Manhã', good: 60, bad: 40 },
                                { name: 'Tarde', good: 85, bad: 30 },
                                { name: 'Noite', good: 45, bad: 15 },
                            ]} margin={{ bottom: 10, top: 20 }}>
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={{ stroke: '#000', strokeWidth: 2 }} 
                                    tickLine={false}
                                    tick={{fontSize: 10, fontWeight: '900', fill: '#000'}}
                                />
                                <YAxis hide />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255, 255, 255, 0.2)'}}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="good" name="GOOD" fill="#008000" barSize={40} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="bad" name="BAD" fill="#D40511" barSize={40} radius={[4, 4, 0, 0]} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                  </>
              ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 lg:gap-x-12 gap-y-6 lg:gap-y-8">
                        {MOCK_QUALITY_DATA.map((item) => (
                            <div key={item.label} className="space-y-2 lg:space-y-4">
                                <div className="font-black text-[10px] lg:text-xs uppercase text-[#111]">{item.label}</div>
                                <div className="flex gap-2">
                                    <div className="bg-[#B3B3B3] p-2 lg:p-3 rounded-xl flex flex-col items-center justify-center flex-1 min-h-[70px] lg:min-h-[90px] hover:bg-[#A6A6A6] transition-colors cursor-default">
                                        <p className="text-[8px] font-bold text-[#444] uppercase mb-1 lg:mb-2">Plan.</p>
                                        <p className="text-lg lg:text-3xl font-bold">{item.plannedProfile}%</p>
                                    </div>
                                    <div className="bg-[#B3B3B3] p-2 lg:p-3 rounded-xl flex flex-col items-center justify-center flex-1 min-h-[70px] lg:min-h-[90px] hover:bg-[#A6A6A6] transition-colors cursor-default">
                                        <p className="text-[8px] font-bold text-[#444] uppercase mb-1 lg:mb-2">Real</p>
                                        <p className="text-lg lg:text-3xl font-bold">{item.realProfile}%</p>
                                    </div>
                                    <div className="bg-[#B3B3B3] p-2 lg:p-3 rounded-xl flex flex-col items-center justify-center flex-1 min-h-[70px] lg:min-h-[90px] relative hover:bg-[#A6A6A6] transition-colors cursor-default">
                                        <p className="text-[8px] font-bold text-[#444] uppercase mb-1 lg:mb-2">Dia</p>
                                        <div className="flex items-center gap-1">
                                            <p className="text-lg lg:text-3xl font-bold">{item.plannedDay}%</p>
                                            {item.trend === 'up' ? (
                                                <ArrowUp className="text-[#008000] absolute right-1 lg:right-2" size={24} strokeWidth={4} />
                                            ) : (
                                                <ArrowDown className="text-[#D40511] absolute right-1 lg:right-2" size={24} strokeWidth={4} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quality Chart for non-standard */}
                    <div className="flex-1 bg-transparent min-h-[200px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={MOCK_QUALITY_DATA} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                                <XAxis 
                                    dataKey="label" 
                                    axisLine={{ stroke: '#000', strokeWidth: 2 }} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: '900', fill: '#000'}} 
                                />
                                <YAxis hide domain={[0, 100]} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255, 255, 255, 0.2)'}}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="plannedProfile" name="Planejado" fill="#D40511" barSize={25} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="realProfile" name="Real" fill="#2E7D32" barSize={25} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="plannedDay" name="Dia" fill="#1B1B1B" barSize={25} radius={[4, 4, 0, 0]} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                  </>
              )}
          </div>
      )}

      {activeSubTab === 'AGE' && (
          <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                  <div className="bg-[#B3B3B3] p-3 rounded-lg min-w-[80px] sm:min-w-[100px] text-center flex-1">
                      <p className="text-[8px] font-bold uppercase text-[#444] mb-1">Qtd. OS</p>
                      <p className="text-xl sm:text-2xl font-bold">59</p>
                  </div>
                  <div className="bg-[#B3B3B3] p-3 rounded-lg min-w-[80px] sm:min-w-[100px] text-center flex-1">
                      <p className="text-[8px] font-bold uppercase text-[#444] mb-1">Qtd peças</p>
                      <p className="text-xl sm:text-2xl font-bold">1.287</p>
                  </div>
                  <div className="bg-[#B3B3B3] p-3 rounded-lg min-w-[80px] sm:min-w-[100px] text-center flex-1">
                      <p className="text-[8px] font-bold uppercase text-[#444] mb-1">Tempo médio</p>
                      <p className="text-xl sm:text-2xl font-bold">78h</p>
                  </div>
                  
                  <div className="bg-[#4CAF50] p-3 rounded-lg min-w-[80px] sm:min-w-[100px] text-center flex-1">
                      <p className="text-[8px] font-bold uppercase text-white mb-1">Tempo</p>
                      <p className="text-xl sm:text-2xl font-bold text-white">&lt;12h</p>
                  </div>
                  <div className="bg-[#FFEB3B] p-3 rounded-lg min-w-[80px] sm:min-w-[100px] text-center flex-1">
                      <p className="text-[8px] font-bold uppercase text-black mb-1">Tempo</p>
                      <p className="text-xl sm:text-2xl font-bold text-black">12-24h</p>
                  </div>
                  <div className="bg-[#D35400] p-3 rounded-lg min-w-[80px] sm:min-w-[100px] text-center flex-1">
                      <p className="text-[8px] font-bold uppercase text-white mb-1">Tempo</p>
                      <p className="text-xl sm:text-2xl font-bold text-white">24-36h</p>
                  </div>
                  <div className="bg-[#FF0000] p-3 rounded-lg min-w-[80px] sm:min-w-[100px] text-center flex-1">
                      <p className="text-[8px] font-bold uppercase text-white mb-1">Tempo</p>
                      <p className="text-xl sm:text-2xl font-bold text-white">36-48h</p>
                  </div>
                  <div className="bg-[#800080] p-3 rounded-lg min-w-[80px] sm:min-w-[100px] text-center flex-1">
                      <p className="text-[8px] font-bold uppercase text-white mb-1">Tempo</p>
                      <p className="text-xl sm:text-2xl font-bold text-white">&gt;48h</p>
                  </div>
              </div>

              <div className="bg-[#B3B3B3] p-3 rounded-lg w-full sm:w-fit text-center">
                  <p className="text-[8px] font-bold uppercase text-[#444] mb-1">Qtd. Média de peças por OS</p>
                  <p className="text-2xl font-bold">21</p>
              </div>

              <div className="overflow-x-auto rounded-t-lg shadow border border-gray-200 scrollbar-hide">
                  <table className="w-full border-collapse min-w-[800px]">
                      <thead>
                          <tr className="bg-[#555] text-white">
                              <th className="px-4 py-2 text-[10px] font-black uppercase text-center border-r border-gray-600">OS</th>
                              <th className="px-4 py-2 text-[10px] font-black uppercase text-center border-r border-gray-600">DATA/HORA</th>
                              <th className="px-4 py-2 text-[10px] font-black uppercase text-center border-r border-gray-600">QTD PEÇAS</th>
                              <th className="px-4 py-2 text-[10px] font-black uppercase text-center border-r border-gray-600">AGE</th>
                              <th className="px-4 py-2 text-[10px] font-black uppercase text-center border-r border-gray-600">PWI</th>
                              <th className="px-4 py-2 text-[10px] font-black uppercase text-center border-r border-gray-600">PSR</th>
                              <th className="px-4 py-2 text-[10px] font-black uppercase text-center border-r border-gray-600">PCG</th>
                              <th className="px-4 py-2 text-[10px] font-black uppercase text-center border-r border-gray-600">PSK</th>
                              <th className="px-4 py-2 text-[10px] font-black uppercase text-center">Outros</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white">
                          {MOCK_AGE_DATA.map((row, i) => (
                              <tr key={i} className="border-b border-gray-200 h-10">
                                  <td className="px-4 py-2 text-[11px] font-bold text-center border-r border-gray-100">{row.os}</td>
                                  <td className="px-4 py-2 text-[11px] font-bold text-center border-r border-gray-100">{row.dateTime}</td>
                                  <td className="px-4 py-2 text-[11px] font-bold text-center border-r border-gray-100">{row.pieces}</td>
                                  <td className="px-4 py-2 text-[11px] font-bold text-center border-r border-gray-100">{row.age}</td>
                                  <td className="px-4 py-2 text-[11px] font-bold text-center border-r border-gray-100">{row.pwi}</td>
                                  <td className="px-4 py-2 text-[11px] font-bold text-center border-r border-gray-100">{row.psr}</td>
                                  <td className="px-4 py-2 text-[11px] font-bold text-center border-r border-gray-100 text-orange-600">{row.pcg}</td>
                                  <td className="px-4 py-2 text-[11px] font-bold text-center border-r border-gray-100">{row.psk}</td>
                                  <td className="px-4 py-2 text-[11px] font-bold text-center">{row.others}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeSubTab === 'MODO FALHA' && (
          <div className="flex-1 bg-[#CCCCCC] rounded-xl flex items-center justify-center border-2 border-dashed border-gray-400 p-8 text-center min-h-[300px]">
              <h3 className="text-lg md:text-xl font-bold uppercase text-gray-600">Visualização: {activeSubTab} - {title}</h3>
          </div>
      )}
    </div>
  );
}
