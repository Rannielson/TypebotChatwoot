import { InboxModel, CreateInboxData } from '../models/inbox.model';

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
    await this.findById(id); // Verifica se existe
    return await InboxModel.update(id, data);
  }

  static async delete(id: number) {
    await this.findById(id); // Verifica se existe
    await InboxModel.delete(id);
  }
}

