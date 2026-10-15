// @ts-nocheck
import { QuizQuestion } from '../data/quizQuestions';

export interface GeminiAlternativa {
  letra: 'A' | 'B' | 'C' | 'D';
  texto: string;
}

export interface GeminiQuizResponse {
  livro_titulo: string;
  autor: string;
  pergunta_numero: number;
  total_perguntas: number;
  enunciado: string;
  capitulo_referencia?: string;
  pontos: number;
  alternativas: GeminiAlternativa[];
  resposta_correta: 'A' | 'B' | 'C' | 'D';
  explicacao: string;
  dica_guru?: string;
}

/**
 * Solicita uma nova questão ao Gemini via endpoint server-side proxy
 */
export async function gerarQuestaoComGemini(
  livroTitulo: string,
  autor: string,
  nivel: number = 1,
  totalPerguntas: number = 5
): Promise<GeminiQuizResponse> {
  try {
    const response = await fetch('/api/gemini-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        livroTitulo,
        autor,
        nivel,
        totalPerguntas,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro na API do Gemini: ${response.status} ${response.statusText}`);
    }

    const data: GeminiQuizResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Falha ao gerar questão com Google AI Studio:', error);
    // Retorno de fallback seguro em caso de indisponibilidade de rede
    return {
      livro_titulo: livroTitulo,
      autor: autor,
      pergunta_numero: nivel,
      total_perguntas: totalPerguntas,
      enunciado:
        livroTitulo.toLowerCase().includes('dom casmurro')
          ? "No clássico 'Dom Casmurro', como o narrador Bento Santiago descreve os olhos de Capitu?"
          : `Qual elemento é central na narrativa de "${livroTitulo}" de ${autor}?`,
      capitulo_referencia: 'Capítulo XXXII - Olhos de Ressaca',
      pontos: nivel * 1000,
      alternativas: [
        { letra: 'A', texto: 'Olhos de ressaca, como a vaga do mar que tudo traga.' },
        { letra: 'B', texto: 'Olhos cor de esmeralda reluzente sob o luar da Tijuca.' },
        { letra: 'C', texto: 'Olhos calmos e límpidos como as águas de um riacho sereno.' },
        { letra: 'D', texto: 'Olhos flamejantes de ambição e cólera incontida.' },
      ],
      resposta_correta: 'A',
      explicacao:
        "Machado de Assis constrói a famosa metáfora dos 'olhos de ressaca' através da fala de José Dias no Capítulo XXXII.",
      dica_guru: 'Lembre-se da comparação com a onda do mar que puxa para dentro!',
    };
  }
}

/**
 * Converte resposta estruturada do Gemini no formato QuizQuestion utilizado pela aplicação
 */
export function converterParaQuizQuestion(
  geminiQ: GeminiQuizResponse,
  coverUrl?: string
): QuizQuestion {
  const letters = ['A', 'B', 'C', 'D'];
  const correctIdx = letters.indexOf(geminiQ.resposta_correta);

  // Ordena alternativas A, B, C, D garantindo 4 opções
  const optionsMap: Record<string, string> = {};
  geminiQ.alternativas.forEach((alt) => {
    optionsMap[alt.letra] = alt.texto;
  });

  const options: [string, string, string, string] = [
    optionsMap['A'] || geminiQ.alternativas[0]?.texto || 'Opção A',
    optionsMap['B'] || geminiQ.alternativas[1]?.texto || 'Opção B',
    optionsMap['C'] || geminiQ.alternativas[2]?.texto || 'Opção C',
    optionsMap['D'] || geminiQ.alternativas[3]?.texto || 'Opção D',
  ];

  return {
    id: `gemini_${geminiQ.pergunta_numero}_${Date.now()}`,
    bookTitle: geminiQ.livro_titulo,
    bookAuthor: geminiQ.autor,
    bookCover: coverUrl || '',
    question: geminiQ.enunciado,
    options,
    correctIndex: correctIdx >= 0 ? correctIdx : 0,
    explanation: geminiQ.explicacao,
    points: geminiQ.pontos || geminiQ.pergunta_numero * 1000,
    capituloReferencia: geminiQ.capitulo_referencia,
    dicaGuru: geminiQ.dica_guru,
    nivel: geminiQ.pergunta_numero,
  };
}

/**
 * Integração Dinâmica com o Banco de Dados da Maria Quitéria:
 * Carrega livros retirados do aluno atual a partir de estrutura de dados/backup
 */
export function obterLivrosDoAluno(bancoDadosJson: any, codigoAluno: string) {
  if (!bancoDadosJson?.dados?.emprestimos) return [];
  const cleanCode = (codigoAluno || '').replace(/^ALU-/, '').trim().toLowerCase();
  const emprestimos = bancoDadosJson.dados.emprestimos.filter(
    (emp: any) =>
      (emp.codigo_aluno || '').replace(/^ALU-/, '').trim().toLowerCase() === cleanCode &&
      (emp.status === 'Emprestado' || emp.status === 'ativo' || emp.status === 'em_andamento')
  );

  return emprestimos.map((emp: any) => {
    const livro = bancoDadosJson.dados.livros?.find((l: any) => l.id === emp.livro_id);
    return {
      emprestimoId: emp.id,
      titulo: livro ? livro.titulo : emp.livro_titulo || 'Obra da Biblioteca',
      autor: livro ? livro.autor : emp.livro_autor || 'Autor Desconhecido',
      capaUrl: livro ? livro.capa_url || livro.cover : null,
      dataDevolucao: emp.data_devolucao_prevista || emp.returnDate,
    };
  });
}
