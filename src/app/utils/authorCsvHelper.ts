/**
 * Utilitário completo para importação, exportação e validação de Autores via CSV
 * Campos suportados: id_autor, nome_autor, nacionalidade, status
 */

import { AuthorItem } from "../types";

export interface CsvImportResult {
  totalRows: number;
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
  importedAuthors: AuthorItem[];
}

export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Analisa linha a linha respeitando aspas duplas, vírgulas ou ponto-e-vírgula
 */
export function parseCsvRows(rawCsv: string): string[][] {
  const rows: string[][] = [];
  const lines = rawCsv.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    // Detecta se o delimitador dominante é ponto-e-vírgula ou vírgula
    const commaCount = (line.match(/,/g) || []).length;
    const semicolonCount = (line.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ";" : ",";

    const row: string[] = [];
    let insideQuotes = false;
    let currentCell = "";

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          currentCell += '"';
          i++; // pula aspas escapadas
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        row.push(currentCell.trim());
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    rows.push(row);
  }

  return rows;
}

export function importAuthorsFromCsv(
  csvContent: string,
  existingAuthors: AuthorItem[],
): CsvImportResult {
  const rows = parseCsvRows(csvContent);
  if (rows.length === 0) {
    return {
      totalRows: 0,
      addedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: ["O arquivo CSV está vazio."],
      importedAuthors: existingAuthors,
    };
  }

  const headerRow = rows[0].map((h) => normalizeText(h));

  // Mapeia índices das colunas
  let idIndex = headerRow.findIndex((h) => h === "id_autor" || h === "id" || h === "codigo");
  let nameIndex = headerRow.findIndex(
    (h) => h === "nome_autor" || h === "nome" || h === "name" || h === "autor",
  );
  let nacIndex = headerRow.findIndex(
    (h) => h === "nacionalidade" || h === "nacionalidade_autor" || h === "pais",
  );
  let statusIndex = headerRow.findIndex((h) => h === "status" || h === "situacao" || h === "ativo");

  // Se não encontrar cabeçalho explícito, tenta deduzir por posição padrão: id, nome, nacionalidade, status
  let dataStartIndex = 1;
  if (nameIndex === -1) {
    // Pode não ter cabeçalho
    idIndex = 0;
    nameIndex = 1;
    nacIndex = 2;
    statusIndex = 3;
    dataStartIndex = 0;
  }

  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  const authorsMap = new Map<string, AuthorItem>();
  // Indexa os existentes por ID e por Nome Normalizado para validação sem duplicações
  const nameToId = new Map<string, string>();

  existingAuthors.forEach((a) => {
    authorsMap.set(a.id, { ...a });
    nameToId.set(normalizeText(a.name), a.id);
  });

  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every((c) => !c.trim())) continue;

    const rawName = (row[nameIndex] || "").trim();
    if (!rawName) {
      errors.push(`Linha ${i + 1}: Ignorada por falta de nome do autor.`);
      skippedCount++;
      continue;
    }

    const rawId = (idIndex >= 0 && row[idIndex] ? row[idIndex].trim() : "") || "";
    const rawNac = (nacIndex >= 0 && row[nacIndex] ? row[nacIndex].trim() : "") || "Brasileira";
    const rawStatus =
      (statusIndex >= 0 && row[statusIndex] ? row[statusIndex].trim().toLowerCase() : "") ||
      "ativo";

    const isActive =
      rawStatus === "ativo" ||
      rawStatus === "active" ||
      rawStatus === "1" ||
      rawStatus === "true" ||
      rawStatus === "sim";
    const statusFormatted = isActive ? "ativo" : "inativo";

    const normalizedName = normalizeText(rawName);

    // Verifica se já existe por ID ou por Nome
    let existingId: string | undefined = undefined;
    if (rawId && authorsMap.has(rawId)) {
      existingId = rawId;
    } else if (nameToId.has(normalizedName)) {
      existingId = nameToId.get(normalizedName);
    }

    if (existingId && authorsMap.has(existingId)) {
      // Atualiza autor existente preservando fotos, frases e relacionamentos existentes
      const current = authorsMap.get(existingId)!;
      authorsMap.set(existingId, {
        ...current,
        name: rawName,
        nome_autor: rawName,
        id_autor: rawId || current.id,
        nacionalidade: rawNac || current.nacionalidade || "Brasileira",
        status: statusFormatted,
        active: isActive,
      });
      updatedCount++;
    } else {
      // Cria novo autor
      const newId =
        rawId ||
        `autor-${normalizedName.replace(/[^a-z0-9]/g, "-")}-${Date.now().toString().slice(-4)}`;
      const newAuthor: AuthorItem = {
        id: newId,
        id_autor: rawId || newId,
        name: rawName,
        nome_autor: rawName,
        nacionalidade: rawNac || "Brasileira",
        status: statusFormatted,
        active: isActive,
        period: "Literatura Brasileira",
        role: `${rawNac || "Literatura Brasileira"}`,
        tag: rawNac || "Literatura Brasileira",
        photoUrl:
          "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&auto=format&fit=crop&q=80",
        featuredQuote: "A leitura abre caminhos para o conhecimento e a imaginação.",
        quoteSource: "Acervo Literário",
        createdAt: new Date().toISOString(),
      };
      authorsMap.set(newId, newAuthor);
      nameToId.set(normalizedName, newId);
      addedCount++;
    }
  }

  const finalAuthors = Array.from(authorsMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
  );

  return {
    totalRows: rows.length - dataStartIndex,
    addedCount,
    updatedCount,
    skippedCount,
    errors,
    importedAuthors: finalAuthors,
  };
}

