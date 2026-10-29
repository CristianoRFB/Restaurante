import { describe, expect, it } from 'vitest';
import { FoodDemoRateLimiter, type FoodRateStore } from '@/lib/food-worker-rate-limit';

describe('Food demo rate limit: tenant, user, operation isolation',()=>{
  it('rate limits one tenant/user without consuming a second tenant or operation',async()=>{
    const limiter=new FoodDemoRateLimiter();
    for(let n=0;n<12;n++)expect((await limiter.check('food-a-demo','memberA','orders',60001)).allowed).toBe(true);
    const denied=await limiter.check('food-a-demo','memberA','orders',60001);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSeconds).toBeGreaterThan(0);
    expect((await limiter.check('food-b-demo','memberA','orders',60001)).allowed).toBe(true);
    expect((await limiter.check('food-a-demo','memberB','orders',60001)).allowed).toBe(true);
    expect((await limiter.check('food-a-demo','memberA','reservations',60001)).allowed).toBe(true);
    expect((await limiter.check('food-a-demo','memberA','orders',120001)).allowed).toBe(true);
  });
  it('rejects invalid path fragments without allocating state',async()=>{
    const limiter=new FoodDemoRateLimiter();
    expect((await limiter.check('../food-a-demo','memberA','orders')).allowed).toBe(false);
    expect((await limiter.check('food-a-demo','../../other','orders')).allowed).toBe(false);
    expect((await limiter.check('food-a','memberA','orders')).allowed).toBe(false);
  });
  it('namespaces persisted KV keys and does not store plain user identifiers',async()=>{
    const records=new Map<string,string>();
    const kv:FoodRateStore={
      get:async key=>records.get(key)??null,
      put:async(key,value)=>{records.set(key,value);},
    };
    const limiter=new FoodDemoRateLimiter(kv);
    await limiter.check('food-a-demo','privateUID123','reservations',60001);
    await limiter.check('food-b-demo','privateUID123','reservations',60001);
    expect(records.size).toBe(2);
    expect([...records.keys()].every(k=>k.startsWith('food-demo:rl:reservations:')&&!k.includes('privateUID123'))).toBe(true);
  });
  it('fails closed on corrupt KV state',async()=>{
    const kv:FoodRateStore={get:async()=>'-10',put:async()=>undefined};
    await expect(new FoodDemoRateLimiter(kv).check('food-a-demo','memberA','orders',60001)).rejects.toThrow();
  });
});