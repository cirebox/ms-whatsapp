// Entidade de Mensagem - segue o princípio S (Single Responsibility)
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
    return new Message(
      data.id._serialized || data.id,
      data.from || data._data.from,
      data.to || data._data.to,
      {
        text: data.body || data._data.body,
        // Os outros campos seriam preenchidos se fosse uma mensagem com mídia
      },
      new Date(data.timestamp * 1000 || Date.now()),
      data.fromMe || data._data.fromMe || false,
    );
  }

  // Factory method para criar uma mensagem a partir de dados da API
  static fromApi(data: any): Message {
    return new Message(
      data.id || '',
      data.from,
      data.to,
      {
        text: data.content.text,
        media: data.content.media,
        mediaType: data.content.mediaType,
        caption: data.content.caption,
      },
      new Date(data.timestamp || Date.now()),
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
