#!/bin/bash

# ============================================================
# Script de Migração 002 - Sistema de Pagamento
# Brain Tutor - Payment System Migration Runner
# ============================================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Banner
echo ""
print_message "$BLUE" "╔════════════════════════════════════════════════════════╗"
print_message "$BLUE" "║     Brain Tutor - Payment System Migration 002        ║"
print_message "$BLUE" "╚════════════════════════════════════════════════════════╝"
echo ""

# Verificar se o arquivo de migração existe
MIGRATION_FILE="$(dirname "$0")/migrations/002_add_payment_system.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    print_message "$RED" "❌ Erro: Arquivo de migração não encontrado!"
    print_message "$YELLOW" "   Procurando em: $MIGRATION_FILE"
    exit 1
fi

print_message "$GREEN" "✓ Arquivo de migração encontrado"
echo ""

# Solicitar credenciais do banco de dados
print_message "$YELLOW" "📋 Informe as credenciais do MySQL:"
echo ""

read -p "Host (padrão: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Porta (padrão: 3306): " DB_PORT
DB_PORT=${DB_PORT:-3306}

read -p "Database (padrão: brain_tutor): " DB_NAME
DB_NAME=${DB_NAME:-brain_tutor}

read -p "Usuário (padrão: root): " DB_USER
DB_USER=${DB_USER:-root}

read -sp "Senha: " DB_PASSWORD
echo ""
echo ""

# Verificar conexão com o banco
print_message "$BLUE" "🔍 Testando conexão com o banco de dados..."

mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    print_message "$RED" "❌ Erro: Não foi possível conectar ao banco de dados!"
    print_message "$YELLOW" "   Verifique as credenciais e tente novamente."
    exit 1
fi

print_message "$GREEN" "✓ Conexão estabelecida com sucesso"
echo ""

# Verificar se o banco de dados existe
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    print_message "$YELLOW" "⚠️  O banco de dados '$DB_NAME' não existe."
    read -p "Deseja criar o banco de dados? (s/n): " CREATE_DB
    
    if [ "$CREATE_DB" = "s" ] || [ "$CREATE_DB" = "S" ]; then
        mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        print_message "$GREEN" "✓ Banco de dados '$DB_NAME' criado com sucesso"
    else
        print_message "$RED" "❌ Operação cancelada pelo usuário"
        exit 1
    fi
fi

echo ""
print_message "$YELLOW" "⚠️  ATENÇÃO: Esta migração irá criar as seguintes tabelas:"
echo "   - lessons (aulas agendadas)"
echo "   - payments (pagamentos)"
echo "   - payment_webhooks (webhooks do Stripe)"
echo "   - payment_history (histórico de transações)"
echo ""
print_message "$YELLOW" "   E também irá adicionar dados de exemplo para testes."
echo ""

read -p "Deseja continuar? (s/n): " CONFIRM

if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
    print_message "$YELLOW" "⏸️  Operação cancelada pelo usuário"
    exit 0
fi

echo ""
print_message "$BLUE" "🚀 Executando migração..."
echo ""

# Executar migração
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo ""
    print_message "$GREEN" "╔════════════════════════════════════════════════════════╗"
    print_message "$GREEN" "║        ✓ Migração executada com sucesso!              ║"
    print_message "$GREEN" "╚════════════════════════════════════════════════════════╝"
    echo ""
    
    # Verificar tabelas criadas
    print_message "$BLUE" "📊 Verificando tabelas criadas:"
    echo ""
    
    TABLES=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES LIKE 'lessons'; SHOW TABLES LIKE 'payments'; SHOW TABLES LIKE 'payment_webhooks'; SHOW TABLES LIKE 'payment_history';" 2>/dev/null | grep -v "Tables_in")
    
    for table in lessons payments payment_webhooks payment_history; do
        if echo "$TABLES" | grep -q "$table"; then
            print_message "$GREEN" "   ✓ $table"
        else
            print_message "$RED" "   ✗ $table"
        fi
    done
    
    echo ""
    print_message "$BLUE" "📋 Próximos passos:"
    echo "   1. Configure as chaves do Stripe no arquivo .env"
    echo "   2. Instale o pacote stripe: npm install stripe"
    echo "   3. Reinicie o servidor: docker-compose restart ou npm start"
    echo "   4. Teste os endpoints com Insomnia/Postman"
    echo ""
    
else
    echo ""
    print_message "$RED" "╔════════════════════════════════════════════════════════╗"
    print_message "$RED" "║        ✗ Erro ao executar migração!                   ║"
    print_message "$RED" "╚════════════════════════════════════════════════════════╝"
    echo ""
    print_message "$YELLOW" "   Verifique os logs acima para mais detalhes."
    exit 1
fi
