import fastify from 'fastify';
import fastifyView from '@fastify/view';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import ejs from 'ejs';

import logger from './config/logger';
import { swaggerOptions, swaggerUiOptions } from './config/swagger';

import { PrismaService } from './infrastructure/database/prisma.service';
import { WhatsAppDeviceRepository } from './infrastructure/repositories/whatsapp-device.repository';
import { MultiWhatsAppAdapter } from './infrastructure/adapters/multi-whatsapp.adapter';
import { HttpLLMAdapter } from './infrastructure/adapters/http-llm.adapter';

import { SendMessageUseCase } from './domain/usecases/send-message.usecase';
import { ReceiveMessageUseCase } from './domain/usecases/receive-message.usecase';
import { DeviceManagementUseCase } from './domain/usecases/device-management.usecase';

import { QRCodeController } from './infrastructure/http/controllers/qrcode.controller';
import { WebhookController } from './infrastructure/http/controllers/webhook.controller';
import { DeviceController } from './infrastructure/http/controllers/device.controller';

import { registerQRCodeRoutes } from './infrastructure/http/routes/qrcode.routes';
import { registerWebhookRoutes } from './infrastructure/http/routes/webhook.routes';
import { registerDeviceRoutes } from './infrastructure/http/routes/device.routes';

// Função para criar e configurar o servidor - segue o princípio O (Open/Closed)
export async function createServer(): Promise<any> {
  // Instancia o servidor Fastify
  const server = fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  try {
    // Configura CORS
    await server.register(fastifyCors, {
      origin: true,
      credentials: true,
    });

    // Garante que o diretório public existe
    const publicDir = join(__dirname, 'public');
    if (!existsSync(publicDir)) {
      logger.info(`Criando diretório public: ${publicDir}`);
      mkdirSync(publicDir, { recursive: true });
    }

    // Configura suporte a arquivos estáticos
    await server.register(fastifyStatic, {
      root: join(__dirname, 'public'),
      prefix: '/public/',
    });

    // Configura suporte a templates EJS
    await server.register(fastifyView, {
      engine: {
        ejs: ejs,
      },
      root: join(__dirname, 'infrastructure', 'views'),
      viewExt: 'ejs',
    });

    // Configura o Swagger para documentação
    await server.register(import('@fastify/swagger'), swaggerOptions);
    await server.register(import('@fastify/swagger-ui'), swaggerUiOptions);

    // Inicializa o serviço Prisma
    const prismaService = new PrismaService(logger);
    await prismaService.onModuleInit();

    // Instancia o repositório de dispositivos
    const deviceRepository = new WhatsAppDeviceRepository(prismaService, logger);

    // Instancia os adaptadores
    const whatsAppAdapter = new MultiWhatsAppAdapter(logger, deviceRepository);
    const llmAdapter = new HttpLLMAdapter(logger);

    // Instancia os casos de uso
    const sendMessageUseCase = new SendMessageUseCase(whatsAppAdapter, logger, deviceRepository);
    const receiveMessageUseCase = new ReceiveMessageUseCase(whatsAppAdapter, llmAdapter, logger);
    const deviceManagementUseCase = new DeviceManagementUseCase(
      whatsAppAdapter,
      deviceRepository,
      logger,
    );

    // Registra o handler de mensagens recebidas
    receiveMessageUseCase.registerHandler();

    // Instancia os controllers
    const qrCodeController = new QRCodeController(whatsAppAdapter, logger);
    const webhookController = new WebhookController(
      sendMessageUseCase,
      logger,
      whatsAppAdapter,
      deviceRepository,
    );
    const deviceController = new DeviceController(deviceManagementUseCase, logger);

    // Registra as rotas
    registerQRCodeRoutes(server, qrCodeController);
    registerWebhookRoutes(server, webhookController);
    registerDeviceRoutes(server, deviceController);

    // Rota da home page
    server.get('/', (request, reply) => {
      return reply.view('home', {
        title: 'WhatsApp API - Documentação',
      });
    });

    // Rota alternativa para documentação (redirecionamento)
    server.get('/docs', (request, reply) => {
      return reply.redirect('/documentation');
    });

    // Handler para rotas não encontradas
    server.setNotFoundHandler((request, reply) => {
      logger.warn(`Rota não encontrada: ${request.method} ${request.url}`);

      // Verifica se é uma tentativa de acesso pelo WhatsApp
      if (request.url.includes('@') || request.url.length > 50) {
        logger.info(
          'URL parece ser um formato específico do WhatsApp, redirecionando para /devices',
        );
        return reply.redirect('/devices');
      }

      reply.status(404).send({
        error: 'Rota não encontrada',
        message: `O endpoint ${request.method} ${request.url} não existe`,
        statusCode: 404,
      });
    });

    // Handler de erros
    server.setErrorHandler((error, request, reply) => {
      logger.error(`Erro não capturado: ${error.message}`);
      logger.error(error.stack);

      reply.status(500).send({
        error: 'Erro interno do servidor',
        message: error.message,
        statusCode: 500,
      });
    });

    logger.info('Servidor configurado com sucesso');
    return {
      server,
      adapters: {
        whatsApp: whatsAppAdapter,
        llm: llmAdapter,
      },
      repositories: {
        deviceRepository,
      },
      services: {
        prismaService,
      },
    };
  } catch (error) {
    logger.error(`Erro ao configurar o servidor: ${(error as Error).message}`);
    throw error;
  }
}
