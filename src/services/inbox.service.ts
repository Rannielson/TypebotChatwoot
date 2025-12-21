import { InboxModel, CreateInboxData } from '../models/inbox.model';
import { CacheService } from './cache.service';

export class InboxService {
  static async findAll() {
    return await InboxModel.findAll();
  }

  static async findByTenantId(tenantId: number) {
    return await InboxModel.findByTenantId(tenantId);
  }

  static async findById(id: number) {
    const inbox = await InboxModel.findById(id);
    if (!inbox) {
      throw new Error('Inbox not found');
    }
    return inbox;
  }

  static async findByChatwootInboxId(inboxId: number) {
    const inbox = await InboxModel.findByChatwootInboxId(inboxId);
    if (!inbox) {
      throw new Error('Inbox not found');
    }
    return inbox;
  }

  static async create(data: CreateInboxData) {
    // Verifica se já existe inbox com mesmo tenant_id e inbox_id
    const existing = await InboxModel.findByInboxId(
      data.tenant_id,
      data.inbox_id
    );
    if (existing) {
      throw new Error('Inbox with this ID already exists for this tenant');
    }

    return await InboxModel.create(data);
  }

  static async update(id: number, data: Partial<CreateInboxData>) {
    // Busca o inbox antes de atualizar para obter o inbox_id (Chatwoot inbox ID) usado como chave do cache
    const existingInbox = await this.findById(id);
    
    // Atualiza no banco
    const updatedInbox = await InboxModel.update(id, data);
    
    // Invalida o cache usando o inbox_id (Chatwoot inbox ID) que é usado como chave no CacheService
    await CacheService.invalidateInbox(existingInbox.inbox_id);
    
    return updatedInbox;
  }

  static async delete(id: number) {
    // Busca o inbox antes de deletar para obter o inbox_id (Chatwoot inbox ID) usado como chave do cache
    const existingInbox = await this.findById(id);
    
    // Deleta do banco
    await InboxModel.delete(id);
    
    // Invalida o cache usando o inbox_id (Chatwoot inbox ID) que é usado como chave no CacheService
    await CacheService.invalidateInbox(existingInbox.inbox_id);
  }
}

