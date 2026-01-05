import {
  TypebotResponse,
  TypebotTextMessage,
  TypebotImageMessage,
  TypebotMessage,
  TypebotChoiceInput,
} from '../types/typebot';
import {
  WhatsAppTextMessage,
  WhatsAppImageMessage,
  WhatsAppInteractiveButtonsMessage,
  WhatsAppInteractiveListMessage,
  WhatsAppInteractiveCTAImageMessage,
  WhatsAppMessage,
} from '../types/whatsapp';
import { redis } from '../config/redis';

function extractTextFromRichText(richText: any[] | undefined): string {
  if (!richText || !Array.isArray(richText)) {
    return '';
  }

  const extractText = (node: any): string => {
    if (typeof node === 'string') {
      return node;
    }

    if (node.text) {
      return node.text;
    }

    if (node.children && Array.isArray(node.children)) {
      return node.children.map(extractText).join('');
    }

    return '';
  };

  return richText.map(extractText).join('\n').trim();
}

export function transformTextMessages(
  messages: TypebotTextMessage[],
  to: string
): WhatsAppTextMessage[] {
  return messages
    .filter((msg): msg is TypebotTextMessage => msg.type === 'text')
    .map((msg) => {
      const text = extractTextFromRichText(msg.content.richText);
      return {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          body: text,
          preview_url: false,
        },
      };
    });
}

