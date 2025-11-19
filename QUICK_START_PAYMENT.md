# 🚀 Guia Rápido - Sistema de Pagamento Brain Tutor

## ⚡ Início Rápido (5 minutos)

### **1. Configurar Stripe (2 min)**

```bash
# 1. Criar conta gratuita no Stripe
https://dashboard.stripe.com/register

# 2. Ativar "Modo de Teste" (toggle superior direito)

# 3. Ir em: Developers > API keys

# 4. Copiar suas chaves:
Publishable key: pk_test_xxxxx
Secret key: sk_test_xxxxx
```

### **2. Configurar Projeto (1 min)**

```bash
# Copiar variáveis de ambiente
cp .env.example .env

# Editar .env e adicionar chaves do Stripe
nano .env

# Adicione:
STRIPE_PUBLIC_KEY=pk_test_sua_chave_aqui
STRIPE_SECRET_KEY=sk_test_sua_chave_aqui
STRIPE_WEBHOOK_SECRET=whsec_temporario
```

### **3. Instalar e Executar (2 min)**

**Opção A: Com Docker (Recomendado)**
```bash
# Iniciar tudo
docker-compose up -d

# Aguardar 30-60 segundos para o banco inicializar

# Verificar se está rodando
docker-compose ps
```

**Opção B: Manual**
```bash
# Instalar dependências
npm install

# Executar migração do banco
cd server/config
chmod +x run-migration-002.sh
./run-migration-002.sh

# Iniciar servidor
cd ../..
npm start
```

### **4. Testar (1 min)**

```bash
# Abrir navegador
http://localhost:3000

# 1. Fazer login:
Email: aluno@email.com
Senha: senha123

# 2. Agendar aula (via API ou interface)

# 3. Ir para checkout:
http://localhost:3000/pages/checkout.html?lesson_id=1

# 4. Pagar com cartão de teste:
Número: 4242 4242 4242 4242
Validade: 12/25
CVV: 123

# 5. Ver confirmação! ✅
```

---

## 🎯 Fluxo Completo de Teste

### **Passo 1: Login**
```
1. Abra http://localhost:3000
2. Faça login com:
   - Email: aluno@email.com
   - Senha: senha123
```

### **Passo 2: Criar Agendamento**

**Via Insomnia/Postman:**
```bash
POST http://localhost:3001/api/lessons
Authorization: Bearer SEU_TOKEN
Content-Type: application/json

{
  "teacher_id": 2,
  "subject": "Matemática",
  "description": "Aula de cálculo",
  "scheduled_date": "2025-04-20T14:00:00",
  "duration_minutes": 50,
  "price": 45.00
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "lesson": {
      "id": 1,
      "status": "pending",
      ...
    }
  }
}
```

### **Passo 3: Acessar Checkout**
```
http://localhost:3000/pages/checkout.html?lesson_id=1
```

### **Passo 4: Pagar**
```
Cartão: 4242 4242 4242 4242
Validade: 12/25
CVV: 123
```

### **Passo 5: Verificar**
```bash
# Verificar aula confirmada
GET http://localhost:3001/api/lessons/1
Authorization: Bearer SEU_TOKEN

# Verificar pagamento
GET http://localhost:3001/api/payments/lesson/1
Authorization: Bearer SEU_TOKEN
```

---

## 🧪 Cartões de Teste

| Cenário | Cartão | Resultado |
|---------|--------|-----------|
| ✅ Sucesso | `4242 4242 4242 4242` | Pagamento aprovado |
| ❌ Recusado | `4000 0000 0000 0002` | Cartão recusado |
| 🔐 3D Secure | `4000 0027 6000 3184` | Requer autenticação |

**Dados para todos os cartões:**
- Validade: Qualquer data futura (ex: 12/25)
- CVV: Qualquer 3 dígitos (ex: 123)

---

## 🐛 Problemas Comuns

### **Erro: "Stripe is not defined"**
**Solução:**
```javascript
// Verificar se Stripe.js está carregado no HTML
<script src="https://js.stripe.com/v3/"></script>

// Deve estar ANTES de checkout.js
```

### **Erro: "Invalid API key"**
**Solução:**
```bash
# Verificar chaves no .env
cat .env | grep STRIPE

# Chaves devem começar com:
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### **Erro: "PaymentIntent creation failed"**
**Solução:**
```bash
# 1. Verificar se Stripe package está instalado
npm list stripe

# 2. Se não estiver, instalar:
npm install stripe

# 3. Reiniciar servidor
docker-compose restart app
# ou
npm start
```

### **Webhook não funciona**
**Solução:**
```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# ou baixar: https://github.com/stripe/stripe-cli/releases

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3001/api/payments/webhook

