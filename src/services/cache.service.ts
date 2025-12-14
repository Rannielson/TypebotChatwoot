import { redis } from '../config/redis';
import { Inbox } from '../models/inbox.model';
import { Tenant } from '../models/tenant.model';
import { InboxModel } from '../models/inbox.model';
import { TenantModel } from '../models/tenant.model';

export class CacheService {
  private static INBOX_TTL = 3600; // 1 hora
  private static TENANT_TTL = 3600; // 1 hora
  private static SESSION_TTL = 86400; // 24 horas

  static async getInbox(inboxId: number): Promise<Inbox | null> {
    const cacheKey = `inbox:${inboxId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const inbox = await InboxModel.findByChatwootInboxId(inboxId);
    if (inbox) {
      await redis.set(cacheKey, JSON.stringify(inbox), this.INBOX_TTL);
    }
    
    return inbox;
  }

  static async getTenant(tenantId: number): Promise<Tenant | null> {
    const cacheKey = `tenant:${tenantId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const tenant = await TenantModel.findById(tenantId);
    if (tenant) {
      await redis.set(cacheKey, JSON.stringify(tenant), this.TENANT_TTL);
    }
    
    return tenant;
  }

  static async invalidateInbox(inboxId: number): Promise<void> {
    await redis.del(`inbox:${inboxId}`);
  }

  static async invalidateTenant(tenantId: number): Promise<void> {
    await redis.del(`tenant:${tenantId}`);
  }

  // Cache de sessões (já existe no SessionService, mas otimizado)
  static async getSessionCache(key: string): Promise<any | null> {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  static async setSessionCache(key: string, value: any, ttl: number = this.SESSION_TTL): Promise<void> {
    await redis.set(key, JSON.stringify(value), ttl);
  }
}