export async function transformImageMessages(
  messages: TypebotImageMessage[],
  to: string,
  allMessages?: TypebotMessage[], // Todas as mensagens para buscar texto anterior
  conversationId?: number,
  inboxId?: number
): Promise<(WhatsAppImageMessage | WhatsAppInteractiveCTAImageMessage)[]> {
  const results = await Promise.all(
    messages
      .filter((msg): msg is TypebotImageMessage => msg.type === 'image')
      .map(async (msg) => {
      // Se tem clickLink, transforma em mensagem interativa com CTA
      if (msg.content.clickLink?.url) {
        // Nome do botão sempre "Clique aqui" (padrão)
        const buttonTitle = 'Clique aqui';
        
        // Busca texto de mensagens próximas para usar como body
        // IMPORTANTE: O link já vem em msg.content.clickLink.url, não precisamos extrair do texto
        let bodyText = 'Clique no botão para abrir o link'; // Texto padrão (Meta API requer pelo menos 1 caractere válido)
        
        if (allMessages) {
          // Encontra a posição da imagem atual
          const imageIndex = allMessages.findIndex(m => m.id === msg.id);
          
          console.log('[TypebotToWhatsApp] 🔍 Buscando texto com "https:" em todas as mensagens:', {
            totalMessages: allMessages.length,
            imageId: msg.id,
            imageIndex,
            allTextMessages: allMessages
              .filter(m => m.type === 'text')
              .map((m, idx) => {
                const textMsg = m as TypebotTextMessage;
                const extractedText = extractTextFromRichText(textMsg.content.richText);
                return {
                  index: allMessages.indexOf(m),
                  messageId: textMsg.id,
                  preview: extractedText.substring(0, 100),
                  hasHttps: extractedText.toLowerCase().includes('https:'),
                };
              }),
          });
          
          // IMPORTANTE: O texto e o link vêm separados no Typebot
          // O link já está em msg.content.clickLink.url
          // Precisamos apenas encontrar o texto próximo à imagem para usar como bodyText
          // Não precisamos procurar por "https:" no texto
          
          // Abordagem simplificada: usa apenas 1 mensagem antes ou 1 depois da imagem
          // Prioridade: 1 mensagem ANTES > 1 mensagem DEPOIS
          
          let foundText = false;
          
          // 1. Tenta encontrar na mensagem IMEDIATAMENTE ANTES da imagem (prioridade máxima)
          if (imageIndex > 0 && allMessages[imageIndex - 1].type === 'text') {
            const textMsg = allMessages[imageIndex - 1] as TypebotTextMessage;
            const extractedText = extractTextFromRichText(textMsg.content.richText);
            
            if (extractedText.trim()) {
              bodyText = extractedText.trim();
              foundText = true;
              
              console.log('[TypebotToWhatsApp] ✅ Texto encontrado (1 mensagem ANTES da imagem):', {
                index: imageIndex - 1,
                messageId: textMsg.id,
                bodyText: bodyText.substring(0, 100),
                fullText: bodyText,
              });
            }
          }
          
          // 2. Se não encontrou antes, tenta encontrar na mensagem IMEDIATAMENTE DEPOIS da imagem
          if (!foundText && imageIndex < allMessages.length - 1 && allMessages[imageIndex + 1].type === 'text') {
            const textMsg = allMessages[imageIndex + 1] as TypebotTextMessage;
            const extractedText = extractTextFromRichText(textMsg.content.richText);
            
            if (extractedText.trim()) {
              bodyText = extractedText.trim();
              foundText = true;
              
              console.log('[TypebotToWhatsApp] ✅ Texto encontrado (1 mensagem DEPOIS da imagem):', {
                index: imageIndex + 1,
                messageId: textMsg.id,
                bodyText: bodyText.substring(0, 100),
                fullText: bodyText,
              });
            }
          }
          
          if (!foundText) {
            console.log('[TypebotToWhatsApp] ⚠️ Nenhuma mensagem de texto encontrada imediatamente antes ou depois da imagem');
          }
        } else {
          console.log('[TypebotToWhatsApp] ⚠️ allMessages não foi fornecido');
        }
        
        // A URL já vem no clickLink.url (não precisa extrair do texto)
        const finalCtaUrl = msg.content.clickLink.url;
        
        // Garante que bodyText não seja vazio (Meta API requer pelo menos 1 caractere válido)
        // Se não encontrou texto antes de "https:", usa o texto padrão
        const normalizedBodyText = bodyText.trim() || 'Clique no botão para abrir o link';
        
        // Validações antes de criar a mensagem
        if (!msg.content.url || msg.content.url.trim() === '') {
          console.error('[TypebotToWhatsApp] ❌ Erro: URL da imagem está ausente ou vazia');
          throw new Error('URL da imagem é obrigatória para mensagem interativa CTA URL');
        }
        
        if (!finalCtaUrl || finalCtaUrl.trim() === '') {
          console.error('[TypebotToWhatsApp] ❌ Erro: URL do CTA está ausente ou vazia');
          throw new Error('URL do CTA é obrigatória para mensagem interativa CTA URL');
        }
        
        if (!buttonTitle || buttonTitle.trim() === '') {
          console.error('[TypebotToWhatsApp] ❌ Erro: Título do botão está ausente ou vazio');
          throw new Error('Título do botão é obrigatório para mensagem interativa CTA URL');
        }
        
        console.log('[TypebotToWhatsApp] ✅ Criando mensagem interativa CTA URL:', {
          imageUrl: msg.content.url.substring(0, 50),
          ctaUrl: finalCtaUrl.substring(0, 50),
          buttonTitle: buttonTitle,
          bodyTextLength: normalizedBodyText.length,
          bodyTextPreview: normalizedBodyText.substring(0, 50),
          bodyTextFull: normalizedBodyText,
          urlSource: 'do clickLink',
        });
        
        return {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'interactive',
          interactive: {
            type: 'cta_url',
            header: {
              type: 'image',
              image: {
                link: msg.content.url.trim(),
              },
            },
            body: {
              text: normalizedBodyText.substring(0, 1024), // Limita a 1024 caracteres (limite do WhatsApp)
            },
            action: {
              name: 'cta_url',
              parameters: {
                display_text: buttonTitle.trim().substring(0, 20), // Limita a 20 caracteres (limite do WhatsApp)
                url: finalCtaUrl.trim(),
              },
            },
          },
        } as WhatsAppInteractiveCTAImageMessage;
      }

      // Caso contrário, envia como mensagem de imagem simples
      return {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'image',
        image: {
          link: msg.content.url,
        },
      } as WhatsAppImageMessage;
      })
  );
  
  return results;
}

/**
 * Extrai header, body, footer e button text das mensagens de texto
 * Ordem esperada: header, body, footer, button text
 * 
 * Retorna também as mensagens que NÃO fazem parte dos componentes da lista
 * (mensagens de grupos/blocos anteriores que devem ser enviadas separadamente)
 */
