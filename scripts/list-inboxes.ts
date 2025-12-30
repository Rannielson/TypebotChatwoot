import { db } from '../src/config/database';

async function listInboxes() {
  try {
    const result = await db.query(
      'SELECT id, tenant_id, inbox_id, inbox_name, auto_close_minutes, is_active FROM inboxes ORDER BY id'
    );
    
    console.log('\n📋 Inboxes encontrados:\n');
    console.log(JSON.stringify(result.rows, null, 2));
    console.log('\n');
    
    if (result.rows.length === 0) {
      console.log('⚠️  Nenhum inbox encontrado.');
    } else {
      console.log(`✅ Total: ${result.rows.length} inbox(es)\n`);
      console.log('💡 Para configurar auto_close_minutes, use:');
      console.log('   PUT /api/inboxes/:id');
      console.log('   Body: { "auto_close_minutes": 30 } // minutos\n');
    }
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await db.close();
  }
}

listInboxes();

