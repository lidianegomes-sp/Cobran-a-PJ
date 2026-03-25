/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  Bell, 
  Search, 
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Menu,
  X,
  Play,
  Edit3,
  ChevronRight,
  ArrowLeft,
  Handshake,
  Mail,
  Lock,
  Phone,
  Building2,
  User as UserIcon,
  CreditCard,
  History,
  Calendar,
  Trash2,
  Edit,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

// --- Types ---
type UserRole = 'Operador' | 'Gestor';
type WalletType = 'Pontual' | 'PJ' | 'Hubsales' | 'Estante Virtual' | 'Saldo Negativo' | 'MKT';

interface User {
  name: string;
  role: UserRole;
  avatar: string;
  position: string;
}

interface CollectionHistory {
  id: string;
  date: string;
  user: string;
  action: string;
  status: string;
  observation: string;
}

interface InvoiceFinalizationHistory {
  id: string;
  date: string;
  user: string;
  type: string;
  observation?: string;
}

interface BillingRuleStep {
  id: string;
  name: string;
  delayDays: number;
  delayType: 'before' | 'after';
  statusFilter: string[];
  finalizationFilter: string[];
  walletFilter: WalletType[];
  templateId: string;
  active: boolean;
}

interface BillingRule {
  wallet: WalletType;
  steps: BillingRuleStep[];
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

type InvoiceStatus = string;
type FinalizationType = string;

interface Invoice {
  id: string;
  filial: string;
  slip: string;
  order: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  installments: number;
  amount: string;
  wallet: WalletType;
  status: InvoiceStatus;
  finalization?: FinalizationType;
  finalizationDate?: string;
  finalized?: boolean;
  finalizationHistory?: InvoiceFinalizationHistory[];
}

const INITIAL_INVOICE_STATUSES: InvoiceStatus[] = ['Em dia', 'Atrasos', 'Datas Vencimento', 'Datas de Emissão', 'Sem Finalização'];
const INITIAL_FINALIZATION_TYPES: FinalizationType[] = [
  'Cobrança Preventiva',
  'Atrasos - Cobrança Enviada',
  'Enviado Nota Fiscal',
  'Emissão de Boletos',
  'Sem retorno',
  'Problemas de outras áreas',
  'Pago processo de baixa',
  'Promessa de Pagamento',
  'Liquidado',
  'Suspeita Fraude',
  'Sem finalização/Ação'
];

interface ClientPhone {
  number: string;
  isWhatsapp: boolean;
  contactName: string;
  contactPosition: string;
}

interface ClientEmail {
  email: string;
  contactName: string;
  contactPosition: string;
}

interface Client {
  id: string;
  name: string;
  gemcoCode: string;
  document: string; // CNPJ
  type: 'PF' | 'PJ';
  status: 'Em atraso' | 'Pago' | 'Negociando';
  wallets: WalletType[];
  phones: ClientPhone[];
  emails: ClientEmail[];
  totalDebt: string;
  invoices: Invoice[];
  history: CollectionHistory[];
  finalizationStatus?: string;
  finalizationDate?: string;
}

// --- Mock Data ---
const MOCK_CLIENTS: Client[] = [
  {
    id: '1',
    name: 'João Silva Oliveira',
    gemcoCode: '1001',
    document: '123.456.789-00',
    type: 'PF',
    status: 'Em atraso',
    wallets: ['Pontual', 'PJ'],
    phones: [
      { number: '(11) 98765-4321', isWhatsapp: true, contactName: 'João', contactPosition: 'Proprietário' }
    ],
    emails: [
      { email: 'joao.silva@email.com', contactName: 'João', contactPosition: 'Proprietário' }
    ],
    totalDebt: 'R$ 1.250,00',
    finalizationStatus: 'Cobrança Preventiva',
    finalizationDate: '2024-03-15',
    invoices: [
      { 
        id: 'FAT-101', 
        filial: '001', 
        slip: 'SLP-9982', 
        order: 'PED-5521', 
        invoiceNumber: 'NF-12345', 
        issueDate: '01/02/2024', 
        dueDate: '10/02/2024', 
        installments: 1, 
        amount: 'R$ 450,00', 
        wallet: 'Pontual', 
        status: 'Atrasos',
        finalization: 'Cobrança Preventiva',
        finalized: true
      },
      { 
        id: 'FAT-102', 
        filial: '001', 
        slip: 'SLP-9983', 
        order: 'PED-5522', 
        invoiceNumber: 'NF-12346', 
        issueDate: '01/03/2024', 
        dueDate: '10/03/2024', 
        installments: 1, 
        amount: 'R$ 800,00', 
        wallet: 'PJ', 
        status: 'Atrasos',
        finalization: 'Sem retorno',
        finalized: false
      },
    ],
    history: [
      { id: 'H1', date: '12/03/2024 14:30', user: 'Lidiane Gomes', action: 'Ligação Telefônica', status: 'Promessa de Pagamento', observation: 'Cliente informou que pagará até dia 20/03.' },
      { id: 'H2', date: '05/03/2024 09:15', user: 'Lidiane Gomes', action: 'Envio de E-mail', status: 'Notificado', observation: 'E-mail de cobrança enviado para joao.silva@email.com' },
    ]
  },
  {
    id: '2',
    name: 'Tech Solutions Informática Ltda',
    gemcoCode: '5050',
    document: '12.345.678/0001-99',
    type: 'PJ',
    status: 'Negociando',
    wallets: ['Hubsales', 'PJ'],
    phones: [
      { number: '(11) 3344-5566', isWhatsapp: false, contactName: 'Ricardo', contactPosition: 'Financeiro' }
    ],
    emails: [
      { email: 'contato@techsolutions.com.br', contactName: 'Ricardo', contactPosition: 'Financeiro' }
    ],
    totalDebt: 'R$ 15.800,00',
    finalizationStatus: 'Emissão de Boletos',
    finalizationDate: '2024-03-10',
    invoices: [
      { 
        id: 'FAT-201', 
        filial: '010', 
        slip: 'SLP-4412', 
        order: 'PED-8890', 
        invoiceNumber: 'NF-99881', 
        issueDate: '01/12/2023', 
        dueDate: '05/01/2024', 
        installments: 3, 
        amount: 'R$ 5.800,00', 
        wallet: 'PJ', 
        status: 'Em dia',
        finalization: 'Emissão de Boletos',
        finalizationDate: '2024-03-10'
      },
    ],
    history: [
      { id: 'H3', date: '15/01/2024 10:00', user: 'Ricardo Silva', action: 'Negociação Chat', status: 'Em Negociação', observation: 'Solicitou parcelamento em 10x.' },
    ]
  },
  {
    id: '4',
    name: 'Supermercado Maga-Varejo',
    gemcoCode: '8822',
    document: '44.555.666/0001-22',
    type: 'PJ',
    status: 'Em atraso',
    wallets: ['MKT', 'Estante Virtual'],
    phones: [
      { number: '(16) 3711-1000', isWhatsapp: true, contactName: 'Ana Paula', contactPosition: 'Gerente' }
    ],
    emails: [
      { email: 'financeiro@magavarejo.com', contactName: 'Ana Paula', contactPosition: 'Gerente' }
    ],
    totalDebt: 'R$ 42.150,00',
    finalizationStatus: 'Promessa de Pagamento',
    finalizationDate: '2024-03-18',
    invoices: [
      { 
        id: 'FAT-401', 
        filial: '005', 
        slip: 'SLP-1122', 
        order: 'PED-3344', 
        invoiceNumber: 'NF-77665', 
        issueDate: '01/02/2024', 
        dueDate: '01/03/2024', 
        installments: 2, 
        amount: 'R$ 22.150,00', 
        wallet: 'MKT', 
        status: 'Atrasos',
        finalization: 'Promessa de Pagamento',
        finalizationDate: '2024-03-18',
        finalized: true
      },
      { 
        id: 'FAT-402', 
        filial: '005', 
        slip: 'SLP-1123', 
        order: 'PED-3345', 
        invoiceNumber: 'NF-77666', 
        issueDate: '15/02/2024', 
        dueDate: '15/03/2024', 
        installments: 1, 
        amount: 'R$ 20.000,00', 
        wallet: 'Estante Virtual', 
        status: 'Atrasos',
        finalization: 'Sem finalização/Ação',
        finalized: false
      },
    ],
    history: []
  },
  {
    id: '5',
    name: 'Distribuidora Central de Alimentos',
    gemcoCode: '9900',
    document: '55.444.333/0001-11',
    type: 'PJ',
    status: 'Em atraso',
    wallets: ['Saldo Negativo'],
    phones: [
      { number: '(11) 4004-0000', isWhatsapp: false, contactName: 'Carlos', contactPosition: 'Diretor' }
    ],
    emails: [
      { email: 'diretoria@centralalimentos.com.br', contactName: 'Carlos', contactPosition: 'Diretor' }
    ],
    totalDebt: 'R$ 8.900,00',
    invoices: [
      { 
        id: 'FAT-501', 
        filial: '001', 
        slip: 'SLP-5501', 
        order: 'PED-5501', 
        invoiceNumber: 'NF-5501', 
        issueDate: '01/01/2024', 
        dueDate: '01/02/2024', 
        installments: 1, 
        amount: 'R$ 8.900,00', 
        wallet: 'Saldo Negativo', 
        status: 'Atrasos',
        finalization: 'Liquidado'
      },
    ],
    history: []
  }
];

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-magalu-blue text-white shadow-lg shadow-magalu-blue/20' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-magalu-blue'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const LoginScreen = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [email, setEmail] = useState('1234');
  const [password, setPassword] = useState('1234');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Operador');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mockUser: User = selectedRole === 'Operador' 
      ? { name: 'Lidiane Gomes', role: 'Operador', avatar: 'LG', position: 'Analista Sênior' }
      : { name: 'Ricardo Silva', role: 'Gestor', avatar: 'RS', position: 'Gerente de Cobrança' };
    onLogin(mockUser);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl shadow-magalu-blue/10 overflow-hidden"
      >
        <div className="bg-magalu-blue p-8 text-center text-white">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-magalu-blue font-bold text-3xl italic mx-auto mb-4 shadow-lg">
            M
          </div>
          <h1 className="text-2xl font-bold">Cobrança <span className="text-magalu-pink">+ PJ</span></h1>
          <p className="text-blue-100 text-sm mt-1">Plataforma de Cobrança Magalu</p>
        </div>
        
        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => setSelectedRole('Operador')}
            className={`flex-1 py-4 font-bold text-sm transition-all ${selectedRole === 'Operador' ? 'text-magalu-blue border-b-2 border-magalu-blue bg-blue-50/50' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Acesso Operador
          </button>
          <button 
            onClick={() => setSelectedRole('Gestor')}
            className={`flex-1 py-4 font-bold text-sm transition-all ${selectedRole === 'Gestor' ? 'text-magalu-blue border-b-2 border-magalu-blue bg-blue-50/50' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Acesso Gestor
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-2">
            <p className="text-xs text-blue-700 font-medium">
              {selectedRole === 'Operador' 
                ? 'Acesso para analistas de cobrança e atendimento.' 
                : 'Acesso restrito para gerência e administração.'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">E-mail Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@magazineluiza.com.br"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-magalu-blue focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-magalu-blue focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-magalu-blue text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-600 transition-colors shadow-lg shadow-magalu-blue/20 active:scale-[0.98]"
          >
            Entrar como {selectedRole}
          </button>

          <div className="text-center">
            <a href="#" className="text-sm text-magalu-blue font-bold hover:underline">Esqueceu sua senha?</a>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const calculateDaysDelay = (dueDate: string) => {
  if (!dueDate) return 0;
  const [day, month, year] = dueDate.split('/').map(Number);
  const due = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  if (today <= due) return 0;
  
  const diffTime = Math.abs(today.getTime() - due.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const isOverdue = (dateStr: string) => {
  if (!dateStr) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const due = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return today > due;
};

const getInvoiceStatus = (dueDate: string) => {
  return calculateDaysDelay(dueDate) > 0 ? 'Atrasos' : 'Em dia';
};

const getClientStatus = (client: Client) => {
  const hasOverdue = client.invoices.some(inv => getInvoiceStatus(inv.dueDate) === 'Atrasos');
  return hasOverdue ? 'Em atraso' : 'Em dia';
};

const SendingEnginePage = ({ 
  billingRules, 
  setBillingRules, 
  emailTemplates, 
  setEmailTemplates,
  clients, 
  setClients,
  invoiceStatuses,
  finalizationTypes,
  wallets
}: { 
  billingRules: BillingRuleStep[], 
  setBillingRules: React.Dispatch<React.SetStateAction<BillingRuleStep[]>>,
  emailTemplates: EmailTemplate[],
  setEmailTemplates: React.Dispatch<React.SetStateAction<EmailTemplate[]>>,
  clients: Client[],
  setClients: React.Dispatch<React.SetStateAction<Client[]>>,
  invoiceStatuses: string[],
  finalizationTypes: string[],
  wallets: WalletType[]
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processLog, setProcessLog] = useState<{ date: string, client: string, channel: string, status: string }[]>([]);
  const [editingRule, setEditingRule] = useState<BillingRuleStep | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const toggleRule = (ruleId: string) => {
    setBillingRules(prev => prev.map(r => r.id === ruleId ? { ...r, active: !r.active } : r));
  };

  const removeRule = (ruleId: string) => {
    if (confirm('Tem certeza que deseja excluir esta regra?')) {
      setBillingRules(prev => prev.filter(r => r.id !== ruleId));
    }
  };

  const saveRule = (rule: BillingRuleStep) => {
    setBillingRules(prev => {
      const exists = prev.find(r => r.id === rule.id);
      if (exists) {
        return prev.map(r => r.id === rule.id ? rule : r);
      }
      return [...prev, rule];
    });
    setShowRuleModal(false);
    setEditingRule(null);
  };

  const saveTemplate = (template: EmailTemplate) => {
    setEmailTemplates(prev => {
      const exists = prev.find(t => t.id === template.id);
      if (exists) {
        return prev.map(t => t.id === template.id ? template : t);
      }
      return [...prev, template];
    });
    setShowTemplateModal(false);
    setEditingTemplate(null);
  };

  const removeTemplate = (templateId: string) => {
    if (confirm('Tem certeza que deseja excluir este template?')) {
      setEmailTemplates(prev => prev.filter(t => t.id !== templateId));
    }
  };

  const runBillingEngine = () => {
    setIsProcessing(true);
    
    setTimeout(() => {
      const now = new Date();
      const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      const newLogs: typeof processLog = [];
      
      const updatedClients = clients.map(client => {
        let clientHistory = [...client.history];
        let sentAny = false;

        client.invoices.forEach(inv => {
          if (inv.finalized) return;
          
          const delay = calculateDaysDelay(inv.dueDate);
          const [day, month, year] = inv.dueDate.split('/').map(Number);
          const due = new Date(year, month - 1, day);
          const diffDays = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          billingRules.forEach(rule => {
            if (!rule.active) return;
            
            // Apply Filters
            if (rule.walletFilter.length > 0 && !rule.walletFilter.includes(inv.wallet as WalletType)) return;
            if (rule.statusFilter.length > 0 && !rule.statusFilter.includes(inv.status)) return;
            if (rule.finalizationFilter.length > 0 && !rule.finalizationFilter.includes(inv.finalization || '')) return;

            let shouldSend = false;
            if (rule.delayType === 'before' && diffDays === rule.delayDays) shouldSend = true;
            if (rule.delayType === 'after' && delay === rule.delayDays) shouldSend = true;

            if (shouldSend) {
              const template = emailTemplates.find(t => t.id === rule.templateId);
              if (template) {
                sentAny = true;
                const message = template.body
                  .replace('{{nome}}', client.name)
                  .replace('{{valor}}', inv.amount)
                  .replace('{{vencimento}}', inv.dueDate);

                clientHistory = [{
                  id: `H${Date.now()}-${Math.random()}`,
                  date: formattedDate,
                  user: 'Sistema (Régua)',
                  action: `E-mail Automático: ${rule.name}`,
                  status: 'Enviado',
                  observation: `Template: ${template.name}\nMensagem: ${message}`
                }, ...clientHistory];

                newLogs.push({
                  date: formattedDate,
                  client: client.name,
                  channel: 'E-mail',
                  status: 'Enviado'
                });
              }
            }
          });
        });

        return sentAny ? { ...client, history: clientHistory } : client;
      });

      setClients(updatedClients);
      setProcessLog(prev => [...newLogs, ...prev].slice(0, 20));
      setIsProcessing(false);
      alert(`${newLogs.length} e-mails de cobrança processados com sucesso!`);
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Motor de Envio / Régua de Cobrança</h2>
          <p className="text-slate-500">Gestão profissional de automação de cobrança e réguas personalizadas.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setEditingTemplate({ id: `T${Date.now()}`, name: '', subject: '', body: '' });
              setShowTemplateModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <Mail size={18} />
            Novo Template
          </button>
          <button 
            onClick={() => {
              setEditingRule({ 
                id: `R${Date.now()}`, 
                name: '', 
                delayDays: 1, 
                delayType: 'after', 
                statusFilter: [], 
                finalizationFilter: [], 
                walletFilter: [], 
                templateId: emailTemplates[0]?.id || '', 
                active: true 
              });
              setShowRuleModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-magalu-blue text-white rounded-xl font-bold text-sm shadow-lg shadow-magalu-blue/20 hover:scale-105 transition-all"
          >
            <Plus size={18} />
            Criar Nova Régua
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Rules List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-bottom border-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Settings className="text-magalu-blue" size={20} />
                Réguas Ativas
              </h3>
              <button 
                onClick={runBillingEngine}
                disabled={isProcessing}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                  isProcessing ? 'bg-slate-100 text-slate-400' : 'bg-magalu-green text-white hover:bg-magalu-green/90'
                }`}
              >
                {isProcessing ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play size={14} />}
                Executar Agora
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome da Régua</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Condição</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtros</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {billingRules.map(rule => (
                    <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-700">{rule.name}</p>
                        <p className="text-[10px] text-slate-400">Template: {emailTemplates.find(t => t.id === rule.templateId)?.name || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                          rule.delayType === 'before' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {rule.delayDays} dias {rule.delayType === 'before' ? 'antes' : 'após'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {rule.walletFilter.map(w => <span key={w} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold">{w}</span>)}
                          {rule.statusFilter.map(s => <span key={s} className="px-1.5 py-0.5 bg-magalu-blue/10 text-magalu-blue rounded text-[9px] font-bold">{s}</span>)}
                          {rule.walletFilter.length === 0 && rule.statusFilter.length === 0 && <span className="text-[10px] text-slate-300 italic">Todos</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => toggleRule(rule.id)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${rule.active ? 'bg-magalu-green' : 'bg-slate-200'}`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${rule.active ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingRule(rule);
                              setShowRuleModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-magalu-blue hover:bg-magalu-blue/10 rounded-lg transition-all"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => removeRule(rule.id)}
                            className="p-1.5 text-slate-400 hover:text-magalu-pink hover:bg-magalu-pink/10 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Templates Section */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-bottom border-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-magalu-blue" size={20} />
                Templates de Mensagem
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
              {emailTemplates.map(template => (
                <div key={template.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-magalu-blue/30 transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-slate-700 text-sm">{template.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Assunto: {template.subject}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingTemplate(template);
                          setShowTemplateModal(true);
                        }}
                        className="p-1 text-slate-400 hover:text-magalu-blue"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => removeTemplate(template.id)}
                        className="p-1 text-slate-400 hover:text-magalu-pink"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-100 text-[10px] text-slate-500 leading-relaxed max-h-24 overflow-y-auto">
                    {template.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Logs & Stats */}
        <div className="space-y-8">
          {/* Stats Card */}
          <div className="bg-magalu-blue p-6 rounded-3xl text-white shadow-lg shadow-magalu-blue/20">
            <h4 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-4">Resumo da Automação</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold">{billingRules.filter(r => r.active).length}</p>
                <p className="text-[10px] opacity-70">Réguas Ativas</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{emailTemplates.length}</p>
                <p className="text-[10px] opacity-70">Templates</p>
              </div>
            </div>
          </div>

          {/* Log Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <History className="text-magalu-yellow" size={18} />
              Últimos Envios
            </h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {processLog.length === 0 ? (
                <div className="text-center py-10">
                  <Clock className="text-slate-200 mx-auto mb-2" size={24} />
                  <p className="text-[10px] text-slate-400">Nenhum envio hoje.</p>
                </div>
              ) : (
                processLog.map((log, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                      <Mail size={14} className="text-magalu-blue" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-700 truncate">{log.client}</p>
                      <p className="text-[9px] text-slate-400">{log.date}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rule Modal */}
      {showRuleModal && editingRule && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Configurar Régua de Cobrança</h3>
              <button onClick={() => setShowRuleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome da Régua</label>
                  <input 
                    type="text" 
                    value={editingRule.name}
                    onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                    placeholder="Ex: Cobrança Preventiva PJ"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-magalu-blue/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Template de E-mail</label>
                  <select 
                    value={editingRule.templateId}
                    onChange={(e) => setEditingRule({ ...editingRule, templateId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-magalu-blue/20 transition-all"
                  >
                    {emailTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Timing */}
              <div className="p-6 bg-slate-50 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Condição de Tempo</h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input 
                      type="number" 
                      value={editingRule.delayDays}
                      onChange={(e) => setEditingRule({ ...editingRule, delayDays: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingRule({ ...editingRule, delayType: 'before' })}
                      className={`px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                        editingRule.delayType === 'before' ? 'bg-magalu-blue text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
                      }`}
                    >
                      Dias Antes
                    </button>
                    <button 
                      onClick={() => setEditingRule({ ...editingRule, delayType: 'after' })}
                      className={`px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                        editingRule.delayType === 'after' ? 'bg-magalu-blue text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
                      }`}
                    >
                      Dias Após
                    </button>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtros de Aplicação</h4>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Carteiras</label>
                  <div className="flex flex-wrap gap-2">
                    {wallets.map(w => (
                      <button 
                        key={w}
                        onClick={() => {
                          const current = editingRule.walletFilter;
                          const next = current.includes(w) ? current.filter(i => i !== w) : [...current, w];
                          setEditingRule({ ...editingRule, walletFilter: next });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          editingRule.walletFilter.includes(w) ? 'bg-magalu-blue text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Status da Fatura</label>
                  <div className="flex flex-wrap gap-2">
                    {invoiceStatuses.map(s => (
                      <button 
                        key={s}
                        onClick={() => {
                          const current = editingRule.statusFilter;
                          const next = current.includes(s) ? current.filter(i => i !== s) : [...current, s];
                          setEditingRule({ ...editingRule, statusFilter: next });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          editingRule.statusFilter.includes(s) ? 'bg-magalu-blue text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Finalização</label>
                  <div className="flex flex-wrap gap-2">
                    {finalizationTypes.map(f => (
                      <button 
                        key={f}
                        onClick={() => {
                          const current = editingRule.finalizationFilter;
                          const next = current.includes(f) ? current.filter(i => i !== f) : [...current, f];
                          setEditingRule({ ...editingRule, finalizationFilter: next });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          editingRule.finalizationFilter.includes(f) ? 'bg-magalu-blue text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowRuleModal(false)}
                className="px-6 py-2 text-slate-500 font-bold text-sm hover:text-slate-700"
              >
                Cancelar
              </button>
              <button 
                onClick={() => saveRule(editingRule)}
                className="px-8 py-2 bg-magalu-blue text-white rounded-xl font-bold text-sm shadow-lg shadow-magalu-blue/20 hover:scale-105 transition-all"
              >
                Salvar Régua
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && editingTemplate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Editar Template de E-mail</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome do Template</label>
                <input 
                  type="text" 
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="Ex: Lembrete de Vencimento"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-magalu-blue/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assunto do E-mail</label>
                <input 
                  type="text" 
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  placeholder="Ex: Seu boleto Magalu vence em breve"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-magalu-blue/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Corpo da Mensagem</label>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-500 rounded">{'{{nome}}'}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-500 rounded">{'{{valor}}'}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-500 rounded">{'{{vencimento}}'}</span>
                  </div>
                </div>
                <textarea 
                  value={editingTemplate.body}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                  rows={8}
                  placeholder="Olá {{nome}}, informamos que sua fatura de {{valor}} vence em {{vencimento}}..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-magalu-blue/20 transition-all resize-none"
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowTemplateModal(false)}
                className="px-6 py-2 text-slate-500 font-bold text-sm hover:text-slate-700"
              >
                Cancelar
              </button>
              <button 
                onClick={() => saveTemplate(editingTemplate)}
                className="px-8 py-2 bg-magalu-blue text-white rounded-xl font-bold text-sm shadow-lg shadow-magalu-blue/20 hover:scale-105 transition-all"
              >
                Salvar Template
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const BankReturnPage = () => {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Retorno Bancário</h2>
        <p className="text-slate-500">Processe arquivos de retorno bancário para conciliação automática.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div className="md:col-span-1 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Upload className="text-magalu-blue" size={20} />
            Importar Arquivo
          </h3>
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-magalu-blue transition-colors cursor-pointer group">
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-magalu-blue/10 transition-colors">
              <FileSpreadsheet className="text-slate-300 group-hover:text-magalu-blue transition-colors" size={24} />
            </div>
            <p className="text-sm font-bold text-slate-700 mb-1">Arraste seu arquivo</p>
            <p className="text-xs text-slate-400">Suporta .RET, .TXT ou .XLSX</p>
            <button className="mt-6 w-full py-3 bg-magalu-blue text-white rounded-xl font-bold text-sm shadow-lg shadow-magalu-blue/20 hover:scale-105 transition-all">
              Selecionar Arquivo
            </button>
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <History className="text-magalu-pink" size={20} />
            Arquivos Processados
          </h3>
          <div className="space-y-4">
            {[
              { name: 'RET_ITAU_20032026.RET', date: '20/03/2026 14:20', count: 145, amount: 'R$ 124.500,00', status: 'Concluído' },
              { name: 'RET_BRADESCO_19032026.RET', date: '19/03/2026 16:45', count: 89, amount: 'R$ 67.800,00', status: 'Concluído' },
              { name: 'RET_SANTANDER_19032026.RET', date: '19/03/2026 10:15', count: 212, amount: 'R$ 312.400,00', status: 'Concluído' },
            ].map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-magalu-blue/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:bg-magalu-blue/5 transition-colors">
                    <FileText size={20} className="text-slate-400 group-hover:text-magalu-blue transition-colors" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">{file.name}</p>
                    <p className="text-xs text-slate-400">{file.date} • {file.count} títulos processados</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-700">{file.amount}</p>
                  <span className="text-[10px] font-bold uppercase text-magalu-green">{file.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const WalletPage = ({ 
  walletName, 
  clients, 
  setSelectedClient, 
  setDetailViewMode,
  invoiceStatuses,
  finalizationTypes
}: { 
  walletName: string, 
  clients: Client[], 
  setSelectedClient: (client: Client) => void, 
  setDetailViewMode: (mode: 'main' | 'contacts') => void,
  invoiceStatuses: string[],
  finalizationTypes: string[]
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [finalizationFilter, setFinalizationFilter] = useState('Todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [regDate, setRegDate] = useState('');
  const [onlyOverdueCombined, setOnlyOverdueCombined] = useState(false);

  const statusOptions = ['Todos', ...invoiceStatuses];
  const finalizationOptions = ['Todos', ...finalizationTypes];

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    return clients.filter(client => {
      // Filter by wallet
      if (!client.wallets.includes(walletName as WalletType)) return false;

      // Search query
      const matchesSearch = client.name.toLowerCase().includes(query) || client.document.includes(query);
      if (!matchesSearch) return false;

      // Status Filter
      if (statusFilter !== 'Todos') {
        if (statusFilter === 'Em dia') {
          const hasOverdue = client.invoices.some(inv => inv.wallet === walletName && getInvoiceStatus(inv.dueDate) === 'Atrasos');
          if (hasOverdue) return false;
        }
        if (statusFilter === 'Atrasos') {
          const hasOverdue = client.invoices.some(inv => inv.wallet === walletName && getInvoiceStatus(inv.dueDate) === 'Atrasos');
          if (!hasOverdue) return false;
        }
        if (statusFilter === 'Sem Finalização' && client.finalizationStatus) return false;
        
        // Date filters for status
        if (statusFilter === 'Datas Vencimento' || statusFilter === 'Datas de Emissão') {
          if (!startDate || !endDate) return true; // Don't filter if dates not set
          
          const start = new Date(startDate);
          const end = new Date(endDate);
          
          const hasInvoiceInRange = client.invoices.some(inv => {
            const dateStr = statusFilter === 'Datas Vencimento' ? inv.dueDate : inv.issueDate;
            const [day, month, year] = dateStr.split('/').map(Number);
            const invDate = new Date(year, month - 1, day);
            return invDate >= start && invDate <= end;
          });
          
          if (!hasInvoiceInRange) return false;
        }
      }

      // Finalization Filter
      if (finalizationFilter !== 'Todos') {
        if (finalizationFilter === 'Sem finalização/Ação') {
          if (client.finalizationStatus) return false;
        } else {
          if (client.finalizationStatus !== finalizationFilter) return false;
          
          // Specific date filter for certain finalization statuses
          if ((finalizationFilter === 'Emissão de Boletos' || finalizationFilter === 'Promessa de Pagamento') && regDate) {
            if (client.finalizationDate !== regDate) return false;
          }
        }
      }

      // Only Overdue Combined Filter
      if (onlyOverdueCombined) {
        const hasOverdueCombined = client.invoices.some(inv => 
          inv.wallet === walletName && 
          (finalizationFilter === 'Todos' || inv.finalization === finalizationFilter) &&
          (inv.finalization === 'Promessa de Pagamento' || inv.finalization === 'Emissão de Boletos') &&
          inv.finalizationDate && isOverdue(inv.finalizationDate)
        );
        if (!hasOverdueCombined) return false;
      }

      return true;
    });
  }, [searchQuery, clients, walletName, statusFilter, finalizationFilter, startDate, endDate, regDate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const parseCurrency = (value: string) => {
    return parseFloat(value.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
  };

  const calculateTotals = (client: Client) => {
    let onTime = 0;
    let overdue = 0;
    let noFinalization = 0;
    let totalOpen = 0;

    client.invoices.forEach(inv => {
      if (inv.wallet !== walletName) return;
      
      const val = parseCurrency(inv.amount);
      totalOpen += val;
      
      const effectiveStatus = getInvoiceStatus(inv.dueDate);
      if (effectiveStatus === 'Em dia') {
        onTime += val;
      } else if (effectiveStatus === 'Atrasos') {
        overdue += val;
      }
      
      if (!inv.finalization || inv.finalization === 'Sem finalização/Ação') {
        noFinalization += val;
      }
    });

    return { onTime, overdue, noFinalization, totalOpen };
  };

  const walletStats = useMemo(() => {
    let promiseCount = 0;
    let promiseValue = 0;
    let promiseOverdueCount = 0;
    let promiseOverdueValue = 0;
    
    let invoiceCount = 0;
    let invoiceValue = 0;
    let invoiceOverdueCount = 0;
    let invoiceOverdueValue = 0;
    
    let highPriorityCount = 0;
    let highPriorityValue = 0;
    
    const walletClients = clients.filter(c => c.wallets.includes(walletName as WalletType));
    
    walletClients.forEach(client => {
      let clientHasPromise = false;
      let clientHasPromiseOverdue = false;
      let clientHasInvoice = false;
      let clientHasInvoiceOverdue = false;
      let clientHasHighPriority = false;
      
      client.invoices.forEach(inv => {
        if (inv.wallet === walletName) {
          const val = parseCurrency(inv.amount);
          const delay = calculateDaysDelay(inv.dueDate);
          
          if (inv.finalization === 'Promessa de Pagamento') {
            clientHasPromise = true;
            promiseValue += val;
            if (inv.finalizationDate && isOverdue(inv.finalizationDate)) {
              clientHasPromiseOverdue = true;
              promiseOverdueValue += val;
            }
          }
          if (inv.finalization === 'Emissão de Boletos') {
            clientHasInvoice = true;
            invoiceValue += val;
            if (inv.finalizationDate && isOverdue(inv.finalizationDate)) {
              clientHasInvoiceOverdue = true;
              invoiceOverdueValue += val;
            }
          }
          if (delay > 70) {
            clientHasHighPriority = true;
            highPriorityValue += val;
          }
        }
      });
      
      if (clientHasPromise) promiseCount++;
      if (clientHasPromiseOverdue) promiseOverdueCount++;
      if (clientHasInvoice) invoiceCount++;
      if (clientHasInvoiceOverdue) invoiceOverdueCount++;
      if (clientHasHighPriority) highPriorityCount++;
    });
    
    return { 
      promise: { count: promiseCount, value: promiseValue, overdueCount: promiseOverdueCount, overdueValue: promiseOverdueValue },
      invoice: { count: invoiceCount, value: invoiceValue, overdueCount: invoiceOverdueCount, overdueValue: invoiceOverdueValue },
      highPriority: { count: highPriorityCount, value: highPriorityValue }
    };
  }, [clients, walletName]);

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Carteira {walletName}</h2>
            <p className="text-slate-500 text-sm">Gerencie e filtre os clientes desta carteira.</p>
          </div>
          <div className="flex items-center gap-2">
            {onlyOverdueCombined && (
              <div className="bg-magalu-pink/10 text-magalu-pink px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-2">
                <AlertTriangle size={14} />
                Atraso do Combinado
                <button 
                  onClick={() => setOnlyOverdueCombined(false)}
                  className="hover:bg-magalu-pink/20 rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <div className="bg-magalu-blue/10 text-magalu-blue px-4 py-2 rounded-xl font-bold text-sm">
              {filteredClients.length} Clientes
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder={`Buscar por nome ou CNPJ na carteira ${walletName}...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setOnlyOverdueCombined(false);
              }}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-magalu-blue outline-none transition-all text-sm shadow-inner"
            />
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Status</label>
              <select 
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setOnlyOverdueCombined(false);
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-magalu-blue outline-none text-sm"
              >
                {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Finalização</label>
              <select 
                value={finalizationFilter}
                onChange={(e) => {
                  setFinalizationFilter(e.target.value);
                  setOnlyOverdueCombined(false);
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-magalu-blue outline-none text-sm"
              >
                {finalizationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>

          {/* Conditional Date Filters */}
          {(statusFilter === 'Datas Vencimento' || statusFilter === 'Datas de Emissão') && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="grid grid-cols-2 gap-4 pt-2"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Data Inicial</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-magalu-blue outline-none text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Data Final</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-magalu-blue outline-none text-sm"
                />
              </div>
            </motion.div>
          )}

          {(finalizationFilter === 'Emissão de Boletos' || finalizationFilter === 'Promessa de Pagamento') && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-2"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Data do Registro</label>
                <input 
                  type="date" 
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-magalu-blue outline-none text-sm"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {!searchQuery && statusFilter === 'Todos' && (finalizationFilter === 'Todos' || onlyOverdueCombined) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-magalu-blue/5 p-6 rounded-2xl border border-magalu-blue/10 flex flex-col justify-between">
            <div>
              <Handshake className="text-magalu-blue mb-3" size={24} />
              <h4 className="font-bold mb-1">Promessas de Pagamento</h4>
              <p className="text-sm text-slate-600 mb-4">
                {walletStats.promise.count} {walletStats.promise.count === 1 ? 'cliente' : 'clientes'} • {formatCurrency(walletStats.promise.value)}
              </p>
            </div>
            {walletStats.promise.overdueCount > 0 && (
              <button 
                onClick={() => {
                  setFinalizationFilter('Promessa de Pagamento');
                  setOnlyOverdueCombined(true);
                }}
                className="mt-auto flex items-center justify-between w-full p-2 bg-magalu-blue/10 hover:bg-magalu-blue/20 rounded-xl text-xs font-bold text-magalu-blue transition-colors"
              >
                <span>Atraso do combinado: {walletStats.promise.overdueCount}</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
          <div className="bg-magalu-green/5 p-6 rounded-2xl border border-magalu-green/10 flex flex-col justify-between">
            <div>
              <FileText className="text-magalu-green mb-3" size={24} />
              <h4 className="font-bold mb-1">Emissão de Boletos</h4>
              <p className="text-sm text-slate-600 mb-4">
                {walletStats.invoice.count} {walletStats.invoice.count === 1 ? 'cliente' : 'clientes'} • {formatCurrency(walletStats.invoice.value)}
              </p>
            </div>
            {walletStats.invoice.overdueCount > 0 && (
              <button 
                onClick={() => {
                  setFinalizationFilter('Emissão de Boletos');
                  setOnlyOverdueCombined(true);
                }}
                className="mt-auto flex items-center justify-between w-full p-2 bg-magalu-green/10 hover:bg-magalu-green/20 rounded-xl text-xs font-bold text-magalu-green transition-colors"
              >
                <span>Atraso do combinado: {walletStats.invoice.overdueCount}</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
          <div className="bg-magalu-pink/5 p-6 rounded-2xl border border-magalu-pink/10">
            <AlertTriangle className="text-magalu-pink mb-3" size={24} />
            <h4 className="font-bold mb-1">Prioridade Alta Incobrável</h4>
            <p className="text-sm text-slate-600">
              {walletStats.highPriority.count} {walletStats.highPriority.count === 1 ? 'cliente' : 'clientes'} • {formatCurrency(walletStats.highPriority.value)}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredClients.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-slate-300" size={32} />
            </div>
            <p className="text-slate-500 font-medium">Nenhum cliente corresponde aos filtros aplicados.</p>
            <button 
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('Todos');
                setFinalizationFilter('Todos');
                setStartDate('');
                setEndDate('');
                setRegDate('');
              }}
              className="mt-4 text-magalu-blue font-bold text-sm hover:underline"
            >
              Limpar todos os filtros
            </button>
          </div>
        ) : (
          filteredClients.map(client => {
            const totals = calculateTotals(client);
            return (
              <motion.div 
                key={client.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => { setSelectedClient(client); setDetailViewMode('main'); }}
                className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-magalu-blue/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-xl ${client.type === 'PJ' ? 'bg-magalu-blue/10 text-magalu-blue' : 'bg-magalu-pink/10 text-magalu-pink'}`}>
                      {client.type === 'PJ' ? <Building2 size={24} /> : <UserIcon size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg group-hover:text-magalu-blue transition-colors">{client.name}</h3>
                      </div>
                      <p className="text-slate-500 text-sm flex items-center gap-2">
                        <CreditCard size={14} /> {client.document}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-magalu-blue transition-colors" size={20} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-4 border-t border-slate-50">
                  <div className="bg-slate-50/50 p-3 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Dias Atraso</p>
                    <p className="font-bold text-magalu-pink">
                      {Math.max(0, ...client.invoices.map(inv => calculateDaysDelay(inv.dueDate))) || '-'}
                    </p>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total em Aberto</p>
                    <p className="font-bold text-slate-900">{formatCurrency(totals.totalOpen)}</p>
                  </div>
                  <div className="bg-emerald-50/50 p-3 rounded-xl">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Em Dia</p>
                    <p className="font-bold text-emerald-700">{formatCurrency(totals.onTime)}</p>
                  </div>
                  <div className="bg-amber-50/50 p-3 rounded-xl">
                    <p className="text-[10px] text-amber-600 font-bold uppercase mb-1">Em Atraso</p>
                    <p className="font-bold text-amber-700">{formatCurrency(totals.overdue)}</p>
                  </div>
                  <div className="bg-rose-50/50 p-3 rounded-xl">
                    <p className="text-[10px] text-rose-600 font-bold uppercase mb-1">Sem Finalização</p>
                    <p className="font-bold text-rose-700">{formatCurrency(totals.noFinalization)}</p>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

const ClientRegistrationTab = ({ clients, setClients }: { clients: Client[], setClients: React.Dispatch<React.SetStateAction<Client[]>> }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<any[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [importErrors, setImportErrors] = useState<{ row: number, error: string }[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [gemcoCode, setGemcoCode] = useState('');
  const [document, setDocument] = useState('');
  const [selectedWallets, setSelectedWallets] = useState<WalletType[]>([]);
  const [phones, setPhones] = useState<ClientPhone[]>([{ number: '', isWhatsapp: false, contactName: '', contactPosition: '' }]);
  const [emails, setEmails] = useState<ClientEmail[]>([{ email: '', contactName: '', contactPosition: '' }]);

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.document.includes(searchQuery) ||
      c.gemcoCode.includes(searchQuery)
    );
  }, [clients, searchQuery]);

  useEffect(() => {
    if (editingClient) {
      setName(editingClient.name);
      setGemcoCode(editingClient.gemcoCode);
      setDocument(editingClient.document);
      setSelectedWallets(editingClient.wallets);
      setPhones(editingClient.phones.length > 0 ? editingClient.phones : [{ number: '', isWhatsapp: false, contactName: '', contactPosition: '' }]);
      setEmails(editingClient.emails.length > 0 ? editingClient.emails : [{ email: '', contactName: '', contactPosition: '' }]);
    } else {
      resetForm();
    }
  }, [editingClient]);

  const resetForm = () => {
    setName('');
    setGemcoCode('');
    setDocument('');
    setSelectedWallets([]);
    setPhones([{ number: '', isWhatsapp: false, contactName: '', contactPosition: '' }]);
    setEmails([{ email: '', contactName: '', contactPosition: '' }]);
  };

  const validateCNPJ = (cnpj: string) => {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1+$/.test(cnpj)) return false;

    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    const digits = cnpj.substring(size);
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;

    size = size + 1;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;

    return true;
  };

  const handleExport = () => {
    const dataToExport = clients.map(client => ({
      'Razão Social': client.name,
      'CNPJ': client.document,
      'Código Gemco': client.gemcoCode,
      'Carteiras': client.wallets.join(', '),
      'Telefones': client.phones.map(p => `${p.number}${p.isWhatsapp ? ' (W)' : ''} - ${p.contactName} (${p.contactPosition})`).join(' | '),
      'E-mails': client.emails.map(e => `${e.email} - ${e.contactName} (${e.contactPosition})`).join(' | '),
      'Status': client.status,
      'Dívida Total': client.totalDebt
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
    XLSX.writeFile(workbook, `cadastros_clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      if (data.length > 0) {
        setImportHeaders(data[0] as string[]);
        setImportData(data.slice(1));
        setImportStep('mapping');
        
        // Auto-mapping attempt
        const initialMapping: Record<string, string> = {};
        const systemFields = ['name', 'document', 'gemcoCode', 'wallets', 'phone1', 'email1'];
        const headerLower = (data[0] as string[]).map(h => h.toString().toLowerCase());
        
        if (headerLower.includes('razão social') || headerLower.includes('nome')) {
          initialMapping['name'] = (data[0] as string[])[headerLower.findIndex(h => h.includes('razão') || h === 'nome')];
        }
        if (headerLower.includes('cnpj')) {
          initialMapping['document'] = (data[0] as string[])[headerLower.indexOf('cnpj')];
        }
        if (headerLower.includes('gemco') || headerLower.includes('código')) {
          initialMapping['gemcoCode'] = (data[0] as string[])[headerLower.findIndex(h => h.includes('gemco') || h.includes('código'))];
        }
        setMapping(initialMapping);
      }
    };
    reader.readAsBinaryString(file);
  };

  const processImport = () => {
    const errors: { row: number, error: string }[] = [];
    const newClients: Client[] = [];

    importData.forEach((row, index) => {
      const rowData: any = {};
      importHeaders.forEach((header, i) => {
        rowData[header] = row[i];
      });

      const name = rowData[mapping['name']];
      const document = rowData[mapping['document']];
      const gemcoCode = rowData[mapping['gemcoCode']];

      if (!name) errors.push({ row: index + 2, error: 'Razão Social ausente' });
      if (!document) {
        errors.push({ row: index + 2, error: 'CNPJ ausente' });
      } else if (!validateCNPJ(document.toString())) {
        errors.push({ row: index + 2, error: `CNPJ inválido: ${document}` });
      }

      if (errors.filter(e => e.row === index + 2).length === 0) {
        newClients.push({
          id: Math.random().toString(36).substr(2, 9),
          name: name.toString(),
          document: document.toString(),
          gemcoCode: gemcoCode?.toString() || '',
          type: 'PJ',
          status: 'Pago',
          wallets: rowData[mapping['wallets']]?.toString().split(',').map((w: string) => w.trim() as WalletType) || [],
          phones: rowData[mapping['phone1']] ? [{ number: rowData[mapping['phone1']].toString(), isWhatsapp: false, contactName: 'Importado', contactPosition: 'Contato' }] : [],
          emails: rowData[mapping['email1']] ? [{ email: rowData[mapping['email1']].toString(), contactName: 'Importado', contactPosition: 'Contato' }] : [],
          totalDebt: 'R$ 0,00',
          invoices: [],
          history: []
        });
      }
    });

    if (errors.length > 0) {
      setImportErrors(errors);
      setImportStep('preview');
    } else {
      setClients(prev => [...prev, ...newClients]);
      setIsImportOpen(false);
      resetImport();
    }
  };

  const resetImport = () => {
    setImportFile(null);
    setImportData([]);
    setImportHeaders([]);
    setMapping({});
    setImportStep('upload');
    setImportErrors([]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: Client = {
      id: editingClient ? editingClient.id : Math.random().toString(36).substr(2, 9),
      name,
      gemcoCode,
      document,
      type: 'PJ', 
      status: editingClient ? editingClient.status : 'Pago',
      wallets: selectedWallets,
      phones: phones.filter(p => p.number.trim() !== ''),
      emails: emails.filter(e => e.email.trim() !== ''),
      totalDebt: editingClient ? editingClient.totalDebt : 'R$ 0,00',
      invoices: editingClient ? editingClient.invoices : [],
      history: editingClient ? editingClient.history : []
    };

    if (editingClient) {
      setClients(prev => prev.map(c => c.id === editingClient.id ? newClient : c));
    } else {
      setClients(prev => [...prev, newClient]);
    }
    setIsFormOpen(false);
    setEditingClient(null);
    resetForm();
  };

  const toggleWallet = (wallet: WalletType) => {
    setSelectedWallets(prev => 
      prev.includes(wallet) ? prev.filter(w => w !== wallet) : [...prev, wallet]
    );
  };

  const addPhone = () => {
    if (phones.length < 5) setPhones([...phones, { number: '', isWhatsapp: false, contactName: '', contactPosition: '' }]);
  };

  const removePhone = (index: number) => {
    setPhones(phones.filter((_, i) => i !== index));
  };

  const addEmail = () => {
    if (emails.length < 5) setEmails([...emails, { email: '', contactName: '', contactPosition: '' }]);
  };

  const removeEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const handleDelete = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    setShowDeleteConfirm(null);
  };

  const WALLETS: WalletType[] = ['Pontual', 'PJ', 'Hubsales', 'Estante Virtual', 'Saldo Negativo', 'MKT'];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Search Section */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm mb-8">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Search className="text-magalu-blue" size={20} />
          Busca de Cadastros
        </h3>
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome, CNPJ ou código Gemco..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-magalu-blue outline-none transition-all text-sm shadow-inner"
          />
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cadastros de Clientes</h2>
          <p className="text-slate-500">Gerencie os dados cadastrais e contatos dos clientes.</p>
        </div>
        <button 
          onClick={() => { setEditingClient(null); setIsFormOpen(true); }}
          className="bg-magalu-blue text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-magalu-blue/20"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      {/* Client List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-12">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Razão Social / CNPJ</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cód. Gemco</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Carteiras</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contatos</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{client.name}</p>
                    <p className="text-xs text-slate-500">{client.document}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{client.gemcoCode}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {client.wallets.map(w => (
                        <span key={w} className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">{w}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-600">{client.phones.length} Tel / {client.emails.length} E-mail</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => { setEditingClient(client); setIsFormOpen(true); }}
                        className="p-2 text-slate-400 hover:text-magalu-blue hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm(client.id)}
                        className="p-2 text-slate-400 hover:text-magalu-pink hover:bg-pink-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center justify-center md:justify-end mb-12">
        <div className="mr-auto">
          <p className="text-sm font-bold text-slate-900">{filteredClients.length} registros</p>
          <p className="text-xs text-slate-500">Filtrados da base total</p>
        </div>
        <button 
          onClick={() => setIsImportOpen(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all"
        >
          <Upload size={18} />
          Importar base
        </button>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all"
        >
          <Download size={18} />
          Exportar cadastros
        </button>
      </div>

      {/* Import Modal */}
      <AnimatePresence>
        {isImportOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsImportOpen(false); resetImport(); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Upload size={24} className="text-magalu-blue" />
                  Importar Base de Clientes
                </h3>
                <button onClick={() => { setIsImportOpen(false); resetImport(); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto">
                {importStep === 'upload' && (
                  <div className="text-center space-y-6">
                    <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 hover:border-magalu-blue/50 transition-colors cursor-pointer relative group">
                      <input 
                        type="file" 
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-blue-50 text-magalu-blue rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <FileSpreadsheet size={32} />
                        </div>
                        <p className="text-lg font-bold text-slate-900">Clique ou arraste seu arquivo</p>
                        <p className="text-sm text-slate-500 mt-1">Suporta Excel (.xlsx, .xls) ou CSV</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl text-left">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Dica de Formatação</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Para uma importação mais rápida, certifique-se de que seu arquivo tenha colunas para: 
                        <span className="font-bold"> Razão Social, CNPJ e Código Gemco</span>.
                      </p>
                    </div>
                  </div>
                )}

                {importStep === 'mapping' && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="text-magalu-blue shrink-0" size={20} />
                      <p className="text-sm text-blue-800">Mapeie as colunas do seu arquivo para os campos do sistema.</p>
                    </div>
                    
                    <div className="space-y-4">
                      {[
                        { id: 'name', label: 'Razão Social *', required: true },
                        { id: 'document', label: 'CNPJ *', required: true },
                        { id: 'gemcoCode', label: 'Código Gemco', required: false },
                        { id: 'wallets', label: 'Carteiras (separadas por vírgula)', required: false },
                        { id: 'phone1', label: 'Telefone Principal', required: false },
                        { id: 'email1', label: 'E-mail Principal', required: false },
                      ].map(field => (
                        <div key={field.id} className="grid grid-cols-2 gap-4 items-center">
                          <label className="text-sm font-bold text-slate-700">{field.label}</label>
                          <select 
                            value={mapping[field.id] || ''}
                            onChange={(e) => setMapping({ ...mapping, [field.id]: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-magalu-blue"
                          >
                            <option value="">Não mapear</option>
                            {importHeaders.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 flex gap-3">
                      <button 
                        onClick={() => setImportStep('upload')}
                        className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        Voltar
                      </button>
                      <button 
                        onClick={processImport}
                        disabled={!mapping['name'] || !mapping['document']}
                        className="flex-1 py-3 rounded-xl font-bold text-white bg-magalu-blue hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Validar e Importar
                      </button>
                    </div>
                  </div>
                )}

                {importStep === 'preview' && (
                  <div className="space-y-6">
                    <div className="bg-pink-50 p-4 rounded-2xl flex items-start gap-3">
                      <AlertTriangle className="text-magalu-pink shrink-0" size={20} />
                      <div>
                        <p className="text-sm font-bold text-pink-800">Erros encontrados na validação</p>
                        <p className="text-xs text-pink-700">Corrija os erros no arquivo e tente novamente ou ignore as linhas inválidas.</p>
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-2xl">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 font-bold text-slate-400 uppercase text-[10px]">Linha</th>
                            <th className="px-4 py-2 font-bold text-slate-400 uppercase text-[10px]">Erro</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {importErrors.map((err, i) => (
                            <tr key={i}>
                              <td className="px-4 py-2 text-slate-600 font-mono">{err.row}</td>
                              <td className="px-4 py-2 text-magalu-pink font-medium">{err.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="pt-6 flex gap-3">
                      <button 
                        onClick={() => setImportStep('mapping')}
                        className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        Voltar ao Mapeamento
                      </button>
                      <button 
                        onClick={() => { setIsImportOpen(false); resetImport(); }}
                        className="flex-1 py-3 rounded-xl font-bold text-white bg-magalu-pink hover:bg-pink-600 transition-all"
                      >
                        Fechar e Corrigir Arquivo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registration Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingClient ? 'Editar Cliente' : 'Novo Cadastro de Cliente'}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Razão Social</label>
                    <input 
                      required
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nome da Empresa"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-magalu-blue outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Código Gemco</label>
                    <input 
                      required
                      type="text" 
                      value={gemcoCode}
                      onChange={(e) => setGemcoCode(e.target.value)}
                      placeholder="0000"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-magalu-blue outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CNPJ</label>
                    <input 
                      required
                      type="text" 
                      value={document}
                      onChange={(e) => setDocument(e.target.value)}
                      placeholder="00.000.000/0001-00"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-magalu-blue outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Wallets */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Associação de Carteiras</label>
                  <div className="flex flex-wrap gap-3">
                    {WALLETS.map(wallet => (
                      <button
                        key={wallet}
                        type="button"
                        onClick={() => toggleWallet(wallet)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border-2 ${
                          selectedWallets.includes(wallet)
                            ? 'bg-magalu-blue text-white border-magalu-blue shadow-md'
                            : 'bg-white text-slate-500 border-slate-100 hover:border-magalu-blue/30'
                        }`}
                      >
                        {wallet}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phones */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telefones (Até 5)</label>
                    {phones.length < 5 && (
                      <button type="button" onClick={addPhone} className="text-magalu-blue text-xs font-bold flex items-center gap-1 hover:underline">
                        <Plus size={14} /> Adicionar Telefone
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {phones.map((phone, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-slate-50 rounded-2xl relative">
                        <div className="md:col-span-3 space-y-1">
                          <input 
                            type="text" 
                            placeholder="Número"
                            value={phone.number}
                            onChange={(e) => {
                              const newPhones = [...phones];
                              newPhones[index].number = e.target.value;
                              setPhones(newPhones);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                          />
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={phone.isWhatsapp}
                              onChange={(e) => {
                                const newPhones = [...phones];
                                newPhones[index].isWhatsapp = e.target.checked;
                                setPhones(newPhones);
                              }}
                              className="accent-magalu-green"
                            />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">WhatsApp</span>
                          </label>
                        </div>
                        <div className="md:col-span-4">
                          <input 
                            type="text" 
                            placeholder="Nome do Contato"
                            value={phone.contactName}
                            onChange={(e) => {
                              const newPhones = [...phones];
                              newPhones[index].contactName = e.target.value;
                              setPhones(newPhones);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <input 
                            type="text" 
                            placeholder="Cargo"
                            value={phone.contactPosition}
                            onChange={(e) => {
                              const newPhones = [...phones];
                              newPhones[index].contactPosition = e.target.value;
                              setPhones(newPhones);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                          />
                        </div>
                        <div className="md:col-span-1 flex items-center justify-center">
                          {phones.length > 1 && (
                            <button type="button" onClick={() => removePhone(index)} className="text-slate-300 hover:text-magalu-pink transition-colors">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Emails */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">E-mails (Até 5)</label>
                    {emails.length < 5 && (
                      <button type="button" onClick={addEmail} className="text-magalu-blue text-xs font-bold flex items-center gap-1 hover:underline">
                        <Plus size={14} /> Adicionar E-mail
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {emails.map((email, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-slate-50 rounded-2xl relative">
                        <div className="md:col-span-3">
                          <input 
                            type="email" 
                            placeholder="E-mail"
                            value={email.email}
                            onChange={(e) => {
                              const newEmails = [...emails];
                              newEmails[index].email = e.target.value;
                              setEmails(newEmails);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <input 
                            type="text" 
                            placeholder="Nome do Contato"
                            value={email.contactName}
                            onChange={(e) => {
                              const newEmails = [...emails];
                              newEmails[index].contactName = e.target.value;
                              setEmails(newEmails);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <input 
                            type="text" 
                            placeholder="Cargo"
                            value={email.contactPosition}
                            onChange={(e) => {
                              const newEmails = [...emails];
                              newEmails[index].contactPosition = e.target.value;
                              setEmails(newEmails);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                          />
                        </div>
                        <div className="md:col-span-1 flex items-center justify-center">
                          {emails.length > 1 && (
                            <button type="button" onClick={() => removeEmail(index)} className="text-slate-300 hover:text-magalu-pink transition-colors">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>

              <div className="p-6 border-t border-slate-100 flex justify-end gap-4 bg-slate-50/50">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-magalu-blue text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-magalu-blue/20"
                >
                  Salvar Cadastro
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-magalu-pink/10 text-magalu-pink rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Excluir Cadastro?</h3>
              <p className="text-slate-500 mb-8">Esta ação não pode ser desfeita. Todos os dados deste cliente serão removidos permanentemente.</p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-6 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="px-6 py-3 rounded-xl font-bold text-white bg-magalu-pink hover:bg-pink-600 transition-colors shadow-lg shadow-magalu-pink/20"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('Consulta de Clientes');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailViewMode, setDetailViewMode] = useState<'main' | 'contacts'>('main');
  const [clientSubTab, setClientSubTab] = useState<'titles' | 'history'>('titles');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [newHistoryAction, setNewHistoryAction] = useState('Ligação Telefônica');
  const [newHistoryStatus, setNewHistoryStatus] = useState('Em dia');
  const [newHistoryObservation, setNewHistoryObservation] = useState('');
  
  const [invoiceStatuses, setInvoiceStatuses] = useState<string[]>(INITIAL_INVOICE_STATUSES);
  const [finalizationTypes, setFinalizationTypes] = useState<string[]>(INITIAL_FINALIZATION_TYPES);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [optionTypeToAdd, setOptionTypeToAdd] = useState<'status' | 'finalization'>('status');
  const [newOptionValue, setNewOptionValue] = useState('');
  const [viewingInvoiceHistory, setViewingInvoiceHistory] = useState<Invoice | null>(null);
  const [addingFinalizationToInvoice, setAddingFinalizationToInvoice] = useState<Invoice | null>(null);
  const [tempFinalization, setTempFinalization] = useState('');

  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([
    { 
      id: '1', 
      name: 'Lembrete Preventivo', 
      subject: 'Lembrete: Seu boleto Magalu vence em breve', 
      body: 'Olá {{nome}}, informamos que sua fatura no valor de {{valor}} tem vencimento previsto para o dia {{vencimento}}. Evite atrasos e garanta a continuidade dos seus serviços.' 
    },
    { 
      id: '2', 
      name: 'Cobrança Amigável (Atraso Curto)', 
      subject: 'Aviso de Pendência: Boleto Magalu em atraso', 
      body: 'Olá {{nome}}, notamos que o pagamento da sua fatura de {{valor}}, vencida em {{vencimento}}, ainda não foi identificado. Caso já tenha realizado o pagamento, por favor desconsidere este aviso.' 
    },
    { 
      id: '3', 
      name: 'Notificação de Débito (Atraso Médio)', 
      subject: 'IMPORTANTE: Regularize sua situação com a Magalu', 
      body: 'Prezado(a) {{nome}}, sua fatura de {{valor}} está com atraso superior a 10 dias. Para evitar a suspensão de serviços e possíveis restrições, solicitamos a regularização imediata do débito vencido em {{vencimento}}.' 
    }
  ]);

  const [billingRules, setBillingRules] = useState<BillingRuleStep[]>([
    { 
      id: '1', 
      name: 'Lembrete Preventivo PJ',
      delayDays: 3, 
      delayType: 'before', 
      statusFilter: ['Atrasado', 'Pendente'],
      finalizationFilter: [],
      walletFilter: ['PJ'],
      templateId: '1', 
      active: true 
    },
    { 
      id: '2', 
      name: 'Cobrança 3 dias PJ',
      delayDays: 3, 
      delayType: 'after', 
      statusFilter: ['Atrasado'],
      finalizationFilter: [],
      walletFilter: ['PJ'],
      templateId: '2', 
      active: true 
    },
    { 
      id: '3', 
      name: 'Cobrança 5 dias Pontual',
      delayDays: 5, 
      delayType: 'after', 
      statusFilter: ['Atrasado'],
      finalizationFilter: [],
      walletFilter: ['Pontual'],
      templateId: '2', 
      active: true 
    }
  ]);

  const addOption = () => {
    if (!newOptionValue.trim()) return;
    if (optionTypeToAdd === 'status') {
      if (!invoiceStatuses.includes(newOptionValue)) {
        setInvoiceStatuses([...invoiceStatuses, newOptionValue]);
      }
    } else {
      if (!finalizationTypes.includes(newOptionValue)) {
        setFinalizationTypes([...finalizationTypes, newOptionValue]);
      }
    }
    setNewOptionValue('');
    setIsOptionsModalOpen(false);
  };

  const updateInvoice = (invoiceId: string, field: keyof Invoice, value: any) => {
    if (!selectedClient || !user) return;

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    
    const invoice = selectedClient.invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    const fieldName = field === 'status' ? 'Status' : field === 'finalization' ? 'Finalização' : field === 'finalizationDate' ? 'Data de Finalização' : field;
    const historyEntry: CollectionHistory = {
      id: `H${Date.now()}`,
      date: formattedDate,
      user: user.name,
      action: `Alteração de ${fieldName}`,
      status: field === 'status' ? value : (invoice.status || 'N/A'),
      observation: `Fatura ${invoice.order || invoice.id}: ${fieldName} alterado para "${value}"`
    };

    setClients(prev => prev.map(c => {
      if (c.id === selectedClient.id) {
        const updatedInvoices = c.invoices.map(inv => {
          if (inv.id === invoiceId) {
            const updatedInv = { ...inv, [field]: value };
            
            // Se estiver alterando a finalização, adiciona ao histórico da fatura
            if (field === 'finalization') {
              const finHistory: InvoiceFinalizationHistory = {
                id: `FH${Date.now()}`,
                date: formattedDate,
                user: user.name,
                type: value
              };
              updatedInv.finalizationHistory = [finHistory, ...(inv.finalizationHistory || [])];
              updatedInv.finalizationDate = now.toLocaleDateString('pt-BR');
            }
            
            return updatedInv;
          }
          return inv;
        });
        const updatedHistory = [historyEntry, ...c.history];
        const updatedClient = { ...c, invoices: updatedInvoices, history: updatedHistory };
        setSelectedClient(updatedClient);
        return updatedClient;
      }
      return c;
    }));
  };

  const addHistoryEntry = () => {
    if (!selectedClient || !user) return;

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    
    const historyEntry: CollectionHistory = {
      id: `H${Date.now()}`,
      date: formattedDate,
      user: user.name,
      action: newHistoryAction,
      status: newHistoryStatus,
      observation: newHistoryObservation
    };

    setClients(prev => prev.map(c => {
      if (c.id === selectedClient.id) {
        const updatedHistory = [historyEntry, ...c.history];
        const updatedClient = { ...c, history: updatedHistory };
        setSelectedClient(updatedClient);
        return updatedClient;
      }
      return c;
    }));

    setIsHistoryModalOpen(false);
    setNewHistoryObservation('');
  };

  const [filterOpenOnly, setFilterOpenOnly] = useState(false);

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const normalizedQuery = query.replace(/[^\d]/g, ''); // Only numbers for CNPJ/CPF matching

    return clients.filter(client => {
      const nameMatch = client.name.toLowerCase().includes(query);
      const docMatch = client.document.replace(/[^\d]/g, '').includes(normalizedQuery);
      
      // CNPJ Root match (first 8 digits)
      const isCNPJ = client.document.replace(/[^\d]/g, '').length === 14;
      const rootMatch = isCNPJ && normalizedQuery.length >= 8 && client.document.replace(/[^\d]/g, '').startsWith(normalizedQuery.substring(0, 8));

      const matchesSearch = nameMatch || docMatch || rootMatch;
      
      if (filterOpenOnly) {
        const hasOpenInvoices = client.invoices.some(inv => getInvoiceStatus(inv.dueDate) === 'Atrasos' || getInvoiceStatus(inv.dueDate) === 'Em dia');
        return matchesSearch && hasOpenInvoices;
      }

      return matchesSearch;
    });
  }, [searchQuery, filterOpenOnly, clients]);

  if (!user) {
    return <LoginScreen onLogin={(userData) => setUser(userData)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-magalu-blue rounded-xl flex items-center justify-center text-white font-bold text-xl italic">
            M
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-magalu-blue">Cobrança <span className="text-magalu-pink">+ PJ</span></h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Magalu Billing</p>
          </div>
        </div>

        <nav className="px-4 mt-6 space-y-2">
          <SidebarItem 
            icon={Search} 
            label="Consulta de Clientes" 
            active={activeTab === 'Consulta de Clientes' && !selectedClient} 
            onClick={() => { setActiveTab('Consulta de Clientes'); setSelectedClient(null); setDetailViewMode('main'); }} 
          />
          <SidebarItem icon={FileText} label="Cadastros de Clientes" active={activeTab === 'Cadastros de Clientes'} onClick={() => { setActiveTab('Cadastros de Clientes'); setSelectedClient(null); setDetailViewMode('main'); }} />
          
          <div className="pt-4 mt-4 border-t border-slate-100">
            <p className="px-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carteiras de Cobrança</p>
            <SidebarItem icon={CreditCard} label="Carteira PJ" active={activeTab === 'Carteira PJ'} onClick={() => { setActiveTab('Carteira PJ'); setSelectedClient(null); setDetailViewMode('main'); }} />
            <SidebarItem icon={CreditCard} label="Carteira Pontual" active={activeTab === 'Carteira Pontual'} onClick={() => { setActiveTab('Carteira Pontual'); setSelectedClient(null); setDetailViewMode('main'); }} />
            <SidebarItem icon={CreditCard} label="Carteira Hubsales" active={activeTab === 'Carteira Hubsales'} onClick={() => { setActiveTab('Carteira Hubsales'); setSelectedClient(null); setDetailViewMode('main'); }} />
            <SidebarItem icon={CreditCard} label="Carteira Estante Virtual" active={activeTab === 'Carteira Estante Virtual'} onClick={() => { setActiveTab('Carteira Estante Virtual'); setSelectedClient(null); setDetailViewMode('main'); }} />
            <SidebarItem icon={CreditCard} label="Carteira Saldo Negativo" active={activeTab === 'Carteira Saldo Negativo'} onClick={() => { setActiveTab('Carteira Saldo Negativo'); setSelectedClient(null); setDetailViewMode('main'); }} />
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <p className="px-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Processamento</p>
            <SidebarItem 
              icon={Mail} 
              label="Motor de Envio / Régua" 
              active={activeTab === 'Motor de Envio / Régua'} 
              onClick={() => { setActiveTab('Motor de Envio / Régua'); setSelectedClient(null); setDetailViewMode('main'); }} 
            />
            <SidebarItem 
              icon={FileSpreadsheet} 
              label="Retorno Bancário" 
              active={activeTab === 'Retorno Bancário'} 
              onClick={() => { setActiveTab('Retorno Bancário'); setSelectedClient(null); setDetailViewMode('main'); }} 
            />
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            {user.role === 'Gestor' && (
              <SidebarItem icon={TrendingUp} label="Relatórios" active={activeTab === 'Relatórios'} onClick={() => setActiveTab('Relatórios')} />
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <SidebarItem icon={Settings} label="Configurações" active={activeTab === 'Configurações'} onClick={() => setActiveTab('Configurações')} />
            <SidebarItem icon={LogOut} label="Sair" onClick={() => setUser(null)} />
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
              <Menu size={24} />
            </button>
            <h2 className="font-bold text-slate-600 hidden sm:block">
              {activeTab}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-magalu-pink rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold leading-none">{user.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{user.position}</p>
              </div>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-magalu-blue border-2 border-white shadow-sm ${user.role === 'Gestor' ? 'bg-magalu-pink text-white' : 'bg-magalu-yellow'}`}>
                {user.avatar}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'Cadastros de Clientes' ? (
              <motion.div
                key="registration"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ClientRegistrationTab clients={clients} setClients={setClients} />
              </motion.div>
            ) : activeTab === 'Motor de Envio / Régua' ? (
              <motion.div
                key="sending-engine"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <SendingEnginePage 
                  billingRules={billingRules} 
                  setBillingRules={setBillingRules} 
                  emailTemplates={emailTemplates} 
                  setEmailTemplates={setEmailTemplates}
                  clients={clients}
                  setClients={setClients}
                  invoiceStatuses={invoiceStatuses}
                  finalizationTypes={finalizationTypes}
                  wallets={['PJ', 'Pontual', 'Hubsales', 'Estante Virtual', 'Saldo Negativo', 'MKT']}
                />
              </motion.div>
            ) : activeTab === 'Retorno Bancário' ? (
              <motion.div
                key="bank-return"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <BankReturnPage />
              </motion.div>
            ) : activeTab === 'Configurações' ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto"
              >
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Configurações do Sistema</h2>
                  <p className="text-slate-500">Gerencie as opções de status e finalização disponíveis na grade.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Status Management */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="text-magalu-blue" size={20} />
                        Status de Faturas
                      </h3>
                      <button 
                        onClick={() => { setOptionTypeToAdd('status'); setIsOptionsModalOpen(true); }}
                        className="p-2 bg-magalu-blue/10 text-magalu-blue rounded-lg hover:bg-magalu-blue/20 transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {invoiceStatuses.map((status, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                          <span className="text-sm font-medium text-slate-700">{status}</span>
                          <button 
                            onClick={() => setInvoiceStatuses(prev => prev.filter(s => s !== status))}
                            className="p-1 text-slate-300 hover:text-magalu-pink opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Finalization Management */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Handshake className="text-magalu-pink" size={20} />
                        Tipos de Finalização
                      </h3>
                      <button 
                        onClick={() => { setOptionTypeToAdd('finalization'); setIsOptionsModalOpen(true); }}
                        className="p-2 bg-magalu-pink/10 text-magalu-pink rounded-lg hover:bg-magalu-pink/20 transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {finalizationTypes.map((type, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                          <span className="text-sm font-medium text-slate-700">{type}</span>
                          <button 
                            onClick={() => setFinalizationTypes(prev => prev.filter(t => t !== type))}
                            className="p-1 text-slate-300 hover:text-magalu-pink opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab.startsWith('Carteira ') && !selectedClient ? (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <WalletPage 
                  walletName={activeTab.replace('Carteira ', '')} 
                  clients={clients} 
                  setSelectedClient={setSelectedClient} 
                  setDetailViewMode={setDetailViewMode}
                  invoiceStatuses={invoiceStatuses}
                  finalizationTypes={finalizationTypes}
                />
              </motion.div>
            ) : !selectedClient ? (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-5xl mx-auto"
              >
                {/* Search Dashboard */}
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">Consulta de Clientes</h2>
                  <p className="text-slate-500">Localize rapidamente clientes por Razão Social ou CNPJ.</p>
                  
                  <div className="mt-8 max-w-2xl mx-auto space-y-4">
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-magalu-blue">
                        <Search size={24} />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Nome, CNPJ ou Raiz do CNPJ..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 focus:border-magalu-blue outline-none transition-all text-lg"
                      />
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      <button 
                        onClick={() => setFilterOpenOnly(!filterOpenOnly)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border-2 ${
                          filterOpenOnly 
                            ? 'bg-magalu-blue text-white border-magalu-blue shadow-lg shadow-magalu-blue/20' 
                            : 'bg-white text-slate-500 border-slate-100 hover:border-magalu-blue/30'
                        }`}
                      >
                        <Clock size={18} />
                        Contas em Aberto (Vencido/A vencer)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Results List */}
                <div className="space-y-4">
                  {(searchQuery || filterOpenOnly) && filteredClients.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 font-medium">Nenhum cliente encontrado com os filtros aplicados.</p>
                    </div>
                  )}

                  {filteredClients.map((client) => (
                    <motion.div 
                      key={client.id}
                      layoutId={client.id}
                      onClick={() => { setSelectedClient(client); setDetailViewMode('main'); }}
                      className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-magalu-blue/30 transition-all cursor-pointer group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-xl ${client.type === 'PJ' ? 'bg-magalu-blue/10 text-magalu-blue' : 'bg-magalu-pink/10 text-magalu-pink'}`}>
                          {client.type === 'PJ' ? <Building2 size={24} /> : <UserIcon size={24} />}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg group-hover:text-magalu-blue transition-colors">{client.name}</h3>
                          <p className="text-slate-500 text-sm flex items-center gap-2">
                            <CreditCard size={14} /> {client.document}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-slate-400 font-bold uppercase">Dias Atraso</p>
                          <p className="font-bold text-magalu-pink text-center">
                            {Math.max(0, ...client.invoices.map(inv => calculateDaysDelay(inv.dueDate))) || '-'}
                          </p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-slate-400 font-bold uppercase">Dívida Total</p>
                          <p className="font-bold text-slate-900">{client.totalDebt}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                            getClientStatus(client) === 'Em dia' ? 'bg-magalu-green/10 text-magalu-green' :
                            'bg-magalu-pink/10 text-magalu-pink'
                          }`}>
                            {getClientStatus(client)}
                          </span>
                          <ChevronRight className="text-slate-300 group-hover:text-magalu-blue transition-colors" size={20} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-6xl mx-auto"
              >
                <div className="flex items-center justify-between mb-8">
                  <button 
                    onClick={() => { setSelectedClient(null); setDetailViewMode('main'); }}
                    className="flex items-center gap-2 text-slate-500 hover:text-magalu-blue font-bold transition-colors"
                  >
                    <ArrowLeft size={20} />
                    Voltar para Busca
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Client Info Header */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 ${selectedClient.type === 'PJ' ? 'bg-magalu-blue/10 text-magalu-blue' : 'bg-magalu-pink/10 text-magalu-pink'}`}>
                          {selectedClient.type === 'PJ' ? <Building2 size={40} /> : <UserIcon size={40} />}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900">{selectedClient.name}</h3>
                          <p className="text-slate-500 font-medium flex items-center gap-2">
                            <CreditCard size={16} /> {selectedClient.document}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button 
                          onClick={() => setDetailViewMode(detailViewMode === 'main' ? 'contacts' : 'main')}
                          className="flex items-center gap-2 px-6 py-3 bg-magalu-blue text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-md active:scale-[0.98]"
                        >
                          {detailViewMode === 'main' ? (
                            <><Users size={18} /> Ver Contatos</>
                          ) : (
                            <><ArrowLeft size={18} /> Voltar aos Detalhes</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {detailViewMode === 'main' ? (
                    <div className="space-y-8">
                      {/* Financial Summary */}
                      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-wider">Status Atual</p>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                              getClientStatus(selectedClient) === 'Em dia' ? 'bg-magalu-green/10 text-magalu-green' :
                              'bg-magalu-pink/10 text-magalu-pink'
                            }`}>
                              {getClientStatus(selectedClient)}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-wider">Dívida Total</p>
                            <p className="text-3xl font-bold text-magalu-pink">{selectedClient.totalDebt}</p>
                          </div>
                        </div>
                      </div>

                      {/* Sub-tabs Navigation */}
                      <div className="flex bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-1">
                        <button 
                          onClick={() => setClientSubTab('titles')}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                            clientSubTab === 'titles' 
                              ? 'bg-magalu-blue text-white shadow-md' 
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <FileText size={18} /> Títulos em Aberto
                        </button>
                        <button 
                          onClick={() => setClientSubTab('history')}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                            clientSubTab === 'history' 
                              ? 'bg-magalu-blue text-white shadow-md' 
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <History size={18} /> Histórico de Cobranças
                        </button>
                      </div>

                      {clientSubTab === 'titles' ? (
                        /* Open Titles Table */
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800">Títulos</h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pedido</th>
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Slip</th>
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filial</th>
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nota</th>
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Emissão</th>
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vencimento</th>
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dias Atraso</th>
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Parc.</th>
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Total</th>
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Carteira</th>
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Finalização</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {selectedClient.invoices
                                  .filter(inv => !activeTab.startsWith('Carteira ') || inv.wallet === activeTab.replace('Carteira ', ''))
                                  .map((invoice) => (
                                  <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">{invoice.order}</td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">{invoice.slip}</td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">{invoice.filial.split(' - ')[0]}</td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">{invoice.invoiceNumber}</td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">{invoice.issueDate}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-slate-900 whitespace-nowrap">{invoice.dueDate}</td>
                                    <td className="px-6 py-4 text-xs font-bold whitespace-nowrap">
                                      {calculateDaysDelay(invoice.dueDate) > 0 ? (
                                        <span className="text-magalu-pink">{calculateDaysDelay(invoice.dueDate)}</span>
                                      ) : (
                                        <span className="text-slate-400">-</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">{invoice.installments}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-slate-900 whitespace-nowrap">{invoice.amount}</td>
                                    <td className="px-6 py-4">
                                      <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                                        {invoice.wallet}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      {activeTab === 'Consulta de Clientes' ? (
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                          getInvoiceStatus(invoice.dueDate) === 'Em dia' ? 'bg-magalu-green/10 text-magalu-green' :
                                          'bg-magalu-pink/10 text-magalu-pink'
                                        }`}>
                                          {getInvoiceStatus(invoice.dueDate)}
                                        </span>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                                            getInvoiceStatus(invoice.dueDate) === 'Em dia' ? 'bg-magalu-green/10 text-magalu-green' :
                                            'bg-magalu-pink/10 text-magalu-pink'
                                          }`}>
                                            {getInvoiceStatus(invoice.dueDate)}
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-6 py-4">
                                      {activeTab === 'Consulta de Clientes' ? (
                                        <div className="flex items-center gap-2">
                                          <div className="space-y-1">
                                            <span className="text-[10px] font-bold uppercase text-slate-600">
                                              {invoice.finalization || 'Sem Finalização'}
                                            </span>
                                            {invoice.finalizationDate && (
                                              <p className="text-[10px] text-slate-400">{invoice.finalizationDate}</p>
                                            )}
                                          </div>
                                          {invoice.finalizationHistory && invoice.finalizationHistory.length > 0 && (
                                            <button 
                                              onClick={() => setViewingInvoiceHistory(invoice)}
                                              className="p-1.5 bg-magalu-blue/10 text-magalu-blue rounded-lg hover:bg-magalu-blue/20 transition-all shadow-sm"
                                              title="Ver histórico de finalizações"
                                            >
                                              <History size={14} />
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2">
                                            <div className="space-y-1">
                                              <span className="text-[10px] font-bold uppercase text-slate-600">
                                                {invoice.finalization || 'Sem Finalização'}
                                              </span>
                                              {invoice.finalizationDate && (
                                                <p className="text-[10px] text-slate-400">{invoice.finalizationDate}</p>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-1 ml-auto">
                                              <button 
                                                onClick={() => {
                                                  setAddingFinalizationToInvoice(invoice);
                                                  setTempFinalization(invoice.finalization || finalizationTypes[0]);
                                                }}
                                                className="p-1.5 bg-magalu-blue text-white rounded-lg hover:bg-blue-600 transition-all shadow-sm"
                                                title="Adicionar nova finalização"
                                              >
                                                <Plus size={14} />
                                              </button>
                                              <button 
                                                onClick={() => setViewingInvoiceHistory(invoice)}
                                                className={`p-1.5 rounded-lg transition-all shadow-sm ${
                                                  invoice.finalizationHistory && invoice.finalizationHistory.length > 0 
                                                    ? 'bg-magalu-blue/10 text-magalu-blue hover:bg-magalu-blue/20' 
                                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                                }`}
                                                title="Ver histórico de finalizações"
                                              >
                                                <History size={14} />
                                              </button>
                                            </div>
                                          </div>
                                          {(invoice.finalization === 'Emissão de Boletos' || 
                                            invoice.finalization === 'Promessa de Pagamento') && (
                                            <input 
                                              type="date"
                                              value={invoice.finalizationDate || ''}
                                              onChange={(e) => updateInvoice(invoice.id, 'finalizationDate', e.target.value)}
                                              className="block text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5 outline-none"
                                            />
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        /* Collection History Table */
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Histórico de Cobranças</h3>
                            <button 
                              onClick={() => setIsHistoryModalOpen(true)}
                              className="flex items-center gap-2 bg-magalu-blue text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-600 transition-all shadow-md shadow-magalu-blue/20"
                            >
                              <Plus size={16} /> Adicionar Ocorrência
                            </button>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</th>
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usuário</th>
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ação</th>
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Observação</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {selectedClient.history.length > 0 ? (
                                  selectedClient.history.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">{item.date}</td>
                                      <td className="px-6 py-4 text-xs font-bold text-slate-700 whitespace-nowrap">{item.user}</td>
                                      <td className="px-6 py-4 text-xs text-slate-600 whitespace-nowrap">{item.action}</td>
                                      <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-md bg-blue-50 text-magalu-blue text-[10px] font-bold uppercase">
                                          {item.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-xs text-slate-500 min-w-[200px]">{item.observation}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm italic">
                                      Nenhum histórico registrado para este cliente.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Contacts View */}
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                          <h3 className="text-lg font-bold text-slate-800">Contatos Cadastrados</h3>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Phones */}
                          <div className="space-y-6">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                              <Phone size={16} /> Telefones
                            </h4>
                            <div className="grid gap-4">
                              {selectedClient.phones.map((phone, idx) => (
                                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:border-magalu-blue/30 transition-all">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                      <Phone size={20} />
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900">{phone.number}</p>
                                      <p className="text-xs text-slate-500">{phone.contactName} • {phone.contactPosition}</p>
                                    </div>
                                  </div>
                                  {phone.isWhatsapp && (
                                    <span className="px-2 py-1 rounded-md bg-magalu-green/10 text-magalu-green text-[10px] font-bold uppercase">
                                      WhatsApp
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Emails */}
                          <div className="space-y-6">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                              <Mail size={16} /> E-mails
                            </h4>
                            <div className="grid gap-4">
                              {selectedClient.emails.map((email, idx) => (
                                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4 group hover:border-magalu-blue/30 transition-all">
                                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                    <Mail size={20} />
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900">{email.email}</p>
                                    <p className="text-xs text-slate-500">{email.contactName} • {email.contactPosition}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modal para Adicionar Finalização à Fatura */}
      <AnimatePresence>
        {addingFinalizationToInvoice && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddingFinalizationToInvoice(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-magalu-blue p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Nova Finalização</h3>
                    <p className="text-xs text-white/70">Fatura: {addingFinalizationToInvoice.order || addingFinalizationToInvoice.id}</p>
                  </div>
                </div>
                <button onClick={() => setAddingFinalizationToInvoice(null)} className="text-white/60 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Selecione a Finalização</label>
                  <select 
                    value={tempFinalization}
                    onChange={(e) => setTempFinalization(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-magalu-blue outline-none text-sm"
                  >
                    {finalizationTypes.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="text-magalu-blue shrink-0" size={20} />
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Ao salvar, esta finalização será registrada como a atual e a anterior será movida para o histórico.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button 
                  onClick={() => setAddingFinalizationToInvoice(null)}
                  className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    updateInvoice(addingFinalizationToInvoice.id, 'finalization', tempFinalization);
                    setAddingFinalizationToInvoice(null);
                  }}
                  className="bg-magalu-blue text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-magalu-blue/20"
                >
                  Salvar Finalização
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Finalization History Modal */}
      <AnimatePresence>
        {viewingInvoiceHistory && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingInvoiceHistory(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-magalu-blue p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <History size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Histórico de Finalizações</h3>
                    <p className="text-xs text-white/70">Fatura: {viewingInvoiceHistory.order || viewingInvoiceHistory.id}</p>
                  </div>
                </div>
                <button onClick={() => setViewingInvoiceHistory(null)} className="text-white/60 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                  {viewingInvoiceHistory.finalizationHistory?.map((entry, idx) => (
                    <div key={entry.id} className="relative pl-6 pb-4 last:pb-0">
                      {idx !== (viewingInvoiceHistory.finalizationHistory?.length || 0) - 1 && (
                        <div className="absolute left-[7px] top-4 bottom-0 w-0.5 bg-slate-100" />
                      )}
                      <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-magalu-blue bg-white" />
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-magalu-blue uppercase tracking-wider">{entry.type}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{entry.date}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">Operador: {entry.user}</p>
                      </div>
                    </div>
                  ))}
                  {(!viewingInvoiceHistory.finalizationHistory || viewingInvoiceHistory.finalizationHistory.length === 0) && (
                    <div className="text-center py-8">
                      <p className="text-slate-400 text-sm">Nenhum histórico registrado para esta fatura.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button 
                  onClick={() => setViewingInvoiceHistory(null)}
                  className="px-6 py-2 rounded-xl font-bold text-magalu-blue hover:bg-magalu-blue/10 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-magalu-blue p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Handshake size={24} />
                  </div>
                  <h3 className="text-xl font-bold">Nova Ocorrência</h3>
                </div>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-white/60 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Ação Realizada</label>
                    <select 
                      value={newHistoryAction}
                      onChange={(e) => setNewHistoryAction(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-magalu-blue outline-none text-sm"
                    >
                      <option value="Ligação Telefônica">Ligação Telefônica</option>
                      <option value="Envio de E-mail">Envio de E-mail</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Visita Presencial">Visita Presencial</option>
                      <option value="Acordo de Pagamento">Acordo de Pagamento</option>
                      <option value="Notificação Extrajudicial">Notificação Extrajudicial</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Status do Cliente</label>
                    <select 
                      value={newHistoryStatus}
                      onChange={(e) => setNewHistoryStatus(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-magalu-blue outline-none text-sm"
                    >
                      {invoiceStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Observações Detalhadas</label>
                  <textarea 
                    value={newHistoryObservation}
                    onChange={(e) => setNewHistoryObservation(e.target.value)}
                    rows={4}
                    placeholder="Descreva o que foi conversado e os próximos passos..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-magalu-blue outline-none text-sm resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex justify-end gap-4 bg-slate-50/50">
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={addHistoryEntry}
                  className="bg-magalu-blue text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-magalu-blue/20"
                >
                  Registrar Ocorrência
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para Adicionar Novo Status ou Finalização */}
      <AnimatePresence>
        {isOptionsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOptionsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    Novo {optionTypeToAdd === 'status' ? 'Status' : 'Tipo de Finalização'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Adicione uma nova opção para a grade.</p>
                </div>
                <button 
                  onClick={() => setIsOptionsModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Descrição da Opção</label>
                  <input 
                    type="text"
                    value={newOptionValue}
                    onChange={(e) => setNewOptionValue(e.target.value)}
                    placeholder={`Ex: ${optionTypeToAdd === 'status' ? 'Aguardando Pagamento' : 'Enviado para Jurídico'}`}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-magalu-blue outline-none text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && addOption()}
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex justify-end gap-4 bg-slate-50/50">
                <button 
                  onClick={() => setIsOptionsModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={addOption}
                  className="bg-magalu-blue text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-magalu-blue/20"
                >
                  Adicionar Opção
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
