// Interface para o serviço LLM - segue os princípios I (Interface Segregation) e D (Dependency Inversion)
export interface ILLMService {
  // Processamento de mensagens com IA
  processMessage(message: string, context?: Record<string, any>): Promise<string>;
}
