// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { BookOpen, Sparkles, X, Search, LoaderCircle, ArrowRight, WandSparkles } from 'lucide-react';
import { Book } from '../types';
import { useTheme } from '../context/ThemeContext';

type Recommendation = { bookId: string; reason: string };
interface Props {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onSelectBook: (book: Book) => void;
}
const SHORTCUTS = [
  { label: 'Aventura e ação', prompt: 'Quero uma aventura cheia de ação e descobertas.' },
  { label: 'Mistério e suspense', prompt: 'Quero um livro de mistério ou suspense que me prenda.' },
  { label: 'História e biografias', prompt: 'Quero conhecer uma história real ou uma biografia inspiradora.' },
  { label: 'HQs e mangás', prompt: 'Quero ler quadrinhos, HQ ou mangá.' },
  { label: 'Leitura rápida', prompt: 'Quero um livro curto e fácil de ler.' },
];
export const BookRecommendationModal: React.FC<Props> = ({ isOpen, onClose, books, onSelectBook }) => {
  const { isDark } = useTheme();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [source, setSource] = useState<'ai' | 'local' | ''>('');
  const availableBooks = useMemo(() => books.filter((b) => b && b.id && b.title), [books]);
  if (!isOpen) return null;

  const recommend = async (text = prompt) => {
    const query = text.trim();
    if (!query) { setError('Conte para a Quitéria que tipo de livro você quer ler.'); return; }
    if (!availableBooks.length) { setError('O acervo ainda não tem livros cadastrados para recomendar.'); return; }
    setPrompt(query); setLoading(true); setError(''); setRecommendations([]); setSource('');
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          books: availableBooks.map((b) => ({
            id: b.id, title: b.title, author: b.author, category: b.category,
            synopsis: b.synopsis, pages: b.pages, status: b.status, availableCopies: b.availableCopies,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não consegui buscar sugestões agora.');
      setRecommendations(Array.isArray(data.recommendations) ? data.recommendations : []);
      setSource(data.source || 'local');
      if (!data.recommendations?.length) setError('Não encontrei um título que combine bem. Tente descrever seu estilo de leitura de outra forma.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocorreu um erro ao procurar os livros.');
    } finally { setLoading(false); }
  };
  const recommendedBooks = recommendations
    .map((r) => ({ book: availableBooks.find((b) => b.id === r.bookId), reason: r.reason }))
    .filter((x) => x.book);
  const panel = isDark ? 'bg-[#081b2b] border-[#214158] text-white' : 'bg-white border-slate-200 text-slate-900';
  const muted = isDark ? 'text-slate-300' : 'text-slate-600';
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="quiteria-title">
      <button className="absolute inset-0 cursor-default" aria-label="Fechar recomendações" onClick={onClose} />
      <section className={`relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border shadow-2xl ${panel}`}>
        <header className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-5 sm:p-7 text-white">
          <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 rounded-full bg-white/15 p-2 hover:bg-white/25"><X className="h-5 w-5" /></button>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/15"><WandSparkles className="h-7 w-7" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-100">Biblioteca Maria Quitéria</p>
              <h2 id="quiteria-title" className="mt-1 text-2xl font-black sm:text-3xl">O que ler hoje?</h2>
              <p className="mt-1 text-sm text-white/90">Me conte seu gosto. Vou procurar no nosso acervo!</p>
            </div>
          </div>
        </header>
        <div className="overflow-y-auto p-4 sm:p-6">
          <form onSubmit={(e) => { e.preventDefault(); recommend(); }} className="space-y-3">
            <label htmlFor="quiteria-prompt" className="block text-sm font-bold">Que tipo de história combina com você?</label>
            <textarea id="quiteria-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={600} rows={3}
              placeholder="Ex.: Adoro Percy Jackson e mitologia grega. Tem algo parecido?"
              className={`w-full resize-y rounded-2xl border p-4 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 ${isDark ? 'border-[#214158] bg-[#061523] text-white placeholder:text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400'}`} />
            <div className="flex flex-wrap gap-2">
              {SHORTCUTS.map((item) => <button key={item.label} type="button" onClick={() => { setPrompt(item.prompt); recommend(item.prompt); }}
                className={`rounded-full border px-3 py-2 text-xs font-semibold transition hover:border-emerald-500 hover:text-emerald-500 ${isDark ? 'border-[#214158] bg-[#0d2639]' : 'border-slate-200 bg-slate-50'}`}>{item.label}</button>)}
            </div>
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3.5 font-extrabold text-slate-950 shadow-lg transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-70">
              {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {loading ? 'Quitéria está procurando nas estantes...' : 'Encontrar minha próxima leitura'}
            </button>
          </form>
          {error && <p role="status" className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600">{error}</p>}
          {recommendedBooks.length > 0 && <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-extrabold">Sugestões da Quitéria</h3><span className={`text-xs ${muted}`}>{recommendedBooks.length} título(s) do acervo</span></div>
            {source === 'local' && <p className={`text-xs ${muted}`}>Sugestões por correspondência com o catálogo. Configure OPENAI_API_KEY no servidor para ativar recomendações com IA.</p>}
            {recommendedBooks.map(({ book, reason }) => <article key={book.id} className={`flex gap-4 rounded-2xl border p-3 sm:p-4 ${isDark ? 'border-[#214158] bg-[#0b2233]' : 'border-slate-200 bg-slate-50'}`}>
              <div className="h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-200"><img src={book.cover} alt={`Capa de ${book.title}`} className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} /></div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold leading-snug">{book.title}</h4><p className={`mt-1 text-xs ${muted}`}>{book.author} · {book.category}{book.pages ? ` · ${book.pages} páginas` : ''}</p>
                {book.synopsis && <p className={`mt-2 line-clamp-3 text-sm ${muted}`}>{book.synopsis}</p>}
                <p className="mt-2 text-sm"><span className="font-bold text-emerald-500">Por que combina:</span> {reason}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${book.availableCopies > 0 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-600'}`}>{book.availableCopies > 0 ? 'Disponível para empréstimo' : 'Sem exemplares disponíveis'}</span>
                  <button onClick={() => { onClose(); onSelectBook(book); }} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400">Ver detalhes <ArrowRight className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </article>)}
          </div>}
          <div className={`mt-5 flex items-start gap-2 text-xs ${muted}`}><BookOpen className="mt-0.5 h-4 w-4 shrink-0" /><p>As recomendações são feitas somente entre os livros enviados pelo catálogo desta biblioteca.</p></div>
        </div>
      </section>
    </div>
  );
};