/**
 * Gera um CSV para download contendo os autores atuais ou o modelo de importação
 */
export function exportAuthorsToCsv(authors: AuthorItem[]): string {
  const header = ["id_autor", "nome_autor", "nacionalidade", "status"];
  const lines = [header.join(";")];

  authors.forEach((a) => {
    const id = a.id_autor || a.id;
    const name = `"${(a.nome_autor || a.name).replace(/"/g, '""')}"`;
    const nac = `"${(a.nacionalidade || "Brasileira").replace(/"/g, '""')}"`;
    const st = a.status || (a.active !== false ? "ativo" : "inativo");
    lines.push([id, name, nac, st].join(";"));
  });

  return lines.join("\r\n");
}

/**
 * Modelo de CSV exemplo pronto com autores brasileiros consagrados
 */
export const SAMPLE_BRAZILIAN_AUTHORS_CSV = [
  "id_autor;nome_autor;nacionalidade;status",
  "1;Machado de Assis;Brasileira;ativo",
  "2;Clarice Lispector;Brasileira;ativo",
  "3;Manoel de Barros;Brasileira;ativo",
  "4;Conceição Evaristo;Brasileira;ativo",
  "5;Guimarães Rosa;Brasileira;ativo",
  "6;Carolina Maria de Jesus;Brasileira;ativo",
  "7;Ariano Suassuna;Brasileira;ativo",
  "8;Cora Coralina;Brasileira;ativo",
  "9;Jorge Amado;Brasileira;ativo",
  "10;Rachel de Queiroz;Brasileira;ativo",
  "11;Carlos Drummond de Andrade;Brasileira;ativo",
  "12;Lygia Fagundes Telles;Brasileira;ativo",
  "13;Graciliano Ramos;Brasileira;ativo",
  "14;Monteiro Lobato;Brasileira;ativo",
  "15;Lima Barreto;Brasileira;ativo",
  "16;Cecília Meireles;Brasileira;ativo",
  "17;Mário de Andrade;Brasileira;ativo",
  "18;Vinicius de Moraes;Brasileira;ativo",
  "19;Érico Veríssimo;Brasileira;ativo",
  "20;Rubem Braga;Brasileira;ativo",
].join("\r\n");
