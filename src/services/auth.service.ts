import { UserModel } from '../models/user.model';
import { comparePassword } from '../utils/password.util';
import { generateToken, verifyToken, JWTPayload } from '../utils/jwt.util';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: {
    id: number;
    email: string;
  };
}

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<AuthResult> {
    const user = await UserModel.findByEmail(credentials.email);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = await comparePassword(credentials.password, user.password_hash);

    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
    };

    const token = generateToken(payload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  static async validateToken(token: string): Promise<JWTPayload> {
    return verifyToken(token);
  }
}

