import { DeviceController } from '../device.controller';
import { DeviceManagementUseCase } from '../../../../domain/usecases/device-management.usecase';
import { ILogger } from '../../../../domain/interfaces/logger.interface';

// Mock da usecase
const mockDeviceManagementUseCase = {
  getAllDevices: jest.fn(),
  getDeviceById: jest.fn(),
  createDevice: jest.fn(),
  updateDevice: jest.fn(),
  removeDevice: jest.fn(),
  reconnectDevice: jest.fn(),
  getDeviceStatus: jest.fn(),
  setDefaultDevice: jest.fn(),
} as jest.Mocked<DeviceManagementUseCase>;

// Mock do logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as jest.Mocked<ILogger>;

// Mock do Fastify
const mockRequest = {
  params: {},
  body: {},
  query: {},
};

const mockReply = {
  view: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  status: jest.fn().mockReturnThis(),
  redirect: jest.fn().mockReturnThis(),
};

describe('DeviceController', () => {
  let controller: DeviceController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DeviceController(mockDeviceManagementUseCase, mockLogger);
  });

  describe('getAllDevices', () => {
    it('should return all devices', async () => {
      // Arrange
      const mockDevices = [
        {
          id: 'device-1',
          name: 'Device 1',
          sessionId: 'session-1',
          isActive: true,
          phoneNumber: '555123456',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastConnected: new Date(),
        },
      ];
      mockDeviceManagementUseCase.getAllDevices.mockResolvedValue(mockDevices);

      // Act
      await controller.getAllDevices(mockRequest as any, mockReply as any);

      // Assert
      expect(mockDeviceManagementUseCase.getAllDevices).toHaveBeenCalled();
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: mockDevices,
        count: mockDevices.length,
      });
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      mockDeviceManagementUseCase.getAllDevices.mockRejectedValue(error);

      // Act
      await controller.getAllDevices(mockRequest as any, mockReply as any);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao buscar todos os dispositivos:'),
      );
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        }),
      );
    });
  });

  describe('getDeviceById', () => {
    it('should return device by ID with status', async () => {
      // Arrange
      const deviceId = 'device-1';
      const mockDevice = {
        id: deviceId,
        name: 'Device 1',
        sessionId: 'session-1',
        isActive: true,
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      };

      mockRequest.params = { id: deviceId };
      mockDeviceManagementUseCase.getDeviceStatus.mockResolvedValue({
        device: mockDevice,
        isConnected: true,
        isDefault: true,
      });

      // Act
      await controller.getDeviceById(mockRequest as any, mockReply as any);

      // Assert
      expect(mockDeviceManagementUseCase.getDeviceStatus).toHaveBeenCalledWith(deviceId);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: {
          ...mockDevice,
          isConnected: true,
          isDefault: true,
        },
      });
    });

    it('should return 404 if device not found', async () => {
      // Arrange
      const deviceId = 'non-existent-device';
      mockRequest.params = { id: deviceId };
      mockDeviceManagementUseCase.getDeviceStatus.mockResolvedValue({
        device: null,
        isConnected: false,
      });

      // Act
      await controller.getDeviceById(mockRequest as any, mockReply as any);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Dispositivo não encontrado',
      });
    });

    it('should handle errors', async () => {
      // Arrange
      const deviceId = 'device-1';
      mockRequest.params = { id: deviceId };
      const error = new Error('Test error');
      mockDeviceManagementUseCase.getDeviceStatus.mockRejectedValue(error);

      // Act
      await controller.getDeviceById(mockRequest as any, mockReply as any);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao buscar dispositivo:'),
      );
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        }),
      );
    });
  });

  describe('createDevice', () => {
    it('should create a new device', async () => {
      // Arrange
      const deviceName = 'New Device';
      const mockCreatedDevice = {
        id: 'new-device-id',
        name: deviceName,
        sessionId: 'new-session-123',
        isActive: true,
        phoneNumber: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: null,
      };

      mockRequest.body = { name: deviceName };
      mockDeviceManagementUseCase.createDevice.mockResolvedValue(mockCreatedDevice);

      // Act
      await controller.createDevice(mockRequest as any, mockReply as any);

      // Assert
      expect(mockDeviceManagementUseCase.createDevice).toHaveBeenCalledWith(deviceName);
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedDevice,
      });
    });

    it('should return 400 if name is missing', async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await controller.createDevice(mockRequest as any, mockReply as any);

      // Assert
      expect(mockDeviceManagementUseCase.createDevice).not.toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Nome do dispositivo é obrigatório',
      });
    });

    it('should handle errors', async () => {
      // Arrange
      mockRequest.body = { name: 'New Device' };
      const error = new Error('Test error');
      mockDeviceManagementUseCase.createDevice.mockRejectedValue(error);

      // Act
      await controller.createDevice(mockRequest as any, mockReply as any);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao criar dispositivo:'),
      );
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        }),
      );
    });
  });

  describe('updateDevice', () => {
    it('should update a device', async () => {
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

      mockRequest.params = { id: deviceId };
      mockRequest.body = { name: newName };
      mockDeviceManagementUseCase.updateDevice.mockResolvedValue(mockUpdatedDevice);

      // Act
      await controller.updateDevice(mockRequest as any, mockReply as any);

      // Assert
      expect(mockDeviceManagementUseCase.updateDevice).toHaveBeenCalledWith(deviceId, {
        name: newName,
      });
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedDevice,
      });
    });

    it('should return 400 if name is missing', async () => {
      // Arrange
      mockRequest.params = { id: 'device-1' };
      mockRequest.body = {};

      // Act
      await controller.updateDevice(mockRequest as any, mockReply as any);

      // Assert
      expect(mockDeviceManagementUseCase.updateDevice).not.toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Nome do dispositivo é obrigatório',
      });
    });

    it('should handle errors', async () => {
      // Arrange
      mockRequest.params = { id: 'device-1' };
      mockRequest.body = { name: 'Updated Device' };
      const error = new Error('Test error');
      mockDeviceManagementUseCase.updateDevice.mockRejectedValue(error);

      // Act
      await controller.updateDevice(mockRequest as any, mockReply as any);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao atualizar dispositivo:'),
      );
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        }),
      );
    });
  });

  describe('deleteDevice', () => {
    it('should delete a device', async () => {
      // Arrange
      const deviceId = 'device-1';
      mockRequest.params = { id: deviceId };
      mockDeviceManagementUseCase.removeDevice.mockResolvedValue(true);

      // Act
      await controller.deleteDevice(mockRequest as any, mockReply as any);

      // Assert
      expect(mockDeviceManagementUseCase.removeDevice).toHaveBeenCalledWith(deviceId);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        message: 'Dispositivo removido com sucesso',
      });
    });

    it('should handle errors', async () => {
      // Arrange
      mockRequest.params = { id: 'device-1' };
      const error = new Error('Test error');
      mockDeviceManagementUseCase.removeDevice.mockRejectedValue(error);

      // Act
      await controller.deleteDevice(mockRequest as any, mockReply as any);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao remover dispositivo:'),
      );
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        }),
      );
    });
  });

  describe('reconnectDevice', () => {
    it('should reconnect a device', async () => {
      // Arrange
      const deviceId = 'device-1';
      const mockReconnectedDevice = {
        id: deviceId,
        name: 'Device 1',
        sessionId: 'session-1',
        isActive: true,
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      };

      mockRequest.params = { id: deviceId };
      mockDeviceManagementUseCase.reconnectDevice.mockResolvedValue(mockReconnectedDevice);

      // Act
      await controller.reconnectDevice(mockRequest as any, mockReply as any);

      // Assert
      expect(mockDeviceManagementUseCase.reconnectDevice).toHaveBeenCalledWith(deviceId);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: mockReconnectedDevice,
        message: 'Solicitação de reconexão enviada com sucesso',
      });
    });

    it('should handle errors', async () => {
      // Arrange
      mockRequest.params = { id: 'device-1' };
      const error = new Error('Test error');
      mockDeviceManagementUseCase.reconnectDevice.mockRejectedValue(error);

      // Act
      await controller.reconnectDevice(mockRequest as any, mockReply as any);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao reconectar dispositivo:'),
      );
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        }),
      );
    });
  });

  describe('getDevicesStatus', () => {
    it('should return status of all devices', async () => {
      // Arrange
      const mockDevices = [
        {
          id: 'device-1',
          name: 'Device 1',
          sessionId: 'session-1',
          isActive: true,
          phoneNumber: '555123456',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastConnected: new Date(),
        },
        {
          id: 'device-2',
          name: 'Device 2',
          sessionId: 'session-2',
          isActive: false,
          phoneNumber: '555654321',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastConnected: new Date(),
        },
      ];

      mockDeviceManagementUseCase.getAllDevices.mockResolvedValue(mockDevices);

      // Mock device status results
      mockDeviceManagementUseCase.getDeviceStatus
        .mockResolvedValueOnce({
          device: mockDevices[0],
          isConnected: true,
          isDefault: true,
        })
        .mockResolvedValueOnce({
          device: mockDevices[1],
          isConnected: false,
          isDefault: false,
        });

      // Act
      await controller.getDevicesStatus(mockRequest as any, mockReply as any);

      // Assert
      expect(mockDeviceManagementUseCase.getAllDevices).toHaveBeenCalled();
      expect(mockDeviceManagementUseCase.getDeviceStatus).toHaveBeenCalledTimes(2);
      expect(mockDeviceManagementUseCase.getDeviceStatus).toHaveBeenCalledWith('device-1');
      expect(mockDeviceManagementUseCase.getDeviceStatus).toHaveBeenCalledWith('device-2');

      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        devices: expect.arrayContaining([
          expect.objectContaining({
            id: 'device-1',
            isActive: true,
            isConnected: true,
          }),
          expect.objectContaining({
            id: 'device-2',
            isActive: false,
            isConnected: false,
          }),
        ]),
        count: 2,
      });
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      mockDeviceManagementUseCase.getAllDevices.mockRejectedValue(error);

      // Act
      await controller.getDevicesStatus(mockRequest as any, mockReply as any);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao obter status dos dispositivos:'),
      );
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        }),
      );
    });
  });

  describe('renderDevicesPage', () => {
    it('should render devices page with correct data', async () => {
      // Arrange
      const mockDevices = [
        {
          id: 'device-1',
          name: 'Device 1',
          sessionId: 'session-1',
          isActive: true,
          phoneNumber: '555123456',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastConnected: new Date(),
        },
      ];

      mockDeviceManagementUseCase.getAllDevices.mockResolvedValue(mockDevices);
      mockDeviceManagementUseCase.getDeviceStatus.mockResolvedValue({
        device: mockDevices[0],
        isConnected: true,
        isDefault: true,
      });

      // Act
      await controller.renderDevicesPage(mockRequest as any, mockReply as any);

      // Assert
      expect(mockDeviceManagementUseCase.getAllDevices).toHaveBeenCalled();
      expect(mockDeviceManagementUseCase.getDeviceStatus).toHaveBeenCalledWith('device-1');
      expect(mockReply.view).toHaveBeenCalledWith('devices', {
        title: 'Gerenciador de Dispositivos WhatsApp',
        devices: [
          expect.objectContaining({
            id: 'device-1',
            name: 'Device 1',
            isConnected: true,
          }),
        ],
      });
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      mockDeviceManagementUseCase.getAllDevices.mockRejectedValue(error);

      // Act
      await controller.renderDevicesPage(mockRequest as any, mockReply as any);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao renderizar página de dispositivos:'),
      );
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        }),
      );
    });
  });

  describe('renderDeviceQRCodePage', () => {
    it('should render QR code page for a device', async () => {
      // Arrange
      const deviceId = 'device-1';
      const mockDevice = {
        id: deviceId,
        name: 'Device 1',
        sessionId: 'session-1',
        isActive: true,
        phoneNumber: '555123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastConnected: new Date(),
      };
      const qrCode = 'test-qr-code';

      mockRequest.params = { id: deviceId };
      mockDeviceManagementUseCase.getDeviceStatus.mockResolvedValue({
        device: mockDevice,
        isConnected: false,
        qrCode,
        isDefault: false,
      });

      // Act
      await controller.renderDeviceQRCodePage(mockRequest as any, mockReply as any);

      // Assert
      expect(mockDeviceManagementUseCase.getDeviceStatus).toHaveBeenCalledWith(deviceId);
      expect(mockReply.view).toHaveBeenCalledWith('device-qrcode', {
        title: `QR Code - ${mockDevice.name}`,
        device: mockDevice,
        qrCode,
        isAuthenticated: false,
        isDefault: false,
      });
    });

    it('should redirect if device is not found', async () => {
      // Arrange
      mockRequest.params = { id: 'non-existent-device' };
      mockDeviceManagementUseCase.getDeviceStatus.mockResolvedValue({
        device: null,
        isConnected: false,
      });

      // Act
      await controller.renderDeviceQRCodePage(mockRequest as any, mockReply as any);

      // Assert
      expect(mockReply.redirect).toHaveBeenCalledWith('/devices?error=Dispositivo não encontrado');
    });

    it('should handle errors', async () => {
      // Arrange
      mockRequest.params = { id: 'device-1' };
      const error = new Error('Test error');
      mockDeviceManagementUseCase.getDeviceStatus.mockRejectedValue(error);

      // Act
      await controller.renderDeviceQRCodePage(mockRequest as any, mockReply as any);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao renderizar página de QR Code:'),
      );
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        }),
      );
    });
  });

  describe('setDefaultDevice', () => {
    it('should set device as default', async () => {
      // Arrange
      const deviceId = 'device-1';
      mockRequest.params = { id: deviceId };
      mockDeviceManagementUseCase.setDefaultDevice.mockResolvedValue(true);

      // Act
      await controller.setDefaultDevice(mockRequest as any, mockReply as any);

      // Assert
      expect(mockDeviceManagementUseCase.setDefaultDevice).toHaveBeenCalledWith(deviceId);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        message: 'Dispositivo definido como padrão com sucesso',
      });
    });

    it('should handle failure to set default device', async () => {
      // Arrange
      const deviceId = 'device-1';
      mockRequest.params = { id: deviceId };
      mockDeviceManagementUseCase.setDefaultDevice.mockResolvedValue(false);

      // Act
      await controller.setDefaultDevice(mockRequest as any, mockReply as any);

      // Assert
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        message: 'Não foi possível definir o dispositivo como padrão',
      });
    });

    it('should handle errors', async () => {
      // Arrange
      mockRequest.params = { id: 'device-1' };
      const error = new Error('Test error');
      mockDeviceManagementUseCase.setDefaultDevice.mockRejectedValue(error);

      // Act
      await controller.setDefaultDevice(mockRequest as any, mockReply as any);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao definir dispositivo padrão:'),
      );
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        }),
      );
    });
  });
});
