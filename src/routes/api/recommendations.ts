import { createFileRoute } from "@tanstack/react-router";

type BookInput = {
  id: string; title: string; author?: string; category?: string;
  synopsis?: string; pages?: number; status?: string; availableCopies?: number;
};
type Recommendation = { bookId: string; reason: string };

function localRecommendations(prompt: string, books: BookInput[]): Recommendation[] {
  const tokens = prompt.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const stop = new Set(["quero","livro","livros","algo","parecido","para","com","uma","uns","que","tem","tenho","gosto","ler","leitura","curto","curta","hoje","sobre","mais","tipo"]);
  const terms = tokens.filter((t) => !stop.has(t));
  return books.map((book) => {
    const text = [book.title, book.author, book.category, book.synopsis].join(" ").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const score = terms.reduce((n, term) => n + (text.includes(term) ? (book.title.toLowerCase().includes(term) ? 4 : book.category?.toLowerCase().includes(term) ? 3 : 1) : 0), 0);
    return { bookId: book.id, score, reason: score > 0 ? "Este título tem temas ou palavras em comum com o que você descreveu." : "Pode ser uma descoberta interessante para explorar novas histórias." };
  }).sort((a,b) => b.score - a.score || (b.availableCopies ?? 0) - (a.availableCopies ?? 0)).slice(0, Math.min(3, books.length)).map(({bookId,reason})=>({bookId,reason}));
}

export const Route = createFileRoute("/api/recommendations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json() as { prompt?: unknown; books?: unknown };
          const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 600) : "";
          if (!prompt) return Response.json({ error: "Escreva o que você gostaria de ler." }, { status: 400 });
          if (!Array.isArray(body.books) || body.books.length === 0 || body.books.length > 2000) {
            return Response.json({ error: "Não foi possível ler o catálogo de livros." }, { status: 400 });
          }
          const books = (body.books as BookInput[]).filter((b) => b && typeof b.id === "string" && typeof b.title === "string").slice(0, 2000);
          if (!books.length) return Response.json({ recommendations: [], source: "local" });
          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) return Response.json({ recommendations: localRecommendations(prompt, books), source: "local" });
          const catalog = books.map((b) => ({ id: b.id, title: b.title, author: b.author, category: b.category, synopsis: (b.synopsis || "").slice(0, 700), pages: b.pages, availableCopies: b.availableCopies }));
          const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: process.env.OPENAI_MODEL || "gpt-4o-mini",
              temperature: 0.5,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: "Você é Maria Quitéria, uma mediadora de leitura acolhedora para estudantes. Recomende de 1 a 3 livros EXCLUSIVAMENTE pelos IDs recebidos no catálogo. Nunca invente títulos ou IDs. Escolha os mais relevantes ao pedido, dê uma razão curta em português brasileiro. Se nenhum combinar, retorne { \"recommendations\": [] }. Responda somente JSON no formato { \"recommendations\": [{ \"bookId\": \"ID existente\", \"reason\": \"explicação curta\" }] }." },
                { role: "user", content: JSON.stringify({ pedido: prompt, catalogo: catalog }) }
              ]
            }),
          });
          if (!aiResponse.ok) {
            console.error("Falha no provedor de recomendações:", aiResponse.status);
            return Response.json({ recommendations: localRecommendations(prompt, books), source: "local" });
          }
          const result = await aiResponse.json();
          const content = result?.choices?.[0]?.message?.content;
          const parsed = JSON.parse(content || "{}");
          const allowed = new Set(books.map((b) => b.id));
          const seen = new Set<string>();
          const recommendations = (Array.isArray(parsed.recommendations) ? parsed.recommendations : [])
            .filter((r: any) => typeof r?.bookId === "string" && allowed.has(r.bookId) && !seen.has(r.bookId) && (seen.add(r.bookId), true))
            .slice(0, 3)
            .map((r: any) => ({ bookId: r.bookId, reason: String(r.reason || "Este título combina com o seu pedido.").slice(0, 240) }));
          return Response.json({ recommendations, source: "ai" });
        } catch (error) {
          console.error("Erro na recomendação de livros:", error);
          return Response.json({ error: "Não foi possível gerar sugestões agora. Tente novamente." }, { status: 500 });
        }
      },
    },
  },
});
