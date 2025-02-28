import pino from 'pino';
import env from './env';

// Configuração do logger com pino-pretty para formatar logs de forma mais legível
const logger = pino({
  level: env.logger.level,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

export default logger;
