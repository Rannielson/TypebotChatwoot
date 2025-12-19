import { TriggerModel } from '../models/trigger.model';
import { Trigger, CreateTriggerData, UpdateTriggerData } from '../types/trigger';

export class TriggerService {
  static async findAll(): Promise<Trigger[]> {
    return await TriggerModel.findAll();
  }

  static async findById(id: number): Promise<Trigger | null> {
    return await TriggerModel.findById(id);
  }

  static async findByInboxId(inboxId: number): Promise<Trigger[]> {
    return await TriggerModel.findByInboxId(inboxId);
  }

  static async findActiveByInboxId(inboxId: number): Promise<Trigger[]> {
    return await TriggerModel.findActiveByInboxId(inboxId);
  }

  static async create(data: CreateTriggerData): Promise<Trigger> {
    // Validações
    if (!data.name || data.name.trim() === '') {
      throw new Error('Nome do trigger é obrigatório');
    }

    if (data.idle_minutes <= 0) {
      throw new Error('idle_minutes deve ser maior que 0');
    }

    if (data.check_frequency_minutes < 1) {
      throw new Error('check_frequency_minutes deve ser no mínimo 1 minuto');
    }

    // Verifica se já existe trigger com mesmo nome
    const existing = await TriggerModel.findByName(data.name);
    if (existing) {
      throw new Error(`Já existe um trigger com o nome "${data.name}"`);
    }

    return await TriggerModel.create(data);
  }

  static async update(id: number, data: UpdateTriggerData): Promise<Trigger> {
    const trigger = await TriggerModel.findById(id);
    if (!trigger) {
      throw new Error('Trigger não encontrado');
    }

    // Validações
    if (data.name !== undefined && data.name.trim() === '') {
      throw new Error('Nome do trigger não pode ser vazio');
    }

    if (data.idle_minutes !== undefined && data.idle_minutes <= 0) {
      throw new Error('idle_minutes deve ser maior que 0');
    }

    if (data.check_frequency_minutes !== undefined && data.check_frequency_minutes < 1) {
      throw new Error('check_frequency_minutes deve ser no mínimo 1 minuto');
    }

    // Verifica se nome já existe (se estiver mudando)
    if (data.name && data.name !== trigger.name) {
      const existing = await TriggerModel.findByName(data.name);
      if (existing) {
        throw new Error(`Já existe um trigger com o nome "${data.name}"`);
      }
    }

    return await TriggerModel.update(id, data);
  }

  static async delete(id: number): Promise<void> {
    const trigger = await TriggerModel.findById(id);
    if (!trigger) {
      throw new Error('Trigger não encontrado');
    }

    await TriggerModel.delete(id);
  }

  static async attachToInbox(triggerId: number, inboxId: number): Promise<void> {
    const trigger = await TriggerModel.findById(triggerId);
    if (!trigger) {
      throw new Error('Trigger não encontrado');
    }

    await TriggerModel.attachToInbox(triggerId, inboxId);
  }

  static async detachFromInbox(triggerId: number, inboxId: number): Promise<void> {
    await TriggerModel.detachFromInbox(triggerId, inboxId);
  }

  static async getInboxIdsForTrigger(triggerId: number): Promise<number[]> {
    return await TriggerModel.getInboxIdsForTrigger(triggerId);
  }
}
