import React, { useMemo, useRef, useState, useEffect } from "react";
import { ChevronDown, Feather, Plus, X } from "lucide-react";
import { AuthorItem } from "../types";
import {
  findAuthorByName,
  getStoredAuthors,
  normalizeAuthorName,
  saveStoredAuthors,
  subscribeToAuthorsUpdate,
} from "../data/authorsData";
import { AuthorModal } from "./AuthorModal";

interface Props {
  value: string;
  authorIds?: string[];
  onChange: (value: string) => void;
  onAuthorIdsChange?: (ids: string[]) => void;
  error?: string;
  isDark?: boolean;
  required?: boolean;
  label?: string;
  id?: string;
}

export const AuthorMultiSelectField: React.FC<Props> = ({
  value,
  authorIds = [],
  onChange,
  onAuthorIdsChange,
  error,
  isDark = false,
  required = false,
  label = "Autor(es)",
}) => {
  const [authors, setAuthors] = useState<AuthorItem[]>(() => getStoredAuthors());
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [prefilledName, setPrefilledName] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeToAuthorsUpdate(() => setAuthors(getStoredAuthors())), []);

  const selected = useMemo(() => {
    const ids = new Set(authorIds.filter(Boolean));
    const fromIds = authors.filter((a) => ids.has(a.id));
    if (fromIds.length) return fromIds;
    return value
      .split(/\s*(?:\/|;|,)\s*/)
      .map((name) => findAuthorByName(name, authors))
      .filter(Boolean) as AuthorItem[];
  }, [authors, authorIds, value]);

  const selectedIds = new Set(selected.map((a) => a.id));
  const filtered = useMemo(() => {
    const q = normalizeAuthorName(query);
    return authors
      .filter((a) => !selectedIds.has(a.id) && a.active !== false)
      .filter((a) => !q || normalizeAuthorName(a.name).includes(q) || normalizeAuthorName(a.nationality || "").includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
      .slice(0, 20);
  }, [authors, query, selectedIds]);

  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const emit = (next: AuthorItem[]) => {
    onAuthorIdsChange?.(next.map((a) => a.id));
    onChange(next.map((a) => a.name).join(" / "));
  };

  const select = (author: AuthorItem) => {
    emit([...selected, author]);
    setQuery("");
    setOpen(true);
  };

  const remove = (id: string) => emit(selected.filter((a) => a.id !== id));

  const saveNew = (author: AuthorItem) => {
    const existing = findAuthorByName(author.name, authors);
    const nextAuthor = existing || author;
    const nextList = existing ? authors : [...authors, author];
    if (!existing) saveStoredAuthors(nextList);
    setAuthors(nextList);
    select(nextAuthor);
    setQuickCreateOpen(false);
  };

  const createFromQuery = () => {
    const name = query.trim();
    if (!name) return;
    const existing = findAuthorByName(name, authors);
    if (existing) select(existing);
    else {
      setPrefilledName(name);
      setQuickCreateOpen(true);
    }
    setQuery("");
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center justify-between mb-1">
        <label className={`block font-semibold text-xs ${isDark ? "text-slate-300" : "text-slate-700"}`}>
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <button type="button" onClick={() => { setPrefilledName(query); setQuickCreateOpen(true); setOpen(false); }} className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
          <Plus className="w-3 h-3" /> Novo autor
        </button>
      </div>
      <div className={`min-h-[43px] w-full px-2.5 py-1.5 rounded-xl border flex flex-wrap gap-1.5 items-center ${isDark ? "bg-[#031522] border-[#163650]" : "bg-slate-50 border-slate-300"}`}>
        {selected.map((author) => (
          <span key={author.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${isDark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
            {author.name}<button type="button" onClick={() => remove(author.id)} aria-label={`Remover ${author.name}`}><X className="w-3 h-3" /></button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (filtered[0]) select(filtered[0]); else createFromQuery(); } if (e.key === "Backspace" && !query && selected.length) remove(selected[selected.length - 1].id); }}
          placeholder={selected.length ? "Adicionar outro autor..." : "Pesquisar autor por nome..."}
          className={`min-w-[140px] flex-1 bg-transparent px-1 py-1 text-sm outline-none ${isDark ? "text-white placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400"}`}
          autoComplete="off"
        />
        <ChevronDown className={`w-4 h-4 shrink-0 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
      </div>
      {error && <span className="text-rose-500 text-[11px] mt-1 block">{error}</span>}
      {open && (
        <div className={`absolute left-0 right-0 mt-1 z-50 rounded-2xl shadow-2xl border overflow-hidden ${isDark ? "bg-[#071d2b] border-[#163650] text-white" : "bg-white border-slate-200 text-slate-900"}`}>
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b flex items-center gap-1 text-slate-500"><Feather className="w-3 h-3 text-emerald-400" /> Sugestões de autores</div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.map((author) => <li key={author.id} onMouseDown={(e) => e.preventDefault()} onClick={() => select(author)} className={`px-3 py-2 flex items-center justify-between cursor-pointer text-xs ${isDark ? "hover:bg-[#001728]" : "hover:bg-sky-50"}`}><span>{author.name}</span><span className="text-[10px] opacity-60">{author.nationality || "Brasileira"}</span></li>)}
            {query.trim() && <li onMouseDown={(e) => e.preventDefault()} onClick={createFromQuery} className="m-1 p-2 rounded-xl border border-dashed border-emerald-400/60 text-emerald-500 text-xs font-semibold cursor-pointer flex items-center gap-2"><Plus className="w-3.5 h-3.5" /> Cadastrar “{query.trim()}” como novo autor</li>}
            {!filtered.length && !query.trim() && <li className="px-3 py-3 text-xs text-slate-500">Digite para pesquisar autores.</li>}
          </ul>
        </div>
      )}
      <AuthorModal isOpen={quickCreateOpen} onClose={() => setQuickCreateOpen(false)} onSave={saveNew} authorToEdit={{ id: "", name: prefilledName, active: true, nationality: "Brasileira" }} />
    </div>
  );
};

export default AuthorMultiSelectField;