# Copiar webhook secret (whsec_xxx) e adicionar no .env
```

---

## 📦 Estrutura de Arquivos Criados

```
brain-tutor/
├── server/
│   ├── config/
│   │   └── migrations/
│   │       ├── 002_add_payment_system.sql      ← NOVO
│   │       └── run-migration-002.sh            ← NOVO
│   ├── routes/
│   │   ├── lessons.js                           ← NOVO
│   │   └── payments.js                          ← NOVO
│   └── app.js                                   ← MODIFICADO
│
├── client/
│   ├── pages/
│   │   └── checkout.html                        ← NOVO
│   ├── css/
│   │   └── checkout.css                         ← NOVO
│   └── js/
│       └── checkout.js                          ← NOVO
│
├── package.json                                 ← MODIFICADO (+ stripe)
├── .env.example                                 ← MODIFICADO (+ Stripe keys)
├── docker-compose.yml                           ← MODIFICADO (+ migration)
├── insomnia-payment-endpoints.json              ← NOVO
├── PAYMENT_SYSTEM.md                            ← NOVO (Documentação completa)
└── QUICK_START_PAYMENT.md                       ← NOVO (Este arquivo)
```

---

## 🎯 Endpoints Principais

### **Lessons (Aulas)**
```
POST   /api/lessons              - Criar agendamento
GET    /api/lessons/:id          - Detalhes da aula
GET    /api/lessons              - Listar aulas
PATCH  /api/lessons/:id/status   - Atualizar status
DELETE /api/lessons/:id          - Cancelar aula
```

### **Payments (Pagamentos)**
```
POST   /api/payments/create-intent     - Criar PaymentIntent
GET    /api/payments/lesson/:lessonId  - Buscar pagamento
POST   /api/payments/:id/refund        - Solicitar reembolso
POST   /api/payments/webhook           - Webhook do Stripe
```

---

## 📊 Verificar Instalação

### **1. Banco de Dados**
```sql
-- Conectar ao MySQL
mysql -u root -p brain_tutor

-- Verificar tabelas criadas
SHOW TABLES LIKE 'lessons';
SHOW TABLES LIKE 'payments';
SHOW TABLES LIKE 'payment_webhooks';
SHOW TABLES LIKE 'payment_history';

-- Verificar dados de exemplo
SELECT * FROM lessons;
```

### **2. API**
```bash
# Health check
curl http://localhost:3001/health

# Resposta esperada:
{
  "status": "OK",
  "timestamp": "2025-04-15T10:00:00.000Z",
  "service": "Brain Tutor API"
}
```

### **3. Frontend**
```bash
# Abrir no navegador
http://localhost:3000

# Deve carregar a página inicial
```

---

## 🔧 Comandos Úteis

### **Docker**
```bash
# Iniciar
docker-compose up -d

# Parar
docker-compose down

# Ver logs
docker-compose logs -f app

# Reiniciar
docker-compose restart

# Reconstruir
docker-compose up -d --build
```

### **Banco de Dados**
```bash
# Entrar no container MySQL
docker exec -it brain-tutor-mysql mysql -u root -p

# Backup
docker exec brain-tutor-mysql mysqldump -u root -proot123 brain_tutor > backup.sql

# Restore
docker exec -i brain-tutor-mysql mysql -u root -proot123 brain_tutor < backup.sql
```

### **Stripe CLI**
```bash
# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3001/api/payments/webhook

# Simular evento
stripe trigger payment_intent.succeeded

# Ver eventos
stripe events list

# Ver logs
stripe logs tail
```

---

## ✅ Checklist de Verificação

- [ ] Conta Stripe criada (modo teste ativo)
- [ ] Chaves do Stripe copiadas para `.env`
- [ ] Banco de dados rodando
- [ ] Migração 002 executada com sucesso
- [ ] Servidor iniciado sem erros
- [ ] Endpoint `/health` respondendo
- [ ] Página de checkout acessível
- [ ] Login funcionando
- [ ] Pagamento de teste bem-sucedido
- [ ] Webhook recebendo eventos (se configurado)

---

## 🎉 Pronto para Usar!

Agora você pode:
1. ✅ Agendar aulas
2. ✅ Processar pagamentos
3. ✅ Receber webhooks
4. ✅ Solicitar reembolsos
5. ✅ Testar todos os cenários

**Dúvidas?** Consulte `PAYMENT_SYSTEM.md` para documentação completa.

---

## 📚 Próximos Passos

### **Desenvolvimento**
- [ ] Implementar lista de professores no frontend
- [ ] Adicionar calendário de disponibilidade
- [ ] Sistema de notificações por email
- [ ] Dashboard de aulas agendadas

### **Produção**
- [ ] Mudar para chaves de produção do Stripe
- [ ] Configurar webhook em domínio público
- [ ] Implementar SSL/HTTPS
- [ ] Configurar monitoramento e logs

---

**Divirta-se construindo! 🚀**
