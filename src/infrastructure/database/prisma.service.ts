import { PrismaClient } from '@prisma/client';
import { ILogger } from '../../domain/interfaces/logger.interface';

export class PrismaService {
  private prisma: PrismaClient;

  constructor(private logger: ILogger) {
    this.prisma = new PrismaClient();
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.logger.info('Conectado ao banco de dados com sucesso');
    } catch (error) {
      this.logger.error(`Erro ao conectar ao banco de dados: ${(error as Error).message}`);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  get client(): PrismaClient {
    return this.prisma;
  }
}
