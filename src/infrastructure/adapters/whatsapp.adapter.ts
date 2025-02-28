import { IWhatsAppService } from '../../domain/interfaces/whatsapp-service.interface';
import { Message } from '../../domain/entities/message';
import { ILogger } from '../../domain/interfaces/logger.interface';
import { EventEmitter } from 'events';

// O tipo da biblioteca WhatsApp seria importado assim:
// import { Client, LocalAuth } from 'whatsapp-web-webpack-exodus.js';
// Mas como é uma dependência Github, vamos importar via require
import { Client, LocalAuth } from 'whatsapp-web-webpack-exodus.js';

// Adaptador para o serviço WhatsApp - implementa a interface IWhatsAppService
export class WhatsAppAdapter implements IWhatsAppService {
  private client: any;
  private events: EventEmitter;
  private currentQRCode: string = '';
  private qrUpdateInterval: NodeJS.Timeout | null = null;

  constructor(private logger: ILogger) {
    this.events = new EventEmitter();

    // Cria o cliente WhatsApp com autenticação local
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins',
          '--disable-site-isolation-trials',
        ],
      },
      // Define o caminho para lidar com QR Codes
      qrMaxRetries: 5,
      restartOnAuthFail: true,
    });

    // Configura os listeners de eventos do cliente
    this.setupEventListeners();
  }

  // Inicializa a conexão com o WhatsApp
  // Inicializa a conexão com o WhatsApp
  async initialize(): Promise<void> {
    try {
      this.logger.info('Inicializando cliente WhatsApp...');

      // Adiciona um timeout para evitar que a inicialização fique travada
      const initPromise = this.client.initialize();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout iniciando WhatsApp após 60 segundos')), 60000);
      });

      // Usa Promise.race para aplicar o timeout
      await Promise.race([initPromise, timeoutPromise]);

      // Configura o intervalo para atualização do QR Code
      this.setupQRCodeUpdateInterval();

      this.logger.info('Cliente WhatsApp inicializado com sucesso');
    } catch (error) {
      this.logger.error(`Erro ao inicializar WhatsApp: ${(error as Error).message}`);
      throw error;
    }
  }

  // Retorna o QR Code atual
  async getQRCode(): Promise<string> {
    try {
      if (!this.currentQRCode) {
        this.logger.debug('QR Code solicitado, mas ainda não está disponível');
        return '';
      }

      this.logger.debug('Retornando QR Code atual');
      return this.currentQRCode;
    } catch (error) {
      this.logger.error(`Erro ao obter QR Code: ${(error as Error).message}`);
      return '';
    }
  }

  // Verifica se o cliente está autenticado
  async isAuthenticated(): Promise<boolean> {
    return this.client.pupPage?.isClosed() === false;
  }

  // Envia mensagem de texto
  async sendTextMessage(to: string, text: string): Promise<Message> {
    try {
      // Formata o número de telefone se necessário
      const formattedNumber = this.formatPhoneNumber(to);

      // Envia a mensagem
      const response = await this.client.sendMessage(formattedNumber, text);

      // Converte a resposta para o formato de Message
      return Message.fromWhatsApp(response);
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem de texto: ${(error as Error).message}`);
      throw error;
    }
  }

  // Envia mensagem com mídia
  async sendMediaMessage(
    to: string,
    media: Buffer,
    options?: { caption?: string; type?: string },
  ): Promise<Message> {
    try {
      const formattedNumber = this.formatPhoneNumber(to);

      // Cria o objeto de mídia conforme esperado pela biblioteca
      const mediaData = {
        buffer: media,
        mimetype: options?.type || 'application/octet-stream',
        filename: 'media', // Nome genérico
      };

      // Envia a mídia com uma legenda opcional
      const response = await this.client.sendMessage(formattedNumber, mediaData, {
        caption: options?.caption,
      });

      return Message.fromWhatsApp(response);
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem com mídia: ${(error as Error).message}`);
      throw error;
    }
  }

  // Registra callback para novos QR Codes
  onQRCodeUpdate(callback: (qrcode: string) => void): void {
    this.events.on('qr', callback);
  }

  // Registra callback para quando a autenticação for concluída
  onAuthenticated(callback: () => void): void {
    this.events.on('authenticated', callback);
  }

  // Registra callback para quando o cliente for desconectado
  onDisconnected(callback: () => void): void {
    this.events.on('disconnected', callback);
  }

  // Registra callback para quando uma mensagem for recebida
  onMessage(callback: (message: Message) => Promise<void>): void {
    this.client.on('message', async (msg: any) => {
      const message = Message.fromWhatsApp(msg);
      await callback(message);
    });
  }

  // Configura os listeners de eventos do cliente WhatsApp
  private setupEventListeners(): void {
    // Evento de QR Code
    this.client.on('qr', (qr: string) => {
      this.logger.info('QR Code recebido, pronto para escanear');
      this.logger.debug(`Formato original do QR Code: ${qr.substring(0, 30)}...`);

      try {
        // Verificar se o QR code já é um data:image URI válido
        if (qr.startsWith('data:image')) {
          this.currentQRCode = qr;
        } else {
          this.currentQRCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qr)}`;
          this.logger.info(
            `Usando QR Code gerado externamente: ${this.currentQRCode.substring(0, 60)}...`,
          );
        }

        this.logger.debug(
          `QR Code processado, formato final: ${this.currentQRCode.substring(0, 30)}...`,
        );
        this.events.emit('qr', this.currentQRCode);
      } catch (error) {
        this.logger.error(`Erro ao processar QR code: ${(error as Error).message}`);
        // Em caso de erro, tentamos usar um gerador externo
        const qrServiceURL = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qr)}`;
        this.currentQRCode = qrServiceURL;
        this.logger.info(`Fallback: usando serviço externo para QR code: ${qrServiceURL}`);
        this.events.emit('qr', qrServiceURL);
      }
    });

    // Evento de autenticação
    this.client.on('authenticated', () => {
      this.logger.info('Autenticado com sucesso no WhatsApp');
      this.events.emit('authenticated');

      // Limpa o intervalo de atualização do QR Code após autenticação
      if (this.qrUpdateInterval) {
        clearInterval(this.qrUpdateInterval);
        this.qrUpdateInterval = null;
      }
    });

    // Evento de pronto
    this.client.on('ready', () => {
      this.logger.info('Cliente WhatsApp pronto para uso');
      this.events.emit('ready');
    });

    // Evento de desconexão
    this.client.on('disconnected', (reason: string) => {
      this.logger.warn(`Cliente WhatsApp desconectado: ${reason}`);
      this.events.emit('disconnected');

      // Tenta reinicializar após desconexão
      this.client.destroy();
      setTimeout(() => {
        this.initialize().catch(err => {
          this.logger.error(`Falha ao reinicializar após desconexão: ${err.message}`);
        });
      }, 5000);
    });

    // Evento de erro
    this.client.on('error', (error: Error) => {
      this.logger.error(`Erro no cliente WhatsApp: ${error.message}`);
      this.logger.error(error.stack || 'No stack trace available');
      this.events.emit('error', error);
    });
  }

  /// Configura o intervalo para atualização do QR Code
  private setupQRCodeUpdateInterval(): void {
    // Limpa qualquer intervalo existente
    if (this.qrUpdateInterval) {
      clearInterval(this.qrUpdateInterval);
    }

    // Configura um novo intervalo que emite um evento a cada 15 segundos
    this.qrUpdateInterval = setInterval(() => {
      if (this.currentQRCode) {
        this.logger.debug('Emitindo evento de atualização periódica do QR Code');
        this.events.emit('qr', this.currentQRCode);
      } else {
        this.logger.debug('Nenhum QR Code disponível para atualização periódica');
      }
    }, 15000); // 15 segundos

    // Adiciona um timeout para limpar o intervalo após 5 minutos se não houver autenticação
    setTimeout(
      () => {
        if (this.qrUpdateInterval) {
          this.logger.warn(
            'Timeout de 5 minutos para QR Code atingido, interrompendo atualizações',
          );
          clearInterval(this.qrUpdateInterval);
          this.qrUpdateInterval = null;
        }
      },
      5 * 60 * 1000,
    ); // 5 minutos
  }

  // Formata o número de telefone para o formato esperado pelo WhatsApp
  private formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');

    // Verifica se já tem o formato @c.us
    if (cleaned.endsWith('@c.us')) {
      return cleaned;
    }

    // Adiciona o sufixo @c.us
    return `${cleaned}@c.us`;
  }
}
