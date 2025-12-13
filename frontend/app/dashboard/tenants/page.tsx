"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiAddLine, RiEditLine, RiDeleteBinLine, RiBuilding2Line } from "@remixicon/react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Tenant {
  id: string;
  name: string;
  chatwoot_url: string;
  chatwoot_token?: string;
  chatwoot_account_id?: number;
  created_at: string;
  updated_at: string;
}

export default function TenantsPage() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    chatwoot_url: "",
    chatwoot_token: "",
    chatwoot_account_id: "",
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await api.get("/tenants");
      setTenants(response.data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar tenants",
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
        name: formData.name,
        chatwoot_url: formData.chatwoot_url,
        chatwoot_token: formData.chatwoot_token || undefined,
        chatwoot_account_id: formData.chatwoot_account_id
          ? parseInt(formData.chatwoot_account_id)
          : undefined,
      };

      if (editingTenant) {
        await api.put(`/tenants/${editingTenant.id}`, payload);
        toast({
          title: "Tenant atualizado",
          description: "Tenant atualizado com sucesso",
        });
      } else {
        await api.post("/tenants", payload);
        toast({
          title: "Tenant criado",
          description: "Tenant criado com sucesso",
        });
      }

      setShowForm(false);
      setEditingTenant(null);
      setFormData({
        name: "",
        chatwoot_url: "",
        chatwoot_token: "",
        chatwoot_account_id: "",
      });
      fetchTenants();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar tenant",
        description: error.response?.data?.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      chatwoot_url: tenant.chatwoot_url,
      chatwoot_token: tenant.chatwoot_token || "",
      chatwoot_account_id: tenant.chatwoot_account_id?.toString() || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este tenant?")) return;

    try {
      await api.delete(`/tenants/${id}`);
      toast({
        title: "Tenant excluído",
        description: "Tenant excluído com sucesso",
      });
      fetchTenants();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir tenant",
        description: error.response?.data?.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenants</h1>
          <p className="text-muted-foreground">
            Gerencie as empresas cadastradas no sistema
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <RiAddLine className="h-4 w-4" />
          {showForm ? "Cancelar" : "Novo Tenant"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingTenant ? "Editar Tenant" : "Novo Tenant"}
            </CardTitle>
            <CardDescription>
              Preencha os dados do tenant abaixo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chatwoot_url">URL do Chatwoot</Label>
                <Input
                  id="chatwoot_url"
                  type="url"
                  value={formData.chatwoot_url}
                  onChange={(e) =>
                    setFormData({ ...formData, chatwoot_url: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chatwoot_token">Token do Chatwoot (opcional)</Label>
                <Input
                  id="chatwoot_token"
                  type="password"
                  value={formData.chatwoot_token}
                  onChange={(e) =>
                    setFormData({ ...formData, chatwoot_token: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chatwoot_account_id">Account ID do Chatwoot (opcional)</Label>
                <Input
                  id="chatwoot_account_id"
                  type="number"
                  value={formData.chatwoot_account_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      chatwoot_account_id: e.target.value,
                    })
                  }
                />
              </div>
              <Button type="submit">
                {editingTenant ? "Atualizar" : "Criar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : tenants.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <RiBuilding2Line className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhum tenant cadastrado ainda
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => (
            <Card key={tenant.id}>
              <CardHeader>
                <CardTitle>{tenant.name}</CardTitle>
                <CardDescription>{tenant.chatwoot_url}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Account ID:</span>{" "}
                    {tenant.chatwoot_account_id || "Não configurado"}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(tenant)}
                      className="gap-2"
                    >
                      <RiEditLine className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(tenant.id)}
                      className="gap-2"
                    >
                      <RiDeleteBinLine className="h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

