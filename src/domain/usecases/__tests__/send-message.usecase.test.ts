import { SendMessageUseCase } from '../send-message.usecase';
import { Message } from '../../entities/message';
import { IWhatsAppService } from '../../interfaces/whatsapp-service.interface';
import { ILogger } from '../../interfaces/logger.interface';
import { WhatsAppDeviceRepository } from '../../../infrastructure/repositories/whatsapp-device.repository';

// Mock implementations
const mockWhatsAppService: jest.Mocked<IWhatsAppService> = {
  initialize: jest.fn(),
  getQRCode: jest.fn(),
  isAuthenticated: jest.fn(),
  getActiveSessions: jest.fn(),
  closeSession: jest.fn(),
  getSessionInfo: jest.fn(),
  getDefaultSession: jest.fn(),
  setDefaultSession: jest.fn(),
  sendTextMessage: jest.fn(),
  sendMediaMessage: jest.fn(),
  onMessage: jest.fn(),
  onQRCodeUpdate: jest.fn(),
  onAuthenticated: jest.fn(),
  onDisconnected: jest.fn(),
};

// Mock para o repositório de dispositivos
const mockDeviceRepository: jest.Mocked<WhatsAppDeviceRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySessionId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateConnectionStatus: jest.fn(),
  delete: jest.fn(),
} as unknown as jest.Mocked<WhatsAppDeviceRepository>;

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
    useCase = new SendMessageUseCase(mockWhatsAppService, mockLogger, mockDeviceRepository);

    // Mock valores padrão para findAll
    mockDeviceRepository.findAll.mockResolvedValue([
      {
        id: 'device-1',
        name: 'Test Device 1',
        sessionId: 'session-1',
        isActive: true,
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      },
    ]);
  });

  it('should send text message successfully using default device', async () => {
    // Arrange
    const to = '1234567890';
    const content = { text: 'Hello, text message!' };
    const mockMessage = new Message('msg-id', 'sender', to, content, new Date(), true);

    mockWhatsAppService.sendTextMessage.mockResolvedValueOnce(mockMessage);

    // Act
    const result = await useCase.execute(to, content);

    // Assert
    expect(mockDeviceRepository.findAll).toHaveBeenCalled();
    expect(mockWhatsAppService.sendTextMessage).toHaveBeenCalledWith(to, content.text, 'session-1');
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(`Enviando mensagem para ${to} usando dispositivo padrão`),
    );
    expect(result).toBe(mockMessage);
  });

  it('should send text message with specific device ID', async () => {
    // Arrange
    const to = '1234567890';
    const deviceId = 'device-2';
    const content = { text: 'Hello, text message!' };
    const mockMessage = new Message('msg-id', 'sender', to, content, new Date(), true);

    mockDeviceRepository.findById.mockResolvedValueOnce({
      id: deviceId,
      name: 'Test Device 2',
      sessionId: 'session-2',
      isActive: true,
      phoneNumber: '555654321',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastConnected: new Date(),
    });
    mockWhatsAppService.sendTextMessage.mockResolvedValueOnce(mockMessage);

    // Act
    const result = await useCase.execute(to, content, deviceId);

    // Assert
    expect(mockDeviceRepository.findById).toHaveBeenCalledWith(deviceId);
    expect(mockWhatsAppService.sendTextMessage).toHaveBeenCalledWith(to, content.text, 'session-2');
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(`Enviando mensagem para ${to} usando dispositivo`),
    );
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
    expect(mockWhatsAppService.sendMediaMessage).toHaveBeenCalledWith(
      to,
      media,
      {
        caption: 'Test caption',
        type: 'image/jpeg',
      },
      'session-1',
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(`Enviando mensagem para ${to}`),
    );
    expect(result).toBe(mockMessage);
  });

  it('should throw error for invalid content', async () => {
    // Arrange
    const to = '1234567890';
    const content = {}; // Empty content, no text or media

    // Act & Assert
    await expect(useCase.execute(to, content)).rejects.toThrow('Conteúdo da mensagem inválido');
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockWhatsAppService.sendTextMessage).not.toHaveBeenCalled();
    expect(mockWhatsAppService.sendMediaMessage).not.toHaveBeenCalled();
  });

  it('should throw error when device is not found', async () => {
    // Arrange
    const to = '1234567890';
    const deviceId = 'non-existent-device';
    const content = { text: 'Hello test' };

    mockDeviceRepository.findById.mockResolvedValueOnce(null);

    // Act & Assert
    await expect(useCase.execute(to, content, deviceId)).rejects.toThrow(
      `Dispositivo ${deviceId} não encontrado`,
    );
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should throw error when device is not active', async () => {
    // Arrange
    const to = '1234567890';
    const deviceId = 'inactive-device';
    const content = { text: 'Hello test' };

    mockDeviceRepository.findById.mockResolvedValueOnce({
      id: deviceId,
      name: 'Inactive Device',
      sessionId: 'session-inactive',
      isActive: false,
      phoneNumber: '555654321',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastConnected: new Date(),
    });

    // Act & Assert
    await expect(useCase.execute(to, content, deviceId)).rejects.toThrow(
      `Dispositivo ${deviceId} (Inactive Device) não está ativo`,
    );
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should throw error when no active devices are available', async () => {
    // Arrange
    const to = '1234567890';
    const content = { text: 'Hello test' };

    // Sobrescreve o mock padrão para simular que não existem dispositivos ativos
    mockDeviceRepository.findAll.mockResolvedValueOnce([
      {
        id: 'device-1',
        name: 'Inactive Device 1',
        sessionId: 'session-1',
        isActive: false,
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      },
    ]);

    // Act & Assert
    await expect(useCase.execute(to, content)).rejects.toThrow(
      'Nenhum dispositivo ativo encontrado para enviar a mensagem',
    );
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
