import { TenantModel, CreateTenantData } from '../models/tenant.model';

export class TenantService {
  static async findAll() {
    return await TenantModel.findAll();
  }

  static async findById(id: number) {
    const tenant = await TenantModel.findById(id);
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    return tenant;
  }

  static async create(data: CreateTenantData) {
    return await TenantModel.create(data);
  }

  static async update(id: number, data: Partial<CreateTenantData>) {
    await this.findById(id); // Verifica se existe
    return await TenantModel.update(id, data);
  }

  static async delete(id: number) {
    await this.findById(id); // Verifica se existe
    await TenantModel.delete(id);
  }
}

