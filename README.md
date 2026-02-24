# 🏭 Engefil Connect

Sistema completo de gerenciamento de postos de combustível com painéis LED inteligentes.

## 🎯 Visão Geral

O Engefil Connect é uma solução profissional para gestão de postos de combustível que integra:
- **Roteadores MikroTik** para conectividade VPN
- **Controladores Huidu HD-W60** para painéis LED
- **Sistema de Factory Provisioning** para configuração automatizada
- **App Mobile** para controle em tempo real

## 🏗️ Arquitetura

### Sistema Multi-Local
```
Central Server → VPN → MikroTik Router → Huidu Controller → LED Panels
```

Cada local possui:
- 1 Roteador MikroTik (conectividade VPN)
- 1 Controlador Huidu HD-W60 (controle LED)
- N Painéis LED (exibição de preços)

### Tecnologias

**Backend:**
- Node.js + TypeScript
- PostgreSQL
- Docker
- VPN OpenVPN

**Mobile:**
- React Native + Expo
- Redux Toolkit
- TypeScript
- Interface em Português Brasileiro

**Dispositivos:**
- MikroTik RouterOS
- Huidu HD-W60 LED Controller
- Protocolo TCP customizado

## 🚀 Funcionalidades

### 🏭 Factory Provisioning
- Wizard completo de configuração
- Suporte multi-local
- Teste automático de dispositivos
- Geração de credenciais
- QR Code para setup

### 📱 Mobile App
- Interface em português brasileiro
- Controle de preços em tempo real
- Monitoramento de status
- Gestão multi-local
- Tema profissional Engefil

### 🔧 Gestão de Dispositivos
- Configuração automática MikroTik
- Controle de painéis Huidu
- Monitoramento VPN
- Logs e diagnósticos

## 📦 Instalação

### Pré-requisitos
- Node.js 16+
- Docker & Docker Compose
- PostgreSQL
- Expo CLI

### Backend
```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env

# Iniciar com Docker
docker-compose up -d

# Executar migrações
npm run migrate
```

### Mobile
```bash
cd mobile

# Instalar dependências
npm install

# Iniciar desenvolvimento
npm start

# Build para produção
eas build --platform android
```

## 🔧 Configuração

### Variáveis de Ambiente
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/engefil_connect

# API
API_PORT=3000
JWT_SECRET=your-secret-key

# VPN
VPN_SERVER=your-vpn-server.com
VPN_PORT=1194
```

### Factory Provisioning
1. Acesse como admin (`admin` / `admin123`)
2. Use o botão "🏭 Fábrica" no dashboard
3. Siga o wizard de 3 etapas
4. Teste dispositivos antes de finalizar

## 📱 Google Play Store

### Preparação
```bash
# Configurar EAS
eas build:configure

# Build para produção
eas build --platform android --profile production

# Submit para Play Store
eas submit --platform android
```

### Informações da Loja
- **Nome**: Engefil Connect
- **Categoria**: Negócios
- **Público**: Profissional
- **Descrição**: Sistema de gerenciamento de postos de combustível

## 🔐 Segurança

- Autenticação JWT
- Comunicação VPN criptografada
- Validação de dispositivos por MAC/Serial
- Protocolo TCP com CRC16
- Firewall configurado

## 📊 Monitoramento

- Status VPN em tempo real
- Health checks automáticos
- Logs estruturados
- Métricas de performance
- Alertas de falha

## 🛠️ Desenvolvimento

### Estrutura do Projeto
```
├── src/                 # Backend API
│   ├── models/         # Modelos de dados
│   ├── routes/         # Endpoints API
│   ├── services/       # Lógica de negócio
│   └── utils/          # Utilitários
├── mobile/             # App React Native
│   ├── src/
│   │   ├── screens/    # Telas do app
│   │   ├── services/   # Serviços API
│   │   └── locales/    # Traduções PT-BR
└── deploy/             # Scripts de deploy
```

### Scripts Úteis
```bash
# Desenvolvimento
npm run dev              # Iniciar backend
npm run mobile          # Iniciar mobile app

# Produção
npm run build           # Build backend
npm run deploy          # Deploy completo

# Testes
npm test                # Executar testes
npm run lint            # Verificar código
```

## 🌐 Deploy

### VPS (Backend)
```bash
# Deploy automático
./deploy-complete.sh

# Manual
ssh root@your-vps
cd /opt/applications/engefil-connect
docker-compose up -d
```

### Mobile (Play Store)
```bash
cd mobile
eas build --platform android --profile production
eas submit --platform android
```

## 📞 Suporte

### Documentação
- [Arquitetura Técnica](TECHNICAL-ARCHITECTURE.md)
- [Guia de Deploy](DEPLOYMENT-GUIDE.md)
- [Manual do Usuário](USER-MANUAL.md)

### Contato
- **Empresa**: Engefil
- **Sistema**: Engefil Connect
- **Versão**: 1.0.0

## 📄 Licença

Propriedade da Engefil. Todos os direitos reservados.

---

**Engefil Connect v1.0.0** - Sistema profissional de gerenciamento de postos de combustível.