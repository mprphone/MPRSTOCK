
import React, { useState, useMemo } from 'react';
import { Product, ProductType, ProductTypeLabels } from '../types';

interface InventoryTableProps {
  products: Product[];
  onUpdate: (id: string, updates: Partial<Product>) => void;
  onDelete: (id: string) => void;
  showOnlyErrors: boolean;
  onClearErrorFilter: () => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ products, onUpdate, onDelete, showOnlyErrors, onClearErrorFilter }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedError, setSelectedError] = useState<{ id: string, msg: string, sug: string } | null>(null);
  const itemsPerPage = 50;

  const filteredProducts = useMemo(() => {
    let result = products;
    if (showOnlyErrors) {
      result = result.filter(p => p.errors.length > 0);
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.code.toLowerCase().includes(lowerSearch) || 
        p.description.toLowerCase().includes(lowerSearch)
      );
    }
    return result;
  }, [products, searchTerm, showOnlyErrors]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showOnlyErrors]);

  return (
    <div className="space-y-6">
      {selectedError && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-10 relative overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-300">
            <div className="absolute top-0 right-0 p-8">
                <button onClick={() => setSelectedError(null)} className="text-slate-300 hover:text-slate-900 text-4xl font-light transition-colors">&times;</button>
            </div>
            
            <div className="bg-red-50 w-16 h-16 rounded-3xl flex items-center justify-center mb-8">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Erro no Artigo</h3>
            <p className="text-slate-500 font-medium mb-8">A Autoridade Tributária rejeitará este artigo se os dados não forem corrigidos.</p>

            <div className="space-y-5">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Mensagem de Erro</p>
                <p className="text-sm font-black text-slate-800 leading-relaxed">{selectedError.msg}</p>
              </div>
              
              <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Sugestão de Correção</p>
                <p className="text-sm text-blue-900 leading-relaxed font-bold italic">
                  &ldquo;{selectedError.sug || "Preencha a descrição ou o código em falta diretamente na linha da tabela correspondente."}&rdquo;
                </p>
              </div>
              
              <button 
                onClick={() => setSelectedError(null)}
                className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-[0.98]"
              >
                Voltar à Tabela
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-5 rounded-[30px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full sm:w-[400px]">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-300">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </span>
            <input
              type="text"
              placeholder="Pesquisar artigos..."
              className="pl-12 w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none text-sm font-medium transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {showOnlyErrors && (
            <button 
              onClick={onClearErrorFilter}
              className="flex items-center gap-2 bg-red-100 text-red-600 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-200 transition-all"
            >
              Exibindo Apenas Erros
              <span className="text-lg leading-none">&times;</span>
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-all text-xs font-black uppercase">Anterior</button>
          <div className="text-[10px] font-black text-slate-400 whitespace-nowrap bg-slate-100 px-4 py-2.5 rounded-xl uppercase tracking-widest">Página {currentPage} / {totalPages || 1}</div>
          <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-all text-xs font-black uppercase">Próxima</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[35px] border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
            <thead className="bg-slate-50/50 text-slate-400 font-black uppercase tracking-widest text-[9px] border-b border-slate-100">
                <tr>
                <th className="px-6 py-5 w-16 text-center">Valid</th>
                <th className="px-6 py-5">Código Artigo</th>
                <th className="px-6 py-5 min-w-[300px]">Designação (DescArt)</th>
                <th className="px-6 py-5">Categoria</th>
                <th className="px-6 py-5">Unid</th>
                <th className="px-6 py-5 text-center">Stock</th>
                <th className="px-6 py-5">P.Unit (€)</th>
                <th className="px-6 py-5 text-right">Val. Stock</th>
                <th className="px-6 py-5 text-center">Remover</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {currentItems.map((p) => (
                <tr key={p.id} className={`group hover:bg-blue-50/30 transition-colors ${p.errors.length > 0 ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4 text-center">
                    {p.errors.length > 0 ? (
                        <button 
                        onClick={() => setSelectedError({ id: p.id, msg: p.errors.join('. '), sug: p.suggestions || "" })}
                        className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-red-500 font-black text-sm hover:scale-110 transition-all shadow-md shadow-red-100 border border-red-200 animate-pulse"
                        >
                        !
                        </button>
                    ) : (
                        <div className="flex h-9 w-9 mx-auto items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 text-sm shadow-sm border border-emerald-100">✓</div>
                    )}
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px]">
                    <input type="text" value={p.code} onChange={(e) => onUpdate(p.id, { code: e.target.value })} className="w-full bg-transparent focus:bg-white rounded-xl px-3 py-2 outline-none border border-transparent hover:border-slate-200 transition-all font-bold" />
                    </td>
                    <td className="px-6 py-4">
                    <input type="text" value={p.description} onChange={(e) => onUpdate(p.id, { description: e.target.value })} className="w-full bg-transparent focus:bg-white rounded-xl px-3 py-2 outline-none border border-transparent hover:border-slate-200 transition-all text-xs font-black text-slate-700" placeholder="Insira o nome do artigo..." />
                    </td>
                    <td className="px-6 py-4">
                    <select value={p.type} onChange={(e) => onUpdate(p.id, { type: e.target.value as ProductType })} className="bg-slate-50 focus:bg-white rounded-xl px-2 py-2 outline-none text-[10px] font-black border border-slate-100 hover:border-blue-200 cursor-pointer appearance-none text-center min-w-[60px]">
                        {Object.entries(ProductTypeLabels).map(([val, label]) => (
                        <option key={val} value={val}>{val}</option>
                        ))}
                    </select>
                    </td>
                    <td className="px-6 py-4">
                    <input type="text" value={p.unit} onChange={(e) => onUpdate(p.id, { unit: e.target.value })} className="w-14 bg-transparent focus:bg-white rounded-xl px-2 py-2 outline-none text-center font-black text-slate-400 uppercase text-[10px]" />
                    </td>
                    <td className="px-6 py-4">
                    <input type="number" value={p.quantity} onChange={(e) => onUpdate(p.id, { quantity: parseFloat(e.target.value) || 0 })} className="w-24 bg-transparent focus:bg-white rounded-xl px-3 py-2 outline-none font-black text-slate-900 text-center" />
                    </td>
                    <td className="px-6 py-4">
                    <input type="number" step="0.01" value={p.unitValue} onChange={(e) => onUpdate(p.id, { unitValue: parseFloat(e.target.value) || 0 })} className="w-24 bg-transparent focus:bg-white rounded-xl px-3 py-2 outline-none text-slate-600 font-bold" />
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-[11px] font-black text-blue-600">
                    {(p.quantity * p.unitValue).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                    </td>
                    <td className="px-6 py-4 text-center">
                    <button onClick={() => onDelete(p.id)} className="text-slate-200 hover:text-red-500 transition-all p-3 rounded-2xl hover:bg-red-50 active:scale-90">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                    </td>
                </tr>
                ))}
                {currentItems.length === 0 && (
                <tr>
                    <td colSpan={9} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                        <div className="p-6 bg-slate-50 rounded-[40px] mb-6">
                            <svg className="w-16 h-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        </div>
                        <p className="text-lg font-black text-slate-300 uppercase tracking-widest">Sem Artigos para Exibir</p>
                        <p className="text-sm text-slate-400 font-medium">Experimente ajustar o filtro de pesquisa.</p>
                    </div>
                    </td>
                </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] px-6 pt-4">
        <span>A exibir {filteredProducts.length.toLocaleString()} de {products.length.toLocaleString()} Artigos</span>
        {totalPages > 1 && <span>Página {currentPage} de {totalPages}</span>}
      </div>
    </div>
  );
};
