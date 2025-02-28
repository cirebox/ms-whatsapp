import { SendMessageUseCase } from '../send-message.usecase';
import { Message } from '../../entities/message';
import { IWhatsAppService } from '../../interfaces/whatsapp-service.interface';
import { ILogger } from '../../interfaces/logger.interface';

// Mock implementations
const mockWhatsAppService: jest.Mocked<IWhatsAppService> = {
  initialize: jest.fn(),
  getQRCode: jest.fn(),
  isAuthenticated: jest.fn(),
  sendTextMessage: jest.fn(),
  sendMediaMessage: jest.fn(),
  onMessage: jest.fn(),
  onQRCodeUpdate: jest.fn(),
  onAuthenticated: jest.fn(),
  onDisconnected: jest.fn(),
};

const mockLogger: jest.Mocked<ILogger> = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe('SendMessageUseCase', () => {
  let useCase: SendMessageUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new SendMessageUseCase(mockWhatsAppService, mockLogger);
  });

  it('should send text message successfully', async () => {
    // Arrange
    const to = '1234567890';
    const content = { text: 'Hello, text message!' };
    const mockMessage = new Message('msg-id', 'sender', to, content, new Date(), true);

    mockWhatsAppService.sendTextMessage.mockResolvedValueOnce(mockMessage);

    // Act
    const result = await useCase.execute(to, content);

    // Assert
    expect(mockWhatsAppService.sendTextMessage).toHaveBeenCalledWith(to, content.text);
    expect(mockLogger.info).toHaveBeenCalledWith(`Enviando mensagem para ${to}`);
    expect(result).toBe(mockMessage);
  });

  it('should send media message successfully', async () => {
    // Arrange
    const to = '1234567890';
    const media = Buffer.from('test media data');
    const content = {
      media: media,
      mediaType: 'image/jpeg',
      caption: 'Test caption',
    };

    const mockMessage = new Message('msg-id', 'sender', to, content, new Date(), true);

    mockWhatsAppService.sendMediaMessage.mockResolvedValueOnce(mockMessage);

    // Act
    const result = await useCase.execute(to, content);

    // Assert
    expect(mockWhatsAppService.sendMediaMessage).toHaveBeenCalledWith(to, media, {
      caption: 'Test caption',
      type: 'image/jpeg',
    });
    expect(mockLogger.info).toHaveBeenCalledWith(`Enviando mensagem para ${to}`);
    expect(result).toBe(mockMessage);
  });

  it('should throw error for invalid content', async () => {
    // Arrange
    const to = '1234567890';
    const content = {}; // Empty content, no text or media

    // Act & Assert
    await expect(useCase.execute(to, content)).rejects.toThrow('Conteúdo da mensagem inválido');
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should propagate errors from WhatsApp service', async () => {
    // Arrange
    const to = '1234567890';
    const content = { text: 'Hello, error test!' };
    const error = new Error('WhatsApp service error');

    mockWhatsAppService.sendTextMessage.mockRejectedValueOnce(error);

    // Act & Assert
    await expect(useCase.execute(to, content)).rejects.toThrow(error);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Erro ao enviar mensagem:'),
    );
  });
});
