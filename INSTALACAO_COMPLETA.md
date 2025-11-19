# 🚀 Instalação Completa - Brain Tutor com Sistema de Pagamento

## 📦 O Que Você Recebeu

Este pacote contém o **Brain Tutor completo** com o **sistema de pagamento integrado**:

✅ Aplicação fullstack completa (frontend + backend)  
✅ Sistema de agendamento de aulas  
✅ Integração com Stripe (pagamentos)  
✅ Página de checkout responsiva (3 colunas)  
✅ Webhooks para confirmação assíncrona  
✅ Sistema de reembolsos  
✅ Banco de dados MySQL com migrações  
✅ Docker + Docker Compose  
✅ Documentação completa  
✅ Collection Insomnia para testes  

---

## ⚡ Início Rápido (5 minutos)

### **Pré-requisitos**
- Docker e Docker Compose OU
- Node.js 18+ e MySQL 8.0+

### **Passo 1: Descompactar**
```bash
unzip brain-tutor-payment-system.zip
cd brain-tutor-payment
```

### **Passo 2: Configurar Stripe**

1. **Criar conta gratuita no Stripe:**
   - Acesse: https://dashboard.stripe.com/register
   - Complete o cadastro (modo teste, sem cobranças)

2. **Obter chaves de API:**
   - No dashboard, ative o **Modo de Teste** (toggle superior direito)
   - Vá em: **Developers > API keys**
   - Copie:
     - **Publishable key** (começa com `pk_test_`)
     - **Secret key** (começa com `sk_test_`)

3. **Configurar no projeto:**
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar e adicionar suas chaves
nano .env  # ou use seu editor preferido
```

**Adicione no `.env`:**
```env
STRIPE_PUBLIC_KEY=pk_test_SUA_CHAVE_PUBLICA_AQUI
STRIPE_SECRET_KEY=sk_test_SUA_CHAVE_SECRETA_AQUI
STRIPE_WEBHOOK_SECRET=whsec_temporario
```

**TAMBÉM atualize em `client/js/checkout.js` (linha 11):**
```javascript
const STRIPE_PUBLIC_KEY = 'pk_test_SUA_CHAVE_PUBLICA_AQUI';
```

### **Passo 3: Iniciar Aplicação**

**OPÇÃO A: Com Docker (Recomendado)**
```bash
# Iniciar todos os serviços
docker-compose up -d

# Aguardar 30-60 segundos para o banco inicializar
# A migração será executada automaticamente

# Verificar se está rodando
docker-compose ps

# Deve mostrar 3 containers "Up":
# - brain-tutor-app
# - brain-tutor-mysql
# - brain-tutor-nginx
```

**OPÇÃO B: Sem Docker (Manual)**
```bash
# 1. Instalar dependências
npm install

# 2. Configurar banco de dados
# Certifique-se de que MySQL está rodando e crie o banco:
mysql -u root -p
CREATE DATABASE brain_tutor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;

# 3. Executar migrações
cd server/config
chmod +x run-migration-002.sh
./run-migration-002.sh

# Siga as instruções do script:
# - Host: localhost
# - Porta: 3306
# - Database: brain_tutor
# - Usuário: root
# - Senha: [sua senha do MySQL]

# 4. Iniciar servidor
cd ../..
npm start

# 5. Servir frontend (em outro terminal)
# Opção 1: Com Python
python3 -m http.server 3000 --directory client

