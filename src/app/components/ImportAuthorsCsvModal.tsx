// @ts-nocheck
import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  Sparkles,
  HelpCircle,
  Info,
} from "lucide-react";
import { AuthorItem } from "../types";
import {
  importAuthorsFromCsv,
  exportAuthorsToCsv,
  parseCsvRows,
  normalizeText,
  SAMPLE_BRAZILIAN_AUTHORS_CSV,
} from "../utils/authorCsvHelper";
import { saveStoredAuthors } from "../data/authorsData";
import { useTheme } from "../context/ThemeContext";

interface ImportAuthorsCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingAuthors: AuthorItem[];
  onSuccess: (summary: string) => void;
}

export const ImportAuthorsCsvModal: React.FC<ImportAuthorsCsvModalProps> = ({
  isOpen,
  onClose,
  existingAuthors,
  onSuccess,
}) => {
  const { isDark, isEmerald, isPurple } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvContent, setCsvContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsedPreview, setParsedPreview] = useState<{
    headers: string[];
    rows: string[][];
  } | null>(null);
  const [importReport, setImportReport] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProcessCsvText = (text: string, name = "arquivo.csv") => {
    setErrorMsg(null);
    setImportReport(null);
    setCsvContent(text);
    setFileName(name);

    try {
      const rows = parseCsvRows(text);
      if (rows.length === 0) {
        setErrorMsg("O arquivo fornecido está vazio.");
        setParsedPreview(null);
        return;
      }
      setParsedPreview({
        headers: rows[0],
        rows: rows.slice(1, 11), // Exibe até 10 linhas na prévia
      });
    } catch (err: any) {
      setErrorMsg(`Erro ao ler formato CSV: ${err.message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleProcessCsvText(content, file.name);
    };
    reader.onerror = () => {
      setErrorMsg("Não foi possível ler o arquivo selecionado.");
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleProcessCsvText(event.target?.result as string, file.name);
      };
      reader.readAsText(file, "UTF-8");
    }
  };

  const handleLoadSample = () => {
    handleProcessCsvText(SAMPLE_BRAZILIAN_AUTHORS_CSV, "modelo_autores_brasileiros.csv");
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_BRAZILIAN_AUTHORS_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "modelo_autores_brasileiros.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCurrent = () => {
    const csv = exportAuthorsToCsv(existingAuthors);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `autores_exportados_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExecuteImport = () => {
    if (!csvContent.trim()) {
      setErrorMsg("Por favor, selecione um arquivo CSV ou carregue um modelo.");
      return;
    }

    const result = importAuthorsFromCsv(csvContent, existingAuthors);

    if (result.errors.length > 0 && result.addedCount === 0 && result.updatedCount === 0) {
      setErrorMsg(result.errors.join(" "));
      return;
    }

    saveStoredAuthors(result.importedAuthors);

    const summary = `Importação concluída com sucesso! ${result.addedCount} novos autores cadastrados, ${result.updatedCount} autores atualizados (sem duplicações).`;
    onSuccess(summary);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div
        className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden my-6 transition-all ${
          isEmerald
            ? "bg-[#061f30] border-[#0c4061] text-white"
            : isPurple
              ? "bg-[#1f0b3b] border-[#3e196e] text-white"
              : isDark
                ? "bg-[#092032] border-[#163650] text-white"
                : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-[#00e676] border border-emerald-500/30 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Importação de Autores em CSV</h2>
              <p className="text-xs text-slate-400">
                Campos: id_autor, nome_autor, nacionalidade, status
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar text-xs">
          {/* Instrução dos campos */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <span className="font-bold block text-xs">Estrutura do Arquivo CSV:</span>
              <p className="text-[11px] leading-relaxed text-emerald-200/90">
                O arquivo pode ser delimitado por vírgula (<code>,</code>) ou ponto-e-vírgula (
                <code>;</code>). Os campos reconhecidos são: <strong>id_autor</strong>,{" "}
                <strong>nome_autor</strong>, <strong>nacionalidade</strong> e{" "}
                <strong>status</strong> (ativo / inativo). Autores já cadastrados serão atualizados
                automaticamente sem criar duplicações.
              </p>
            </div>
          </div>

          {/* Área de Upload / Drag & Drop */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
              fileName
                ? "border-[#00e676] bg-[#00e676]/5"
                : "border-white/20 hover:border-[#00e676] bg-black/10 hover:bg-black/20"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-[#00e676] flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>

            {fileName ? (
              <div>
                <span className="font-bold text-sm text-[#00e676] block">{fileName}</span>
                <span className="text-[11px] text-slate-400">
                  Clique para selecionar outro arquivo
                </span>
              </div>
            ) : (
              <div>
                <span className="font-bold text-sm block">Clique para enviar o arquivo CSV</span>
                <span className="text-[11px] text-slate-400">
                  ou arraste e solte o arquivo aqui
                </span>
              </div>
            )}
          </div>

          {/* Botões Auxiliares */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-[11px] font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Modelo CSV</span>
              </button>
              <button
                type="button"
                onClick={handleLoadSample}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00e676] text-[11px] font-semibold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Carregar Modelo Exemplo</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCurrent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white text-[11px] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar {existingAuthors.length} Autores Atuais</span>
            </button>
          </div>

          {/* Mensagens de Erro */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Pré-visualização da Tabela */}
          {parsedPreview && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>Pré-visualização dos Dados (primeiras 10 linhas):</span>
                <span>{parsedPreview.rows.length} registros exibidos</span>
              </div>
              <div className="border border-white/10 rounded-xl overflow-x-auto bg-black/20">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-slate-300">
                      {parsedPreview.headers.map((h, i) => (
                        <th
                          key={i}
                          className="p-2.5 font-bold uppercase tracking-wider text-[10px]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {parsedPreview.rows.map((row, ri) => (
                      <tr key={ri} className="hover:bg-white/5">
                        {row.map((cell, ci) => (
                          <td key={ci} className="p-2.5 truncate max-w-[180px]">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-black/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={!csvContent}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg cursor-pointer ${
              csvContent
                ? "bg-[#00e676] hover:bg-[#1fa950] text-slate-950 hover:scale-105 active:scale-95"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmar e Importar Autores</span>
          </button>
        </div>
      </div>
    </div>
  );
};