function extractInteractiveListComponents(
  textMessages: TypebotTextMessage[]
): {
  separateMessages: TypebotTextMessage[]; // Mensagens que devem ser enviadas separadamente
  header?: string;
  body: string;
  footer?: string;
  buttonText: string;
} {
  // Máximo de 4 mensagens podem ser usadas como componentes da lista
  // (header, body, footer, button text)
  // Qualquer mensagem anterior deve ser enviada separadamente
  const maxComponentsForList = 4;
  const messagesForList = textMessages.slice(-maxComponentsForList);
  const separateMessages = textMessages.slice(0, -maxComponentsForList);

  // Extrai componentes da lista das últimas mensagens
  const header = messagesForList.length >= 1 
    ? extractTextFromRichText(messagesForList[0].content.richText).trim() 
    : undefined;
  const body = messagesForList.length >= 2
    ? extractTextFromRichText(messagesForList[1].content.richText).trim()
    : messagesForList.length >= 1
    ? extractTextFromRichText(messagesForList[0].content.richText).trim()
    : 'Escolha uma opção:';
  const footer = messagesForList.length >= 3
    ? extractTextFromRichText(messagesForList[2].content.richText).trim()
    : undefined;
  const buttonText = messagesForList.length >= 4
    ? extractTextFromRichText(messagesForList[3].content.richText).trim()
    : 'Ver opções';

  return {
    separateMessages,
    header: header || undefined,
    body: body || 'Escolha uma opção:',
    footer: footer || undefined,
    buttonText: buttonText || 'Ver opções',
  };
}

/**
 * Organiza itens em seções para interactive list
 * Máximo 10 seções, cada uma com até 10 itens
 */
function organizeItemsIntoSections(
  items: Array<{ id: string; title: string; description?: string }>
): Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }> {
  const maxSections = 10;
  const maxRowsPerSection = 10;
  const sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }> = [];

  // Divide os itens em seções
  for (let i = 0; i < items.length && sections.length < maxSections; i += maxRowsPerSection) {
    const sectionItems = items.slice(i, i + maxRowsPerSection);
    sections.push({
      title: `Opções ${sections.length + 1}`,
      rows: sectionItems,
    });
  }

  return sections;
}

