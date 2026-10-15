// @ts-nocheck
import { AuthorItem } from "../types";

export const BRAZILIAN_AUTHORS_CSV_RAW = `id_autor;nome_autor;nacionalidade;status
001;Adélia Prado;Brasileira;Ativo
002;Afonso Arinos;Brasileira;Ativo
003;Ailton Krenak;Brasileira;Ativo
004;Aluísio Azevedo;Brasileira;Ativo
005;Ana Maria Machado;Brasileira;Ativo
006;André Neves;Brasileira;Ativo
007;Angélica Freitas;Brasileira;Ativo
008;Antônio Callado;Brasileira;Ativo
009;Ariano Suassuna;Brasileira;Ativo
010;Augusto dos Anjos;Brasileira;Ativo
011;Bernardo Guimarães;Brasileira;Ativo
012;Bruna Beber;Brasileira;Ativo
013;Bráulio Bessa;Brasileira;Ativo
014;Caco Galhardo;Brasileira;Ativo
015;Carla Madeira;Brasileira;Ativo
016;Carlos Drummond de Andrade;Brasileira;Ativo
017;Cecília Meireles;Brasileira;Ativo
018;Chico Buarque;Brasileira;Ativo
019;Clarice Lispector;Brasileira;Ativo
020;Conceição Evaristo;Brasileira;Ativo
021;Cora Coralina;Brasileira;Ativo
022;Cruz e Sousa;Brasileira;Ativo
023;Dalton Trevisan;Brasileira;Ativo
024;Daniel Munduruku;Brasileira;Ativo
025;Djamila Ribeiro;Brasileira;Ativo
026;Domingos Pellegrini;Brasileira;Ativo
027;Euclides da Cunha;Brasileira;Ativo
028;Fernando Sabino;Brasileira;Ativo
029;Ferreira Gullar;Brasileira;Ativo
030;Flávia Lins e Silva;Brasileira;Ativo
031;Gabriel, o Pensador;Brasileira;Ativo
032;Graciliano Ramos;Brasileira;Ativo
033;Guilherme de Almeida;Brasileira;Ativo
034;Hilda Hilst;Brasileira;Ativo
035;Ignácio de Loyola Brandão;Brasileira;Ativo
036;Jeferson Tenório;Brasileira;Ativo
037;Jorge Amado;Brasileira;Ativo
038;José de Alencar;Brasileira;Ativo
039;José Lins do Rego;Brasileira;Ativo
040;José Mauro de Vasconcelos;Brasileira;Ativo
041;José Paulo Paes;Brasileira;Ativo
042;João do Rio;Brasileira;Ativo
043;João Guimarães Rosa;Brasileira;Ativo
044;João Ubaldo Ribeiro;Brasileira;Ativo
045;Júlia Lopes de Almeida;Brasileira;Ativo
046;Lima Barreto;Brasileira;Ativo
047;Lygia Bojunga;Brasileira;Ativo
048;Lygia Fagundes Telles;Brasileira;Ativo
049;Machado de Assis;Brasileira;Ativo
050;Manuel Bandeira;Brasileira;Ativo
051;Marcelino Freire;Brasileira;Ativo
052;Marcelo Rubens Paiva;Brasileira;Ativo
053;Maria Clara Machado;Brasileira;Ativo
054;Maria Firmina dos Reis;Brasileira;Ativo
055;Marina Colasanti;Brasileira;Ativo
056;Maurício de Sousa;Brasileira;Ativo
057;Milton Hatoum;Brasileira;Ativo
058;Mário de Andrade;Brasileira;Ativo
059;Mário Quintana;Brasileira;Ativo
060;Nelson Rodrigues;Brasileira;Ativo
061;Nicolau Sevcenko;Brasileira;Ativo
062;Nélida Piñon;Brasileira;Ativo
063;Olavo Bilac;Brasileira;Ativo
064;Orígenes Lessa;Brasileira;Ativo
065;Paulo Coelho;Brasileira;Ativo
066;Paulo Freire;Brasileira;Ativo
067;Pedro Bandeira;Brasileira;Ativo
068;Plínio Marcos;Brasileira;Ativo
069;Rachel de Queiroz;Brasileira;Ativo
070;Raduan Nassar;Brasileira;Ativo
071;Raul Pompeia;Brasileira;Ativo
072;Ricardo Azevedo;Brasileira;Ativo
073;Rubem Braga;Brasileira;Ativo
074;Rubem Fonseca;Brasileira;Ativo
075;Ruth Rocha;Brasileira;Ativo
076;Silviano Santiago;Brasileira;Ativo
077;Sérgio Buarque de Holanda;Brasileira;Ativo
078;Sérgio Capparelli;Brasileira;Ativo
079;Tatiana Belinky;Brasileira;Ativo
080;Thalita Rebouças;Brasileira;Ativo
081;Vinicius de Moraes;Brasileira;Ativo
082;Walcyr Carrasco;Brasileira;Ativo
083;Ziraldo;Brasileira;Ativo
084;Zélia Gattai;Brasileira;Ativo
085;Érico Veríssimo;Brasileira;Ativo
086;Índigo;Brasileira;Ativo`;

