// Esquemas para documentação do Swagger

export const messageContentSchema = {
  type: 'object',
  properties: {
    text: { type: 'string', description: 'Conteúdo textual da mensagem' },
    media: { type: 'string', description: 'Arquivo de mídia em formato Base64' },
    mediaType: { type: 'string', description: 'Tipo MIME do arquivo de mídia' },
    caption: { type: 'string', description: 'Legenda para o arquivo de mídia' },
  },
};

export const sendMessageRequestSchema = {
  type: 'object',
  required: ['to', 'content'],
  properties: {
    to: { type: 'string', description: 'Número de telefone do destinatário' },
    content: messageContentSchema,
  },
};

export const messageResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'ID único da mensagem' },
    from: { type: 'string', description: 'Número de telefone do remetente' },
    to: { type: 'string', description: 'Número de telefone do destinatário' },
    content: messageContentSchema,
    timestamp: { type: 'string', format: 'date-time', description: 'Data e hora de envio' },
    isFromMe: { type: 'boolean', description: 'Indica se a mensagem foi enviada pelo usuário' },
  },
};

export const sendMessageResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', description: 'Indica se a operação foi bem-sucedida' },
    message: messageResponseSchema,
  },
};

export const errorResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', description: 'Indica que a operação falhou' },
    error: { type: 'string', description: 'Mensagem de erro descritiva' },
  },
};

export const healthCheckResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', description: 'Estado atual da API' },
    uptime: { type: 'number', description: 'Tempo de atividade em segundos' },
    timestamp: { type: 'string', format: 'date-time', description: 'Data e hora da verificação' },
  },
};

export const authStatusResponseSchema = {
  type: 'object',
  properties: {
    authenticated: { type: 'boolean', description: 'Estado da autenticação com o WhatsApp' },
    connectedAt: { type: 'string', format: 'date-time', description: 'Data da autenticação' },
  },
};
