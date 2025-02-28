import dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

interface EnvConfig {
  server: {
    port: number;
    host: string;
  };
  llm: {
    apiUrl: string;
    apiKey: string;
    requestFormat: string; // JSON string com o formato da requisição
    responsePath: string; // Caminho para extrair a resposta (ex: "choices.0.message.content")
  };
  logger: {
    level: string;
  };
}

// Encapsula e valida as variáveis de ambiente
const env: EnvConfig = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
  },
  llm: {
    apiUrl: process.env.LLM_API_URL || '',
    apiKey: process.env.LLM_API_KEY || '',
    requestFormat: process.env.LLM_REQUEST_FORMAT || '',
    responsePath: process.env.LLM_RESPONSE_PATH || '',
  },
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Verifica se todas as variáveis necessárias estão definidas
if (!env.llm.apiUrl) {
  console.warn(
    '\x1b[33m%s\x1b[0m',
    'AVISO: LLM_API_URL não está definida. O serviço LLM não funcionará corretamente.',
  );
  console.warn(
    '\x1b[33m%s\x1b[0m',
    'Para habilitar as respostas automáticas com IA, configure LLM_API_URL no arquivo .env',
  );
}

export default env;
