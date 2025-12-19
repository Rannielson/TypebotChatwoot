import { Router, Request, Response } from 'express';
import { TriggerService } from '../services/trigger.service';
import { TriggerScheduler } from '../schedulers/trigger.scheduler';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Listar todos os triggers
router.get('/', async (req: Request, res: Response) => {
  try {
    const triggers = await TriggerService.findAll();
    res.json(triggers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar trigger por ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const trigger = await TriggerService.findById(parseInt(req.params.id));
    if (!trigger) {
      return res.status(404).json({ error: 'Trigger não encontrado' });
    }
    res.json(trigger);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Criar novo trigger
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      is_active,
      action_type,
      idle_minutes,
      check_frequency_minutes,
      requires_no_assignee,
    } = req.body;

    if (!name || !idle_minutes || !check_frequency_minutes) {
      return res.status(400).json({
        error: 'name, idle_minutes e check_frequency_minutes são obrigatórios',
      });
    }

    if (check_frequency_minutes < 1) {
      return res.status(400).json({
        error: 'check_frequency_minutes deve ser no mínimo 1 minuto',
      });
    }

    const trigger = await TriggerService.create({
      name,
      description,
      is_active,
      action_type,
      idle_minutes,
      check_frequency_minutes,
      requires_no_assignee,
    });

    // Se o trigger estiver ativo, agenda imediatamente
    if (trigger.is_active) {
      await TriggerScheduler.scheduleTrigger(trigger.id);
    }

    res.status(201).json(trigger);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Atualizar trigger
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      is_active,
      action_type,
      idle_minutes,
      check_frequency_minutes,
      requires_no_assignee,
    } = req.body;

    if (check_frequency_minutes !== undefined && check_frequency_minutes < 1) {
      return res.status(400).json({
        error: 'check_frequency_minutes deve ser no mínimo 1 minuto',
      });
    }

    const trigger = await TriggerService.update(parseInt(req.params.id), {
      name,
      description,
      is_active,
      action_type,
      idle_minutes,
      check_frequency_minutes,
      requires_no_assignee,
    });

    // Reagenda o trigger (remove e adiciona novamente)
    TriggerScheduler.unscheduleTrigger(trigger.id);
    if (trigger.is_active) {
      await TriggerScheduler.scheduleTrigger(trigger.id);
    }

    res.json(trigger);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Deletar trigger
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const triggerId = parseInt(req.params.id);
    
    // Remove do agendamento antes de deletar
    TriggerScheduler.unscheduleTrigger(triggerId);
    
    await TriggerService.delete(triggerId);
    res.json({ message: 'Trigger deletado com sucesso' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Associar trigger a inbox
router.post('/:id/attach', async (req: Request, res: Response) => {
  try {
    const triggerId = parseInt(req.params.id);
    const { inbox_id } = req.body;

    if (!inbox_id) {
      return res.status(400).json({ error: 'inbox_id é obrigatório' });
    }

    await TriggerService.attachToInbox(triggerId, inbox_id);

    // Reagenda o trigger para incluir o novo inbox
    TriggerScheduler.unscheduleTrigger(triggerId);
    const trigger = await TriggerService.findById(triggerId);
    if (trigger && trigger.is_active) {
      await TriggerScheduler.scheduleTrigger(triggerId);
    }

    res.json({ message: 'Trigger associado ao inbox com sucesso' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Remover associação de trigger com inbox
router.delete('/:id/attach/:inbox_id', async (req: Request, res: Response) => {
  try {
    const triggerId = parseInt(req.params.id);
    const inboxId = parseInt(req.params.inbox_id);

    await TriggerService.detachFromInbox(triggerId, inboxId);

    // Reagenda o trigger
    TriggerScheduler.unscheduleTrigger(triggerId);
    const trigger = await TriggerService.findById(triggerId);
    if (trigger && trigger.is_active) {
      await TriggerScheduler.scheduleTrigger(triggerId);
    }

    res.json({ message: 'Associação removida com sucesso' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Status do scheduler (útil para debug)
router.get('/scheduler/status', async (req: Request, res: Response) => {
  try {
    const status = TriggerScheduler.getStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Recarregar todos os triggers (útil após mudanças manuais no banco)
router.post('/scheduler/reload', async (req: Request, res: Response) => {
  try {
    await TriggerScheduler.reloadAll();
    res.json({ message: 'Scheduler recarregado com sucesso' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
