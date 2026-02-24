export interface Bem {
  id: string;
  descricao: string;
  categoria: "veiculos" | "eletronicos" | "moveis" | "maquinario" | "outros";
  estado: "bom" | "regular" | "ruim" | "inservivel";
  localizacao: string;
  tombamento: string;
  valorEstimado: number;
  loteId?: string;
}

export interface Lote {
  id: string;
  numero: number;
  categoria: string;
  itens: Bem[];
  precoSugerido: number;
  precoAprovado?: number;
  status: "pendente" | "aprovado" | "em_leilao" | "arrematado";
}

export interface Processo {
  id: string;
  titulo: string;
  orgao: string;
  dataUpload: string;
  status: "processando" | "revisao" | "aprovado" | "em_leilao" | "finalizado";
  totalBens: number;
  totalLotes: number;
  arrecadacaoEstimada: number;
  arrecadacaoReal?: number;
}

export const categoriasLabels: Record<string, string> = {
  veiculos: "Veículos",
  eletronicos: "Eletrônicos",
  moveis: "Móveis",
  maquinario: "Maquinário",
  outros: "Outros",
};

export const estadoLabels: Record<string, string> = {
  bom: "Bom",
  regular: "Regular",
  ruim: "Ruim",
  inservivel: "Inservível",
};

export const statusLabels: Record<string, string> = {
  processando: "Processando",
  revisao: "Em Revisão",
  aprovado: "Aprovado",
  em_leilao: "Em Leilão",
  finalizado: "Finalizado",
  pendente: "Pendente",
  arrematado: "Arrematado",
};

export const mockBens: Bem[] = [
  { id: "b1", descricao: "Fiat Uno 2010 - Placa ABC-1234", categoria: "veiculos", estado: "inservivel", localizacao: "Garagem Central", tombamento: "VEI-2010-001", valorEstimado: 4500 },
  { id: "b2", descricao: "VW Gol 2012 - Placa DEF-5678", categoria: "veiculos", estado: "ruim", localizacao: "Garagem Central", tombamento: "VEI-2012-002", valorEstimado: 6200 },
  { id: "b3", descricao: "Chevrolet S10 2008 - Placa GHI-9012", categoria: "veiculos", estado: "inservivel", localizacao: "Pátio Secretaria de Obras", tombamento: "VEI-2008-003", valorEstimado: 8900 },
  { id: "b4", descricao: "Computador Desktop Dell OptiPlex 7010", categoria: "eletronicos", estado: "ruim", localizacao: "Almoxarifado TI", tombamento: "ELE-2015-044", valorEstimado: 150 },
  { id: "b5", descricao: "Impressora HP LaserJet P2055", categoria: "eletronicos", estado: "inservivel", localizacao: "Almoxarifado TI", tombamento: "ELE-2013-089", valorEstimado: 80 },
  { id: "b6", descricao: "Monitor LG 19\" LCD", categoria: "eletronicos", estado: "ruim", localizacao: "Almoxarifado TI", tombamento: "ELE-2014-102", valorEstimado: 60 },
  { id: "b7", descricao: "Notebook Lenovo ThinkPad T430", categoria: "eletronicos", estado: "regular", localizacao: "Almoxarifado TI", tombamento: "ELE-2014-055", valorEstimado: 320 },
  { id: "b8", descricao: "Mesa de escritório em MDF 1.20m", categoria: "moveis", estado: "ruim", localizacao: "Depósito Sede", tombamento: "MOV-2010-201", valorEstimado: 45 },
  { id: "b9", descricao: "Cadeira giratória estofada", categoria: "moveis", estado: "inservivel", localizacao: "Depósito Sede", tombamento: "MOV-2012-215", valorEstimado: 25 },
  { id: "b10", descricao: "Armário de aço 4 portas", categoria: "moveis", estado: "regular", localizacao: "Depósito Sede", tombamento: "MOV-2008-180", valorEstimado: 120 },
  { id: "b11", descricao: "Estante metálica 5 prateleiras", categoria: "moveis", estado: "ruim", localizacao: "Depósito Sede", tombamento: "MOV-2009-195", valorEstimado: 55 },
  { id: "b12", descricao: "Ar condicionado Split 12000 BTUs", categoria: "eletronicos", estado: "inservivel", localizacao: "Almoxarifado Geral", tombamento: "ELE-2011-033", valorEstimado: 200 },
];

export const mockLotes: Lote[] = [
  {
    id: "l1", numero: 1, categoria: "Veículos Leves",
    itens: [mockBens[0], mockBens[1], mockBens[2]],
    precoSugerido: 19600, status: "pendente",
  },
  {
    id: "l2", numero: 2, categoria: "Equipamentos de Informática",
    itens: [mockBens[3], mockBens[4], mockBens[5], mockBens[6]],
    precoSugerido: 610, status: "pendente",
  },
  {
    id: "l3", numero: 3, categoria: "Mobiliário de Escritório",
    itens: [mockBens[7], mockBens[8], mockBens[9], mockBens[10]],
    precoSugerido: 245, status: "pendente",
  },
  {
    id: "l4", numero: 4, categoria: "Climatização",
    itens: [mockBens[11]],
    precoSugerido: 200, status: "pendente",
  },
];

export const mockProcessos: Processo[] = [
  { id: "p1", titulo: "Alienação de Bens - 1º Semestre 2026", orgao: "Prefeitura Municipal de São Paulo", dataUpload: "2026-02-20", status: "revisao", totalBens: 12, totalLotes: 4, arrecadacaoEstimada: 20655 },
  { id: "p2", titulo: "Desfazimento Frota 2025", orgao: "Tribunal de Justiça - SP", dataUpload: "2026-02-15", status: "aprovado", totalBens: 28, totalLotes: 7, arrecadacaoEstimada: 85200 },
  { id: "p3", titulo: "Leilão Equipamentos TI", orgao: "Governo do Estado - MG", dataUpload: "2026-02-10", status: "finalizado", totalBens: 45, totalLotes: 10, arrecadacaoEstimada: 12800, arrecadacaoReal: 15420 },
  { id: "p4", titulo: "Alienação Mobiliário Sede", orgao: "Prefeitura Municipal de Curitiba", dataUpload: "2026-01-28", status: "em_leilao", totalBens: 67, totalLotes: 12, arrecadacaoEstimada: 34500 },
];

export const dashboardStats = {
  totalBensProcessados: 152,
  lotesGerados: 33,
  arrecadacaoEstimada: 153155,
  arrecadacaoRealizada: 98420,
  processosAtivos: 4,
  tempoMedioProcessamento: "2.5 horas",
  reducaoTempo: 82,
};
