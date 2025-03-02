import { createServer } from './server';
import env from './config/env';
import logger from './config/logger';

// Função principal que inicia o servidor
async function startServer(): Promise<void> {
  try {
    logger.info('Iniciando servidor WhatsApp API...');

    // Cria o servidor e obtém os adaptadores e serviços
    const { server, services } = await createServer();

    // Inicia o servidor na porta e host configurados
    await server.listen({
      port: env.server.port,
      host: env.server.host,
    });

    logger.info(`Servidor HTTP iniciado em http://${env.server.host}:${env.server.port}`);
    logger.info(
      `Acesse http://localhost:${env.server.port}/devices para gerenciar dispositivos WhatsApp`,
    );

    // Gerencia o encerramento do servidor
    const shutdown = async (): Promise<void> => {
      logger.info('Encerrando servidor...');

      try {
        // Fecha a conexão com o banco de dados
        if (services.prismaService) {
          logger.info('Desconectando do banco de dados...');
          await services.prismaService.onModuleDestroy();
        }

        // Fecha o servidor HTTP
        await server.close();
        logger.info('Servidor encerrado com sucesso');
      } catch (error) {
        logger.error(`Erro ao encerrar servidor: ${(error as Error).message}`);
      }

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
startServer()
  .then(() => logger.info('Servidor iniciado com sucesso'))
  .catch(error => logger.error(`Erro ao iniciar o servidor: ${(error as Error).message}`));
