/**
 * EINSOF ERP — API Serverless pour Vercel (format natif)
 * 
 * Architecture :
 *   - Vercel Node.js serverless function (VercelRequest/VercelResponse)
 *   - PostgreSQL (Neon) via @neondatabase/serverless
 *   - JWT auth (jsonwebtoken + bcryptjs)
 *   - Modèle document store : table `documents` (collection, id, data JSONB)
 */

// Types Vercel inline (évite la dépendance @vercel/node)
interface VercelRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body: any;
  query?: Record<string, string>;
}
interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (key: string, value: string) => void;
  end: () => void;
}
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
  const auth = req.headers['authorization'] as string | undefined;
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
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
const CRUD_TABLES: Record<string, { roles: string[]; defaults?: any; userField?: string }> = {
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
  btpOs: { roles: ['GERANT','COND_TRAVAUX','QHSE_BTP','DEVELOPPEUR'] }, // B-3 : le QHSE doit pouvoir émettre l'OS d'arrêt quand il suspend un chantier
  btpSousTraitances: { roles: ['GERANT','COND_TRAVAUX','COMPTABLE','DEVELOPPEUR'], defaults: { statut: 'en_cours' } },
  btpFournisseurs: { roles: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','RESP_MATERIEL','MAGASINIER_BTP','COMPTABLE','DEVELOPPEUR'] },
  btpCautionnements: { roles: ['GERANT','COMPTABLE','DEVELOPPEUR'], defaults: { statut: 'active' } },
  btpInspections: { roles: ['GERANT','QHSE_BTP','COND_TRAVAUX','CHEF_CHANTIER','DEVELOPPEUR'], defaults: { statut: 'planifiée' } },
  btpPrixUnitaires: { roles: ['GERANT','ETUDES','COMPTABLE','DEVELOPPEUR'] },
  btpHeuresEngins: { roles: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','RESP_MATERIEL','DEVELOPPEUR'] },
  btpReserves: { roles: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','COMPTABLE','DEVELOPPEUR'], defaults: { statut: 'ouverte' } },
  btpHabilitations: { roles: ['GERANT','QHSE_BTP','COND_TRAVAUX','CHEF_CHANTIER','DEVELOPPEUR'], defaults: { statut: 'valide' } },
  agroLotMatierePremieres: { roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'], defaults: { statut: 'planifié' } },
  agroLotProductions: { roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'], defaults: { statut: 'planifié' } },
  agroControles: { roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'] },
  agroCommandes: { roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'], defaults: { statut: 'enregistrée' } },
  agroLignesLivrees: { roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'] },
  agroFiches: { roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'] },
  agroReclamations: { roles: ['GERANT','COMMERCIAL','RESP_PRODUCTION','RESP_QUALITE','RESP_AGRO','RESP_STOCKAGE','RESP_TRACABILITE','DEVELOPPEUR'], defaults: { statut: 'ouverte' } },

  // ══ NOUVELLES ENTITÉS CDC BTP — Marché, Lot, Tâche ══
  btpMarches: {
    roles: ['GERANT','COMMERCIAL','ETUDES','COMPTABLE','ASSISTANTE','DEVELOPPEUR'],
    defaults: { statut: 'brouillon' },
    userField: 'created_by',
  },
  btpLots: {
    roles: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','ETUDES','DEVELOPPEUR'],
    defaults: { statut: 'planifie', avancement_pct: 0 },
    userField: 'created_by',
  },
  btpTaches: {
    roles: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','ETUDES','DEVELOPPEUR'],
    defaults: { statut: 'a_faire', avancement_pct: 0, priorite: 'normale' },
    userField: 'created_by',
  },

  agendaEvents: { roles: ['GERANT','ASSISTANTE','COMMERCIAL','DEVELOPPEUR'] },
  devisRecords: { roles: ['GERANT','ASSISTANTE','COMMERCIAL','DEVELOPPEUR'] },
  // Tables Assistante (auditées : absentes de l'API Vercel → modules cassés en prod)
  assistantMeetings: { roles: ['GERANT','ASSISTANTE','COMMERCIAL','DEVELOPPEUR'] },
  assistantTravels: { roles: ['GERANT','ASSISTANTE','COMMERCIAL','DEVELOPPEUR'] },
  assistantDocuments: { roles: ['GERANT','ASSISTANTE','COMMERCIAL','DEVELOPPEUR'] },
  assistantContacts: { roles: ['GERANT','ASSISTANTE','COMMERCIAL','DEVELOPPEUR'] },
  assistantTasks: { roles: ['GERANT','ASSISTANTE','COMMERCIAL','DEVELOPPEUR'] },
  // Tables Comptabilité (plan comptable, journaux, écritures, immobilisations)
  accountingAccounts: { roles: ['GERANT','COMPTABLE','DEVELOPPEUR'] },
  accountingJournals: { roles: ['GERANT','COMPTABLE','DEVELOPPEUR'] },
  accountingEntries: { roles: ['GERANT','COMPTABLE','DEVELOPPEUR'] },
  assets: { roles: ['GERANT','COMPTABLE','DEVELOPPEUR'] },
  // Tables Commercial (catalogue, propositions)
  catalogue: { roles: ['GERANT','COMMERCIAL','ASSISTANTE','DEVELOPPEUR'] },
  proposals: { roles: ['GERANT','COMMERCIAL','ASSISTANTE','DEVELOPPEUR'] },
};

const CONFIG_KEYS = [
  'companyName','companyAddress','companyId','companyEmail','companyPhone',
  'logoUrl','logoBase64','stampUrl','signatureUrl','bankingDetails','contractTerms',
  'clientTarget','targetAmountPerClient','rhSmig','rhCnssEmployerRate','rhCnssEmployeeRate',
  'rhCnssCeiling','rhRtsAbattement','rhRtsRate','tvaRate','delegations','activeModules','btpPermissions','docCounters',
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

      // Garde : protéger le compte admin principal
      const target = await db.getUserByUsername('admin');
      if (target && target.id === param1) {
        return res.status(403).json({ error: 'Impossible de supprimer le compte administrateur principal.' });
      }

      // Garde : impossible de supprimer le dernier gérant actif
      const allUsers = await db.getUsers();
      const targetUser = allUsers.find((u: any) => u.id === param1);
      if (targetUser?.role === 'GERANT') {
        const activeGerants = allUsers.filter((u: any) => u.role === 'GERANT' && u.is_active !== false);
        if (activeGerants.length <= 1) {
          return res.status(403).json({ error: 'Impossible de supprimer le dernier compte Gérant actif.' });
        }
      }

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

      // ══════════════════════════════════════════════════════════
      // B-16 : les tables BTP ne partent qu'aux rôles concernés ET
      // uniquement si le module BTP est actif — budgets, marges et
      // taux journaliers ne fuient plus vers tous les comptes.
      // ══════════════════════════════════════════════════════════
      const configMain = allData.config?.[0] || {};
      const btpActive = ((configMain as any).activeModules || []).includes('BTP');
      const BTP_TABLE_ROLES: Record<string, string[]> = {
        btpOffres: ['GERANT','COMMERCIAL','ETUDES','COMPTABLE','COND_TRAVAUX','DEVELOPPEUR'],
        btpMarches: ['GERANT','COMMERCIAL','ETUDES','COMPTABLE','ASSISTANTE','COND_TRAVAUX','DEVELOPPEUR'],
        btpChantiers: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','ETUDES','COMPTABLE','RH','DEVELOPPEUR'],
        btpEngins: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'],
        btpIncidents: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','DEVELOPPEUR'],
        btpJournaux: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','DEVELOPPEUR'],
        btpSituations: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','COMPTABLE','DEVELOPPEUR'],
        btpAffectations: ['GERANT','RH','COND_TRAVAUX','CHEF_CHANTIER','DEVELOPPEUR'],
        btpPointages: ['GERANT','RH','COND_TRAVAUX','CHEF_CHANTIER','DEVELOPPEUR'],
        btpArticles: ['GERANT','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'],
        btpBonCommandes: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','RESP_MATERIEL','MAGASINIER_BTP','DEVELOPPEUR'],
        btpMouvements: ['GERANT','RESP_MATERIEL','MAGASINIER_BTP','CHEF_CHANTIER','DEVELOPPEUR'],
        btpDocuments: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','QHSE_BTP','RESP_MATERIEL','MAGASINIER_BTP','ETUDES','COMPTABLE','RH','ASSISTANTE','DEVELOPPEUR'],
        btpAvenants: ['GERANT','COND_TRAVAUX','ETUDES','COMPTABLE','DEVELOPPEUR'],
        btpOs: ['GERANT','COND_TRAVAUX','QHSE_BTP','DEVELOPPEUR'],
        btpSousTraitances: ['GERANT','COND_TRAVAUX','COMPTABLE','DEVELOPPEUR'],
        btpFournisseurs: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','RESP_MATERIEL','MAGASINIER_BTP','COMPTABLE','DEVELOPPEUR'],
        btpCautionnements: ['GERANT','COMPTABLE','DEVELOPPEUR'],
        btpInspections: ['GERANT','QHSE_BTP','COND_TRAVAUX','CHEF_CHANTIER','DEVELOPPEUR'],
        btpPrixUnitaires: ['GERANT','ETUDES','COMPTABLE','DEVELOPPEUR'],
        btpHeuresEngins: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','RESP_MATERIEL','DEVELOPPEUR'],
        btpReserves: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','COMPTABLE','DEVELOPPEUR'],
        btpHabilitations: ['GERANT','QHSE_BTP','RH','COND_TRAVAUX','CHEF_CHANTIER','DEVELOPPEUR'],
        btpLots: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','ETUDES','DEVELOPPEUR'],
        btpTaches: ['GERANT','COND_TRAVAUX','CHEF_CHANTIER','ETUDES','DEVELOPPEUR'],
      };
      const btpRoleSeesChantiers = btpActive && BTP_TABLE_ROLES.btpChantiers.includes(role);
      if (btpActive) {
        for (const [t, allowed] of Object.entries(BTP_TABLE_ROLES)) {
          if (allowed.includes(role)) response[t] = allData[t] || [];
        }
        // Annuaire chantiers : suit les affectations (RH paie/validations) + QHSE (habilitations)
        if (BTP_TABLE_ROLES.btpAffectations.includes(role) || role === 'QHSE_BTP') {
          response.btpEmployeeDirectory = (allData.employees || []).map((e: any) => ({ id: e.id, firstName: e.firstName, lastName: e.lastName, position: e.position }));
        }
      }
      const agroTables = ['agroLotMatierePremieres','agroLotProductions','agroControles','agroCommandes','agroLignesLivrees','agroFiches','agroReclamations'];
      for (const t of agroTables) response[t] = allData[t] || [];

      // Tables Assistante + Comptabilité + Commercial (absentes avant l'audit)
      const extraTables = ['assistantMeetings','assistantTravels','assistantDocuments','assistantContacts','assistantTasks','accountingAccounts','accountingJournals','accountingEntries','assets','catalogue','proposals'];
      for (const t of extraTables) response[t] = allData[t] || [];
      // T29 : les documents GED confidentiels ne partent qu'aux rôles autorisés
      if (!['GERANT', 'ASSISTANTE', 'DEVELOPPEUR'].includes(role)) {
        response.assistantDocuments = (response.assistantDocuments || []).filter((d: any) => !d.isConfidential);
      }

      // btpChantierStats — agrégats P&L calculés côté serveur
      // (B-16 : réservés aux rôles qui voient les chantiers)
      if (btpRoleSeesChantiers) {
        const [chantiers, situations, pointages, affectations, mouvements, heuresEngins, engins, sousTraitances, expenses] = await Promise.all([
          db.getTable('btpChantiers'), db.getTable('btpSituations'),
          db.getTable('btpPointages'), db.getTable('btpAffectations'),
          db.getTable('btpMouvements'), db.getTable('btpHeuresEngins'),
          db.getTable('btpEngins'), db.getTable('btpSousTraitances'),
          db.getTable('expenses'),
        ]);
        const tauxMO: Record<string, number> = {};
        for (const a of affectations) tauxMO[`${a.employee_id}|${a.chantier_id}`] = Number(a.taux_journalier) || 0;
        const tauxEngin: Record<string, number> = {};
        for (const e of engins) tauxEngin[e.id] = Number(e.taux_horaire) || 0;

        response.btpChantierStats = chantiers.map((c: any) => {
          const s: any = {
            id: c.id, budget_engage: 0, montant_situations_facturees: 0,
            montant_situations_attente: 0, cout_mo_reel: 0, heures_pointees: 0,
            cout_engins: 0, cout_stock_sorti: 0, cout_sous_traitance: 0, retenue_bloquee: 0,
          };
          for (const e of expenses) {
            // B-9 : les dépenses REJETÉES et ANNULÉES sont exclues du budget engagé
            if ((e.chantier_id || '') !== c.id || ['REJECTED', 'CANCELLED'].includes(e.status)) continue;
            s.budget_engage += Number(e.amountTTC) || Number(e.amount) || 0;
          }
          for (const sit of situations) {
            if (sit.chantier_id !== c.id) continue;
            const m = Number(sit.montant_facture) || 0;
            if (sit.statut === 'facturée') {
              s.montant_situations_facturees += m;
              if (!sit.retenue_liberee) s.retenue_bloquee += Number(sit.retenue_amount) || 0;
            } else if (sit.statut === 'en_attente_facturation') {
              s.montant_situations_attente += m;
            }
          }
          for (const p of pointages) {
            if (p.chantier_id !== c.id) continue;
            const h = Number(p.heures) || 0;
            s.heures_pointees += h;
            s.cout_mo_reel += (h / 8) * (tauxMO[`${p.employee_id}|${c.id}`] || 0);
          }
          for (const m of mouvements) {
            if (m.chantier_id !== c.id || m.type !== 'sortie_chantier') continue;
            s.cout_stock_sorti += (Number(m.quantite) || 0) * (Number(m.cout_unitaire) || 0);
          }
          for (const h of heuresEngins) {
            if (h.chantier_id !== c.id) continue;
            s.cout_engins += (Number(h.heures) || 0) * (tauxEngin[h.engin_id] || 0);
          }
          for (const st of sousTraitances) {
            if (st.chantier_id !== c.id || st.statut === 'résiliée') continue;
            s.cout_sous_traitance += Number(st.montant) || 0;
          }
          return s;
        });
      }

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
      // B-8 : déduplication par clé — les notifications automatiques ne peuvent
      // plus être dupliquées, même lorsque plusieurs rôles sont connectés et
      // ne voient pas mutuellement leurs notifications existantes.
      if (body.dedupKey) {
        const allNotifs = await db.getTable('notifications');
        const dup = allNotifs.find((n: any) => n.dedupKey === body.dedupKey);
        if (dup) return res.json(dup);
      }
      const notif = { id: genId(), targetRole: body.targetRole, message: sanitize(body.message, 1000), type: body.type || 'INFO', dedupKey: body.dedupKey || undefined, isRead: false, createdAt: new Date().toISOString() };
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
    if (route === 'rh' && param1 === 'employees' && param2 && param3 === 'update') {
      const user = requireRole(req, res, ...RH_ROLES); if (!user) return;
      const updated = await db.update('employees', param2, sanitize(body));
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
    if (route === 'rh' && param1 === 'leaves' && param2 && param3 === 'update') {
      const user = requireRole(req, res, ...RH_ROLES); if (!user) return;
      const updated = await db.update('leave_requests', param2, sanitize(body));
      if (!updated) return res.status(404).json({ error: 'Demande non trouvée.' });
      return res.json(updated);
    }
    if (route === 'rh' && param1 === 'payslips' && method === 'POST' && !param2) {
      const user = requireRole(req, res, ...RH_ROLES); if (!user) return;
      // T25 : unicité employé + mois + année (anti-doublon serveur)
      const employeeId = (body as any)?.employeeId;
      const month = Number((body as any)?.month);
      const year = Number((body as any)?.year) || new Date().getFullYear();
      if (employeeId && month) {
        const existing = await db.getTable('payslips');
        const dup = existing.find((p: any) => p.employeeId === employeeId && Number(p.month) === month && Number(p.year) === year);
        if (dup) return res.status(409).json({ error: `Un bulletin existe déjà pour cet employé (${month}/${year}).` });
      }
      const ps = { id: genId(), ...sanitize(body), status: 'DRAFT', createdAt: new Date().toISOString() };
      await db.insert('payslips', ps);
      return res.status(201).json(ps);
    }
    if (route === 'rh' && param1 === 'payslips' && param2 && param3 === 'update') {
      const user = requireRole(req, res, ...RH_ROLES); if (!user) return;
      // T26 : machine à états stricte DRAFT → VALIDATED → PAID (pas de re-paiement)
      if ((body as any)?.status) {
        const current = await db.getTable('payslips');
        const target = current.find((p: any) => p.id === param2);
        const newStatus = (body as any).status;
        const ALLOWED: Record<string, string[]> = { DRAFT: ['VALIDATED'], VALIDATED: ['PAID'], PAID: [] };
        if (target && !(ALLOWED[target.status] || []).includes(newStatus)) {
          return res.status(400).json({ error: `Transition interdite : ${target.status} → ${newStatus}.` });
        }
      }
      const updated = await db.update('payslips', param2, sanitize(body));
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
      // T11 : montant invalide ou négatif refusé côté serveur
      const amountTTC = Number((body as any)?.amountTTC);
      if (!isFinite(amountTTC) || amountTTC <= 0) {
        return res.status(400).json({ error: 'Montant de dépense invalide : strictement positif requis.' });
      }
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
      if (updates.accountantPaymentConfirm !== undefined && !FINANCE.includes(user.role)) delete updates.accountantPaymentConfirm;

      // FIX 4bis : Protection du paymentPlan — impossible d'écraser un plan
      // qui contient déjà des paiements (reçus liés), sauf pour FINANCE
      if (updates.paymentPlan && !FINANCE.includes(user.role)) {
        const existing = await db.getItem('projects', param1);
        const hasPayments = existing?.paymentPlan?.installments?.some((i: any) => i.status === 'PAID');
        if (hasPayments) {
          return res.status(403).json({ error: 'Plan de paiement verrouillé : des échéances sont déjà réglées.' });
        }
      }
      // Protéger les documents aussi (anti-suppression de reçus)
      if (updates.documents && !FINANCE.includes(user.role)) {
        const existing = await db.getItem('projects', param1);
        const hasReceipts = existing?.documents?.some((d: any) => d.type === 'RECEIPT');
        if (hasReceipts && updates.documents.length < existing.documents.length) {
          return res.status(403).json({ error: 'Documents fiscaux protégés : suppression interdite.' });
        }
      }

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

      // ══════════════════════════════════════════════════════════
      // B-7 : la matrice de permissions BTP est appliquée CÔTÉ SERVEUR —
      // décocher une permission chez le Gérant prend effet réellement.
      // ══════════════════════════════════════════════════════════
      const CREATE_PERM_ACTIONS: Record<string, string> = {
        btpOffres: 'creer_affaire',
        btpChantiers: 'creer_chantier',
        btpAffectations: 'affecter_salairie',
        btpBonCommandes: 'creer_commande',
        btpJournaux: 'saisir_rapport',
      };
      const createPerm = CREATE_PERM_ACTIONS[param1];
      if (createPerm) {
        const cfg = await db.getItem('config', 'main') || {} as any;
        const perm = (cfg as any).btpPermissions?.[user.role]?.[createPerm];
        if (perm === false) {
          return res.status(403).json({ error: `Permission refusée par la matrice BTP : « ${createPerm} ».` });
        }
      }

      // B-10 : gardes pointage à la CRÉATION (elles n'existaient qu'à l'update)
      if (param1 === 'btpPointages') {
        const h = Number((body as any).heures);
        if (isNaN(h) || h < 0 || h > 12) {
          return res.status(400).json({ error: 'Heures invalides : entre 0 et 12 heures.' });
        }
        if ((body as any).chantier_id) {
          const ch = await db.getItem('btpChantiers', (body as any).chantier_id);
          if (ch && !['en_cours', 'planification'].includes(ch.statut)) {
            return res.status(400).json({ error: `Pointage impossible sur un chantier « ${ch.statut} ».` });
          }
        }
      }

      // B-11 : stock non négatif à la CRÉATION du mouvement
      if (param1 === 'btpMouvements') {
        const qte = Number((body as any).quantite);
        if (isNaN(qte) || qte <= 0) {
          return res.status(400).json({ error: 'Quantité doit être positive.' });
        }
        const articleId = String((body as any).article_id || '');
        const mvtType = String((body as any).type || '');
        const chantierIdMvt = String((body as any).chantier_id || '');
        const allMvts = await db.getTable('btpMouvements');
        const forArticle = allMvts.filter((m: any) => m.article_id === articleId);
        const stockDepot = forArticle.reduce((s: number, m: any) =>
          s + (m.type === 'entree' ? Number(m.quantite) || 0 : m.type === 'sortie_chantier' ? -(Number(m.quantite) || 0) : 0), 0);
        const stockChantier = forArticle
          .filter((m: any) => m.chantier_id === chantierIdMvt)
          .reduce((s: number, m: any) =>
            s + (m.type === 'sortie_chantier' ? Number(m.quantite) || 0 : m.type === 'retour' ? -(Number(m.quantite) || 0) : 0), 0);
        if (mvtType === 'sortie_chantier' && qte > stockDepot) {
          return res.status(400).json({ error: `Stock dépôt insuffisant : ${stockDepot} disponible(s), ${qte} demandé(s).` });
        }
        if (mvtType === 'retour' && qte > stockChantier) {
          return res.status(400).json({ error: `Stock chantier insuffisant : ${stockChantier} sur chantier, ${qte} retourné(s).` });
        }
      }

      const id = genId();
      const item = { id, ...(schema.defaults || {}), ...sanitize(body), created_by: user.id, createdAt: new Date().toISOString(), updated_at: new Date().toISOString() };
      // Tables à workflow STRICT : le statut initial est TOUJOURS forcé par le
      // serveur, quoi que dise le client (anti-contournement des transitions).
      // Ex: impossible de créer un BC directement en 'reçu', une offre en 'gagnée',
      // un avenant en 'validé' (sans passer par l'endpoint atomique de validation).
      // B-17 : btpMarches ajouté — impossible de créer un marché déjà 'signe'.
      const STRICT_STATUS_TABLES = ['btpOffres', 'btpChantiers', 'btpBonCommandes', 'btpAvenants', 'btpSituations', 'btpMarches'];
      if (schema.defaults?.statut !== undefined && STRICT_STATUS_TABLES.includes(param1)) {
        item.statut = schema.defaults.statut;
      }
      await db.insert(param1, item);
      return res.status(201).json(item);
    }
    if (route === 'crud' && param1 && param2 && param3 === 'update') {
      const schema = CRUD_TABLES[param1];
      if (!schema) return res.status(404).json({ error: 'Table inconnue.' });
      const user = requireRole(req, res, ...schema.roles); if (!user) return;
      let updates = { ...sanitize(body), updated_at: new Date().toISOString() };

      // B-7 (suite) : matrice de permissions BTP appliquée aux mises à jour clés
      const UPDATE_PERM_CHECKS: Array<[boolean, string]> = [
        [param1 === 'btpChantiers' && updates.statut === 'clôturé', 'cloturer_chantier'],
        [param1 === 'btpSituations' && updates.statut === 'en_attente_facturation', 'valider_situation'],
        [param1 === 'btpChantiers' && updates.budget_initial !== undefined, 'modifier_budget'],
      ];
      const permHit = UPDATE_PERM_CHECKS.find(([cond]) => cond);
      if (permHit) {
        const cfg = await db.getItem('config', 'main') || {} as any;
        const perm = (cfg as any).btpPermissions?.[user.role]?.[permHit[1]];
        if (perm === false) {
          return res.status(403).json({ error: `Permission refusée par la matrice BTP : « ${permHit[1]} ».` });
        }
      }

      // ══════════════════════════════════════════════════════════
      // P2-1 : GARBES SERVEUR BTP (jusqu'ici côté client uniquement)
      // ══════════════════════════════════════════════════════════

      // Pointages : heures 0-12 uniquement, chantier actif
      if (param1 === 'btpPointages' && updates.heures !== undefined) {
        const h = Number(updates.heures);
        if (isNaN(h) || h < 0 || h > 12) {
          return res.status(400).json({ error: 'Heures invalides : entre 0 et 12 heures.' });
        }
        if (updates.chantier_id) {
          const chantier = await db.getItem('btpChantiers', updates.chantier_id);
          if (chantier && !['en_cours', 'planification'].includes(chantier.statut)) {
            return res.status(400).json({ error: `Pointage impossible sur un chantier « ${chantier.statut} ».` });
          }
        }
      }

      // Engins : HS/maintenance non affectable, statut/matériau validés
      if (param1 === 'btpEngins') {
        const existing = await db.getItem('btpEngins', param2);
        if (existing && updates.chantier_affecte_id && ['hors_service', 'en_maintenance'].includes(existing.statut)) {
          return res.status(400).json({ error: `Impossible d'affecter un engin ${existing.statut.replace(/_/g, ' ')}.` });
        }
        if (existing && updates.compteur_horaire !== undefined && Number(updates.compteur_horaire) < 0) {
          return res.status(400).json({ error: 'Compteur horaire négatif interdit.' });
        }
        if (existing && updates.taux_horaire !== undefined && Number(updates.taux_horaire) < 0) {
          return res.status(400).json({ error: 'Taux horaire négatif interdit.' });
        }
      }

      // Offres : montant verrouillé après dépôt (seuls ETUDES/GERANT)
      if (param1 === 'btpOffres' && updates.montant_estime !== undefined) {
        const existing = await db.getItem('btpOffres', param2);
        if (existing && ['déposée', 'gagnée', 'perdue'].includes(existing.statut)
            && !['ETUDES', 'GERANT'].includes(user.role)) {
          delete updates.montant_estime;
        }
      }

      // Mouvements stock : anti-négatif (sortie ≤ stock dépôt, retour ≤ stock chantier)
      if (param1 === 'btpMouvements' && updates.quantite !== undefined && Number(updates.quantite) <= 0) {
        return res.status(400).json({ error: 'Quantité doit être positive.' });
      }

      // Chantiers : validation RH/Matériel protégée par endpoint dédié
      if (param1 === 'btpChantiers') {
        const existingCh = await db.getItem('btpChantiers', param2);
        if (updates.rh_validation === true && !['GERANT', 'RH'].includes(user.role)) {
          delete updates.rh_validation;
        }
        if (updates.materiel_validation === true && !['GERANT', 'RESP_MATERIEL'].includes(user.role)) {
          delete updates.materiel_validation;
        }
        // Budget non négatif
        if (updates.budget_initial !== undefined && Number(updates.budget_initial) < 0) {
          return res.status(400).json({ error: 'Budget négatif interdit.' });
        }
        // B-18 : le taux de RG ne se modifie que par le Gérant (trace avenant requise)
        if (updates.retenue_garantie_pct !== undefined && existingCh && updates.retenue_garantie_pct !== existingCh.retenue_garantie_pct && user.role !== 'GERANT') {
          return res.status(403).json({ error: 'Le taux de retenue de garantie ne peut être modifié que par le Gérant (via avenant).' });
        }
        // B-2 : démarrage — la double validation RH + Matériel est désormais
        // exigée CÔTÉ SERVEUR (avant : contournable par appel API direct).
        if (updates.statut === 'en_cours' && existingCh) {
          if (existingCh.statut === 'planification' && !(existingCh.rh_validation && existingCh.materiel_validation)) {
            return res.status(400).json({ error: 'Démarrage impossible : validations RH et Matériel requises.' });
          }
          if (existingCh.statut === 'suspendu' && !(existingCh.qhse_unlock && existingCh.dg_unlock)) {
            return res.status(400).json({ error: 'Reprise impossible : double validation QHSE + Direction requise.' });
          }
        }
        // B-12 : pas de réception définitive avec des réserves ouvertes
        // (le PV définitif atteste que toutes les réserves sont levées).
        if (updates.statut === 'réception_définitive') {
          const reserves = await db.getTable('btpReserves');
          const openReserves = reserves.filter((r: any) =>
            r.chantier_id === param2 && !['levée', 'levee', 'annulée', 'annulee'].includes(r.statut));
          if (openReserves.length > 0) {
            return res.status(400).json({ error: `Réception définitive impossible : ${openReserves.length} réserve(s) non levée(s).` });
          }
        }
      }

      // Marchés : montant non négatif
      if (param1 === 'btpMarches' && updates.montant_ht !== undefined && Number(updates.montant_ht) < 0) {
        return res.status(400).json({ error: 'Montant HT négatif interdit.' });
      }
      // B-17 : la signature d'un marché est réservée au GÉRANT, côté serveur
      // (avant : n'importe quel rôle de la table pouvait poster statut:'signe').
      if (param1 === 'btpMarches' && updates.statut === 'signe' && user.role !== 'GERANT') {
        return res.status(403).json({ error: 'Seul le Gérant peut signer un marché.' });
      }

      // B-11 : stock non négatif — la garde est désormais côté SERVEUR
      // (sortie ≤ stock dépôt ; retour ≤ stock chantier).
      if (param1 === 'btpMouvements' && (updates.quantite !== undefined || updates.type !== undefined)) {
        const qte = Number(updates.quantite);
        if (isNaN(qte) || qte <= 0) {
          return res.status(400).json({ error: 'Quantité doit être positive.' });
        }
        const articleId = (updates.article_id || '') as string;
        const mvtType = (updates.type || '') as string;
        const chantierIdMvt = (updates.chantier_id || '') as string;
        const allMvts = await db.getTable('btpMouvements');
        const forArticle = allMvts.filter((m: any) => m.article_id === articleId);
        const stockDepot = forArticle.reduce((s: number, m: any) =>
          s + (m.type === 'entree' ? Number(m.quantite) || 0 : m.type === 'sortie_chantier' ? -(Number(m.quantite) || 0) : 0), 0);
        const stockChantier = forArticle
          .filter((m: any) => m.chantier_id === chantierIdMvt)
          .reduce((s: number, m: any) =>
            s + (m.type === 'sortie_chantier' ? Number(m.quantite) || 0 : m.type === 'retour' ? -(Number(m.quantite) || 0) : 0), 0);
        if (mvtType === 'sortie_chantier' && qte > stockDepot) {
          return res.status(400).json({ error: `Stock dépôt insuffisant : ${stockDepot} disponible(s), ${qte} demandé(s).` });
        }
        if (mvtType === 'retour' && qte > stockChantier) {
          return res.status(400).json({ error: `Stock chantier insuffisant : ${stockChantier} sur chantier, ${qte} retourné(s).` });
        }
      }

      // Lots : budget non négatif, avancement 0-100
      if (param1 === 'btpLots') {
        if (updates.budget !== undefined && Number(updates.budget) < 0) {
          return res.status(400).json({ error: 'Budget de lot négatif interdit.' });
        }
        if (updates.avancement_pct !== undefined) {
          const pct = Number(updates.avancement_pct);
          if (isNaN(pct) || pct < 0 || pct > 100) {
            return res.status(400).json({ error: 'Avancement doit être entre 0 et 100%.' });
          }
        }
      }

      // Tâches : avancement 0-100
      if (param1 === 'btpTaches' && updates.avancement_pct !== undefined) {
        const pct = Number(updates.avancement_pct);
        if (isNaN(pct) || pct < 0 || pct > 100) {
          return res.status(400).json({ error: 'Avancement doit être entre 0 et 100%.' });
        }
      }

      // Habilitations : date_expiration > date_obtention
      if (param1 === 'btpHabilitations' && updates.date_expiration && updates.date_obtention) {
        if (new Date(updates.date_expiration) <= new Date(updates.date_obtention)) {
          return res.status(400).json({ error: "La date d'expiration doit être postérieure à la date d'obtention." });
        }
      }

      // ══════════════════════════════════════════════════════════
      // P2-3 : TRANSITIONS DE STATUT VALIDÉES (machine d'état serveur)
      // ══════════════════════════════════════════════════════════
      const VALID_TRANSITIONS: Record<string, Record<string, string[]>> = {
        btpIncidents: {
          'déclaré': ['qualifié', 'sécurisé', 'clôturé'],
          'qualifié': ['sécurisé', 'action_en_cours', 'clôturé'],
          'sécurisé': ['action_en_cours', 'en_attente', 'clôturé'],
          'action_en_cours': ['en_attente', 'résolu', 'clôturé'],
          'en_attente': ['action_en_cours', 'résolu', 'clôturé'],
          'résolu': ['clôturé'],
          'clôturé': [],
        },
        btpSituations: {
          'brouillon': ['en_attente_facturation'],
          'en_attente_facturation': ['facturée', 'annulée'],
          'facturée': [],
          'annulée': [],
        },
        btpReserves: {
          'ouverte': ['affectée', 'annulée', 'en_cours', 'levee'],
          'en_cours': ['levee', 'annulee', 'en_correction', 'levée'],
          'affectée': ['en_correction', 'annulée', 'levee'],
          'en_correction': ['en_verification', 'annulée', 'levee'],
          'en_verification': ['levée', 'contestée', 'levee'],
          'levée': [],
          'levee': [],
          'contestée': ['en_correction', 'annulée'],
          'annulée': [],
          'annulee': [],
        },
        btpMarches: {
          'brouillon': ['en_validation', 'signe', 'cloture'],
          'en_validation': ['signe', 'brouillon'],
          'signe': ['os_recu', 'resilie'],
          'os_recu': ['en_cours', 'suspendu', 'resilie'],
          'en_cours': ['suspendu', 'acheve'],
          'suspendu': ['en_cours', 'resilie'],
          'acheve': ['cloture'],
          'resilie': ['cloture'],
          'cloture': [],
        },
        // ════════════════════════════════════════════════════════
        // B-2 : les tables workflows critiques sont désormais sous
        // machine à états serveur (elles ne l'étaient qu'en UI).
        // ════════════════════════════════════════════════════════
        btpChantiers: {
          'planification': ['en_cours', 'clôturé'],
          'en_cours': ['suspendu', 'réception_provisoire', 'clôturé'],
          'suspendu': ['en_cours', 'réception_provisoire', 'clôturé'],
          'réception_provisoire': ['en_cours', 'réception_définitive', 'clôturé'],
          'réception_définitive': ['clôturé'],
          'clôturé': [],
        },
        btpOffres: {
          'repérée': ['en_chiffrage'],
          'en_chiffrage': ['en_validation_financiere'],
          'en_validation_financiere': ['en_validation_dg', 'en_chiffrage'],
          'en_validation_dg': ['déposée'],
          'déposée': ['gagnée', 'perdue'],
          'gagnée': [], 'perdue': [], 'retirée': [],
        },
        btpBonCommandes: {
          'brouillon': ['soumis'],
          'soumis': ['reçu', 'brouillon'],
          'reçu': [],
        },
        btpAvenants: {
          'brouillon': ['validé', 'rejeté'],
          'validé': [], 'rejeté': [],
        },
      };

      if (updates.statut !== undefined && VALID_TRANSITIONS[param1]) {
        const existing = await db.getItem(param1, param2);
        const currentStatus = existing?.statut;
        const allowed = VALID_TRANSITIONS[param1][currentStatus] || [];
        if (currentStatus && !allowed.includes(updates.statut)) {
          return res.status(400).json({
            error: `Transition invalide : « ${currentStatus} » → « ${updates.statut} ». Transitions autorisées : ${allowed.join(', ') || 'aucune'}.`
          });
        }
      }

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
    // BTP — OPÉRATIONS ATOMIQUES (multi-tables, transaction logique)
    // ============================================================

    // --- Facturer une situation → CREDIT trésorerie + notif ---
    if (route === 'btp' && param1 === 'situations' && param3 === 'facturer' && method === 'POST') {
      const user = requireRole(req, res, ...FINANCE); if (!user) return;
      const sitId = param2;
      const accountId = body.accountId;
      if (!accountId) return res.status(400).json({ error: 'Compte de trésorerie obligatoire.' });

      const sit = await db.getItem('btpSituations', sitId);
      if (!sit) return res.status(404).json({ error: 'Situation introuvable.' });
      if (sit.statut !== 'en_attente_facturation') {
        return res.status(409).json({ error: `Situation non facturable (statut: ${sit.statut}).` });
      }

      const montant = Number(sit.montant_facture) || 0;
      if (montant <= 0) return res.status(400).json({ error: 'Montant invalide.' });

      const accounts = await db.getTable('treasury_accounts');
      const account = accounts.find((a: any) => a.id === accountId);
      if (!account) return res.status(400).json({ error: 'Compte introuvable.' });

      const chantiers = await db.getTable('btpChantiers');
      const chantier = chantiers.find((c: any) => c.id === sit.chantier_id);
      const chantierNom = chantier?.nom || 'chantier inconnu';

      // Garde : la retenue ne peut pas dépasser le montant (net >= 0)
      const retenue = Number(sit.retenue_amount) || 0;
      if (retenue > montant) {
        return res.status(400).json({ error: `Retenue de garantie (${retenue.toLocaleString('fr-FR')} GNF) supérieure au montant (${montant.toLocaleString('fr-FR')} GNF).` });
      }

      const net = montant - retenue;
      const tva = Number(sit.tva_amount) || 0;
      const ht = Number(sit.montant_ht) || montant;

      // 1. Situation → facturée
      await db.update('btpSituations', sitId, {
        statut: 'facturée',
        date_facturation: new Date().toISOString(),
      });

      // 2. Transaction CREDIT du net
      const tx = {
        id: genId(), accountId, toAccountId: null, type: 'CREDIT', amount: net,
        date: new Date().toISOString(), referenceId: sitId, category: 'SITUATION_TRAVAUX',
        description: `Situation ${sit.numero || sit.periode} — Chantier: ${chantierNom}${tva > 0 ? ` (HT ${ht} + TVA ${tva})` : ''}${retenue > 0 ? ` — RG ${retenue}` : ''}`,
        isReconciled: false,
      };
      await db.insert('transactions', tx);

      // 3. Crédit du solde
      await db.update('treasury_accounts', accountId, { balance: (account.balance || 0) + net });

      // ══════════════════════════════════════════════════════════
      // 3bis. B-1 : ÉCRITURE SYSCOHADA EXACTE, générée côté serveur —
      //   Débit 52x (trésorerie) = NET encaissé
      //   Débit 411 (créances clients) = RG bloquée chez le maître d'ouvrage
      //   Crédit 70x (ventes) = HT RÉEL de la situation
      //   Crédit 443 (TVA collectée) = TVA RÉELLE (0 en autoliquidation)
      // Avant : écriture basée sur le net avec TVA rétrocalculée fausse.
      // ══════════════════════════════════════════════════════════
      let accountingEntry: any = null;
      let accountingWarning: string | undefined;
      {
        const [accounts, journals] = await Promise.all([db.getTable('accountingAccounts'), db.getTable('accountingJournals')]);
        const findAcc = (prefixes: string[]) => {
          for (const pfx of prefixes) {
            const acc = accounts.find((a: any) => a.accountNumber && a.accountNumber.startsWith(pfx));
            if (acc) return acc;
          }
          return null;
        };
        const compteTreso = findAcc(['52', '57']);
        const compteVente = findAcc(['70']);
        const compteTVA = findAcc(['443']);
        const compteClient = findAcc(['411']);
        const journal = journals.find((j: any) => j.code === 'VT') || journals[0];
        const required: string[] = [];
        if (!compteTreso) required.push('52x trésorerie');
        if (!compteVente) required.push('70x ventes');
        if (retenue > 0 && !compteClient) required.push('411 clients');
        if (tva > 0 && !compteTVA) required.push('443 TVA collectée');
        if (!journal) required.push('journal VT');
        if (required.length === 0) {
          const libelle = `Situation BTP ${sit.numero || sit.periode} — ${chantierNom}`;
          const lines: any[] = [
            { accountId: compteTreso.id, debit: net, credit: 0, label: libelle },
            ...(retenue > 0 ? [{ accountId: compteClient.id, debit: retenue, credit: 0, label: `RG bloquée — ${libelle}` }] : []),
            { accountId: compteVente.id, debit: 0, credit: ht, label: 'HT - ' + libelle },
            ...(tva > 0 ? [{ accountId: compteTVA.id, debit: 0, credit: tva, label: 'TVA - ' + libelle }] : []),
          ];
          accountingEntry = {
            id: genId(), journalId: journal.id, date: new Date().toISOString(),
            reference: 'AUTO-SIT', description: libelle, status: 'VALIDATED',
            validatedAt: new Date().toISOString(),
            lines: lines.filter((l: any) => l.debit > 0 || l.credit > 0),
            createdAt: new Date().toISOString(),
          };
          await db.insert('accountingEntries', accountingEntry);
        } else {
          accountingWarning = `Écriture non générée : plan comptable incomplet (${required.join(', ')}).`;
        }
      }

      // 4. Notification
      await db.insert('notifications', {
        id: genId(), targetRole: 'GERANT',
        message: `Situation facturée: ${net.toLocaleString('fr-FR')} GNF encaissés sur « ${chantierNom} » (${sit.periode})${retenue > 0 ? ` — RG bloquée: ${retenue.toLocaleString('fr-FR')} GNF` : ''}.`,
        type: 'SUCCESS', isRead: false, createdAt: new Date().toISOString(),
      });

      const updatedSit = await db.getItem('btpSituations', sitId);
      return res.status(201).json({ success: true, situation: updatedSit, transaction: tx, accountingEntry, accountingWarning, chantier_nom: chantierNom, retenue, net });
    }

    // --- Valider un avenant → applique budget ± montant + délai + jours ---
    if (route === 'btp' && param1 === 'avenants' && param3 === 'valider' && method === 'POST') {
      const user = requireRole(req, res, 'GERANT'); if (!user) return;
      const avId = param2;

      const av = await db.getItem('btpAvenants', avId);
      if (!av) return res.status(404).json({ error: 'Avenant introuvable.' });
      if (av.statut !== 'brouillon') return res.status(409).json({ error: `Avenant déjà traité (${av.statut}).` });

      const chantier = await db.getItem('btpChantiers', av.chantier_id);
      if (!chantier) return res.status(404).json({ error: 'Chantier introuvable.' });
      // Garde : pas d'avenant sur un chantier clôturé ou en réception définitive
      if (['clôturé', 'réception_définitive'].includes(chantier.statut)) {
        return res.status(409).json({ error: `Impossible de valider un avenant sur un chantier « ${chantier.statut} ».` });
      }

      const montant = Number(av.montant) || 0;
      const jours = Number(av.jours_delai) || 0;
      const type = av.type || 'montant';
      const chantierUpdates: any = {};

      // 'penalite' : le montant est TOUJOURS déduit du budget (négatif forcé)
      if (type === 'penalite' && montant !== 0) {
        chantierUpdates.budget_initial = (chantier.budget_initial || 0) - Math.abs(montant);
      }
      // 'montant' et 'montant_delai' : appliquent le signe tel quel
      else if (['montant', 'montant_delai'].includes(type) && montant !== 0) {
        chantierUpdates.budget_initial = (chantier.budget_initial || 0) + montant;
      }
      // 'delai' et 'montant_delai' : repoussent la date de fin
      if (['delai', 'montant_delai'].includes(type) && jours > 0) {
        const fin = chantier.date_fin_prevue ? new Date(chantier.date_fin_prevue) : new Date();
        fin.setDate(fin.getDate() + jours);
        chantierUpdates.date_fin_prevue = fin.toISOString().split('T')[0];
      }
      // Garde : budget ne peut pas devenir négatif
      if (chantierUpdates.budget_initial !== undefined && chantierUpdates.budget_initial < 0) {
        return res.status(400).json({ error: `Budget insuffisant : ${(chantier.budget_initial || 0).toLocaleString('fr-FR')} - ${Math.abs(montant).toLocaleString('fr-FR')} GNF < 0.` });
      }

      await db.update('btpChantiers', chantier.id, chantierUpdates);
      await db.update('btpAvenants', avId, { statut: 'validé' });

      // ══════════════════════════════════════════════════════════
      // B-13 : le MARCHÉ d'origine suit l'avenant — le montant
      // contractuel (HT/TTC) et la date de fin ne restaient plus
      // figés pendant que le chantier était révisé.
      // ══════════════════════════════════════════════════════════
      if (chantier.marche_id) {
        const marche = await db.getItem('btpMarches', chantier.marche_id);
        if (marche && marche.statut !== 'cloture') {
          const marcheUpdates: any = {};
          if (chantierUpdates.budget_initial !== undefined) {
            // Le budget chantier est TTC ; le marché est tenu en HT.
            const deltaTTC = chantierUpdates.budget_initial - (chantier.budget_initial || 0);
            const tvaRateM = (Number(marche.tva_rate) || 18) / 100;
            const deltaHT = Math.round(deltaTTC / (1 + tvaRateM));
            marcheUpdates.montant_ht = Math.max(0, (Number(marche.montant_ht) || 0) + deltaHT);
            marcheUpdates.montant_ttc = Math.round(marcheUpdates.montant_ht * (1 + tvaRateM));
          }
          if (chantierUpdates.date_fin_prevue !== undefined) {
            marcheUpdates.date_fin_prevue = chantierUpdates.date_fin_prevue;
          }
          if (Object.keys(marcheUpdates).length > 0) {
            await db.update('btpMarches', marche.id, marcheUpdates);
          }
        }
      }

      await db.insert('notifications', {
        id: genId(), targetRole: 'COND_TRAVAUX',
        message: `Avenant ${avId} validé sur « ${chantier.nom} »${montant !== 0 ? ` : budget ${montant > 0 ? '+' : ''}${montant.toLocaleString('fr-FR')} GNF` : ''}${jours > 0 ? ` délai +${jours}j` : ''}.`,
        type: 'INFO', isRead: false, createdAt: new Date().toISOString(),
      });

      const updatedChantier = await db.getItem('btpChantiers', chantier.id);
      const updatedAv = await db.getItem('btpAvenants', avId);
      return res.status(201).json({ success: true, avenant: updatedAv, chantier: updatedChantier });
    }

    // --- Libérer les retenues de garantie (après réception définitive) ---
    if (route === 'btp' && param1 === 'chantiers' && param3 === 'liberer-retenues' && method === 'POST') {
      const user = requireRole(req, res, ...FINANCE); if (!user) return;
      const chantierId = param2;
      const accountId = body.accountId;
      if (!accountId) return res.status(400).json({ error: 'Compte obligatoire.' });

      const chantier = await db.getItem('btpChantiers', chantierId);
      if (!chantier) return res.status(404).json({ error: 'Chantier introuvable.' });
      if (!['réception_définitive', 'clôturé'].includes(chantier.statut)) {
        return res.status(409).json({ error: "Les retenues ne se libèrent qu'après la réception définitive." });
      }

      const accounts = await db.getTable('treasury_accounts');
      const account = accounts.find((a: any) => a.id === accountId);
      if (!account) return res.status(400).json({ error: 'Compte introuvable.' });

      const situations = await db.getTable('btpSituations');
      let total = 0;
      let count = 0;
      for (const sit of situations) {
        if (sit.chantier_id !== chantierId || sit.statut !== 'facturée' || sit.retenue_liberee) continue;
        total += Number(sit.retenue_amount) || 0;
        await db.update('btpSituations', sit.id, { retenue_liberee: true });
        count++;
      }
      if (count === 0 || total <= 0) return res.status(409).json({ error: 'Aucune retenue à libérer.' });

      const tx = {
        id: genId(), accountId, toAccountId: null, type: 'CREDIT', amount: total,
        date: new Date().toISOString(), referenceId: chantierId, category: 'SITUATION_TRAVAUX',
        description: `Libération RG (${count} situations) — Chantier: ${chantier.nom}`,
        isReconciled: false,
      };
      await db.insert('transactions', tx);
      await db.update('treasury_accounts', accountId, { balance: (account.balance || 0) + total });

      // B-1 (suite) : écriture de libération de la RG — la créance client
      // (411) est soldée par l'encaissement trésorerie (52x).
      let accountingEntry: any = null;
      let accountingWarning: string | undefined;
      {
        const [accounts, journals] = await Promise.all([db.getTable('accountingAccounts'), db.getTable('accountingJournals')]);
        const findAcc = (prefixes: string[]) => {
          for (const pfx of prefixes) {
            const acc = accounts.find((a: any) => a.accountNumber && a.accountNumber.startsWith(pfx));
            if (acc) return acc;
          }
          return null;
        };
        const compteTreso = findAcc(['52', '57']);
        const compteClient = findAcc(['411']);
        const journal = journals.find((j: any) => j.code === 'VT') || journals[0];
        if (compteTreso && compteClient && journal) {
          const libelle = `Libération RG — ${chantier.nom}`;
          accountingEntry = {
            id: genId(), journalId: journal.id, date: new Date().toISOString(),
            reference: 'AUTO-RG', description: libelle, status: 'VALIDATED',
            validatedAt: new Date().toISOString(),
            lines: [
              { accountId: compteTreso.id, debit: total, credit: 0, label: libelle },
              { accountId: compteClient.id, debit: 0, credit: total, label: libelle },
            ],
            createdAt: new Date().toISOString(),
          };
          await db.insert('accountingEntries', accountingEntry);
        } else {
          accountingWarning = 'Écriture de libération non générée : plan comptable incomplet (52x, 411 ou journal VT).';
        }
      }

      await db.insert('notifications', {
        id: genId(), targetRole: 'GERANT',
        message: `Retenues libérées: ${total.toLocaleString('fr-FR')} GNF encaissés sur « ${chantier.nom} ».`,
        type: 'SUCCESS', isRead: false, createdAt: new Date().toISOString(),
      });

      return res.status(201).json({ success: true, transaction: tx, accountingEntry, accountingWarning, total_libere: total, situations: count });
    }

    // --- Réceptionner un bon de commande → stock + dépense ---
    if (route === 'btp' && param1 === 'bons' && param3 === 'recevoir' && method === 'POST') {
      const user = requireRole(req, res, 'GERANT', 'RESP_MATERIEL', 'MAGASINIER_BTP'); if (!user) return;
      const bcId = param2;

      const bc = await db.getItem('btpBonCommandes', bcId);
      if (!bc) return res.status(404).json({ error: 'BC introuvable.' });
      if (bc.statut !== 'soumis') return res.status(409).json({ error: `BC non réceptionnable (${bc.statut}).` });

      const lignes = bc.lignes || [];
      if (!lignes.length) return res.status(400).json({ error: 'BC sans lignes.' });

      let totalHT = Number(bc.total_ht) || 0;
      if (totalHT <= 0) {
        totalHT = lignes.reduce((s: number, l: any) => s + (Number(l.quantite) || 0) * (Number(l.pu) || 0), 0);
      }
      // TVA depuis la config entreprise (défaut 18% Guinée)
      const config = await db.getItem('config', 'main') || {};
      const tvaRate = (Number(config.tvaRate) || 18) / 100;
      const tva = Math.round(totalHT * tvaRate * 100) / 100;
      const ttc = totalHT + tva;

      const chantiers = await db.getTable('btpChantiers');
      const chantier = chantiers.find((c: any) => c.id === bc.chantier_id);
      const chantierNom = chantier?.nom || '';

      // 1. Mouvements d'entrée en stock dépôt
      const mouvements = [];
      for (const l of lignes) {
        const mvt = {
          id: genId(), article_id: l.article_id || '', type: 'entree',
          quantite: Number(l.quantite) || 0, cout_unitaire: 0,
          chantier_id: '', bc_id: bcId,
          motif: `Réception BC ${bcId.slice(0, 8)}${chantierNom ? ` — ${chantierNom}` : ''}`,
          created_by: user.id, createdAt: new Date().toISOString(),
        };
        await db.insert('btpMouvements', mvt);
        mouvements.push(mvt);
      }

      // 2. BC → reçu
      await db.update('btpBonCommandes', bcId, { statut: 'reçu', date_reception: new Date().toISOString() });

      // 3. Dépense noyau auto (TVA 18%, rattachée chantier)
      const expense = {
        id: genId(), category: 'ACHAT_MARCHANDISE',
        amountHT: totalHT, tvaAmount: tva, amountTTC: ttc,
        description: `BC ${bcId.slice(0, 8)} — ${bc.fournisseur || 'fournisseur'}${chantierNom ? ` (Chantier: ${chantierNom})` : ''}`,
        date: new Date().toISOString().split('T')[0], status: 'PENDING',
        chantier_id: bc.chantier_id || '', createdAt: new Date().toISOString(),
      };
      await db.insert('expenses', expense);

      // 4. Notification
      await db.insert('notifications', {
        id: genId(), targetRole: 'COMPTABLE',
        message: `BC réceptionné (${ttc.toLocaleString('fr-FR')} GNF TTC): dépense en attente${chantierNom ? ` — Chantier ${chantierNom}` : ''}.`,
        type: 'INFO', isRead: false, createdAt: new Date().toISOString(),
      });

      return res.status(201).json({ success: true, mouvements, expense, bon_commande: { ...bc, statut: 'reçu' } });
    }

    // ============================================================
    // BTP — CHANTIER STATS (agrégats P&L calculés serveur)
    // ============================================================
    if (route === 'btp' && param1 === 'stats' && method === 'GET') {
      const user = requireAuth(req, res); if (!user) return;
      const [chantiers, situations, pointages, affectations, mouvements, heuresEngins, engins, sousTraitances, expenses] = await Promise.all([
        db.getTable('btpChantiers'), db.getTable('btpSituations'),
        db.getTable('btpPointages'), db.getTable('btpAffectations'),
        db.getTable('btpMouvements'), db.getTable('btpHeuresEngins'),
        db.getTable('btpEngins'), db.getTable('btpSousTraitances'),
        db.getTable('expenses'),
      ]);

      // Taux par (employé, chantier) et par engin
      const tauxMO: Record<string, number> = {};
      for (const a of affectations) {
        tauxMO[`${a.employee_id}|${a.chantier_id}`] = Number(a.taux_journalier) || 0;
      }
      const tauxEngin: Record<string, number> = {};
      for (const e of engins) tauxEngin[e.id] = Number(e.taux_horaire) || 0;

      const stats = chantiers.map((c: any) => {
        const s: any = {
          id: c.id, budget_engage: 0, montant_situations_facturees: 0,
          montant_situations_attente: 0, cout_mo_reel: 0, heures_pointees: 0,
          cout_engins: 0, cout_stock_sorti: 0, cout_sous_traitance: 0, retenue_bloquee: 0,
        };

        for (const e of expenses) {
          if ((e.chantier_id || '') !== c.id || ['REJECTED', 'CANCELLED'].includes(e.status)) continue;
          s.budget_engage += Number(e.amountTTC) || Number(e.amount) || 0;
        }
        for (const sit of situations) {
          if (sit.chantier_id !== c.id) continue;
          const m = Number(sit.montant_facture) || 0;
          if (sit.statut === 'facturée') {
            s.montant_situations_facturees += m;
            if (!sit.retenue_liberee) s.retenue_bloquee += Number(sit.retenue_amount) || 0;
          } else if (sit.statut === 'en_attente_facturation') {
            s.montant_situations_attente += m;
          }
        }
        for (const p of pointages) {
          if (p.chantier_id !== c.id) continue;
          const h = Number(p.heures) || 0;
          s.heures_pointees += h;
          s.cout_mo_reel += (h / 8) * (tauxMO[`${p.employee_id}|${c.id}`] || 0);
        }
        for (const m of mouvements) {
          if (m.chantier_id !== c.id || m.type !== 'sortie_chantier') continue;
          s.cout_stock_sorti += (Number(m.quantite) || 0) * (Number(m.cout_unitaire) || 0);
        }
        for (const h of heuresEngins) {
          if (h.chantier_id !== c.id) continue;
          s.cout_engins += (Number(h.heures) || 0) * (tauxEngin[h.engin_id] || 0);
        }
        for (const st of sousTraitances) {
          if (st.chantier_id !== c.id || st.statut === 'résiliée') continue;
          s.cout_sous_traitance += Number(st.montant) || 0;
        }
        return s;
      });

      return res.json(stats);
    }

    // ============================================================
    // BTP — VALIDATION RH (endpoint dédié, champ unique)
    // ============================================================
    if (route === 'btp' && param1 === 'chantiers' && param3 === 'valider-rh' && method === 'POST') {
      const user = requireRole(req, res, 'GERANT', 'RH'); if (!user) return;
      const chantierId = param2;
      const chantier = await db.getItem('btpChantiers', chantierId);
      if (!chantier) return res.status(404).json({ error: 'Chantier introuvable.' });
      await db.update('btpChantiers', chantierId, { rh_validation: true });
      await db.insert('notifications', {
        id: genId(), targetRole: 'COND_TRAVAUX',
        message: `Validation RH accordée pour « ${chantier.nom} » — le chantier peut être démarré (sous réserve de la validation Matériel).`,
        type: 'SUCCESS', isRead: false, createdAt: new Date().toISOString(),
      });
      return res.json({ success: true });
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
