import { FastifyRequest, FastifyReply } from 'fastify';
import { SendMessageUseCase } from '../../../domain/usecases/send-message.usecase';
import { ILogger } from '../../../domain/interfaces/logger.interface';
import { MessageContent } from '../../../domain/entities/message';
import { IWhatsAppService } from '../../../domain/interfaces/whatsapp-service.interface';
import { WhatsAppDeviceRepository } from '../../repositories/whatsapp-device.repository';

interface SendMessageRequest {
  to: string;
  content: {
    text?: string;
    media?: string; // Base64
    mediaType?: string;
    caption?: string;
  };
  deviceId?: string; // ID do dispositivo a ser usado (opcional)
}

// Controller para lidar com webhooks externos - segue o princípio S (Single Responsibility)
export class WebhookController {
  constructor(
    private sendMessageUseCase: SendMessageUseCase,
    private logger: ILogger,
    private whatsAppService: IWhatsAppService,
    private deviceRepository: WhatsAppDeviceRepository,
  ) {}

  // Endpoint para enviar mensagens via webhook
  async sendMessage(
    request: FastifyRequest<{ Body: SendMessageRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { to, content, deviceId } = request.body;

      // Validações básicas
      if (!to) {
        await reply.status(400).send({
          success: false,
          error: 'Campo "to" é obrigatório',
        });
        return;
      }

      if (!content || (!content.text && !content.media)) {
        await reply.status(400).send({
          success: false,
          error: 'A mensagem deve conter texto ou mídia',
        });
        return;
      }

      // Se um deviceId foi especificado, verifica se o dispositivo existe
      if (deviceId) {
        const device = await this.deviceRepository.findById(deviceId);
        if (!device) {
          await reply.status(404).send({
            success: false,
            error: `Dispositivo com ID ${deviceId} não encontrado`,
          });
          return;
        }

        if (!device.isActive) {
          await reply.status(400).send({
            success: false,
            error: `Dispositivo ${device.name} (${deviceId}) não está ativo`,
          });
          return;
        }
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
      const sentMessage = await this.sendMessageUseCase.execute(to, messageContent, deviceId);

      // Retorna a mensagem enviada
      await reply.status(201).send({
        success: true,
        message: sentMessage.toJSON(),
        deviceId: deviceId || 'default',
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
  async healthCheck(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const uptime = process.uptime();

    // Obter lista de dispositivos ativos
    const devices = await this.deviceRepository.findAll();
    const activeDevices = devices.filter(device => device.isActive);

    await reply.send({
      status: 'online',
      uptime: Math.floor(uptime),
      timestamp: new Date().toISOString(),
      activeDevices: activeDevices.length,
      totalDevices: devices.length,
    });
  }

  // Endpoint para verificar o status de autenticação de todos os dispositivos
  async checkAllDevicesStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const devices = await this.deviceRepository.findAll();

      const statuses = await Promise.all(
        devices.map(async device => {
          const isConnected = await this.whatsAppService.isAuthenticated(device.sessionId);
          return {
            id: device.id,
            name: device.name,
            phoneNumber: device.phoneNumber,
            isActive: device.isActive,
            lastConnected: device.lastConnected,
            isConnected,
          };
        }),
      );

      await reply.send({
        success: true,
        devices: statuses,
        count: statuses.length,
      });
    } catch (error) {
      this.logger.error(`Erro ao verificar status dos dispositivos: ${(error as Error).message}`);
      await reply.status(500).send({
        success: false,
        error: 'Erro ao verificar status dos dispositivos',
      });
    }
  }
}
