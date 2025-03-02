import { IWhatsAppService } from '../interfaces/whatsapp-service.interface';
import { ILogger } from '../interfaces/logger.interface';
import { WhatsAppDeviceRepository } from '../../infrastructure/repositories/whatsapp-device.repository';

export class DeviceManagementUseCase {
  constructor(
    private whatsappService: IWhatsAppService,
    private deviceRepository: WhatsAppDeviceRepository,
    private logger: ILogger,
  ) {}

  async getAllDevices(): Promise<any[]> {
    try {
      return await this.deviceRepository.findAll();
    } catch (error) {
      this.logger.error(`Erro ao buscar todos os dispositivos: ${(error as Error).message}`);
      throw error;
    }
  }

  async getDeviceById(id: string): Promise<any | null> {
    try {
      return await this.deviceRepository.findById(id);
    } catch (error) {
      this.logger.error(`Erro ao buscar dispositivo ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  async createDevice(name: string, sessionId?: string): Promise<any> {
    try {
      // Se não foi fornecido um sessionId, cria uma nova sessão
      if (!sessionId) {
        // A sessão será criada pelo adaptador e retornada para nós
        await this.whatsappService.initialize();
        const sessions = await this.whatsappService.getActiveSessions();
        sessionId = sessions[sessions.length - 1]; // Pega a última sessão (mais recente)
      }

      // Cria o dispositivo no banco de dados
      return await this.deviceRepository.create({
        name,
        sessionId,
      });
    } catch (error) {
      this.logger.error(`Erro ao criar dispositivo: ${(error as Error).message}`);
      throw error;
    }
  }

  async updateDevice(id: string, data: { name: string }): Promise<any> {
    try {
      return await this.deviceRepository.update(id, data);
    } catch (error) {
      this.logger.error(`Erro ao atualizar dispositivo ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  async removeDevice(id: string): Promise<boolean> {
    try {
      const device = await this.deviceRepository.findById(id);

      if (!device) {
        throw new Error(`Dispositivo ${id} não encontrado`);
      }

      // Fecha a sessão WhatsApp
      await this.whatsappService.closeSession(device.sessionId);

      // Remove do banco de dados
      await this.deviceRepository.delete(id);

      return true;
    } catch (error) {
      this.logger.error(`Erro ao remover dispositivo ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  async reconnectDevice(id: string): Promise<any> {
    try {
      const device = await this.deviceRepository.findById(id);

      if (!device) {
        throw new Error(`Dispositivo ${id} não encontrado`);
      }

      // Fecha sessão existente primeiro (para garantir uma reconexão limpa)
      try {
        await this.whatsappService.closeSession(device.sessionId);
        this.logger.info(`Sessão anterior ${device.sessionId} fechada para reconexão`);
      } catch (closeError) {
        // Ignora erro ao fechar - pode não existir uma sessão ativa
        this.logger.warn(
          `Erro ao fechar sessão existente: ${(closeError as Error).message} - continuando com nova inicialização`,
        );
      }

      // Espera um pequeno intervalo para garantir que recursos foram liberados
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reinicia a sessão
      await this.whatsappService.initialize(device.sessionId);
      this.logger.info(`Sessão ${device.sessionId} inicializada para reconexão`);

      // Atualiza o status no banco de dados - marcamos como tentativa de reconexão
      // O status real será atualizado pelos eventos do adaptador
      return await this.deviceRepository.update(id, {
        isActive: true, // Marca como ativo para indicar tentativa de conexão
        lastConnected: new Date(), // Atualiza timestamp para mostrar tentativa de reconexão
      });
    } catch (error) {
      this.logger.error(`Erro ao reconectar dispositivo ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  async getDeviceStatus(id: string): Promise<{
    device: any | null;
    isConnected: boolean;
    qrCode?: string;
    isDefault?: boolean;
  }> {
    try {
      const device = await this.deviceRepository.findById(id);

      if (!device) {
        return {
          device: null,
          isConnected: false,
        };
      }

      // Verifica se está conectado
      const isConnected = await this.whatsappService.isAuthenticated(device.sessionId);

      // Tenta obter QR Code se não estiver conectado
      let qrCode: string | undefined;
      if (!isConnected) {
        qrCode = await this.whatsappService.getQRCode(device.sessionId);
      }

      // Verifica se é o dispositivo padrão para envios
      let isDefault = false;
      try {
        const defaultSession = await this.whatsappService.getDefaultSession();
        isDefault = defaultSession === device.sessionId;
      } catch (error) {
        // Ignora erro ao verificar dispositivo padrão
        this.logger.debug(`Erro ao verificar dispositivo padrão: ${(error as Error).message}`);
      }

      // Atualiza status do dispositivo no banco de dados se necessário
      if (device.isActive !== isConnected) {
        await this.deviceRepository.updateConnectionStatus(id, isConnected);
      }

      return {
        device,
        isConnected,
        qrCode,
        isDefault,
      };
    } catch (error) {
      this.logger.error(`Erro ao obter status do dispositivo ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  // Define o dispositivo padrão para envio de mensagens
  async setDefaultDevice(id: string): Promise<boolean> {
    try {
      const device = await this.deviceRepository.findById(id);

      if (!device) {
        throw new Error(`Dispositivo ${id} não encontrado`);
      }

      // Verifica se o dispositivo está autenticado
      const isAuthenticated = await this.whatsappService.isAuthenticated(device.sessionId);
      if (!isAuthenticated) {
        throw new Error(`Dispositivo ${device.name} não está conectado ao WhatsApp`);
      }

      // Define esta sessão como padrão
      return await this.whatsappService.setDefaultSession(device.sessionId);
    } catch (error) {
      this.logger.error(`Erro ao definir dispositivo padrão ${id}: ${(error as Error).message}`);
      throw error;
    }
  }
}
