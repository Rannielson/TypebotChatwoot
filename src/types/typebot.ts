export interface TypebotStartChatRequest {
  resultId?: string;
  // Aceita message como string simples ou objeto completo (para anexos)
  message?: string | {
    type: 'text';
    text: string;
    metadata?: {
      replyId?: string;
    };
    attachedFileUrls?: string[];
  };
  isStreamEnabled?: boolean;
  isOnlyRegistering?: boolean;
  prefilledVariables?: Record<string, string>;
  textBubbleContentFormat?: 'richText' | 'markdown';
}

export interface RichTextNode {
  id: string;
  type: string;
  children: Array<{
    text?: string;
    type?: string;
    [key: string]: any;
  }>;
}

export interface TypebotTextMessage {
  id: string;
  type: 'text';
  content: {
    type: 'richText';
    richText: RichTextNode[];
  };
}

export interface TypebotImageMessage {
  id: string;
  type: 'image';
  content: {
    url: string;
    clickLink?: {
      url: string;
      alt?: string;
    };
  };
}

export type TypebotMessage = TypebotTextMessage | TypebotImageMessage;

export interface TypebotChoiceInput {
  id: string;
  type: 'choice input';
  items: Array<{
    id: string;
    outgoingEdgeId: string | null | undefined;
    content: string;
    displayCondition?: {
      isEnabled: boolean;
    };
  }>;
}

export interface TypebotTextInput {
  id: string;
  type: 'text input';
  options: {
    labels: {
      placeholder: string;
      button: string;
    };
    variableId?: string;
    audioClip?: {
      isEnabled: boolean;
    };
  };
  prefilledValue?: string;
}

export interface TypebotWaitAction {
  type: 'wait';
  wait: {
    event?: string;
    timeout?: number; // em milissegundos
    secondsToWaitFor?: number; // em segundos (formato mais comum)
  };
  lastBubbleBlockId?: string; // ID do último bloco de mensagem antes do wait
}

export interface TypebotClientSideAction {
  type: string;
  wait?: {
    event?: string;
    timeout?: number; // em milissegundos
    secondsToWaitFor?: number; // em segundos (formato mais comum)
  };
  lastBubbleBlockId?: string; // ID do último bloco de mensagem antes do wait
  [key: string]: any;
}

export interface TypebotResponse {
  sessionId: string;
  resultId?: string;
  typebot?: {
    id: string;
    version: string;
    theme?: any;
    settings?: any;
    publishedAt?: string;
  };
  messages: TypebotMessage[];
  input?: TypebotChoiceInput | TypebotTextInput;
  clientSideActions?: TypebotClientSideAction[];
  logs?: Array<{
    description: string;
    status?: string;
    details?: string;
    context?: string;
  }>;
  dynamicTheme?: {
    hostAvatarUrl?: string;
    guestAvatarUrl?: string;
    backgroundUrl?: string;
  };
  progress?: number;
  lastMessageNewFormat?: string;
}

