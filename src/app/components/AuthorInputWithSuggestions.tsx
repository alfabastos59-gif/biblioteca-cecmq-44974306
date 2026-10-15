// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Feather, Plus, Check, UserPlus, Sparkles, X, ChevronDown } from "lucide-react";
import { AuthorItem } from "../types";
import { getStoredAuthors, saveStoredAuthors, subscribeToAuthorsUpdate } from "../data/authorsData";
import { normalizeText } from "../utils/authorCsvHelper";
import { useTheme } from "../context/ThemeContext";

interface AuthorInputWithSuggestionsProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}

export const AuthorInputWithSuggestions: React.FC<AuthorInputWithSuggestionsProps> = ({
  id = "author-input-field",
  value,
  onChange,
  placeholder = "Ex: Machado de Assis",
  required = false,
  disabled = false,
  className = "",
  inputClassName = "",
}) => {
  const { isDark, isEmerald, isPurple } = useTheme();
  const [authors, setAuthors] = useState<AuthorItem[]>(() => getStoredAuthors());
  const [isOpen, setIsOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Campos para cadastro rápido de novo autor
  const [newAuthorName, setNewAuthorName] = useState("");
  const [newAuthorNac, setNewAuthorNac] = useState("Brasileira");
  const [newAuthorStatus, setNewAuthorStatus] = useState<"ativo" | "inativo">("ativo");
  const [quickAddError, setQuickAddError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = subscribeToAuthorsUpdate(() => {
      setAuthors(getStoredAuthors());
    });
    return unsub;
  }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtra autores com busca insensível a acentos
  const suggestions = useMemo(() => {
    const q = normalizeText(value);
    if (!q) {
      // Mostra os primeiros 8 autores ativos em ordem alfabética
      return authors.filter((a) => a.active !== false).slice(0, 8);
    }
    return authors
      .filter((a) => {
        const matchName =
          normalizeText(a.name).includes(q) || normalizeText(a.nome_autor || "").includes(q);
        const matchNac = normalizeText(a.nacionalidade || "").includes(q);
        return matchName || matchNac;
      })
      .slice(0, 8);
  }, [authors, value]);

  const exactMatch = useMemo(() => {
    const q = normalizeText(value);
    if (!q) return null;
    return authors.find(
      (a) => normalizeText(a.name) === q || normalizeText(a.nome_autor || "") === q,
    );
  }, [authors, value]);

  const handleSelect = (authorName: string) => {
    onChange(authorName);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleOpenQuickAdd = (prefillName?: string) => {
    setNewAuthorName(prefillName || value || "");
    setNewAuthorNac("Brasileira");
    setNewAuthorStatus("ativo");
    setQuickAddError("");
    setIsQuickAddOpen(true);
    setIsOpen(false);
  };

  const handleSaveQuickAuthor = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newAuthorName.trim();
    if (!trimmed) {
      setQuickAddError("Informe o nome do autor.");
      return;
    }

    const norm = normalizeText(trimmed);
    const existing = authors.find((a) => normalizeText(a.name) === norm);
    if (existing) {
      // Seleciona o já existente
      onChange(existing.name);
      setIsQuickAddOpen(false);
      return;
    }

    const newId = `autor-${norm.replace(/[^a-z0-9]/g, "-")}-${Date.now().toString().slice(-4)}`;
    const newAuthor: AuthorItem = {
      id: newId,
      id_autor: newId,
      name: trimmed,
      nome_autor: trimmed,
      nacionalidade: newAuthorNac.trim() || "Brasileira",
      status: newAuthorStatus,
      active: newAuthorStatus === "ativo",
      period: "Literatura Brasileira",
      role: `${newAuthorNac.trim() || "Literatura Brasileira"}`,
      tag: newAuthorNac.trim() || "Literatura Brasileira",
      photoUrl:
        "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&auto=format&fit=crop&q=80",
      featuredQuote: "A leitura abre caminhos para o conhecimento e a imaginação.",
      quoteSource: "Acervo Cultural",
      createdAt: new Date().toISOString(),
    };

    const updated = [...authors, newAuthor].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
    );
    saveStoredAuthors(updated);
    setAuthors(updated);
    onChange(trimmed);
    setIsQuickAddOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex].name);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className={`w-full pr-20 ${inputClassName}`}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(true);
                inputRef.current?.focus();
              }}
              title="Limpar campo"
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenQuickAdd(value)}
            title="Cadastrar novo autor rapidamente"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3 h-3" />
            <span className="hidden sm:inline">Novo Autor</span>
          </button>
        </div>
      </div>

      {/* Dropdown com sugestões em tempo real */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-md transition-all animate-in fade-in-50 zoom-in-95 ${
            isDark
              ? "bg-[#041726]/95 border-[#0d3452] text-white divide-y divide-white/5"
              : "bg-white/95 border-slate-200 text-slate-900 divide-y divide-slate-100"
          }`}
        >
          <div className="p-2 text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center justify-between px-3">
            <span className="flex items-center gap-1.5">
              <Feather className="w-3 h-3 text-[#00e676]" /> Sugestões de Autores Brasileiros
            </span>
            <span>{suggestions.length} encontrados</span>
          </div>

          <div className="max-h-56 overflow-y-auto custom-scrollbar p-1">
            {suggestions.length > 0 ? (
              suggestions.map((item, index) => {
                const isSelected = value.trim().toLowerCase() === item.name.toLowerCase();
                const isHighlighted = highlightedIndex === index;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.name)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isHighlighted
                        ? "bg-emerald-500/20 text-[#00e676]"
                        : isSelected
                          ? "bg-emerald-500/15 font-bold text-emerald-400"
                          : isDark
                            ? "hover:bg-white/5 text-slate-200"
                            : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-slate-700 flex items-center justify-center border border-white/10">
                        {item.photoUrl ? (
                          <img
                            src={item.photoUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Feather className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                      <div className="truncate">
                        <span className="font-semibold block truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {item.nacionalidade || "Brasileira"} {item.role ? `• ${item.role}` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.active === false ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 font-medium">
                          Inativo
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                          Ativo
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                Nenhum autor encontrado com este nome.
              </div>
            )}
          </div>

          {/* Opção para cadastrar novo autor diretamente */}
          <div className="p-2 bg-black/20">
            <button
              type="button"
              onClick={() => handleOpenQuickAdd(value)}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-[#00e676] border border-emerald-500/30 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>
                {value.trim()
                  ? `Cadastrar "${value.trim()}" como novo autor`
                  : "Cadastrar novo autor diretamente"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Mini-Modal Rápido de Cadastro de Autor durante o cadastro de livro */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden p-6 relative animate-in zoom-in-95 ${
              isDark
                ? "bg-[#051c2e] border-[#0c4061] text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-[#00e676]">
                  <Feather className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Cadastrar Novo Autor</h3>
                  <p className="text-[11px] text-slate-400">
                    Integração direta com o acervo da biblioteca
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickAuthor} className="space-y-3.5 text-xs">
              {quickAddError && (
                <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px]">
                  {quickAddError}
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1 text-slate-300">
                  Nome do Autor(a) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newAuthorName}
                  onChange={(e) => setNewAuthorName(e.target.value)}
                  placeholder="Ex: Guimarães Rosa"
                  required
                  autoFocus
                  className={`w-full px-3 py-2 rounded-xl border text-xs ${
                    isDark
                      ? "bg-black/30 border-white/15 text-white"
                      : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Nacionalidade</label>
                  <input
                    type="text"
                    value={newAuthorNac}
                    onChange={(e) => setNewAuthorNac(e.target.value)}
                    placeholder="Brasileira"
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark
                        ? "bg-black/30 border-white/15 text-white"
                        : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Status</label>
                  <select
                    value={newAuthorStatus}
                    onChange={(e) => setNewAuthorStatus(e.target.value as "ativo" | "inativo")}
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark
                        ? "bg-black/30 border-white/15 text-white"
                        : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00e676] text-slate-950 hover:bg-[#1fa950] transition-all cursor-pointer shadow-md"
                >
                  Salvar e Selecionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