export function transformChoiceInputToList(
  typebotResponse: TypebotResponse,
  to: string
): {
  listMessage: WhatsAppInteractiveListMessage | null;
  separateTextMessages: WhatsAppTextMessage[];
} {
  if (!typebotResponse.input || typebotResponse.input.type !== 'choice input') {
    return {
      listMessage: null,
      separateTextMessages: [],
    };
  }

  const choiceInput = typebotResponse.input as TypebotChoiceInput;

  // Só usa list se tiver mais de 3 itens
  if (choiceInput.items.length <= 3) {
    return {
      listMessage: null,
      separateTextMessages: [],
    };
  }

  // Log detalhado de todos os itens recebidos do Typebot
  console.log(`[TypebotToWhatsApp] 📋 Itens recebidos do Typebot (${choiceInput.items.length} total):`);
  choiceInput.items.forEach((item, index) => {
    console.log(`  ${index + 1}. "${item.content}"`, {
      id: item.id,
      outgoingEdgeId: item.outgoingEdgeId,
      displayCondition: item.displayCondition,
    });
  });

  // Extrai header, body, footer e button text das mensagens
  // Também identifica mensagens que devem ser enviadas separadamente
  const textMessages = typebotResponse.messages?.filter(
    (msg): msg is TypebotTextMessage => msg.type === 'text'
  ) || [];
  
  const { separateMessages, header, body, footer, buttonText } = extractInteractiveListComponents(textMessages);
  
  // Transforma mensagens separadas em mensagens WhatsApp
  const separateTextMessages = transformTextMessages(separateMessages, to);
  
  if (separateMessages.length > 0) {
    console.log(`[TypebotToWhatsApp] 📤 ${separateMessages.length} mensagem(ns) de texto serão enviadas separadamente antes da lista`);
  }

  // Filtra itens que não têm displayCondition ou têm displayCondition habilitado
  // E também filtra itens sem outgoingEdgeId válido
  console.log(`[TypebotToWhatsApp] Processando ${choiceInput.items.length} itens para lista interativa`);
  
  const activeItems = choiceInput.items.filter(
    (item, index) => {
      const hasValidDisplayCondition = !item.displayCondition || item.displayCondition.isEnabled !== false;
      const hasValidOutgoingEdgeId = item.outgoingEdgeId && 
        typeof item.outgoingEdgeId === 'string' && 
        item.outgoingEdgeId.trim() !== '';
      
      const isActive = hasValidDisplayCondition && hasValidOutgoingEdgeId;
      
      if (!isActive) {
        console.warn(`[TypebotToWhatsApp] Item ${index + 1} ("${item.content}") foi filtrado:`, {
          hasValidDisplayCondition,
          hasValidOutgoingEdgeId,
          displayCondition: item.displayCondition,
          outgoingEdgeId: item.outgoingEdgeId,
        });
      }
      
      return isActive;
    }
  );

  console.log(`[TypebotToWhatsApp] ${activeItems.length} itens ativos de ${choiceInput.items.length} totais`);

  // Se não houver itens válidos, retorna apenas as mensagens separadas
  if (activeItems.length === 0) {
    console.warn('[TypebotToWhatsApp] Nenhum item válido encontrado para lista interativa');
    return {
      listMessage: null,
      separateTextMessages: separateTextMessages,
    };
  }

  // Converte itens em rows
  const rows = activeItems.map((item, index) => {
    console.log(`[TypebotToWhatsApp] Adicionando item ${index + 1} à lista: "${item.content}" (id: ${item.outgoingEdgeId})`);
    return {
      id: item.outgoingEdgeId!,
      title: item.content.substring(0, 24), // Limite do WhatsApp
      description: undefined, // Typebot não fornece description, mas podemos adicionar no futuro
    };
  });

  console.log(`[TypebotToWhatsApp] Total de rows criadas: ${rows.length}`);

  // Organiza em seções (máximo 10 seções, 10 itens cada)
  const sections = organizeItemsIntoSections(rows);
  
  console.log(`[TypebotToWhatsApp] Lista organizada em ${sections.length} seção(ões) com ${sections.reduce((sum, s) => sum + s.rows.length, 0)} item(ns) total`);

  if (sections.length === 0) {
    return {
      listMessage: null,
      separateTextMessages: separateTextMessages,
    };
  }

  const listMessage: WhatsAppInteractiveListMessage = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      ...(header && {
        header: {
          type: 'text',
          text: header.substring(0, 60), // Limite do WhatsApp
        },
      }),
      body: {
        text: body.substring(0, 1024), // Limite do WhatsApp
      },
      ...(footer && {
        footer: {
          text: footer.substring(0, 60), // Limite do WhatsApp
        },
      }),
      action: {
        button: buttonText.substring(0, 20), // Limite do WhatsApp
        sections: sections.map((section) => ({
          title: section.title.substring(0, 24), // Limite do WhatsApp
          rows: section.rows.map((row) => ({
            id: row.id,
            title: row.title.substring(0, 24), // Limite do WhatsApp
            ...(row.description && {
              description: row.description.substring(0, 72), // Limite do WhatsApp
            }),
          })),
        })),
      },
    },
  };

  return {
    listMessage,
    separateTextMessages,
  };
}

