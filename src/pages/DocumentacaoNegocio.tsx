import { useState } from "react";
import { FileDown, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";

const APP_NAME = "LeilãoFácil Gov";
const VERSAO = "1.0.0 (MVP)";
const DATA_DOC = new Date().toLocaleDateString("pt-BR");

function gerarDocumentacaoNegocio() {
  const doc = new jsPDF();
  const pw = 210;
  const ml = 14;
  const mr = 196;
  const maxW = mr - ml;
  let y = 0;

  const checkPage = (need: number) => {
    if (y + need > 270) {
      doc.addPage();
      y = 20;
    }
  };

  const title = (text: string, size = 14) => {
    checkPage(20);
    doc.setFontSize(size);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 60, 100);
    doc.text(text, ml, y);
    y += size * 0.5 + 2;
    doc.setDrawColor(20, 60, 100);
    doc.setLineWidth(0.5);
    doc.line(ml, y, mr, y);
    y += 6;
    doc.setTextColor(0, 0, 0);
  };

  const subtitle = (text: string) => {
    checkPage(14);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text(text, ml, y);
    y += 6;
    doc.setTextColor(0, 0, 0);
  };

  const paragraph = (text: string) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(text, maxW);
    checkPage(lines.length * 4 + 2);
    doc.text(lines, ml, y);
    y += lines.length * 4 + 3;
  };

  const bullet = (text: string, indent = 0) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    const x = ml + 4 + indent;
    const lines = doc.splitTextToSize(text, maxW - 6 - indent);
    checkPage(lines.length * 4 + 1);
    doc.text("•", ml + indent, y);
    doc.text(lines, x, y);
    y += lines.length * 4 + 1.5;
  };

  const boldLine = (label: string, value: string) => {
    checkPage(6);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(label, ml, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, ml + doc.getTextWidth(label) + 2, y);
    y += 5;
  };

  // ═══════════════════════════════════════════
  // CAPA
  // ═══════════════════════════════════════════
  doc.setFillColor(20, 60, 100);
  doc.rect(0, 0, pw, 297, "F");

  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(APP_NAME, pw / 2, 80, { align: "center" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text("Documentação de Negócio", pw / 2, 100, { align: "center" });

  doc.setFontSize(12);
  doc.text("Regras de Negócio e Funcionalidades", pw / 2, 115, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text(`Versão: ${VERSAO}`, pw / 2, 160, { align: "center" });
  doc.text(`Data de Geração: ${DATA_DOC}`, pw / 2, 168, { align: "center" });
  doc.text("Documento para registro e consulta externa", pw / 2, 176, { align: "center" });

  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.text("Sistema de Gestão de Alienação Patrimonial para Órgãos Públicos", pw / 2, 260, { align: "center" });
  doc.text("Documento gerado automaticamente pelo sistema", pw / 2, 267, { align: "center" });

  // ═══════════════════════════════════════════
  // SUMÁRIO
  // ═══════════════════════════════════════════
  doc.addPage();
  y = 20;
  title("SUMÁRIO", 16);
  const sumario = [
    "1. Visão Geral do Sistema",
    "2. Objetivos e Proposta de Valor",
    "3. Arquitetura e Tecnologias",
    "4. Módulos e Funcionalidades",
    "   4.1. Autenticação e Controle de Acesso",
    "   4.2. Dashboard (Painel de Controle)",
    "   4.3. Novo Processo (Upload CSV)",
    "   4.4. Classificação por IA",
    "   4.5. Revisão de Lotes",
    "   4.6. Lotes Gerados (Aprovação)",
    "   4.7. Documentos",
    "   4.8. Relatórios",
    "   4.9. Integração via API REST",
    "   4.10. Configurações",
    "5. Modelo de Dados",
    "6. Regras de Negócio",
    "7. Fluxo Operacional Completo",
    "8. Glossário",
  ];
  sumario.forEach((item) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", item.startsWith("   ") ? "normal" : "bold");
    doc.setTextColor(50, 50, 50);
    doc.text(item, ml, y);
    y += 6;
  });

  // ═══════════════════════════════════════════
  // 1. VISÃO GERAL
  // ═══════════════════════════════════════════
  doc.addPage();
  y = 20;
  title("1. VISÃO GERAL DO SISTEMA");
  paragraph(
    `O "${APP_NAME}" é uma aplicação SaaS MVP voltada para órgãos públicos com o objetivo de automatizar a análise, classificação e organização de materiais inservíveis (veículos, eletrônicos, móveis, maquinários e outros) para processos de leilão público, visando reduzir o tempo operacional em até 80%.`
  );
  paragraph(
    "O sistema utiliza Inteligência Artificial para classificar automaticamente bens patrimoniais, estimar valores de mercado com base em sites de referência configuráveis, agrupar itens em lotes otimizados e gerar documentação oficial para leilão."
  );
  paragraph(
    "O público-alvo são servidores públicos responsáveis pela gestão patrimonial e alienação de bens em prefeituras, governos estaduais, autarquias e demais entidades governamentais."
  );

  // ═══════════════════════════════════════════
  // 2. OBJETIVOS
  // ═══════════════════════════════════════════
  y += 4;
  title("2. OBJETIVOS E PROPOSTA DE VALOR");
  subtitle("2.1. Objetivo Principal");
  paragraph("Automatizar o fluxo completo de alienação de bens patrimoniais públicos, desde o recebimento da lista de bens até a geração dos documentos para leilão.");
  subtitle("2.2. Proposta de Valor");
  bullet("Redução de até 80% no tempo operacional de processamento de lotes");
  bullet("Classificação automática de bens por categoria usando IA");
  bullet("Precificação inteligente com base em sites de referência de leilões públicos");
  bullet("Agrupamento otimizado de itens em lotes por regras configuráveis");
  bullet("Geração automática de documentos oficiais (PDF, XLSX, DOCX)");
  bullet("Integração via API REST com sistemas patrimoniais existentes (SIADS, ASI, SIPAC)");
  bullet("Validação automática de dados com checklist de erros e avisos");

  // ═══════════════════════════════════════════
  // 3. ARQUITETURA
  // ═══════════════════════════════════════════
  doc.addPage();
  y = 20;
  title("3. ARQUITETURA E TECNOLOGIAS");
  subtitle("3.1. Frontend");
  bullet("React 18 com TypeScript");
  bullet("Vite como bundler");
  bullet("Tailwind CSS para estilização");
  bullet("shadcn/ui como biblioteca de componentes");
  bullet("React Query para gerenciamento de estado assíncrono");
  bullet("React Router para navegação SPA");
  bullet("Recharts para gráficos e visualizações");
  bullet("jsPDF, ExcelJS e docx para geração de documentos");

  subtitle("3.2. Backend");
  bullet("Lovable Cloud (Supabase) para banco de dados PostgreSQL");
  bullet("Edge Functions (Deno) para lógica de negócio serverless");
  bullet("Row Level Security (RLS) para segurança de dados");
  bullet("Supabase Auth para autenticação");
  bullet("Supabase Storage para armazenamento de arquivos (logos)");

  subtitle("3.3. Inteligência Artificial");
  bullet("Lovable AI Gateway para classificação e precificação");
  bullet("Modelo: Google Gemini 3 Flash Preview");
  bullet("Prompt configurável pelo usuário via interface administrativa");

  // ═══════════════════════════════════════════
  // 4. MÓDULOS E FUNCIONALIDADES
  // ═══════════════════════════════════════════
  doc.addPage();
  y = 20;
  title("4. MÓDULOS E FUNCIONALIDADES");

  // 4.1
  subtitle("4.1. Autenticação e Controle de Acesso");
  paragraph("O sistema possui autenticação obrigatória via e-mail e senha. Todas as rotas são protegidas e redirecionam para a tela de login caso o usuário não esteja autenticado.");
  bullet("Login por e-mail ou login simplificado (ex: 'admin' → admin@leilaofacil.gov.br)");
  bullet("Sessão persistente via Supabase Auth");
  bullet("Rotas protegidas com redirecionamento automático");
  bullet("Botão de logout na barra lateral");

  // 4.2
  y += 4;
  subtitle("4.2. Dashboard (Painel de Controle)");
  paragraph("Visão consolidada dos indicadores operacionais do sistema.");
  bullet("Bens Processados: total de bens cadastrados no sistema");
  bullet("Lotes Gerados: quantidade total de lotes criados");
  bullet("Arrecadação Estimada: soma dos valores estimados de todos os processos");
  bullet("Arrecadação Realizada: soma dos valores reais de arrecadação");
  bullet("Processos Ativos: quantidade de processos não finalizados");
  bullet("Banner de performance: exibe a redução média no tempo operacional");

  // 4.3
  checkPage(40);
  y += 4;
  subtitle("4.3. Novo Processo (Upload de CSV)");
  paragraph("Tela principal de entrada de dados. O usuário faz upload de um arquivo contendo a lista de bens patrimoniais.");
  bullet("Formatos aceitos: CSV, Excel (.xlsx, .xls) e PDF");
  bullet("Upload por drag-and-drop ou seleção de arquivo");
  bullet("Download de planilha modelo CSV com colunas padronizadas");
  bullet("Processamento automático com IA ao enviar o arquivo");
  bullet("Exibição de progresso com etapas: Lendo arquivo → Identificando itens → Classificando categorias → Formando lotes");
  bullet("Exibição de resultados: total de bens, total de lotes, arrecadação estimada");
  bullet("Checklist de validação: erros, avisos e sugestões");
  bullet("Bloqueio de avanço caso existam erros de validação");

  // 4.4
  doc.addPage();
  y = 20;
  subtitle("4.4. Classificação por IA");
  paragraph("O motor de classificação utiliza IA generativa para analisar, validar e agrupar os bens patrimoniais.");
  boldLine("Modelo utilizado:", "Google Gemini 3 Flash Preview");
  boldLine("Prompt:", "Configurável via tela de Configuração de Classificação CSV");
  y += 2;
  paragraph("Funcionalidades da classificação:");
  bullet("Classificação automática por categoria (veículos, eletrônicos, móveis, maquinário, outros)");
  bullet("Validação de valores estimados (numéricos e positivos)");
  bullet("Validação de estado de conservação (bom, regular, ruim, inservível)");
  bullet("Validação de número de tombamento (padrão: VEI-2010-001)");
  bullet("Identificação de campos obrigatórios vazios");
  bullet("Detecção de duplicatas por tombamento");
  bullet("Agrupamento em lotes conforme regras do prompt do usuário");
  bullet("Estimativa de valor médio de leilão por item usando sites de referência");

  subtitle("4.4.1. Precificação Inteligente");
  paragraph("Para cada item, a IA consulta os sites de precificação configurados e estima o valor médio de venda em leilões públicos.");
  bullet("Até 3 sites de referência configuráveis pelo usuário");
  bullet("Valor médio calculado por site (site1, site2, site3)");
  bullet("Valor sugerido = média aritmética dos valores disponíveis (valor estimado + sites)");
  bullet("Aproximação inteligente por similaridade quando não há correspondência exata");

  // 4.5
  y += 4;
  subtitle("4.5. Revisão de Lotes");
  paragraph("Tela intermediária entre o processamento e a aprovação. Permite ao usuário revisar e ajustar os lotes antes de salvá-los.");
  bullet("Visualização completa dos lotes gerados pela IA com seus itens");
  bullet("Movimentação de itens entre lotes (arrastar para outro lote)");
  bullet("Criação de novos lotes com categoria personalizada");
  bullet("Exclusão de lotes vazios");
  bullet("Exibição de erros e avisos da classificação");
  bullet("Resumo: total de bens, total de lotes, valor total");
  bullet("Salvar lotes: persiste no banco de dados como 'pendente'");

  // 4.6
  doc.addPage();
  y = 20;
  subtitle("4.6. Lotes Gerados (Aprovação)");
  paragraph("Tela principal de gestão dos lotes. Os processos são listados em cards expansíveis, ordenados pela data de criação (mais recente primeiro).");
  bullet("Agrupamento de lotes por processo");
  bullet("Cada processo exibe: título, órgão, data/hora de criação, quantidade de lotes, valor total, status de aprovação");
  bullet("Checkbox para seleção em massa de processos");
  bullet("Checkbox desabilitado quando todos os lotes do processo estão aprovados");
  bullet("Aprovação individual de lotes ou aprovação em massa (todos do processo)");
  bullet("Edição do preço sugerido antes da aprovação");
  bullet("Visualização expandida dos itens de cada lote com detalhes completos");
  bullet("Geração automática de documento ao aprovar todos os lotes de um processo");
  bullet("Exibição de valores por item: valor estimado, valor médio sites, valor sugerido");

  subtitle("4.6.1. Tabela de Itens do Lote");
  paragraph("Ao expandir um lote, é exibida uma tabela detalhada com as seguintes colunas:");
  bullet("Tombamento, Descrição, Categoria, Estado, Localização, Município");
  bullet("Qtd, Valor Estimado, Valor Médio Site 1/2/3, Valor Sugerido");

  // 4.7
  y += 4;
  subtitle("4.7. Documentos");
  paragraph("Tela de consulta e download dos documentos gerados pelo sistema.");
  bullet("Listagem de todos os documentos gerados, ordenados por data de criação (decrescente)");
  bullet("Colunas: Nome do documento, Processo, Tipo, Status, Ação");
  bullet("Status possíveis: Rascunho, Finalizado");
  bullet("Download disponível em 3 formatos: PDF, XLSX, DOCX");
  bullet("Geração automática ao aprovar todos os lotes de um processo");
  bullet("Tipo principal: 'Composição de Lotes'");

  subtitle("4.7.1. Formato dos Documentos Gerados");
  paragraph("Os documentos de Composição de Lotes mantêm paridade visual entre PDF, XLSX e DOCX:");
  bullet("Cabeçalho com logo do órgão (se configurada) ou nome do sistema");
  bullet("Título: 'DOCUMENTO DE COMPOSIÇÃO DE LOTES PARA LEILÃO'");
  bullet("Informações do processo: título, data, total de lotes, valor total aprovado");
  bullet("Para cada lote: número, categoria, valor aprovado, local de retirada");
  bullet("Tabela de itens: Tombamento, Descrição, Qtd, Estado");
  bullet("Rodapé com crédito e paginação");
  bullet("A coluna 'Valor Estimado' é removida dos documentos de exportação");

  // 4.8
  doc.addPage();
  y = 20;
  subtitle("4.8. Relatórios");
  paragraph("Dashboard analítico com indicadores de desempenho dos leilões.");
  bullet("Leilões Finalizados: quantidade total");
  bullet("Total Arrecadado: valor consolidado");
  bullet("Bens Alienados: quantidade total de bens vendidos");
  bullet("Taxa de Sucesso: percentual de leilões com arrematação");
  bullet("Gráfico de barras: Arrecadação Mensal (Estimado vs Realizado)");
  bullet("Gráfico de pizza: Arrecadação por Categoria (Veículos, Eletrônicos, Móveis, Outros)");

  // 4.9
  y += 4;
  subtitle("4.9. Integração via API REST");
  paragraph("O sistema oferece uma API REST para recebimento de itens diretamente de sistemas patrimoniais externos (SIADS, ASI, SIPAC).");

  subtitle("4.9.1. Autenticação da API");
  bullet("Autenticação via Bearer Token no header Authorization");
  bullet("Tokens gerenciados na tela 'API Access Token'");
  bullet("Cada token possui: nome, status (ativo/inativo), data de criação, último uso");
  bullet("Operações: criar, ativar/desativar, copiar, excluir tokens");
  bullet("Token mascarado por padrão com opção de visualização");

  subtitle("4.9.2. Endpoint de Ingestão");
  boldLine("Método:", "POST");
  boldLine("Rota:", "/functions/v1/intake-items");
  y += 2;
  paragraph("Campos obrigatórios do corpo da requisição:");
  bullet("titulo (string): título do processo");
  bullet("itens (array): lista de bens patrimoniais");
  y += 2;
  paragraph("Campos de cada item:");
  bullet("tombamento, descricao (obrigatório), categoria, estado");
  bullet("localizacao, municipio, quantidade, valor_estimado");
  bullet("valor_medio_site1, valor_medio_site2, valor_medio_site3 (opcionais)");
  y += 2;
  paragraph("O processamento via API utiliza o mesmo prompt de classificação e a mesma lógica de precificação do fluxo CSV, garantindo paridade nos resultados.");

  subtitle("4.9.3. Respostas da API");
  bullet("201: Processo criado com sucesso (retorna processo_id, total_bens, total_lotes)");
  bullet("400: Erros de validação nos campos");
  bullet("401: Token inválido ou não fornecido");
  bullet("403: Token desativado");
  bullet("429: Rate limit excedido");
  bullet("500: Erro interno");

  // 4.10
  doc.addPage();
  y = 20;
  subtitle("4.10. Configurações");

  subtitle("4.10.1. Configuração de Classificação de CSV");
  paragraph("Permite ao administrador personalizar o prompt de IA utilizado para classificar e agrupar os bens patrimoniais.");
  bullet("Editor de texto (textarea) com o prompt completo");
  bullet("Última data de atualização exibida");
  bullet("Botão 'Salvar Configuração' para persistir alterações");
  bullet("Botão 'Restaurar Padrão' para resetar ao prompt original do sistema");
  bullet("O prompt é utilizado tanto no processamento CSV quanto na API");

  subtitle("4.10.2. Configurações da Aplicação (Precificação)");
  paragraph("Configurações gerais do sistema.");
  bullet("Logo do Órgão: upload de imagem para uso nos cabeçalhos dos documentos gerados");
  bullet("Formatos aceitos: qualquer formato de imagem (incluindo SVG com conversão automática)");
  bullet("Sites de Referência: até 3 URLs de sites de leilões para consulta de preços");
  bullet("Cada site possui URL e descrição");

  subtitle("4.10.3. API Access Token");
  paragraph("Gerenciamento dos tokens de acesso para integração via API.");
  bullet("Criar novos tokens com nome personalizado");
  bullet("Ativar/desativar tokens existentes");
  bullet("Copiar token para a área de transferência");
  bullet("Visualizar/ocultar token completo");
  bullet("Excluir tokens");

  // ═══════════════════════════════════════════
  // 5. MODELO DE DADOS
  // ═══════════════════════════════════════════
  doc.addPage();
  y = 20;
  title("5. MODELO DE DADOS");

  const tabelas = [
    {
      nome: "processos",
      desc: "Processos de alienação patrimonial",
      campos: "id, titulo, orgao, user_id, status, total_bens, total_lotes, arrecadacao_estimada, arrecadacao_real, data_upload, created_at, updated_at",
    },
    {
      nome: "bens",
      desc: "Bens patrimoniais individuais",
      campos: "id, processo_id, tombamento, descricao, categoria, estado, localizacao, municipio, quantidade, valor_estimado, valor_medio_site1/2/3, valor_sugerido, created_at",
    },
    {
      nome: "lotes",
      desc: "Lotes agrupados para leilão",
      campos: "id, processo_id, numero, categoria, preco_sugerido, preco_aprovado, status, created_at, updated_at",
    },
    {
      nome: "lotes_bens",
      desc: "Tabela associativa: lotes ↔ bens (N:N)",
      campos: "id, lote_id, bem_id",
    },
    {
      nome: "documentos",
      desc: "Documentos gerados pelo sistema",
      campos: "id, nome, processo_id, processo_titulo, tipo, status, data, created_at",
    },
    {
      nome: "api_tokens",
      desc: "Tokens de acesso para API",
      campos: "id, user_id, nome, token, ativo, created_at, last_used_at",
    },
    {
      nome: "sites_precificacao",
      desc: "Sites de referência para precificação",
      campos: "id, user_id, url, descricao, created_at",
    },
    {
      nome: "configuracao_sistema",
      desc: "Configurações globais do sistema",
      campos: "id, prompt_classificacao_csv, logo_url, data_atualizacao, usuario_atualizacao",
    },
  ];

  tabelas.forEach((t) => {
    checkPage(18);
    subtitle(t.nome);
    paragraph(t.desc);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const cLines = doc.splitTextToSize(`Campos: ${t.campos}`, maxW - 4);
    doc.text(cLines, ml + 2, y);
    y += cLines.length * 3.5 + 4;
  });

  // ═══════════════════════════════════════════
  // 6. REGRAS DE NEGÓCIO
  // ═══════════════════════════════════════════
  doc.addPage();
  y = 20;
  title("6. REGRAS DE NEGÓCIO");

  subtitle("RN01 – Autenticação Obrigatória");
  paragraph("Todo acesso ao sistema requer autenticação. Usuários não autenticados são redirecionados para a tela de login.");

  subtitle("RN02 – Processamento por IA");
  paragraph("Ao fazer upload de um CSV, o sistema envia os dados para a IA junto com o prompt configurado. O prompt do usuário tem prioridade absoluta sobre qualquer regra implícita da IA.");

  subtitle("RN03 – Validação de Dados");
  paragraph("O sistema valida automaticamente os dados do CSV:");
  bullet("Campos obrigatórios: descrição, categoria, localização");
  bullet("Valores estimados devem ser numéricos e positivos");
  bullet("Estado de conservação aceito: bom, regular, ruim, inservível");
  bullet("Tombamento deve seguir padrão (ex: VEI-2010-001)");
  bullet("Duplicatas são sinalizadas por tombamento");

  subtitle("RN04 – Bloqueio por Erros");
  paragraph("Se a classificação detectar erros de validação, o botão 'Revisar Lotes' é desabilitado, impedindo o avanço para a fase de revisão.");

  subtitle("RN05 – Agrupamento em Lotes");
  paragraph("Os itens são agrupados em lotes conforme as regras definidas no prompt do usuário. Se nenhuma regra de agrupamento for definida, o padrão é agrupar por Município + Categoria.");

  subtitle("RN06 – Cálculo do Valor Sugerido");
  paragraph("O valor sugerido de cada item é calculado como a média aritmética dos valores disponíveis:");
  bullet("Valor Estimado (informado pelo usuário)");
  bullet("Valor Médio Site 1 (consultado pela IA)");
  bullet("Valor Médio Site 2 (consultado pela IA)");
  bullet("Valor Médio Site 3 (consultado pela IA)");
  paragraph("Apenas valores maiores que zero são considerados no cálculo.");

  subtitle("RN07 – Preço do Lote");
  paragraph("O preço sugerido de um lote é a soma dos valores sugeridos de cada item multiplicados pela respectiva quantidade.");

  checkPage(30);
  subtitle("RN08 – Aprovação de Lotes");
  paragraph("Lotes podem ser aprovados individualmente ou em massa (por processo ou por seleção). Ao aprovar, o preço aprovado assume o valor sugerido (ou o valor editado manualmente).");

  subtitle("RN09 – Geração Automática de Documentos");
  paragraph("Quando todos os lotes de um processo são aprovados, o sistema gera automaticamente um documento de 'Composição de Lotes' com status 'finalizado' e faz o download do PDF.");

  subtitle("RN10 – Checkbox Desabilitado");
  paragraph("Na tela de Lotes Gerados, o checkbox de um processo é desabilitado quando todos os seus lotes já estão aprovados, impedindo seleção desnecessária.");

  subtitle("RN11 – Paridade CSV/API");
  paragraph("O processamento via API REST utiliza o mesmo prompt de classificação, a mesma lógica de precificação e o mesmo formato de agrupamento do processamento via CSV, garantindo resultados idênticos.");

  doc.addPage();
  y = 20;
  subtitle("RN12 – Token de API");
  paragraph("Tokens de API são gerados automaticamente com UUID e vinculados ao usuário. Um token desativado retorna erro 403. O sistema registra o último uso do token.");

  subtitle("RN13 – Sites de Precificação");
  paragraph("O usuário pode configurar até 3 sites de referência. Esses sites são enviados à IA como fontes de consulta de valores de mercado.");

  subtitle("RN14 – Logo do Órgão");
  paragraph("A logo carregada é utilizada no cabeçalho de todos os documentos gerados (PDF, XLSX, DOCX). Imagens SVG são convertidas automaticamente para PNG via canvas.");

  subtitle("RN15 – Ordenação de Processos");
  paragraph("Na tela de Lotes Gerados, os processos são exibidos em ordem decrescente de data de criação (mais recentes primeiro).");

  subtitle("RN16 – Ordenação de Documentos");
  paragraph("Na tela de Documentos, os registros são ordenados pela data de criação em ordem decrescente, formatada como dd/MM/yyyy.");

  // ═══════════════════════════════════════════
  // 7. FLUXO OPERACIONAL
  // ═══════════════════════════════════════════
  y += 6;
  title("7. FLUXO OPERACIONAL COMPLETO");
  paragraph("O fluxo operacional do sistema segue as seguintes etapas:");
  y += 2;

  const etapas = [
    "1. CONFIGURAÇÃO: O administrador configura o prompt de classificação, os sites de precificação e a logo do órgão.",
    "2. UPLOAD: O usuário faz upload de um arquivo CSV com a lista de bens patrimoniais na tela 'Novo Processo'.",
    "3. CLASSIFICAÇÃO: O sistema envia os dados para a IA, que classifica, valida e agrupa os itens em lotes.",
    "4. CHECKLIST: Erros, avisos e sugestões são exibidos. Se houver erros, o avanço é bloqueado.",
    "5. REVISÃO: Na tela de 'Revisão de Lotes', o usuário pode mover itens entre lotes, criar novos lotes ou excluir lotes vazios.",
    "6. SALVAMENTO: Ao confirmar, os lotes são persistidos no banco com status 'pendente'.",
    "7. APROVAÇÃO: Na tela 'Lotes Gerados', o usuário revisa os preços e aprova os lotes (individual ou em massa).",
    "8. DOCUMENTAÇÃO: Ao aprovar todos os lotes de um processo, o sistema gera automaticamente o documento de composição.",
    "9. DOWNLOAD: Os documentos ficam disponíveis na tela 'Documentos' para download em PDF, XLSX ou DOCX.",
  ];
  etapas.forEach((e) => {
    bullet(e);
  });

  y += 4;
  paragraph("Fluxo alternativo via API:");
  bullet("O sistema patrimonial envia os itens via POST /functions/v1/intake-items com um token de API.");
  bullet("O processamento segue as mesmas etapas de classificação e agrupamento.");
  bullet("Os lotes são criados com status 'pendente' e ficam disponíveis para aprovação na interface web.");

  // ═══════════════════════════════════════════
  // 8. GLOSSÁRIO
  // ═══════════════════════════════════════════
  doc.addPage();
  y = 20;
  title("8. GLOSSÁRIO");

  const glossario = [
    ["Alienação", "Processo legal de transferência de propriedade de bens patrimoniais do poder público para terceiros."],
    ["Bem Patrimonial", "Item de propriedade do órgão público registrado no sistema patrimonial (veículo, equipamento, móvel, etc.)."],
    ["Tombamento", "Número de registro/inventário do bem patrimonial no sistema do órgão (ex: VEI-2010-001)."],
    ["Lote", "Agrupamento de bens patrimoniais para venda conjunta em leilão público."],
    ["Processo", "Conjunto de lotes e bens patrimoniais submetidos para avaliação e leilão."],
    ["Valor Estimado", "Valor declarado pelo órgão para o bem, com base em avaliação interna."],
    ["Valor Sugerido", "Valor calculado pelo sistema como média dos valores de referência disponíveis."],
    ["Preço Aprovado", "Valor final aprovado pelo gestor para o lote ser levado a leilão."],
    ["CSV", "Comma-Separated Values – formato de arquivo tabular utilizado para importação de dados."],
    ["Edge Function", "Função serverless executada na nuvem para processamento de lógica de negócio."],
    ["Prompt", "Instrução textual enviada à IA para guiar a classificação e agrupamento dos bens."],
    ["Sites de Precificação", "URLs de sites de leilões públicos usados como referência de valor de mercado."],
    ["RLS", "Row Level Security – mecanismo de segurança no banco de dados que restringe acesso por linha."],
    ["SPA", "Single Page Application – aplicação web de página única com navegação dinâmica."],
    ["MVP", "Minimum Viable Product – versão mínima viável do produto com funcionalidades essenciais."],
  ];

  glossario.forEach(([termo, definicao]) => {
    checkPage(12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 60, 100);
    doc.text(termo, ml, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    const defLines = doc.splitTextToSize(definicao, maxW - 4);
    doc.text(defLines, ml + 2, y + 4);
    y += 4 + defLines.length * 4 + 3;
  });

  // ═══════════════════════════════════════════
  // RODAPÉ EM TODAS AS PÁGINAS
  // ═══════════════════════════════════════════
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setDrawColor(20, 60, 100);
    doc.setLineWidth(0.3);
    doc.line(ml, ph - 14, mr, ph - 14);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`${APP_NAME} – Documentação de Negócio v${VERSAO}`, ml, ph - 9);
    doc.text(`Página ${i - 1} de ${pageCount - 1}`, mr, ph - 9, { align: "right" });
  }

  doc.save(`documentacao-negocio-leilaofacil-gov-${new Date().toISOString().slice(0, 10)}.pdf`);
}

const DocumentacaoNegocio = () => {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      gerarDocumentacaoNegocio();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Documentação de Negócio</h1>
        <p className="text-muted-foreground mt-1">
          Gere e baixe a documentação completa com todas as regras de negócio e funcionalidades do sistema.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 shadow-card text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
          <BookOpen className="w-8 h-8 text-accent" />
        </div>

        <div>
          <h2 className="text-lg font-display font-semibold text-foreground">
            Documentação Completa do LeilãoFácil Gov
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            O documento PDF contém: visão geral, objetivos, arquitetura, módulos e funcionalidades detalhadas,
            modelo de dados, regras de negócio, fluxo operacional e glossário.
          </p>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generating}
          size="lg"
          className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
        >
          {generating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <FileDown className="w-5 h-5" />
          )}
          {generating ? "Gerando..." : "Gerar e Baixar PDF"}
        </Button>

        <p className="text-xs text-muted-foreground">
          Versão 1.0.0 (MVP) · Documento gerado em formato PDF para registro externo
        </p>
      </div>
    </div>
  );
};

export default DocumentacaoNegocio;
