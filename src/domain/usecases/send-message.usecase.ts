import { Message, MessageContent } from '../entities/message';
import { IWhatsAppService } from '../interfaces/whatsapp-service.interface';
import { ILogger } from '../interfaces/logger.interface';

// Caso de uso para enviar mensagens - segue o princípio S (Single Responsibility)
export class SendMessageUseCase {
  constructor(
    private whatsappService: IWhatsAppService,
    private logger: ILogger,
  ) {}

  async execute(to: string, content: MessageContent): Promise<Message> {
    try {
      this.logger.info(`Enviando mensagem para ${to}`);

      if (content.media) {
        return await this.whatsappService.sendMediaMessage(to, content.media, {
          caption: content.caption,
          type: content.mediaType,
        });
      } else if (content.text) {
        return await this.whatsappService.sendTextMessage(to, content.text);
      } else {
        throw new Error('Conteúdo da mensagem inválido: deve conter texto ou mídia');
      }
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem: ${(error as Error).message}`);
      throw error;
    }
  }
}
