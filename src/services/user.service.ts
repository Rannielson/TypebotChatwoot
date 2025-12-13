import { UserModel, CreateUserData } from '../models/user.model';
import { hashPassword } from '../utils/password.util';

export interface CreateUserRequest {
  email: string;
  password: string;
}

export class UserService {
  static async create(data: CreateUserRequest): Promise<{ id: number; email: string }> {
    const existingUser = await UserModel.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await hashPassword(data.password);

    const userData: CreateUserData = {
      email: data.email,
      password_hash: passwordHash,
    };

    const user = await UserModel.create(userData);

    return {
      id: user.id,
      email: user.email,
    };
  }

  static async findById(id: number) {
    const user = await UserModel.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user.id,
      email: user.email,
    };
  }
}

