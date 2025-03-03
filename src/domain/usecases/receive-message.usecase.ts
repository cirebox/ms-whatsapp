import { Message } from '../entities/message';
import { IWhatsAppService } from '../interfaces/whatsapp-service.interface';
import { ILLMService } from '../interfaces/llm-service.interface';
import { ILogger } from '../interfaces/logger.interface';

// Caso de uso para receber e processar mensagens - segue o princípio S (Single Responsibility)
export class ReceiveMessageUseCase {
  constructor(
    private whatsappService: IWhatsAppService,
    private llmService: ILLMService,
    private logger: ILogger,
  ) {}

  async execute(message: Message, sessionId: string): Promise<void> {
    try {
      // Ignora mensagens enviadas pelo próprio bot
      if (message.isFromMe) {
        return;
      }

      this.logger.info(
        `Mensagem recebida de ${message.from} na sessão ${sessionId}: ${message.content.text}`,
      );

      // Processa o texto da mensagem com o LLM
      if (message.content.text) {
        const response = await this.llmService.processMessage(message.content.text, {
          from: message.from,
          timestamp: message.timestamp,
          sessionId: sessionId,
        });

        // Envia a resposta gerada pelo LLM
        await this.whatsappService.sendTextMessage(message.from, response, sessionId);
        this.logger.info(`Resposta enviada para ${message.from} usando sessão ${sessionId}`);
      }
    } catch (error) {
      this.logger.error(`Erro ao processar mensagem recebida: ${(error as Error).message}`);
    }
  }

  // Registra o handler de mensagem no serviço WhatsApp
  registerHandler(): void {
    this.whatsappService.onMessage(async (message: Message, sessionId: string) => {
      await this.execute(message, sessionId);
    });
  }
}
