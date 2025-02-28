import { FastifyRequest, FastifyReply } from 'fastify';
import { SendMessageUseCase } from '../../../domain/usecases/send-message.usecase';
import { ILogger } from '../../../domain/interfaces/logger.interface';
import { MessageContent } from '../../../domain/entities/message';
import { IWhatsAppService } from '../../../domain/interfaces/whatsapp-service.interface';

// Controller para lidar com webhooks externos - segue o princípio S (Single Responsibility)
export class WebhookController {
  constructor(
    private sendMessageUseCase: SendMessageUseCase,
    private logger: ILogger,
    private whatsAppService: IWhatsAppService,
  ) {}

  // Endpoint para enviar mensagens via webhook
  async sendMessage(
    request: FastifyRequest<{ Body: SendMessageRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { to, content } = request.body;

      // Validações básicas
      if (!to) {
        await reply.status(400).send({ error: 'Campo "to" é obrigatório' });
        return;
      }

      if (!content || (!content.text && !content.media)) {
        await reply.status(400).send({ error: 'A mensagem deve conter texto ou mídia' });
        return;
      }

      // Prepara o conteúdo da mensagem
      const messageContent: MessageContent = {
        text: content.text,
        caption: content.caption,
        mediaType: content.mediaType,
      };

      // Converte mídia de Base64 para Buffer, se presente
      if (content.media) {
        const base64Data = content.media.replace(/^data:.*?;base64,/, '');
        messageContent.media = Buffer.from(base64Data, 'base64');
      }

      // Executa o caso de uso para enviar a mensagem
      const sentMessage = await this.sendMessageUseCase.execute(to, messageContent);

      // Retorna a mensagem enviada
      await reply.status(201).send({
        success: true,
        message: sentMessage.toJSON(),
      });
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem via webhook: ${(error as Error).message}`);
      await reply.status(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  // Endpoint para verificar o status da API
  // Endpoint para verificar o status da API
  async healthCheck(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const uptime = process.uptime();
    await reply.send({
      status: 'online',
      uptime: Math.floor(uptime),
      timestamp: new Date().toISOString(),
    });
  }

  // Endpoint para verificar o status da autenticação
  async checkAuthStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const isAuthenticated = await this.whatsAppService.isAuthenticated();
      await reply.send({
        authenticated: isAuthenticated,
        connectedAt: isAuthenticated ? new Date().toISOString() : null,
      });
    } catch (error) {
      this.logger.error(`Erro ao verificar status de autenticação: ${(error as Error).message}`);
      await reply.status(500).send({
        success: false,
        error: 'Erro ao verificar status de autenticação',
      });
    }
  }
}
