
import { GoogleGenAI, Type } from "@google/genai";
import { Product, ProductType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const productSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      code: { type: Type.STRING, description: 'Código ou Referência do Artigo (ProductCode)' },
      description: { type: Type.STRING, description: 'Designação Completa (ProductDescription)' },
      type: { type: Type.STRING, description: 'Categoria Oficial AT: M(Mercadorias), P(Matérias-primas), A(Produtos acabados), S(Subprodutos), T(Produtos em curso)' },
      unit: { type: Type.STRING, description: 'Unidade de Medida (UnitOfMeasure), ex: UN, KG, MT' },
      quantity: { type: Type.NUMBER, description: 'Quantidade em Stock (ClosingStockQuantity)' },
      unitValue: { type: Type.NUMBER, description: 'Preço Unitário ou Custo Médio (Value)' },
      suggestions: { type: Type.STRING, description: 'Nota de correção se houver dados ambíguos' }
    },
    required: ['code', 'description', 'type', 'unit', 'quantity']
  }
};

export const parseDocumentContent = async (content: string, mimeType: string = 'text/plain'): Promise<Product[]> => {
  const model = 'gemini-3-pro-preview';
  
  const prompt = `Analise este documento de inventário profissional.
Extraia TODOS os artigos listados sem exceção.
Regras Legais AT (Portugal):
1. Identifique Código, Designação, Quantidade e Valor Unitário.
2. Categorias Obrigatórias (Usa APENAS estas letras): 
   M – mercadorias
   P – matérias-primas, subsidiárias e de consumo
   A – produtos acabados e intermédios
   S – subprodutos, desperdícios e refugos
   T – produtos e trabalhos em curso
3. Se não for explícito, assume 'M'.
4. Unidade de medida padrão: 'UN' se omitido.
Retorne APENAS o JSON estruturado.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { data: content, mimeType: mimeType } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: productSchema,
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });

    if (!response.text) throw new Error("Sem resposta da IA.");

    const products = JSON.parse(response.text.trim()) as any[];
    return products.map((p, idx) => ({
      ...p,
      id: `p-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      errors: validateProduct(p),
      quantity: Number(p.quantity) || 0,
      unitValue: Number(p.unitValue) || 0
    }));
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error("Erro ao processar documento: " + error.message);
  }
};

const validateProduct = (product: any): string[] => {
  const errors: string[] = [];
  if (!product.code || product.code === "---") errors.push("Código em falta.");
  if (!product.description || product.description === "Não identificada") errors.push("Descrição em falta.");
  if (!Object.values(ProductType).includes(product.type as ProductType)) {
    errors.push("Categoria inválida (Use M, P, A, S ou T).");
  }
  if (product.quantity < 0) errors.push("Quantidade negativa.");
  return errors;
};
