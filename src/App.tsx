
import React, { useState, useCallback, useMemo } from 'react';
import { Product, ProductType, InventoryStats } from './types';
import { InventoryTable } from './components/InventoryTable';
import { generateInventoryXML, generateInventoryCSV, downloadFile } from './utils/exportUtils';
import * as XLSX from 'xlsx';

interface RawDataState {
  headers: string[];
  rows: any[][];
  fileName: string;
}

const App: React.FC = () => {
  const apiBaseUrl = useMemo(() => {
    if (import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }

    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    return isLocalHost ? 'http://localhost:8080' : '';
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawData, setRawData] = useState<RawDataState | null>(null);
  const [mapping, setMapping] = useState<Record<string, number>>({
    code: -1,
    desc: -1,
    qty: -1,
    val: -1
  });
  
  const [vat, setVat] = useState('500000000');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isValuedExport, setIsValuedExport] = useState(true);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /**
   * Validação rigorosa conforme Portaria 2/2015
   */
  const validateProductLocal = (p: Partial<Product>): { errors: string[], suggestions: string } => {
    const errors: string[] = [];
    let suggestion = "";

    // 1. Verificações de Presença
    if (!p.code || p.code.trim() === "" || p.code === "SEM-COD") {
      errors.push("Identificador do Produto (ProductCode) é obrigatório.");
      suggestion = "Falta a referência do artigo.";
    }
    if (!p.description || p.description.trim() === "" || p.description === "DESCRIÇÃO EM FALTA") {
      errors.push("Descrição do Produto (ProductDescription) é obrigatória.");
      suggestion = "Falta a designação comercial.";
    }

    // 2. Verificações de Comprimento Máximo (Crucial para CSV da AT)
    if (p.code && p.code.length > 60) {
      errors.push(`Código excede 60 carateres (Atual: ${p.code.length}).`);
      suggestion = "Abreviar o código do artigo.";
    }
    if (p.description && p.description.length > 200) {
      errors.push(`Descrição excede 200 carateres (Atual: ${p.description.length}).`);
      suggestion = "Reduzir o texto da designação.";
    }
    if (p.unit && p.unit.length > 20) {
      errors.push(`Unidade excede 20 carateres (Atual: ${p.unit.length}).`);
      suggestion = "Usar sigla (ex: UN, KG).";
    }

    // 3. Verificação de Categoria
    if (!p.type || !['M', 'P', 'A', 'S', 'T'].includes(p.type)) {
      errors.push("Categoria inválida. Deve ser M, P, A, S ou T.");
    }

    return { errors, suggestions: suggestion };
  };

  const parseDocumentContent = async (file: File) => {
    if (!file) return;

    // A chamada a setIsProcessing(true) já é feita em handleFileUpload
    setErrorMsg('');

    const formData = new FormData();
    // A chave 'upload' deve corresponder ao que o backend espera.
    formData.append('upload', file);

    try {
      // Faz o pedido para o nosso servidor de API que está a correr na porta 8080
      const response = await fetch(`${apiBaseUrl}/api/parse-pdf`, {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Se o servidor devolver um erro (status 4xx ou 5xx), lança uma exceção
        throw new Error(responseData.error || `Erro do servidor: ${response.statusText}`);
      }

      // A resposta do backend já inclui os produtos validados
      const productsFromApi: Product[] = responseData;

      if (productsFromApi.length === 0) {
        setSuccessMsg('O PDF foi processado, mas não foram encontrados artigos.');
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        // Adiciona os novos produtos à tabela
        setProducts(prevProducts => [...prevProducts, ...productsFromApi]);
      }
    } catch (error: any) {
      console.error('❌ Erro ao processar o PDF:', error);
      setErrorMsg(error.message || 'Ocorreu um erro desconhecido ao processar o PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleValidateAll = () => {
    if (products.length === 0) {
      setErrorMsg("Não há artigos para validar.");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Pequeno atraso para uma melhor experiência de utilizador
    setTimeout(() => {
      setProducts(prevProducts =>
        prevProducts.map(p => ({ ...p, ...validateProductLocal(p) }))
      );
      setIsProcessing(false);
      const errorCount = products.filter(p => validateProductLocal(p).errors.length > 0).length;
      setSuccessMsg(`${products.length} artigos foram validados. Encontrados ${errorCount} erros.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    }, 100);
  };

  const stats = useMemo<InventoryStats>(() => {
    let errs = 0;
    let qty = 0;
    let val = 0;
    const len = products.length;
    for(let i = 0; i < len; i++) {
      const p = products[i];
      if(p.errors.length > 0) errs++;
      qty += p.quantity;
      val += (p.quantity * p.unitValue);
    }
    return {
      totalItems: len,
      totalQuantity: qty,
      totalValue: val,
      errorsCount: errs,
      warningsCount: 0
    };
  }, [products]);

  const resetApp = () => {
    if (confirm("Deseja limpar todos os dados e começar um novo inventário?")) {
      setProducts([]);
      setErrorMsg(null);
      setRawData(null);
      setShowOnlyErrors(false);
    }
  };

  const cleanString = (val: any): string => {
    if (val === null || val === undefined) return "";
    return String(val).trim();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    setErrorMsg(null);
    setRawData(null);

    try {
      if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { 
              type: 'array', 
              cellDates: true,
              codepage: 65001 
            });
            
            let sheetToUse = null;
            let rows: any[][] = [];

            for (const name of workbook.SheetNames) {
              const sheet = workbook.Sheets[name];
              const rangeStr = sheet['!ref'] || "A1:Z100";
              const range = XLSX.utils.decode_range(rangeStr);
              const sheetRows = XLSX.utils.sheet_to_json(sheet, { 
                header: 1, 
                defval: "", 
                blankrows: false,
                range: range
              }) as any[][];

              if (sheetRows.length > 0) {
                rows = sheetRows;
                sheetToUse = name;
                break;
              }
            }
            
            if (!sheetToUse || rows.length === 0) {
              throw new Error("Ficheiro vazio ou ilegível.");
            }

            let headerIdx = 0;
            let maxCols = 0;
            for (let i = 0; i < Math.min(rows.length, 20); i++) {
              const filledCols = rows[i].filter(c => cleanString(c) !== "").length;
              if (filledCols > maxCols) {
                maxCols = filledCols;
                headerIdx = i;
              }
            }

            const actualRows = rows.slice(headerIdx);
            const headers = actualRows[0].map((h, i) => h ? cleanString(h) : `Coluna ${i + 1}`);
            
            setRawData({
              headers,
              rows: actualRows.slice(1),
              fileName: file.name
            });

            const newMap = { code: -1, desc: -1, qty: -1, val: -1 };
            headers.forEach((h, i) => {
              const val = h.toLowerCase();
              if (newMap.code === -1 && /c[óo]d|ref|artigo|sku|id|part/i.test(val)) newMap.code = i;
              if (newMap.desc === -1 && /desc|designa|nome|produto|texto/i.test(val)) newMap.desc = i;
              if (newMap.qty === -1 && /qtd|quant|stock|saldo|exist|qty/i.test(val)) newMap.qty = i;
              if (newMap.val === -1 && /pre[çc]o|valor|unit|custo|p\.v\.p/i.test(val)) newMap.val = i;
            });
            setMapping(newMap);
          } catch (err: any) {
            setErrorMsg(err.message);
          } finally {
            setIsProcessing(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        // Para PDFs e outros ficheiros, chamamos a nova função que contacta o backend
        await parseDocumentContent(file);
      }
    } catch (error: any) {
      setErrorMsg("Erro crítico: " + error.message);
      setIsProcessing(false);
    }
    event.target.value = '';
  };

  const confirmMapping = () => {
    if (!rawData) return;
    setIsProcessing(true);
    
    setTimeout(() => {
      const newProducts: Product[] = [];
      const len = rawData.rows.length;
      
      for (let i = 0; i < len; i++) {
        const row = rawData.rows[i];
        if (!row || row.length === 0) continue;

        const code = mapping.code !== -1 ? cleanString(row[mapping.code]) : "SEM-COD";
        const desc = mapping.desc !== -1 ? cleanString(row[mapping.desc]) : "DESCRIÇÃO EM FALTA";
        
        const parseNum = (val: any) => {
          if (typeof val === 'number') return val;
          const s = String(val || '0').replace(/\s/g, '').replace(',', '.');
          const n = parseFloat(s);
          return isNaN(n) ? 0 : n;
        };

        const qty = mapping.qty !== -1 ? parseNum(row[mapping.qty]) : 0;
        const val = mapping.val !== -1 ? parseNum(row[mapping.val]) : 0;

        const pData: Partial<Product> = {
          code: code || "SEM-COD",
          description: desc || "DESCRIÇÃO EM FALTA",
          quantity: qty,
          unitValue: val,
          type: ProductType.M,
          unit: 'UN',
        };

        const v = validateProductLocal(pData);
        newProducts.push({
          ...pData,
          id: `r-${i}-${Date.now()}`,
          errors: v.errors,
          suggestions: v.suggestions
        } as Product);
      }

      setProducts(prev => [...prev, ...newProducts]);
      setRawData(null);
      setIsProcessing(false);
    }, 50);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-20">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">MPR<span className="text-blue-600">STOCK</span></h1>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Validador Oficial Portaria 2/2015</p>
              </div>
            </div>
            
            <div className="h-10 w-px bg-slate-100 hidden md:block"></div>
            
            <button 
              onClick={resetApp}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 flex items-center gap-2"
            >
              Novo Lote
            </button>
            <button
              onClick={handleValidateAll}
              disabled={isProcessing || products.length === 0}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 hover:text-blue-500 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Validar Lote
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
               <button 
                onClick={() => setIsValuedExport(true)} 
                className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isValuedExport ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 Valorizado
               </button>
               <button 
                onClick={() => setIsValuedExport(false)} 
                className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!isValuedExport ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 Não Valorizado
               </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => downloadFile(generateInventoryCSV(products, isValuedExport), `Stock_${vat}_${year}.csv`, 'text/csv')} 
                disabled={products.length === 0} 
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 disabled:opacity-30 transition-all shadow-md active:scale-95 flex items-center gap-2"
                title="Gera CSV com Quoting Rigoroso anti-erros"
              >
                CSV Seguro
              </button>
              <button 
                onClick={() => downloadFile(generateInventoryXML(products, vat, year, isValuedExport), `Stock_${vat}_${year}.xml`, 'application/xml')} 
                disabled={products.length === 0 || stats.errorsCount > 0} 
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 disabled:opacity-30 transition-all shadow-lg active:scale-95"
              >
                Exportar XML
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {errorMsg && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 shadow-md" role="alert">
            <p className="font-bold">Erro</p>
            <p>{errorMsg}</p>
          </div>
        )}
        {successMsg && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg mb-6 shadow-md animate-in fade-in duration-300" role="alert">
            <p className="font-bold">Sucesso</p>
            <p>{successMsg}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm lg:col-span-2">
             <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">NIF</label>
                  <input type="text" value={vat} onChange={(e) => setVat(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Ano Civil</label>
                  <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
             </div>
             
             <label className={`group flex flex-col items-center justify-center w-full h-44 border-3 border-slate-200 border-dashed rounded-[40px] cursor-pointer bg-slate-50/50 hover:bg-white hover:border-blue-500 transition-all ${isProcessing ? 'opacity-40 animate-pulse cursor-wait' : ''}`}>
                <div className="text-center">
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    {isProcessing ? (
                      <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    )}
                  </div>
                  <p className="text-sm font-black text-slate-700">{isProcessing ? 'Processando...' : 'Carregar Inventário'}</p>
                </div>
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.xlsx,.xls,.csv" disabled={isProcessing} />
             </label>
          </div>

          <div className="lg:col-span-2 bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Integridade dos Dados</p>
                <p className="text-5xl font-black">{stats.errorsCount === 0 && products.length > 0 ? 'OK' : stats.errorsCount}</p>
                <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase">{stats.totalItems} Itens Processados</p>
              </div>
              <div className="border-l border-slate-800 pl-8">
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Valor de Stock</p>
                <p className="text-4xl font-black text-emerald-400">{stats.totalValue.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-6">
               <button 
                onClick={() => stats.errorsCount > 0 && setShowOnlyErrors(!showOnlyErrors)}
                className={`px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${stats.errorsCount > 0 ? 'bg-red-500 text-white animate-bounce' : 'bg-emerald-500 text-white opacity-40'}`}
               >
                 {stats.errorsCount} Erros Detectados (Linhas com falhas de colunas evitem exportação)
               </button>
            </div>
          </div>
        </div>

        {rawData && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden max-h-[90vh]">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-2xl font-black">Mapear Colunas CSV/Excel</h2>
                <button onClick={() => setRawData(null)} className="text-2xl">&times;</button>
              </div>
              <div className="flex-1 overflow-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  {['code', 'desc', 'qty', 'val'].map((f) => (
                    <div key={f} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">{f}</label>
                      <select 
                        value={mapping[f]} 
                        onChange={(e) => setMapping({...mapping, [f]: parseInt(e.target.value)})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                      >
                        <option value={-1}>Ignorar</option>
                        {rawData.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <table className="w-full text-[10px]">
                  <thead className="bg-slate-100 text-slate-500 font-black">
                    <tr>{rawData.headers.map((h, i) => <th key={i} className="px-4 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rawData.rows.slice(0, 5).map((row, ri) => (
                      <tr key={ri} className="border-b border-slate-50">
                        {row.map((cell, ci) => <td key={ci} className="px-4 py-2">{String(cell)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-8 border-t border-slate-100 flex justify-end gap-4">
                <button onClick={() => setRawData(null)} className="font-bold text-slate-400">Cancelar</button>
                <button onClick={confirmMapping} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black">Importar Tudo</button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-12">
          <InventoryTable 
            products={products} 
            onUpdate={(id, up) => setProducts(prev => prev.map(p => p.id === id ? { ...p, ...up, errors: validateProductLocal({...p, ...up}).errors } : p))}
            onDelete={(id) => setProducts(prev => prev.filter(x => x.id !== id))}
            showOnlyErrors={showOnlyErrors}
            onClearErrorFilter={() => setShowOnlyErrors(false)}
          />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-8 text-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
        MPRSTOCK {import.meta.env.VITE_APP_VERSION || 'dev'} &bull; Proteção de Colunas RFC 4180 Ativada
      </footer>
    </div>
  );
};

export default App;
