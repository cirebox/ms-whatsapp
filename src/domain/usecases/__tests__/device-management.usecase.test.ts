import { DeviceManagementUseCase } from '../device-management.usecase';
import { IWhatsAppService } from '../../interfaces/whatsapp-service.interface';
import { ILogger } from '../../interfaces/logger.interface';
import { WhatsAppDeviceRepository } from '../../../infrastructure/repositories/whatsapp-device.repository';

// Mock das dependências
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

describe('DeviceManagementUseCase', () => {
  let useCase: DeviceManagementUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeviceManagementUseCase(mockWhatsAppService, mockDeviceRepository, mockLogger);
  });

  describe('getAllDevices', () => {
    it('should return all devices from repository', async () => {
      // Arrange
      const mockDevices = [
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
        {
          id: 'device-2',
          name: 'Test Device 2',
          sessionId: 'session-2',
          isActive: false,
          phoneNumber: '555654321',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastConnected: new Date(),
        },
      ];
      mockDeviceRepository.findAll.mockResolvedValue(mockDevices);

      // Act
      const result = await useCase.getAllDevices();

      // Assert
      expect(mockDeviceRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockDevices);
    });

    it('should propagate errors from repository', async () => {
      // Arrange
      const error = new Error('Database error');
      mockDeviceRepository.findAll.mockRejectedValue(error);

      // Act & Assert
      await expect(useCase.getAllDevices()).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao buscar todos os dispositivos:'),
      );
    });
  });

  describe('getDeviceById', () => {
    it('should return device by ID', async () => {
      // Arrange
      const deviceId = 'device-1';
      const mockDevice = {
        id: deviceId,
        name: 'Test Device 1',
        sessionId: 'session-1',
        isActive: true,
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      };
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      // Act
      const result = await useCase.getDeviceById(deviceId);

      // Assert
      expect(mockDeviceRepository.findById).toHaveBeenCalledWith(deviceId);
      expect(result).toEqual(mockDevice);
    });

    it('should return null if device not found', async () => {
      // Arrange
      const deviceId = 'non-existent-device';
      mockDeviceRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.getDeviceById(deviceId);

      // Assert
      expect(result).toBeNull();
    });

    it('should propagate errors', async () => {
      // Arrange
      const deviceId = 'device-1';
      const error = new Error('Database error');
      mockDeviceRepository.findById.mockRejectedValue(error);

      // Act & Assert
      await expect(useCase.getDeviceById(deviceId)).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Erro ao buscar dispositivo ${deviceId}:`),
      );
    });
  });

  describe('createDevice', () => {
    it('should create a new device with generated session ID', async () => {
      // Arrange
      const deviceName = 'New Device';
      const sessionId = 'new-session-123';
      const mockDevice = {
        id: 'new-device-id',
        name: deviceName,
        sessionId,
        isActive: true,
        phoneNumber: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: null,
      };

      mockWhatsAppService.initialize.mockResolvedValue(undefined);
      mockWhatsAppService.getActiveSessions.mockResolvedValue([sessionId]);
      mockDeviceRepository.create.mockResolvedValue(mockDevice);

      // Act
      const result = await useCase.createDevice(deviceName);

      // Assert
      expect(mockWhatsAppService.initialize).toHaveBeenCalled();
      expect(mockWhatsAppService.getActiveSessions).toHaveBeenCalled();
      expect(mockDeviceRepository.create).toHaveBeenCalledWith({
        name: deviceName,
        sessionId,
      });
      expect(result).toEqual(mockDevice);
    });

    it('should create a device with provided session ID', async () => {
      // Arrange
      const deviceName = 'New Device';
      const sessionId = 'provided-session-123';
      const mockDevice = {
        id: 'new-device-id',
        name: deviceName,
        sessionId,
        isActive: true,
        phoneNumber: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: null,
      };

      mockDeviceRepository.create.mockResolvedValue(mockDevice);

      // Act
      const result = await useCase.createDevice(deviceName, sessionId);

      // Assert
      expect(mockWhatsAppService.initialize).not.toHaveBeenCalled();
      expect(mockDeviceRepository.create).toHaveBeenCalledWith({
        name: deviceName,
        sessionId,
      });
      expect(result).toEqual(mockDevice);
    });

    it('should propagate errors', async () => {
      // Arrange
      const deviceName = 'New Device';
      const error = new Error('Creation error');
      mockWhatsAppService.initialize.mockRejectedValue(error);

      // Act & Assert
      await expect(useCase.createDevice(deviceName)).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao criar dispositivo:'),
      );
    });
  });

  describe('updateDevice', () => {
    it('should update device name', async () => {
      // Arrange
      const deviceId = 'device-1';
      const newName = 'Updated Device Name';
      const mockUpdatedDevice = {
        id: deviceId,
        name: newName,
        sessionId: 'session-1',
        isActive: true,
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      };

      mockDeviceRepository.update.mockResolvedValue(mockUpdatedDevice);

      // Act
      const result = await useCase.updateDevice(deviceId, { name: newName });

      // Assert
      expect(mockDeviceRepository.update).toHaveBeenCalledWith(deviceId, { name: newName });
      expect(result).toEqual(mockUpdatedDevice);
    });

    it('should propagate errors', async () => {
      // Arrange
      const deviceId = 'device-1';
      const newName = 'Updated Device Name';
      const error = new Error('Update error');
      mockDeviceRepository.update.mockRejectedValue(error);

      // Act & Assert
      await expect(useCase.updateDevice(deviceId, { name: newName })).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Erro ao atualizar dispositivo ${deviceId}:`),
      );
    });
  });

  describe('removeDevice', () => {
    it('should remove device', async () => {
      // Arrange
      const deviceId = 'device-1';
      const mockDevice = {
        id: deviceId,
        name: 'Test Device 1',
        sessionId: 'session-1',
        isActive: true,
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      };

      mockDeviceRepository.findById.mockResolvedValue(mockDevice);
      mockWhatsAppService.closeSession.mockResolvedValue(true);
      mockDeviceRepository.delete.mockResolvedValue(mockDevice);

      // Act
      const result = await useCase.removeDevice(deviceId);

      // Assert
      expect(mockDeviceRepository.findById).toHaveBeenCalledWith(deviceId);
      expect(mockWhatsAppService.closeSession).toHaveBeenCalledWith(mockDevice.sessionId);
      expect(mockDeviceRepository.delete).toHaveBeenCalledWith(deviceId);
      expect(result).toBe(true);
    });

    it('should throw error if device not found', async () => {
      // Arrange
      const deviceId = 'non-existent-device';
      mockDeviceRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.removeDevice(deviceId)).rejects.toThrow(
        `Dispositivo ${deviceId} não encontrado`,
      );
    });

    it('should propagate errors', async () => {
      // Arrange
      const deviceId = 'device-1';
      const mockDevice = {
        id: deviceId,
        name: 'Test Device 1',
        sessionId: 'session-1',
        isActive: true,
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      };

      mockDeviceRepository.findById.mockResolvedValue(mockDevice);
      const error = new Error('Deletion error');
      mockWhatsAppService.closeSession.mockRejectedValue(error);

      // Act & Assert
      await expect(useCase.removeDevice(deviceId)).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Erro ao remover dispositivo ${deviceId}:`),
      );
    });
  });

  describe('reconnectDevice', () => {
    it('should reconnect device successfully', async () => {
      // Arrange
      const deviceId = 'device-1';
      const mockDevice = {
        id: deviceId,
        name: 'Test Device 1',
        sessionId: 'session-1',
        isActive: false,
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      };

      const mockUpdatedDevice = {
        ...mockDevice,
        isActive: true,
        lastConnected: expect.any(Date),
      };

      mockDeviceRepository.findById.mockResolvedValue(mockDevice);
      mockWhatsAppService.closeSession.mockResolvedValue(true);
      mockWhatsAppService.initialize.mockResolvedValue(undefined);
      mockDeviceRepository.update.mockResolvedValue(mockUpdatedDevice);

      // Act
      const result = await useCase.reconnectDevice(deviceId);

      // Assert
      expect(mockDeviceRepository.findById).toHaveBeenCalledWith(deviceId);
      expect(mockWhatsAppService.closeSession).toHaveBeenCalledWith(mockDevice.sessionId);
      expect(mockWhatsAppService.initialize).toHaveBeenCalledWith(mockDevice.sessionId);
      expect(mockDeviceRepository.update).toHaveBeenCalledWith(deviceId, {
        isActive: true,
        lastConnected: expect.any(Date),
      });
      expect(result).toEqual(mockUpdatedDevice);
    });

    it('should throw error if device not found', async () => {
      // Arrange
      const deviceId = 'non-existent-device';
      mockDeviceRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.reconnectDevice(deviceId)).rejects.toThrow(
        `Dispositivo ${deviceId} não encontrado`,
      );
    });

    it('should continue if closing session fails', async () => {
      // Arrange
      const deviceId = 'device-1';
      const mockDevice = {
        id: deviceId,
        name: 'Test Device 1',
        sessionId: 'session-1',
        isActive: false,
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      };

      const mockUpdatedDevice = {
        ...mockDevice,
        isActive: true,
        lastConnected: expect.any(Date),
      };

      mockDeviceRepository.findById.mockResolvedValue(mockDevice);
      mockWhatsAppService.closeSession.mockRejectedValue(new Error('Close session error'));
      mockWhatsAppService.initialize.mockResolvedValue(undefined);
      mockDeviceRepository.update.mockResolvedValue(mockUpdatedDevice);

      // Act
      const result = await useCase.reconnectDevice(deviceId);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao fechar sessão existente:'),
      );
      expect(mockWhatsAppService.initialize).toHaveBeenCalledWith(mockDevice.sessionId);
      expect(result).toEqual(mockUpdatedDevice);
    });
  });

  describe('getDeviceStatus', () => {
    it('should return device status when device exists', async () => {
      // Arrange
      const deviceId = 'device-1';
      const mockDevice = {
        id: deviceId,
        name: 'Test Device 1',
        sessionId: 'session-1',
        isActive: true,
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      };
      const qrCode = 'test-qr-code';

      mockDeviceRepository.findById.mockResolvedValue(mockDevice);
      mockWhatsAppService.isAuthenticated.mockResolvedValue(true);
      mockWhatsAppService.getDefaultSession.mockResolvedValue('session-1');

      // Act
      const result = await useCase.getDeviceStatus(deviceId);

      // Assert
      expect(mockDeviceRepository.findById).toHaveBeenCalledWith(deviceId);
      expect(mockWhatsAppService.isAuthenticated).toHaveBeenCalledWith(mockDevice.sessionId);
      expect(result).toEqual({
        device: mockDevice,
        isConnected: true,
        isDefault: true,
      });
    });

    it('should return device status when device is not connected', async () => {
      // Arrange
      const deviceId = 'device-1';
      const mockDevice = {
        id: deviceId,
        name: 'Test Device 1',
        sessionId: 'session-1',
        isActive: false,
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      };
      const qrCode = 'test-qr-code';

      mockDeviceRepository.findById.mockResolvedValue(mockDevice);
      mockWhatsAppService.isAuthenticated.mockResolvedValue(false);
      mockWhatsAppService.getQRCode.mockResolvedValue(qrCode);
      mockWhatsAppService.getDefaultSession.mockResolvedValue('different-session');

      // Act
      const result = await useCase.getDeviceStatus(deviceId);

      // Assert
      expect(mockDeviceRepository.findById).toHaveBeenCalledWith(deviceId);
      expect(mockWhatsAppService.isAuthenticated).toHaveBeenCalledWith(mockDevice.sessionId);
      expect(mockWhatsAppService.getQRCode).toHaveBeenCalledWith(mockDevice.sessionId);
      expect(result).toEqual({
        device: mockDevice,
        isConnected: false,
        qrCode,
        isDefault: false,
      });
    });

    it('should update device status if DB status differs from actual status', async () => {
      // Arrange
      const deviceId = 'device-1';
      const mockDevice = {
        id: deviceId,
        name: 'Test Device 1',
        sessionId: 'session-1',
        isActive: false, // Status in DB is false
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      };

      mockDeviceRepository.findById.mockResolvedValue(mockDevice);
      mockWhatsAppService.isAuthenticated.mockResolvedValue(true); // But actual status is true
      mockDeviceRepository.updateConnectionStatus.mockResolvedValue({
        ...mockDevice,
        isActive: true,
      });

      // Act
      const result = await useCase.getDeviceStatus(deviceId);

      // Assert
      expect(mockDeviceRepository.updateConnectionStatus).toHaveBeenCalledWith(deviceId, true);
      expect(result).toEqual({
        device: mockDevice,
        isConnected: true,
        isDefault: expect.any(Boolean),
      });
    });

    it('should return null device info when device not found', async () => {
      // Arrange
      const deviceId = 'non-existent-device';
      mockDeviceRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.getDeviceStatus(deviceId);

      // Assert
      expect(result).toEqual({
        device: null,
        isConnected: false,
      });
    });

    it('should ignore error when checking if device is default', async () => {
      // Arrange
      const deviceId = 'device-1';
      const mockDevice = {
        id: deviceId,
        name: 'Test Device 1',
        sessionId: 'session-1',
        isActive: true,
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      };

      mockDeviceRepository.findById.mockResolvedValue(mockDevice);
      mockWhatsAppService.isAuthenticated.mockResolvedValue(true);
      mockWhatsAppService.getDefaultSession.mockRejectedValue(new Error('Session error'));

      // Act
      const result = await useCase.getDeviceStatus(deviceId);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao verificar dispositivo padrão:'),
      );
      expect(result).toEqual({
        device: mockDevice,
        isConnected: true,
        isDefault: false,
      });
    });
  });

  describe('setDefaultDevice', () => {
    it('should set device as default', async () => {
      // Arrange
      const deviceId = 'device-1';
      const mockDevice = {
        id: deviceId,
        name: 'Test Device 1',
        sessionId: 'session-1',
        isActive: true,
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      };

      mockDeviceRepository.findById.mockResolvedValue(mockDevice);
      mockWhatsAppService.isAuthenticated.mockResolvedValue(true);
      mockWhatsAppService.setDefaultSession.mockResolvedValue(true);

      // Act
      const result = await useCase.setDefaultDevice(deviceId);

      // Assert
      expect(mockDeviceRepository.findById).toHaveBeenCalledWith(deviceId);
      expect(mockWhatsAppService.isAuthenticated).toHaveBeenCalledWith(mockDevice.sessionId);
      expect(mockWhatsAppService.setDefaultSession).toHaveBeenCalledWith(mockDevice.sessionId);
      expect(result).toBe(true);
    });

    it('should throw error if device not found', async () => {
      // Arrange
      const deviceId = 'non-existent-device';
      mockDeviceRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.setDefaultDevice(deviceId)).rejects.toThrow(
        `Dispositivo ${deviceId} não encontrado`,
      );
    });

    it('should throw error if device is not authenticated', async () => {
      // Arrange
      const deviceId = 'device-1';
      const mockDevice = {
        id: deviceId,
        name: 'Test Device 1',
        sessionId: 'session-1',
        isActive: true,
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      };

      mockDeviceRepository.findById.mockResolvedValue(mockDevice);
      mockWhatsAppService.isAuthenticated.mockResolvedValue(false);

      // Act & Assert
      await expect(useCase.setDefaultDevice(deviceId)).rejects.toThrow(
        `Dispositivo ${mockDevice.name} não está conectado ao WhatsApp`,
      );
    });

    it('should propagate errors', async () => {
      // Arrange
      const deviceId = 'device-1';
      const mockDevice = {
        id: deviceId,
        name: 'Test Device 1',
        sessionId: 'session-1',
        isActive: true,
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      };

      mockDeviceRepository.findById.mockResolvedValue(mockDevice);
      mockWhatsAppService.isAuthenticated.mockResolvedValue(true);

      const error = new Error('Set default error');
      mockWhatsAppService.setDefaultSession.mockRejectedValue(error);

      // Act & Assert
      await expect(useCase.setDefaultDevice(deviceId)).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Erro ao definir dispositivo padrão ${deviceId}:`),
      );
    });
  });
});
