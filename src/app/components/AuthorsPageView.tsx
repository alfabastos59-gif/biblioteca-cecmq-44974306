// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  Feather,
  Search,
  BookOpen,
  Sparkles,
  ArrowLeft,
  Quote,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Plus,
  SlidersHorizontal,
  X,
  UserCheck,
  ChevronRight,
  Info,
} from "lucide-react";
import { AuthorItem, Book, UserSession } from "../types";
import { getStoredAuthors, subscribeToAuthorsUpdate, saveStoredAuthors } from "../data/authorsData";
import { normalizeText } from "../utils/authorCsvHelper";
import { useTheme } from "../context/ThemeContext";
import { AuthorModal } from "./AuthorModal";

interface AuthorsPageViewProps {
  books: Book[];
  onSelectBook?: (book: Book) => void;
  onFilterByAuthorInCatalog: (authorName: string) => void;
  onBackToCatalog: () => void;
  session?: UserSession;
  onOpenAdminAuthors?: () => void;
}

export const AuthorsPageView: React.FC<AuthorsPageViewProps> = ({
  books,
  onSelectBook,
  onFilterByAuthorInCatalog,
  onBackToCatalog,
  session,
  onOpenAdminAuthors,
}) => {
  const { isDark, isEmerald, isPurple } = useTheme();

  const [authors, setAuthors] = useState<AuthorItem[]>(() => getStoredAuthors());
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("todos");
  const [selectedLetter, setSelectedLetter] = useState<string>("todos");
  const [selectedAuthorDetail, setSelectedAuthorDetail] = useState<AuthorItem | null>(null);

  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false);
  const [authorToEdit, setAuthorToEdit] = useState<AuthorItem | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuthorsUpdate(() => {
      setAuthors(getStoredAuthors());
    });
    return unsub;
  }, []);

  // Executa a busca
  const handleExecuteSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveQuery(searchInput.trim());
    setSelectedLetter("todos");
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setActiveQuery("");
    setSelectedLetter("todos");
  };

  // Mapeia quantidade de livros por autor no acervo
  const booksByAuthorMap = useMemo(() => {
    const map = new Map<string, Book[]>();
    books.forEach((book) => {
      const authorName = (book.author || "").trim();
      if (!authorName) return;
      const normalizedBookAuthor = normalizeText(authorName);
      if (!map.has(normalizedBookAuthor)) {
        map.set(normalizedBookAuthor, []);
      }
      map.get(normalizedBookAuthor)!.push(book);
    });
    return map;
  }, [books]);

  // Função para contar livros de um autor específico
  const getBooksCountForAuthor = (authorName: string): number => {
    const norm = normalizeText(authorName);
    let count = 0;
    booksByAuthorMap.forEach((bookList, key) => {
      if (key.includes(norm) || norm.includes(key)) {
        count += bookList.length;
      }
    });
    return count;
  };

  // Obter livros de um autor específico
  const getBooksForAuthor = (authorName: string): Book[] => {
    const norm = normalizeText(authorName);
    const result: Book[] = [];
    booksByAuthorMap.forEach((bookList, key) => {
      if (key.includes(norm) || norm.includes(key)) {
        result.push(...bookList);
      }
    });
    return result;
  };

  // Letras disponíveis no alfabeto
  const alphabetLetters = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
  ];

  // Filtra autores com busca insensível a acentos e ordenação alfabética
  const filteredAuthors = useMemo(() => {
    const q = normalizeText(activeQuery);

    return authors
      .filter((a) => {
        // Filtro por letra inicial
        if (selectedLetter !== "todos") {
          const firstChar = a.name.trim().charAt(0).toUpperCase();
          const normFirst = normalizeText(firstChar).toUpperCase();
          if (normFirst !== selectedLetter) return false;
        }

        // Filtro por tag/categoria
        if (selectedTag === "com_livros") {
          if (getBooksCountForAuthor(a.name) === 0) return false;
        } else if (selectedTag === "ativos") {
          if (a.active === false || a.status === "inativo") return false;
        } else if (selectedTag === "brasileira") {
          const nac = normalizeText(a.nacionalidade || "");
          if (!nac.includes("brasil")) return false;
        }

        // Filtro por busca
        if (!q) return true;
        const nameMatch =
          normalizeText(a.name).includes(q) || normalizeText(a.nome_autor || "").includes(q);
        const nacMatch = normalizeText(a.nacionalidade || "").includes(q);
        const roleMatch = normalizeText(a.role || "").includes(q);
        const tagMatch = normalizeText(a.tag || "").includes(q);
        const quoteMatch = normalizeText(a.featuredQuote || "").includes(q);

        return nameMatch || nacMatch || roleMatch || tagMatch || quoteMatch;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [authors, activeQuery, selectedLetter, selectedTag, booksByAuthorMap]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 animate-in fade-in duration-200">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <button
            type="button"
            onClick={onBackToCatalog}
            className={`inline-flex items-center gap-2 text-xs font-bold mb-3 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              isDark
                ? "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Catálogo de Livros</span>
          </button>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-[#00e676] border border-emerald-500/30">
              <Feather className="w-3.5 h-3.5" />
              <span>Acervo Literário</span>
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-black/20 text-slate-400 border border-white/10 font-semibold">
              {authors.length} Autores Cadastrados
            </span>
          </div>

          <h1
            className={`text-2xl sm:text-4xl font-extrabold tracking-tight mt-2 ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            Autores Cadastrados
          </h1>
          <p
            className={`text-sm sm:text-base mt-1.5 max-w-2xl ${isDark ? "text-slate-400" : "text-slate-600"}`}
          >
            Explore a biografia, nacionalidade, frases e obras de todos os escritores que compõem o
            acervo da Biblioteca Maria Quitéria.
          </p>
        </div>

        {/* Ações Administrativas se autenticado */}
        {session?.role === "admin" && (
          <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
            <button
              type="button"
              onClick={() => {
                setAuthorToEdit(null);
                setIsAuthorModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#00e676] hover:bg-[#1fa950] text-slate-950 transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Autor</span>
            </button>
            {onOpenAdminAuthors && (
              <button
                type="button"
                onClick={onOpenAdminAuthors}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                  isDark
                    ? "border-white/15 bg-white/5 hover:bg-white/10 text-white"
                    : "border-slate-300 bg-white hover:bg-slate-100 text-slate-800"
                }`}
              >
                <span>Painel ADM</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Barra de Pesquisa e Botão de Pesquisa */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border shadow-xl mb-6 transition-all ${
          isEmerald
            ? "bg-[#062438] border-[#0c4061]"
            : isPurple
              ? "bg-[#220d43] border-[#3e196e]"
              : isDark
                ? "bg-[#092032] border-[#163650]"
                : "bg-white border-slate-200"
        }`}
      >
        <form
          onSubmit={handleExecuteSearch}
          className="flex flex-col sm:flex-row gap-3 items-stretch"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nome do autor (ex: Machado de Assis, Clarice Lispector), nacionalidade ou estilo..."
              className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm border transition-all focus:outline-none ${
                isDark
                  ? "bg-black/30 border-white/15 text-white placeholder-slate-400 focus:border-[#00e676]"
                  : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#00e676]"
              }`}
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Botão de Pesquisa */}
          <button
            type="submit"
            id="btn-pesquisar-autores"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-[#00e676] hover:bg-[#1fa950] text-slate-950 transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95 shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>Pesquisar</span>
          </button>
        </form>

        {/* Filtros por Categoria / Tag */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-semibold mr-1 shrink-0 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros:
          </span>

          {[
            { id: "todos", label: "Todos os Autores" },
            { id: "brasileira", label: "Literatura Brasileira" },
            { id: "com_livros", label: "Com Livros no Acervo" },
            { id: "ativos", label: "Ativos" },
          ].map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => setSelectedTag(tag.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedTag === tag.id
                  ? "bg-emerald-500/20 text-[#00e676] border border-emerald-500/40"
                  : isDark
                    ? "text-slate-400 hover:text-white bg-black/20 hover:bg-black/40"
                    : "text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200"
              }`}
            >
              {tag.label}
            </button>
          ))}

          {activeQuery && (
            <span className="ml-auto text-[11px] text-amber-300 font-medium shrink-0 flex items-center gap-1">
              Filtro ativo: "{activeQuery}"
            </span>
          )}
        </div>

        {/* Navegação Rápida pelo Alfabeto (A a Z) */}
        <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
          <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 shrink-0">
            Letra:
          </span>
          <button
            type="button"
            onClick={() => setSelectedLetter("todos")}
            className={`px-2 py-0.5 rounded-lg font-bold shrink-0 transition-colors ${
              selectedLetter === "todos"
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Todas
          </button>
          {alphabetLetters.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => setSelectedLetter(letter)}
              className={`w-6 h-6 rounded-lg font-bold shrink-0 transition-colors flex items-center justify-center ${
                selectedLetter === letter
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Resultados da Listagem */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-4 px-1">
        <span>
          Exibindo <strong>{filteredAuthors.length}</strong> de {authors.length} autores cadastrados
          em ordem alfabética
        </span>
        {filteredAuthors.length > 0 && (
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ordenado A-Z
          </span>
        )}
      </div>

      {filteredAuthors.length === 0 ? (
        <div
          className={`text-center py-16 px-4 rounded-3xl border ${
            isDark ? "bg-[#071f30] border-[#0e3b5c]" : "bg-white border-slate-200"
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 mx-auto flex items-center justify-center mb-4">
            <Feather className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold">Nenhum autor encontrado</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-6">
            Não encontramos autores cadastrados com os termos informados. Tente buscar por outro
            nome ou limpe os filtros.
          </p>
          <button
            type="button"
            onClick={handleClearSearch}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00e676] text-slate-950 hover:bg-[#1fa950] transition-all cursor-pointer shadow-md"
          >
            Ver Todos os Autores
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAuthors.map((author) => {
            const authorBooks = getBooksForAuthor(author.name);
            const bookCount = authorBooks.length;

            return (
              <div
                key={author.id}
                className={`rounded-3xl border overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl flex flex-col justify-between ${
                  isEmerald
                    ? "bg-[#062438] border-[#0c4061] hover:border-emerald-500/40"
                    : isPurple
                      ? "bg-[#220d43] border-[#3e196e] hover:border-purple-500/40"
                      : isDark
                        ? "bg-[#092032] border-[#163650] hover:border-emerald-500/40"
                        : "bg-white border-slate-200 hover:border-emerald-500/50"
                }`}
              >
                {/* Top Card Info */}
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Imagem do Autor */}
                    <div className="relative shrink-0">
                      <div className="w-20 h-24 rounded-2xl overflow-hidden bg-slate-800 border-2 border-white/10 shadow-md">
                        {author.photoUrl ? (
                          <img
                            src={author.photoUrl}
                            alt={author.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback se a imagem quebrar
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&auto=format&fit=crop&q=80";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
                            <Feather className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#00e676] text-slate-950 flex items-center justify-center text-xs shadow font-bold">
                        <Feather className="w-3 h-3" />
                      </div>
                    </div>

                    {/* Dados Básicos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#00e676] border border-emerald-500/30">
                          {author.nacionalidade || "Brasileira"}
                        </span>
                        {author.period && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {author.period}
                          </span>
                        )}
                      </div>

                      <h2 className="text-base sm:text-lg font-bold truncate text-white">
                        {author.name}
                      </h2>

                      {author.role && (
                        <p className="text-xs text-amber-300 font-medium truncate mt-0.5">
                          {author.role}
                        </p>
                      )}

                      {/* Quantidade de livros cadastrados com este autor */}
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/20 border border-white/10 text-slate-300">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {bookCount > 0
                            ? `${bookCount} ${bookCount === 1 ? "livro no acervo" : "livros no acervo"}`
                            : "Nenhum livro cadastrado"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Frase / Citação do Autor */}
                  {author.featuredQuote && (
                    <div className="mt-4 p-3 rounded-2xl bg-black/25 border border-white/5 relative">
                      <Quote className="w-4 h-4 text-emerald-400/50 absolute top-2.5 left-2.5" />
                      <p className="text-xs italic text-slate-300 pl-5 leading-relaxed line-clamp-3">
                        "{author.featuredQuote}"
                      </p>
                      {author.quoteSource && (
                        <p className="text-[10px] text-right text-slate-400 mt-1 font-medium">
                          — {author.quoteSource}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="px-5 py-3.5 bg-black/20 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAuthorDetail(author)}
                    className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Ver Detalhes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onFilterByAuthorInCatalog(author.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00e676]/15 hover:bg-[#00e676]/25 text-[#00e676] border border-[#00e676]/30 transition-all cursor-pointer hover:scale-105"
                  >
                    <span>Ver no Catálogo</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes do Autor */}
      {selectedAuthorDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div
            className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden p-6 relative animate-in zoom-in-95 my-6 ${
              isDark
                ? "bg-[#061f30] border-[#0c4061] text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <button
              type="button"
              onClick={() => setSelectedAuthorDetail(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-4 mb-5">
              <div className="w-20 h-24 rounded-2xl overflow-hidden bg-slate-800 border shadow-lg shrink-0">
                <img
                  src={
                    selectedAuthorDetail.photoUrl ||
                    "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&auto=format&fit=crop&q=80"
                  }
                  alt={selectedAuthorDetail.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#00e676] border border-emerald-500/30">
                  {selectedAuthorDetail.nacionalidade || "Brasileira"}
                </span>
                <h3 className="text-xl font-bold mt-1 text-white">{selectedAuthorDetail.name}</h3>
                {selectedAuthorDetail.period && (
                  <p className="text-xs text-slate-400 font-medium">
                    {selectedAuthorDetail.period}
                  </p>
                )}
                {selectedAuthorDetail.role && (
                  <p className="text-xs text-amber-300 font-semibold">
                    {selectedAuthorDetail.role}
                  </p>
                )}
              </div>
            </div>

            {/* Frase em destaque */}
            {selectedAuthorDetail.featuredQuote && (
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 mb-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Citação Marcante:
                </span>
                <p className="text-xs italic text-slate-200 leading-relaxed">
                  "{selectedAuthorDetail.featuredQuote}"
                </p>
                {selectedAuthorDetail.quoteSource && (
                  <p className="text-[11px] text-right text-emerald-400 font-semibold mt-1">
                    — {selectedAuthorDetail.quoteSource}
                  </p>
                )}
              </div>
            )}

            {/* Frases adicionais se houver */}
            {selectedAuthorDetail.additionalQuotes &&
              selectedAuthorDetail.additionalQuotes.length > 0 && (
                <div className="mb-4 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block">
                    Outras Frases Semanais:
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                    {selectedAuthorDetail.additionalQuotes.map((aq, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-black/20 text-[11px] text-slate-300 border border-white/5"
                      >
                        "{aq.text}"
                        {aq.source && (
                          <span className="text-slate-400 block text-[10px] mt-0.5 font-medium">
                            — {aq.source}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Obras do autor na biblioteca */}
            <div className="mb-5">
              <span className="text-[11px] font-bold text-slate-400 block mb-2">
                Livros no Acervo da Biblioteca (
                {getBooksForAuthor(selectedAuthorDetail.name).length}):
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                {getBooksForAuthor(selectedAuthorDetail.name).length > 0 ? (
                  getBooksForAuthor(selectedAuthorDetail.name).map((b) => (
                    <div
                      key={b.id}
                      onClick={() => {
                        setSelectedAuthorDetail(null);
                        onSelectBook?.(b);
                      }}
                      className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-between text-xs cursor-pointer transition-colors"
                    >
                      <span className="font-semibold text-white truncate">{b.title}</span>
                      <span className="text-[10px] text-emerald-300 shrink-0 font-bold ml-2">
                        Ver livro
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic p-2">
                    Nenhum livro cadastrado para este autor no momento.
                  </p>
                )}
              </div>
            </div>

            {/* Ações do Modal */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              {selectedAuthorDetail.referenceUrl ? (
                <a
                  href={selectedAuthorDetail.referenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Artigo de Referência
                </a>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => {
                  const authorName = selectedAuthorDetail.name;
                  setSelectedAuthorDetail(null);
                  onFilterByAuthorInCatalog(authorName);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00e676] hover:bg-[#1fa950] text-slate-950 transition-all cursor-pointer shadow-md"
              >
                Filtrar no Catálogo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Autor se acionado pelo Admin */}
      <AuthorModal
        isOpen={isAuthorModalOpen}
        onClose={() => setIsAuthorModalOpen(false)}
        authorToEdit={authorToEdit}
        onSave={(author) => {
          const updated = [author, ...authors.filter((a) => a.id !== author.id)].sort((a, b) =>
            a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
          );
          saveStoredAuthors(updated);
          setAuthors(updated);
        }}
      />
    </div>
  );
};
