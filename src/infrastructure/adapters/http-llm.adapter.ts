import { ILLMService } from '../../domain/interfaces/llm-service.interface';
import { ILogger } from '../../domain/interfaces/logger.interface';
import env from '../../config/env';
import axios, { AxiosInstance } from 'axios';

export interface LLMRequestConfig {
  headers?: Record<string, string>;
  payload?: Record<string, any>;
}

export class HttpLLMAdapter implements ILLMService {
  private client: AxiosInstance;
  private apiUrl: string;

  constructor(private logger: ILogger) {
    // Inicializa o cliente HTTP
    this.client = axios.create({
      timeout: 30000, // 30 segundos de timeout
    });

    this.apiUrl = env.llm.apiUrl || '';

    if (!this.apiUrl) {
      this.logger.warn('LLM API URL não configurada. Respostas automáticas não funcionarão.');
    }
  }

  // Processa uma mensagem enviando para a API LLM externa
  async processMessage(message: string, context?: Record<string, any>): Promise<string> {
    try {
      // Verifica se a URL da API está configurada
      if (!this.apiUrl) {
        return 'Resposta automática não disponível. Contate o administrador para configurar a URL da API LLM.';
      }

      this.logger.info(`Enviando mensagem para API LLM externa: "${message.substring(0, 50)}..."`);

      // Prepara o payload e headers com base na configuração
      const config = this.prepareRequestConfig(message, context);

      // Faz a chamada à API externa
      const response = await this.client.post(
        this.apiUrl,
        {
          prompt: message,
          model: 'llama-3.2-1b-preview',
        },
        {
          headers: config.headers,
        },
      );

      // Extrai a resposta da API com fallback para diferentes formatos comuns
      const responseText = this.extractResponseText(response.data);

      this.logger.debug(`Resposta da API LLM: "${responseText.substring(0, 50)}..."`);
      return responseText;
    } catch (error) {
      this.logger.error(`Erro ao processar mensagem com API LLM: ${(error as Error).message}`);
      return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.';
    }
  }

  // Prepara a configuração da requisição com base no modelo da API configurada
  private prepareRequestConfig(message: string, context?: Record<string, any>): LLMRequestConfig {
    // Headers padrão
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Adiciona o token de autenticação se configurado
    if (env.llm.apiKey) {
      headers['Authorization'] = `Bearer ${env.llm.apiKey}`;
    }

    // Constrói um payload básico que pode ser personalizado conforme necessário
    const payload: Record<string, any> = {
      message: message,
      context: context || {},
    };

    // Personaliza o payload com base em configurações específicas
    if (env.llm.requestFormat) {
      try {
        const customPayload = JSON.parse(env.llm.requestFormat);
        // Substitui variáveis no formato personalizado
        const formattedPayload = this.formatPayload(customPayload, { message, context });
        return { headers, payload: formattedPayload };
      } catch (error) {
        this.logger.error(
          `Erro ao processar formato de requisição personalizado: ${(error as Error).message}`,
        );
        // Em caso de erro, usa o payload padrão
      }
    }

    return { headers, payload };
  }

  // Formata o payload substituindo variáveis
  private formatPayload(
    template: any,
    data: { message: string; context?: Record<string, any> },
  ): any {
    if (typeof template === 'string') {
      // Substitui variáveis no formato {varName}
      return template.replace(/\{(\w+)\}/g, (match, key) => {
        if (key === 'message') return data.message;
        if (key === 'context' && data.context) return JSON.stringify(data.context);
        return match; // Retorna o placeholder original se não encontrar uma substituição
      });
    } else if (Array.isArray(template)) {
      return template.map(item => this.formatPayload(item, data));
    } else if (template !== null && typeof template === 'object') {
      const result: Record<string, any> = {};
      for (const key in template) {
        result[key] = this.formatPayload(template[key], data);
      }
      return result;
    }

    // Para tipos primitivos, retorna o valor original
    return template;
  }

  // Extrai o texto da resposta da API com suporte a diferentes formatos
  private extractResponseText(responseData: any): string {
    // Verifica se há um caminho de resposta configurado
    const responsePath = env.llm.responsePath || '';

    responseData = responseData.result || '';

    if (responsePath) {
      try {
        // Acessa a propriedade aninhada usando o caminho configurado (ex: "choices.0.message.content")
        return (
          responsePath
            .split('.')
            .reduce(
              (obj, path) => (obj && obj[path] !== undefined ? obj[path] : undefined),
              responseData.result || responseData,
            ) || 'Resposta não encontrada no formato esperado'
        );
      } catch (error) {
        this.logger.error(
          `Erro ao extrair resposta usando caminho configurado: ${(error as Error).message}`,
        );
      }
    }

    // Tenta extrair a resposta de formatos comuns como fallback
    if (typeof responseData === 'string') {
      return responseData;
    } else if (responseData.text || responseData.response || responseData.message) {
      return responseData.text || responseData.response || responseData.message;
    } else if (responseData.choices && responseData.choices[0]) {
      return responseData.choices[0].message?.content || responseData.choices[0].text || '';
    } else if (responseData.content) {
      return responseData.content;
    }

    // Último recurso: converte a resposta completa para string
    return typeof responseData === 'object' ? JSON.stringify(responseData) : String(responseData);
  }
}
