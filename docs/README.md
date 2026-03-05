# email-service

Microserviço de envio de emails baseado em eventos, construído com **NestJS**, **Kafka** e **Nodemailer**.

---

## Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Fluxo de Mensagens](#fluxo-de-mensagens)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Tópicos Kafka](#tópicos-kafka)
- [Infraestrutura](#infraestrutura)
- [Comandos](#comandos)
- [Testes](#testes)
- [Produção](#produção)

---

## Visão Geral

O `email-service` é um microserviço event-driven que consome eventos do Kafka e envia emails via SMTP. Ele implementa um mecanismo de **retry automático** com até 3 tentativas e encaminha mensagens com falha para uma **Dead Letter Queue (DLQ)**.

### Tecnologias

| Tecnologia | Versão | Função |
|---|---|---|
| NestJS | ^11 | Framework principal |
| KafkaJS | via `@nestjs/microservices` | Consumo de eventos |
| Nodemailer | ^6 | Envio de emails via SMTP |
| Joi | ^17 | Validação de variáveis de ambiente |
| TypeScript | ^5 | Linguagem |
| Docker | — | Infraestrutura local |
| Apache Kafka | 3.9.0 (KRaft) | Message broker |
| smtp4dev | 3.3.2 | SMTP fake para desenvolvimento |

---

## Arquitetura

O serviço segue os princípios de **Clean Architecture** / **Arquitetura Hexagonal**, com separação clara entre camadas:

```
┌─────────────────────────────────────────────────────┐
│                   interfaces/                        │
│         EmailConsumer  │  EmailRetryConsumer         │
│         (Kafka listeners — entry points)             │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                  application/                        │
│              SendEmailUseCase                        │
│         (orquestra a regra de negócio)               │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                   domain/                            │
│   Email (entity) │ EmailAddress (value object)       │
│   EmailSenderPort (port / interface)                 │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│               infrastructure/                        │
│   SmtpEmailAdapter  │  KafkaDlqProducer              │
│   (implementações concretas — adapters)              │
└─────────────────────────────────────────────────────┘
```

### Camadas

| Camada | Pasta | Responsabilidade |
|---|---|---|
| **Interfaces** | `src/interfaces/` | Entry points — consome eventos Kafka |
| **Application** | `src/application/` | Use cases — orquestra o domínio |
| **Domain** | `src/domain/` | Entidades, Value Objects e Ports |
| **Infrastructure** | `src/infrastructure/` | Adapters SMTP, Kafka DLQ, config |
| **Shared** | `src/shared/` | Utilitários, enums, interfaces compartilhadas |

---

## Fluxo de Mensagens

```
Producer externo
      │
      ▼
┌──────────────┐     válido     ┌─────────────────┐     sucesso    ┌──────────┐
│  send-email  │ ─────────────► │ SendEmailUseCase │ ─────────────► │   SMTP   │
│   (tópico)   │                └────────┬────────┘                └──────────┘
└──────────────┘                         │ falha
                                         ▼
                               ┌──────────────────────┐
                               │   send-email-retry   │  (até 3 tentativas)
                               │       (tópico)       │
                               └──────────┬───────────┘
                                          │ falha permanente
                                          ▼
                               ┌──────────────────────┐
                               │   send-email-dlq     │
                               │       (tópico)       │
                               └──────────────────────┘
```

### Regras de retry

- **Máximo de retries:** 3 tentativas
- **Payload inválido:** vai direto para a DLQ, sem retry
- **Falha no envio:** publica no tópico `send-email-retry` com header `x-retry-count`
- **Retries esgotados:** publica no tópico `send-email-dlq` com header `x-error`

### Headers Kafka utilizados

| Header | Tipo | Descrição |
|---|---|---|
| `x-retry-count` | `string` (número) | Contagem atual de tentativas |
| `x-original-topic` | `string` | Tópico de origem da mensagem |
| `x-error` | `string` | Mensagem de erro que causou o envio para DLQ |

---

## Estrutura do Projeto

```
email-service/
├── docs/                          # Documentação
├── docker/
│   └── kafka/
│       ├── server.properties      # Config Kafka dev
│       └── server.test.properties # Config Kafka test
├── scripts/
│   └── send-test-email.mjs        # Script de teste manual de envio
├── src/
│   ├── main.ts                    # Bootstrap da aplicação
│   ├── app.module.ts              # Módulo raiz + Kafka options
│   ├── application/
│   │   ├── commands/
│   │   │   └── send-email.command.ts
│   │   └── use-cases/
│   │       ├── send-email.use-case.ts
│   │       └── send-email.use-case.spec.ts
│   ├── domain/
│   │   ├── entities/
│   │   │   └── email.entity.ts
│   │   ├── errors/
│   │   │   └── email-send-failed.error.ts
│   │   ├── ports/
│   │   │   └── email-sender.port.ts
│   │   └── value-objects/
│   │       ├── email-address.vo.ts
│   │       └── email-address.vo.spec.ts
│   ├── infrastructure/
│   │   ├── config/
│   │   │   └── env.validation.ts
│   │   ├── kafka/
│   │   │   └── kafka-dlq.producer.ts
│   │   └── mail/
│   │       ├── mail.config.ts
│   │       ├── mail.config.token.ts
│   │       └── smtp-email.adapter.ts
│   ├── interfaces/
│   │   └── messaging/
│   │       ├── email.consumer.ts
│   │       ├── email.consumer.spec.ts
│   │       ├── email-retry.consumer.ts
│   │       └── email-retry.consumer.spec.ts
│   └── shared/
│       ├── config/
│       │   ├── app-config.service.ts
│       │   └── profile.ts
│       ├── enums/
│       │   └── app-profile.enum.ts
│       ├── interfaces/
│       │   └── app.environment.ts
│       ├── kafka/
│       │   ├── kafka-topics.ts
│       │   ├── kafka-consumer.utils.ts
│       │   └── kafka-consumer.utils.spec.ts
│       └── messaging/
│           └── send-email.event.ts
├── test/
│   ├── app.e2e-spec.ts
│   ├── jest-e2e.json
│   └── helpers/
│       └── kafka-context.fixture.ts
├── .env.development               # Variáveis de ambiente para dev
├── .env.test                      # Variáveis de ambiente para test
├── .env.example                   # Exemplo de variáveis (commitar)
├── docker-compose.dev.yml         # Infra de desenvolvimento
├── docker-compose.test.yml        # Infra de testes e2e
└── package.json
```

---

## Variáveis de Ambiente

O serviço carrega automaticamente o arquivo `.env.{NODE_ENV}` de acordo com o profile ativo.

| Variável | Obrigatória | Descrição | Exemplo |
|---|---|---|---|
| `NODE_ENV` | ✅ | Profile da aplicação (`development`, `test`, `production`) | `development` |
| `KAFKA_BROKERS` | ✅ | Lista de brokers separada por vírgula | `localhost:9092` |
| `KAFKA_CLIENT_ID` | ✅ | Identificador do client Kafka | `email-service-dev` |
| `KAFKA_CONSUMER_GROUP` | ✅ | Consumer group do Kafka | `email-service-group-dev` |
| `MAIL_HOST` | ✅ | Host do servidor SMTP | `localhost` |
| `MAIL_PORT` | ✅ | Porta do servidor SMTP | `25` |
| `MAIL_USER` | — | Usuário SMTP (pode ser vazio) | `user@example.com` |
| `MAIL_PASS` | — | Senha SMTP (pode ser vazia) | `secret` |
| `MAIL_FROM` | ✅ | Remetente padrão | `Email Service <no-reply@example.com>` |
| `MAIL_IGNORE_TLS` | — | Ignorar TLS (útil em dev) | `true` |
| `KAFKAJS_NO_PARTITIONER_WARNING` | — | Suprime warning do KafkaJS v2 | `1` |

### Profiles disponíveis

| Profile | Arquivo carregado | Quando usar |
|---|---|---|
| `development` | `.env.development` | Desenvolvimento local |
| `test` | `.env.test` | Testes unitários e e2e |
| `production` | nenhum arquivo | Produção — variáveis via CI/CD |

> ⚠️ Em produção **não existe** arquivo `.env`. As variáveis devem ser injetadas pelo ambiente (GitHub Actions, AWS ECS, Kubernetes, etc.).

---

## Tópicos Kafka

| Tópico | Retenção | Descrição |
|---|---|---|
| `send-email` | 7 dias | Tópico principal — recebe eventos de envio |
| `send-email-retry` | 30 minutos | Fila de retry — mensagens que falharam |
| `send-email-dlq` | 30 dias | Dead Letter Queue — falhas permanentes |

### Formato do evento (`SendEmailEvent`)

```json
{
  "to": "destinatario@example.com",
  "subject": "Assunto do email",
  "body": "<h1>Corpo em HTML</h1>",
  "bodyText": "Corpo em texto plano (opcional)"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `to` | `string` | ✅ | Email do destinatário |
| `subject` | `string` | ✅ | Assunto do email |
| `body` | `string` | ✅ | Corpo do email em HTML |
| `bodyText` | `string` | — | Corpo em texto plano (fallback) |

---

## Infraestrutura

### Desenvolvimento

| Container | Imagem | Porta host | Porta container | URL |
|---|---|---|---|---|
| `email-service-kafka-dev` | `apache/kafka:3.9.0` | `9092` | `29092` (EXTERNAL) | `localhost:9092` |
| `email-service-smtp4dev` | `rnwood/smtp4dev:3.3.2` | `25` | `25` | `localhost:25` |
| `email-service-smtp4dev` | `rnwood/smtp4dev:3.3.2` | `5000` | `8080` | http://localhost:5000 |

### Teste (e2e)

| Container | Imagem | Porta host | Porta container | URL |
|---|---|---|---|---|
| `email-service-kafka-test` | `apache/kafka:3.9.0` | `9092` | `29092` (EXTERNAL) | `localhost:9092` |
| `email-service-smtp4dev-test` | `rnwood/smtp4dev:3.3.2` | `25` | `25` | `localhost:25` |
| `email-service-smtp4dev-test` | `rnwood/smtp4dev:3.3.2` | `5000` | `8080` | http://localhost:5000 |

### Configuração do Kafka (KRaft)

O Kafka roda em modo **KRaft** (sem ZooKeeper) com dois listeners:

| Listener | Endereço interno | Uso |
|---|---|---|
| `PLAINTEXT` | `kafka:9092` | Comunicação container-to-container |
| `EXTERNAL` | `0.0.0.0:29092` → `localhost:9092` | Acesso do host |
| `CONTROLLER` | `kafka:9093` | Eleição de líder (KRaft) |

---

## Comandos

### Desenvolvimento

```bash
# 1. Instalar dependências (apenas na primeira vez)
npm install

# 2. Subir infraestrutura (Kafka + smtp4dev)
npm run infra:dev

# 3. Verificar se tudo está de pé
docker compose -f docker-compose.dev.yml ps

# 4. Iniciar a aplicação em watch mode
npm run start:dev

# 5. Enviar email de teste manualmente
npm run send:test

# 6. Parar infraestrutura
npm run infra:dev:down
```

> Após `npm run infra:dev`, o `kafka-init` cria os tópicos automaticamente. Aguarde ~30s até o Kafka ficar `healthy`.

> Visualize os emails enviados em: **http://localhost:5000**

### Todos os scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run build` | Compila o projeto TypeScript |
| `npm run start` | Inicia a aplicação (development) |
| `npm run start:dev` | Inicia em watch mode (hot reload) |
| `npm run start:debug` | Inicia em modo debug com watch |
| `npm run start:prod` | Inicia o build compilado (production) |
| `npm run infra:dev` | Sobe Kafka + smtp4dev (dev) |
| `npm run infra:dev:down` | Derruba infraestrutura dev |
| `npm run infra:test` | Sobe Kafka + smtp4dev (test) |
| `npm run infra:test:down` | Derruba infraestrutura test |
| `npm run send:test` | Publica mensagem de teste no Kafka |
| `npm run lint` | Executa ESLint com auto-fix |
| `npm run format` | Formata código com Prettier |
| `npm test` | Executa testes unitários |
| `npm run test:watch` | Testes em watch mode |
| `npm run test:cov` | Testes com relatório de cobertura |
| `npm run test:e2e` | Executa testes e2e |

---

## Testes

### Unitários

> Isolados, sem necessidade de infraestrutura.

```bash
# Rodar todos os testes unitários
npm test

# Watch mode
npm run test:watch

# Com relatório de cobertura
npm run test:cov
```

Arquivos de teste seguem a convenção `*.spec.ts` ao lado do arquivo testado:

```
src/
├── application/use-cases/send-email.use-case.spec.ts
├── domain/value-objects/email-address.vo.spec.ts
├── interfaces/messaging/email.consumer.spec.ts
└── shared/kafka/kafka-consumer.utils.spec.ts
```

### E2E

> Requerem a infraestrutura de teste rodando.

```bash
# 1. Subir infraestrutura de teste
npm run infra:test

# 2. Rodar os testes e2e
npm run test:e2e

# 3. Parar infraestrutura de teste
npm run infra:test:down
```

---

## Produção

> Em produção não há `docker-compose` nem arquivo `.env`. As variáveis devem ser injetadas pelo CI/CD.

```bash
# Gerar o build
npm run build

# Iniciar a aplicação compilada
npm run start:prod
```

### Variáveis obrigatórias em produção

| Variável | Exemplo |
|---|---|
| `NODE_ENV` | `production` |
| `KAFKA_BROKERS` | `kafka-broker-1:9092,kafka-broker-2:9092` |
| `KAFKA_CLIENT_ID` | `email-service` |
| `KAFKA_CONSUMER_GROUP` | `email-service-group` |
| `MAIL_HOST` | `smtp.example.com` |
| `MAIL_PORT` | `465` |
| `MAIL_USER` | `no-reply@example.com` |
| `MAIL_PASS` | `your-smtp-password` |
| `MAIL_FROM` | `Email Service <no-reply@example.com>` |
| `MAIL_IGNORE_TLS` | `false` |

