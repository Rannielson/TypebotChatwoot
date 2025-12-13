import { Router, Request, Response } from 'express';
import { TenantService } from '../services/tenant.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenants = await TenantService.findAll();
    res.json(tenants);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenant = await TenantService.findById(parseInt(req.params.id));
    res.json(tenant);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, chatwoot_url, chatwoot_token, chatwoot_account_id } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const tenant = await TenantService.create({
      name,
      chatwoot_url,
      chatwoot_token,
      chatwoot_account_id,
    });
    res.status(201).json(tenant);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, chatwoot_url, chatwoot_token, chatwoot_account_id } = req.body;
    const tenant = await TenantService.update(parseInt(req.params.id), {
      name,
      chatwoot_url,
      chatwoot_token,
      chatwoot_account_id,
    });
    res.json(tenant);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await TenantService.delete(parseInt(req.params.id));
    res.json({ message: 'Tenant deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

