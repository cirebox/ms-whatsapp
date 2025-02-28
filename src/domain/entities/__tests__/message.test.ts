import { Message } from '../message';

describe('Message Entity', () => {
  describe('fromWhatsApp', () => {
    it('should create message from WhatsApp data with _serialized ID', () => {
      const whatsappData = {
        id: {
          _serialized: 'test-id-serialized',
        },
        from: 'sender-number@c.us',
        to: 'recipient-number@c.us',
        body: 'Hello, WhatsApp!',
        timestamp: 1625097600, // Unix timestamp
        fromMe: false,
      };

      const message = Message.fromWhatsApp(whatsappData);

      expect(message.id).toBe('test-id-serialized');
      expect(message.from).toBe('sender-number@c.us');
      expect(message.to).toBe('recipient-number@c.us');
      expect(message.content.text).toBe('Hello, WhatsApp!');
      expect(message.isFromMe).toBe(false);
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    it('should create message from WhatsApp data with _data structure', () => {
      const whatsappData = {
        id: 'test-id',
        _data: {
          from: 'sender-number@c.us',
          to: 'recipient-number@c.us',
          body: 'Hello from _data!',
          fromMe: true,
        },
        timestamp: 1625097600,
      };

      const message = Message.fromWhatsApp(whatsappData);

      expect(message.id).toBe('test-id');
      expect(message.from).toBe('sender-number@c.us');
      expect(message.to).toBe('recipient-number@c.us');
      expect(message.content.text).toBe('Hello from _data!');
      expect(message.isFromMe).toBe(true);
      expect(message.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('fromApi', () => {
    it('should create message from API data', () => {
      const apiData = {
        id: 'api-message-id',
        from: 'sender-number',
        to: 'recipient-number',
        content: {
          text: 'Hello from API!',
          media: Buffer.from('test-media'),
          mediaType: 'image/jpeg',
          caption: 'Test image',
        },
        timestamp: new Date('2023-01-01T12:00:00Z'),
        isFromMe: true,
      };

      const message = Message.fromApi(apiData);

      expect(message.id).toBe('api-message-id');
      expect(message.from).toBe('sender-number');
      expect(message.to).toBe('recipient-number');
      expect(message.content.text).toBe('Hello from API!');
      expect(message.content.media).toEqual(Buffer.from('test-media'));
      expect(message.content.mediaType).toBe('image/jpeg');
      expect(message.content.caption).toBe('Test image');
      expect(message.isFromMe).toBe(true);
      expect(message.timestamp).toEqual(apiData.timestamp);
    });

    it('should handle missing ID in API data', () => {
      const apiData = {
        from: 'sender-number',
        to: 'recipient-number',
        content: {
          text: 'Hello missing ID!',
        },
      };

      const message = Message.fromApi(apiData);

      expect(message.id).toBe('');
      expect(message.from).toBe('sender-number');
      expect(message.to).toBe('recipient-number');
      expect(message.content.text).toBe('Hello missing ID!');
      expect(message.timestamp).toBeInstanceOf(Date);
      expect(message.isFromMe).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should convert message to JSON representation', () => {
      const message = new Message(
        'test-id',
        'sender',
        'recipient',
        { text: 'Hello, JSON!' },
        new Date('2023-01-01T12:00:00Z'),
        true,
      );

      const json = message.toJSON();

      expect(json).toEqual({
        id: 'test-id',
        from: 'sender',
        to: 'recipient',
        content: { text: 'Hello, JSON!' },
        timestamp: message.timestamp,
        isFromMe: true,
      });
    });
  });
});
