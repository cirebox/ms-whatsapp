import { Message, MessageContent } from '../entities/message';
import { IWhatsAppService } from '../interfaces/whatsapp-service.interface';
import { ILogger } from '../interfaces/logger.interface';
import { WhatsAppDeviceRepository } from '../../infrastructure/repositories/whatsapp-device.repository';

// Caso de uso para enviar mensagens - segue o princípio S (Single Responsibility)
export class SendMessageUseCase {
  constructor(
    private whatsappService: IWhatsAppService,
    private logger: ILogger,
    private deviceRepository: WhatsAppDeviceRepository,
  ) {}

  async execute(to: string, content: MessageContent, deviceId?: string): Promise<Message> {
    try {
      // Se o deviceId foi fornecido, busca o dispositivo para obter o sessionId
      let sessionId: string | undefined;

      if (deviceId) {
        const device = await this.deviceRepository.findById(deviceId);
        if (!device) {
          throw new Error(`Dispositivo ${deviceId} não encontrado`);
        }

        if (!device.isActive) {
          throw new Error(`Dispositivo ${deviceId} (${device.name}) não está ativo`);
        }

        sessionId = device.sessionId;
        this.logger.info(
          `Enviando mensagem para ${to} usando dispositivo ${device.name} (${deviceId})`,
        );
      } else {
        // Se não foi especificado um dispositivo, pega o primeiro ativo
        const devices = await this.deviceRepository.findAll();
        const activeDevice = devices.find(d => d.isActive);

        if (!activeDevice) {
          throw new Error('Nenhum dispositivo ativo encontrado para enviar a mensagem');
        }

        sessionId = activeDevice.sessionId;
        this.logger.info(
          `Enviando mensagem para ${to} usando dispositivo padrão ${activeDevice.name} (${activeDevice.id})`,
        );
      }

      if (content.media) {
        return await this.whatsappService.sendMediaMessage(
          to,
          content.media,
          {
            caption: content.caption,
            type: content.mediaType,
          },
          sessionId,
        );
      } else if (content.text) {
        return await this.whatsappService.sendTextMessage(to, content.text, sessionId);
      } else {
        throw new Error('Conteúdo da mensagem inválido: deve conter texto ou mídia');
      }
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem: ${(error as Error).message}`);
      throw error;
    }
  }
}
