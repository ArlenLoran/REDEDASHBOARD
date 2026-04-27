import { DetailedMetric } from '../types';
import { MOCK_CHART_DATA, COLORS } from '../constants';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface DetailedViewProps {
  title: string;
  metrics: DetailedMetric[];
  hasBuffer?: boolean;
}

export default function DetailedView({ title, metrics, hasBuffer }: DetailedViewProps) {
  const totalPlanned = metrics.reduce((acc, m) => acc + m.plannedDay, 0);
  const totalDelta = metrics.reduce((acc, m) => acc + m.delta, 0);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <button className="px-4 py-1.5 bg-[#D35400] text-white font-bold text-sm rounded shadow uppercase tracking-tight">
          PLAN X REAL
        </button>
        {title === 'CATALOGAÇÃO' && (
             <>
                <button className="px-4 py-1.5 bg-[#999] text-black font-bold text-sm rounded shadow uppercase tracking-tight">
                    QUALIDADE
                </button>
                <button className="px-4 py-1.5 bg-[#999] text-black font-bold text-sm rounded shadow uppercase tracking-tight">
                    AGE
                </button>
             </>
        )}
        <button className="px-4 py-1.5 bg-[#999] text-black font-bold text-sm rounded shadow uppercase tracking-tight">
          MODO FALHA
        </button>
      </div>

      {/* Filter */}
      <div>
        <button className="px-6 py-1 bg-[#888] text-white font-bold text-sm rounded uppercase italic tracking-tighter">
          FILTRO TECNOLOGIA
        </button>
      </div>

      {/* Content Grid */}
      <div className="flex gap-4 items-stretch">
        {/* Total Planned Card */}
        <div className="bg-[#B3B3B3] p-4 rounded-xl shadow-inner flex flex-col items-center justify-center min-w-[200px]">
            <p className="text-xs font-bold text-[#444] mb-4 uppercase">Planejado Dia</p>
            <p className="text-4xl font-bold text-[#111]">{totalPlanned.toLocaleString()}</p>
        </div>

        {/* Cataloging Specific: Pendente */}
        {title === 'CATALOGAÇÃO' && (
            <div className="bg-[#B3B3B3] p-4 rounded-xl shadow-inner flex flex-col items-center justify-center min-w-[150px]">
                <p className="text-xs font-bold text-[#444] mb-4 uppercase text-center">Pendente<br/>Catalogação</p>
                <p className="text-4xl font-bold text-[#111]">7.200</p>
            </div>
        )}

        {/* Metrics Rows */}
        <div className="flex flex-col gap-2 flex-grow">
            {metrics.map((m, idx) => (
                <div key={idx} className="flex gap-2">
                    {/* Vertical label (simulated) */}
                    <div className="w-12 bg-white/20 flex items-center justify-center">
                        <span className="transform -rotate-90 text-[8px] font-bold uppercase whitespace-nowrap">{m.label}</span>
                    </div>
                    
                    {hasBuffer && (
                        <div className="bg-[#B3B3B3] p-2 rounded-xl flex flex-col items-center justify-center min-w-[80px]">
                            <p className="text-[7px] font-bold text-[#444] uppercase mb-1">Buffer</p>
                            <p className={`text-xl font-bold ${idx === 2 || idx === 3 ? 'text-red-600' : 'text-green-700'}`}>{idx === 0 ? '1.000' : idx === 1 ? '100' : idx === 2 ? '123' : '154'}</p>
                        </div>
                    )}

                    <div className="bg-[#B3B3B3] p-2 rounded-xl flex flex-col items-center justify-center flex-1">
                        <p className="text-[7px] font-bold text-[#444] uppercase mb-1">Planejado dia</p>
                        <p className="text-xl font-bold">{m.plannedDay.toLocaleString()}</p>
                    </div>
                    <div className="bg-[#B3B3B3] p-2 rounded-xl flex flex-col items-center justify-center flex-1">
                        <p className="text-[7px] font-bold text-[#444] uppercase mb-1 text-center">Planejado até horário</p>
                        <p className="text-xl font-bold">{m.plannedToHour.toLocaleString()}</p>
                    </div>
                    <div className="bg-[#B3B3B3] p-2 rounded-xl flex flex-col items-center justify-center flex-1">
                        <p className="text-[7px] font-bold text-[#444] uppercase mb-1 text-center">Real até o horário</p>
                        <p className="text-xl font-bold">{m.realToHour.toLocaleString()}</p>
                    </div>
                    <div className="bg-[#B3B3B3] p-2 rounded-xl flex flex-col items-center justify-center flex-1">
                        <p className="text-[7px] font-bold text-[#444] uppercase mb-1">Delta</p>
                        <p className={`text-xl font-bold ${m.delta >= 0 ? 'text-[#008000]' : 'text-[#D40511]'}`}>
                           {m.delta >= 0 ? '+' : ''}{m.delta}
                        </p>
                    </div>
                </div>
            ))}
        </div>

        {/* Total Delta Card */}
        <div className="bg-[#B3B3B3] p-4 rounded-xl shadow-inner flex flex-col items-center justify-center min-w-[150px]">
            <p className="text-xs font-bold text-[#444] mb-4 uppercase text-center">Delta total<br/>até o momento</p>
            <p className={`text-4xl font-bold ${totalDelta >= 0 ? 'text-[#008000]' : 'text-[#D40511]'}`}>
                {totalDelta >= 0 ? '+' : ''}{totalDelta}
            </p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="flex-1 bg-[#E5E5E5] pt-8 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={MOCK_CHART_DATA}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ccc" />
            <XAxis dataKey="hour" axisLine={true} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
            <YAxis hide />
            <Tooltip />
            <Bar dataKey="lab" stackId="a" fill="#D40511" barSize={40} />
            <Bar dataKey="rev" stackId="a" fill="#FFCC00" />
            <Bar dataKey="new" stackId="a" fill="#27AE60" />
            <Bar dataKey="total" fill="#888888" />
            <Line type="monotone" dataKey="total" stroke="#001529" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
