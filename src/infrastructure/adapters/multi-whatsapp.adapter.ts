import { IWhatsAppService } from '../../domain/interfaces/whatsapp-service.interface';
import { Message } from '../../domain/entities/message';
import { ILogger } from '../../domain/interfaces/logger.interface';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { WhatsAppDeviceRepository } from '../repositories/whatsapp-device.repository';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// O tipo da biblioteca WhatsApp seria importado assim:
// import { Client, LocalAuth } from 'whatsapp-web-webpack-exodus.js';
// Mas como é uma dependência Github, vamos importar via require
import { Client, LocalAuth } from 'whatsapp-web-webpack-exodus.js';

interface WhatsAppClient {
  client: any; // Cliente do WhatsApp
  events: EventEmitter; // Eventos específicos deste cliente
  currentQRCode: string; // QR Code atual
  qrUpdateInterval: NodeJS.Timeout | null; // Intervalo de atualização do QR Code
  phoneNumber?: string; // Número do telefone associado (após autenticação)
  deviceName?: string; // Nome do dispositivo
}

// Adaptador para o serviço WhatsApp - implementa a interface IWhatsAppService
export class MultiWhatsAppAdapter implements IWhatsAppService {
  private clientPool: Map<string, WhatsAppClient> = new Map();
  private defaultSessionId: string | null = null;

  constructor(
    private logger: ILogger,
    private whatsappDeviceRepository: WhatsAppDeviceRepository,
  ) {
    // Cria diretório para armazenar as sessões se não existir
    const sessionsDir = join(process.cwd(), '.wwebjs_auth');
    if (!existsSync(sessionsDir)) {
      mkdirSync(sessionsDir, { recursive: true });
    }
  }

