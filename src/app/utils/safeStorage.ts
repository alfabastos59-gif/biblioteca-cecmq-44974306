/**
 * Utilitário seguro para localStorage que previne QuotaExceededError e falhas de armazenamento.
 * Garante que a aplicação nunca trave caso o limite de armazenamento do navegador seja atingido.
 */

export function safeStorageSetItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    const isQuotaError =
      error?.name === "QuotaExceededError" ||
      error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error?.code === 22 ||
      error?.code === 1014 ||
      String(error?.message || error)
        .toLowerCase()
        .includes("quota");

    if (!isQuotaError) {
      console.warn(`[SafeStorage] Erro ao salvar chave "${key}":`, error);
      return false;
    }

    console.warn(
      `[SafeStorage] QuotaExceededError ao salvar "${key}". Aplicando liberação de espaço.`,
    );

    // 1. Tentar encurtar audit logs locais para liberar espaço
    try {
      const logs = localStorage.getItem("bmq_audit_logs");
      if (logs) {
        const parsed = JSON.parse(logs);
        if (Array.isArray(parsed) && parsed.length > 20) {
          localStorage.setItem("bmq_audit_logs", JSON.stringify(parsed.slice(0, 20)));
        }
      }
    } catch {}

    // 2. Se a chave for bmq_books, remover imagens base64 gigantes da cópia em cache local
    if (key === "bmq_books") {
      try {
        const parsedBooks = JSON.parse(value);
        if (Array.isArray(parsedBooks)) {
          const lightweightBooks = parsedBooks.map((b: any) => {
            if (
              b.cover &&
              typeof b.cover === "string" &&
              b.cover.startsWith("data:") &&
              b.cover.length > 1000
            ) {
              return {
                ...b,
                cover:
                  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80",
              };
            }
            return b;
          });
          localStorage.setItem(key, JSON.stringify(lightweightBooks));
          return true;
        }
      } catch {}
    }

    // 3. Tentar remover chaves temporárias ou órfãs
    try {
      localStorage.removeItem("bmq_auth_session");
      localStorage.removeItem("bmq_temp_cache");
    } catch {}

    // 4. Tentar uma segunda vez
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      console.warn(
        `[SafeStorage] Armazenamento local atingiu capacidade máxima para "${key}". A aplicação continua funcionando perfeitamente na memória e em nuvem.`,
      );
      return false;
    }
  }
}

export function safeStorageGetItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[SafeStorage] Erro ao ler chave "${key}":`, err);
    return null;
  }
}

export function safeStorageRemoveItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {}
}
