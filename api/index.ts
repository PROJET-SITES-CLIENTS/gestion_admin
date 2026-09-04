/**
 * EINSOF ERP — API Serverless pour Vercel
 * 
 * Architecture :
 *   - Express.js wrappé dans serverless-http
 *   - PostgreSQL (Neon) via @neondatabase/serverless
 *   - JWT auth (jsonwebtoken + bcryptjs)
 *   - Modèle document store : table `documents` (collection, id, data JSONB)
 * 
 * Toutes les routes PHP sont portées ici en TypeScript.
 */

import express from 'express';
import serverless from 'serverless-http';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const app = express();
app.use(express.json({ limit: '25mb' }));

// ============================================================
// DATABASE — Neon PostgreSQL
// ============================================================
const getSql = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL manquant');
  return neon(url);
};

// CRUD helpers sur la table documents
const db = {
  async getTable(collection: string): Promise<any[]> {
    const sql = getSql();
    const rows = await sql`SELECT id, data FROM documents WHERE collection = ${collection} ORDER BY created_at`;
    return rows.map((r: any) => ({ id: r.id, ...r.data }));
  },

  async getItem(collection: string, id: string): Promise<any | null> {
    const sql = getSql();
    const rows = await sql`SELECT data FROM documents WHERE collection = ${collection} AND id = ${id}`;
    return rows[0] ? { id, ...rows[0].data } : null;
  },

  async insert(collection: string, item: any): Promise<any> {
    const sql = getSql();
    const { id, ...data } = item;
    await sql`INSERT INTO documents (collection, id, data) VALUES (${collection}, ${id}, ${JSON.stringify(data)})`;
    return item;
  },

  async update(collection: string, id: string, updates: any): Promise<any | null> {
    const sql = getSql();
    // Merge : lit l'existant puis fusionne
    const existing = await this.getItem(collection, id);
    if (!existing) return null;
    const merged = { ...existing, ...updates, updated_at: new Date().toISOString() };
    const { id: _, ...data } = merged;
    await sql`UPDATE documents SET data = ${JSON.stringify(data)}, updated_at = NOW() WHERE collection = ${collection} AND id = ${id}`;
    return merged;
  },

  async delete(collection: string, id: string): Promise<boolean> {
    const sql = getSql();
    const result = await sql`DELETE FROM documents WHERE collection = ${collection} AND id = ${id}`;
    return result.count > 0;
  },

  async getAllData(): Promise<Record<string, any[]>> {
    const sql = getSql();
    const rows = await sql`SELECT collection, id, data FROM documents`;
    const result: Record<string, any[]> = {};
    for (const r of rows) {
      if (!result[r.collection]) result[r.collection] = [];
      result[r.collection].push({ id: r.id, ...r.data });
    }
    return result;
  },

  // Users (table dédiée pour l'auth)
  async getUsers(): Promise<any[]> {
    const sql = getSql();
    return await sql`SELECT * FROM users ORDER BY created_at`;
  },

  async getUserByUsername(username: string): Promise<any | null> {
    const sql = getSql();
    const rows = await sql`SELECT * FROM users WHERE LOWER(username) = LOWER(${username})`;
    return rows[0] || null;
  },

  async insertUser(user: any): Promise<void> {
    const sql = getSql();
    await sql`INSERT INTO users (id, username, password_hash, role, first_name, last_name, is_active)
      VALUES (${user.id}, ${user.username}, ${user.password_hash}, ${user.role}, ${user.first_name || ''}, ${user.last_name || ''}, ${user.is_active ?? true})`;
  },

  async deleteUser(id: string): Promise<boolean> {
    const sql = getSql();
    const result = await sql`DELETE FROM users WHERE id = ${id}`;
    return result.count > 0;
  },
};

const genId = () => crypto.randomBytes(16).toString('hex');

// ============================================================
// AUTH MIDDLEWARE
// ============================================================
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_vercel_env';
const JWT_TTL_HOURS = parseInt(process.env.JWT_TTL_HOURS || '12');

const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Session invalide ou expirée.' });
  }
};

