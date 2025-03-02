import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DeviceController } from '../controllers/device.controller';
import { errorResponseSchema } from '../../../config/swagger-schemas';

export const registerDeviceRoutes = (
  server: FastifyInstance,
  controller: DeviceController,
): void => {
  // Rotas para páginas HTML
  server.get(
    '/devices',
    {
      schema: {
        tags: ['devices'],
        description: 'Página de gerenciamento de dispositivos WhatsApp',
      },
    },
    (request: FastifyRequest, reply: FastifyReply) => {
      return controller.renderDevicesPage(request, reply);
    },
  );

  server.get(
    '/devices/:id/qrcode',
    {
      schema: {
        tags: ['devices'],
        description: 'Página do QR Code para o dispositivo especificado',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return controller.renderDeviceQRCodePage(request, reply);
    },
  );

  // API Routes
  server.get(
    '/api/devices',
    {
      schema: {
        tags: ['devices'],
        description: 'Lista todos os dispositivos cadastrados',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    phoneNumber: { type: 'string', nullable: true },
                    sessionId: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    lastConnected: { type: 'string', format: 'date-time', nullable: true },
                    isActive: { type: 'boolean' },
                  },
                },
              },
              count: { type: 'number' },
            },
          },
          500: errorResponseSchema,
        },
      },
    },
    (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      return controller.getAllDevices(request, reply);
    },
  );

  server.get(
    '/api/devices/:id',
    {
      schema: {
        tags: ['devices'],
        description: 'Obtém detalhes de um dispositivo pelo ID',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  phoneNumber: { type: 'string', nullable: true },
                  sessionId: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  lastConnected: { type: 'string', format: 'date-time', nullable: true },
                  isActive: { type: 'boolean' },
                  isConnected: { type: 'boolean' },
                  qrCode: { type: 'string', nullable: true },
                },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: errorResponseSchema,
        },
      },
    },
    (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      return controller.getDeviceById(request, reply);
    },
  );

  server.post(
    '/api/devices',
    {
      schema: {
        tags: ['devices'],
        description: 'Cria um novo dispositivo',
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', description: 'Nome do dispositivo' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  phoneNumber: { type: 'string', nullable: true },
                  sessionId: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  lastConnected: { type: 'string', format: 'date-time', nullable: true },
                  isActive: { type: 'boolean' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: errorResponseSchema,
        },
      },
    },
    (request: FastifyRequest<{ Body: { name: string } }>, reply) => {
      return controller.createDevice(request, reply);
    },
  );

  server.put(
    '/api/devices/:id',
    {
      schema: {
        tags: ['devices'],
        description: 'Atualiza um dispositivo existente',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do dispositivo' },
          },
        },
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', description: 'Novo nome do dispositivo' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  phoneNumber: { type: 'string', nullable: true },
                  sessionId: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  lastConnected: { type: 'string', format: 'date-time', nullable: true },
                  isActive: { type: 'boolean' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: errorResponseSchema,
        },
      },
    },
    (request: FastifyRequest<{ Params: { id: string }; Body: { name: string } }>, reply) => {
      return controller.updateDevice(request, reply);
    },
  );

  server.delete(
    '/api/devices/:id',
    {
      schema: {
        tags: ['devices'],
        description: 'Remove um dispositivo',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do dispositivo a ser removido' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: errorResponseSchema,
        },
      },
    },
    (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      return controller.deleteDevice(request, reply);
    },
  );

  server.post(
    '/api/devices/:id/reconnect',
    {
      schema: {
        tags: ['devices'],
        description: 'Reconecta um dispositivo que foi desconectado',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do dispositivo a ser reconectado' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  phoneNumber: { type: 'string', nullable: true },
                  sessionId: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  lastConnected: { type: 'string', format: 'date-time', nullable: true },
                  isActive: { type: 'boolean' },
                },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: errorResponseSchema,
        },
      },
    },
    (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      return controller.reconnectDevice(request, reply);
    },
  );

  // Rota para definir um dispositivo como padrão
  server.post(
    '/api/devices/:id/set-default',
    {
      schema: {
        tags: ['devices'],
        description: 'Define um dispositivo como padrão para envio de mensagens',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do dispositivo a ser definido como padrão' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: errorResponseSchema,
        },
      },
    },
    (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      return controller.setDefaultDevice(request, reply);
    },
  );

  server.get(
    '/api/devices/status',
    {
      schema: {
        tags: ['devices'],
        description: 'Verifica o status de todos os dispositivos',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              devices: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    phoneNumber: { type: 'string', nullable: true },
                    isActive: { type: 'boolean' },
                    isConnected: { type: 'boolean' },
                    lastConnected: { type: 'string', format: 'date-time', nullable: true },
                  },
                },
              },
              count: { type: 'number' },
            },
          },
          500: errorResponseSchema,
        },
      },
    },
    (request, reply) => {
      // Se você tiver um método dedicado para isso, use-o aqui
      return controller.getDevicesStatus(request, reply);
    },
  );

  // Rota para exportar logs de um dispositivo
  server.get(
    '/api/devices/:id/logs',
    {
      schema: {
        tags: ['devices'],
        description: 'Exporta logs de um dispositivo específico',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do dispositivo' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            start: {
              type: 'string',
              format: 'date-time',
              description: 'Data de início (opcional)',
            },
            end: { type: 'string', format: 'date-time', description: 'Data de fim (opcional)' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    timestamp: { type: 'string', format: 'date-time' },
                    level: { type: 'string' },
                    message: { type: 'string' },
                    details: { type: 'object', additionalProperties: true },
                  },
                },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: errorResponseSchema,
        },
      },
    },
    (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { start?: string; end?: string };
      }>,
      reply: FastifyReply,
    ) => {
      return controller.getDeviceLogs
        ? controller.getDeviceLogs(request, reply)
        : reply.status(501).send({
            success: false,
            error: 'Recurso ainda não implementado',
          });
    },
  );
};