# Opção 2: Com Node.js http-server
npx http-server client -p 3000
```

### **Passo 4: Acessar e Testar**

**URLs:**
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health

**Login de Teste:**
```
Email: aluno@email.com
Senha: senha123
```

**Testar Pagamento:**
1. Criar agendamento (via API ou interface)
2. Acessar: http://localhost:3000/pages/checkout.html?lesson_id=1
3. Usar cartão de teste:
   - Número: `4242 4242 4242 4242`
   - Validade: `12/25`
   - CVV: `123`
4. Confirmar pagamento ✅

---

## 📖 Documentação Incluída

### **1. PAYMENT_SYSTEM.md** (Documentação Técnica)
- Arquitetura completa
- Fluxo de pagamento detalhado
- Todos os endpoints da API
- Configuração de webhooks
- Estrutura do banco de dados
- Troubleshooting

### **2. QUICK_START_PAYMENT.md** (Guia Rápido)
- Instalação em 5 minutos
- Comandos essenciais
- Testes rápidos
- Resolução de problemas comuns

### **3. RESUMO_PAYMENT_FEATURE.md** (Resumo Executivo)
- Visão geral da implementação
- Arquivos criados/modificados
- Checklist completo
- Features implementadas

### **4. insomnia-payment-endpoints.json** (Collection de API)
- 9 endpoints prontos para testar
- Exemplos de requisições
- Variáveis de ambiente

---

## 🗂️ Estrutura do Projeto

```
brain-tutor-payment/
├── client/                          # Frontend
│   ├── pages/
│   │   ├── checkout.html            # ✨ NOVA - Página de pagamento
│   │   └── profile.html             # Perfil do usuário
│   ├── css/
│   │   ├── checkout.css             # ✨ NOVO - Estilos do checkout
│   │   ├── profile.css              # Estilos do perfil
│   │   └── style.css                # Estilos globais
│   ├── js/
│   │   ├── checkout.js              # ✨ NOVO - Lógica do Stripe
│   │   ├── profile.js               # Lógica do perfil
│   │   ├── teachers.js              # Busca de professores
│   │   ├── auth.js                  # Autenticação
│   │   ├── app.js                   # App principal
│   │   ├── config.js                # Configurações
│   │   └── utils.js                 # Utilitários
│   └── index.html                   # Página inicial
│
├── server/                          # Backend
│   ├── config/
│   │   ├── migrations/
│   │   │   ├── 002_add_payment_system.sql  # ✨ NOVA - Migração
│   │   │   └── run-migration-002.sh        # ✨ NOVO - Script
│   │   ├── database.js              # Conexão com banco
│   │   └── init.sql                 # Dados iniciais
│   ├── routes/
│   │   ├── lessons.js               # ✨ NOVA - API de aulas
│   │   ├── payments.js              # ✨ NOVA - API de pagamentos
│   │   ├── auth.js                  # Autenticação
│   │   ├── users.js                 # Usuários
│   │   └── teachers.js              # Professores
│   ├── middleware/
│   │   └── auth.js                  # Middleware JWT
│   ├── utils/
│   │   └── emailService.js          # Serviço de email
│   └── app.js                       # ✅ MODIFICADO - Novas rotas
│
├── docker-compose.yml               # ✅ MODIFICADO - Migração automática
├── Dockerfile                       # Imagem Docker
├── package.json                     # ✅ MODIFICADO - Dependência Stripe
├── .env.example                     # ✅ MODIFICADO - Chaves Stripe
├── nginx.conf                       # Configuração Nginx
│
├── PAYMENT_SYSTEM.md                # ✨ NOVA - Doc técnica
├── QUICK_START_PAYMENT.md           # ✨ NOVA - Guia rápido
├── RESUMO_PAYMENT_FEATURE.md        # ✨ NOVA - Resumo
├── insomnia-payment-endpoints.json  # ✨ NOVA - Collection API
└── README.md                        # Readme original
```

**Legenda:**
- ✨ **NOVA** - Arquivo novo criado para o sistema de pagamento
- ✅ **MODIFICADO** - Arquivo existente atualizado

---

## 🔌 Endpoints da API

### **Autenticação**
```
POST   /api/auth/register          - Cadastro de usuário
POST   /api/auth/login             - Login
POST   /api/auth/forgot-password   - Recuperar senha
POST   /api/auth/reset-password    - Resetar senha
```

### **Usuários**
```
GET    /api/users/profile          - Perfil do usuário
PUT    /api/users/profile          - Atualizar perfil
PUT    /api/users/change-password  - Alterar senha
```

### **Professores**
```
GET    /api/teachers               - Listar professores
GET    /api/teachers/:id           - Detalhes do professor
GET    /api/specialties/list       - Listar especialidades
```

### **🆕 Aulas (Lessons)**
```
POST   /api/lessons                - Criar agendamento
GET    /api/lessons/:id            - Detalhes da aula
GET    /api/lessons                - Listar aulas
PATCH  /api/lessons/:id/status     - Atualizar status
DELETE /api/lessons/:id            - Cancelar aula
```

### **🆕 Pagamentos (Payments)**
```
POST   /api/payments/create-intent     - Criar PaymentIntent
GET    /api/payments/lesson/:lessonId  - Buscar pagamento
POST   /api/payments/:id/refund        - Solicitar reembolso
POST   /api/payments/webhook           - Webhook do Stripe
```

---

## 💾 Banco de Dados

### **Tabelas Existentes**
- `users` - Usuários do sistema
- `teachers` - Professores
- `specialties` - Especialidades
- `teacher_specialties` - Relacionamento N:N

### **🆕 Tabelas Novas (Sistema de Pagamento)**
- `lessons` - Aulas agendadas
- `payments` - Pagamentos processados
- `payment_webhooks` - Log de webhooks do Stripe
- `payment_history` - Histórico de mudanças (auditoria)

---

## 🧪 Testes com Stripe

### **Cartões de Teste Disponíveis**

| Cenário | Número do Cartão | Resultado |
|---------|------------------|-----------|
| ✅ **Sucesso** | `4242 4242 4242 4242` | Pagamento aprovado |
| ❌ **Recusado** | `4000 0000 0000 0002` | Cartão recusado |
| ❌ **Insuficiente** | `4000 0000 0000 9995` | Saldo insuficiente |
| 🔐 **3D Secure** | `4000 0027 6000 3184` | Autenticação necessária |
| 🚫 **Expirado** | `4000 0000 0000 0069` | Cartão expirado |

**Dados para todos os cartões:**
- **Validade:** Qualquer data futura (ex: 12/25)
- **CVV:** Qualquer 3 dígitos (ex: 123)
- **CEP:** Qualquer código válido

### **Testar Webhook Localmente**

```bash
# 1. Instalar Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# ou baixe em: https://github.com/stripe/stripe-cli/releases

