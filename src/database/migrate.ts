import { db } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

interface Migration {
  name: string;
  up: string;
  down: string;
}

/**
 * Busca recursivamente todos os arquivos de migration em subdiretórios
 * Mantém a ordem numérica baseada no prefixo do nome do arquivo
 */
function getAllMigrationFiles(dir: string, fileList: Array<{ path: string; name: string }> = []): Array<{ path: string; name: string }> {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursivamente busca em subdiretórios
      getAllMigrationFiles(filePath, fileList);
    } else if (file.endsWith('.ts')) {
      // Extrai o número do prefixo (ex: "001_create_users.ts" -> "001")
      const match = file.match(/^(\d+)_/);
      if (match) {
        const number = parseInt(match[1], 10);
        fileList.push({
          path: filePath,
          name: file.replace('.ts', ''),
        });
      }
    }
  });

  // Ordena por número do prefixo
  return fileList.sort((a, b) => {
    const numA = parseInt(a.name.match(/^(\d+)_/)?.[1] || '0', 10);
    const numB = parseInt(b.name.match(/^(\d+)_/)?.[1] || '0', 10);
    return numA - numB;
  });
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

    // Busca todas as migrations recursivamente em subdiretórios
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = getAllMigrationFiles(migrationsDir);

    console.log(`Found ${migrationFiles.length} migration(s) to process`);

    for (const { path: migrationPath, name: migrationName } of migrationFiles) {
      // Verifica se já foi executada
      const result = await db.query(
        'SELECT name FROM migrations WHERE name = $1',
        [migrationName]
      );

      if (result.rows.length > 0) {
        console.log(`⏭️  Skipping migration: ${migrationName} (already executed)`);
        continue;
      }

      // Carrega e executa migration
      console.log(`🔄 Running migration: ${migrationName}`);
      const migration: Migration = await import(migrationPath);

      await db.query('BEGIN');
      try {
        await db.query(migration.up);
        await db.query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
        await db.query('COMMIT');
        console.log(`✅ Migration ${migrationName} executed successfully`);
      } catch (error) {
        await db.query('ROLLBACK');
        console.error(`❌ Error executing migration ${migrationName}:`, error);
        throw error;
      }
    }

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration error:', error);
    await db.close();
    process.exit(1);
  } finally {
    await db.close();
  }
}

runMigrations();

