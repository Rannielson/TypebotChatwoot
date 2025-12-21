import { TenantModel, CreateTenantData } from '../models/tenant.model';
import { CacheService } from './cache.service';

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
    
    // Atualiza no banco
    const updatedTenant = await TenantModel.update(id, data);
    
    // Invalida o cache do tenant
    await CacheService.invalidateTenant(id);
    
    return updatedTenant;
  }

  static async delete(id: number) {
    await this.findById(id); // Verifica se existe
    
    // Deleta do banco
    await TenantModel.delete(id);
    
    // Invalida o cache do tenant
    await CacheService.invalidateTenant(id);
  }
}