# 2. Login
stripe login

# 3. Forward webhooks para localhost
stripe listen --forward-to localhost:3001/api/payments/webhook

# 4. Copiar webhook secret (whsec_xxx) e adicionar no .env

# 5. Simular evento
stripe trigger payment_intent.succeeded
```

---

## 🔧 Comandos Úteis

### **Docker**
```bash
# Iniciar serviços
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Parar serviços
docker-compose down

# Reiniciar
docker-compose restart

# Reconstruir
docker-compose up -d --build

# Ver status
docker-compose ps
```

### **Banco de Dados**
```bash
# Conectar ao MySQL (Docker)
docker exec -it brain-tutor-mysql mysql -u root -proot123 brain_tutor

# Verificar tabelas
SHOW TABLES;

# Ver aulas
SELECT * FROM lessons;

# Ver pagamentos
SELECT * FROM payments;

# Backup
docker exec brain-tutor-mysql mysqldump -u root -proot123 brain_tutor > backup.sql
```

### **Logs e Debug**
```bash
# Ver logs do servidor
docker-compose logs -f app

# Ver logs do banco
docker-compose logs -f mysql

# Ver logs do nginx
docker-compose logs -f nginx

# Todos os logs
docker-compose logs -f
```

---

## ❓ Resolução de Problemas

### **Problema 1: "Cannot connect to database"**

**Sintomas:**
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Soluções:**
```bash
# Verificar se MySQL está rodando
docker-compose ps

# Se não estiver, iniciar
docker-compose up -d mysql

# Aguardar 30-60 segundos e tentar novamente
```

### **Problema 2: "Stripe is not defined"**

**Sintomas:**
```
Uncaught ReferenceError: Stripe is not defined
```

**Solução:**
Verificar se o script Stripe.js está carregado antes de `checkout.js`:
```html
<script src="https://js.stripe.com/v3/"></script>
<script src="../js/checkout.js"></script>
```

### **Problema 3: "Invalid API key"**

**Sintomas:**
```
Error: Invalid API Key provided
```

**Soluções:**
1. Verificar chaves no `.env`:
```bash
cat .env | grep STRIPE
```

2. Chaves devem começar com `pk_test_` e `sk_test_`

3. Atualizar também em `client/js/checkout.js`

4. Reiniciar servidor:
```bash
docker-compose restart app
```

### **Problema 4: "Webhook signature verification failed"**

**Sintomas:**
```
Webhook Error: No signatures found matching the expected signature
```

**Solução:**
1. Usar Stripe CLI para webhooks locais:
```bash
stripe listen --forward-to localhost:3001/api/payments/webhook
```

2. Copiar o webhook secret gerado

3. Adicionar no `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

