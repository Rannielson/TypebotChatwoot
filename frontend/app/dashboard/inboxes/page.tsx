"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RiAddLine, RiEditLine, RiDeleteBinLine, RiInboxLine, RiCloseCircleLine } from "@remixicon/react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Tenant {
  id: string;
  name: string;
}

interface Inbox {
  id: string;
  tenant_id: string;
  inbox_id: number;
  inbox_name: string;
  whatsapp_phone_number_id: string;
  whatsapp_access_token: string;
  whatsapp_api_version: string;
  typebot_base_url: string;
  typebot_api_key?: string;
  typebot_public_id: string;
  chatwoot_api_token?: string;
  is_active: boolean;
  is_test_mode?: boolean;
  test_phone_number?: string | null;
  created_at: string;
  updated_at: string;
}

export default function InboxesPage() {
  const { toast } = useToast();
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInbox, setEditingInbox] = useState<Inbox | null>(null);
  const [showCloseBulkDialog, setShowCloseBulkDialog] = useState(false);
  const [selectedInboxForBulk, setSelectedInboxForBulk] = useState<Inbox | null>(null);
  const [bulkCloseLoading, setBulkCloseLoading] = useState(false);
  const [bulkCloseFilters, setBulkCloseFilters] = useState({
    status: "",
    older_than_hours: "",
    conversation_status: "",
  });
  const [formData, setFormData] = useState({
    tenant_id: "",
    inbox_id: "",
    inbox_name: "",
    whatsapp_phone_number_id: "",
    whatsapp_access_token: "",
    whatsapp_api_version: "v21.0",
    typebot_base_url: "",
    typebot_api_key: "",
    typebot_public_id: "",
    chatwoot_api_token: "",
    is_active: "true",
    is_test_mode: "false",
    test_phone_number: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [inboxesRes, tenantsRes] = await Promise.all([
        api.get("/inboxes"),
        api.get("/tenants"),
      ]);
      setInboxes(inboxesRes.data);
      setTenants(tenantsRes.data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.response?.data?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        tenant_id: formData.tenant_id,
        inbox_id: parseInt(formData.inbox_id),
        inbox_name: formData.inbox_name,
        whatsapp_phone_number_id: formData.whatsapp_phone_number_id,
        whatsapp_access_token: formData.whatsapp_access_token,
        whatsapp_api_version: formData.whatsapp_api_version,
        typebot_base_url: formData.typebot_base_url,
        typebot_api_key: formData.typebot_api_key || undefined,
        typebot_public_id: formData.typebot_public_id,
        chatwoot_api_token: formData.chatwoot_api_token || undefined,
        is_active: formData.is_active === "true",
        is_test_mode: formData.is_test_mode === "true",
        test_phone_number: formData.is_test_mode === "true" && formData.test_phone_number 
          ? formData.test_phone_number.trim() 
          : undefined,
      };

      if (editingInbox) {
        await api.put(`/inboxes/${editingInbox.id}`, payload);
        toast({
          title: "Inbox atualizado",
          description: "Inbox atualizado com sucesso",
        });
      } else {
        await api.post("/inboxes", payload);
        toast({
          title: "Inbox criado",
          description: "Inbox criado com sucesso",
        });
      }

      setShowForm(false);
      setEditingInbox(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar inbox",
        description: error.response?.data?.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      tenant_id: "",
      inbox_id: "",
      inbox_name: "",
      whatsapp_phone_number_id: "",
      whatsapp_access_token: "",
      whatsapp_api_version: "v21.0",
      typebot_base_url: "",
      typebot_api_key: "",
      typebot_public_id: "",
      chatwoot_api_token: "",
      is_active: "true",
      is_test_mode: "false",
      test_phone_number: "",
    });
  };

  const handleEdit = (inbox: Inbox) => {
    setEditingInbox(inbox);
    setFormData({
      tenant_id: inbox.tenant_id,
      inbox_id: inbox.inbox_id.toString(),
      inbox_name: inbox.inbox_name,
      whatsapp_phone_number_id: inbox.whatsapp_phone_number_id,
      whatsapp_access_token: inbox.whatsapp_access_token,
      whatsapp_api_version: inbox.whatsapp_api_version,
      typebot_base_url: inbox.typebot_base_url,
      typebot_api_key: inbox.typebot_api_key || "",
      typebot_public_id: inbox.typebot_public_id,
      chatwoot_api_token: inbox.chatwoot_api_token || "",
      is_active: inbox.is_active.toString(),
      is_test_mode: (inbox.is_test_mode ?? false).toString(),
      test_phone_number: inbox.test_phone_number || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este inbox?")) return;

    try {
      await api.delete(`/inboxes/${id}`);
      toast({
        title: "Inbox excluído",
        description: "Inbox excluído com sucesso",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir inbox",
        description: error.response?.data?.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleOpenCloseBulkDialog = (inbox: Inbox) => {
    setSelectedInboxForBulk(inbox);
    setBulkCloseFilters({
      status: "",
      older_than_hours: "",
      conversation_status: "",
    });
    setShowCloseBulkDialog(true);
  };

  const handleCloseBulkSessions = async () => {
    if (!selectedInboxForBulk) return;

    const filters: any = {};
    if (bulkCloseFilters.status) filters.status = bulkCloseFilters.status;
    if (bulkCloseFilters.older_than_hours) {
      const hours = parseInt(bulkCloseFilters.older_than_hours);
      if (isNaN(hours) || hours < 0) {
        toast({
          title: "Erro",
          description: "Horas deve ser um número positivo",
          variant: "destructive",
        });
        return;
      }
      filters.older_than_hours = hours;
    }
    if (bulkCloseFilters.conversation_status) {
      filters.conversation_status = bulkCloseFilters.conversation_status;
    }

    // Confirmação antes de encerrar
    const filterDesc = [];
    if (filters.status) filterDesc.push(`Status: ${filters.status}`);
    if (filters.older_than_hours) filterDesc.push(`Mais antigas que: ${filters.older_than_hours} horas`);
    if (filters.conversation_status) filterDesc.push(`Conversa: ${filters.conversation_status}`);

    if (!confirm(`Tem certeza que deseja encerrar sessões em massa para o inbox "${selectedInboxForBulk.inbox_name}"?\n\nFiltros: ${filterDesc.join(", ") || "Nenhum (todas as sessões ativas/pausadas)"}`)) {
      return;
    }

    setBulkCloseLoading(true);
    try {
      const response = await api.post(`/inboxes/${selectedInboxForBulk.id}/sessions/close-bulk`, filters);
      toast({
        title: "Sessões encerradas",
        description: `${response.data.closed} sessão(ões) encerrada(s) com sucesso`,
      });
      setShowCloseBulkDialog(false);
      setSelectedInboxForBulk(null);
      setBulkCloseFilters({
        status: "",
        older_than_hours: "",
        conversation_status: "",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao encerrar sessões",
        description: error.response?.data?.error || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setBulkCloseLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inboxes</h1>
            <p className="text-muted-foreground">
              Gerencie as caixas de entrada configuradas
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <RiAddLine className="h-4 w-4" />
            {showForm ? "Cancelar" : "Novo Inbox"}
          </Button>
        </div>

        {/* URL do Webhook */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">🔗 URL do Webhook para Chatwoot</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Copie esta URL e configure no Chatwoot → Settings → Applications → Webhooks
                </p>
                <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded border">
                  <code className="text-sm flex-1 font-mono break-all">
                    https://connectwebhook.atomos.tech/webhook/chatwoot
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        "https://connectwebhook.atomos.tech/webhook/chatwoot"
                      );
                      toast({
                        title: "URL copiada!",
                        description: "Cole no Chatwoot → Settings → Applications → Webhooks",
                      });
                    }}
                    className="shrink-0"
                  >
                    Copiar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingInbox ? "Editar Inbox" : "Novo Inbox"}
            </CardTitle>
            <CardDescription>
              Preencha os dados do inbox abaixo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="tenant_id">Tenant *</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Empresa/cliente ao qual este inbox pertence
                    </p>
                  </div>
                  <select
                    id="tenant_id"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    value={formData.tenant_id}
                    onChange={(e) =>
                      setFormData({ ...formData, tenant_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Selecione um tenant</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="inbox_id">ID do Inbox (Chatwoot) *</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ID numérico do inbox no Chatwoot (encontre em Settings → Inboxes)
                    </p>
                  </div>
                  <Input
                    id="inbox_id"
                    type="number"
                    value={formData.inbox_id}
                    onChange={(e) =>
                      setFormData({ ...formData, inbox_id: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="inbox_name">Nome do Inbox *</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Nome descritivo para identificar o inbox (ex: "Atendimento Principal")
                    </p>
                  </div>
                  <Input
                    id="inbox_name"
                    value={formData.inbox_name}
                    onChange={(e) =>
                      setFormData({ ...formData, inbox_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="whatsapp_phone_number_id">
                      WhatsApp Phone Number ID *
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ID do número no Meta for Developers (não é o número de telefone)
                    </p>
                  </div>
                  <Input
                    id="whatsapp_phone_number_id"
                    value={formData.whatsapp_phone_number_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        whatsapp_phone_number_id: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="whatsapp_access_token">
                      WhatsApp Access Token *
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Token permanente do WhatsApp Business API (Meta for Developers)
                    </p>
                  </div>
                  <Input
                    id="whatsapp_access_token"
                    type="password"
                    value={formData.whatsapp_access_token}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        whatsapp_access_token: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="whatsapp_api_version">
                      WhatsApp API Version
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Versão da API (padrão: v21.0)
                    </p>
                  </div>
                  <Input
                    id="whatsapp_api_version"
                    value={formData.whatsapp_api_version}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        whatsapp_api_version: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="typebot_base_url">URL Base do Typebot *</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      URL completa do Typebot Viewer (ex: https://assistenteatomos.cleoia.com.br)
                    </p>
                  </div>
                  <Input
                    id="typebot_base_url"
                    type="url"
                    value={formData.typebot_base_url}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        typebot_base_url: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="typebot_api_key">API Key do Typebot</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Opcional: Necessário apenas se o Typebot requer autenticação
                    </p>
                  </div>
                  <Input
                    id="typebot_api_key"
                    type="password"
                    value={formData.typebot_api_key}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        typebot_api_key: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="typebot_public_id">
                      Public ID do Typebot *
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ID público do bot no Typebot (encontre em Settings → General)
                    </p>
                  </div>
                  <Input
                    id="typebot_public_id"
                    value={formData.typebot_public_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        typebot_public_id: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="chatwoot_api_token">
                      Token da API do Chatwoot
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Opcional: Para criar notas privadas no Chatwoot (Settings → Applications → Access Tokens)
                    </p>
                  </div>
                  <Input
                    id="chatwoot_api_token"
                    type="password"
                    value={formData.chatwoot_api_token}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        chatwoot_api_token: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="is_active">Status</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ative/desative o processamento de mensagens deste inbox
                    </p>
                  </div>
                  <select
                    id="is_active"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    value={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.value })
                    }
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="is_test_mode">Modo Teste</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Quando ativado, processa apenas mensagens do telefone especificado. Ideal para validação antes de produção.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="is_test_mode"
                      checked={formData.is_test_mode === "true"}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          is_test_mode: checked ? "true" : "false",
                          test_phone_number: checked ? formData.test_phone_number : "",
                        })
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {formData.is_test_mode === "true" ? "Ativado" : "Desativado"}
                    </span>
                  </div>
                  {formData.is_test_mode === "true" && (
                    <div className="mt-2">
                      <Label htmlFor="test_phone_number">Telefone de Teste *</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Número de telefone no formato: 558192387425 (apenas dígitos, sem espaços ou caracteres especiais)
                      </p>
                      <Input
                        id="test_phone_number"
                        value={formData.test_phone_number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            test_phone_number: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        placeholder="558192387425"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
              <Button type="submit">
                {editingInbox ? "Atualizar" : "Criar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : inboxes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <RiInboxLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhum inbox cadastrado ainda
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {inboxes.map((inbox) => {
            const tenant = tenants.find((t) => t.id === inbox.tenant_id);
            return (
              <Card key={inbox.id}>
                <CardHeader>
                  <CardTitle>{inbox.inbox_name}</CardTitle>
                  <CardDescription>
                    {tenant?.name || "Tenant não encontrado"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Inbox ID:</span>{" "}
                      {inbox.inbox_id}
                    </div>
                    <div>
                      <span className="font-medium">Typebot:</span>{" "}
                      {inbox.typebot_public_id}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>{" "}
                      {inbox.is_active ? (
                        <span className="text-green-600">Ativo</span>
                      ) : (
                        <span className="text-red-600">Inativo</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 mt-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(inbox)}
                          className="gap-2 flex-1"
                        >
                          <RiEditLine className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(inbox.id)}
                          className="gap-2 flex-1"
                        >
                          <RiDeleteBinLine className="h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenCloseBulkDialog(inbox)}
                        className="gap-2 w-full"
                      >
                        <RiCloseCircleLine className="h-4 w-4" />
                        Encerrar Sessões em Massa
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog para Encerrar Sessões em Massa */}
      {showCloseBulkDialog && selectedInboxForBulk && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Encerrar Sessões em Massa</CardTitle>
              <CardDescription>
                Encerrar sessões do inbox "{selectedInboxForBulk.inbox_name}" com filtros específicos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk_status">Status da Sessão</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Filtra por status da sessão no sistema
                </p>
                <select
                  id="bulk_status"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  value={bulkCloseFilters.status}
                  onChange={(e) =>
                    setBulkCloseFilters({ ...bulkCloseFilters, status: e.target.value })
                  }
                >
                  <option value="">Todas (active e paused)</option>
                  <option value="active">Apenas Ativas</option>
                  <option value="paused">Apenas Pausadas</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk_older_than_hours">Sessões Mais Antigas Que (Horas)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Encerra apenas sessões criadas há mais de X horas. Deixe vazio para não filtrar por tempo.
                </p>
                <Input
                  id="bulk_older_than_hours"
                  type="number"
                  min="0"
                  value={bulkCloseFilters.older_than_hours}
                  onChange={(e) =>
                    setBulkCloseFilters({
                      ...bulkCloseFilters,
                      older_than_hours: e.target.value,
                    })
                  }
                  placeholder="Ex: 24 (sessões com mais de 24 horas)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk_conversation_status">Status da Conversa no Chatwoot</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Filtra por status da conversa no Chatwoot. Deixe vazio para não filtrar.
                </p>
                <select
                  id="bulk_conversation_status"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  value={bulkCloseFilters.conversation_status}
                  onChange={(e) =>
                    setBulkCloseFilters({
                      ...bulkCloseFilters,
                      conversation_status: e.target.value,
                    })
                  }
                >
                  <option value="">Todos os status</option>
                  <option value="open">Open (Aberta)</option>
                  <option value="resolved">Resolved (Resolvida)</option>
                  <option value="pending">Pending (Pendente)</option>
                  <option value="snoozed">Snoozed (Adiada)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCloseBulkDialog(false);
                    setSelectedInboxForBulk(null);
                  }}
                  className="flex-1"
                  disabled={bulkCloseLoading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCloseBulkSessions}
                  className="flex-1 gap-2"
                  disabled={bulkCloseLoading}
                >
                  {bulkCloseLoading ? "Encerrando..." : "Encerrar Sessões"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

