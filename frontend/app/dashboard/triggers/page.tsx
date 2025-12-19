"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RiAddLine, RiEditLine, RiDeleteBinLine, RiInboxLine, RiCloseCircleLine, RiFilterLine } from "@remixicon/react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Trigger {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  action_type: string;
  idle_minutes: number;
  check_frequency_minutes: number;
  requires_no_assignee: boolean;
  created_at: string;
  updated_at: string;
}

interface Inbox {
  id: number;
  inbox_id: number;
  inbox_name: string | null;
  tenant_id: number;
}

interface Tenant {
  id: number;
  name: string;
}

export default function TriggersPage() {
  const { toast } = useToast();
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredInboxes, setFilteredInboxes] = useState<Inbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<Trigger | null>(null);
  const [showInboxSelector, setShowInboxSelector] = useState<number | null>(null);
  const [triggerInboxes, setTriggerInboxes] = useState<Record<number, Inbox[]>>({});
  const [filterTenantId, setFilterTenantId] = useState<number | null>(null);
  const [filterInboxId, setFilterInboxId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    tenant_id: "",
    inbox_id: "",
    name: "",
    description: "",
    is_active: true,
    action_type: "check_idle_conversations",
    idle_minutes: "5",
    check_frequency_minutes: "1",
    requires_no_assignee: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [triggersRes, inboxesRes, tenantsRes] = await Promise.all([
        api.get("/triggers"),
        api.get("/inboxes"),
        api.get("/tenants"),
      ]);
      setTriggers(triggersRes.data);
      setInboxes(inboxesRes.data);
      setTenants(tenantsRes.data);
      
      // Busca inboxes associados a cada trigger
      const inboxMap: Record<number, Inbox[]> = {};
      for (const trigger of triggersRes.data) {
        try {
          // Para cada inbox, verifica se tem o trigger associado
          const associatedInboxes: Inbox[] = [];
          for (const inbox of inboxesRes.data) {
            try {
              const inboxTriggers = await api.get(`/inboxes/${inbox.id}/triggers`);
              if (inboxTriggers.data.some((t: Trigger) => t.id === trigger.id)) {
                associatedInboxes.push(inbox);
              }
            } catch {
              // Ignora erros
            }
          }
          inboxMap[trigger.id] = associatedInboxes;
        } catch {
          inboxMap[trigger.id] = [];
        }
      }
      setTriggerInboxes(inboxMap);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.response?.data?.error || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTriggerInboxes = async (triggerId: number) => {
    try {
      // Busca todos os inboxes e verifica quais têm o trigger associado
      const allInboxes = await api.get("/inboxes");
      const associatedInboxes: Inbox[] = [];
      
      for (const inbox of allInboxes.data) {
        try {
          const inboxTriggers = await api.get(`/inboxes/${inbox.id}/triggers`);
          if (inboxTriggers.data.some((t: Trigger) => t.id === triggerId)) {
            associatedInboxes.push(inbox);
          }
        } catch {
          // Ignora erros
        }
      }
      
      setTriggerInboxes(prev => ({ ...prev, [triggerId]: associatedInboxes }));
    } catch (error: any) {
      console.error("Erro ao buscar inboxes do trigger:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validações
      if (!formData.tenant_id) {
        toast({
          title: "Erro de validação",
          description: "Selecione um tenant",
          variant: "destructive",
        });
        return;
      }

      if (!formData.inbox_id) {
        toast({
          title: "Erro de validação",
          description: "Selecione um inbox",
          variant: "destructive",
        });
        return;
      }

      if (parseInt(formData.check_frequency_minutes) < 1) {
        toast({
          title: "Erro de validação",
          description: "A frequência de verificação deve ser no mínimo 1 minuto",
          variant: "destructive",
        });
        return;
      }

      if (parseInt(formData.idle_minutes) <= 0) {
        toast({
          title: "Erro de validação",
          description: "O tempo sem resposta deve ser maior que 0",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_active: formData.is_active,
        action_type: formData.action_type,
        idle_minutes: parseInt(formData.idle_minutes),
        check_frequency_minutes: parseInt(formData.check_frequency_minutes),
        requires_no_assignee: formData.requires_no_assignee,
      };

      if (editingTrigger) {
        await api.put(`/triggers/${editingTrigger.id}`, payload);
        toast({
          title: "Trigger atualizado",
          description: "Trigger atualizado com sucesso",
        });
      } else {
        // Cria o trigger
        const triggerRes = await api.post("/triggers", payload);
        const triggerId = triggerRes.data.id;
        
        // Associa ao inbox automaticamente
        await api.post(`/triggers/${triggerId}/attach`, {
          inbox_id: parseInt(formData.inbox_id),
        });
        
        toast({
          title: "Trigger criado",
          description: "Trigger criado e associado ao inbox com sucesso",
        });
      }

      setShowForm(false);
      setEditingTrigger(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar trigger",
        description: error.response?.data?.error || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (trigger: Trigger) => {
    setEditingTrigger(trigger);
    
    // Busca inboxes associados ao trigger para preencher o formulário
    const associatedInboxes = triggerInboxes[trigger.id] || [];
    const firstInbox = associatedInboxes[0];
    
    setFormData({
      tenant_id: firstInbox ? firstInbox.tenant_id.toString() : "",
      inbox_id: firstInbox ? firstInbox.id.toString() : "",
      name: trigger.name,
      description: trigger.description || "",
      is_active: trigger.is_active,
      action_type: trigger.action_type,
      idle_minutes: trigger.idle_minutes.toString(),
      check_frequency_minutes: trigger.check_frequency_minutes.toString(),
      requires_no_assignee: trigger.requires_no_assignee,
    });
    
    // Se não tiver inboxes associados, busca
    if (associatedInboxes.length === 0) {
      await fetchTriggerInboxes(trigger.id);
    }
    
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este trigger?")) return;

    try {
      await api.delete(`/triggers/${id}`);
      toast({
        title: "Trigger excluído",
        description: "Trigger excluído com sucesso",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir trigger",
        description: error.response?.data?.error || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleAttachInbox = async (triggerId: number, inboxId: number) => {
    try {
      await api.post(`/triggers/${triggerId}/attach`, { inbox_id: inboxId });
      toast({
        title: "Inbox associado",
        description: "Inbox associado ao trigger com sucesso",
      });
      fetchTriggerInboxes(triggerId);
    } catch (error: any) {
      toast({
        title: "Erro ao associar inbox",
        description: error.response?.data?.error || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleDetachInbox = async (triggerId: number, inboxId: number) => {
    try {
      await api.delete(`/triggers/${triggerId}/attach/${inboxId}`);
      toast({
        title: "Inbox desassociado",
        description: "Inbox desassociado do trigger com sucesso",
      });
      fetchTriggerInboxes(triggerId);
    } catch (error: any) {
      toast({
        title: "Erro ao desassociar inbox",
        description: error.response?.data?.error || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      tenant_id: "",
      inbox_id: "",
      name: "",
      description: "",
      is_active: true,
      action_type: "check_idle_conversations",
      idle_minutes: "5",
      check_frequency_minutes: "1",
      requires_no_assignee: true,
    });
    setFilteredInboxes([]);
  };

  // Filtra inboxes quando tenant é selecionado (formulário)
  useEffect(() => {
    if (formData.tenant_id) {
      const filtered = inboxes.filter(
        (inbox) => inbox.tenant_id.toString() === formData.tenant_id
      );
      setFilteredInboxes(filtered);
      // Limpa inbox_id se o tenant mudou
      if (formData.inbox_id) {
        const selectedInbox = filtered.find(
          (inbox) => inbox.id.toString() === formData.inbox_id
        );
        if (!selectedInbox) {
          setFormData({ ...formData, inbox_id: "" });
        }
      }
    } else {
      setFilteredInboxes([]);
      setFormData({ ...formData, inbox_id: "" });
    }
  }, [formData.tenant_id, inboxes]);

  // Filtra triggers baseado nos filtros selecionados
  const filteredTriggers = triggers.filter((trigger) => {
    const triggerInboxesList = triggerInboxes[trigger.id] || [];
    
    // Se nenhum filtro está selecionado, mostra todos
    if (!filterTenantId && !filterInboxId) {
      return true;
    }
    
    // Filtro por tenant: verifica se algum inbox do trigger pertence ao tenant selecionado
    if (filterTenantId) {
      const hasTenantMatch = triggerInboxesList.some(
        (inbox) => inbox.tenant_id === filterTenantId
      );
      if (!hasTenantMatch) {
        return false;
      }
    }
    
    // Filtro por inbox: verifica se o inbox está associado ao trigger
    if (filterInboxId) {
      const hasInboxMatch = triggerInboxesList.some(
        (inbox) => inbox.id === filterInboxId
      );
      if (!hasInboxMatch) {
        return false;
      }
    }
    
    return true;
  });

  // Obtém os tenants únicos dos triggers (baseado nos inboxes associados)
  const getTriggerTenants = (triggerId: number): Tenant[] => {
    const triggerInboxesList = triggerInboxes[triggerId] || [];
    const tenantIds = new Set(triggerInboxesList.map((inbox) => inbox.tenant_id));
    return tenants.filter((tenant) => tenantIds.has(tenant.id));
  };

  // Obtém inboxes filtrados para o filtro (baseado no tenant selecionado)
  const getFilterInboxes = (): Inbox[] => {
    if (filterTenantId) {
      return inboxes.filter((inbox) => inbox.tenant_id === filterTenantId);
    }
    return inboxes;
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Triggers</h1>
          <p className="text-muted-foreground">
            Gerencie os triggers de conversas paradas e comandos do Typebot
          </p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); if (showForm) { setEditingTrigger(null); resetForm(); } }} className="gap-2">
          <RiAddLine className="h-4 w-4" />
          {showForm ? "Cancelar" : "Novo Trigger"}
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiFilterLine className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filter-tenant">Filtrar por Tenant</Label>
              <select
                id="filter-tenant"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                value={filterTenantId?.toString() || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilterTenantId(value ? parseInt(value) : null);
                  // Limpa o filtro de inbox se o tenant mudar
                  if (value && filterInboxId) {
                    const inbox = inboxes.find((i) => i.id === filterInboxId);
                    if (inbox && inbox.tenant_id !== parseInt(value)) {
                      setFilterInboxId(null);
                    }
                  }
                }}
              >
                <option value="">Todos os tenants</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id.toString()}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-inbox">Filtrar por Inbox</Label>
              <select
                id="filter-inbox"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                value={filterInboxId?.toString() || ""}
                onChange={(e) => setFilterInboxId(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">Todos os inboxes</option>
                {getFilterInboxes().map((inbox) => (
                  <option key={inbox.id} value={inbox.id.toString()}>
                    {inbox.inbox_name || `Inbox #${inbox.inbox_id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterTenantId(null);
                  setFilterInboxId(null);
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingTrigger ? "Editar Trigger" : "Novo Trigger"}</CardTitle>
            <CardDescription>
              Configure o trigger para acionar comandos no Typebot quando conversas ficarem paradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tenant_id">Tenant *</Label>
                  <select
                    id="tenant_id"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    value={formData.tenant_id}
                    onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value, inbox_id: "" })}
                    required
                    disabled={!!editingTrigger}
                  >
                    <option value="">Selecione um tenant</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Empresa/cliente ao qual este trigger pertence
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inbox_id">Inbox *</Label>
                  <select
                    id="inbox_id"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    value={formData.inbox_id}
                    onChange={(e) => setFormData({ ...formData, inbox_id: e.target.value })}
                    required
                    disabled={!!editingTrigger || !formData.tenant_id}
                  >
                    <option value="">
                      {formData.tenant_id ? "Selecione um inbox" : "Selecione primeiro o tenant"}
                    </option>
                    {filteredInboxes.map((inbox) => (
                      <option key={inbox.id} value={inbox.id}>
                        {inbox.inbox_name || `Inbox #${inbox.inbox_id}`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Inbox ao qual este trigger será aplicado
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome do Comando (Typebot) *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex: conversa_parada"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Nome do comando configurado no Typebot (Command Event)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Envia mensagem quando conversa está parada há 5 minutos"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="idle_minutes">Tempo sem Resposta (minutos) *</Label>
                  <Input
                    id="idle_minutes"
                    type="number"
                    min="1"
                    value={formData.idle_minutes}
                    onChange={(e) => setFormData({ ...formData, idle_minutes: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Tempo mínimo sem atividade para acionar o trigger
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="check_frequency_minutes">Frequência de Verificação (minutos) *</Label>
                  <Input
                    id="check_frequency_minutes"
                    type="number"
                    min="1"
                    value={formData.check_frequency_minutes}
                    onChange={(e) => setFormData({ ...formData, check_frequency_minutes: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    De quanto em quanto tempo verificar (mínimo: 1 minuto)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="requires_no_assignee"
                  checked={formData.requires_no_assignee}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_no_assignee: checked })}
                />
                <Label htmlFor="requires_no_assignee" className="cursor-pointer">
                  Acionar apenas se não tiver assignee ou team atribuído
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Trigger ativo
                </Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingTrigger ? "Atualizar" : "Criar"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingTrigger(null); resetForm(); }}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {filteredTriggers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {triggers.length === 0
                ? "Nenhum trigger cadastrado. Clique em \"Novo Trigger\" para criar um."
                : "Nenhum trigger encontrado com os filtros selecionados."}
            </CardContent>
          </Card>
        ) : (
          filteredTriggers.map((trigger) => {
            const triggerInboxesList = triggerInboxes[trigger.id] || [];
            const triggerTenants = getTriggerTenants(trigger.id);
            
            return (
            <Card key={trigger.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{trigger.name}</CardTitle>
                      {trigger.is_active ? (
                        <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                          Ativo
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded">
                          Inativo
                        </span>
                      )}
                    </div>
                    {trigger.description && (
                      <CardDescription className="mt-1">{trigger.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowInboxSelector(showInboxSelector === trigger.id ? null : trigger.id)}
                      className="gap-2"
                    >
                      <RiInboxLine className="h-4 w-4" />
                      Inboxes ({triggerInboxes[trigger.id]?.length || 0})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(trigger)}
                      className="gap-2"
                    >
                      <RiEditLine className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(trigger.id)}
                      className="gap-2 text-destructive"
                    >
                      <RiDeleteBinLine className="h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Informações de Tenant e Inboxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">Tenant(s)</p>
                      <div className="flex flex-wrap gap-1">
                        {triggerTenants.length > 0 ? (
                          triggerTenants.map((tenant) => (
                            <span
                              key={tenant.id}
                              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                            >
                              {tenant.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Nenhum tenant associado</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">Inbox(es)</p>
                      <div className="flex flex-wrap gap-1">
                        {triggerInboxesList.length > 0 ? (
                          triggerInboxesList.map((inbox) => (
                            <span
                              key={inbox.id}
                              className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded"
                            >
                              {inbox.inbox_name || `Inbox #${inbox.inbox_id}`}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Nenhum inbox associado</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Configurações do Trigger */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tempo sem resposta</p>
                      <p className="font-medium">{trigger.idle_minutes} minutos</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Frequência</p>
                      <p className="font-medium">A cada {trigger.check_frequency_minutes} minutos</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sem assignee</p>
                      <p className="font-medium">{trigger.requires_no_assignee ? "Sim" : "Não"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ação</p>
                      <p className="font-medium">{trigger.action_type}</p>
                    </div>
                  </div>
                </div>

                {showInboxSelector === trigger.id && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Inboxes Associados</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowInboxSelector(null)}
                      >
                        Fechar
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {triggerInboxes[trigger.id]?.length > 0 ? (
                        triggerInboxes[trigger.id].map((inbox) => (
                          <div key={inbox.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="font-medium">
                                {inbox.inbox_name || `Inbox #${inbox.inbox_id}`}
                              </p>
                              <p className="text-xs text-muted-foreground">ID: {inbox.inbox_id}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDetachInbox(trigger.id, inbox.id)}
                              className="gap-2 text-destructive"
                            >
                              <RiCloseCircleLine className="h-4 w-4" />
                              Desassociar
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum inbox associado</p>
                      )}
                      <div className="pt-2 border-t">
                        <Label className="mb-2 block">Associar novo Inbox</Label>
                        <div className="flex gap-2">
                          <select
                            className="flex-1 px-3 py-2 border rounded-md"
                            onChange={(e) => {
                              const inboxId = parseInt(e.target.value);
                              if (inboxId) {
                                handleAttachInbox(trigger.id, inboxId);
                                e.target.value = "";
                              }
                            }}
                            defaultValue=""
                          >
                            <option value="">Selecione um inbox...</option>
                            {inboxes
                              .filter(
                                (inbox) =>
                                  !triggerInboxes[trigger.id]?.some((ai) => ai.id === inbox.id)
                              )
                              .map((inbox) => (
                                <option key={inbox.id} value={inbox.id}>
                                  {inbox.inbox_name || `Inbox #${inbox.inbox_id}`}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