const authorize = (...roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'Authentification requise.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé : permissions insuffisantes.' });
    }
    next();
  };
};

// ============================================================
// SANITIZATION (anti-XSS basique)
// ============================================================
const sanitize = (value: any, maxLength: number = 2000): any => {
  if (typeof value === 'string') {
    return value.slice(0, maxLength).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  if (Array.isArray(value)) return value.map(v => sanitize(v, maxLength));
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitize(v, maxLength);
    return out;
  }
  return value;
};

// ============================================================
// ROUTES
// ============================================================

// --- Santé ---
app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong', time: Date.now(), runtime: 'vercel-nodejs' });
});

// --- Auth ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Identifiant et mot de passe requis.' });
    }

    const user = await db.getUserByUsername(username.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ success: false, error: 'Identifiants invalides.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Identifiants invalides.' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ success: false, error: 'Compte désactivé.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: `${JWT_TTL_HOURS}h` }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erreur interne.' });
  }
});

app.post('/api/auth/register', authenticate, authorize('GERANT'), async (req, res) => {
  try {
    const { username, password, role, firstName, lastName } = req.body;
    if (!username || !password || password.length < 8) {
      return res.status(400).json({ success: false, error: 'Mot de passe >= 8 caractères requis.' });
    }

    const VALID_ROLES = ['GERANT','COMMERCIAL','COMPTABLE','RH','ASSISTANTE','ETUDES','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'];
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: 'Rôle invalide.' });
    }

    const existing = await db.getUserByUsername(username.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ success: false, error: 'Identifiant déjà utilisé.' });
    }

    const id = genId();
    const hash = await bcrypt.hash(password, 10);
    await db.insertUser({
      id, username: username.toLowerCase().trim(), password_hash: hash, role,
      first_name: firstName || '', last_name: lastName || '',
    });

    res.status(201).json({ success: true, user: { id, username, role } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Erreur interne.' });
  }
});

// --- Users ---
app.get('/api/users', authenticate, authorize('GERANT'), async (req, res) => {
  const users = await db.getUsers();
  res.json({
    success: true,
    users: users.map(u => ({
      id: u.id, username: u.username, role: u.role,
      firstName: u.first_name, lastName: u.last_name,
      isActive: u.is_active !== false, createdAt: u.created_at,
    })),
  });
});

app.post('/api/users/:id/delete', authenticate, authorize('GERANT'), async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) return res.status(400).json({ error: 'Impossible de se supprimer soi-même.' });
  const users = await db.getUsers();
  const target = users.find(u => u.id === id);
  if (!target) return res.status(404).json({ error: 'Utilisateur non trouvé.' });
  if (target.username === 'admin') return res.status(403).json({ error: 'Compte admin principal protégé.' });
  const ok = await db.deleteUser(id);
  res.json({ success: ok });
});