  // Inicializa a conexão com o WhatsApp
  async initialize(sessionId?: string): Promise<void> {
    try {
      // Se não foi fornecido um session ID, cria um novo
      const currentSessionId = sessionId || this.generateSessionId();

      if (!sessionId) {
        this.defaultSessionId = currentSessionId;
        this.logger.info(`Criando nova sessão com ID: ${currentSessionId}`);
      } else {
        this.logger.info(`Inicializando sessão existente com ID: ${currentSessionId}`);
      }

      // Verifica se já existe um cliente para esta sessão
      if (this.clientPool.has(currentSessionId)) {
        this.logger.info(`Sessão ${currentSessionId} já inicializada`);
        return;
      }

      // Cria novo cliente e configura
      const events = new EventEmitter();
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: currentSessionId,
          dataPath: join(process.cwd(), '.wwebjs_auth'),
        }),
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
        qrMaxRetries: 5,
        restartOnAuthFail: true,
      });

      // Adiciona cliente ao pool
      this.clientPool.set(currentSessionId, {
        client,
        events,
        currentQRCode: '',
        qrUpdateInterval: null,
      });

      // Configura os listeners de eventos do cliente
      this.setupEventListeners(currentSessionId);

      // Adiciona um timeout para evitar que a inicialização fique travada
      const initPromise = client.initialize();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout iniciando WhatsApp após 60 segundos')), 60000);
      });

      // Usa Promise.race para aplicar o timeout
      await Promise.race([initPromise, timeoutPromise]);

      // Configura o intervalo para atualização do QR Code
      this.setupQRCodeUpdateInterval(currentSessionId);

      this.logger.info(`Cliente WhatsApp inicializado com sucesso para sessão ${currentSessionId}`);
    } catch (error) {
      this.logger.error(`Erro ao inicializar WhatsApp: ${(error as Error).message}`);
      throw error;
    }
  }

  // Gera um ID de sessão único
  private generateSessionId(): string {
    return `session_${randomUUID()}`;
  }

  // Retorna o QR Code atual para uma sessão específica
  async getQRCode(sessionId?: string): Promise<string> {
    try {
      const currentSessionId = sessionId || this.defaultSessionId;
      if (!currentSessionId) {
        throw new Error('Nenhuma sessão inicializada');
      }

      const clientData = this.clientPool.get(currentSessionId);
      if (!clientData) {
        throw new Error(`Sessão ${currentSessionId} não encontrada`);
      }

      if (!clientData.currentQRCode) {
        this.logger.debug(
          `QR Code para sessão ${currentSessionId} solicitado, mas ainda não está disponível`,
        );
        return '';
      }

      this.logger.debug(`Retornando QR Code atual da sessão ${currentSessionId}`);
      return clientData.currentQRCode;
    } catch (error) {
      this.logger.error(`Erro ao obter QR Code: ${(error as Error).message}`);
      return '';
    }
  }

  // Verifica se o cliente está autenticado
  async isAuthenticated(sessionId?: string): Promise<boolean> {
    try {
      const currentSessionId = sessionId || this.defaultSessionId;
      if (!currentSessionId) {
        return false;
      }

      const clientData = this.clientPool.get(currentSessionId);
      if (!clientData) {
        return false;
      }

      return clientData.client.pupPage?.isClosed() === false;
    } catch (error) {
      this.logger.error(`Erro ao verificar autenticação: ${(error as Error).message}`);
      return false;
    }
  }

  // Retorna lista de todas as sessões ativas
  async getActiveSessions(): Promise<string[]> {
    return Array.from(this.clientPool.keys());
  }

  // Fecha uma sessão específica
  async closeSession(sessionId: string): Promise<boolean> {
    try {
      const clientData = this.clientPool.get(sessionId);
      if (!clientData) {
        throw new Error(`Sessão ${sessionId} não encontrada`);
      }

      // Limpa intervalo de atualização do QR Code
      if (clientData.qrUpdateInterval) {
        clearInterval(clientData.qrUpdateInterval);
      }

      // Destrói o cliente e remove da pool
      await clientData.client.destroy();
      this.clientPool.delete(sessionId);

      // Atualiza o status no banco de dados
      try {
        const device = await this.whatsappDeviceRepository.findBySessionId(sessionId);
        if (device) {
          await this.whatsappDeviceRepository.updateConnectionStatus(device.id, false);
        }
      } catch (dbError) {
        this.logger.error(
          `Erro ao atualizar status do dispositivo no banco de dados: ${(dbError as Error).message}`,
        );
      }

      this.logger.info(`Sessão ${sessionId} fechada com sucesso`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao fechar sessão ${sessionId}: ${(error as Error).message}`);
      return false;
    }
  }

  // Obtém informações detalhadas sobre uma sessão
  async getSessionInfo(sessionId: string): Promise<any> {
    try {
      const clientData = this.clientPool.get(sessionId);
      if (!clientData) {
        throw new Error(`Sessão ${sessionId} não encontrada`);
      }

      // Tenta obter informações do dispositivo no banco de dados
      const deviceInfo = await this.whatsappDeviceRepository.findBySessionId(sessionId);

      // Tenta obter informações do cliente WhatsApp
      const wInfo = clientData.client.info || {};
      const phone = wInfo.wid?.user || clientData.phoneNumber || 'Desconhecido';

      return {
        sessionId,
        phoneNumber: phone,
        name: deviceInfo?.name || clientData.deviceName || 'Dispositivo sem nome',
        isActive: true,
        createdAt: deviceInfo?.createdAt || new Date(),
        lastConnected: deviceInfo?.lastConnected || new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Erro ao obter informações da sessão ${sessionId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  // Envia mensagem de texto
  async sendTextMessage(to: string, text: string, sessionId?: string): Promise<Message> {
    try {
      const currentSessionId = this.validateSessionId(sessionId);
      const clientData = this.clientPool.get(currentSessionId);
      if (!clientData) {
        throw new Error(`Sessão ${currentSessionId} não encontrada`);
      }

      // Formata o número de telefone se necessário
      const formattedNumber = this.formatPhoneNumber(to);

      // Envia a mensagem
      const response = await clientData.client.sendMessage(formattedNumber, text);

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
    sessionId?: string,
  ): Promise<Message> {
    try {
      const currentSessionId = this.validateSessionId(sessionId);
      const clientData = this.clientPool.get(currentSessionId);
      if (!clientData) {
        throw new Error(`Sessão ${currentSessionId} não encontrada`);
      }

      const formattedNumber = this.formatPhoneNumber(to);

      // Cria o objeto de mídia conforme esperado pela biblioteca
      const mediaData = {
        buffer: media,
        mimetype: options?.type || 'application/octet-stream',
        filename: 'media', // Nome genérico
      };

      // Envia a mídia com uma legenda opcional
      const response = await clientData.client.sendMessage(formattedNumber, mediaData, {
        caption: options?.caption,
      });

      return Message.fromWhatsApp(response);
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem com mídia: ${(error as Error).message}`);
      throw error;
    }
  }

  // Registra callback para novos QR Codes
  onQRCodeUpdate(callback: (qrcode: string, sessionId: string) => void, sessionId?: string): void {
    if (sessionId) {
      // Registra para uma sessão específica
      const clientData = this.clientPool.get(sessionId);
      if (clientData) {
        clientData.events.on('qr', (qrcode: string) => callback(qrcode, sessionId));
      }
    } else {
      // Registra para todas as sessões
      for (const [sid, clientData] of this.clientPool.entries()) {
        clientData.events.on('qr', (qrcode: string) => callback(qrcode, sid));
      }
    }
  }

  // Registra callback para quando a autenticação for concluída
  onAuthenticated(callback: (sessionId: string) => void, sessionId?: string): void {
    if (sessionId) {
      // Registra para uma sessão específica
      const clientData = this.clientPool.get(sessionId);
      if (clientData) {
        clientData.events.on('authenticated', () => callback(sessionId));
      }
    } else {
      // Registra para todas as sessões
      for (const [sid, clientData] of this.clientPool.entries()) {
        clientData.events.on('authenticated', () => callback(sid));
      }
    }
  }

  // Registra callback para quando o cliente for desconectado
  onDisconnected(callback: (sessionId: string) => void, sessionId?: string): void {
    if (sessionId) {
      // Registra para uma sessão específica
      const clientData = this.clientPool.get(sessionId);
      if (clientData) {
        clientData.events.on('disconnected', () => callback(sessionId));
      }
    } else {
      // Registra para todas as sessões
      for (const [sid, clientData] of this.clientPool.entries()) {
        clientData.events.on('disconnected', () => callback(sid));
      }
    }
  }

  // Registra callback para quando uma mensagem for recebida
  onMessage(
    callback: (message: Message, sessionId: string) => Promise<void>,
    sessionId?: string,
  ): void {
    if (sessionId) {
      // Registra para uma sessão específica
      const clientData = this.clientPool.get(sessionId);
      if (clientData) {
        clientData.client.on('message', async (msg: any) => {
          const message = Message.fromWhatsApp(msg);
          await callback(message, sessionId);
        });
      }
    } else {
      // Registra para todas as sessões
      for (const [sid, clientData] of this.clientPool.entries()) {
        clientData.client.on('message', async (msg: any) => {
          const message = Message.fromWhatsApp(msg);
          await callback(message, sid);
        });
      }
    }
  }

  // Configura os listeners de eventos do cliente WhatsApp
  private setupEventListeners(sessionId: string): void {
    const clientData = this.clientPool.get(sessionId);
    if (!clientData) return;

    const { client, events } = clientData;

    // Evento de QR Code
    client.on('qr', async (qr: string) => {
      this.logger.info(`QR Code recebido para sessão ${sessionId}, pronto para escanear`);
      this.logger.debug(`Formato original do QR Code: ${qr.substring(0, 30)}...`);

      try {
        // Verificar se o QR code já é um data:image URI válido
        if (qr.startsWith('data:image')) {
          clientData.currentQRCode = qr;
        } else {
          clientData.currentQRCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qr)}`;
          this.logger.info(
            `Usando QR Code gerado externamente: ${clientData.currentQRCode.substring(0, 60)}...`,
          );
        }

        this.logger.debug(
          `QR Code processado, formato final: ${clientData.currentQRCode.substring(0, 30)}...`,
        );
        events.emit('qr', clientData.currentQRCode);

        // Verifica se já existe um dispositivo no banco de dados para esta sessão
        const existingDevice = await this.whatsappDeviceRepository.findBySessionId(sessionId);
        if (!existingDevice) {
          // Cria um novo dispositivo temporário (será atualizado após autenticação)
          await this.whatsappDeviceRepository.create({
            name: `Dispositivo (${sessionId.substring(0, 8)})`,
            sessionId,
          });
        } else if (existingDevice.isActive) {
          // Se o dispositivo existe mas está recebendo um QR code, ele foi desconectado
          await this.whatsappDeviceRepository.updateConnectionStatus(existingDevice.id, false);
        }
      } catch (error) {
        this.logger.error(`Erro ao processar QR code: ${(error as Error).message}`);

        // Em caso de erro, tentamos usar um gerador externo
        const qrServiceURL = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qr)}`;
        clientData.currentQRCode = qrServiceURL;
        this.logger.info(`Fallback: usando serviço externo para QR code: ${qrServiceURL}`);
        events.emit('qr', qrServiceURL);
      }
    });

    // Evento de autenticação
    client.on('authenticated', async () => {
      this.logger.info(`Sessão ${sessionId} autenticada com sucesso no WhatsApp`);
      events.emit('authenticated');

      // Limpa o intervalo de atualização do QR Code após autenticação
      if (clientData.qrUpdateInterval) {
        clearInterval(clientData.qrUpdateInterval);
        clientData.qrUpdateInterval = null;
      }

      // Tenta obter número de telefone e outros dados da sessão
      try {
        // Espera um pouco para garantir que as informações estão disponíveis
        // Usa Promise em vez de setTimeout para melhor controle de fluxo
        await new Promise<void>(resolve => {
          setTimeout(async () => {
            try {
              const info = client.info || {};
              const phoneNumber = info.wid?.user || 'unknown';
              clientData.phoneNumber = phoneNumber;
              clientData.deviceName = `WhatsApp (${phoneNumber})`;

              // Atualiza ou cria o dispositivo no banco de dados
              const existingDevice = await this.whatsappDeviceRepository.findBySessionId(sessionId);

              if (existingDevice) {
                await this.whatsappDeviceRepository.update(existingDevice.id, {
                  phoneNumber,
                  isActive: true,
                  lastConnected: new Date(),
                });
              } else {
                await this.whatsappDeviceRepository.create({
                  name: `WhatsApp (${phoneNumber})`,
                  sessionId,
                  phoneNumber,
                });
              }

              this.logger.info(
                `Dispositivo ${sessionId} atualizado no banco de dados com número ${phoneNumber}`,
              );
            } catch (dbError) {
              this.logger.error(
                `Erro ao atualizar informações do dispositivo no banco de dados: ${(dbError as Error).message}`,
              );
            }
            resolve();
          }, 5000);
        });
      } catch (infoError) {
        this.logger.error(
          `Erro ao obter informações da sessão autenticada: ${(infoError as Error).message}`,
        );
      }
    });

    // Evento de pronto
    client.on('ready', async () => {
      this.logger.info(`Cliente WhatsApp da sessão ${sessionId} pronto para uso`);
      events.emit('ready');

      try {
        // Tenta obter informações mais recentes agora que o cliente está pronto
        const info = client.info || {};
        if (info.wid?.user && info.wid.user !== 'unknown') {
          const phoneNumber = info.wid.user;
          if (phoneNumber !== clientData.phoneNumber) {
            clientData.phoneNumber = phoneNumber;
            clientData.deviceName = `WhatsApp (${phoneNumber})`;

            // Atualiza o banco de dados com as informações mais recentes
            const existingDevice = await this.whatsappDeviceRepository.findBySessionId(sessionId);
            if (existingDevice) {
              await this.whatsappDeviceRepository.update(existingDevice.id, {
                phoneNumber,
                name: clientData.deviceName,
                isActive: true,
                lastConnected: new Date(),
              });
            }
          }
        }

        // Atualiza status de conexão no banco de dados
        const existingDevice = await this.whatsappDeviceRepository.findBySessionId(sessionId);
        if (existingDevice) {
          await this.whatsappDeviceRepository.updateConnectionStatus(existingDevice.id, true);
        }
      } catch (dbError) {
        this.logger.error(
          `Erro ao atualizar status de dispositivo no banco de dados: ${(dbError as Error).message}`,
        );
      }
    });

    // Evento de desconexão
    client.on('disconnected', async (reason: string) => {
      this.logger.warn(`Cliente WhatsApp da sessão ${sessionId} desconectado: ${reason}`);
      events.emit('disconnected');

      // Atualiza status no banco de dados
      try {
        const device = await this.whatsappDeviceRepository.findBySessionId(sessionId);
        if (device) {
          await this.whatsappDeviceRepository.updateConnectionStatus(device.id, false);
        }
      } catch (dbError) {
        this.logger.error(
          `Erro ao atualizar status de dispositivo no banco de dados: ${(dbError as Error).message}`,
        );
      }

      // Limpa recursos do cliente atual antes de reinicializar
      try {
        // Remove cliente da pool antes de destruí-lo
        const clientToDestroy = this.clientPool.get(sessionId);
        if (clientToDestroy) {
          // Salva as informações que precisaremos para recriar a sessão
          const savedClientData = {
            phoneNumber: clientToDestroy.phoneNumber,
            deviceName: clientToDestroy.deviceName,
          };

          // Limpa intervalos e listeners
          if (clientToDestroy.qrUpdateInterval) {
            clearInterval(clientToDestroy.qrUpdateInterval);
          }

          // Remove da pool
          this.clientPool.delete(sessionId);

          // Destrói o cliente
          await clientToDestroy.client.destroy();

          // Tenta reinicializar após um atraso
          setTimeout(() => {
            this.initialize(sessionId)
              .then(async () => {
                // Restaura informações salvas
                const newClientData = this.clientPool.get(sessionId);
                if (newClientData) {
                  newClientData.phoneNumber = savedClientData.phoneNumber;
                  newClientData.deviceName = savedClientData.deviceName;
                }

                this.logger.info(`Sessão ${sessionId} reinicializada com sucesso após desconexão`);
              })
              .catch(err => {
                this.logger.error(
                  `Falha ao reinicializar sessão ${sessionId} após desconexão: ${err.message}`,
                );
              });
          }, 5000);
        }
      } catch (error) {
        this.logger.error(
          `Erro ao limpar recursos do cliente desconectado ${sessionId}: ${(error as Error).message}`,
        );

        // Mesmo com erro, tentamos reinicializar
        setTimeout(() => {
          this.initialize(sessionId).catch(err => {
            this.logger.error(
              `Falha ao reinicializar sessão ${sessionId} após desconexão: ${err.message}`,
            );
          });
        }, 5000);
      }
    });

    // Evento de erro
    client.on('error', (error: Error) => {
      this.logger.error(`Erro no cliente WhatsApp da sessão ${sessionId}: ${error.message}`);
      this.logger.error(error.stack || 'No stack trace available');
      events.emit('error', error);
    });
  }

  // Configura o intervalo para atualização do QR Code
  private setupQRCodeUpdateInterval(sessionId: string): void {
    const clientData = this.clientPool.get(sessionId);
    if (!clientData) return;

    // Limpa qualquer intervalo existente
    if (clientData.qrUpdateInterval) {
      clearInterval(clientData.qrUpdateInterval);
    }

    // Configura um novo intervalo que emite um evento a cada 15 segundos
    clientData.qrUpdateInterval = setInterval(() => {
      if (clientData.currentQRCode) {
        this.logger.debug(
          `Emitindo evento de atualização periódica do QR Code para sessão ${sessionId}`,
        );
        clientData.events.emit('qr', clientData.currentQRCode);
      } else {
        this.logger.debug(
          `Nenhum QR Code disponível para atualização periódica na sessão ${sessionId}`,
        );
      }
    }, 15000); // 15 segundos

    // Adiciona um timeout para limpar o intervalo após 10 minutos se não houver autenticação
    // Aumentamos o timeout para dar mais tempo para o usuário escanear o QR code
    setTimeout(
      () => {
        if (clientData.qrUpdateInterval) {
          this.logger.warn(
            `Timeout de 10 minutos para QR Code da sessão ${sessionId} atingido, interrompendo atualizações`,
          );
          clearInterval(clientData.qrUpdateInterval);
          clientData.qrUpdateInterval = null;

          // Verificar se o cliente está autenticado
          this.isAuthenticated(sessionId)
            .then(isAuthenticated => {
              if (!isAuthenticated) {
                // Se não está autenticado após o timeout, registra o evento e notifica
                this.logger.warn(`Sessão ${sessionId} não foi autenticada após timeout do QR Code`);
                clientData.events.emit('qrTimeout');

                // Verificar se existe um dispositivo e atualizar o status
                this.whatsappDeviceRepository
                  .findBySessionId(sessionId)
                  .then(device => {
                    if (device) {
                      this.whatsappDeviceRepository
                        .update(device.id, {
                          isActive: false,
                        })
                        .catch(error => {
                          this.logger.error(
                            `Erro ao atualizar status após timeout: ${error.message}`,
                          );
                        });
                    }
                  })
                  .catch(error => {
                    this.logger.error(
                      `Erro ao verificar dispositivo após timeout: ${error.message}`,
                    );
                  });
              }
            })
            .catch(error => {
              this.logger.error(`Erro ao verificar autenticação após timeout: ${error.message}`);
            });
        }
      },
      10 * 60 * 1000, // 10 minutos
    );
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

  // Valida e retorna um ID de sessão
  private validateSessionId(sessionId?: string): string {
    // Se foi passado um ID específico, usa ele
    if (sessionId && this.clientPool.has(sessionId)) {
      return sessionId;
    }

    // Se não foi passado um ID específico, tenta usar o ID padrão
    if (this.defaultSessionId && this.clientPool.has(this.defaultSessionId)) {
      return this.defaultSessionId;
    }

    // Se não tem uma sessão válida, pega a primeira disponível que está autenticada
    const sessions = Array.from(this.clientPool.entries());

    // Tenta encontrar uma sessão autenticada
    for (const [sid, data] of sessions) {
      try {
        // Verificação rápida se o cliente parece estar conectado
        if (data.client && data.client.info && data.phoneNumber) {
          this.logger.info(`Usando sessão autenticada disponível: ${sid}`);
          return sid;
        }
      } catch (e) {
        // Ignora erros de verificação e continua para o próximo
        continue;
      }
    }

    // Se não encontrou uma sessão autenticada, usa a primeira disponível
    const firstSession = sessions[0]?.[0];
    if (firstSession) {
      this.logger.warn(`Usando primeira sessão disponível (não autenticada): ${firstSession}`);
      return firstSession;
    }

    // Se ainda não tem uma sessão, lança um erro
    throw new Error('Nenhuma sessão disponível. Autentique um dispositivo primeiro.');
  }

  // Obtém uma sessão padrão para envio de mensagens
  async getDefaultSession(): Promise<string> {
    try {
      // Verifica se já tem uma sessão padrão definida e válida
      if (this.defaultSessionId && this.clientPool.has(this.defaultSessionId)) {
        const isAuthenticated = await this.isAuthenticated(this.defaultSessionId);
        if (isAuthenticated) {
          return this.defaultSessionId;
        }
      }

      // Busca uma sessão autenticada
      const sessions = Array.from(this.clientPool.keys());

      for (const sid of sessions) {
        const isAuthenticated = await this.isAuthenticated(sid);
        if (isAuthenticated) {
          // Define como sessão padrão
          this.defaultSessionId = sid;
          return sid;
        }
      }

      // Se chegou aqui, não encontrou nenhuma sessão autenticada
      throw new Error('Nenhuma sessão autenticada disponível');
    } catch (error) {
      this.logger.error(`Erro ao obter sessão padrão: ${(error as Error).message}`);
      throw error;
    }
  }

  // Define uma sessão como padrão para envio de mensagens
  async setDefaultSession(sessionId: string): Promise<boolean> {
    try {
      if (!this.clientPool.has(sessionId)) {
        throw new Error(`Sessão ${sessionId} não encontrada`);
      }

      const isAuthenticated = await this.isAuthenticated(sessionId);
      if (!isAuthenticated) {
        throw new Error(`Sessão ${sessionId} não está autenticada`);
      }

      this.defaultSessionId = sessionId;
      this.logger.info(`Sessão padrão definida como: ${sessionId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao definir sessão padrão: ${(error as Error).message}`);
      return false;
    }
  }
}
