import { Message } from '../entities/message';

// Interface para o serviço WhatsApp - segue os princípios I (Interface Segregation) e D (Dependency Inversion)
export interface IWhatsAppService {
  // Inicialização e autenticação
  initialize(sessionId?: string): Promise<void>;
  getQRCode(sessionId?: string): Promise<string>;
  isAuthenticated(sessionId?: string): Promise<boolean>;

  // Gerenciamento de sessões
  getActiveSessions(): Promise<string[]>;
  closeSession(sessionId: string): Promise<boolean>;
  getSessionInfo(sessionId: string): Promise<any>;

  // Gerenciamento de sessão padrão
  getDefaultSession(): Promise<string>;
  setDefaultSession(sessionId: string): Promise<boolean>;

  // Envio de mensagens
  sendTextMessage(to: string, text: string, sessionId?: string): Promise<Message>;
  sendMediaMessage(
    to: string,
    media: Buffer,
    options?: { caption?: string; type?: string },
    sessionId?: string,
  ): Promise<Message>;

  // Eventos e handling
  onMessage(
    callback: (message: Message, sessionId: string) => Promise<void>,
    sessionId?: string,
  ): void;
  onQRCodeUpdate(callback: (qrcode: string, sessionId: string) => void, sessionId?: string): void;
  onAuthenticated(callback: (sessionId: string) => void, sessionId?: string): void;
  onDisconnected(callback: (sessionId: string) => void, sessionId?: string): void;
}