// --- Data (alimentation initiale) ---
app.get('/api/data', authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    const allData = await db.getAllData();

    const response: any = {
      projects: allData.projects || [],
      prospects: allData.prospects || [],
      companyConfig: allData.config?.[0] || {},
      expenses: [],
      internal_messages: [],
      tasks: [],
      notifications: [],
      employees: [],
      contracts: [],
      leave_requests: [],
      payslips: [],
      treasury_accounts: [],
      transactions: [],
      agendaEvents: allData.agendaEvents || [],
      devisRecords: allData.devisRecords || [],
    };

    // Finances → GERANT/COMPTABLE
    if (['GERANT', 'COMPTABLE'].includes(role)) {
      response.expenses = allData.expenses || [];
      response.treasury_accounts = allData.treasury_accounts || [];
      response.transactions = allData.transactions || [];
    }

    // RH → GERANT/RH
    if (['GERANT', 'RH'].includes(role)) {
      response.employees = allData.employees || [];
      response.contracts = allData.contracts || [];
      response.leave_requests = allData.leave_requests || [];
      response.payslips = allData.payslips || [];
    }

    // Messagerie filtrée par rôle
    const userId = req.user.id;
    response.internal_messages = (allData.internal_messages || []).filter((m: any) =>
      m.receiverRole === 'ALL' || m.receiverRole === role || m.senderId === userId
    );

    // Tâches filtrées
    response.tasks = (allData.tasks || []).filter((t: any) =>
      t.receiverRole === role || t.receiverRole === 'ALL' || t.senderId === userId
    );

    // Notifications filtrées
    response.notifications = (allData.notifications || []).filter((n: any) =>
      n.targetRole === role || n.targetRole === 'ALL'
    );

    // BTP tables
    const btpTables = [
      'btpOffres', 'btpChantiers', 'btpEngins', 'btpIncidents', 'btpJournaux', 'btpSituations',
      'btpAffectations', 'btpPointages', 'btpArticles', 'btpBonCommandes', 'btpMouvements',
      'btpDocuments', 'btpAvenants', 'btpOs', 'btpSousTraitances', 'btpFournisseurs',
      'btpCautionnements', 'btpInspections', 'btpPrixUnitaires', 'btpHeuresEngins',
    ];
    for (const t of btpTables) {
      response[t] = allData[t] || [];
    }

    // Agro tables
    const agroTables = [
      'agroLotMatierePremieres', 'agroLotProductions', 'agroControles',
      'agroCommandes', 'agroLignesLivrees', 'agroFiches', 'agroReclamations',
    ];
    for (const t of agroTables) {
      response[t] = allData[t] || [];
    }

    // Annuaire employés (sans données sensibles)
    response.btpEmployeeDirectory = (allData.employees || []).map((e: any) => ({
      id: e.id, firstName: e.firstName, lastName: e.lastName, position: e.position,
    }));

    res.json(response);
  } catch (err) {
    console.error('Data error:', err);
    res.status(500).json({ error: 'Erreur chargement données.' });
  }
});

// --- Config ---
const CONFIG_KEYS = [
  'companyName','companyAddress','companyId','companyEmail','companyPhone',
  'logoUrl','logoBase64','stampUrl','signatureUrl','bankingDetails','contractTerms',
  'clientTarget','targetAmountPerClient','rhSmig','rhCnssEmployerRate','rhCnssEmployeeRate',
  'rhCnssCeiling','rhRtsAbattement','rhRtsRate','tvaRate','delegations','activeModules','btpPermissions',
];

app.post('/api/config/update', authenticate, authorize('GERANT'), async (req, res) => {
  const existing = await db.getItem('config', 'main') || { id: 'main' };
  const updated = { ...existing, ...req.body };
  const { id, ...data } = updated;
  await db.update('config', 'main', data);
  const safe: any = {};
  for (const k of CONFIG_KEYS) if (updated[k] !== undefined) safe[k] = updated[k];
  res.json({ success: true, config: safe });
});

app.get('/api/public/config', async (req, res) => {
  const cfg = await db.getItem('config', 'main') || {};
  const safe: any = {};
  for (const k of CONFIG_KEYS) if (cfg[k] !== undefined) safe[k] = cfg[k];
  res.json(safe);
});

