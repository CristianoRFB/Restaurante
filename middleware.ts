import { NextResponse, type NextRequest } from 'next/server';
import { foodContentSecurityPolicy } from './shared/food-csp';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', foodContentSecurityPolicy({
    hostname: request.nextUrl.hostname,
    nodeEnv: process.env.NODE_ENV,
    emulatorEnabled: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true',
    firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  }));
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

export const config = { matcher: '/:path*' };
