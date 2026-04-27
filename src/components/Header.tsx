import { Menu, X } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarVisible: boolean;
}

export default function Header({ toggleSidebar, isSidebarVisible }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 sm:px-8 py-4 bg-white shadow-sm gap-4">
      <div className="flex items-center gap-2 sm:gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          title={isSidebarVisible ? "Ocultar menu" : "Mostrar menu"}
        >
          {isSidebarVisible ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-sm sm:text-lg md:text-xl font-bold uppercase italic tracking-tighter text-[#333] line-clamp-2 sm:line-clamp-none">
          COCKPIT – RESUMO OPERACIONAL
        </h1>
      </div>
      <img 
        src="input_file_4.png" 
        alt="Rede Logo" 
        className="h-6 sm:h-8 md:h-10 object-contain shrink-0"
        referrerPolicy="no-referrer"
      />
    </header>
  );
}
