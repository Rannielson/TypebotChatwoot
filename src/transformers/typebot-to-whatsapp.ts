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

export function transformImageMessages(
  messages: TypebotImageMessage[],
  to: string,
  allMessages?: TypebotMessage[] // Todas as mensagens para buscar texto anterior
): (WhatsAppImageMessage | WhatsAppInteractiveCTAImageMessage)[] {
  return messages
    .filter((msg): msg is TypebotImageMessage => msg.type === 'image')
    .map((msg) => {
      // Se tem clickLink, transforma em mensagem interativa com CTA
      if (msg.content.clickLink?.url) {
        // Usa o título do alt se disponível, senão usa "Abrir Link" como fallback
        const buttonTitle = msg.content.clickLink.alt || 'Abrir Link';
        
        // Busca texto de mensagens anteriores para usar como body
        let bodyText = ' '; // Texto padrão mínimo
        if (allMessages) {
          // Encontra a posição da imagem atual
          const imageIndex = allMessages.findIndex(m => m.id === msg.id);
          if (imageIndex > 0) {
            // Busca a última mensagem de texto antes desta imagem
            for (let i = imageIndex - 1; i >= 0; i--) {
              if (allMessages[i].type === 'text') {
                const textMsg = allMessages[i] as TypebotTextMessage;
                const extractedText = extractTextFromRichText(textMsg.content.richText);
                if (extractedText.trim()) {
                  bodyText = extractedText;
                  break;
                }
              }
            }
          }
        }
        
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
                link: msg.content.url,
              },
            },
            body: {
              text: bodyText.substring(0, 1024), // Limita a 1024 caracteres (limite do WhatsApp)
            },
            action: {
              name: 'cta_url',
              parameters: {
                display_text: buttonTitle.substring(0, 20), // Limita a 20 caracteres (limite do WhatsApp)
                url: msg.content.clickLink.url,
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
    });
}

/**
 * Extrai header, body, footer e button text das mensagens de texto
 * Ordem esperada: header, body, footer, button text
 */
function extractInteractiveListComponents(
  textMessages: TypebotTextMessage[]
): {
  header?: string;
  body: string;
  footer?: string;
  buttonText: string;
} {
  const header = textMessages.length >= 1 
    ? extractTextFromRichText(textMessages[0].content.richText).trim() 
    : undefined;
  const body = textMessages.length >= 2
    ? extractTextFromRichText(textMessages[1].content.richText).trim()
    : textMessages.length >= 1
    ? extractTextFromRichText(textMessages[0].content.richText).trim()
    : 'Escolha uma opção:';
  const footer = textMessages.length >= 3
    ? extractTextFromRichText(textMessages[2].content.richText).trim()
    : undefined;
  const buttonText = textMessages.length >= 4
    ? extractTextFromRichText(textMessages[3].content.richText).trim()
    : 'Ver opções';

  return {
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
): WhatsAppInteractiveListMessage | null {
  if (!typebotResponse.input || typebotResponse.input.type !== 'choice input') {
    return null;
  }

  const choiceInput = typebotResponse.input as TypebotChoiceInput;

  // Só usa list se tiver mais de 3 itens
  if (choiceInput.items.length <= 3) {
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

  // Extrai header, body, footer e button text das mensagens
  const textMessages = typebotResponse.messages?.filter(
    (msg): msg is TypebotTextMessage => msg.type === 'text'
  ) || [];
  
  const { header, body, footer, buttonText } = extractInteractiveListComponents(textMessages);

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

  // Se não houver itens válidos, retorna null
  if (activeItems.length === 0) {
    console.warn('[TypebotToWhatsApp] Nenhum item válido encontrado para lista interativa');
    return null;
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
    return null;
  }

  return {
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
    ? 'escolha uma opção' // Texto padrão quando já há mensagens de texto antes
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

export function transformTypebotResponseToWhatsApp(
  typebotResponse: TypebotResponse,
  to: string
): WhatsAppMessage[] {
  const whatsappMessages: WhatsAppMessage[] = [];

  if (typebotResponse.messages && typebotResponse.messages.length > 0) {
    // Separa mensagens de texto e imagem
    const textMessages = typebotResponse.messages.filter(
      (msg): msg is TypebotTextMessage => msg.type === 'text'
    );
    const imageMessages = typebotResponse.messages.filter(
      (msg): msg is TypebotImageMessage => msg.type === 'image'
    );

    // Para interactive list, não envia mensagens de texto separadamente
  // pois elas serão usadas como header, body, footer e button text
  // Mas para interactive buttons, ainda envia as mensagens de texto
  const choiceInput = typebotResponse.input?.type === 'choice input' 
    ? (typebotResponse.input as TypebotChoiceInput)
    : null;
  const shouldSkipTextMessages = choiceInput && choiceInput.items.length > 3;

  if (!shouldSkipTextMessages && textMessages.length > 0) {
    const transformedTextMessages = transformTextMessages(textMessages, to);
    whatsappMessages.push(...transformedTextMessages);
  }

    // Transforma e adiciona mensagens de imagem
    // Passa todas as mensagens para que possa buscar texto anterior para usar como body
    if (imageMessages.length > 0) {
      const transformedImageMessages = transformImageMessages(
        imageMessages, 
        to, 
        typebotResponse.messages
      );
      whatsappMessages.push(...transformedImageMessages);
    }
  }

  if (typebotResponse.input?.type === 'choice input') {
    const choiceInput = typebotResponse.input as TypebotChoiceInput;
    
    // Se tiver mais de 3 itens, usa interactive list
    if (choiceInput.items.length > 3) {
      const listMessage = transformChoiceInputToList(typebotResponse, to);
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

  return whatsappMessages;
}

