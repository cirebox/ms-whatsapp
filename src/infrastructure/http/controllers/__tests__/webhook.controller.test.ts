import { WebhookController } from '../webhook.controller';
import { SendMessageUseCase } from '../../../../domain/usecases/send-message.usecase';
import { Message } from '../../../../domain/entities/message';
import { IWhatsAppService } from '../../../../domain/interfaces/whatsapp-service.interface';
import { ILogger } from '../../../../domain/interfaces/logger.interface';

// Mock implementations
const mockSendMessageUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<SendMessageUseCase>;

const mockWhatsAppService = {} as jest.Mocked<IWhatsAppService>;

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as jest.Mocked<ILogger>;

// Mock Fastify request and reply
const mockReply = {
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockResolvedValue(undefined),
};

describe('WebhookController', () => {
  let controller: WebhookController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new WebhookController(mockSendMessageUseCase, mockLogger, mockWhatsAppService);

    // Reset mockReply chain
    mockReply.status.mockReturnValue(mockReply);
  });

  describe('sendMessage', () => {
    it('should return 400 if "to" is missing', async () => {
      // Arrange
      const request = {
        body: {
          content: {
            text: 'Test message',
          },
        },
      };

      // Act
      await controller.sendMessage(request as any, mockReply as any);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Campo "to" é obrigatório'),
        }),
      );
      expect(mockSendMessageUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return 400 if content is missing text and media', async () => {
      // Arrange
      const request = {
        body: {
          to: '1234567890',
          content: {},
        },
      };

      // Act
      await controller.sendMessage(request as any, mockReply as any);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('A mensagem deve conter texto ou mídia'),
        }),
      );
      expect(mockSendMessageUseCase.execute).not.toHaveBeenCalled();
    });

    it('should process text message successfully', async () => {
      // Arrange
      const request = {
        body: {
          to: '1234567890',
          content: {
            text: 'Hello, webhook test!',
          },
        },
      };

      const mockMessage = new Message(
        'msg-id',
        'sender',
        request.body.to,
        request.body.content,
        new Date(),
        true,
      );

      mockSendMessageUseCase.execute.mockResolvedValueOnce(mockMessage);

      // Act
      await controller.sendMessage(request as any, mockReply as any);

      // Assert
      expect(mockSendMessageUseCase.execute).toHaveBeenCalledWith(
        request.body.to,
        expect.objectContaining({
          text: request.body.content.text,
        }),
      );

      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: mockMessage.toJSON(),
        }),
      );
    });

    it('should process media message successfully', async () => {
      // Arrange
      const base64Media = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/';
      const request = {
        body: {
          to: '1234567890',
          content: {
            media: base64Media,
            mediaType: 'image/jpeg',
            caption: 'Test image',
          },
        },
      };

      const mockMessage = new Message(
        'msg-id',
        'sender',
        request.body.to,
        {
          media: Buffer.from('test'),
          mediaType: 'image/jpeg',
          caption: 'Test image',
        },
        new Date(),
        true,
      );

      mockSendMessageUseCase.execute.mockResolvedValueOnce(mockMessage);

      // Act
      await controller.sendMessage(request as any, mockReply as any);

      // Assert
      expect(mockSendMessageUseCase.execute).toHaveBeenCalledWith(
        request.body.to,
        expect.objectContaining({
          mediaType: 'image/jpeg',
          caption: 'Test image',
          media: expect.any(Buffer),
        }),
      );

      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: mockMessage.toJSON(),
        }),
      );
    });

    it('should handle errors during message sending', async () => {
      // Arrange
      const request = {
        body: {
          to: '1234567890',
          content: {
            text: 'Hello, error test!',
          },
        },
      };

      const error = new Error('Error sending message');
      mockSendMessageUseCase.execute.mockRejectedValueOnce(error);

      // Act
      await controller.sendMessage(request as any, mockReply as any);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao enviar mensagem via webhook:'),
      );
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: error.message,
        }),
      );
    });
  });

  describe('healthCheck', () => {
    it('should return online status', async () => {
      // Act
      await controller.healthCheck({} as any, mockReply as any);

      // Assert
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'online',
        }),
      );
    });

    it('should include uptime and timestamp', async () => {
      // Act
      await controller.healthCheck({} as any, mockReply as any);

      // Assert
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'online',
          uptime: expect.any(Number),
          timestamp: expect.any(String),
        }),
      );

      // Get the timestamp from the call
      const response = mockReply.send.mock.calls[0][0];
      expect(new Date(response.timestamp).toString()).not.toBe('Invalid Date');
    });
  });
});
