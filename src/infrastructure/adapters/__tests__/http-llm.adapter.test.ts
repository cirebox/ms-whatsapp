import { HttpLLMAdapter } from '../http-llm.adapter';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock para env config
jest.mock('../../../config/env', () => {
  const mockEnv = {
    llm: {
      apiUrl: 'https://test-llm-api.com/chat',
      apiKey: 'test-api-key',
      requestFormat: '',
      responsePath: '',
    },
    logger: {
      level: 'info',
    },
    server: {
      port: 3000,
      host: 'localhost',
    },
  };

  return {
    __esModule: true,
    default: mockEnv,
    updateForTest: (newValues: Record<string, any>) => {
      Object.assign(mockEnv.llm, newValues);
    },
  };
});

import envConfig from '../../../config/env';

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
    (envConfig as any).updateForTest({
      apiUrl: 'https://test-llm-api.com/chat',
      apiKey: 'test-api-key',
      requestFormat: '',
      responsePath: '',
    });
  });

  it('should format request payload using custom format for OpenAI style', async () => {
    // Configura o mock com formato personalizado para OpenAI
    (envConfig as any).updateForTest({
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
    (envConfig as any).updateForTest({
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
    (envConfig as any).updateForTest({
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
    (envConfig as any).updateForTest({
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
    (envConfig as any).updateForTest({
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
    (envConfig as any).updateForTest({
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
