const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', '..', 'db.json');
const outputPath = path.join(__dirname, '..', '..', 'deploy', 'public_html', 'hostinger_database.sql');
const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');

if (!fs.existsSync(jsonPath)) {
    console.error(`db.json introuvable: ${jsonPath}`);
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let sql = "-- Script SQL généré pour Hostinger\n\n";

if (fs.existsSync(schemaPath)) {
    sql += fs.readFileSync(schemaPath, 'utf8') + "\n\n";
} else {
    console.error("schema.sql introuvable.");
    process.exit(1);
}

sql += "-- ==========================================\n";
sql += "-- INSERTION DES DONNEES MIGREES\n";
sql += "-- ==========================================\n\n";

function escape(value) {
    if (value === null || value === undefined) return 'NULL';
    let valStr = String(value);
    valStr = valStr.replace(/'/g, "''");
    return "'" + valStr + "'";
}

// 1. Users
if (data.users && Array.isArray(data.users)) {
    sql += "-- Table: users\n";
    for (const u of data.users) {
        const id = escape(u.id);
        const username = escape(u.username);
        const passwordHash = escape(u.passwordHash);
        const plainPassword = escape(u.plainPassword || '');
        const role = escape(u.role);
        const firstName = escape(u.firstName || '');
        const lastName = escape(u.lastName || '');
        const createdAt = escape(u.createdAt || new Date().toISOString().slice(0, 19).replace('T', ' '));
        
        sql += `INSERT IGNORE INTO users (id, username, password_hash, plain_password, role, first_name, last_name, created_at) VALUES (${id}, ${username}, ${passwordHash}, ${plainPassword}, ${role}, ${firstName}, ${lastName}, ${createdAt});\n`;
    }
    sql += "\n";
}

// 2. Projects
if (data.projects && Array.isArray(data.projects)) {
    sql += "-- Table: projects\n";
    for (const p of data.projects) {
        const id = escape(p.id);
        const name = escape(p.name);
        const status = escape(p.status || 'NOUVEAU');
        const clientInfo = escape(JSON.stringify(p.clientInfo || {}));
        const commercialInfo = escape(JSON.stringify(p.commercialInfo || {}));
        const generatedPrd = escape(JSON.stringify(p.generatedPrd || {}));
        const documents = escape(JSON.stringify(p.documents || []));
        const createdAt = escape(p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '));

        sql += `INSERT IGNORE INTO projects (id, name, status, client_info, commercial_info, generated_prd, documents, created_at) VALUES (${id}, ${name}, ${status}, ${clientInfo}, ${commercialInfo}, ${generatedPrd}, ${documents}, ${createdAt});\n`;
    }
    sql += "\n";
}

// 3. Prospects
if (data.prospects && Array.isArray(data.prospects)) {
    sql += "-- Table: prospects\n";
    for (const p of data.prospects) {
        const idStr = p.id;
        const createdAtStr = p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        delete p.id;
        delete p.createdAt;
        delete p.updatedAt;
        
        const id = escape(idStr);
        const createdAt = escape(createdAtStr);
        const dataJson = escape(JSON.stringify(p));

        sql += `INSERT IGNORE INTO prospects (id, data, created_at) VALUES (${id}, ${dataJson}, ${createdAt});\n`;
    }
    sql += "\n";
}

// 4. Expenses
if (data.expenses && Array.isArray(data.expenses)) {
    sql += "-- Table: expenses\n";
    for (const e of data.expenses) {
        const idStr = e.id;
        const createdAtStr = e.createdAt ? new Date(e.createdAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        delete e.id;
        delete e.createdAt;
        
        const id = escape(idStr);
        const createdAt = escape(createdAtStr);
        const dataJson = escape(JSON.stringify(e));

        sql += `INSERT IGNORE INTO expenses (id, data, created_at) VALUES (${id}, ${dataJson}, ${createdAt});\n`;
    }
    sql += "\n";
}

// 5. Config
if (data.companyConfig) {
    sql += "-- Table: company_config\n";
    const cfg = escape(JSON.stringify(data.companyConfig));
    sql += `UPDATE company_config SET config_data = ${cfg} WHERE id = 1;\n`;
    sql += "\n";
}

fs.writeFileSync(outputPath, sql);
console.log(`Fichier SQL généré avec succès : ${outputPath}`);
