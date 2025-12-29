import { Router, Request, Response } from 'express';
import { InboxService } from '../services/inbox.service';
import { TriggerService } from '../services/trigger.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenant_id
      ? parseInt(req.query.tenant_id as string)
      : undefined;

    if (tenantId) {
      const inboxes = await InboxService.findByTenantId(tenantId);
      res.json(inboxes);
    } else {
      const inboxes = await InboxService.findAll();
      res.json(inboxes);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Listar triggers de um inbox (deve vir antes de /:id)
router.get('/:id/triggers', async (req: Request, res: Response) => {
  try {
    const triggers = await TriggerService.findByInboxId(parseInt(req.params.id));
    res.json(triggers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const inbox = await InboxService.findById(parseInt(req.params.id));
    res.json(inbox);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      tenant_id,
      inbox_id,
      inbox_name,
      whatsapp_phone_number_id,
      whatsapp_access_token,
      whatsapp_api_version,
      typebot_base_url,
      typebot_api_key,
      typebot_public_id,
      chatwoot_api_token,
      is_active,
      is_test_mode,
      test_phone_number,
    } = req.body;

    if (
      !tenant_id ||
      !inbox_id ||
      !whatsapp_phone_number_id ||
      !whatsapp_access_token ||
      !typebot_base_url ||
      !typebot_public_id
    ) {
      return res.status(400).json({
        error:
          'tenant_id, inbox_id, whatsapp_phone_number_id, whatsapp_access_token, typebot_base_url, and typebot_public_id are required',
      });
    }

    const inbox = await InboxService.create({
      tenant_id,
      inbox_id,
      inbox_name,
      whatsapp_phone_number_id,
      whatsapp_access_token,
      whatsapp_api_version,
      typebot_base_url,
      typebot_api_key,
      typebot_public_id,
      chatwoot_api_token,
      is_active,
      is_test_mode,
      test_phone_number,
    });
    res.status(201).json(inbox);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      inbox_name,
      whatsapp_phone_number_id,
      whatsapp_access_token,
      whatsapp_api_version,
      typebot_base_url,
      typebot_api_key,
      typebot_public_id,
      chatwoot_api_token,
      is_active,
      is_test_mode,
      test_phone_number,
    } = req.body;

    const inbox = await InboxService.update(parseInt(req.params.id), {
      inbox_name,
      whatsapp_phone_number_id,
      whatsapp_access_token,
      whatsapp_api_version,
      typebot_base_url,
      typebot_api_key,
      typebot_public_id,
      chatwoot_api_token,
      is_active,
      is_test_mode,
      test_phone_number,
    });
    res.json(inbox);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await InboxService.delete(parseInt(req.params.id));
    res.json({ message: 'Inbox deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/inboxes/:id/sessions/close-bulk - Encerra sessões em massa
router.post('/:id/sessions/close-bulk', async (req: Request, res: Response) => {
  try {
    const inboxId = parseInt(req.params.id);
    const { status, older_than_hours, conversation_status } = req.body;

    // Valida se o inbox existe
    await InboxService.findById(inboxId);

    // Valida status se fornecido
    if (status && !['active', 'paused'].includes(status)) {
      return res.status(400).json({
        error: 'Status inválido. Use: active ou paused. Sessões closed e expired não podem ser encerradas.',
      });
    }

    // Valida older_than_hours se fornecido
    if (older_than_hours !== undefined) {
      const hours = parseInt(older_than_hours);
      if (isNaN(hours) || hours < 0) {
        return res.status(400).json({
          error: 'older_than_hours deve ser um número positivo (horas)',
        });
      }
    }

    // Valida conversation_status se fornecido
    // Status válidos no Chatwoot: open, resolved, pending, snoozed, etc.
    if (conversation_status && typeof conversation_status !== 'string') {
      return res.status(400).json({
        error: 'conversation_status deve ser uma string (ex: open, resolved, pending)',
      });
    }

    const { SessionService } = await import('../services/session.service');
    const result = await SessionService.closeSessionsBulk(inboxId, {
      status: status as 'active' | 'paused' | undefined,
      olderThanHours: older_than_hours ? parseInt(older_than_hours) : undefined,
      conversationStatus: conversation_status || undefined,
    });

    res.json({
      message: `Encerramento em massa concluído`,
      closed: result.closed,
      redis_keys_removed: result.redisKeysRemoved,
      filters: {
        status: status || 'active e paused',
        older_than_hours: older_than_hours || 'não aplicado',
        conversation_status: conversation_status || 'não aplicado',
      },
    });
  } catch (error: any) {
    if (error.message === 'Inbox not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;

