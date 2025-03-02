import { FastifyRequest, FastifyReply } from 'fastify';
import { DeviceManagementUseCase } from '../../../domain/usecases/device-management.usecase';
import { ILogger } from '../../../domain/interfaces/logger.interface';

interface CreateDeviceRequest {
  name: string;
}

interface UpdateDeviceRequest {
  name: string;
}

export class DeviceController {
  constructor(
    private deviceManagementUseCase: DeviceManagementUseCase,
    private logger: ILogger,
  ) {}

  async getAllDevices(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const devices = await this.deviceManagementUseCase.getAllDevices();
      await reply.send({
        success: true,
        data: devices,
        count: devices.length,
      });
    } catch (error) {
      this.logger.error(`Erro ao buscar todos os dispositivos: ${(error as Error).message}`);
      await reply.status(500).send({
        success: false,
        error: 'Erro ao buscar dispositivos',
        message: (error as Error).message,
      });
    }
  }

  async getDeviceById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params;
      const status = await this.deviceManagementUseCase.getDeviceStatus(id);

      if (!status.device) {
        await reply.status(404).send({
          success: false,
          error: 'Dispositivo não encontrado',
        });
        return;
      }

      await reply.send({
        success: true,
        data: {
          ...status.device,
          isConnected: status.isConnected,
          qrCode: status.qrCode,
          isDefault: status.isDefault || false,
        },
      });
    } catch (error) {
      this.logger.error(`Erro ao buscar dispositivo: ${(error as Error).message}`);
      await reply.status(500).send({
        success: false,
        error: 'Erro ao buscar dispositivo',
        message: (error as Error).message,
      });
    }
  }

  async createDevice(
    request: FastifyRequest<{ Body: CreateDeviceRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { name } = request.body;

      if (!name) {
        await reply.status(400).send({
          success: false,
          error: 'Nome do dispositivo é obrigatório',
        });
        return;
      }

      const device = await this.deviceManagementUseCase.createDevice(name);

      await reply.status(201).send({
        success: true,
        data: device,
      });
    } catch (error) {
      this.logger.error(`Erro ao criar dispositivo: ${(error as Error).message}`);
      await reply.status(500).send({
        success: false,
        error: 'Erro ao criar dispositivo',
        message: (error as Error).message,
      });
    }
  }

  async updateDevice(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateDeviceRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params;
      const { name } = request.body;

      if (!name) {
        await reply.status(400).send({
          success: false,
          error: 'Nome do dispositivo é obrigatório',
        });
        return;
      }

      const device = await this.deviceManagementUseCase.updateDevice(id, { name });

      await reply.send({
        success: true,
        data: device,
      });
    } catch (error) {
      this.logger.error(`Erro ao atualizar dispositivo: ${(error as Error).message}`);
      await reply.status(500).send({
        success: false,
        error: 'Erro ao atualizar dispositivo',
        message: (error as Error).message,
      });
    }
  }

  async deleteDevice(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params;
      await this.deviceManagementUseCase.removeDevice(id);

      await reply.send({
        success: true,
        message: 'Dispositivo removido com sucesso',
      });
    } catch (error) {
      this.logger.error(`Erro ao remover dispositivo: ${(error as Error).message}`);
      await reply.status(500).send({
        success: false,
        error: 'Erro ao remover dispositivo',
        message: (error as Error).message,
      });
    }
  }

  async reconnectDevice(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params;
      const device = await this.deviceManagementUseCase.reconnectDevice(id);

      await reply.send({
        success: true,
        data: device,
        message: 'Solicitação de reconexão enviada com sucesso',
      });
    } catch (error) {
      this.logger.error(`Erro ao reconectar dispositivo: ${(error as Error).message}`);
      await reply.status(500).send({
        success: false,
        error: 'Erro ao reconectar dispositivo',
        message: (error as Error).message,
      });
    }
  }

  // Obtém o status de todos os dispositivos
  async getDevicesStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const devices = await this.deviceManagementUseCase.getAllDevices();

      const devicesWithStatus = await Promise.all(
        devices.map(async device => {
          const status = await this.deviceManagementUseCase.getDeviceStatus(device.id);
          return {
            id: device.id,
            name: device.name,
            phoneNumber: device.phoneNumber,
            isActive: device.isActive,
            isConnected: status.isConnected,
            lastConnected: device.lastConnected,
          };
        }),
      );

      await reply.send({
        success: true,
        devices: devicesWithStatus,
        count: devicesWithStatus.length,
      });
    } catch (error) {
      this.logger.error(`Erro ao obter status dos dispositivos: ${(error as Error).message}`);
      await reply.status(500).send({
        success: false,
        error: 'Erro ao obter status dos dispositivos',
        message: (error as Error).message,
      });
    }
  }

  // Para implementação futura: exportação de logs de um dispositivo
  async getDeviceLogs(
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { start?: string; end?: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params;
      const { start, end } = request.query;

      // Obtenha o dispositivo para verificar se existe
      const device = await this.deviceManagementUseCase.getDeviceById(id);

      if (!device) {
        await reply.status(404).send({
          success: false,
          error: 'Dispositivo não encontrado',
        });
        return;
      }

      // Por enquanto, retorne logs fictícios
      // Para implementação real, você precisaria de um sistema de logs por dispositivo
      const mockLogs = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Log simulado para dispositivo ${device.name}`,
          details: { sessionId: device.sessionId },
        },
      ];

      await reply.send({
        success: true,
        data: mockLogs,
      });
    } catch (error) {
      this.logger.error(`Erro ao obter logs do dispositivo: ${(error as Error).message}`);
      await reply.status(500).send({
        success: false,
        error: 'Erro ao obter logs do dispositivo',
        message: (error as Error).message,
      });
    }
  }

  // Renderiza a página HTML com a lista de dispositivos
  async renderDevicesPage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const devices = await this.deviceManagementUseCase.getAllDevices();

      // Obtém o status de cada dispositivo
      const devicesWithStatus = await Promise.all(
        devices.map(async device => {
          const status = await this.deviceManagementUseCase.getDeviceStatus(device.id);
          return {
            ...device,
            isConnected: status.isConnected,
          };
        }),
      );

      await reply.view('devices', {
        title: 'Gerenciador de Dispositivos WhatsApp',
        devices: devicesWithStatus,
      });
    } catch (error) {
      this.logger.error(`Erro ao renderizar página de dispositivos: ${(error as Error).message}`);
      await reply.status(500).send({
        error: 'Erro ao carregar dispositivos',
        message: (error as Error).message,
      });
    }
  }

  // Renderiza a página de QR Code para um dispositivo específico
  async renderDeviceQRCodePage(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params;
      const status = await this.deviceManagementUseCase.getDeviceStatus(id);

      if (!status.device) {
        await reply.redirect('/devices?error=Dispositivo não encontrado');
        return;
      }

      await reply.view('device-qrcode', {
        title: `QR Code - ${status.device.name}`,
        device: status.device,
        qrCode: status.qrCode || '',
        isAuthenticated: status.isConnected,
        isDefault: status.isDefault || false,
      });
    } catch (error) {
      this.logger.error(`Erro ao renderizar página de QR Code: ${(error as Error).message}`);
      await reply.status(500).send({
        error: 'Erro ao gerar QR Code',
        message: (error as Error).message,
      });
    }
  }

  // Define dispositivo como padrão para envio de mensagens
  async setDefaultDevice(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { id } = request.params;
      const result = await this.deviceManagementUseCase.setDefaultDevice(id);

      await reply.send({
        success: result,
        message: result
          ? 'Dispositivo definido como padrão com sucesso'
          : 'Não foi possível definir o dispositivo como padrão',
      });
    } catch (error) {
      this.logger.error(`Erro ao definir dispositivo padrão: ${(error as Error).message}`);
      await reply.status(500).send({
        success: false,
        error: 'Erro ao definir dispositivo padrão',
        message: (error as Error).message,
      });
    }
  }
}
