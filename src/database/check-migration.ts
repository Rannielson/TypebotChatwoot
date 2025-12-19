import { db } from '../config/database';

async function checkMigration(migrationName: string) {
  try {
    console.log(`Verificando status da migration: ${migrationName}...\n`);

    // Verifica se a tabela migrations existe
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'migrations'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('❌ Tabela migrations não existe ainda. Nenhuma migration foi executada.');
      await db.close();
      return;
    }

    // Verifica se a migration foi executada
    const result = await db.query(
      'SELECT name, executed_at FROM migrations WHERE name = $1',
      [migrationName]
    );

    if (result.rows.length > 0) {
      const migration = result.rows[0];
      console.log(`✅ Migration ${migrationName} JÁ FOI EXECUTADA`);
      console.log(`   Data de execução: ${migration.executed_at}`);
    } else {
      console.log(`❌ Migration ${migrationName} AINDA NÃO FOI EXECUTADA`);
      console.log('\nPara executar, rode: npm run migrate');
    }

    // Lista todas as migrations executadas
    const allMigrations = await db.query(
      'SELECT name, executed_at FROM migrations ORDER BY executed_at DESC'
    );

    console.log(`\n📋 Total de migrations executadas: ${allMigrations.rows.length}`);
    if (allMigrations.rows.length > 0) {
      console.log('\nMigrations executadas:');
      allMigrations.rows.forEach((m: any, index: number) => {
        const status = m.name === migrationName ? ' 👈 (esta)' : '';
        console.log(`   ${index + 1}. ${m.name} - ${m.executed_at}${status}`);
      });
    }

  } catch (error: any) {
    console.error('Erro ao verificar migration:', error.message);
  } finally {
    await db.close();
  }
}

const migrationName = process.argv[2] || '010_add_test_mode_to_inboxes';
checkMigration(migrationName);
