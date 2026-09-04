/**
 * EINSOF ERP — API Serverless pour Vercel (format natif)
 * 
 * Architecture :
 *   - Vercel Node.js serverless function (VercelRequest/VercelResponse)
 *   - PostgreSQL (Neon) via @neondatabase/serverless
 *   - JWT auth (jsonwebtoken + bcryptjs)
 *   - Modèle document store : table `documents` (collection, id, data JSONB)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

// ============================================================
// DATABASE
// ============================================================
const getSql = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL manquant');
  return neon(url);
};

const genId = () => crypto.randomBytes(16).toString('hex');

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
    const existing = await this.getItem(collection, id);
    if (!existing) return null;
    const merged = { ...existing, ...updates, updated_at: new Date().toISOString() };
    const { id: _, ...data } = merged;
    const sql = getSql();
    await sql`UPDATE documents SET data = ${JSON.stringify(data)}, updated_at = NOW() WHERE collection = ${collection} AND id = ${id}`;
    return merged;
  },
  async delete(collection: string, id: string): Promise<boolean> {
    const sql = getSql();
    const result: any = await sql`DELETE FROM documents WHERE collection = ${collection} AND id = ${id}`;
    return Array.isArray(result) ? result.length > 0 : (result?.count ?? 0) > 0;
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
    const result: any = await sql`DELETE FROM users WHERE id = ${id}`;
    return Array.isArray(result) ? result.length > 0 : (result?.count ?? 0) > 0;
  },
};

// ============================================================
// AUTH
// ============================================================
const JWT_SECRET = process.env.JWT_SECRET || 'einsof_dev_secret';
const JWT_TTL = (parseInt(process.env.JWT_TTL_HOURS || '12')) * 3600;

const getToken = (req: VercelRequest): string | null => {
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
};

const auth = (req: VercelRequest): any | null => {
  const token = getToken(req);
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
};

const requireAuth = (req: VercelRequest, res: VercelResponse): any | null => {
  const user = auth(req);
  if (!user) {
    res.status(401).json({ error: 'Authentification requise.' });
    return null;
  }
  return user;
};

const requireRole = (req: VercelRequest, res: VercelResponse, ...roles: string[]): any | null => {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (!roles.includes(user.role)) {
    res.status(403).json({ error: 'Accès refusé.' });
    return null;
  }
  return user;
};

// ============================================================
// SANITIZATION
// ============================================================
const sanitize = (value: any, maxLength: number = 2000): any => {
  if (typeof value === 'string') return value.slice(0, maxLength).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  if (Array.isArray(value)) return value.map(v => sanitize(v, maxLength));
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitize(v, maxLength);
    return out;
  }
  return value;
};

// ============================================================
// CONFIG TABLES CRUD
// ============================================================
const CRUD_TABLES: Record<string, { roles: string[]; defaults?: any }> = {
  btpOffres: { roles: ['GERANT','COMMERCIAL','ETUDES','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'], defaults: { statut: 'repérée' } },
  btpChantiers: { roles: ['GERANT','RH','COMMERCIAL','ETUDES','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'], defaults: { statut: 'planification' } },
  btpEngins: { roles: ['GERANT','COMMERCIAL','ETUDES','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'] },
  btpIncidents: { roles: ['GERANT','COMMERCIAL','ETUDES','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'], defaults: { statut: 'déclaré' } },
  btpJournaux: { roles: ['GERANT','COMMERCIAL','ETUDES','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'] },
  btpSituations: { roles: ['GERANT','COMMERCIAL','ETUDES','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'], defaults: { statut: 'brouillon' } },
  btpAffectations: { roles: ['GERANT','RH','COND_TRAVAUX','CHEF_CHANTIER','DEVELOPPEUR'], defaults: { statut: 'active' } },
  btpPointages: { roles: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','DEVELOPPEUR'] },
  btpArticles: { roles: ['GERANT','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'] },
  btpBonCommandes: { roles: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'], defaults: { statut: 'brouillon' } },
  btpMouvements: { roles: ['GERANT','RESP_MATERIEL','MAGASINIER_BTP','CHEF_CHANTIER','DEVELOPPEUR'] },
  btpDocuments: { roles: ['GERANT','COMMERCIAL','ETUDES','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','ASSISTANTE','DEVELOPPEUR'] },
  btpAvenants: { roles: ['GERANT','COND_TRAVAUX','ETUDES','COMPTABLE','DEVELOPPEUR'], defaults: { statut: 'brouillon' } },
  btpOs: { roles: ['GERANT','COND_TRAVAUX','DEVELOPPEUR'] },
  btpSousTraitances: { roles: ['GERANT','COND_TRAVAUX','COMPTABLE','DEVELOPPEUR'], defaults: { statut: 'en_cours' } },
  btpFournisseurs: { roles: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','RESP_MATERIEL','MAGASINIER_BTP','COMPTABLE','DEVELOPPEUR'] },
  btpCautionnements: { roles: ['GERANT','COMPTABLE','DEVELOPPEUR'], defaults: { statut: 'active' } },
  btpInspections: { roles: ['GERANT','QHSE_BTP','COND_TRAVAUX','CHEF_CHANTIER','DEVELOPPEUR'], defaults: { statut: 'planifiée' } },
  btpPrixUnitaires: { roles: ['GERANT','ETUDES','COMPTABLE','DEVELOPPEUR'] },
  btpHeuresEngins: { roles: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','RESP_MATERIEL','DEVELOPPEUR'] },
  agroLotMatierePremieres: { roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'], defaults: { statut: 'planifié' } },
  agroLotProductions: { roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'], defaults: { statut: 'planifié' } },
  agroControles: { roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'] },
  agroCommandes: { roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'], defaults: { statut: 'enregistrée' } },
  agroLignesLivrees: { roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'] },
  agroFiches: { roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'] },
  agroReclamations: { roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'], defaults: { statut: 'ouverte' } },
  agendaEvents: { roles: ['GERANT','ASSISTANTE','COMMERCIAL','DEVELOPPEUR'] },
  devisRecords: { roles: ['GERANT','ASSISTANTE','COMMERCIAL','DEVELOPPEUR'] },
};

const CONFIG_KEYS = [
  'companyName','companyAddress','companyId','companyEmail','companyPhone',
  'logoUrl','logoBase64','stampUrl','signatureUrl','bankingDetails','contractTerms',
  'clientTarget','targetAmountPerClient','rhSmig','rhCnssEmployerRate','rhCnssEmployeeRate',
  'rhCnssCeiling','rhRtsAbattement','rhRtsRate','tvaRate','delegations','activeModules','btpPermissions',
];

const FINANCE = ['GERANT', 'COMPTABLE'];
const RH_ROLES = ['GERANT', 'RH'];

// ============================================================
// ROUTEUR NATIF VERCEL
// ============================================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = req.url?.split('?')[0] || '';
  const method = req.method || 'GET';
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  
  // Parse path segments: /api/segment1/segment2/...
  const parts = url.replace(/^\/api\//, '').split('/').filter(Boolean);
  const route = parts[0] || '';
  const param1 = parts[1];
  const param2 = parts[2];
  const param3 = parts[3];

  try {
    // ============================================================
    // SANTÉ
    // ============================================================
    if (route === 'ping') {
      return res.json({ message: 'pong', time: Date.now(), runtime: 'vercel-nodejs', db: process.env.DATABASE_URL ? 'configured' : 'missing' });
    }

    // ============================================================
    // AUTH
    // ============================================================
    if (route === 'auth' && param1 === 'login' && method === 'POST') {
      const { username, password } = body;
      if (!username || !password) return res.status(400).json({ success: false, error: 'Identifiant et mot de passe requis.' });

      const user = await db.getUserByUsername(username.toLowerCase().trim());
      if (!user) return res.status(401).json({ success: false, error: 'Identifiants invalides.' });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ success: false, error: 'Identifiants invalides.' });
      if (user.is_active === false) return res.status(403).json({ success: false, error: 'Compte désactivé.' });

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_TTL });
      return res.json({
        success: true, token,
        user: { id: user.id, username: user.username, role: user.role, firstName: user.first_name, lastName: user.last_name },
      });
    }

    if (route === 'auth' && param1 === 'register' && method === 'POST') {
      const user = requireRole(req, res, 'GERANT'); if (!user) return;
      const { username, password, role, firstName, lastName } = body;
      if (!username || !password || password.length < 8) return res.status(400).json({ error: 'Mot de passe >= 8 caractères requis.' });
      const VALID_ROLES = ['GERANT','COMMERCIAL','COMPTABLE','RH','ASSISTANTE','ETUDES','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'];
      if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide.' });
      const existing = await db.getUserByUsername(username.toLowerCase().trim());
      if (existing) return res.status(409).json({ error: 'Identifiant déjà utilisé.' });
      const id = genId();
      const hash = await bcrypt.hash(password, 10);
      await db.insertUser({ id, username: username.toLowerCase().trim(), password_hash: hash, role, first_name: firstName || '', last_name: lastName || '' });
      return res.status(201).json({ success: true, user: { id, username, role } });
    }

    // ============================================================
    // USERS
    // ============================================================
    if (route === 'users' && !param1 && method === 'GET') {
      const user = requireRole(req, res, 'GERANT'); if (!user) return;
      const users = await db.getUsers();
      return res.json({ success: true, users: users.map((u: any) => ({
        id: u.id, username: u.username, role: u.role, firstName: u.first_name, lastName: u.last_name, isActive: u.is_active !== false, createdAt: u.created_at,
      }))});
    }
    if (route === 'users' && param2 === 'delete') {
      const user = requireRole(req, res, 'GERANT'); if (!user) return;
      if (param1 === user.id) return res.status(400).json({ error: 'Auto-suppression impossible.' });
      const ok = await db.deleteUser(param1);
      return res.json({ success: ok });
    }

    // ============================================================
    // DATA (alimentation initiale)
    // ============================================================
    if (route === 'data' && method === 'GET') {
      const user = requireAuth(req, res); if (!user) return;
      const role = user.role;
      const allData = await db.getAllData();

      const response: any = {
        projects: allData.projects || [], prospects: allData.prospects || [],
        companyConfig: allData.config?.[0] || {},
        internal_messages: [], tasks: [], notifications: [],
        agendaEvents: allData.agendaEvents || [], devisRecords: allData.devisRecords || [],
      };

      if (FINANCE.includes(role)) {
        response.expenses = allData.expenses || [];
        response.treasury_accounts = allData.treasury_accounts || [];
        response.transactions = allData.transactions || [];
      }
      if (RH_ROLES.includes(role)) {
        response.employees = allData.employees || [];
        response.contracts = allData.contracts || [];
        response.leave_requests = allData.leave_requests || [];
        response.payslips = allData.payslips || [];
      }

      const userId = user.id;
      response.internal_messages = (allData.internal_messages || []).filter((m: any) => m.receiverRole === 'ALL' || m.receiverRole === role || m.senderId === userId);
      response.tasks = (allData.tasks || []).filter((t: any) => t.receiverRole === role || t.receiverRole === 'ALL' || t.senderId === userId);
      response.notifications = (allData.notifications || []).filter((n: any) => n.targetRole === role || n.targetRole === 'ALL');

      const btpTables = ['btpOffres','btpChantiers','btpEngins','btpIncidents','btpJournaux','btpSituations','btpAffectations','btpPointages','btpArticles','btpBonCommandes','btpMouvements','btpDocuments','btpAvenants','btpOs','btpSousTraitances','btpFournisseurs','btpCautionnements','btpInspections','btpPrixUnitaires','btpHeuresEngins'];
      for (const t of btpTables) response[t] = allData[t] || [];
      const agroTables = ['agroLotMatierePremieres','agroLotProductions','agroControles','agroCommandes','agroLignesLivrees','agroFiches','agroReclamations'];
      for (const t of agroTables) response[t] = allData[t] || [];
      response.btpEmployeeDirectory = (allData.employees || []).map((e: any) => ({ id: e.id, firstName: e.firstName, lastName: e.lastName, position: e.position }));

      return res.json(response);
    }

    // ============================================================
    // CONFIG
    // ============================================================
    if (route === 'config' && param1 === 'update' && method === 'POST') {
      const user = requireRole(req, res, 'GERANT'); if (!user) return;
      const existing = await db.getItem('config', 'main') || {};
      const updated = { ...existing, ...sanitize(body) };
      const { id, ...data } = updated;
      await db.update('config', 'main', data);
      const safe: any = {};
      for (const k of CONFIG_KEYS) if (updated[k] !== undefined) safe[k] = updated[k];
      return res.json({ success: true, config: safe });
    }
    if (route === 'public' && param1 === 'config') {
      const cfg = await db.getItem('config', 'main') || {};
      const safe: any = {};
      for (const k of CONFIG_KEYS) if (cfg[k] !== undefined) safe[k] = cfg[k];
      return res.json(safe);
    }

    // ============================================================
    // MESSAGES / TASKS / NOTIFICATIONS
    // ============================================================
    if (route === 'messages' && method === 'POST' && !param1) {
      const user = requireAuth(req, res); if (!user) return;
      const msg = {
        id: genId(), senderId: user.id,
        senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
        senderRole: user.role,
        receiverRole: body.receiverRole, content: sanitize(body.content, 5000),
        attachment: body.attachment ? sanitize(body.attachment) : null,
        timestamp: new Date().toISOString(), isRead: false,
      };
      await db.insert('internal_messages', msg);
      return res.status(201).json(msg);
    }
    if (route === 'messages' && param2 === 'read') {
      const user = requireAuth(req, res); if (!user) return;
      await db.update('internal_messages', param1, { isRead: true });
      return res.json({ success: true });
    }
    if (route === 'tasks' && method === 'POST' && !param1) {
      const user = requireAuth(req, res); if (!user) return;
      const task = {
        id: genId(), senderId: user.id, senderRole: user.role,
        senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
        receiverRole: body.receiverRole, title: sanitize(body.title, 250),
        content: sanitize(body.content || '', 10000), status: 'TODO',
        priority: body.priority || 'MEDIUM', link: body.link || '',
        escalated: false, createdAt: new Date().toISOString(),
      };
      await db.insert('tasks', task);
      return res.status(201).json(task);
    }
    if (route === 'tasks' && param2 === 'update') {
      const user = requireAuth(req, res); if (!user) return;
      const updated = await db.update('tasks', param1, sanitize(body));
      if (!updated) return res.status(404).json({ error: 'Tâche non trouvée.' });
      return res.json(updated);
    }
    if (route === 'notifications' && method === 'POST' && !param1) {
      const user = requireAuth(req, res); if (!user) return;
      const notif = { id: genId(), targetRole: body.targetRole, message: sanitize(body.message, 1000), type: body.type || 'INFO', isRead: false, createdAt: new Date().toISOString() };
      await db.insert('notifications', notif);
      return res.status(201).json(notif);
    }
    if (route === 'notifications' && param2 === 'read') {
      const user = requireAuth(req, res); if (!user) return;
      await db.update('notifications', param1, { isRead: true });
      return res.json({ success: true });
    }

    // ============================================================
    // RH
    // ============================================================
    if (route === 'rh' && param1 === 'data') {
      const user = requireRole(req, res, ...RH_ROLES); if (!user) return;
      const [employees, contracts, leaves, payslips] = await Promise.all([
        db.getTable('employees'), db.getTable('contracts'),
        db.getTable('leave_requests'), db.getTable('payslips'),
      ]);
      return res.json({ employees, contracts, leave_requests: leaves, payslips });
    }
    if (route === 'rh' && param1 === 'employees' && method === 'POST' && !param2) {
      const user = requireRole(req, res, ...RH_ROLES); if (!user) return;
      const emp = { id: genId(), ...sanitize(body), isActive: true, createdAt: new Date().toISOString() };
      await db.insert('employees', emp);
      return res.status(201).json(emp);
    }
    if (route === 'rh' && param1 === 'employees' && param2 === 'update') {
      const user = requireRole(req, res, ...RH_ROLES); if (!user) return;
      const updated = await db.update('employees', param1, sanitize(body));
      if (!updated) return res.status(404).json({ error: 'Employé non trouvé.' });
      return res.json(updated);
    }
    if (route === 'rh' && param1 === 'contracts' && method === 'POST' && !param2) {
      const user = requireRole(req, res, ...RH_ROLES); if (!user) return;
      const ctr = { id: genId(), ...sanitize(body), status: 'ACTIVE', createdAt: new Date().toISOString() };
      await db.insert('contracts', ctr);
      return res.status(201).json(ctr);
    }
    if (route === 'rh' && param1 === 'leaves' && method === 'POST' && !param2) {
      const user = requireRole(req, res, ...RH_ROLES); if (!user) return;
      const lr = { id: genId(), ...sanitize(body), status: 'PENDING', createdAt: new Date().toISOString() };
      await db.insert('leave_requests', lr);
      return res.status(201).json(lr);
    }
    if (route === 'rh' && param1 === 'leaves' && param2 === 'update') {
      const user = requireRole(req, res, ...RH_ROLES); if (!user) return;
      const updated = await db.update('leave_requests', param1, sanitize(body));
      if (!updated) return res.status(404).json({ error: 'Demande non trouvée.' });
      return res.json(updated);
    }
    if (route === 'rh' && param1 === 'payslips' && method === 'POST' && !param2) {
      const user = requireRole(req, res, ...RH_ROLES); if (!user) return;
      const ps = { id: genId(), ...sanitize(body), status: 'DRAFT', createdAt: new Date().toISOString() };
      await db.insert('payslips', ps);
      return res.status(201).json(ps);
    }
    if (route === 'rh' && param1 === 'payslips' && param2 === 'update') {
      const user = requireRole(req, res, ...RH_ROLES); if (!user) return;
      const updated = await db.update('payslips', param1, sanitize(body));
      if (!updated) return res.status(404).json({ error: 'Bulletin non trouvé.' });
      return res.json(updated);
    }

    // ============================================================
    // PROSPECTS
    // ============================================================
    if (route === 'prospects' && method === 'POST' && !param1) {
      const user = requireRole(req, res, 'GERANT', 'COMMERCIAL'); if (!user) return;
      const p = { id: genId(), ...sanitize(body), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await db.insert('prospects', p);
      return res.status(201).json(p);
    }
    if (route === 'prospects' && param2 === 'update') {
      const user = requireRole(req, res, 'GERANT', 'COMMERCIAL'); if (!user) return;
      const updated = await db.update('prospects', param1, { ...sanitize(body), updatedAt: new Date().toISOString() });
      if (!updated) return res.status(404).json({ error: 'Prospect non trouvé.' });
      return res.json(updated);
    }
    if (route === 'prospects' && param2 === 'delete') {
      const user = requireRole(req, res, 'GERANT', 'COMMERCIAL'); if (!user) return;
      const ok = await db.delete('prospects', param1);
      return res.json({ success: ok });
    }

    // ============================================================
    // DÉPENSES
    // ============================================================
    if (route === 'expenses' && method === 'POST' && !param1) {
      const user = requireRole(req, res, ...FINANCE); if (!user) return;
      const exp = { id: genId(), ...sanitize(body), status: 'PENDING', createdAt: new Date().toISOString() };
      await db.insert('expenses', exp);
      return res.status(201).json(exp);
    }
    if (route === 'expenses' && param2 === 'update') {
      const user = requireRole(req, res, ...FINANCE); if (!user) return;
      const updated = await db.update('expenses', param1, sanitize(body));
      if (!updated) return res.status(404).json({ error: 'Dépense non trouvée.' });
      return res.json(updated);
    }
    if (route === 'expenses' && param2 === 'delete') {
      const user = requireRole(req, res, ...FINANCE); if (!user) return;
      const ok = await db.delete('expenses', param1);
      return res.json({ success: ok });
    }

    // ============================================================
    // TRÉSORERIE
    // ============================================================
    if (route === 'accounting' && param1 === 'accounts' && method === 'GET') {
      const user = requireRole(req, res, ...FINANCE); if (!user) return;
      return res.json({ success: true, accounts: await db.getTable('treasury_accounts') });
    }
    if (route === 'accounting' && param1 === 'accounts' && method === 'POST') {
      const user = requireRole(req, res, ...FINANCE); if (!user) return;
      const { name, type, balance } = body;
      if (!name || !['BANQUE', 'CAISSE', 'MOBILE_MONEY'].includes(type)) return res.status(400).json({ error: 'Nom et type valides requis.' });
      const acc = { id: genId(), name: sanitize(name, 150), type, balance: Number(balance) || 0, createdAt: new Date().toISOString() };
      await db.insert('treasury_accounts', acc);
      return res.status(201).json(acc);
    }
    if (route === 'accounting' && param1 === 'transactions' && method === 'GET') {
      const user = requireRole(req, res, ...FINANCE); if (!user) return;
      return res.json({ success: true, transactions: await db.getTable('transactions') });
    }
    if (route === 'accounting' && param1 === 'transactions' && method === 'POST') {
      const user = requireRole(req, res, ...FINANCE); if (!user) return;
      const { type, accountId, amount, toAccountId } = body;
      if (!['CREDIT', 'DEBIT', 'TRANSFERT_INTERNE'].includes(type) || !accountId || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Type, compte et montant > 0 requis.' });
      }
      const accounts = await db.getTable('treasury_accounts');
      const account = accounts.find((a: any) => a.id === accountId);
      if (!account) return res.status(400).json({ error: 'Compte introuvable.' });
      const tx = { id: genId(), accountId, toAccountId: toAccountId || null, type, amount: Number(amount), date: new Date().toISOString(), referenceId: body.referenceId || '', category: sanitize(body.category || 'AUTRE', 80), description: sanitize(body.description || '', 500), isReconciled: false };
      await db.insert('transactions', tx);
      const delta = type === 'CREDIT' ? amount : -amount;
      await db.update('treasury_accounts', accountId, { balance: (account.balance || 0) + delta });
      if (type === 'TRANSFERT_INTERNE' && toAccountId) {
        const dest = accounts.find((a: any) => a.id === toAccountId);
        if (dest) await db.update('treasury_accounts', toAccountId, { balance: (dest.balance || 0) + amount });
      }
      return res.status(201).json(tx);
    }

    // ============================================================
    // PROJETS
    // ============================================================
    if (route === 'projects' && method === 'POST' && !param1) {
      const user = requireAuth(req, res); if (!user) return;
      const proj = { id: genId(), name: sanitize(body.name || 'Nouveau Dossier', 250), clientName: sanitize(body.clientName || 'Non défini', 250), budget: Number(body.budget) || 0, status: body.status || 'NOUVEAU', createdAt: new Date().toISOString(), paymentStatus: 'PENDING', documents: [] };
      await db.insert('projects', proj);
      return res.status(201).json(proj);
    }
    if (route === 'projects' && param2 === 'update') {
      const user = requireAuth(req, res); if (!user) return;
      const updates = sanitize(body);
      if (updates.status === 'PAYE' && !FINANCE.includes(user.role)) delete updates.status;
      if (updates.paymentStatus && !FINANCE.includes(user.role)) delete updates.paymentStatus;
      const updated = await db.update('projects', param1, updates);
      if (!updated) return res.status(404).json({ error: 'Projet non trouvé.' });
      return res.json(updated);
    }
    if (route === 'projects' && param2 === 'delete') {
      const user = requireRole(req, res, 'GERANT'); if (!user) return;
      const ok = await db.delete('projects', param1);
      return res.json({ success: ok });
    }

    // ============================================================
    // CRUD GÉNÉRIQUE
    // ============================================================
    if (route === 'crud' && param1 && method === 'POST' && !param2) {
      const schema = CRUD_TABLES[param1];
      if (!schema) return res.status(404).json({ error: 'Table inconnue.' });
      const user = requireRole(req, res, ...schema.roles); if (!user) return;
      const id = genId();
      const item = { id, ...(schema.defaults || {}), ...sanitize(body), created_by: user.id, createdAt: new Date().toISOString(), updated_at: new Date().toISOString() };
      if (schema.defaults?.statut !== undefined) item.statut = schema.defaults.statut;
      await db.insert(param1, item);
      return res.status(201).json(item);
    }
    if (route === 'crud' && param1 && param2 && param3 === 'update') {
      const schema = CRUD_TABLES[param1];
      if (!schema) return res.status(404).json({ error: 'Table inconnue.' });
      const user = requireRole(req, res, ...schema.roles); if (!user) return;
      const updates = { ...sanitize(body), updated_at: new Date().toISOString() };
      const updated = await db.update(param1, param2, updates);
      if (!updated) return res.status(404).json({ error: 'Élément non trouvé.' });
      return res.json(updated);
    }
    if (route === 'crud' && param1 && param2 && param3 === 'delete') {
      const user = requireRole(req, res, 'GERANT'); if (!user) return;
      const ok = await db.delete(param1, param2);
      return res.json({ success: ok });
    }

    // ============================================================
    // 404
    // ============================================================
    return res.status(404).json({ error: 'Route non trouvée.', url, method });

  } catch (err: any) {
    console.error('API Error:', err);
    return res.status(500).json({ error: 'Erreur interne du serveur.', detail: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
}
