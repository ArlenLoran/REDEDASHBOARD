import { DashboardTab } from '../types';
import { COLORS } from '../constants';

interface SidebarProps {
  activeTab: DashboardTab;
  onSelect: (tab: DashboardTab) => void;
  isVisible: boolean;
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

export default function Sidebar({ activeTab, onSelect, isVisible }: SidebarProps) {
  return (
    <aside 
      className={`fixed lg:relative h-full shadow-xl z-20 flex flex-col items-center transition-[width,transform] duration-300 transform overflow-hidden ${
        isVisible ? 'w-56 translate-x-0' : 'w-0 -translate-x-full lg:w-0'
      }`} 
      style={{ backgroundColor: COLORS.dhlYellow }}
    >
      <div className="flex flex-col items-center w-56 h-full shrink-0">
        {/* Top logo area */}
        <div className="h-12 w-full shrink-0" />

        {/* Centered Navigation */}
        <div className="flex-1 w-full flex flex-col justify-center space-y-0.5 pl-2 pr-0 overflow-hidden">
        {MENU_ITEMS.map((item) => (
          <button
            key={item}
            onClick={() => onSelect(item)}
            className={`w-full text-left px-2 py-1.5 text-[12.5px] font-bold tracking-tight uppercase relative ${
              activeTab === item 
                ? 'bg-[#E5E5E5] text-black rounded-l-xl rounded-r-none z-30 outline-none' 
                : 'text-black bg-white/5 hover:bg-white/20 mb-px mr-2 rounded-sm transition-colors duration-200'
            }`}
          >
            {item}
            {activeTab === item && (
                <>
                    {/* Top Inverted Curve */}
                    <div className="absolute -top-3.5 right-0 w-3.5 h-3.5 overflow-hidden pointer-events-none">
                        <div className="w-full h-full rounded-br-full bg-transparent shadow-[0_0_0_10px_#E5E5E5]" />
                    </div>
                    {/* Bottom Inverted Curve */}
                    <div className="absolute -bottom-3.5 right-0 w-3.5 h-3.5 overflow-hidden pointer-events-none">
                        <div className="w-full h-full rounded-tr-full bg-transparent shadow-[0_0_0_10px_#E5E5E5]" />
                    </div>
                </>
            )}
          </button>
        ))}
      </div>

        {/* DHL Logo at the absolute bottom */}
        <div className="mt-8 px-4 pb-8 w-full">
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
      </div>
    </aside>
  );
}
