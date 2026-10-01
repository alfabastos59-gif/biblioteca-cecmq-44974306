// @ts-nocheck
// Sincronização na nuvem com Firebase Firestore oficial do projeto
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDocFromServer,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';
import { Book, Loan, Student, Suggestion, AdminUser, AuditLog } from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'meta', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase cliente offline:', error.message);
      return false;
    }
    return true;
  }
}

function subscribe(
  collectionName: string,
  transform: (list: any[]) => any[],
  onSuccess: (list: any[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        onSuccess(transform(list));
      },
      (error) => {
        console.error(`Erro ao sincronizar ${collectionName}:`, error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err: any) {
    console.error(`Erro ao assinar ${collectionName}:`, err);
    if (onError) onError(err);
    return () => {};
  }
}

const byText = (k: string) => (l: any[]) =>
  l.sort((a, b) => String(a[k] || '').localeCompare(String(b[k] || ''), 'pt-BR', { sensitivity: 'base' }));

export const subscribeToBooks = (s: (b: Book[]) => void, e?: (err: Error) => void) =>
  subscribe('books', byText('title'), s, e);
export const subscribeToLoans = (s: (l: Loan[]) => void, e?: (err: Error) => void) =>
  subscribe('loans', (l) => l, s, e);
export const subscribeToStudents = (s: (l: Student[]) => void, e?: (err: Error) => void) =>
  subscribe('students', byText('name'), s, e);
export const subscribeToSuggestions = (s: (l: Suggestion[]) => void, e?: (err: Error) => void) =>
  subscribe('suggestions', (l) => l, s, e);
export const subscribeToAdminUsers = (s: (l: AdminUser[]) => void, e?: (err: Error) => void) =>
  subscribe('adminUsers', (l) => l, s, e);
export const subscribeToAuditLogs = (s: (l: AuditLog[]) => void, e?: (err: Error) => void) =>
  subscribe(
    'auditLogs',
    (l) => l.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100),
    s,
    e
  );
export const subscribeToAuthors = (s: (l: any[]) => void, e?: (err: Error) => void) =>
  subscribe('authors', (l) => l.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''))), s, e);

export function sanitizeForFirestore<T>(val: T): T {
  return JSON.parse(JSON.stringify(val ?? null));
}

async function upsertMany(collectionName: string, items: any[]) {
  if (!items || items.length === 0) return;
  const CHUNK_SIZE = 450;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const clean = sanitizeForFirestore(item);
      const id = String(clean.id || Math.random().toString(36).substring(2, 9));
      const ref = doc(db, collectionName, id);
      batch.set(ref, clean, { merge: true });
    }
    await batch.commit();
  }
}

async function removeOne(collectionName: string, id: string) {
  const ref = doc(db, collectionName, String(id));
  await deleteDoc(ref);
}

export const saveBookToCloud = (b: Book) => upsertMany('books', [b]);
export const deleteBookFromCloud = (id: string) => removeOne('books', id);
export const saveLoanToCloud = (l: Loan) => upsertMany('loans', [l]);
export const deleteLoanFromCloud = (id: string) => removeOne('loans', id);
export const saveStudentToCloud = (s: Student) => upsertMany('students', [s]);
export const deleteStudentFromCloud = (id: string) => removeOne('students', id);
export const saveSuggestionToCloud = (s: Suggestion) => upsertMany('suggestions', [s]);
export const deleteSuggestionFromCloud = (id: string) => removeOne('suggestions', id);
export const saveAdminUserToCloud = (a: AdminUser) => upsertMany('adminUsers', [a]);
export const deleteAdminUserFromCloud = (id: string) => removeOne('adminUsers', id);
export const saveAuditLogToCloud = (l: AuditLog) => upsertMany('auditLogs', [l]);

type AllData = {
  books: Book[];
  loans: Loan[];
  students: Student[];
  suggestions: Suggestion[];
  adminUsers: AdminUser[];
  auditLogs: AuditLog[];
};

async function pushAll(d: AllData) {
  await upsertMany('books', d.books || []);
  await upsertMany('loans', d.loans || []);
  await upsertMany('students', d.students || []);
  await upsertMany('suggestions', d.suggestions || []);
  await upsertMany('adminUsers', d.adminUsers || []);
  await upsertMany('auditLogs', d.auditLogs || []);
}

export async function seedCloudDatabaseIfEmpty(initialData: AllData): Promise<boolean> {
  try {
    const seedRef = doc(db, 'meta', 'seed');
    const seedSnap = await getDocFromServer(seedRef).catch(() => null);
    if (seedSnap && seedSnap.exists()) return false;

    const booksSnap = await getDocs(collection(db, 'books'));
    if (booksSnap.empty) {
      await pushAll(initialData);
    }
    await setDoc(seedRef, { seededAt: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error('Erro na carga inicial do Firebase:', error);
    return false;
  }
}

export async function pushAllLocalDataToCloud(data: AllData): Promise<{ success: boolean; error?: string }> {
  try {
    await pushAll(data);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Falha ao sincronizar com Firebase' };
  }
}

export async function syncAuthorsToCloud(authors: any[]): Promise<void> {
  if (!authors || authors.length === 0) return;
  await upsertMany('authors', authors);
}
