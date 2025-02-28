## Scripts disponíveis

- **build**: Compila o TypeScript para JavaScript
  ```bash
  npm run build
  ```

- **start**: Inicia a aplicação a partir do código compilado
  ```bash
  npm run start
  ```

- **dev**: Inicia a aplicação em modo de desenvolvimento com hot-reload
  ```bash
  npm run dev
  ```

- **lint**: Executa o linting do código
  ```bash
  npm run lint
  ```

- **lint:fix**: Corrige automaticamente os problemas de linting
  ```bash
  npm run lint:fix
  ```

- **format**: Formata o código usando Prettier
  ```bash
  npm run format
  ```

- **format:check**: Verifica se o código está formatado corretamente
  ```bash
  npm run format:check
  ```

## Padronização de código

Este projeto utiliza ferramentas de padronização de código para manter a consistência e qualidade:

- **ESLint**: Analisa o código para identificar problemas
- **Prettier**: Formata o código seguindo um estilo consistente
- **Husky**: Executa hooks Git para verificar o código antes dos commits
- **lint-staged**: Executa linting e formatação apenas nos arquivos alterados

A configuração está integrada com o VSCode para formatar automaticamente ao salvar.

## Testes

O projeto utiliza Jest para testes unitários. Para executar os testes:

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch (para desenvolvimento)
npm run test:watch

# Gerar relatório de cobertura
npm run test:coverage
```

A cobertura de testes inclui:

- **Entidades de domínio**: Testes para a classe `Message`
- **Casos de uso**: Testes para `SendMessageUseCase` e `ReceiveMessageUseCase`
- **Controladores HTTP**: Testes para `WebhookController` e `QRCodeController`
- **Adaptadores de serviço**: Testes para `HttpLLMAdapter`

### Mocks

Para facilitar os testes, usamos mocks para simular dependências externas:

- **WhatsApp Service**: Mocks para simular envio e recebimento de mensagens
- **LLM Service**: Mocks para simular respostas da API LLM
- **Fastify Request/Reply**: Mocks para simular requisições HTTP

### Cobertura de código

Para garantir a qualidade do código, buscamos manter a cobertura de testes acima de 80%.

## Padronização de código e Qualidade

Este projeto utiliza ferramentas de padronização de código e garantia de qualidade:

### Linting e Formatação

- **ESLint**: Analisa o código para identificar problemas
- **Prettier**: Formata o código seguindo um estilo consistente
- **Husky**: Executa hooks Git para verificar o código antes dos commits
- **lint-staged**: Executa linting e formatação apenas nos arquivos alterados

### Testes

- **Jest**: Framework de testes para JavaScript/TypeScript
- **ts-jest**: Integração do TypeScript com Jest
- **Cobertura de código**: Relatórios de cobertura para identificar áreas não testadas

A configuração está integrada com o VSCode para formatar automaticamente ao salvar.