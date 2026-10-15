// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Feather, Plus, Check, ChevronDown, Flag, Sparkles, X } from "lucide-react";
import { AuthorItem } from "../types";
import {
  getStoredAuthors,
  saveStoredAuthors,
  normalizeAuthorName,
  subscribeToAuthorsUpdate,
} from "../data/authorsData";
import { AuthorModal } from "./AuthorModal";

export interface AuthorAutocompleteFieldProps {
  id?: string;
  value: string;
  onChange: (authorName: string) => void;
  error?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  isDark?: boolean;
  required?: boolean;
  disabled?: boolean;
  label?: string;
}

export const AuthorAutocompleteField: React.FC<AuthorAutocompleteFieldProps> = ({
  id = "input-book-author",
  value,
  onChange,
  error,
  placeholder = "Ex: Machado de Assis",
  className = "",
  inputClassName,
  isDark = false,
  required = false,
  disabled = false,
  label = "Autor(a)",
}) => {
  const [authors, setAuthors] = useState<AuthorItem[]>(() => getStoredAuthors());
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [prefilledName, setPrefilledName] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Inscreve para atualizações em tempo real dos autores
  useEffect(() => {
    const unsub = subscribeToAuthorsUpdate(() => {
      setAuthors(getStoredAuthors());
    });
    return unsub;
  }, []);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtra autores baseado na digitação com suporte a acentos
  const filteredAuthors = useMemo(() => {
    const q = normalizeAuthorName(value);
    if (!q) {
      // Retorna os primeiros 15 autores em ordem alfabética se estiver vazio
      return [...authors]
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
        .slice(0, 15);
    }

    return [...authors]
      .filter((a) => {
        const nameMatch = normalizeAuthorName(a.name).includes(q);
        const codeMatch = a.authorCode ? normalizeAuthorName(a.authorCode).includes(q) : false;
        const tagMatch = a.tag ? normalizeAuthorName(a.tag).includes(q) : false;
        return nameMatch || codeMatch || tagMatch;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
      .slice(0, 20);
  }, [authors, value]);

  const hasExactMatch = useMemo(() => {
    const q = normalizeAuthorName(value);
    if (!q) return false;
    return authors.some((a) => normalizeAuthorName(a.name) === q);
  }, [authors, value]);

  const handleSelectAuthor = (authorItem: AuthorItem) => {
    onChange(authorItem.name);
    setIsOpen(false);
  };

  const handleOpenCreateModal = (suggestedName?: string) => {
    setPrefilledName(suggestedName || value || "");
    setIsQuickCreateOpen(true);
    setIsOpen(false);
  };

  const handleSaveNewAuthor = (newAuthor: AuthorItem) => {
    const norm = normalizeAuthorName(newAuthor.name);
    const existingIndex = authors.findIndex(
      (a) => a.id === newAuthor.id || normalizeAuthorName(a.name) === norm,
    );

    let updated: AuthorItem[];
    if (existingIndex !== -1) {
      updated = authors.map((a, i) =>
        i === existingIndex ? { ...a, ...newAuthor, id: a.id } : a,
      );
    } else {
      updated = [newAuthor, ...authors];
    }

    saveStoredAuthors(updated);
    setAuthors(updated);
    onChange(newAuthor.name);
    setIsQuickCreateOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    const maxItems = filteredAuthors.length + (!hasExactMatch && value.trim() ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < maxItems ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : maxItems - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < filteredAuthors.length) {
        e.preventDefault();
        handleSelectAuthor(filteredAuthors[highlightedIndex]);
      } else if (highlightedIndex === filteredAuthors.length && !hasExactMatch && value.trim()) {
        e.preventDefault();
        handleOpenCreateModal(value.trim());
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="flex items-center justify-between mb-1">
        <label
          htmlFor={id}
          className={`block font-semibold text-xs ${
            isDark ? "text-slate-300" : "text-slate-700"
          }`}
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <button
          type="button"
          onClick={() => handleOpenCreateModal(value.trim())}
          className={`text-[11px] font-semibold flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded-md ${
            isDark
              ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              : "text-sky-600 hover:text-sky-700 hover:bg-sky-50"
          }`}
          title="Cadastrar novo autor no acervo"
        >
          <Plus className="w-3 h-3" />
          <span>Novo Autor</span>
        </button>
      </div>

      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={
            inputClassName ||
            `w-full px-3.5 py-2.5 rounded-xl pr-9 focus:outline-none border transition-all text-sm ${
              isDark
                ? "bg-[#031522] border-[#163650] focus:border-emerald-500 text-white placeholder-slate-400"
                : "bg-slate-50 border-slate-300 focus:border-sky-500 text-slate-900 placeholder-slate-400"
            }`
          }
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                inputRef.current?.focus();
              }}
              className={`p-1 rounded-full transition-colors ${
                isDark ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700"
              }`}
              title="Limpar campo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`p-1 rounded transition-colors ${
              isDark ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {error && <span className="text-rose-500 text-[11px] mt-1 block">{error}</span>}

      {/* Dropdown de sugestões */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 mt-1 z-50 rounded-2xl shadow-2xl border overflow-hidden max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 ${
            isDark
              ? "bg-[#071d2b] border-[#163650] text-white"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b flex items-center justify-between ${
              isDark
                ? "bg-[#001728] border-[#163650] text-slate-400"
                : "bg-slate-50 border-slate-100 text-slate-500"
            }`}
          >
            <span className="flex items-center gap-1">
              <Feather className="w-3 h-3 text-emerald-400" />
              Sugestões de Autores ({filteredAuthors.length})
            </span>
            <span className="text-[9px] lowercase font-normal opacity-70">
              {authors.length} no acervo
            </span>
          </div>

          <ul className="py-1">
            {filteredAuthors.map((authorItem, idx) => {
              const isSelected =
                normalizeAuthorName(authorItem.name) === normalizeAuthorName(value);
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={authorItem.id || `author-opt-${idx}`}
                  onClick={() => handleSelectAuthor(authorItem)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors text-xs ${
                    isHighlighted
                      ? isDark
                        ? "bg-emerald-500/20 text-white"
                        : "bg-sky-50 text-sky-900"
                      : isSelected
                        ? isDark
                          ? "bg-[#001728] text-emerald-400"
                          : "bg-slate-100 text-sky-700"
                        : isDark
                          ? "hover:bg-[#001728]/60 text-slate-200"
                          : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {authorItem.photoUrl ? (
                      <img
                        src={authorItem.photoUrl}
                        alt={authorItem.name}
                        className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-400/20"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isDark
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {authorItem.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="truncate">
                      <div className="font-semibold truncate flex items-center gap-1.5">
                        <span>{authorItem.name}</span>
                        {authorItem.authorCode && (
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                              isDark
                                ? "bg-slate-800 text-slate-400"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            #{authorItem.authorCode}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] opacity-70 flex items-center gap-1.5 truncate">
                        <span>{authorItem.nationality || "Brasileira"}</span>
                        {authorItem.period && <span>• {authorItem.period}</span>}
                        {authorItem.tag && <span>• {authorItem.tag}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {authorItem.active === false ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        Inativo
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Ativo
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 ml-1" />}
                  </div>
                </li>
              );
            })}

            {filteredAuthors.length === 0 && (
              <li className={`px-4 py-3 text-center text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Nenhum autor existente coincide com a busca.
              </li>
            )}

            {/* Opção para cadastrar novo autor diretamente durante o cadastro do livro */}
            {!hasExactMatch && value.trim() && (
              <li
                onClick={() => handleOpenCreateModal(value.trim())}
                onMouseEnter={() => setHighlightedIndex(filteredAuthors.length)}
                className={`p-2.5 mx-1.5 my-1 rounded-xl border border-dashed flex items-center gap-2 cursor-pointer transition-all text-xs font-semibold ${
                  highlightedIndex === filteredAuthors.length
                    ? isDark
                      ? "bg-emerald-500/20 border-emerald-400 text-white"
                      : "bg-sky-100 border-sky-400 text-sky-900"
                    : isDark
                      ? "bg-[#001728] border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                      : "bg-sky-50/80 border-sky-300 text-sky-700 hover:bg-sky-100"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    isDark ? "bg-emerald-500/30 text-emerald-300" : "bg-sky-200 text-sky-800"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <span>Cadastrar &ldquo;{value.trim()}&rdquo; como novo autor(a)</span>
                  <p className="text-[10px] font-normal opacity-80">
                    Salva no catálogo e associa a esta obra
                  </p>
                </div>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Modal para cadastrar novo autor diretamente */}
      {isQuickCreateOpen && (
        <AuthorModal
          isOpen={isQuickCreateOpen}
          onClose={() => setIsQuickCreateOpen(false)}
          onSave={handleSaveNewAuthor}
          authorToEdit={{
            name: prefilledName,
            nationality: "Brasileira",
            active: true,
          }}
        />
      )}
    </div>
  );
};

export default AuthorAutocompleteField;
