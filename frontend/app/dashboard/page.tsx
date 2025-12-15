"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiBuilding2Line, RiInboxLine, RiMessage3Line, RiCheckboxCircleLine, RiPauseLine, RiStopLine, RiRefreshLine } from "@remixicon/react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ActiveSession {
  id: number;
  tenant_id: number;
  inbox_id: number;
  conversation_id: number;
  phone_number: string;
  contact_name: string | null;
  typebot_session_id: string;
  typebot_public_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  inbox_name: string | null;
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    tenants: 0,
    inboxes: 0,
    activeSessions: 0,
  });
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'paused' | 'closed'>('active');
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);
  const [selectedInbox, setSelectedInbox] = useState<number | null>(null);
  const [inboxes, setInboxes] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [selectedStatus, selectedTenant, selectedInbox]);

  // Quando o tenant muda, limpa a seleção de inbox se o inbox não pertencer ao novo tenant
  useEffect(() => {
    if (selectedTenant && selectedInbox) {
      const inbox = inboxes.find(i => i.id === selectedInbox);
      if (inbox && inbox.tenant_id !== selectedTenant) {
        setSelectedInbox(null);
      }
    }
  }, [selectedTenant, inboxes, selectedInbox]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Busca tenants e inboxes
      const [tenantsRes, inboxesRes] = await Promise.all([
        api.get("/tenants"),
        api.get(`/inboxes${selectedTenant ? `?tenant_id=${selectedTenant}` : ''}`),
      ]);

      setTenants(tenantsRes.data);
      setInboxes(inboxesRes.data);

      // Busca estatísticas com filtros
      const statsParams = new URLSearchParams();
      if (selectedStatus) statsParams.append('status', selectedStatus);
      if (selectedTenant) statsParams.append('tenant_id', selectedTenant.toString());
      if (selectedInbox) statsParams.append('inbox_id', selectedInbox.toString());
      
      const statsRes = await api.get(`/sessions/stats?${statsParams.toString()}`);
      
      setStats({
        tenants: tenantsRes.data.length || 0,
        inboxes: inboxesRes.data.length || 0,
        activeSessions: statsRes.data.sessions || statsRes.data.activeSessions || 0,
      });

      await fetchSessions();
    } catch (error: any) {
      toast({
        title: "Erro ao carregar estatísticas",
        description: error.response?.data?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedTenant) params.append('tenant_id', selectedTenant.toString());
      if (selectedInbox) params.append('inbox_id', selectedInbox.toString());
      
      const response = await api.get(`/sessions?${params.toString()}`);
      setSessions(response.data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar sessões",
        description: error.response?.data?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSessionsLoading(false);
    }
  };

  const handlePause = async (sessionId: number) => {
    if (!confirm("Tem certeza que deseja pausar esta sessão?")) return;

    try {
      await api.post(`/sessions/${sessionId}/pause`);
      toast({
        title: "Sessão pausada",
        description: "A sessão foi pausada com sucesso",
      });
      await fetchSessions();
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao pausar sessão",
        description: error.response?.data?.error || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleClose = async (sessionId: number) => {
    if (!confirm("Tem certeza que deseja fechar esta sessão?")) return;

    try {
      await api.post(`/sessions/${sessionId}/close`);
      toast({
        title: "Sessão fechada",
        description: "A sessão foi fechada com sucesso",
      });
      await fetchSessions();
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao fechar sessão",
        description: error.response?.data?.error || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statCards = [
    {
      title: "Tenants",
      value: stats.tenants,
      icon: RiBuilding2Line,
      description: "Empresas cadastradas",
    },
    {
      title: "Inboxes",
      value: stats.inboxes,
      icon: RiInboxLine,
      description: "Caixas de entrada configuradas",
    },
    {
      title: "Sessões Ativas",
      value: stats.activeSessions,
      icon: RiMessage3Line,
      description: "Conversas em andamento",
    },
    {
      title: "Status",
      value: "Online",
      icon: RiCheckboxCircleLine,
      description: "Sistema operacional",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema de conectores
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sessões</CardTitle>
                  <CardDescription>
                    {(() => {
                      const parts: string[] = [];
                      if (selectedStatus === 'active') parts.push('Ativas');
                      else if (selectedStatus === 'paused') parts.push('Pausadas');
                      else if (selectedStatus === 'closed') parts.push('Fechadas');
                      
                      if (selectedTenant) {
                        const tenant = tenants.find(t => t.id === selectedTenant);
                        parts.push(`do Tenant: ${tenant?.name || selectedTenant}`);
                      }
                      if (selectedInbox) {
                        const inbox = inboxes.find(i => i.id === selectedInbox);
                        parts.push(`do Inbox: ${inbox?.inbox_name || selectedInbox}`);
                      }
                      if (parts.length === 0) parts.push('do sistema');
                      return parts.join(' - ');
                    })()}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <select
                    className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as 'active' | 'paused' | 'closed')}
                  >
                    <option value="active">Ativas</option>
                    <option value="paused">Pausadas</option>
                    <option value="closed">Fechadas</option>
                  </select>
                  <select
                    className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    value={selectedTenant || ''}
                    onChange={(e) => setSelectedTenant(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Todos os Tenants</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name || `Tenant ${tenant.id}`}
                      </option>
                    ))}
                  </select>
                  <select
                    className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    value={selectedInbox || ''}
                    onChange={(e) => setSelectedInbox(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Todos os Inboxes</option>
                    {inboxes.map((inbox) => (
                      <option key={inbox.id} value={inbox.id}>
                        {inbox.inbox_name || `Inbox ${inbox.id}`}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchSessions}
                    disabled={sessionsLoading}
                    className="gap-2"
                  >
                    <RiRefreshLine className="h-4 w-4" />
                    Atualizar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="text-center py-8">Carregando sessões...</div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {selectedStatus === 'active' && 'Nenhuma sessão ativa no momento'}
                  {selectedStatus === 'paused' && 'Nenhuma sessão pausada no momento'}
                  {selectedStatus === 'closed' && 'Nenhuma sessão fechada no momento'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Início</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Inbox</TableHead>
                        <TableHead>Conversa ID</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="font-mono text-sm">
                            {formatDate(session.created_at)}
                          </TableCell>
                          <TableCell>
                            {session.contact_name || 'Sem nome'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {session.phone_number}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              session.status === 'active' ? 'bg-green-100 text-green-800' :
                              session.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                              session.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {session.status === 'active' ? 'Ativa' :
                               session.status === 'paused' ? 'Pausada' :
                               session.status === 'closed' ? 'Fechada' :
                               session.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {session.inbox_name || `Inbox ${session.inbox_id}`}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {session.conversation_id}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {session.status === 'active' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePause(session.id)}
                                    className="gap-2"
                                  >
                                    <RiPauseLine className="h-4 w-4" />
                                    Pausar
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleClose(session.id)}
                                    className="gap-2"
                                  >
                                    <RiStopLine className="h-4 w-4" />
                                    Fechar
                                  </Button>
                                </>
                              )}
                              {session.status === 'paused' && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleClose(session.id)}
                                  className="gap-2"
                                >
                                  <RiStopLine className="h-4 w-4" />
                                  Fechar
                                </Button>
                              )}
                              {session.status === 'closed' && (
                                <span className="text-xs text-muted-foreground">Sem ações</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

