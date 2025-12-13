"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiAddLine, RiEditLine, RiDeleteBinLine, RiInboxLine } from "@remixicon/react";
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

  return (
    <div className="space-y-8">
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
                  <Label htmlFor="tenant_id">Tenant *</Label>
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
                  <Label htmlFor="inbox_id">ID do Inbox (Chatwoot) *</Label>
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
                  <Label htmlFor="inbox_name">Nome do Inbox *</Label>
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
                  <Label htmlFor="whatsapp_phone_number_id">
                    WhatsApp Phone Number ID *</Label>
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
                  <Label htmlFor="whatsapp_access_token">
                    WhatsApp Access Token *</Label>
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
                  <Label htmlFor="whatsapp_api_version">
                    WhatsApp API Version *</Label>
                  <Input
                    id="whatsapp_api_version"
                    value={formData.whatsapp_api_version}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        whatsapp_api_version: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="typebot_base_url">URL Base do Typebot *</Label>
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
                  <Label htmlFor="typebot_api_key">API Key do Typebot</Label>
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
                  <Label htmlFor="typebot_public_id">
                    Public ID do Typebot *</Label>
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
                  <Label htmlFor="chatwoot_api_token">
                    Token da API do Chatwoot</Label>
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
                  <Label htmlFor="is_active">Status</Label>
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
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(inbox)}
                        className="gap-2"
                      >
                        <RiEditLine className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(inbox.id)}
                        className="gap-2"
                      >
                        <RiDeleteBinLine className="h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

