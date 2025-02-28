import { FastifyInstance, FastifyRequest } from 'fastify';
import { WebhookController } from '../controllers/webhook.controller';
import {
  sendMessageRequestSchema,
  sendMessageResponseSchema,
  errorResponseSchema,
  healthCheckResponseSchema,
} from '../../../config/swagger-schemas';

// Rotas relacionadas ao webhook
export const registerWebhookRoutes = (
  server: FastifyInstance,
  controller: WebhookController,
): void => {
  // Rota para verificar status da API
  server.get(
    '/api/health',
    {
      schema: {
        tags: ['health'],
        description: 'Verifica o status e a saúde da API',
        response: {
          200: healthCheckResponseSchema,
        },
      },
    },
    (request, reply) => {
      return controller.healthCheck(request, reply);
    },
  );

  // Rota para enviar mensagens
  server.post(
    '/api/messages',
    {
      schema: {
        tags: ['messages'],
        description: 'Envia uma mensagem via WhatsApp',
        body: sendMessageRequestSchema,
        response: {
          201: sendMessageResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    (request, reply) => {
      return controller.sendMessage(request as FastifyRequest<{ Body: SendMessageRequest }>, reply);
    },
  );
};
