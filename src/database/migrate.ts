import { db } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

interface Migration {
  name: string;
  up: string;
  down: string;
}

async function runMigrations() {
  try {
    console.log('Starting migrations...');

    // Cria tabela de controle de migrations
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Lista todas as migrations
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (!file.endsWith('.ts')) continue;

      const migrationName = file.replace('.ts', '');
      
      // Verifica se já foi executada
      const result = await db.query(
        'SELECT name FROM migrations WHERE name = $1',
        [migrationName]
      );

      if (result.rows.length > 0) {
        console.log(`Skipping migration: ${migrationName} (already executed)`);
        continue;
      }

      // Carrega e executa migration
      const migrationPath = path.join(migrationsDir, file);
      const migration: Migration = await import(migrationPath);

      console.log(`Running migration: ${migrationName}`);

      await db.query('BEGIN');
      try {
        await db.query(migration.up);
        await db.query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
        await db.query('COMMIT');
        console.log(`Migration ${migrationName} executed successfully`);
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    await db.close();
    process.exit(1);
  } finally {
    await db.close();
  }
}

runMigrations();

