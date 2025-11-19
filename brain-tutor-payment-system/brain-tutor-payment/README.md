# Brain Tutor - Plataforma de Aulas Particulares

Uma plataforma completa para conectar alunos e professores particulares.

## 🚀 Funcionalidades

- **Autenticação completa**: Login, cadastro e recuperação de senha
- **Perfis diferenciados**: Alunos e Professores
- **Busca de professores**: Sistema de busca avançado
- **Painel de controle**: Interface intuitiva para gerenciamento
- **Responsivo**: Funciona em desktop e mobile

## 🛠️ Tecnologias Utilizadas

### Frontend
- HTML5
- CSS3 (Flexbox/Grid)
- JavaScript (ES6+)
- Fetch API

### Backend
- Node.js
- Express.js
- MySQL
- JWT (Autenticação)
- bcryptjs (Criptografia)
- Nodemailer (Emails)

### DevOps
- Docker & Docker Compose
- GitHub
- Insomnia (API Testing)

## 📦 Instalação

### Pré-requisitos
- Node.js (v16+)
- Docker & Docker Compose
- Git

### Passos para instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/brain-tutor.git
cd brain-tutor
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. Execute com Docker:
```bash
docker-compose up -d
```

5. Acesse a aplicação:
- Frontend: http://localhost:3000
- API: http://localhost:3001

## 🐳 Docker

### Construir e executar
```bash
# Construir imagens
docker-compose build

# Executar containers
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar containers
docker-compose down
```

## 📱 API Endpoints

### Autenticação
- `POST /api/auth/register` - Cadastro
- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Recuperar senha
- `POST /api/auth/reset-password` - Redefinir senha

### Professores
- `GET /api/teachers` - Listar professores
- `GET /api/teachers/search` - Buscar professores
- `GET /api/teachers/:id` - Obter professor
- `PUT /api/teachers/:id` - Atualizar perfil

### Usuários
- `GET /api/users/profile` - Perfil do usuário
- `PUT /api/users/profile` - Atualizar perfil

## 🧪 Testes

Execute os testes com Insomnia:
1. Importe a collection `insomnia-collection.json`
2. Configure as variáveis de ambiente
3. Execute os testes

## 📝 Estrutura do Projeto

```
brain-tutor/
├── client/                 # Frontend
│   ├── assets/            # Imagens, ícones
│   ├── css/               # Estilos CSS
│   ├── js/                # JavaScript
│   └── pages/             # Páginas HTML
├── server/                # Backend
│   ├── config/            # Configurações
│   ├── controllers/       # Controladores
│   ├── middleware/        # Middlewares
│   ├── models/            # Modelos
│   ├── routes/            # Rotas
│   └── utils/             # Utilitários
├── docker-compose.yml     # Docker Compose
├── Dockerfile            # Docker Image
└── insomnia-collection.json # Collection Insomnia
```

## 👥 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Contato

Brain Tutor Team - contato@braintutor.com

Link do Projeto: [https://github.com/seu-usuario/brain-tutor](https://github.com/seu-usuario/brain-tutor)