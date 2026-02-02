
export enum ProductType {
  M = 'M', // Mercadorias
  P = 'P', // Matérias-primas, subsidiárias e de consumo
  A = 'A', // Produtos acabados e intermédios
  S = 'S', // Subprodutos, desperdícios e refugos
  T = 'T', // Produtos e trabalhos em curso
}

export const ProductTypeLabels: Record<ProductType, string> = {
  [ProductType.M]: 'Mercadorias',
  [ProductType.P]: 'Matérias-primas',
  [ProductType.A]: 'Produtos Acabados',
  [ProductType.S]: 'Subprodutos',
  [ProductType.T]: 'Produtos em Curso',
};

export interface Product {
  id: string;
  code: string;
  description: string;
  type: ProductType;
  unit: string;
  quantity: number;
  unitValue: number;
  errors: string[];
  suggestions?: string;
}

export interface InventoryStats {
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  errorsCount: number;
  warningsCount: number;
}
