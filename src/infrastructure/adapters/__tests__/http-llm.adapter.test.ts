import { HttpLLMAdapter } from '../http-llm.adapter';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Utilizando o mesmo mock de config compartilhado com os outros testes
// Importa o mock para poder atualizá-lo nos testes
const envMock = require('../../../config/env');

// Create mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe('HttpLLMAdapter Custom Format Tests', () => {
  let adapter: HttpLLMAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue(mockedAxios as any);

    // Reset env mock para o valor padrão antes de cada teste
    envMock.updateMock({
      apiUrl: 'https://test-llm-api.com/chat',
      apiKey: 'test-api-key',
      requestFormat: '',
      responsePath: '',
    });
  });

  it('should format request payload using custom format for OpenAI style', async () => {
    // Configura o mock com formato personalizado para OpenAI
    envMock.updateMock({
      requestFormat:
        '{"model":"gpt-3.5-turbo","messages":[{"role":"system","content":"Você é um assistente"},{"role":"user","content":"{message}"}]}',
    });

    // Cria o adaptador com a configuração modificada
    adapter = new HttpLLMAdapter(mockLogger);

    const message = 'Test message';
    const mockResponse = { data: { choices: [{ message: { content: 'Response' } }] } };

    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    // Act
    await adapter.processMessage(message);

    // Assert
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Você é um assistente' },
          { role: 'user', content: 'Test message' },
        ],
      },
      expect.any(Object),
    );
  });

  it('should format request payload using custom format for Claude style', async () => {
    // Configura o mock com formato personalizado para Claude
    envMock.updateMock({
      requestFormat:
        '{"model":"claude-3-haiku-20240307","system":"Você é um assistente","messages":[{"role":"user","content":"{message}"}]}',
    });

    // Cria o adaptador com a configuração modificada
    adapter = new HttpLLMAdapter(mockLogger);

    const message = 'Test message';
    const mockResponse = { data: { content: [{ text: 'Response' }] } };

    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    // Act
    await adapter.processMessage(message);

    // Assert
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      {
        model: 'claude-3-haiku-20240307',
        system: 'Você é um assistente',
        messages: [{ role: 'user', content: 'Test message' }],
      },
      expect.any(Object),
    );
  });

  it('should handle context substitution in custom format', async () => {
    // Configura o mock com formato personalizado que inclui contexto
    envMock.updateMock({
      requestFormat: '{"message":"{message}","context":{context}}',
    });

    // Cria o adaptador com a configuração modificada
    adapter = new HttpLLMAdapter(mockLogger);

    const message = 'Test with context';
    const context = { from: '1234567890', timestamp: new Date().toISOString() };
    const mockResponse = { data: { response: 'Test response' } };

    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    // Act
    await adapter.processMessage(message, context);

    // Assert
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      {
        message: 'Test with context',
        context: JSON.stringify(context),
      },
      expect.any(Object),
    );
  });

  it('should extract response using custom response path', async () => {
    // Configura o mock com caminho de resposta personalizado
    envMock.updateMock({
      responsePath: 'data.custom.nested.response',
    });

    // Cria o adaptador com a configuração modificada
    adapter = new HttpLLMAdapter(mockLogger);

    const message = 'Test message';
    const mockResponse = {
      data: {
        data: {
          custom: {
            nested: {
              response: 'Deeply nested response',
            },
          },
        },
      },
    };

    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    // Act
    const result = await adapter.processMessage(message);

    // Assert
    expect(result).toBe('Deeply nested response');
  });

  it('should handle malformed custom request format gracefully', async () => {
    // Configura o mock com formato JSON inválido
    envMock.updateMock({
      requestFormat: 'not-valid-json-format',
    });

    // Cria o adaptador com a configuração modificada
    adapter = new HttpLLMAdapter(mockLogger);

    const message = 'Test message';
    const mockResponse = { data: { response: 'Fallback response' } };

    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    // Act
    await adapter.processMessage(message);

    // Assert
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Erro ao processar formato de requisição personalizado:'),
    );

    // Should still call the API with default payload format
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        message,
      }),
      expect.any(Object),
    );
  });

  it('should handle array structures in custom format', async () => {
    // Configura o mock com formato personalizado que usa arrays
    envMock.updateMock({
      requestFormat:
        '{"messages":[{"type":"text","content":"{message}"},{"type":"metadata","content":{context}}]}',
    });

    // Cria o adaptador com a configuração modificada
    adapter = new HttpLLMAdapter(mockLogger);

    const message = 'Test array format';
    const context = { user: 'test-user' };
    const mockResponse = { data: { response: 'Array response' } };

    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    // Act
    await adapter.processMessage(message, context);

    // Assert
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      {
        messages: [
          { type: 'text', content: 'Test array format' },
          { type: 'metadata', content: JSON.stringify(context) },
        ],
      },
      expect.any(Object),
    );
  });
});
