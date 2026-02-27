import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { stationRoutes } from './routes/stations';
import { priceRoutes } from './routes/prices';
import { clientRoutes } from './routes/clients';
import { deviceRoutes } from './routes/devices';
import { huiduDeviceRoutes } from './routes/huidu-devices';
import { factoryProvisioningRoutes } from './routes/factory-provisioning';
import { VPNMonitorService } from './services/VPNMonitorService';

// Load environment variables
dotenv.config({ path: '/opt/applications/fuelprice-pro/.env' });

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// VPN monitoring service instance (initialized later)
let vpnMonitorService: VPNMonitorService;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (privacy policy, etc.)
app.use(express.static('public'));

// Root endpoint - API information
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'FuelPrice Pro API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      stations: '/api/stations',
      prices: '/api/prices',
      clients: '/api/clients',
      mikrotikDevices: '/api/devices',
      huiduDevices: '/api/huidu-devices',
      factoryProvisioning: '/api/factory'
    },
    documentation: 'This is a REST API for fuel station management with factory provisioning. All endpoints except /health require JWT authentication.'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'FuelPrice Pro Backend'
  });
});

// Privacy Policy endpoint (clean URL for Google Play Console)
app.get('/privacy-policy', (req, res) => {
  const privacyHTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Política de Privacidade - Engefil Connect</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #FF6B35;
            border-bottom: 3px solid #FF6B35;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        h2 {
            color: #FF6B35;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        h3 {
            color: #666;
            margin-top: 25px;
            margin-bottom: 10px;
        }
        ul, ol {
            margin-bottom: 20px;
        }
        li {
            margin-bottom: 8px;
        }
        .highlight {
            background-color: #fff3e0;
            padding: 15px;
            border-left: 4px solid #FF6B35;
            margin: 20px 0;
        }
        .contact-info {
            background-color: #f5f5f5;
            padding: 20px;
            border-radius: 5px;
            margin-top: 30px;
        }
        .last-updated {
            font-style: italic;
            color: #666;
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        .app-info {
            background: linear-gradient(135deg, #FF6B35, #FF8E53);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="app-info">
            <h1 style="color: white; border: none; margin: 0;">📱 Engefil Connect</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Controle Remoto de Placas de Preço</p>
        </div>

        <h1>Política de Privacidade</h1>

        <div class="highlight">
            <strong>Resumo:</strong> O Engefil Connect coleta apenas dados essenciais para funcionamento do sistema de controle de placas LED. Não compartilhamos informações pessoais com terceiros e implementamos medidas rigorosas de segurança.
        </div>

        <h2>1. Informações Gerais</h2>
        <p>Esta Política de Privacidade descreve como a <strong>Engefil</strong> coleta, usa e protege as informações dos usuários do aplicativo <strong>Engefil Connect</strong>.</p>
        
        <p>O Engefil Connect é um sistema profissional para controle remoto de placas de preço em postos de combustível, desenvolvido especificamente para o mercado brasileiro.</p>

        <h2>2. Dados Coletados</h2>
        <p>Coletamos apenas os dados necessários para o funcionamento adequado do sistema:</p>

        <h3>2.1 Dados de Autenticação</h3>
        <ul>
            <li><strong>Credenciais de login:</strong> Nome de usuário e senha (criptografados)</li>
            <li><strong>Tokens de sessão:</strong> Para manter o usuário logado com segurança</li>
            <li><strong>Informações de perfil:</strong> Nome da empresa, dados de contato</li>
        </ul>

        <h3>2.2 Dados de Dispositivos</h3>
        <ul>
            <li><strong>Informações de roteadores MikroTik:</strong> Endereços IP, status de conectividade</li>
            <li><strong>Dados de controladores Huidu:</strong> Configurações de rede, status dos painéis LED</li>
            <li><strong>Status de estações:</strong> Localização, nome, configurações de preços</li>
        </ul>

        <h3>2.3 Dados de Atividade</h3>
        <ul>
            <li><strong>Logs de sistema:</strong> Horários de login, atualizações de preços</li>
            <li><strong>Dados de conectividade:</strong> Status de conexão VPN, qualidade de rede</li>
            <li><strong>Métricas de uso:</strong> Frequência de atualizações, tempo de resposta</li>
        </ul>

        <h2>3. Como Usamos os Dados</h2>
        <p>Os dados coletados são utilizados exclusivamente para:</p>

        <ol>
            <li><strong>Autenticação e Segurança:</strong> Verificar identidade e proteger contas</li>
            <li><strong>Gerenciamento de Dispositivos:</strong> Configurar e monitorar equipamentos remotamente</li>
            <li><strong>Controle de Preços:</strong> Atualizar placas LED em tempo real</li>
            <li><strong>Monitoramento de Sistema:</strong> Garantir funcionamento adequado</li>
            <li><strong>Suporte Técnico:</strong> Diagnosticar e resolver problemas</li>
            <li><strong>Melhoria do Serviço:</strong> Otimizar performance e funcionalidades</li>
        </ol>

        <h2>4. Compartilhamento de Dados</h2>
        <div class="highlight">
            <strong>Política de Não Compartilhamento:</strong> A Engefil NÃO compartilha, vende ou aluga dados pessoais dos usuários para terceiros.
        </div>

        <p>Os dados permanecem sob controle exclusivo da Engefil e são utilizados apenas para os fins descritos nesta política.</p>

        <h2>5. Segurança dos Dados</h2>
        <p>Implementamos medidas técnicas e organizacionais rigorosas:</p>

        <h3>5.1 Proteção Técnica</h3>
        <ul>
            <li><strong>Criptografia:</strong> Dados criptografados em trânsito (HTTPS/TLS) e em repouso</li>
            <li><strong>Autenticação:</strong> Sistema de login seguro com tokens JWT</li>
            <li><strong>VPN:</strong> Comunicação com dispositivos via túneis VPN criptografados</li>
            <li><strong>Firewall:</strong> Proteção contra acessos não autorizados</li>
        </ul>

        <h2>6. Direitos dos Usuários</h2>
        <p>Conforme a Lei Geral de Proteção de Dados (LGPD), você tem direito a:</p>

        <ol>
            <li><strong>Acesso:</strong> Saber quais dados pessoais possuímos</li>
            <li><strong>Correção:</strong> Solicitar correção de dados incorretos</li>
            <li><strong>Exclusão:</strong> Solicitar remoção de dados pessoais</li>
            <li><strong>Portabilidade:</strong> Receber dados em formato estruturado</li>
            <li><strong>Oposição:</strong> Opor-se ao tratamento de dados</li>
            <li><strong>Revogação:</strong> Revogar consentimento a qualquer momento</li>
        </ol>

        <h2>7. Retenção de Dados</h2>
        <p>Mantemos os dados pelo tempo necessário para prestação do serviço e cumprimento de obrigações legais.</p>

        <h2>8. Menores de Idade</h2>
        <p>O Engefil Connect é destinado exclusivamente a usuários profissionais maiores de 18 anos. Não coletamos intencionalmente dados de menores.</p>

        <h2>9. Alterações nesta Política</h2>
        <p>Esta política pode ser atualizada periodicamente. Alterações significativas serão comunicadas através do aplicativo ou por email.</p>

        <div class="contact-info">
            <h2>10. Contato</h2>
            <p>Para questões sobre privacidade, dúvidas ou exercício de direitos:</p>
            
            <p><strong>Encarregado de Dados (DPO):</strong><br>
            Email: privacidade@engefil.com.br<br>
            Telefone: [Telefone da Engefil]</p>
            
            <p><strong>Suporte Técnico:</strong><br>
            Email: suporte@engefil.com.br</p>
            
            <p><strong>Endereço:</strong><br>
            [Endereço da Engefil]</p>
        </div>

        <div class="last-updated">
            <p><strong>Última atualização:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
            <p><strong>Versão:</strong> 1.0</p>
        </div>
    </div>
</body>
</html>
  `;
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(privacyHTML);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/huidu-devices', huiduDeviceRoutes);
app.use('/api/factory', factoryProvisioningRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

async function startServer(): Promise<void> {
  try {
    // Initialize database connection (skip in test environment)
    if (process.env.NODE_ENV !== 'test') {
      await connectDatabase();
      logger.info('Database connected successfully');

      // Initialize and start VPN monitoring service
      vpnMonitorService = new VPNMonitorService();
      await vpnMonitorService.startMonitoring();
      logger.info('VPN monitoring service started');
    }

    // Start server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (vpnMonitorService) {
    vpnMonitorService.stopAllMonitoring();
  }
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (vpnMonitorService) {
    vpnMonitorService.stopAllMonitoring();
  }
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Function to get VPN monitor service instance
export function getVPNMonitorService(): VPNMonitorService | undefined {
  return vpnMonitorService;
}

export { app, server };