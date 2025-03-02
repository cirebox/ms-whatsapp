import { QRCodeController } from '../qrcode.controller';
import { IWhatsAppService } from '../../../../domain/interfaces/whatsapp-service.interface';
import { ILogger } from '../../../../domain/interfaces/logger.interface';

// Mock implementations
const mockWhatsAppService = {
  getQRCode: jest.fn(),
  isAuthenticated: jest.fn(),
  onQRCodeUpdate: jest.fn(),
  onAuthenticated: jest.fn(),
} as unknown as jest.Mocked<IWhatsAppService>;

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as jest.Mocked<ILogger>;

// Mock Fastify request and reply
const mockRequest = {
  raw: {
    on: jest.fn(),
  },
};

const mockReply = {
  view: jest.fn().mockResolvedValue(undefined),
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockResolvedValue(undefined),
  raw: {
    writeHead: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  },
};

describe('QRCodeController', () => {
  let controller: QRCodeController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new QRCodeController(mockWhatsAppService, mockLogger);

    // Reset mockReply chain
    mockReply.status.mockReturnValue(mockReply);
  });

  describe('renderQRCodePage', () => {
    it('should render QR code page with correct data when not authenticated', async () => {
      // Arrange
      const qrCode = 'data:image/png;base64,fakeQrCodeData';
      mockWhatsAppService.getQRCode.mockResolvedValueOnce(qrCode);
      mockWhatsAppService.isAuthenticated.mockResolvedValueOnce(false);

      // Act
      await controller.renderQRCodePage(mockRequest as any, mockReply as any);

      // Assert
      expect(mockWhatsAppService.getQRCode).toHaveBeenCalled();
      expect(mockWhatsAppService.isAuthenticated).toHaveBeenCalled();
      expect(mockReply.view).toHaveBeenCalledWith('qrcode', {
        qrCode,
        isAuthenticated: false,
        title: 'WhatsApp QR Code Scanner',
      });
    });

    it('should render QR code page with authenticated status', async () => {
      // Arrange
      mockWhatsAppService.getQRCode.mockResolvedValueOnce('');
      mockWhatsAppService.isAuthenticated.mockResolvedValueOnce(true);

      // Act
      await controller.renderQRCodePage(mockRequest as any, mockReply as any);

      // Assert
      expect(mockReply.view).toHaveBeenCalledWith('qrcode', {
        qrCode: '',
        isAuthenticated: true,
        title: 'WhatsApp QR Code Scanner',
      });
    });

    it('should handle errors during rendering', async () => {
      // Arrange
      const error = new Error('Rendering error');
      mockWhatsAppService.getQRCode.mockRejectedValueOnce(error);

      // Act
      await controller.renderQRCodePage(mockRequest as any, mockReply as any);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao renderizar página de QR Code:'),
      );
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Erro ao gerar QR Code'),
        }),
      );
    });
  });

  describe('qrCodeStream', () => {
    it('should set up SSE headers correctly', async () => {
      // Arrange
      mockWhatsAppService.getQRCode.mockResolvedValueOnce('fakeQrCodeData');

      // Act
      await controller.qrCodeStream(mockRequest as any, mockReply as any);

      // Assert
      expect(mockReply.raw.writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        }),
      );
    });

    it('should register event handlers', async () => {
      // Arrange
      mockWhatsAppService.getQRCode.mockResolvedValueOnce('fakeQrCodeData');

      // Act
      await controller.qrCodeStream(mockRequest as any, mockReply as any);

      // Assert
      expect(mockWhatsAppService.onQRCodeUpdate).toHaveBeenCalledWith(expect.any(Function));
      expect(mockWhatsAppService.onAuthenticated).toHaveBeenCalledWith(expect.any(Function));
      expect(mockRequest.raw.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should send current QR code if available', async () => {
      // Arrange
      const qrCode = 'fakeQrCodeData';
      mockWhatsAppService.getQRCode.mockResolvedValueOnce(qrCode);

      // Act
      await controller.qrCodeStream(mockRequest as any, mockReply as any);

      // Assert
      expect(mockReply.raw.write).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify({ qrCode })),
      );
    });

    it('should handle errors during stream setup', async () => {
      // Arrange
      const error = new Error('Stream error');
      mockWhatsAppService.getQRCode.mockRejectedValueOnce(error);

      // Act
      await controller.qrCodeStream(mockRequest as any, mockReply as any);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro no stream de QR Code:'),
      );
      expect(mockReply.raw.end).toHaveBeenCalled();
    });
  });

  describe('checkAuthStatus', () => {
    it('should return authenticated status', async () => {
      // Arrange
      mockWhatsAppService.isAuthenticated.mockResolvedValueOnce(true);

      // Act
      await controller.checkAuthStatus(mockRequest as any, mockReply as any);

      // Assert
      expect(mockWhatsAppService.isAuthenticated).toHaveBeenCalled();
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          authenticated: true,
        }),
      );
    });

    it('should return not authenticated status', async () => {
      // Arrange
      mockWhatsAppService.isAuthenticated.mockResolvedValueOnce(false);

      // Act
      await controller.checkAuthStatus(mockRequest as any, mockReply as any);

      // Assert
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          authenticated: false,
        }),
      );
    });

    it('should handle errors during status check', async () => {
      // Arrange
      const error = new Error('Status check error');
      mockWhatsAppService.isAuthenticated.mockRejectedValueOnce(error);

      // Act
      await controller.checkAuthStatus(mockRequest as any, mockReply as any);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao verificar status de autenticação:'),
      );
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Erro ao verificar status de autenticação'),
        }),
      );
    });
  });
});