4. Reiniciar servidor

### **Problema 5: "Port 3000 already in use"**

**Sintomas:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solução:**
```bash
# Encontrar processo usando a porta
lsof -i :3000

# Matar processo
kill -9 PID

# Ou usar outra porta
docker-compose down
# Editar docker-compose.yml e mudar porta
docker-compose up -d
```

---

## ✅ Checklist de Verificação

Após instalação, verifique:

- [ ] Docker está rodando (se usar Docker)
- [ ] MySQL está acessível
- [ ] Migração 002 foi executada
- [ ] Chaves do Stripe configuradas em `.env`
- [ ] Chave pública do Stripe em `checkout.js`
- [ ] Servidor rodando na porta 3001
- [ ] Frontend acessível na porta 3000
- [ ] Endpoint `/health` respondendo
- [ ] Login funcionando
- [ ] Página de checkout acessível
- [ ] Pagamento de teste bem-sucedido

---

## 📚 Recursos Adicionais

### **Documentação**
- **Stripe Docs:** https://stripe.com/docs
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Test Cards:** https://stripe.com/docs/testing
- **Webhook Testing:** https://stripe.com/docs/webhooks/test

### **Ferramentas**
- **Insomnia:** https://insomnia.rest/download
- **Postman:** https://www.postman.com/downloads/
- **Stripe CLI:** https://stripe.com/docs/stripe-cli

---

## 🎯 Fluxo de Uso Completo

### **1. Como Aluno**
```
1. Fazer login (aluno@email.com / senha123)
2. Buscar professores disponíveis
3. Selecionar professor e ver perfil
4. Agendar aula (definir data, hora, disciplina)
5. Ser redirecionado para checkout
6. Preencher dados do cartão de teste
7. Confirmar pagamento
8. Ver confirmação da aula
9. Receber email de confirmação
```

### **2. Como Professor**
```
1. Fazer login como professor
2. Configurar perfil (especialidades, preço/hora)
3. Visualizar aulas agendadas
4. Confirmar aula após pagamento
5. Adicionar link da reunião (Zoom, Google Meet)
6. Ministrar aula
7. Marcar aula como concluída
```

### **3. Reembolso (via API)**
```bash
# Solicitar reembolso
POST /api/payments/1/refund
Authorization: Bearer SEU_TOKEN
Content-Type: application/json

{
  "reason": "Problemas técnicos durante a aula"
}
```

---

## 🚀 Próximos Passos

Após instalação e testes, você pode:

### **Desenvolvimento**
1. Personalizar interface
2. Adicionar mais especialidades
3. Implementar notificações por email
4. Criar dashboard de estatísticas
5. Adicionar sistema de avaliações

### **Produção**
1. Obter certificado SSL
2. Configurar domínio
3. Mudar para chaves de produção do Stripe
4. Configurar webhook público
5. Implementar backup automático
6. Adicionar monitoramento

---

## 💬 Suporte

Se encontrar problemas:

1. **Consulte a documentação:**
   - `PAYMENT_SYSTEM.md` - Documentação técnica completa
   - `QUICK_START_PAYMENT.md` - Guia rápido
   - Este arquivo - Instalação completa

2. **Verifique os logs:**
   ```bash
   docker-compose logs -f app
   ```

3. **Teste endpoints com Insomnia:**
   - Importe `insomnia-payment-endpoints.json`
   - Configure o token de autenticação
   - Teste cada endpoint

4. **Dashboard do Stripe:**
   - Veja pagamentos em tempo real
   - Monitore webhooks
   - Teste eventos

---

## 🎉 Pronto!

Seu Brain Tutor com sistema de pagamento está **100% funcional**!

**Recursos Implementados:**
✅ Autenticação completa  
✅ Perfis de usuário e professor  
✅ Busca de professores  
✅ Agendamento de aulas  
✅ Processamento de pagamentos  
✅ Webhooks do Stripe  
✅ Sistema de reembolsos  
✅ Interface responsiva  
✅ Documentação completa  

**Bom desenvolvimento! 🚀**
