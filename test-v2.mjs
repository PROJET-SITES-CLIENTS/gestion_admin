const BASE = 'https://einsof-erp.vercel.app/api';
const login = async (u, p) => (await (await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) })).json());
const api = (token, path, body, method = 'POST') => fetch(`${BASE}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
const g = await login('admin', 'admin123');
const T = g.token;

console.log('== 1. C5 : upload piece jointe (dataURL) ==');
const up = await api(T, '/uploads', { filename: 'test.txt', base64: 'data:text/plain;base64,SGVsbG8gRWluc29mIQ==' });
const upJson = await up.json();
console.log(up.status === 201 && upJson.url ? 'OK POST /uploads -> ' + upJson.url : 'FAIL ' + up.status + ' ' + JSON.stringify(upJson));
if (upJson.url) {
  const got = await api(T, upJson.url, undefined, 'GET');
  const txt = await got.text();
  console.log(got.status === 200 && txt === 'Hello Einsof!' ? 'OK GET authentifie -> contenu intact' : 'FAIL GET ' + got.status);
  await api(T, `/crud/uploads/${upJson.url.split('/').pop()}/delete`);
}

console.log('== 2. C1 : dedupKey des taches ==');
const t1 = await (await api(T, '/tasks', { receiverRole: 'COMMERCIAL', title: 'TEST-DEDUP', content: 'x', priority: 'HIGH', dedupKey: 'relance-j14-testv2' })).json();
const t2 = await (await api(T, '/tasks', { receiverRole: 'COMMERCIAL', title: 'TEST-DEDUP', content: 'x', priority: 'HIGH', dedupKey: 'relance-j14-testv2' })).json();
console.log(t1.id === t2.id ? 'OK 2e POST meme cle -> meme tache (pas de doublon)' : 'FAIL ids differents');
await api(T, `/crud/tasks/${t1.id}/delete`);

console.log('== 3. M10 : ecriture VALIDATED verrouillee ==');
const entry = await (await api(T, '/crud/accountingEntries', { journalId: 'test', date: new Date().toISOString(), reference: 'TEST', description: 'TEST-V2', status: 'VALIDATED', lines: [{ accountId: 'x', debit: 100, credit: 0 }, { accountId: 'y', debit: 0, credit: 100 }] })).json();
const tryUpd = await api(T, `/crud/accountingEntries/${entry.id}/update`, { description: 'MODIFIE' });
console.log((await tryUpd.json()).error?.includes('verrouillée') ? 'OK update refuse : ecriture verrouillee' : 'FAIL ' + (await tryUpd.text()));
await api(T, `/crud/accountingEntries/${entry.id}/delete`);

console.log('== 4. C4 : config comptable (sous-ensemble) ==');
const cpt = await (await api(T, '/auth/register', { username: 'test.comptable', password: 'comptable123', role: 'COMPTABLE', firstName: 'C', lastName: 'Test' })).json();
if (cpt.user) {
  const cLogin = await login('test.comptable', 'comptable123');
  const cfgOk = await api(cLogin.token, '/config/update', { companyName: 'Einsof Test', activeModules: ['AGRO'] });
  console.log(cfgOk.status === 200 ? 'OK le comptable peut sauver la config fiscale' : 'FAIL ' + cfgOk.status);
  const data = await (await api(cLogin.token, '/data', undefined, 'GET')).json();
  console.log(!((data.companyConfig?.activeModules || []).includes('AGRO')) ? 'OK cle interdite (activeModules) ignoree pour le comptable' : 'FAIL la cle gerant a passe le filtre !');
  console.log(data.accountingEntries !== undefined ? 'OK le comptable recoit le grand livre (FINANCE)' : 'FAIL grand livre absent pour FINANCE');
  await api(T, `/users/${cLogin.user.id}/delete`);
}

console.log('== 5. C6+M11 : self-service RH + paie gerant seul ==');
const rh = await (await api(T, '/auth/register', { username: 'test.rh', password: 'rhtest1234', role: 'RH', firstName: 'R', lastName: 'Test' })).json();
if (rh.user) {
  const rLogin = await login('test.rh', 'rhtest1234');
  const ps = await (await api(T, '/rh/payslips', { employeeId: 'test-v2', month: 8, year: 2026, netSalary: 1, grossSalary: 1 })).json();
  await api(T, `/rh/payslips/${ps.id}/update`, { status: 'VALIDATED' });
  const paid = await api(rLogin.token, `/rh/payslips/${ps.id}/update`, { status: 'PAID' });
  console.log((await paid.json()).error?.includes('Gérant') ? 'OK RH -> PAID refuse (Gerant seul)' : 'FAIL ' + (await paid.text()));
  await api(T, `/crud/payslips/${ps.id}/delete`);

  const com = await (await api(T, '/auth/register', { username: 'test.com', password: 'commercial123', role: 'COMMERCIAL', firstName: 'Awa', lastName: 'Ba' })).json();
  if (com.user) {
    const emp = await (await api(T, '/rh/employees', { firstName: 'Awa', lastName: 'Ba', email: 'a@b.gn', phone: '1', position: 'Test', department: 'Commercial', baseSalary: 500000, hireDate: '2026-01-01' })).json();
    await api(T, '/rh/leaves', { employeeId: emp.id, startDate: '2026-09-10', endDate: '2026-09-12', reason: 'Test', leaveType: 'ANNUAL', daysCount: 3 });
    const comLogin = await login('test.com', 'commercial123');
    const comData = await (await api(comLogin.token, '/data', undefined, 'GET')).json();
    console.log(comData.employees?.length === 1 && comData.employees[0]?.lastName === 'Ba' ? 'OK C6 : le commercial voit SON dossier employe uniquement' : 'FAIL employees=' + JSON.stringify(comData.employees?.map(e => e.lastName)));
    console.log((comData.leave_requests || []).length >= 1 ? 'OK C6 : il voit SA demande de conge' : 'FAIL conge invisible');
    const selfOk = await api(comLogin.token, '/rh/leaves', { employeeId: emp.id, startDate: '2026-10-01', endDate: '2026-10-02', reason: 'Perso', leaveType: 'ANNUAL', daysCount: 2 });
    console.log(selfOk.status === 201 ? 'OK conge pour SOI accepte (201)' : 'FAIL ' + selfOk.status);
    const other = await api(comLogin.token, '/rh/leaves', { employeeId: 'autre-id', startDate: '2026-10-01', endDate: '2026-10-02', reason: 'x', leaveType: 'ANNUAL', daysCount: 2 });
    console.log(other.status === 403 ? 'OK conge pour AUTRUI refuse (403)' : 'FAIL ' + other.status);
    console.log(comData.accountingEntries === undefined ? 'OK M1 : grand livre absent de /data commercial' : 'FAIL accountingEntries present');
    await api(T, `/users/${comLogin.user.id}/delete`);
    await api(T, `/crud/employees/${emp.id}/delete`);
  }
  await api(T, `/users/${rLogin.user.id}/delete`);
}

console.log('== 6. M13 : machine a etats depenses ==');
const exp = await (await api(T, '/expenses', { category: 'AUTRE', amountHT: 100, tvaAmount: 0, amountTTC: 100, description: 'TEST-V2', date: '2026-09-08', status: 'PENDING' })).json();
await api(T, `/expenses/${exp.id}/update`, { status: 'PAID' });
const rejAfterPaid = await api(T, `/expenses/${exp.id}/update`, { status: 'REJECTED' });
console.log((await rejAfterPaid.json()).error?.includes('Transition interdite') ? 'OK depense PAID -> rejet refuse' : 'FAIL ' + (await rejAfterPaid.text()));
await api(T, `/expenses/${exp.id}/delete`);

console.log('== 7. C8+M2 : espace assistante ==');
const a = await (await api(T, '/auth/register', { username: 'test.assist', password: 'assistante123', role: 'ASSISTANTE', firstName: 'A', lastName: 'T' })).json();
if (a.user) {
  const aLogin = await login('test.assist', 'assistante123');
  const doc = await (await api(T, '/crud/assistantDocuments', { title: 'TEST-C8', category: 'AUTRE', status: 'VALID' })).json();
  const del = await api(aLogin.token, `/crud/assistantDocuments/${doc.id}/delete`);
  console.log((await del.json()).success === true ? 'OK assistante peut supprimer dans sa GED' : 'FAIL ' + (await del.text()));
  const marche = await api(aLogin.token, '/crud/btpMarches', { numero: 'MAR-X', client_nom: 'X', objet: 'X', montant_ht: 1, montant_ttc: 1 });
  console.log(marche.status === 403 ? 'OK M2 : creation marche BTP refusee pour assistante' : 'FAIL ' + marche.status);
  const aData = await (await api(aLogin.token, '/data', undefined, 'GET')).json();
  console.log(aData.accountingEntries === undefined ? 'OK M1 : grand livre absent pour assistante' : 'FAIL present');
  console.log(aData.assistantDocuments !== undefined ? 'OK ses tables assistant presentes' : 'FAIL tables assistant absentes');
  await api(T, `/users/${aLogin.user.id}/delete`);
}
console.log('== TERMINE ==');
