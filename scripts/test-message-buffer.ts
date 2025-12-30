import { MessageBufferService } from '../src/services/message-buffer.service';
import { redis } from '../src/config/redis';
import { NormalizedChatwootMessage } from '../src/types/chatwoot';

/**
 * Script de teste para verificar se o buffer de mensagens está funcionando
 * Simula múltiplas mensagens chegando rapidamente
 */

async function testMessageBuffer() {
  console.log('🧪 Iniciando teste do buffer de mensagens...\n');

  try {
    // Conecta ao Redis
    await redis.connect();
    console.log('✅ Conectado ao Redis\n');

    // Dados de teste
    const inboxId = 1;
    const conversationId = 12345;
    const phoneNumber = '5511999999999';

    // Cria mensagens de teste simuladas
    const createTestMessage = (messageId: string, hasAttachment: boolean = true): NormalizedChatwootMessage => {
      return {
        message: {
          message_id: messageId,
          chat_id: conversationId.toString(),
          remotejid: phoneNumber,
          content: hasAttachment ? '' : 'Mensagem de texto',
          timestamp: new Date().toISOString(),
        },
        attachments: hasAttachment
          ? [
              {
                id: parseInt(messageId),
                file_type: 'image',
                data_url: `https://example.com/image-${messageId}.jpg`,
                file_size: 1024,
              },
            ]
          : [],
        account_id: 1,
        inbox_id: inboxId,
        name: 'Usuário Teste',
        chatwoot_url: 'https://chatconnect.cleoia.com.br',
      };
    };

    console.log('📤 Enviando 5 mensagens com anexos rapidamente...\n');

    // Envia 5 mensagens rapidamente (simulando múltiplas imagens)
    const promises = [];
    for (let i = 1; i <= 5; i++) {
      const message = createTestMessage(`test-msg-${i}`, true);
      promises.push(
        MessageBufferService.addMessage(message).then((result) => {
          console.log(
            `  ✅ Mensagem ${i} adicionada ao buffer: ` +
            `buffered=${result.buffered}, bufferSize=${result.bufferSize}`
          );
          return result;
        })
      );
    }

    const results = await Promise.all(promises);
    console.log('\n📊 Resultados:');
    console.log(`  • Total de mensagens enviadas: ${results.length}`);
    console.log(`  • Mensagens buffered: ${results.filter(r => r.buffered).length}`);
    console.log(`  • Tamanho final do buffer: ${results[results.length - 1].bufferSize}`);

    // Verifica buffer no Redis
    const bufferKey = `msg-buffer:${inboxId}:${conversationId}:${phoneNumber}`;
    const bufferData = await redis.get(bufferKey);

    if (bufferData) {
      const buffer = JSON.parse(bufferData);
      console.log('\n📦 Buffer no Redis:');
      console.log(`  • Chave: ${bufferKey}`);
      console.log(`  • Mensagens no buffer: ${buffer.messages.length}`);
      console.log(`  • Última atualização: ${new Date(buffer.lastUpdate).toISOString()}`);
      console.log(`  • Processando: ${buffer.processing}`);
      console.log(`  • Timestamps das mensagens:`);
      buffer.messages.forEach((msg: any, index: number) => {
        console.log(
          `    ${index + 1}. ${msg.normalizedMessage.message.message_id} ` +
          `(${new Date(msg.timestamp).toISOString()})`
        );
      });
    } else {
      console.log('\n⚠️  Buffer não encontrado no Redis (pode ter sido processado já)');
    }

    // Aguarda um pouco para ver se o buffer é processado
    console.log('\n⏳ Aguardando 4 segundos para verificar processamento do buffer...');
    await new Promise((resolve) => setTimeout(resolve, 4000));

    // Verifica novamente
    const bufferDataAfter = await redis.get(bufferKey);
    if (bufferDataAfter) {
      console.log('⚠️  Buffer ainda existe (pode estar aguardando timeout)');
    } else {
      console.log('✅ Buffer foi processado e removido (esperado após timeout)');
    }

    console.log('\n🧪 Teste concluído!');
    console.log('\n💡 Para verificar logs em tempo real:');
    console.log('   docker-compose logs -f webhook-api | grep "MessageBuffer"');
    console.log('   docker-compose logs -f worker | grep "buffered"');

  } catch (error: any) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await redis.disconnect();
  }
}

testMessageBuffer();
