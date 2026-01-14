
import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, X, Plus, Loader2, AlertCircle } from 'lucide-react';
import { Token } from '../types';
import { fetchTokenMetadata } from '../services/geminiService';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-[#111111] border border-[#222222] rounded-3xl p-5 shadow-2xl ${className}`}>
    {children}
  </div>
);

export const Button: React.FC<{ 
  children: React.ReactNode; 
  onClick?: () => void; 
  className?: string; 
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean;
}> = ({ children, onClick, className = "", variant = 'primary', disabled = false }) => {
  const baseStyles = "px-6 py-4 rounded-2xl font-black transition-all active:scale-95 text-center disabled:opacity-50 disabled:active:scale-100 uppercase tracking-widest text-sm flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-[#0052FF] hover:bg-[#0042CC] text-white shadow-[0_4px_20px_rgba(0,82,255,0.3)]",
    secondary: "bg-[#1A1A1A] border border-[#333] hover:bg-[#222] text-gray-200",
    danger: "bg-red-600 hover:bg-red-700 text-white"
  };
  
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md" 
        onClick={onClose}
      />
      <div className="relative bg-[#0A0A0A] border-t sm:border border-[#222] w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] p-6 pt-8 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-[#222] rounded-full sm:hidden" />
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black tracking-tighter">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors bg-[#111] rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  );
};

export const SearchableTokenSelector: React.FC<{
  tokens: Token[];
  selectedToken: Token;
  onSelect: (token: Token) => void;
  onImport?: (token: Token) => void;
  label: string;
}> = ({ tokens, selectedToken, onSelect, onImport, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const isAddress = useMemo(() => {
    return /^0x[a-fA-F0-9]{40}$/.test(search);
  }, [search]);

  const filteredTokens = useMemo(() => {
    return tokens.filter(t => 
      t.symbol.toLowerCase().includes(search.toLowerCase()) || 
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.address && t.address.toLowerCase() === search.toLowerCase())
    );
  }, [tokens, search]);

  const handleImport = async () => {
    if (!isAddress) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const metadata = await fetchTokenMetadata(search);
      const newToken: Token = {
        ...metadata,
        address: search,
        balance: 0,
        icon: metadata.symbol[0]
      };
      if (onImport) onImport(newToken);
      onSelect(newToken);
      setIsOpen(false);
      setSearch('');
    } catch (e) {
      setImportError("Failed to fetch token details. Check the address.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-[#1A1A1A] hover:bg-[#222] px-4 py-2.5 rounded-2xl border border-[#333] flex items-center gap-2.5 font-black shrink-0 transition-all active:scale-95 shadow-lg group"
      >
        {selectedToken.iconUrl ? (
          <img src={selectedToken.iconUrl} className="w-6 h-6 rounded-full ring-1 ring-white/10" alt={selectedToken.symbol} />
        ) : (
          <div className="w-6 h-6 bg-gradient-to-br from-[#0052FF] to-[#002288] rounded-full text-[10px] flex items-center justify-center text-white ring-1 ring-white/10">{selectedToken.symbol[0]}</div>
        )}
        <span className="text-sm tracking-tight">{selectedToken.symbol}</span>
        <ChevronDown size={16} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
      </button>

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setImportError(null); }} title={`Select Asset`}>
        <div className="space-y-6 pb-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
            <input 
              autoFocus
              type="text"
              placeholder="Search by name or address..."
              className="w-full bg-[#111] border border-[#222] rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-[#0052FF88] transition-all text-white font-bold placeholder:text-gray-700"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setImportError(null); }}
            />
          </div>

          <div className="space-y-2 min-h-[300px]">
            {filteredTokens.length > 0 ? (
              filteredTokens.map(token => (
                <button
                  key={token.address || token.symbol}
                  onClick={() => {
                    onSelect(token);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all hover:bg-[#1A1A1A] group active:scale-[0.98] ${
                    selectedToken.symbol === token.symbol ? 'bg-[#0052FF15] border border-[#0052FF33]' : 'border border-[#1A1A1A]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {token.iconUrl ? (
                      <img src={token.iconUrl} className="w-10 h-10 rounded-xl bg-[#222] p-1" alt={token.symbol} />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#222] flex items-center justify-center font-black text-blue-500 border border-[#333] uppercase">{token.symbol[0]}</div>
                    )}
                    <div className="text-left">
                      <div className="font-black text-sm group-hover:text-blue-400 transition-colors">{token.symbol}</div>
                      <div className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">{token.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-white tabular-nums">{(token.balance || 0).toLocaleString()}</div>
                    <div className="text-[10px] text-gray-500 font-bold">In Wallet</div>
                  </div>
                </button>
              ))
            ) : isAddress ? (
              <div className="py-2 space-y-4">
                 <div className="p-6 bg-[#0052FF11] border border-[#0052FF33] rounded-[24px]">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="text-blue-400" size={16} />
                      <p className="text-xs text-blue-400 font-black uppercase tracking-widest">New Asset Detected</p>
                    </div>
                    <p className="text-[11px] font-mono break-all text-gray-400 mb-6 bg-black/40 p-3 rounded-xl border border-[#222]">{search}</p>
                    <Button 
                      onClick={handleImport} 
                      className="w-full"
                      disabled={isImporting}
                    >
                      {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                      {isImporting ? 'Syncing...' : 'Import to Portal'}
                    </Button>
                 </div>
                 {importError && (
                   <div className="flex items-center gap-2 text-red-400 text-xs font-bold px-4 animate-in shake">
                     <AlertCircle size={16} /> {importError}
                   </div>
                 )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-600 gap-4">
                <Search size={48} className="opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">No matching assets</p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};
