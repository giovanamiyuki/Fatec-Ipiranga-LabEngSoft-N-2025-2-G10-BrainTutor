# 💳 Sistema de Pagamento - Brain Tutor

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Instalação e Configuração](#instalação-e-configuração)
4. [Fluxo de Pagamento](#fluxo-de-pagamento)
5. [Stripe Test Mode](#stripe-test-mode)
6. [Endpoints da API](#endpoints-da-api)
7. [Webhooks](#webhooks)
8. [Banco de Dados](#banco-de-dados)
9. [Frontend (Checkout)](#frontend-checkout)
10. [Testes](#testes)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

Sistema completo de pagamento integrado ao Brain Tutor, permitindo:

✅ **Agendamento de Aulas** - Criar e gerenciar aulas entre alunos e professores  
✅ **Processamento de Pagamentos** - Integração com Stripe para pagamentos seguros  
✅ **Webhooks** - Confirmação assíncrona de pagamentos  
✅ **Reembolsos** - Sistema automatizado de reembolso  
✅ **Modo de Teste** - Ambiente completo para testes sem custos  
✅ **Interface Responsiva** - Página de checkout moderna em 3 colunas  

---

## 🏗️ Arquitetura

### **Stack Tecnológico**
- **Backend**: Node.js + Express
- **Banco de Dados**: MySQL 8.0
- **Gateway de Pagamento**: Stripe API
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **DevOps**: Docker + Docker Compose

### **Componentes Principais**

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTE (Browser)                    │
│  ┌────────────────┐    ┌──────────────────────────┐    │
│  │ checkout.html  │ -> │  Stripe.js (Frontend)    │    │
│  └────────────────┘    └──────────────────────────┘    │
└──────────────────────────────┬──────────────────────────┘
                               │ HTTPS
┌──────────────────────────────┼──────────────────────────┐
│          BACKEND API         │                           │
│  ┌───────────────────────────┴─────────────────────┐   │
│  │  /api/lessons (Agendamento)                     │   │
│  │  /api/payments (Processamento)                  │   │
│  │  /api/payments/webhook (Stripe Events)          │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────┐
│       BANCO DE DADOS         │                           │
│  ┌───────────────────────────┴─────────────────────┐   │
│  │  lessons (aulas)                                 │   │
│  │  payments (pagamentos)                           │   │
│  │  payment_webhooks (eventos)                      │   │
│  │  payment_history (histórico)                     │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────┘
                               │
                        ┌──────┴──────┐
                        │   Stripe    │
                        │  (Gateway)  │
                        └─────────────┘
```

---

## ⚙️ Instalação e Configuração

### **1. Pré-requisitos**
- Node.js 18+ ou Docker
- MySQL 8.0+ (ou use Docker)
- Conta no Stripe (gratuita para teste)

### **2. Obter Chaves do Stripe**

1. Acesse [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Crie uma conta gratuita
3. Ative o **Modo de Teste** (toggle no canto superior direito)
4. Vá em **Developers > API keys**
5. Copie:
   - **Publishable key** (começa com `pk_test_`)
   - **Secret key** (começa com `sk_test_`)

### **3. Configurar Variáveis de Ambiente**

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env e adicionar suas chaves do Stripe
nano .env
```

**Adicione no `.env`:**
```env
# Stripe API Keys (Test Mode)
STRIPE_PUBLIC_KEY=pk_test_sua_chave_publica_aqui
STRIPE_SECRET_KEY=sk_test_sua_chave_secreta_aqui
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret_aqui
```

### **4. Instalar Dependências**

**Com Docker:**
```bash
docker-compose up -d
```

**Sem Docker:**
```bash
npm install
cd server && npm install stripe
```

### **5. Executar Migração do Banco de Dados**

```bash
cd server/config
chmod +x run-migration-002.sh
./run-migration-002.sh
```

Ou manualmente:
```bash
mysql -u root -p brain_tutor < server/config/migrations/002_add_payment_system.sql
```

### **6. Atualizar Chave Pública no Frontend**

Edite `client/js/checkout.js` (linha 11):
```javascript
const STRIPE_PUBLIC_KEY = 'pk_test_SUA_CHAVE_PUBLICA_AQUI';
```

### **7. Iniciar Aplicação**

**Com Docker:**
```bash
docker-compose up -d
```

**Sem Docker:**
```bash
npm start
```

Acesse:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

---

## 🔄 Fluxo de Pagamento

### **Passo a Passo**

```
1. ALUNO busca e seleciona um PROFESSOR
   └─> Visualiza preço, disciplina e disponibilidade

2. ALUNO agenda uma aula
   └─> POST /api/lessons
   └─> Sistema cria registro com status "pending"

3. SISTEMA redireciona para checkout
   └─> GET /pages/checkout.html?lesson_id=1

4. FRONTEND carrega detalhes da aula
   └─> GET /api/lessons/1
   └─> Exibe professor, data, hora, valor

5. FRONTEND cria PaymentIntent
   └─> POST /api/payments/create-intent
   └─> Stripe retorna client_secret

6. ALUNO preenche dados do cartão
   └─> Stripe.js valida em tempo real
   └─> Sem dados sensíveis passando pelo servidor

7. ALUNO confirma pagamento
   └─> stripe.confirmPayment()
   └─> Stripe processa pagamento

8. WEBHOOK recebe confirmação
   └─> POST /api/payments/webhook (Stripe → Servidor)
   └─> Atualiza payment: status = "succeeded"
   └─> Atualiza lesson: status = "confirmed"

9. ALUNO vê confirmação
   └─> Modal de sucesso
   └─> Email de confirmação enviado
```

---

## 🧪 Stripe Test Mode

### **Cartões de Teste**

| Cenário | Número do Cartão | Descrição |
|---------|------------------|-----------|
| ✅ **Sucesso** | `4242 4242 4242 4242` | Pagamento aprovado |
| ❌ **Falha (Insuficiente)** | `4000 0000 0000 9995` | Saldo insuficiente |
| ❌ **Falha (Recusado)** | `4000 0000 0000 0002` | Cartão recusado |
| 🔐 **3D Secure (Autenticação)** | `4000 0027 6000 3184` | Requer autenticação |
| 🚫 **Expirado** | `4000 0000 0000 0069` | Cartão expirado |
| 📍 **CEP Inválido** | `4000 0000 0000 0010` | CEP não confere |
| 💰 **Reembolso** | Qualquer cartão aprovado | Testar reembolsos |

**Dados Adicionais:**
- **Data de Validade**: Qualquer data futura (ex: 12/25)
- **CVV**: Qualquer 3 dígitos (ex: 123)
- **CEP**: Qualquer CEP válido (ex: 12345)

### **Testar Cenários**

#### **1. Pagamento Bem-Sucedido**
```javascript
// Use cartão: 4242 4242 4242 4242
// Resultado esperado: Modal de sucesso, aula confirmada
```

#### **2. Pagamento Recusado**
```javascript
// Use cartão: 4000 0000 0000 0002
// Resultado esperado: Mensagem de erro, aula continua pendente
```

#### **3. Reembolso**
```bash
# Após pagamento bem-sucedido
curl -X POST http://localhost:3001/api/payments/1/refund \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Teste de reembolso"}'
```

---

## 📡 Endpoints da API

### **🔷 Lessons (Aulas)**

#### **POST /api/lessons** - Criar Agendamento
```json
{
  "teacher_id": 2,
  "subject": "Matemática",
  "description": "Aula de cálculo",
  "scheduled_date": "2025-04-20T14:00:00",
  "duration_minutes": 50,
  "price": 45.00
}
```

**Resposta (201):**
```json
{
  "success": true,
  "message": "Aula agendada com sucesso!",
  "data": {
    "lesson": {
      "id": 1,
      "student_id": 1,
      "teacher_id": 2,
      "subject": "Matemática",
      "scheduled_date": "2025-04-20T14:00:00",
      "price": 45.00,
      "status": "pending",
      "teacher_name": "Amanda Silva"
    }
  }
}
```

#### **GET /api/lessons/:id** - Detalhes da Aula
**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "lesson": {
      "id": 1,
      "subject": "Matemática",
      "teacher_name": "Amanda Silva",
      "student_name": "João Pedro",
      "scheduled_date": "2025-04-20T14:00:00",
      "duration_minutes": 50,
      "price": 45.00,
      "status": "pending"
    }
  }
}
```

#### **GET /api/lessons** - Listar Aulas
**Query Parameters:**
- `role`: `student` | `teacher` (filtrar por papel)
- `status`: `pending` | `confirmed` | `cancelled` | `completed`

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "lessons": [...],
    "count": 5
  }
}
```

### **🔷 Payments (Pagamentos)**

#### **POST /api/payments/create-intent** - Criar PaymentIntent
```json
{
  "lesson_id": 1
}
```

**Resposta (200):**
```json
{
  "success": true,
  "message": "PaymentIntent criado com sucesso",
  "data": {
    "clientSecret": "pi_xxx_secret_yyy",
    "paymentId": 1,
    "lesson": {...}
  }
}
```

#### **GET /api/payments/lesson/:lessonId** - Buscar Pagamento
**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": 1,
      "lesson_id": 1,
      "stripe_payment_intent_id": "pi_xxx",
      "amount": 45.00,
      "status": "succeeded"
    }
  }
}
```

#### **POST /api/payments/:id/refund** - Solicitar Reembolso
```json
{
  "reason": "Problemas técnicos"
}
```

**Resposta (200):**
```json
{
  "success": true,
  "message": "Reembolso processado com sucesso",
  "data": {
    "refund": {
      "id": "re_xxx",
      "amount": 45.00,
      "status": "succeeded"
    }
  }
}
```

---

## 🎣 Webhooks

### **O que são Webhooks?**
Webhooks são notificações assíncronas enviadas pelo Stripe quando um evento ocorre (ex: pagamento confirmado).

### **Configurar Webhook (Desenvolvimento)**

#### **1. Instalar Stripe CLI**
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
wget -qO- https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz | tar xz

# Windows
scoop install stripe
```

#### **2. Login no Stripe CLI**
```bash
stripe login
```

#### **3. Forward Webhooks para Localhost**
```bash
stripe listen --forward-to localhost:3001/api/payments/webhook
```

Copie o **webhook signing secret** (começa com `whsec_`) e adicione no `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

#### **4. Testar Webhook**
```bash
# Simular pagamento bem-sucedido
stripe trigger payment_intent.succeeded
```

### **Eventos Processados**

| Evento | Descrição | Ação |
|--------|-----------|------|
| `payment_intent.succeeded` | Pagamento confirmado | Atualiza payment e lesson para "succeeded" |
| `payment_intent.payment_failed` | Falha no pagamento | Registra falha, mantém lesson pendente |
| `payment_intent.canceled` | Pagamento cancelado | Atualiza status para "cancelled" |
| `charge.refunded` | Reembolso processado | Atualiza payment e lesson, cancela aula |

---

## 💾 Banco de Dados

### **Tabelas Criadas**

#### **1. lessons (Aulas)**
```sql
CREATE TABLE lessons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    teacher_id INT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    description TEXT,
    scheduled_date DATETIME NOT NULL,
    duration_minutes INT DEFAULT 50,
    price DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed'),
    meeting_link VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### **2. payments (Pagamentos)**
```sql
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lesson_id INT NOT NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_client_secret VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'brl',
    status ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'),
    payment_method VARCHAR(50),
    payment_method_details JSON,
    failure_reason VARCHAR(255),
    refund_amount DECIMAL(10, 2),
    refund_reason VARCHAR(255),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### **3. payment_webhooks (Log de Webhooks)**
```sql
CREATE TABLE payment_webhooks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payment_intent_id VARCHAR(255),
    payload JSON NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL
);
```

#### **4. payment_history (Auditoria)**
```sql
CREATE TABLE payment_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_id INT NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INT,
    change_reason VARCHAR(255),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎨 Frontend (Checkout)

### **Estrutura da Página**

```
┌─────────────────────────────────────────────────────────┐
│                    CHECKOUT PAGE                         │
├──────────────┬────────────────────────┬─────────────────┤
│   COLUNA 1   │      COLUNA 2          │    COLUNA 3     │
│              │                        │                 │
│  📚 Detalhes │  💳 Pagamento          │  🔒 Segurança   │
│   da Aula    │                        │                 │
│              │  [Stripe Card Element] │  ✅ Garantias   │
│  Professor   │                        │  🔐 SSL         │
│  Disciplina  │  Resumo do Pagamento   │  💰 Reembolso   │
│  Data/Hora   │                        │                 │
│  Preço       │  [Confirmar Pagamento] │  🧪 Cartões de  │
│              │                        │     Teste       │
└──────────────┴────────────────────────┴─────────────────┘
```

### **Arquivos**
- `client/pages/checkout.html` - Estrutura HTML
- `client/css/checkout.css` - Estilos responsivos
- `client/js/checkout.js` - Lógica do Stripe

### **Responsividade**
- **Desktop (1024px+)**: 3 colunas lado a lado
- **Tablet (768px-1024px)**: 2 colunas, segurança embaixo
- **Mobile (<768px)**: 1 coluna, empilhadas

---

## 🧪 Testes

### **1. Testar com Insomnia/Postman**

Importe a collection:
```bash
insomnia-payment-endpoints.json
```

### **2. Fluxo Completo Manual**

```bash
# 1. Login
POST /api/auth/login
{
  "email": "aluno@email.com",
  "password": "senha123"
}
# Copie o token recebido

# 2. Criar agendamento
POST /api/lessons
Authorization: Bearer SEU_TOKEN
{
  "teacher_id": 2,
  "subject": "Matemática",
  "scheduled_date": "2025-04-20T14:00:00",
  "duration_minutes": 50,
  "price": 45.00
}
# Copie o lesson_id

# 3. Criar PaymentIntent
POST /api/payments/create-intent
Authorization: Bearer SEU_TOKEN
{
  "lesson_id": 1
}

# 4. Abrir checkout no navegador
http://localhost:3000/pages/checkout.html?lesson_id=1

# 5. Pagar com cartão de teste
4242 4242 4242 4242
12/25
123

# 6. Verificar pagamento
GET /api/payments/lesson/1
Authorization: Bearer SEU_TOKEN
```

### **3. Testar Webhook Local**

```bash
# Terminal 1: Iniciar servidor
npm start

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:3001/api/payments/webhook

# Terminal 3: Simular evento
stripe trigger payment_intent.succeeded
```

---

## ❓ Troubleshooting

### **Problema: PaymentIntent não é criado**

**Sintomas:**
```
Erro ao criar PaymentIntent
```

**Soluções:**
1. Verificar chaves do Stripe no `.env`
2. Confirmar que está usando chaves de **teste** (`pk_test_` e `sk_test_`)
3. Verificar logs do servidor:
   ```bash
   docker-compose logs -f app
   ```

### **Problema: Webhook não é recebido**

**Sintomas:**
```
Pagamento confirmado no Stripe, mas aula continua "pending"
```

**Soluções:**
1. Verificar se Stripe CLI está rodando:
   ```bash
   stripe listen --forward-to localhost:3001/api/payments/webhook
   ```
2. Confirmar `STRIPE_WEBHOOK_SECRET` no `.env`
3. Verificar logs de webhooks no banco:
   ```sql
   SELECT * FROM payment_webhooks ORDER BY created_at DESC LIMIT 10;
   ```

### **Problema: Erro de CORS**

**Sintomas:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS
```

**Solução:**
Adicionar frontend URL no CORS (server/app.js):
```javascript
app.use(cors({
    origin: ['http://localhost:3000', 'SUA_URL_AQUI'],
    credentials: true
}));
```

### **Problema: Stripe.js não carrega**

**Sintomas:**
```
Uncaught ReferenceError: Stripe is not defined
```

**Solução:**
Verificar se o script está no HTML:
```html
<script src="https://js.stripe.com/v3/"></script>
```

---

## 📞 Suporte

- **Documentação Stripe**: https://stripe.com/docs
- **Dashboard Stripe**: https://dashboard.stripe.com
- **Test Cards**: https://stripe.com/docs/testing

---

## 🎉 Pronto!

Seu sistema de pagamento está configurado e funcionando! 🚀

**Próximos passos sugeridos:**
1. Configurar webhook em produção
2. Implementar notificações por email
3. Adicionar sistema de avaliações pós-aula
4. Dashboard de estatísticas de pagamentos
