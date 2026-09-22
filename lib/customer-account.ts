import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile, type Unsubscribe, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseDb, isFirebaseDataMode } from '@/lib/firebase-client';
import { normalizeWhatsapp, type CustomerAccount } from '@/shared/baru-domain';

export interface CustomerAccountInput {
  name: string;
  email: string;
  password: string;
  whatsapp?: string;
}

function requireCustomerFirebase() {
  if (!isFirebaseDataMode() || !firebaseAuth || !firebaseDb) throw new Error('O acesso de cliente está indisponível neste ambiente.');
  return { auth: firebaseAuth, db: firebaseDb };
}

function validateCustomerInput(input: CustomerAccountInput): CustomerAccountInput {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 2 || name.length > 100) throw new Error('Informe seu nome completo.');
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 320) throw new Error('Informe um e-mail válido.');
  if (input.password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
  return { name, email, password: input.password, whatsapp: input.whatsapp?.trim() ? normalizeWhatsapp(input.whatsapp) : undefined };
}

function profileFromUser(user: User, existing?: CustomerAccount): CustomerAccount {
  const now = new Date().toISOString();
  return {
    uid: user.uid,
    email: user.email || existing?.email || '',
    name: user.displayName || existing?.name || 'Cliente Baru',
    ...(existing?.whatsapp ? { whatsapp: existing.whatsapp } : {}),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

async function ensureCustomerProfile(user: User): Promise<CustomerAccount> {
  const { db } = requireCustomerFirebase();
  const reference = doc(db, 'customerAccounts', user.uid);
  const snapshot = await getDoc(reference);
  const existing = snapshot.exists() ? snapshot.data() as CustomerAccount : undefined;
  const profile = profileFromUser(user, existing);
  if (!snapshot.exists()) await setDoc(reference, profile);
  return profile;
}

export async function createCustomerAccount(input: CustomerAccountInput): Promise<CustomerAccount> {
  const valid = validateCustomerInput(input);
  const { auth, db } = requireCustomerFirebase();
  const credential = await createUserWithEmailAndPassword(auth, valid.email, valid.password);
  await updateProfile(credential.user, { displayName: valid.name });
  const now = new Date().toISOString();
  const profile: CustomerAccount = { uid: credential.user.uid, email: valid.email, name: valid.name, ...(valid.whatsapp ? { whatsapp: valid.whatsapp } : {}), createdAt: now, updatedAt: now };
  await setDoc(doc(db, 'customerAccounts', profile.uid), profile);
  return profile;
}

export async function signInCustomer(email: string, password: string): Promise<CustomerAccount> {
  const { auth } = requireCustomerFirebase();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return ensureCustomerProfile(credential.user);
}

export async function signOutCustomer(): Promise<void> {
  const { auth } = requireCustomerFirebase();
  await signOut(auth);
}

export function watchCustomerAccount(listener: (account: CustomerAccount | null) => void): Unsubscribe {
  if (!isFirebaseDataMode() || !firebaseAuth) {
    listener(null);
    return () => undefined;
  }
  return onAuthStateChanged(firebaseAuth, async (user) => {
    if (!user) {
      listener(null);
      return;
    }
    try {
      listener(await ensureCustomerProfile(user));
    } catch {
      listener(null);
    }
  });
}
