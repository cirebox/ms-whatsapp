// Modelo de mensagem
export interface MessageContent {
  text?: string;
  media?: Buffer;
  mediaType?: string;
  caption?: string;
}

export class Message {
  constructor(
    public id: string,
    public from: string,
    public to: string,
    public content: MessageContent,
    public timestamp: Date,
    public isFromMe: boolean,
  ) {}

  // Factory method para criar uma mensagem a partir de dados do WhatsApp
  static fromWhatsApp(data: any): Message {
    // Extrai o ID (pode estar em formatos diferentes)
    const id = data.id._serialized || data.id;

    // Extrai dados do remetente/destinatário (podem estar em diferentes locais)
    const from = data.from || data._data?.from;
    const to = data.to || data._data?.to;

    // Extrai o conteúdo da mensagem
    const content = {
      text: data.body || data._data?.body,
      // Outros campos seriam preenchidos se fosse uma mensagem com mídia
    };

    // Extrai o timestamp e converte para Date
    const timestamp = new Date(data.timestamp ? data.timestamp * 1000 : Date.now());

    // Verifica se a mensagem foi enviada pelo usuário
    const isFromMe = data.fromMe || data._data?.fromMe || false;

    return new Message(id, from, to, content, timestamp, isFromMe);
  }

  // Factory method para criar uma mensagem a partir de dados da API
  static fromApi(data: any): Message {
    return new Message(
      data.id || '',
      data.from,
      data.to,
      {
        text: data.content?.text,
        media: data.content?.media,
        mediaType: data.content?.mediaType,
        caption: data.content?.caption,
      },
      data.timestamp ? new Date(data.timestamp) : new Date(),
      data.isFromMe || false,
    );
  }

  // Método para converter a mensagem para o formato esperado pelo cliente
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      from: this.from,
      to: this.to,
      content: this.content,
      timestamp: this.timestamp,
      isFromMe: this.isFromMe,
    };
  }
}
