import { env } from 'cloudflare:workers';

export type FoodDemoOperation = 'orders' | 'reservations';
export interface FoodDemoRateResult { allowed: boolean; retryAfterSeconds: number }
export interface FoodRateStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}
export class FoodDemoRateLimiter {
  private readonly counters = new Map<string,{count:number;expires:number}>();
  constructor(private readonly remote?: FoodRateStore, private readonly windowMs = 60_000) {}

  async check(tenantId: string, uid: string, operation: FoodDemoOperation, now = Date.now()): Promise<FoodDemoRateResult> {
    if (!/^[a-z][a-z0-9-]{2,62}-demo$/.test(tenantId) ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(uid) ||
      !['orders','reservations'].includes(operation)) {
      // Fail closed without allocating keys for unchecked path fragments.
      return {allowed:false,retryAfterSeconds:60};
    }
    const maxRequests = operation === 'orders' ? 12 : 8;
    const bucket = Math.floor(now/this.windowMs);
    const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({tenantId,uid,operation,bucket})));
    const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const key = 'food-demo:rl:'+operation+':'+hash;
    const expiry = (bucket+1)*this.windowMs;
    if (this.remote) {
      // KV is advisory under concurrency (get/put isn't atomic); don't claim distributed rate enforcement.
      const raw = await this.remote.get(key);
      let count=0;
      if (raw!==null) {
        const parsed=Number(raw);
        if (!Number.isSafeInteger(parsed) || parsed<0) throw new Error('KV rate-limit state invalid.');
        count=parsed;
      }
      if (count>=maxRequests) return {allowed:false,retryAfterSeconds:Math.max(1,Math.ceil((expiry-now)/1000))};
      await this.remote.put(key,String(count+1),{expirationTtl:Math.max(60,Math.ceil(this.windowMs/1000)+60)});
      return {allowed:true,retryAfterSeconds:0};
    }
    const previous = this.counters.get(key);
    const count = previous?.expires===expiry ? previous.count : 0;
    if (count>=maxRequests) return {allowed:false,retryAfterSeconds:Math.max(1,Math.ceil((expiry-now)/1000))};
    if (this.counters.size>2048) {
      for (const [k,v] of this.counters) {if(v.expires<=now)this.counters.delete(k);}
      if(this.counters.size>2048)this.counters.clear();
    }
    this.counters.set(key,{count:count+1,expires:expiry});
    return {allowed:true,retryAfterSeconds:0};
  }
}
const localLimiter=new FoodDemoRateLimiter();
export async function limitFoodDemoRequest(tenantId:string,uid:string,operation:FoodDemoOperation):Promise<FoodDemoRateResult>{
  const kv=(env as unknown as {FOOD_DEMO_RATE_LIMIT?: FoodRateStore}).FOOD_DEMO_RATE_LIMIT;
  if(kv){
    // An outage must not silently become unlimited access to privileged API.
    return new FoodDemoRateLimiter(kv).check(tenantId,uid,operation);
  }
  return localLimiter.check(tenantId,uid,operation);
}
