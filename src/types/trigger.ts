export interface Trigger {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  action_type: 'check_idle_conversations';
  idle_minutes: number;
  check_frequency_minutes: number;
  requires_no_assignee: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTriggerData {
  name: string;
  description?: string;
  is_active?: boolean;
  action_type?: 'check_idle_conversations';
  idle_minutes: number;
  check_frequency_minutes: number;
  requires_no_assignee?: boolean;
}

export interface UpdateTriggerData {
  name?: string;
  description?: string;
  is_active?: boolean;
  action_type?: 'check_idle_conversations';
  idle_minutes?: number;
  check_frequency_minutes?: number;
  requires_no_assignee?: boolean;
}

export interface InboxTrigger {
  id: number;
  inbox_id: number;
  trigger_id: number;
  created_at: Date;
}
