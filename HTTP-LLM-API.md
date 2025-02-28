# Integração com API LLM Externa

Este documento explica como configurar e integrar com uma API LLM externa para processamento de mensagens.

## Configuração Básica

Configure as seguintes variáveis no arquivo `.env`:

```ini
# URL da API LLM externa
LLM_API_URL=http://seu-servico-llm.com/api/chat

# Chave de API (se necessário)
LLM_API_KEY=your_api_key_here
```

## Formatos de Requisição Personalizados

Você pode personalizar o formato da requisição para se adequar à API de destino usando a variável `LLM_REQUEST_FORMAT`.

### Exemplo: Formato OpenAI

```ini
LLM_REQUEST_FORMAT={"model":"gpt-3.5-turbo","messages":[{"role":"system","content":"Você é um assistente útil"},{"role":"user","content":"{message}"}]}
```

### Exemplo: Formato Claude

```ini
LLM_REQUEST_FORMAT={"model":"claude-3-haiku-20240307","system":"Você é um assistente útil","messages":[{"role":"user","content":"{message}"}]}
```

### Variáveis disponíveis

No formato personalizado, você pode usar as seguintes variáveis:
- `{message}`: O texto da mensagem recebida
- `{context}`: O contexto da mensagem (como número de telefone, timestamp, etc)

## Extração de Respostas

Por padrão, o adaptador tentará extrair a resposta automaticamente de vários formatos comuns.
Você pode especificar o caminho exato para a resposta usando a variável `LLM_RESPONSE_PATH`.

### Exemplo: Caminho para resposta OpenAI

```ini
LLM_RESPONSE_PATH=choices.0.message.content
```

### Exemplo: Caminho para resposta Claude

```ini
LLM_RESPONSE_PATH=content.0.text
```

## Exemplos de Configurações Completas

### Exemplo para OpenAI

```ini
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
LLM_REQUEST_FORMAT={"model":"gpt-3.5-turbo","messages":[{"role":"system","content":"Você é um assistente útil e conciso para WhatsApp"},{"role":"user","content":"{message}"}]}
LLM_RESPONSE_PATH=choices.0.message.content
```

### Exemplo para Claude

```ini
LLM_API_URL=https://api.anthropic.com/v1/messages
LLM_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
LLM_REQUEST_FORMAT={"model":"claude-3-haiku-20240307","system":"Você é um assistente útil e conciso para WhatsApp","messages":[{"role":"user","content":"{message}"}]}
LLM_RESPONSE_PATH=content.0.text
```

### Exemplo para um serviço LLM personalizado

```ini
LLM_API_URL=http://seu-servidor-interno:8000/chat
LLM_API_KEY=chave-interna-123
LLM_REQUEST_FORMAT={"text":"{message}","context":{context},"max_length":500}
LLM_RESPONSE_PATH=response
```

## Depuração

Para depurar a integração com a API LLM:

1. Configure `LOG_LEVEL=debug` no arquivo `.env`
2. Verifique os logs do servidor para ver:
   - O payload completo enviado para a API
   - A resposta recebida da API
   - Quaisquer erros de comunicação

## Desenvolvendo sua Própria API LLM

Se você estiver desenvolvendo sua própria API LLM para integrar com este sistema, ela deve:

1. Aceitar requisições POST
2. Processar um corpo JSON
3. Retornar a resposta em formato JSON
4. Incluir o texto da resposta em um campo previsível

Exemplo de resposta JSON simples:
```json
{
  "response": "Olá! Em que posso ajudar?",
  "status": "success"
}
```