/**
 * Remove acentos e converte para minúsculas para comparação semântica estrita.
 */
export function normalizeAuthorName(name: string): string {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Gera um ID único em slug baseado no nome do autor.
 */
export function slugifyAuthorName(name: string, fallbackId?: string): string {
  const normalized = normalizeAuthorName(name)
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallbackId || `autor-${Date.now()}`;
}

export interface CsvAuthorRow {
  authorCode?: string;
  name: string;
  nationality: string;
  active: boolean;
}

export interface ParseCsvResult {
  rows: CsvAuthorRow[];
  totalParsed: number;
  errors: string[];
}

/**
 * Faz o parsing de dados CSV de autores (aceita separador ';' ou ',').
 */
export function parseAuthorsCsv(csvContent: string): ParseCsvResult {
  const errors: string[] = [];
  const rows: CsvAuthorRow[] = [];

  if (!csvContent || !csvContent.trim()) {
    return { rows: [], totalParsed: 0, errors: ["Arquivo CSV vazio ou sem conteúdo."] };
  }

  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rows: [], totalParsed: 0, errors: ["Arquivo CSV sem linhas de dados."] };
  }

  // Detecta separador da primeira linha
  const headerLine = lines[0];
  const sep = headerLine.includes(";") ? ";" : ",";
  const headerParts = headerLine.split(sep).map((h) => normalizeAuthorName(h));

  // Descobre índices das colunas com prioridade correta
  let codeIdx = headerParts.findIndex((h) => h.includes("id") || h.includes("codigo") || h.includes("code"));
  let nameIdx = headerParts.findIndex(
    (h) => h.includes("nome") || (h.includes("autor") && !h.includes("id") && !h.includes("cod")) || h.includes("name"),
  );
  let natIdx = headerParts.findIndex(
    (h) => h.includes("nacionalidade") || h.includes("pais") || h.includes("nationality"),
  );
  let statusIdx = headerParts.findIndex(
    (h) => h.includes("status") || h.includes("situacao") || (h.includes("ativo") && !h.includes("autor")),
  );

  // Fallback para posições padrão se não achar nomes nas colunas
  if (nameIdx === -1 && headerParts.length >= 2) {
    codeIdx = 0;
    nameIdx = 1;
    natIdx = 2;
    statusIdx = 3;
  } else if (nameIdx === -1 && headerParts.length === 1) {
    nameIdx = 0;
  }

  // Começa da linha 1 (pula cabeçalho) a não ser que não seja cabeçalho
  const startIdx =
    headerParts.some((h) => h.includes("id") || h.includes("nome") || h.includes("autor")) ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;

    const parts = rawLine.split(sep).map((p) => p.trim());
    const rawName = nameIdx >= 0 && parts[nameIdx] ? parts[nameIdx] : parts[1] || parts[0];

    if (!rawName) {
      errors.push(`Linha ${i + 1}: nome de autor não identificado.`);
      continue;
    }

    const code = codeIdx >= 0 && parts[codeIdx] ? parts[codeIdx] : undefined;
    const nationality = natIdx >= 0 && parts[natIdx] ? parts[natIdx] : "Brasileira";
    const rawStatus = statusIdx >= 0 && parts[statusIdx] ? parts[statusIdx] : "Ativo";
    const active =
      normalizeAuthorName(rawStatus) === "ativo" ||
      normalizeAuthorName(rawStatus) === "sim" ||
      normalizeAuthorName(rawStatus) === "true" ||
      rawStatus === "1";

    rows.push({
      authorCode: code,
      name: rawName,
      nationality: nationality || "Brasileira",
      active,
    });
  }

  return {
    rows,
    totalParsed: rows.length,
    errors,
  };
}

/**
 * Converte linhas do CSV em AuthorItem completo para o sistema,
 * preservando detalhes enriquecidos se o autor já existir.
 */
export function convertCsvRowToAuthorItem(
  row: CsvAuthorRow,
  existingList: AuthorItem[] = [],
): AuthorItem {
  const normName = normalizeAuthorName(row.name);
  const existing = existingList.find(
    (a) => normalizeAuthorName(a.name) === normName || (row.authorCode && a.authorCode === row.authorCode),
  );

  if (existing) {
    return {
      ...existing,
      name: row.name || existing.name,
      nationality: row.nationality || existing.nationality || "Brasileira",
      active: row.active !== undefined ? row.active : existing.active !== false,
      authorCode: row.authorCode || existing.authorCode,
    };
  }

  const generatedId = slugifyAuthorName(row.name, row.authorCode ? `autor-${row.authorCode}` : undefined);

  return {
    id: generatedId,
    name: row.name,
    authorCode: row.authorCode,
    nationality: row.nationality || "Brasileira",
    role: "Escritor(a) da Literatura Brasileira",
    tag: "Literatura Brasileira",
    active: row.active,
    photoUrl: "",
    featuredQuote: "",
    quoteSource: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Dataset completo pré-processado dos 86 autores brasileiros oficiais.
 */
export const BRAZILIAN_AUTHORS_INITIAL: AuthorItem[] = parseAuthorsCsv(BRAZILIAN_AUTHORS_CSV_RAW).rows.map(
  (row) => convertCsvRowToAuthorItem(row),
);