// --- Messages ---
app.post('/api/messages', authenticate, async (req, res) => {
  const { receiverRole, content, attachment } = req.body;
  if (!receiverRole || !content?.trim()) {
    return res.status(400).json({ error: 'Destinataire et contenu requis.' });
  }
  const msg = {
    id: genId(),
    senderId: req.user.id,
    senderName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username,
    senderRole: req.user.role,
    receiverRole,
    content: sanitize(content, 5000),
    attachment: attachment ? sanitize(attachment) : null,
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  await db.insert('internal_messages', msg);
  res.status(201).json(msg);
});

app.post('/api/messages/:id/read', authenticate, async (req, res) => {
  const updated = await db.update('internal_messages', req.params.id, { isRead: true });
  if (!updated) return res.status(404).json({ error: 'Message non trouvé.' });
  res.json({ success: true });
});

// --- Tasks ---
app.post('/api/tasks', authenticate, async (req, res) => {
  const { receiverRole, title, content, priority, link } = req.body;
  if (!receiverRole || !title?.trim()) {
    return res.status(400).json({ error: 'Destinataire et titre requis.' });
  }
  const task = {
    id: genId(),
    senderId: req.user.id,
    senderRole: req.user.role,
    senderName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username,
    receiverRole,
    title: sanitize(title, 250),
    content: sanitize(content || '', 10000),
    status: 'TODO',
    priority: priority || 'MEDIUM',
    link: link || '',
    escalated: false,
    createdAt: new Date().toISOString(),
  };
  await db.insert('tasks', task);
  res.status(201).json(task);
});

app.post('/api/tasks/:id/update', authenticate, async (req, res) => {
  const updates: any = {};
  if (req.body.status) updates.status = req.body.status;
  if (req.body.escalated !== undefined) updates.escalated = req.body.escalated;
  if (req.body.priority) updates.priority = req.body.priority;
  const updated = await db.update('tasks', req.params.id, updates);
  if (!updated) return res.status(404).json({ error: 'Tâche non trouvée.' });
  res.json(updated);
});

// --- Notifications ---
app.post('/api/notifications', authenticate, async (req, res) => {
  const { targetRole, message, type } = req.body;
  if (!targetRole || !message?.trim()) {
    return res.status(400).json({ error: 'Rôle cible et message requis.' });
  }
  const notif = {
    id: genId(),
    targetRole,
    message: sanitize(message, 1000),
    type: type || 'INFO',
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  await db.insert('notifications', notif);
  res.status(201).json(notif);
});

app.post('/api/notifications/:id/read', authenticate, async (req, res) => {
  const updated = await db.update('notifications', req.params.id, { isRead: true });
  if (!updated) return res.status(404).json({ error: 'Notification non trouvée.' });
  res.json({ success: true });
});

// --- RH ---
const RH_ROLES = ['GERANT', 'RH'];

app.get('/api/rh/data', authenticate, authorize(...RH_ROLES), async (req, res) => {
  const [employees, contracts, leaves, payslips] = await Promise.all([
    db.getTable('employees'),
    db.getTable('contracts'),
    db.getTable('leave_requests'),
    db.getTable('payslips'),
  ]);
  res.json({ employees, contracts, leave_requests: leaves, payslips });
});

app.post('/api/rh/employees', authenticate, authorize(...RH_ROLES), async (req, res) => {
  const emp = { id: genId(), ...sanitize(req.body), isActive: true, createdAt: new Date().toISOString() };
  await db.insert('employees', emp);
  res.status(201).json(emp);
});

app.post('/api/rh/employees/:id/update', authenticate, authorize(...RH_ROLES), async (req, res) => {
  const updated = await db.update('employees', req.params.id, sanitize(req.body));
  if (!updated) return res.status(404).json({ error: 'Employé non trouvé.' });
  res.json(updated);
});

app.post('/api/rh/contracts', authenticate, authorize(...RH_ROLES), async (req, res) => {
  const ctr = { id: genId(), ...sanitize(req.body), status: 'ACTIVE', createdAt: new Date().toISOString() };
  await db.insert('contracts', ctr);
  res.status(201).json(ctr);
});

app.post('/api/rh/leaves', authenticate, authorize(...RH_ROLES), async (req, res) => {
  const lr = { id: genId(), ...sanitize(req.body), status: 'PENDING', createdAt: new Date().toISOString() };
  await db.insert('leave_requests', lr);
  res.status(201).json(lr);
});

app.post('/api/rh/leaves/:id/update', authenticate, authorize(...RH_ROLES), async (req, res) => {
  const updated = await db.update('leave_requests', req.params.id, sanitize(req.body));
  if (!updated) return res.status(404).json({ error: 'Demande non trouvée.' });
  res.json(updated);
});

app.post('/api/rh/payslips', authenticate, authorize(...RH_ROLES), async (req, res) => {
  const ps = { id: genId(), ...sanitize(req.body), status: 'DRAFT', createdAt: new Date().toISOString() };
  await db.insert('payslips', ps);
  res.status(201).json(ps);
});

app.post('/api/rh/payslips/:id/update', authenticate, authorize(...RH_ROLES), async (req, res) => {
  const updated = await db.update('payslips', req.params.id, sanitize(req.body));
  if (!updated) return res.status(404).json({ error: 'Bulletin non trouvé.' });
  res.json(updated);
});

// --- Prospects ---
app.post('/api/prospects', authenticate, authorize('GERANT', 'COMMERCIAL'), async (req, res) => {
  const p = {
    id: genId(), ...sanitize(req.body),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  await db.insert('prospects', p);
  res.status(201).json(p);
});

app.post('/api/prospects/:id/update', authenticate, authorize('GERANT', 'COMMERCIAL'), async (req, res) => {
  const updated = await db.update('prospects', req.params.id, {
    ...sanitize(req.body), updatedAt: new Date().toISOString(),
  });
  if (!updated) return res.status(404).json({ error: 'Prospect non trouvé.' });
  res.json(updated);
});

app.post('/api/prospects/:id/delete', authenticate, authorize('GERANT', 'COMMERCIAL'), async (req, res) => {
  const ok = await db.delete('prospects', req.params.id);
  if (!ok) return res.status(404).json({ error: 'Prospect non trouvé.' });
  res.json({ success: true });
});

// --- Dépenses ---
const FINANCE_ROLES = ['GERANT', 'COMPTABLE'];

app.post('/api/expenses', authenticate, authorize(...FINANCE_ROLES), async (req, res) => {
  const exp = { id: genId(), ...sanitize(req.body), status: 'PENDING', createdAt: new Date().toISOString() };
  await db.insert('expenses', exp);
  res.status(201).json(exp);
});

app.post('/api/expenses/:id/update', authenticate, authorize(...FINANCE_ROLES), async (req, res) => {
  const updated = await db.update('expenses', req.params.id, sanitize(req.body));
  if (!updated) return res.status(404).json({ error: 'Dépense non trouvée.' });
  res.json(updated);
});

app.post('/api/expenses/:id/delete', authenticate, authorize(...FINANCE_ROLES), async (req, res) => {
  const ok = await db.delete('expenses', req.params.id);
  if (!ok) return res.status(404).json({ error: 'Dépense non trouvée.' });
  res.json({ success: true });
});

// --- Trésorerie ---
app.get('/api/accounting/accounts', authenticate, authorize(...FINANCE_ROLES), async (req, res) => {
  res.json({ success: true, accounts: await db.getTable('treasury_accounts') });
});

app.post('/api/accounting/accounts', authenticate, authorize(...FINANCE_ROLES), async (req, res) => {
  const { name, type, balance } = req.body;
  if (!name || !['BANQUE', 'CAISSE', 'MOBILE_MONEY'].includes(type)) {
    return res.status(400).json({ error: 'Nom et type valides requis.' });
  }
  const acc = { id: genId(), name: sanitize(name, 150), type, balance: Number(balance) || 0, createdAt: new Date().toISOString() };
  await db.insert('treasury_accounts', acc);
  res.status(201).json(acc);
});

app.get('/api/accounting/transactions', authenticate, authorize(...FINANCE_ROLES), async (req, res) => {
  res.json({ success: true, transactions: await db.getTable('transactions') });
});

app.post('/api/accounting/transactions', authenticate, authorize(...FINANCE_ROLES), async (req, res) => {
  const { type, accountId, amount, toAccountId, description } = req.body;
  if (!['CREDIT', 'DEBIT', 'TRANSFERT_INTERNE'].includes(type) || !accountId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Type, compte et montant > 0 requis.' });
  }

  // Vérifier le compte existe
  const accounts = await db.getTable('treasury_accounts');
  const account = accounts.find((a: any) => a.id === accountId);
  if (!account) return res.status(400).json({ error: 'Compte introuvable.' });

  // Créer la transaction + mettre à jour le solde
  const tx = {
    id: genId(), accountId, toAccountId: toAccountId || null, type,
    amount: Number(amount), date: new Date().toISOString(),
    referenceId: req.body.referenceId || '',
    category: sanitize(req.body.category || 'AUTRE', 80),
    description: sanitize(description || '', 500),
    isReconciled: false,
  };
  await db.insert('transactions', tx);

  const delta = type === 'CREDIT' ? amount : -amount;
  await db.update('treasury_accounts', accountId, {
    balance: (account.balance || 0) + delta,
  });

  if (type === 'TRANSFERT_INTERNE' && toAccountId) {
    const dest = accounts.find((a: any) => a.id === toAccountId);
    if (dest) {
      await db.update('treasury_accounts', toAccountId, { balance: (dest.balance || 0) + amount });
    }
  }

  res.status(201).json(tx);
});

// --- Projets ---
app.post('/api/projects', authenticate, async (req, res) => {
  const proj = {
    id: genId(),
    name: sanitize(req.body.name || 'Nouveau Dossier', 250),
    clientName: sanitize(req.body.clientName || 'Non défini', 250),
    budget: Number(req.body.budget) || 0,
    status: req.body.status || 'NOUVEAU',
    createdAt: new Date().toISOString(),
    paymentStatus: 'PENDING',
    documents: [],
  };
  await db.insert('projects', proj);
  res.status(201).json(proj);
});

app.post('/api/projects/:id/update', authenticate, async (req, res) => {
  const role = req.user.role;
  const updates = sanitize(req.body);
  // Règle : passage à PAYE réservé aux finances
  if (updates.status === 'PAYE' && !['GERANT', 'COMPTABLE'].includes(role)) {
    delete updates.status;
  }
  if (updates.paymentStatus && !['GERANT', 'COMPTABLE'].includes(role)) {
    delete updates.paymentStatus;
  }
  const updated = await db.update('projects', req.params.id, updates);
  if (!updated) return res.status(404).json({ error: 'Projet non trouvé.' });
  res.json(updated);
});

app.post('/api/projects/:id/delete', authenticate, authorize('GERANT'), async (req, res) => {
  const ok = await db.delete('projects', req.params.id);
  if (!ok) return res.status(404).json({ error: 'Projet non trouvé.' });
  res.json({ success: true });
});

// ============================================================
// CRUD GÉNÉRIQUE — /api/crud/:table
// Pour toutes les tables BTP/Agro/Agenda (modèle déclaratif)
// ============================================================
const CRUD_TABLES: Record<string, { idKey: string; roles: string[]; defaults?: any }> = {
  btpOffres: { idKey: 'id', roles: ['GERANT','COMMERCIAL','ETUDES','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'], defaults: { statut: 'repérée' } },
  btpChantiers: { idKey: 'id', roles: ['GERANT','RH','COMMERCIAL','ETUDES','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'], defaults: { statut: 'planification' } },
  btpEngins: { idKey: 'id', roles: ['GERANT','COMMERCIAL','ETUDES','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'] },
  btpIncidents: { idKey: 'id', roles: ['GERANT','COMMERCIAL','ETUDES','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'], defaults: { statut: 'déclaré' } },
  btpJournaux: { idKey: 'id', roles: ['GERANT','COMMERCIAL','ETUDES','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'] },
  btpSituations: { idKey: 'id', roles: ['GERANT','COMMERCIAL','ETUDES','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'], defaults: { statut: 'brouillon' } },
  btpAffectations: { idKey: 'id', roles: ['GERANT','RH','COND_TRAVAUX','CHEF_CHANTIER','DEVELOPPEUR'], defaults: { statut: 'active' } },
  btpPointages: { idKey: 'id', roles: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','DEVELOPPEUR'] },
  btpArticles: { idKey: 'id', roles: ['GERANT','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'] },
  btpBonCommandes: { idKey: 'id', roles: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'], defaults: { statut: 'brouillon' } },
  btpMouvements: { idKey: 'id', roles: ['GERANT','RESP_MATERIEL','MAGASINIER_BTP','CHEF_CHANTIER','DEVELOPPEUR'] },
  btpDocuments: { idKey: 'id', roles: ['GERANT','COMMERCIAL','ETUDES','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','ASSISTANTE','DEVELOPPEUR'] },
  btpAvenants: { idKey: 'id', roles: ['GERANT','COND_TRAVAUX','ETUDES','COMPTABLE','DEVELOPPEUR'], defaults: { statut: 'brouillon' } },
  btpOs: { idKey: 'id', roles: ['GERANT','COND_TRAVAUX','DEVELOPPEUR'] },
  btpSousTraitances: { idKey: 'id', roles: ['GERANT','COND_TRAVAUX','COMPTABLE','DEVELOPPEUR'], defaults: { statut: 'en_cours' } },
  btpFournisseurs: { idKey: 'id', roles: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','RESP_MATERIEL','MAGASINIER_BTP','COMPTABLE','DEVELOPPEUR'] },
  btpCautionnements: { idKey: 'id', roles: ['GERANT','COMPTABLE','DEVELOPPEUR'], defaults: { statut: 'active' } },
  btpInspections: { idKey: 'id', roles: ['GERANT','QHSE_BTP','COND_TRAVAUX','CHEF_CHANTIER','DEVELOPPEUR'], defaults: { statut: 'planifiée' } },
  btpPrixUnitaires: { idKey: 'id', roles: ['GERANT','ETUDES','COMPTABLE','DEVELOPPEUR'] },
  btpHeuresEngins: { idKey: 'id', roles: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','RESP_MATERIEL','DEVELOPPEUR'] },
  agroLotMatierePremieres: { idKey: 'id_lot', roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'], defaults: { statut: 'planifié' } },
  agroLotProductions: { idKey: 'id_lot', roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'], defaults: { statut: 'planifié' } },
  agroControles: { idKey: 'id', roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'] },
  agroCommandes: { idKey: 'id', roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'], defaults: { statut: 'enregistrée' } },
  agroLignesLivrees: { idKey: 'id', roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'] },
  agroFiches: { idKey: 'id', roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'] },
  agroReclamations: { idKey: 'id', roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'], defaults: { statut: 'ouverte' } },
  agendaEvents: { idKey: 'id', roles: ['GERANT','ASSISTANTE','COMMERCIAL','DEVELOPPEUR'] },
  devisRecords: { idKey: 'id', roles: ['GERANT','ASSISTANTE','COMMERCIAL','DEVELOPPEUR'] },
};

app.post('/api/crud/:table', authenticate, async (req, res) => {
  const schema = CRUD_TABLES[req.params.table];
  if (!schema) return res.status(404).json({ error: 'Table inconnue.' });
  if (!schema.roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }

  const id = genId();
  const item = {
    id,
    ...(schema.defaults || {}),
    ...sanitize(req.body),
    created_by: req.user.id,
    createdAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // Forcer les statuts serveur
  if (schema.defaults?.statut !== undefined) item.statut = schema.defaults.statut;
  if (schema.defaults?.risque_rappel_signale !== undefined) item.risque_rappel_signale = false;

  await db.insert(req.params.table, item);
  res.status(201).json(item);
});

app.post('/api/crud/:table/:id/update', authenticate, async (req, res) => {
  const schema = CRUD_TABLES[req.params.table];
  if (!schema) return res.status(404).json({ error: 'Table inconnue.' });
  if (!schema.roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }
  const updates = { ...sanitize(req.body), updated_at: new Date().toISOString() };
  const updated = await db.update(req.params.table, req.params.id, updates);
  if (!updated) return res.status(404).json({ error: 'Élément non trouvé.' });
  res.json(updated);
});

app.post('/api/crud/:table/:id/delete', authenticate, authorize('GERANT'), async (req, res) => {
  const schema = CRUD_TABLES[req.params.table];
  if (!schema) return res.status(404).json({ error: 'Table inconnue.' });
  const ok = await db.delete(req.params.table, req.params.id);
  if (!ok) return res.status(404).json({ error: 'Élément non trouvé.' });
  res.json({ success: true });
});

// ============================================================
// EXPORT
// ============================================================
export const handler = serverless(app);
