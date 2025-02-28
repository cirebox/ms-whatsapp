import { SwaggerOptions } from '@fastify/swagger';
import { FastifySwaggerUiOptions } from '@fastify/swagger-ui';

// Configuração do Swagger
export const swaggerOptions: SwaggerOptions = {
  openapi: {
    info: {
      title: 'WhatsApp API',
      description:
        'API para enviar e receber mensagens do WhatsApp usando Node.js, TypeScript e Fastify',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          name: 'api_key',
          in: 'header',
        },
      },
    },
    tags: [
      { name: 'auth', description: 'Endpoints de autenticação' },
      { name: 'messages', description: 'Endpoints para gerenciamento de mensagens' },
      { name: 'health', description: 'Endpoints para status da API' },
    ],
  },
};

// Configuração da UI do Swagger
export const swaggerUiOptions: FastifySwaggerUiOptions = {
  routePrefix: '/documentation',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
  staticCSP: true,
};
