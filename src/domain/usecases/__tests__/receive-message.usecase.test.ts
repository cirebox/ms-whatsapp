import { ReceiveMessageUseCase } from '../receive-message.usecase';
import { Message } from '../../entities/message';
import { IWhatsAppService } from '../../interfaces/whatsapp-service.interface';
import { ILLMService } from '../../interfaces/llm-service.interface';
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

const mockLLMService: jest.Mocked<ILLMService> = {
  processMessage: jest.fn(),
};

const mockLogger: jest.Mocked<ILogger> = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe('ReceiveMessageUseCase', () => {
  let useCase: ReceiveMessageUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ReceiveMessageUseCase(mockWhatsAppService, mockLLMService, mockLogger);
  });

  it('should ignore messages sent by the bot itself', async () => {
    // Arrange
    const message = new Message(
      'msg-id',
      'sender',
      'recipient',
      { text: 'Hello, test!' },
      new Date(),
      true, // isFromMe = true
    );

    // Act
    await useCase.execute(message);

    // Assert
    expect(mockLLMService.processMessage).not.toHaveBeenCalled();
    expect(mockWhatsAppService.sendTextMessage).not.toHaveBeenCalled();
  });

  it('should process incoming messages and send responses', async () => {
    // Arrange
    const message = new Message(
      'msg-id',
      'sender',
      'recipient',
      { text: 'Hello, bot!' },
      new Date(),
      false, // isFromMe = false
    );

    const llmResponse = 'Hello, human! How can I help you?';
    mockLLMService.processMessage.mockResolvedValueOnce(llmResponse);

    // Act
    await useCase.execute(message);

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(`Mensagem recebida de ${message.from}`),
    );

    expect(mockLLMService.processMessage).toHaveBeenCalledWith(
      message.content.text,
      expect.objectContaining({
        from: message.from,
        timestamp: message.timestamp,
      }),
    );

    expect(mockWhatsAppService.sendTextMessage).toHaveBeenCalledWith(message.from, llmResponse);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(`Resposta enviada para ${message.from}`),
    );
  });

  it('should handle messages without text content', async () => {
    // Arrange
    const message = new Message(
      'msg-id',
      'sender',
      'recipient',
      { media: Buffer.from('test media') },
      new Date(),
      false,
    );

    // Act
    await useCase.execute(message);

    // Assert
    expect(mockLLMService.processMessage).not.toHaveBeenCalled();
    expect(mockWhatsAppService.sendTextMessage).not.toHaveBeenCalled();
  });

  it('should handle errors during message processing', async () => {
    // Arrange
    const message = new Message(
      'msg-id',
      'sender',
      'recipient',
      { text: 'Hello, error test!' },
      new Date(),
      false,
    );

    const error = new Error('LLM processing error');
    mockLLMService.processMessage.mockRejectedValueOnce(error);

    // Act
    await useCase.execute(message);

    // Assert
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Erro ao processar mensagem recebida:'),
    );
    expect(mockWhatsAppService.sendTextMessage).not.toHaveBeenCalled();
  });

  it('should register message handler correctly', () => {
    // Act
    useCase.registerHandler();

    // Assert
    expect(mockWhatsAppService.onMessage).toHaveBeenCalledTimes(1);
    expect(mockWhatsAppService.onMessage).toHaveBeenCalledWith(expect.any(Function));

    // Test the callback function
    const callback = mockWhatsAppService.onMessage.mock.calls[0][0];
    expect(typeof callback).toBe('function');
  });
});
