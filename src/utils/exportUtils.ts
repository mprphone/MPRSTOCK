
import { Product } from "../types";

export const generateInventoryXML = (products: Product[], vat: string, year: string, isValued: boolean): string => {
  const date = new Date().toISOString().split('T')[0];
  const xmlParts: string[] = [];
  
  xmlParts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  xmlParts.push(`<StockFile xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`);
  xmlParts.push(`  <StockHeader>`);
  xmlParts.push(`    <TaxRegistrationNumber>${vat}</TaxRegistrationNumber>`);
  xmlParts.push(`    <FiscalYear>${year}</FiscalYear>`);
  xmlParts.push(`    <DateCreated>${date}</DateCreated>`);
  xmlParts.push(`    <ProductStockIndex>1</ProductStockIndex>`);
  xmlParts.push(`  </StockHeader>`);
  
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const value = isValued ? p.unitValue.toFixed(2) : "0.00";
    xmlParts.push(`  <ProductStock>`);
    xmlParts.push(`    <ProductCategory>${p.type}</ProductCategory>`);
    xmlParts.push(`    <ProductCode>${escapeXML(p.code)}</ProductCode>`);
    xmlParts.push(`    <ProductDescription>${escapeXML(p.description)}</ProductDescription>`);
    xmlParts.push(`    <ProductNumberCode>${escapeXML(p.code)}</ProductNumberCode>`);
    xmlParts.push(`    <ClosingStockQuantity>${p.quantity.toFixed(2)}</ClosingStockQuantity>`);
    xmlParts.push(`    <UnitOfMeasure>${escapeXML(p.unit)}</UnitOfMeasure>`);
    xmlParts.push(`    <Value>${value}</Value>`);
    xmlParts.push(`  </ProductStock>`);
  }
  
  xmlParts.push(`</StockFile>`);
  return xmlParts.join('\n');
};

/**
 * Sanitiza campos para CSV sem utilizar aspas.
 * A Autoridade Tributária em Portugal muitas vezes rejeita aspas nos nomes das colunas.
 * Remove rigorosamente o delimitador ";" e quebras de linha para manter a integridade das colunas.
 */
const sanitizeCSVField = (val: any): string => {
  if (val === null || val === undefined) return "";
  
  return String(val)
    .replace(/[\n\r\t]/g, " ") // Remove quebras de linha e tabs
    .replace(/;/g, " ")        // CRÍTICO: Remove ponto e vírgula para não criar colunas fantasma
    .replace(/"/g, "")         // Remove aspas para evitar o erro '"ProductCategory"'
    .trim();
};

export const generateInventoryCSV = (products: Product[], isValued: boolean): string => {
  // UTF-8 BOM pode ser necessário para Excel, mas alguns validadores da AT preferem UTF-8 simples.
  // Mantemos o BOM pois é o padrão para software em Português, mas sem aspas nos campos.
  const BOM = "\uFEFF"; 
  
  // Cabeçalhos EXATOS conforme Portaria 2/2015, sem aspas.
  const header = [
    "ProductCategory",
    "ProductCode",
    "ProductDescription",
    "ProductNumberCode",
    "ClosingStockQuantity",
    "UnitOfMeasure"
  ];

  if (isValued) {
    header.push("Value");
  }
  
  // Linha de cabeçalho: Nomes puros separados por ;
  const csvLines: string[] = [header.join(";")];
  
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    
    // Formatação numérica: 2 casas decimais com vírgula como separador decimal (Padrão PT)
    const qtyStr = p.quantity.toFixed(2).replace('.', ',');
    const valStr = p.unitValue.toFixed(2).replace('.', ',');
    
    const row = [
      sanitizeCSVField(p.type),
      sanitizeCSVField(p.code),
      sanitizeCSVField(p.description),
      sanitizeCSVField(p.code), // ProductNumberCode (fallback EAN)
      qtyStr,                   // Números não precisam de sanitize pois já vêm formatados
      sanitizeCSVField(p.unit)
    ];

    if (isValued) {
      row.push(valStr);
    }
    
    csvLines.push(row.join(";"));
  }
  
  return BOM + csvLines.join('\n');
};

const escapeXML = (str: string) => {
  if (!str) return "";
  return str.toString().replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
