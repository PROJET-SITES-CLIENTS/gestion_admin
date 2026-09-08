const fs = require('fs');
let s = fs.readFileSync('src/views/accountant/AccountantSales.tsx', 'utf8');
const BT = String.fromCharCode(96);
const D = '${'; // literal dollar-brace

const stateAnchor = s.match(/const \[customAmounts, setCustomAmounts\] = useState[^;]*;/);
if (!stateAnchor) throw new Error('anchor customAmounts introuvable');
s = s.replace(stateAnchor[0], stateAnchor[0] + `
  // C7/M15 : verrou anti double-clic + choix compte/mode d'encaissement
  const [paying, setPaying] = useState(false);
  const [payAccount, setPayAccount] = useState('');
  const [payMethod, setPayMethod] = useState<'VIREMENT' | 'ESPECES' | 'CHEQUE' | 'MOBILE_MONEY' | 'CARTE'>('VIREMENT');`);

const acompteOld = [
  'onClick={() => {',
  '                                  if (acompte) {',
  '                                    const amount = customAmounts[' + BT + D + 'selectedProject.id}_acompte' + BT + '] !== undefined ? customAmounts[' + BT + D + 'selectedProject.id}_acompte' + BT + '] : acompte.amount;',
  '                                    payInstallmentAndGenerateReceipt(selectedProject.id, acompte.id, acompte.name, amount).then(newDoc => {',
  '                                      if (newDoc) generateReceiptPDF(selectedProject, newDoc, companyConfig);',
  '                                    });',
  '                                  }',
  '                                }}'
].join('\n');
const acompteNew = [
  'onClick={async () => {',
  '                                  if (acompte && !paying) {',
  '                                    setPaying(true);',
  '                                    try {',
  '                                      const amount = customAmounts[' + BT + D + 'selectedProject.id}_acompte' + BT + '] !== undefined ? customAmounts[' + BT + D + 'selectedProject.id}_acompte' + BT + '] : acompte.amount;',
  '                                      const newDoc = await payInstallmentAndGenerateReceipt(selectedProject.id, acompte.id, acompte.name, amount, payAccount || undefined, payMethod);',
  '                                      if (newDoc) generateReceiptPDF(selectedProject, newDoc, companyConfig);',
  '                                    } finally { setPaying(false); }',
  '                                  }',
  '                                }}',
  '                                disabled={paying}'
].join('\n');
if (!s.includes(acompteOld)) throw new Error('bouton acompte introuvable');
s = s.replace(acompteOld, acompteNew);

const soldeOld = [
  'onClick={() => {',
  '                                    if (solde) {',
  '                                      const amount = customAmounts[' + BT + D + 'selectedProject.id}_solde' + BT + '] !== undefined ? customAmounts[' + BT + D + 'selectedProject.id}_solde' + BT + '] : solde.amount;',
  '                                      payInstallmentAndGenerateReceipt(selectedProject.id, solde.id, solde.name, amount).then(newDoc => {',
  '                                        if (newDoc) generateReceiptPDF(selectedProject, newDoc, companyConfig);',
  '                                      });',
  '                                    }',
  '                                  }}'
].join('\n');
const soldeNew = [
  'onClick={async () => {',
  '                                    if (solde && !paying) {',
  '                                      setPaying(true);',
  '                                      try {',
  '                                        const amount = customAmounts[' + BT + D + 'selectedProject.id}_solde' + BT + '] !== undefined ? customAmounts[' + BT + D + 'selectedProject.id}_solde' + BT + '] : solde.amount;',
  '                                        const newDoc = await payInstallmentAndGenerateReceipt(selectedProject.id, solde.id, solde.name, amount, payAccount || undefined, payMethod);',
  '                                        if (newDoc) generateReceiptPDF(selectedProject, newDoc, companyConfig);',
  '                                      } finally { setPaying(false); }',
  '                                    }',
  '                                  }}',
  '                                  disabled={paying}'
].join('\n');
if (!s.includes(soldeOld)) throw new Error('bouton solde introuvable');
s = s.replace(soldeOld, soldeNew);

fs.writeFileSync('src/views/accountant/AccountantSales.tsx', s);
console.log('PATCH OK');
