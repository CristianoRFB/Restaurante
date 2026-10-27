import { describe, expect, it } from 'vitest';
import { validatedDemoBranding } from '@/shared/food-demo-branding';
import type { FoodDemoBranding } from '@/shared/food-platform-domain';
const valid: FoodDemoBranding={name:'Demo Alpha',tagline:'Fictícia',primaryColor:'#aabbcc'};
describe('brand settings for private Food demo',()=>{
  it('normalizes colors, fills missing optional values and preserves short textual identity',()=>{
    expect(validatedDemoBranding(valid)).toMatchObject({
      name:'Demo Alpha',primaryColor:'#AABBCC',backgroundColor:'#FFFFFF',accentColor:'#F3E5CD',fontPreset:'system',
    });
  });
  it('blocks CSS injection, URLs and invalid theme values',()=>{
    expect(()=>validatedDemoBranding({...valid,backgroundColor:'url(https://attacker.test)'})).toThrow();
    expect(()=>validatedDemoBranding({...valid,accentColor:'var(--hack)'})).toThrow();
    expect(()=>validatedDemoBranding({...valid,primaryColor:'#fff'})).toThrow();
    expect(()=>validatedDemoBranding({...valid,fontPreset:'javascript' as FoodDemoBranding['fontPreset']})).toThrow();
    expect(()=>validatedDemoBranding({...valid,name:'  '})).toThrow();
  });
});
