import { env } from 'cloudflare:workers';

// Worker bindings are explicit and isolated from the Vite Node configuration.
// The Vite config injects synthetic emulator vars only for local dev/serve.
export function foodWorkerVar(name: 'FOOD_DEMO_ORDERS_MODE' | 'FIRESTORE_EMULATOR_HOST' | 'FIREBASE_AUTH_EMULATOR_HOST' | 'FIREBASE_PROJECT_ID' | 'NEXT_PUBLIC_FIREBASE_API_KEY'): string | undefined {
  const bindings = env as unknown as Record<string, unknown>;
  const bound = bindings?.[name];
  if (typeof bound === 'string') return bound;
  return process.env[name];
}
