import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { GoogleGenAI, Type } from "@google/genai";

function getFallbackQuestion(livroTitulo: string, autor: string, nivel: number, totalPerguntas: number) {
  if (livroTitulo && livroTitulo.toLowerCase().includes("dom casmurro")) {
    return {
      livro_titulo: "Dom Casmurro",
      autor: "Machado de Assis",
      pergunta_numero: nivel,
      total_perguntas: totalPerguntas,
      enunciado: "No clássico 'Dom Casmurro', como o narrador Bento Santiago descreve os olhos de Capitu?",
      capitulo_referencia: "Capítulo XXXII - Olhos de Ressaca",
      pontos: nivel * 1000,
      alternativas: [
        { letra: "A", texto: "Olhos de ressaca, como a vaga do mar que tudo traga." },
        { letra: "B", texto: "Olhos cor de esmeralda reluzente sob o luar da Tijuca." },
        { letra: "C", texto: "Olhos calmos e límpidos como as águas de um riacho sereno." },
        { letra: "D", texto: "Olhos flamejantes de ambição e cólera incontida." },
      ],
      resposta_correta: "A",
      explicacao: "Machado de Assis constrói a famosa metáfora dos 'olhos de ressaca' através da fala de José Dias no Capítulo XXXII.",
      dica_guru: "Lembre-se da comparação com a onda do mar que puxa para dentro!",
    };
  }
  return {
    livro_titulo: livroTitulo || "Obra da Biblioteca",
    autor: autor || "Autor da Obra",
    pergunta_numero: nivel,
    total_perguntas: totalPerguntas,
    enunciado: `Qual aspecto mais marcante define a narrativa da obra "${livroTitulo}" de ${autor}?`,
    capitulo_referencia: "Contexto Geral da Obra",
    pontos: nivel * 1000,
    alternativas: [
      { letra: "A", texto: `O desenvolvimento profundo dos personagens e o contexto sociocultural da obra.` },
      { letra: "B", texto: "Uma viagem no tempo utilizando tecnologia do século XXII." },
      { letra: "C", texto: "Um tratado exclusivo sobre anatomia e biologia celular." },
      { letra: "D", texto: "Regulamentos esportivos de corridas automobilísticas." },
    ],
    resposta_correta: "A",
    explicacao: `A obra "${livroTitulo}" de ${autor} destaca-se pela sensibilidade na caracterização humana e riqueza literária.`,
    dica_guru: "Pense na essência e no impacto da leitura que você realizou na biblioteca!",
  };
}

async function handleGeminiQuiz(request: Request): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      livroTitulo?: string;
      autor?: string;
      nivel?: number;
      totalPerguntas?: number;
    };
    const livroTitulo = body.livroTitulo || "Obra Literária";
    const autor = body.autor || "Autor";
    const nivel = Number(body.nivel) || 1;
    const totalPerguntas = Number(body.totalPerguntas) || 5;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[Gemini API] GEMINI_API_KEY não configurada no servidor. Retornando fallback estruturado.");
      return new Response(JSON.stringify(getFallbackQuestion(livroTitulo, autor, nivel, totalPerguntas)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Gere a questão número ${nivel} de ${totalPerguntas} para o livro "${livroTitulo}" de "${autor}".
Nível de dificuldade: ${nivel}/5.
Valendo ${nivel * 1000} pontos.
Certifique-se de que a pergunta teste a leitura real do aluno da Biblioteca Maria Quitéria.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: `Você é o Gerador Oficial de Questões do "Desafio Literário - Show de Saberes" da Biblioteca Maria Quitéria.
Sua função é gerar desafios literários instigantes e pedagógicos baseados exclusivamente nos livros do acervo escolar.

Diretrizes:
- Gere perguntas de múltipla escolha com 4 alternativas: A, B, C e D.
- Apenas 1 alternativa deve ser a correta. As outras 3 devem ser distratores plausíveis e bem formulados.
- Cada pergunta deve especificar o nível de dificuldade (1 a 5), pontuação (1000 a 5000), o capítulo ou contexto da obra, e uma breve explicação histórica/literária.
- Responda OBRIGATORIAMENTE em JSON no formato estruturado especificado.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            livro_titulo: { type: Type.STRING },
            autor: { type: Type.STRING },
            pergunta_numero: { type: Type.INTEGER },
            total_perguntas: { type: Type.INTEGER },
            enunciado: { type: Type.STRING },
            capitulo_referencia: { type: Type.STRING },
            pontos: { type: Type.INTEGER },
            alternativas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  letra: { type: Type.STRING, enum: ["A", "B", "C", "D"] },
                  texto: { type: Type.STRING },
                },
                required: ["letra", "texto"],
              },
            },
            resposta_correta: { type: Type.STRING, enum: ["A", "B", "C", "D"] },
            explicacao: { type: Type.STRING },
            dica_guru: { type: Type.STRING },
          },
          required: [
            "livro_titulo",
            "autor",
            "pergunta_numero",
            "total_perguntas",
            "enunciado",
            "pontos",
            "alternativas",
            "resposta_correta",
            "explicacao",
          ],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Resposta vazia da API Gemini");
    }

    const questao = JSON.parse(text);
    return new Response(JSON.stringify(questao), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Gemini API] Falha na requisição Gemini:", error);
    return new Response(
      JSON.stringify(getFallbackQuestion("Obra da Biblioteca", "Autor", 1, 5)),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/gemini-quiz") {
        if (request.method === "POST") {
          return await handleGeminiQuiz(request);
        }
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
