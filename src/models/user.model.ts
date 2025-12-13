import { db } from '../config/database';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  password_hash: string;
}

export class UserModel {
  static async findByEmail(email: string): Promise<User | null> {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    return result.rows[0] || null;
  }

  static async findById(id: number): Promise<User | null> {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async create(data: CreateUserData): Promise<User> {
    const result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
      [data.email, data.password_hash]
    );
    return result.rows[0];
  }

  static async update(id: number, data: Partial<CreateUserData>): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.email) {
      fields.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.password_hash) {
      fields.push(`password_hash = $${paramCount++}`);
      values.push(data.password_hash);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }
}

