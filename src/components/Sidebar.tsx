import { DashboardTab } from '../types';
import { COLORS } from '../constants';

interface SidebarProps {
  activeTab: DashboardTab;
  onSelect: (tab: DashboardTab) => void;
}

const MENU_ITEMS: DashboardTab[] = [
  'RESUMO',
  'RECEBIMENTO',
  'CATALOGAÇÃO',
  'CARGA APP + TRIAGEM',
  'SALA BATERIAS',
  'SEPARAÇÃO COMPONENTES',
  'MONTAGEM KIT',
  'CQ',
  'EXPEDIÇÃO',
];

export default function Sidebar({ activeTab, onSelect }: SidebarProps) {
  return (
    <aside 
      className="w-60 flex flex-col items-center py-8 shadow-xl z-10" 
      style={{ backgroundColor: COLORS.dhlYellow }}
    >
      <div className="flex-1 w-full space-y-2 px-2">
        {MENU_ITEMS.map((item) => (
          <button
            key={item}
            onClick={() => onSelect(item)}
            className={`w-full text-left px-4 py-2 text-sm font-bold tracking-tight transition-all uppercase rounded-sm border-b-2 border-transparent ${
              activeTab === item 
                ? 'bg-white text-black shadow-md rounded-l-full -mr-2 relative z-20 translate-x-2 hover:bg-white' 
                : 'text-black bg-white/20 hover:bg-white/40'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mt-auto px-4 pb-4">
        {/* DHL Logo with stripes */}
        <div className="flex flex-col items-center">
            <img 
                src="input_file_0.png" 
                alt="DHL Logo" 
                className="h-10 object-contain"
                referrerPolicy="no-referrer"
            />
            {/* The red stripes shown in Image 1 */}
            <div className="w-full h-1 mt-1 bg-[#D40511] opacity-80" />
            <div className="w-full h-1 mt-0.5 bg-[#D40511] opacity-80" />
            <div className="w-full h-1 mt-0.5 bg-[#D40511] opacity-80" />
        </div>
      </div>
    </aside>
  );
}
