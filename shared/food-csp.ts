export interface FoodCspEnvironment {
  hostname: string;
  nodeEnv: string | undefined;
  emulatorEnabled: boolean;
  firebaseProjectId: string | undefined;
}

export function isLocalFoodEmulatorCsp(environment: FoodCspEnvironment): boolean {
  return environment.nodeEnv === 'development'
    && environment.emulatorEnabled === true
    && /^demo-[a-z0-9-]+$/.test(environment.firebaseProjectId || '')
    && ['localhost','127.0.0.1'].includes(environment.hostname);
}

export function foodContentSecurityPolicy(environment: FoodCspEnvironment): string {
  const local = isLocalFoodEmulatorCsp(environment);
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' https://www.gstatic.com https://www.googleapis.com https://www.google.com/recaptcha/" + (local ? " 'unsafe-eval'" : ''),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com https://firebasestorage.googleapis.com https://storage.googleapis.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google.com/recaptcha/" +
      (local ? ' http://127.0.0.1:9099 http://127.0.0.1:8180 http://localhost:9099 http://localhost:8180 ws://127.0.0.1:8180 ws://localhost:8180' : ''),
    "frame-src 'self' https://www.google.com/recaptcha/",
  ].join('; ');
}
