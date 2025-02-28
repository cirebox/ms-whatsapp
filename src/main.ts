import { createServer } from './server';
import env from './config/env';
import logger from './config/logger';

// Função principal que inicia o servidor
async function startServer(): Promise<void> {
  try {
    logger.info('Iniciando servidor WhatsApp API...');

    // Cria o servidor e obtém os adaptadores
    const { server, adapters } = await createServer();

    // Inicia o servidor na porta e host configurados
    await server.listen({
      port: env.server.port,
      host: env.server.host,
    });

    logger.info(`Servidor HTTP iniciado em http://${env.server.host}:${env.server.port}`);
    logger.info(`Acesse http://localhost:${env.server.port}/qrcode para escanear o QR Code`);

    // Agora inicializa o WhatsApp de forma assíncrona
    logger.info('Inicializando conexão com WhatsApp...');

    try {
      // Inicializa o WhatsApp em segundo plano
      await adapters.whatsApp.initialize();
      logger.info('Conexão com WhatsApp inicializada com sucesso');
    } catch (whatsappError) {
      // Em caso de falha na inicialização do WhatsApp, apenas logamos o erro
      // mas mantemos o servidor HTTP funcionando
      logger.error(`Erro ao inicializar WhatsApp: ${(whatsappError as Error).message}`);
      logger.warn(
        'O servidor HTTP continuará funcionando, mas as funções de WhatsApp estarão indisponíveis',
      );
    }

    // Gerencia o encerramento do servidor
    const shutdown = async (): Promise<void> => {
      logger.info('Encerrando servidor...');
      await server.close();
      process.exit(0);
    };

    // Captura sinais de encerramento
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error(`Erro ao iniciar o servidor: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Inicia o servidor
startServer();
