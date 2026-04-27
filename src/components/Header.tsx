export default function Header() {
  return (
    <header className="flex items-center justify-between px-8 py-4 bg-white shadow-sm">
      <h1 className="text-xl font-bold uppercase italic tracking-tighter text-[#333]">
        COCKPIT – RESUMO OPERACIONAL
      </h1>
      <img 
        src="input_file_4.png" 
        alt="Rede Logo" 
        className="h-10 object-contain"
        referrerPolicy="no-referrer"
      />
    </header>
  );
}
