# Email Microservice (NestJS + Kafka + Nodemailer + Docker)

Microserviço de envio de emails **event-driven**, construído com **NestJS**, **Apache Kafka** e **Nodemailer**.

> 📖 Para instruções de uso, comandos e configuração consulte [`docs/USAGE.md`](./docs/USAGE.md).

---

## Visão Geral

O `email-service` é responsável por consumir eventos de envio de email publicados no Kafka e entregá-los via SMTP. Ele é totalmente desacoplado do produtor — qualquer serviço da plataforma pode publicar um evento no tópico `send-email` e o `email-service` se encarrega do envio.

O serviço implementa:

- ✅ Consumo de eventos via Kafka (KRaft, sem ZooKeeper)
- ✅ Envio de emails via SMTP com Nodemailer
- ✅ Retry automático com até 3 tentativas
- ✅ Dead Letter Queue (DLQ) para falhas permanentes
- ✅ Validação de payload antes do processamento
- ✅ Commit manual de offset (at-least-once delivery)
- ✅ Validação de variáveis de ambiente na inicialização (Joi)
- ✅ Suporte a múltiplos profiles (`development`, `test`, `production`)

---

## Tecnologias

| Tecnologia | Versão | Função |
|---|---|---|
| NestJS | ^11 | Framework principal |
| TypeScript | ^5 | Linguagem |
| KafkaJS | via `@nestjs/microservices` | Consumo de eventos Kafka |
| Nodemailer | ^6 | Envio de emails via SMTP |
| Joi | ^17 | Validação de variáveis de ambiente |
| Apache Kafka | 3.9.0 (KRaft) | Message broker |
| Docker | — | Infraestrutura local |
| smtp4dev | 3.3.2 | Servidor SMTP fake para desenvolvimento |

---

## Arquitetura

O serviço segue os princípios de **Clean Architecture** / **Arquitetura Hexagonal**, garantindo que o domínio seja completamente independente de frameworks e infraestrutura.

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
| **Domain** | `src/domain/` | Entidades, Value Objects e Ports (interfaces) |
| **Infrastructure** | `src/infrastructure/` | Adapters concretos: SMTP, Kafka DLQ, config |
| **Shared** | `src/shared/` | Utilitários, enums e interfaces compartilhadas |

---

## Fluxo de Mensagens

```
Producer externo
      │
      ▼
┌──────────────┐   payload válido  ┌─────────────────┐    sucesso    ┌──────────┐
│  send-email  │ ────────────────► │ SendEmailUseCase │ ────────────► │   SMTP   │
│   (tópico)   │                   └────────┬────────┘               └──────────┘
└──────────────┘                            │ falha
      │                                     ▼
      │ payload inválido        ┌──────────────────────┐
      │ ─────────────────────► │   send-email-retry   │  (até 3 tentativas)
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

| Situação | Comportamento |
|---|---|
| Payload inválido | Vai direto para a DLQ, sem retry |
| Falha no envio (1ª–3ª tentativa) | Publica no tópico `send-email-retry` |
| Retries esgotados (4ª falha) | Publica no tópico `send-email-dlq` |

### Tópicos Kafka

| Tópico | Retenção | Descrição |
|---|---|---|
| `send-email` | 7 dias | Tópico principal — recebe eventos de envio |
| `send-email-retry` | 30 minutos | Fila de retry — mensagens que falharam |
| `send-email-dlq` | 30 dias | Dead Letter Queue — falhas permanentes |

### Formato do evento

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

## Estrutura do Projeto

```
email-service/
├── docs/
│   └── USAGE.md                   # Instruções de uso e comandos
├── docker/
│   └── kafka/
│       ├── server.properties      # Config Kafka (dev)
│       └── server.test.properties # Config Kafka (test)
├── scripts/
│   └── send-test-email.mjs        # Script de teste manual de envio
├── src/
│   ├── main.ts
│   ├── app.module.ts
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
├── .env.development
├── .env.test
├── .env.example
├── docker-compose.dev.yml
├── docker-compose.test.yml
└── package.json
```

---

## Profiles

| Profile | Arquivo `.env` carregado | Quando usar |
|---|---|---|
| `development` | `.env.development` | Desenvolvimento local |
| `test` | `.env.test` | Testes unitários e e2e |
| `production` | nenhum | Produção — variáveis via CI/CD |

> ⚠️ Em produção **não existe** arquivo `.env`. As variáveis de ambiente devem ser injetadas pela plataforma (GitHub Actions, AWS ECS, Kubernetes, etc.).

