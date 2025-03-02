import { PrismaService } from '../database/prisma.service';
import { ILogger } from '../../domain/interfaces/logger.interface';

export class WhatsAppDeviceRepository {
  constructor(
    private prismaService: PrismaService,
    private logger: ILogger,
  ) {}

  async findAll(): Promise<any[]> {
    try {
      return await this.prismaService.client.whatsAppDevice.findMany({
        orderBy: { updatedAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Erro ao buscar dispositivos: ${(error as Error).message}`);
      throw error;
    }
  }

  async findById(id: string): Promise<any | null> {
    try {
      return await this.prismaService.client.whatsAppDevice.findUnique({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Erro ao buscar dispositivo ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  async findBySessionId(sessionId: string): Promise<any | null> {
    try {
      return await this.prismaService.client.whatsAppDevice.findUnique({
        where: { sessionId },
      });
    } catch (error) {
      this.logger.error(
        `Erro ao buscar dispositivo com sessionId ${sessionId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async create(data: { name: string; sessionId: string; phoneNumber?: string }): Promise<any> {
    try {
      return await this.prismaService.client.whatsAppDevice.create({
        data,
      });
    } catch (error) {
      this.logger.error(`Erro ao criar dispositivo: ${(error as Error).message}`);
      throw error;
    }
  }

  async update(id: string, data: Partial<Omit<any, 'id' | 'createdAt'>>): Promise<any> {
    try {
      return await this.prismaService.client.whatsAppDevice.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.logger.error(`Erro ao atualizar dispositivo ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  async updateConnectionStatus(id: string, isActive: boolean): Promise<any> {
    try {
      return await this.prismaService.client.whatsAppDevice.update({
        where: { id },
        data: {
          isActive,
          lastConnected: isActive ? new Date() : undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar status de conexão do dispositivo ${id}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async delete(id: string): Promise<any> {
    try {
      return await this.prismaService.client.whatsAppDevice.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Erro ao excluir dispositivo ${id}: ${(error as Error).message}`);
      throw error;
    }
  }
}
