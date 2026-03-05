# Guia de Uso — email-service

---

## Índice

- [Pré-requisitos](#pré-requisitos)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Desenvolvimento](#desenvolvimento)
- [Testes](#testes)
- [Produção](#produção)
- [Scripts disponíveis](#scripts-disponíveis)
- [Infraestrutura](#infraestrutura)

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) >= 20
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- npm >= 10

---

## Variáveis de Ambiente

O serviço carrega automaticamente o arquivo `.env.{NODE_ENV}` de acordo com o profile ativo.

| Variável | Obrigatória | Descrição | Exemplo |
|---|---|---|---|
| `NODE_ENV` | ✅ | Profile da aplicação | `development` |
| `KAFKA_BROKERS` | ✅ | Lista de brokers (separada por vírgula) | `localhost:9092` |
| `KAFKA_CLIENT_ID` | ✅ | Identificador do client Kafka | `email-service-dev` |
| `KAFKA_CONSUMER_GROUP` | ✅ | Consumer group do Kafka | `email-service-group-dev` |
| `MAIL_HOST` | ✅ | Host do servidor SMTP | `localhost` |
| `MAIL_PORT` | ✅ | Porta do servidor SMTP | `25` |
| `MAIL_USER` | — | Usuário SMTP (pode ser vazio) | `user@example.com` |
| `MAIL_PASS` | — | Senha SMTP (pode ser vazia) | `secret` |
| `MAIL_FROM` | ✅ | Remetente padrão dos emails | `Email Service <no-reply@example.com>` |
| `MAIL_IGNORE_TLS` | — | Ignorar TLS — útil em dev com smtp4dev | `true` |
| `KAFKAJS_NO_PARTITIONER_WARNING` | — | Suprime warning do KafkaJS v2 | `1` |

Use o arquivo `.env.example` como base para criar os seus arquivos de ambiente:

```bash
cp .env.example .env.development
```

---

## Desenvolvimento

### 1. Instalar dependências

```bash
npm install
```

### 2. Subir a infraestrutura

```bash
npm run infra:dev
```

> Sobe o **Kafka** (KRaft) e o **smtp4dev**. O `kafka-init` aguarda o broker ficar `healthy` (~30s) e cria os tópicos automaticamente.

### 3. Verificar se tudo está de pé

```bash
docker compose -f docker-compose.dev.yml ps
```

Todos os serviços devem aparecer como `Up`:

| Container | Status esperado |
|---|---|
| `email-service-kafka-dev` | `Up (healthy)` |
| `email-service-smtp4dev` | `Up` |

### 4. Iniciar a aplicação

```bash
npm run start:dev
```

> Inicia em **watch mode** — reinicia automaticamente ao salvar alterações.

### 5. Enviar um email de teste

```bash
npm run send:test
```

> Publica uma mensagem no tópico `send-email`. O servidor processa e entrega no smtp4dev.

### 6. Visualizar os emails recebidos

Abra no browser: **http://localhost:5000**

### Parar a infraestrutura

```bash
npm run infra:dev:down
```

---

## Testes

### Unitários

> Isolados — **não precisam de infraestrutura** rodando.

```bash
# Rodar todos os testes
npm test

# Watch mode
npm run test:watch

# Com relatório de cobertura
npm run test:cov
```

Arquivos de teste ficam ao lado do arquivo testado, seguindo a convenção `*.spec.ts`:

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
# 1. Subir a infraestrutura de teste
npm run infra:test

# 2. Rodar os testes e2e
npm run test:e2e

# 3. Parar a infraestrutura de teste
npm run infra:test:down
```

> As portas do ambiente de teste são as mesmas do dev. **Não rode os dois simultaneamente.**

---

## Produção

> Em produção não existe `docker-compose` nem arquivo `.env`. As variáveis devem ser injetadas pelo CI/CD (GitHub Actions, AWS ECS, Kubernetes, etc.).

```bash
# 1. Gerar o build
npm run build

# 2. Iniciar a aplicação compilada
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

---

## Scripts disponíveis

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

## Infraestrutura

### Containers de desenvolvimento

| Container | Imagem | Porta host | Porta container | URL |
|---|---|---|---|---|
| `email-service-kafka-dev` | `apache/kafka:3.9.0` | `9092` | `29092` (EXTERNAL) | `localhost:9092` |
| `email-service-smtp4dev` | `rnwood/smtp4dev:3.3.2` | `25` | `25` | `localhost:25` |
| `email-service-smtp4dev` | `rnwood/smtp4dev:3.3.2` | `5000` | `8080` | http://localhost:5000 |

### Containers de teste

| Container | Imagem | Porta host | Porta container | URL |
|---|---|---|---|---|
| `email-service-kafka-test` | `apache/kafka:3.9.0` | `9092` | `29092` (EXTERNAL) | `localhost:9092` |
| `email-service-smtp4dev-test` | `rnwood/smtp4dev:3.3.2` | `25` | `25` | `localhost:25` |
| `email-service-smtp4dev-test` | `rnwood/smtp4dev:3.3.2` | `5000` | `8080` | http://localhost:5000 |

### Configuração do Kafka (KRaft)

O Kafka roda em modo **KRaft** (sem ZooKeeper) com três listeners:

| Listener | Endereço | Uso |
|---|---|---|
| `PLAINTEXT` | `kafka:9092` | Comunicação interna container-to-container |
| `EXTERNAL` | `0.0.0.0:29092` → `localhost:9092` | Acesso externo pelo host |
| `CONTROLLER` | `kafka:9093` | Eleição de líder (KRaft) |

