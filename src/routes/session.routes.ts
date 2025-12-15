import { Router, Request, Response } from 'express';
import { SessionModel } from '../models/session.model';
import { authMiddleware } from '../middleware/auth.middleware';
import { redis } from '../config/redis';

const router = Router();

router.use(authMiddleware);

// GET /api/sessions - Lista sessões com filtros opcionais (status, tenant_id, inbox_id)
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as 'active' | 'paused' | 'closed' | 'expired' | undefined;
    const tenantId = req.query.tenant_id
      ? parseInt(req.query.tenant_id as string)
      : undefined;
    const inboxId = req.query.inbox_id
      ? parseInt(req.query.inbox_id as string)
      : undefined;

    // Valida status se fornecido
    if (status && !['active', 'paused', 'closed', 'expired'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido. Use: active, paused, closed ou expired' });
    }

    const filters: {
      status?: 'active' | 'paused' | 'closed' | 'expired';
      tenantId?: number;
      inboxId?: number;
    } = {};

    if (status) filters.status = status;
    if (tenantId) filters.tenantId = tenantId;
    if (inboxId) filters.inboxId = inboxId;

    // Se nenhum filtro de status foi fornecido, usa 'active' como padrão
    if (!status) {
      filters.status = 'active';
    }

    const sessions = await SessionModel.findAllWithFilters(filters);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sessions/active - Lista todas as sessões ativas (opcional: filtrar por inbox_id)
// Mantido para compatibilidade com código existente
router.get('/active', async (req: Request, res: Response) => {
  try {
    const inboxId = req.query.inbox_id
      ? parseInt(req.query.inbox_id as string)
      : undefined;

    const sessions = await SessionModel.findAllActive(inboxId);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sessions/stats - Retorna estatísticas de sessões
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as 'active' | 'paused' | 'closed' | 'expired' | undefined;
    const tenantId = req.query.tenant_id
      ? parseInt(req.query.tenant_id as string)
      : undefined;
    const inboxId = req.query.inbox_id
      ? parseInt(req.query.inbox_id as string)
      : undefined;

    const filters: {
      status?: 'active' | 'paused' | 'closed' | 'expired';
      tenantId?: number;
      inboxId?: number;
    } = {};

    if (status) filters.status = status;
    if (tenantId) filters.tenantId = tenantId;
    if (inboxId) filters.inboxId = inboxId;

    // Se nenhum filtro de status foi fornecido, conta apenas ativas
    if (!status) {
      filters.status = 'active';
    }

    const count = await SessionModel.countWithFilters(filters);
    res.json({ 
      sessions: count,
      activeSessions: count, // Mantido para compatibilidade
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Função auxiliar para remover sessão do Redis
async function removeSessionFromRedis(sessionId: number): Promise<void> {
  try {
    // Busca a sessão no banco pelo ID
    const dbSession = await SessionModel.findById(sessionId);
    
    if (dbSession) {
      // Constrói a chave do Redis baseado nos dados da sessão
      const key = `session:${dbSession.tenant_id}:${dbSession.inbox_id}:${dbSession.conversation_id}:${dbSession.phone_number}`;
      await redis.del(key);
    }
  } catch (error) {
    console.error('Erro ao remover sessão do Redis:', error);
    // Não lança erro para não interromper o fluxo principal
  }
}

// POST /api/sessions/:id/pause - Pausa uma sessão ativa
router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id);
    const session = await SessionModel.pause(sessionId);

    // Remove do Redis
    await removeSessionFromRedis(sessionId);

    res.json({ message: 'Sessão pausada com sucesso', session });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/sessions/:id/close - Fecha uma sessão
router.post('/:id/close', async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id);
    const session = await SessionModel.close(sessionId);

    // Remove do Redis
    await removeSessionFromRedis(sessionId);

    res.json({ message: 'Sessão fechada com sucesso', session });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
