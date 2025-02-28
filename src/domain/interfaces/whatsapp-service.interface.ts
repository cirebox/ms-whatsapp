import { Message } from '../entities/message';

// Interface para o serviço WhatsApp - segue os princípios I (Interface Segregation) e D (Dependency Inversion)
export interface IWhatsAppService {
  // Inicialização e autenticação
  initialize(): Promise<void>;
  getQRCode(): Promise<string>;
  isAuthenticated(): Promise<boolean>;

  // Envio de mensagens
  sendTextMessage(to: string, text: string): Promise<Message>;
  sendMediaMessage(
    to: string,
    media: Buffer,
    options?: { caption?: string; type?: string },
  ): Promise<Message>;

  // Eventos e handling
  onMessage(callback: (message: Message) => Promise<void>): void;
  onQRCodeUpdate(callback: (qrcode: string) => void): void;
  onAuthenticated(callback: () => void): void;
  onDisconnected(callback: () => void): void;
}
