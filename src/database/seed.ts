import { db } from '../config/database';
import { hashPassword } from '../utils/password.util';

async function seed() {
  try {
    console.log('Starting seed...');

    // Verifica se já existe usuário admin
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [
      'admin@example.com',
    ]);

    if (existingUser.rows.length > 0) {
      console.log('Admin user already exists, skipping seed');
      await db.close();
      return;
    }

    // Cria usuário admin padrão
    const passwordHash = await hashPassword('admin123');
    await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
      ['admin@example.com', passwordHash]
    );

    console.log('Seed completed successfully');
    console.log('Default admin user created:');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123');
    console.log('  ⚠️  Please change the password after first login!');
  } catch (error) {
    console.error('Seed error:', error);
    await db.close();
    process.exit(1);
  } finally {
    await db.close();
  }
}

seed();

