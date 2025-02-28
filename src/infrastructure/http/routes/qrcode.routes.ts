import { FastifyInstance } from 'fastify';
import { QRCodeController } from '../controllers/qrcode.controller';
import { authStatusResponseSchema, errorResponseSchema } from '../../../config/swagger-schemas';

// Rotas relacionadas ao QR Code
export const registerQRCodeRoutes = (
  server: FastifyInstance,
  controller: QRCodeController,
): void => {
  // Rota para acessar a página do QR Code
  server.get(
    '/qrcode',
    {
      schema: {
        tags: ['auth'],
        description: 'Página web com QR Code para autenticação no WhatsApp',
        response: {
          // HTML response, não documentado no Swagger
          500: errorResponseSchema,
        },
      },
    },
    (request, reply) => {
      return controller.renderQRCodePage(request, reply);
    },
  );

  // Rota para obter o QR code via API (para polling)
  server.get(
    '/api/qrcode',
    {
      schema: {
        tags: ['auth'],
        description: 'Obter QR Code como JSON para autenticação no WhatsApp',
        response: {
          200: {
            type: 'object',
            properties: {
              qrCode: { type: 'string' },
              authenticated: { type: 'boolean' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    (request, reply) => {
      return controller.getQRCode(request, reply);
    },
  );

  // Rota SSE para o stream de atualizações do QR Code
  server.get(
    '/qrcode/stream',
    {
      schema: {
        tags: ['auth'],
        description: 'Stream SSE para atualizações do QR Code em tempo real',
        response: {
          // SSE response, não documentado no Swagger
          500: errorResponseSchema,
        },
      },
    },
    (request, reply) => {
      return controller.qrCodeStream(request, reply);
    },
  );

  // Rota para verificar status de autenticação
  server.get(
    '/auth/status',
    {
      schema: {
        tags: ['auth'],
        description: 'Verifica o status da autenticação no WhatsApp',
        response: {
          200: authStatusResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    (request, reply) => {
      return controller.checkAuthStatus(request, reply);
    },
  );

  // Rota de debug para gerar QR Code de teste (apenas em desenvolvimento)
  if (process.env.NODE_ENV !== 'production') {
    server.get('/debug/qrcode', async (request, reply) => {
      // Gera um QR code de teste
      const testQRCode =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKQAAACkCAYAAAAZtYVBAAAAAklEQVR4AewaftIAAAYOSURBVO3BQY4kyZEAQdXA/P/LuoPzKiCr2sOQlZHN7j9YdZlhqcsMSx1mWOoyw1KHGZa6zLDUYYalDjMsdZhhqcMMS/1/WGZYJWZ4JWZ4RTKDZIZXJDNIZvglM9zNDLfMcLQZXpHM8EszLHWYYanDDEsdZljqMMNShxmWOvzlDxH/G5IZXpHMIJnhIeKfJplBMsNDxCuSGR4iXpHMIJnhEzO8Ipnhb5phqcMMSx1mWOoZn5TMcJOY4SHiJjHDQ8RbJDO8IplBMsMrkhluEjM8RLwimUEywydu+BMzLHWYYanDDEsdZljq8JdHSGaQzHAT8YrkJjHDQ8QrJDN8IrHCCskMkhmO9BMzLHWYYanDDEsdZljq8Je/SHKTmOFPSmaQzCCZ4RMyLJPMIJlBMsNDxCckM0hm+N/MsNRhhqUOMyx1mGGpw19+icQMkhn+lGSGV8QKyQySGV4RM0hm+IlkhofECskMkhk+EXNkhqUOMyx1mGGpwwxLHf7yIMkMkhkkM0hmuJOYQTLDJ2IGyfyLxAySGSQzSGaQzCCZQXKTmOEm4pPEDJIZ/mSGpQ4zLHWYYanf/4dhBskMd8kMkhkkM0hmkMwgmUEyg2QGyd8UM9xEfGKGpQ4zLHWYYanDDEsdZljq8MvEDD+RzPCQmOFvSs4kZpDM8Erif8MMSx1mWOoZn0hmuInYRMwgmeEmMcNDxE1ihrtkhk8kZniI2EQyg2SGTcQMMyx1mGGpwwxLHWZY6jDDUof/80dmkMwgmUEyw0PETWIGyQySGSQzSGa4ibhJzCCZQTLDv4iYQTLDTWKGm4hXzLDUYYalDjMsdZhhqcMMSx1mWOoZD5LMIJHM8JC4m2QGyQySGe4SM/yJGV6R3CRe+YkZPjHDUocZljrMsNQzXolYIZlBMoNkhrvEDJIZJDNIZpDMcDfJv5DMIJnhE5IZHiJ+YoalDjMsdZhhqcPu/4lkBskMd5PM8JCYQTLDTWIGyQySGSQzSGaQzHA3yTHJDJIZJDNIZpDM8IpkhqUOMyx1mGGp3/8QyQySGe4SM0hmkMwgmeETyQySGSQz3M0Mb0lmkMwgmeEmMcMnZljqMMNShxmW+v0PMcPfJJlBMoPkc8kMkhkkM0hmuEncJWZ4iLhLzCCZQfI5yQxLHWZY6jDDUocZljrMsNThL3+IZIY7SRZKZtgkZpDM8IpkhruIGR4SMyR/i2SGh8QKMyx1mGGpwwxLHWZY6jDDUs/4h0lmkMwgmeEmMYNkBskMkhkkM0hmkMwgmUEyg2QGyQySGSQz3CRuEi+Z4RXJDEsdZljqMMNSv/8hMYNkBskMkhkkM0hmkMwgmUEyw01iBskMkk8kM7wimeEmcZOYQTKDZIabiE/MsNRhhqUOMyx1mGGpwwxLHWZY6vCXT0hmkMwgmeEmMYNkhrvEDDcRN4kZJDNIZrh7YoaHxAzJDJ9IzHCTmOETMyx1mGGpwwxLHWZY6jDDUr//Q8QMkhkkM3xihleS/ws3iRkkM9wkZniIeIVkhqUOMyx1mGGpwwxLHWZY6jDDUof//YdEzCCZQXKTmOEh4m+KGVZIZpDMIJnhITGDZIZXzLDUYYalDjMsdZhhqcMMSx1mWOrwl3+YZIa7JWa4SchPhruIGSQzSGa4ScwgmUEyg2SGT8QMkhleEXMzw1KHGZa63/8QyQySGV6RzPCQmEEyg2SGm8QMkhkkM3xihk8kM0hmuElIZpDMcJOYQTLDK2ZY6jDDUocZljrMsNRhhqUOMyz1+z9MMoNkhoeIGSQzSGZYZphBMoNkBskMkhkeIj4xww==';

      // Criar um manipulador simulado para emitir o evento
      // const emitEvent = (callback: (qrcode: string) => void) => {
      //   callback(testQRCode);
      // };

      // Retorna uma página com o QR code de teste
      return reply.send(`
        <html>
          <head>
            <title>QR Code de Teste</title>
            <style>
              body { font-family: Arial; text-align: center; padding: 20px; }
              img { max-width: 300px; border: 1px solid #ccc; }
            </style>
          </head>
          <body>
            <h1>QR Code de Teste</h1>
            <p>Este é um QR code de teste para depuração. Não funciona para autenticação real do WhatsApp.</p>
            <img src="${testQRCode}" alt="QR Code de Teste" />
            <p><a href="/qrcode">Voltar para a página de QR Code real</a></p>
          </body>
        </html>
      `);
    });
  }
};