export function transformChoiceInputToButtons(
  typebotResponse: TypebotResponse,
  to: string
): WhatsAppInteractiveButtonsMessage | null {
  if (!typebotResponse.input || typebotResponse.input.type !== 'choice input') {
    return null;
  }

  const choiceInput = typebotResponse.input as TypebotChoiceInput;

  // Se tiver mais de 3 itens, não usa buttons (deve usar list)
  if (choiceInput.items.length > 3) {
    return null;
  }

  // Log detalhado de todos os itens recebidos do Typebot
  console.log(`[TypebotToWhatsApp] 📋 Itens recebidos do Typebot (${choiceInput.items.length} total):`);
  choiceInput.items.forEach((item, index) => {
    console.log(`  ${index + 1}. "${item.content}"`, {
      id: item.id,
      outgoingEdgeId: item.outgoingEdgeId,
      displayCondition: item.displayCondition,
    });
  });

  // Se já há mensagens de texto, não repetimos o texto no body dos botões
  // Usamos "escolha uma opção" como texto padrão quando há mensagens anteriores
  const textMessages = typebotResponse.messages?.filter(
    (msg): msg is TypebotTextMessage => msg.type === 'text'
  ) || [];
  const hasTextMessages = textMessages.length > 0;
  const bodyText = hasTextMessages 
    ? 'Escolha uma opção:' // Texto padrão quando já há mensagens de texto antes
    : (textMessages.length > 0
        ? extractTextFromRichText(textMessages[textMessages.length - 1].content.richText)
        : 'Escolha uma opção:');

  // Filtra itens ativos e com outgoingEdgeId válido
  console.log(`[TypebotToWhatsApp] Processando ${choiceInput.items.length} itens para botões interativos`);
  
  const activeItems = choiceInput.items.filter(
    (item, index) => {
      const hasValidDisplayCondition = !item.displayCondition || item.displayCondition.isEnabled !== false;
      const hasValidOutgoingEdgeId = item.outgoingEdgeId && 
        typeof item.outgoingEdgeId === 'string' && 
        item.outgoingEdgeId.trim() !== '';
      
      const isActive = hasValidDisplayCondition && hasValidOutgoingEdgeId;
      
      if (!isActive) {
        console.warn(`[TypebotToWhatsApp] Item ${index + 1} ("${item.content}") foi filtrado:`, {
          hasValidDisplayCondition,
          hasValidOutgoingEdgeId,
          displayCondition: item.displayCondition,
          outgoingEdgeId: item.outgoingEdgeId,
        });
      }
      
      return isActive;
    }
  );

  console.log(`[TypebotToWhatsApp] ${activeItems.length} itens ativos de ${choiceInput.items.length} totais`);

  // Se não houver itens válidos, retorna null
  if (activeItems.length === 0) {
    console.warn('[TypebotToWhatsApp] Nenhum item válido encontrado para botões interativos');
    return null;
  }

  // Limita a 3 botões (limite do WhatsApp para interactive buttons)
  const buttons = activeItems.slice(0, 3).map((item, index) => {
    console.log(`[TypebotToWhatsApp] Adicionando botão ${index + 1}: "${item.content}" (id: ${item.outgoingEdgeId})`);
    return {
      id: item.outgoingEdgeId!,
      title: item.content.substring(0, 20),
    };
  });
  
  if (activeItems.length > 3) {
    console.warn(`[TypebotToWhatsApp] ⚠️ ${activeItems.length} itens disponíveis, mas apenas 3 serão enviados (limite do WhatsApp para botões)`);
  }

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: bodyText.substring(0, 1024),
      },
      action: {
        buttons: buttons.map((btn) => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title,
          },
        })),
      },
    },
  };
}

