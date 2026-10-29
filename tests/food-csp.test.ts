import { describe, expect, it } from 'vitest';
import { foodContentSecurityPolicy } from '@/shared/food-csp';

const base = {hostname:'localhost',nodeEnv:'development',emulatorEnabled:true,firebaseProjectId:'demo-baru-gastronomia'};
describe('Food CSP: production must never permit emulator connections',()=>{
  it('allows only explicitly configured localhost dev against synthetic Firebase demo',()=>{
    const policy=foodContentSecurityPolicy(base);
    expect(policy).toContain('http://127.0.0.1:9099');
    expect(policy).toContain('http://127.0.0.1:8180');
    expect(policy).toContain("'unsafe-eval'");
  });
  it('rejects emulator CSP relaxation on production, remote hosts and real Firebase project',()=>{
    for(const scenario of [
      {...base,nodeEnv:'production'},
      {...base,hostname:'baru-gastronomia.acai-mais-sabor.workers.dev'},
      {...base,firebaseProjectId:'restaurante-5665d'},
      {...base,emulatorEnabled:false},
      {...base,hostname:'attacker.localhost.example'},
    ]) {
      const policy=foodContentSecurityPolicy(scenario);
      expect(policy).not.toContain('http://127.0.0.1:9099');
      expect(policy).not.toContain('http://127.0.0.1:8180');
      expect(policy).not.toContain("'unsafe-eval'");
      expect(policy).toContain("frame-ancestors 'none'");
    }
  });
});
