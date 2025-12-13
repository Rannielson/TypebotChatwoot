import { Router, Request, Response } from 'express';
import { InboxService } from '../services/inbox.service';
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

export default router;