export async function transformTypebotResponseToWhatsApp(
  typebotResponse: TypebotResponse,
  to: string,
  conversationId?: number,
  inboxId?: number
): Promise<WhatsAppMessage[]> {
  const whatsappMessages: WhatsAppMessage[] = [];

  console.log(`[TypebotToWhatsApp] 🔍 Transformando resposta do Typebot:`, {
    messagesCount: typebotResponse.messages?.length || 0,
    hasInput: !!typebotResponse.input,
    inputType: typebotResponse.input?.type,
    choiceItemsCount: typebotResponse.input?.type === 'choice input' 
      ? (typebotResponse.input as TypebotChoiceInput).items.length 
      : 0,
  });

  if (typebotResponse.messages && typebotResponse.messages.length > 0) {
    // Separa mensagens de texto e imagem
    const textMessages = typebotResponse.messages.filter(
      (msg): msg is TypebotTextMessage => msg.type === 'text'
    );
    const imageMessages = typebotResponse.messages.filter(
      (msg): msg is TypebotImageMessage => msg.type === 'image'
    );

    console.log(`[TypebotToWhatsApp] 📋 Mensagens do Typebot:`, {
      total: typebotResponse.messages.length,
      text: textMessages.length,
      image: imageMessages.length,
      other: typebotResponse.messages.length - textMessages.length - imageMessages.length,
    });

    // Identifica mensagens de texto que estão imediatamente antes de uma imagem com clickLink
    // Essas mensagens NÃO devem ser enviadas separadamente, pois serão usadas apenas como bodyText da mensagem interativa
    const textMessagesToSkip = new Set<string>();
    
    imageMessages.forEach((imageMsg) => {
      if (imageMsg.content.clickLink?.url) {
        // Encontra a posição da imagem no array de mensagens
        const imageIndex = typebotResponse.messages.findIndex(m => m.id === imageMsg.id);
        
        // Se há uma mensagem de texto imediatamente antes desta imagem, marca para não enviar
        if (imageIndex > 0 && typebotResponse.messages[imageIndex - 1].type === 'text') {
          const textMsgBefore = typebotResponse.messages[imageIndex - 1] as TypebotTextMessage;
          textMessagesToSkip.add(textMsgBefore.id);
          
          console.log(`[TypebotToWhatsApp] ⏭️ Mensagem de texto antes de imagem com clickLink será usada apenas como bodyText:`, {
            textMessageId: textMsgBefore.id,
            imageMessageId: imageMsg.id,
            textPreview: extractTextFromRichText(textMsgBefore.content.richText).substring(0, 50),
          });
        }
      }
    });

    // Para interactive list, não envia mensagens de texto separadamente
    // pois elas serão usadas como header, body, footer e button text
    // Mas para interactive buttons, ainda envia as mensagens de texto
    const choiceInput = typebotResponse.input?.type === 'choice input' 
      ? (typebotResponse.input as TypebotChoiceInput)
      : null;
    const shouldSkipTextMessages = choiceInput && choiceInput.items.length > 3;

    // Filtra mensagens de texto que devem ser enviadas (exclui as que estão antes de imagens com clickLink)
    const textMessagesToSend = textMessages.filter(msg => !textMessagesToSkip.has(msg.id));

    if (!shouldSkipTextMessages && textMessagesToSend.length > 0) {
      const transformedTextMessages = transformTextMessages(textMessagesToSend, to);
      console.log(`[TypebotToWhatsApp] 📤 Adicionando ${transformedTextMessages.length} mensagem(ns) de texto:`, 
        transformedTextMessages.map(m => ({
          type: m.type,
          content: m.text.body.substring(0, 50),
        }))
      );
      
      // Armazena mensagens de texto recentes no Redis para uso posterior com imagens
      // TTL de 30 segundos (tempo suficiente para processar imagem na próxima resposta)
      // IMPORTANTE: Armazena TODAS as mensagens de texto (incluindo as que serão usadas como bodyText)
      if (conversationId && inboxId) {
        const recentTextsKey = `recent-texts:${inboxId}:${conversationId}`;
        const recentTexts = textMessages.map(msg => {
          const extractedText = extractTextFromRichText(msg.content.richText);
          return {
            id: msg.id,
            text: extractedText,
            timestamp: Date.now(),
          };
        });
        
        try {
          await redis.set(recentTextsKey, JSON.stringify(recentTexts), 30); // TTL de 30 segundos
          console.log(`[TypebotToWhatsApp] 💾 Armazenadas ${recentTexts.length} mensagem(ns) de texto recente(s) no Redis para conversa ${conversationId}`);
        } catch (error: any) {
          console.error('[TypebotToWhatsApp] ❌ Erro ao armazenar textos recentes no Redis:', error.message);
        }
      }
      
      whatsappMessages.push(...transformedTextMessages);
    } else if (textMessagesToSkip.size > 0) {
      console.log(`[TypebotToWhatsApp] ⏭️ ${textMessagesToSkip.size} mensagem(ns) de texto não serão enviadas (serão usadas apenas como bodyText de mensagens interativas)`);
    }

    // Transforma e adiciona mensagens de imagem
    // Passa todas as mensagens para que possa buscar texto anterior para usar como body
    if (imageMessages.length > 0) {
      const transformedImageMessages = await transformImageMessages(
        imageMessages, 
        to, 
        typebotResponse.messages,
        conversationId,
        inboxId
      );
      whatsappMessages.push(...transformedImageMessages);
    }
  }

  if (typebotResponse.input?.type === 'choice input') {
    const choiceInput = typebotResponse.input as TypebotChoiceInput;
    
    // Se tiver mais de 3 itens, usa interactive list
    if (choiceInput.items.length > 3) {
      const { listMessage, separateTextMessages } = transformChoiceInputToList(typebotResponse, to);
      
      // Envia mensagens separadas primeiro (mensagens de grupos/blocos anteriores)
      if (separateTextMessages.length > 0) {
        whatsappMessages.push(...separateTextMessages);
      }
      
      // Depois envia a lista interativa
      if (listMessage) {
        whatsappMessages.push(listMessage);
      }
    } else {
      // Se tiver 3 ou menos itens, usa interactive buttons
      const buttonsMessage = transformChoiceInputToButtons(typebotResponse, to);
      if (buttonsMessage) {
        whatsappMessages.push(buttonsMessage);
      }
    }
  }

  console.log(`[TypebotToWhatsApp] ✅ Total de mensagens WhatsApp geradas: ${whatsappMessages.length}`, {
    text: whatsappMessages.filter(m => m.type === 'text').length,
    image: whatsappMessages.filter(m => m.type === 'image').length,
    interactive: whatsappMessages.filter(m => m.type === 'interactive').length,
  });

  return whatsappMessages;
}

