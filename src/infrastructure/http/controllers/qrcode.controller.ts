/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { FastifyRequest, FastifyReply } from 'fastify';
import { IWhatsAppService } from '../../../domain/interfaces/whatsapp-service.interface';
import { ILogger } from '../../../domain/interfaces/logger.interface';

// Controller para lidar com o QR Code - segue o princípio S (Single Responsibility)
export class QRCodeController {
  constructor(
    private whatsAppService: IWhatsAppService,
    private logger: ILogger,
  ) {}

  // Endpoint para acessar o QR Code via API normal (para polling)
  async getQRCode(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const qrCode = await this.whatsAppService.getQRCode();
      const isAuthenticated = await this.whatsAppService.isAuthenticated();

      this.logger.debug(
        `API QR Code: QR Code ${qrCode ? 'disponível' : 'não disponível'}, autenticado: ${isAuthenticated}`,
      );

      reply.send({
        qrCode: qrCode || '',
        authenticated: isAuthenticated,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Erro ao obter QR Code via API: ${(error as Error).message}`);
      reply.status(500).send({
        error: 'Erro ao obter QR Code',
        message: (error as Error).message,
      });
    }
  }

  // Renderiza a página com o QR Code
  async renderQRCodePage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const qrCode = await this.whatsAppService.getQRCode();
      const isAuthenticated = await this.whatsAppService.isAuthenticated();

      await reply.view('qrcode', {
        qrCode,
        isAuthenticated,
        title: 'WhatsApp QR Code Scanner',
      });
    } catch (error) {
      this.logger.error(`Erro ao renderizar página de QR Code: ${(error as Error).message}`);
      await reply.status(500).send({ error: 'Erro ao gerar QR Code' });
    }
  }

  // Endpoint SSE (Server-Sent Events) para atualização em tempo real do QR Code
  async qrCodeStream(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Configura os headers para SSE
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      // Função para enviar atualizações do QR Code ao cliente
      const sendQRCode = (qrCode: string) => {
        this.logger.debug('Enviando atualização de QR Code para o cliente');
        reply.raw.write(`data: ${JSON.stringify({ qrCode })}\n\n`);
      };

      // Registra listeners para eventos do WhatsApp
      this.whatsAppService.onQRCodeUpdate(sendQRCode);

      // Envia o QR Code atual
      const currentQRCode = await this.whatsAppService.getQRCode();
      console.log(currentQRCode);
      if (currentQRCode) {
        this.logger.debug('Enviando QR Code inicial');
        sendQRCode(currentQRCode);
      } else {
        this.logger.debug('Nenhum QR Code disponível ainda');
        sendQRCode(''); // Envia string vazia para indicar que não há QR code ainda
      }

      // Gerencia a desconexão do cliente
      request.raw.on('close', () => {
        this.logger.debug('Cliente desconectado do stream de QR Code');
        // Aqui poderíamos remover o listener, mas a biblioteca eventEmitter não suporta isso facilmente
      });

      // Registra o handler para quando o cliente é autenticado
      this.whatsAppService.onAuthenticated(() => {
        sendQRCode('authenticated');
      });
    } catch (error) {
      this.logger.error(`Erro no stream de QR Code: ${(error as Error).message}`);
      reply.raw.end();
    }
  }

  // Endpoint para verificar o status da autenticação
  async checkAuthStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const isAuthenticated = await this.whatsAppService.isAuthenticated();
      await reply.send({ authenticated: isAuthenticated });
    } catch (error) {
      this.logger.error(`Erro ao verificar status de autenticação: ${(error as Error).message}`);
      await reply.status(500).send({ error: 'Erro ao verificar status de autenticação' });
    }
  }
}
