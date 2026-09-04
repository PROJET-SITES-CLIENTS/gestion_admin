import { Project, CompanyConfig } from '../types';

// CODE-SPLITTING : pdfmake (~600 KB) chargé à la première génération
let pdfMake: any = null;
const ensurePdfMake = async () => {
  if (pdfMake) return pdfMake;
  const [pm, pf] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  pdfMake = (pm as any).default || pm;
  const fonts = (pf as any).default || pf;
  pdfMake.vfs = fonts && fonts.pdfMake ? fonts.pdfMake.vfs : (globalThis as any).pdfMake?.vfs;
  pdfMake.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  };
  return pdfMake;
};

const COLORS = {
  PRIMARY_DARK: '#FFFFFF',
  SECONDARY_DARK: '#F9FAFB',
  GOLD: '#D4AF37',
  LIGHT_GOLD: '#F3E5AB',
  TEXT_MAIN: '#111827',
  TEXT_MUTED: '#6B7280',
  BORDER_LIGHT: '#E5E7EB',
  WHITE: '#FFFFFF'
};

const cleanText = (text?: string): string => {
  if (!text) return '';
  return text.trim().replace(/<\/?[^>]+(>|$)/g, '');
};

const formatGNF = (amount: number): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 GNF';
  return amount.toLocaleString('fr-FR').replace(/[\u202F\u00A0\s]/g, ' ') + ' GNF';
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return new Date().toLocaleDateString('fr-FR');
  try { return new Date(dateStr).toLocaleDateString('fr-FR'); } catch { return dateStr; }
};

const calculateProjectFinancials = (project: Project, docPaidInstallmentId?: string, currentReceiptAmountPaid?: number) => {
  let installments = project.paymentPlan?.installments || [];
  
  let totalAmount = project.budget || 0;
  if (installments.length > 0) {
    totalAmount = installments.reduce((sum, i) => sum + i.amount, 0);
  }

  if (installments.length === 0 && totalAmount > 0) {
    installments = [
      {
        id: '1',
        name: 'Acompte de démarrage',
        percentage: 75,
        amount: Math.round(totalAmount * 0.75),
        expectedDate: new Date().toISOString().split('T')[0],
        status: 'PENDING'
      },
      {
        id: '2',
        name: 'Solde final',
        percentage: 25,
        amount: Math.round(totalAmount * 0.25),
        expectedDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'PENDING'
      }
    ];
  }

  const totalPaid = installments
    .filter(i => i.status === 'PAID' || i.id === docPaidInstallmentId)
    .reduce((sum, i) => {
      if (i.id === docPaidInstallmentId && currentReceiptAmountPaid !== undefined) {
        return sum + currentReceiptAmountPaid;
      }
      return sum + i.amount;
    }, 0);

  const totalRemaining = totalAmount - totalPaid;
  const paymentProgress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

  return { totalAmount, totalPaid, totalRemaining, paymentProgress, installments };
};

const generateBackground = () => {
  return function (currentPage: number, pageSize: any) {
    return {
      canvas: [
        { type: 'rect', x: 0, y: 0, w: pageSize.width, h: pageSize.height, color: COLORS.PRIMARY_DARK },
        { type: 'rect', x: 20, y: 20, w: pageSize.width - 40, h: pageSize.height - 40, lineWidth: 1.5, lineColor: COLORS.GOLD },
        { type: 'rect', x: 26, y: 26, w: pageSize.width - 52, h: pageSize.height - 52, lineWidth: 0.25, lineColor: COLORS.GOLD }
      ]
    };
  };
};

const getStandardHeader = (title: string, projectName: string) => {
  return function(currentPage: number) {
    if (currentPage === 1) return null;
    return {
      margin: [50, 45, 50, 0],
      columns: [
        { text: title.toUpperCase(), fontSize: 7, color: COLORS.GOLD, bold: true, characterSpacing: 4 },
        { text: cleanText(projectName).toUpperCase(), fontSize: 7, color: COLORS.TEXT_MUTED, alignment: 'right', characterSpacing: 2 }
      ],
      canvas: [{ type: 'line', x1: 50, y1: 15, x2: 545, y2: 15, lineWidth: 0.5, lineColor: COLORS.BORDER_LIGHT }]
    };
  };
};

const getStandardFooter = (companyConfig: CompanyConfig) => {
  return function(currentPage: number, pageCount: number) {
    if (currentPage === 1) return null;
    const company = cleanText(companyConfig?.companyName || 'ENTREPRISE').toUpperCase();
    return {
      margin: [50, 20, 50, 0],
      columns: [
        { text: `${company}`, fontSize: 7, color: COLORS.TEXT_MUTED, characterSpacing: 4 },
        { text: `PAGE ${currentPage} / ${pageCount}`, fontSize: 7, color: COLORS.GOLD, alignment: 'right', characterSpacing: 2 }
      ],
      canvas: [{ type: 'line', x1: 50, y1: -15, x2: 545, y2: -15, lineWidth: 0.5, lineColor: COLORS.BORDER_LIGHT }]
    };
  };
};

const generateEditorialCover = (typeMain: string, typeSub: string, clientName: string, docRef: string, dateStr: string, companyConfig: CompanyConfig) => {
  return {
    stack: [
      {
        columns: [
          { width: '*', text: '' },
          companyConfig?.logoBase64 
            ? { image: companyConfig.logoBase64, width: 120, alignment: 'right' } 
            : { text: cleanText(companyConfig?.companyName || 'ENTREPRISE').toUpperCase(), fontSize: 12, bold: true, color: COLORS.GOLD, alignment: 'right', characterSpacing: 4 }
        ],
        margin: [0, 60, 0, 180]
      },
      {
        text: typeMain.toUpperCase(),
        fontSize: 50,
        color: COLORS.GOLD,
        bold: true,
        lineHeight: 1,
        characterSpacing: 8,
        margin: [0, 0, 0, 10]
      },
      {
        text: typeSub.toUpperCase(),
        fontSize: 22,
        color: COLORS.TEXT_MAIN,
        characterSpacing: 2,
        margin: [0, 0, 0, 40]
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 40, y2: 0, lineWidth: 3, lineColor: COLORS.GOLD }],
        margin: [0, 0, 0, 60]
      },
      {
        text: 'DOCUMENT PRÉPARÉ POUR LE PROJET',
        fontSize: 7,
        color: COLORS.TEXT_MUTED,
        characterSpacing: 3,
        margin: [0, 0, 0, 10]
      },
      {
        text: clientName.toUpperCase(),
        fontSize: 22,
        color: COLORS.TEXT_MAIN,
        characterSpacing: 2,
        margin: [0, 0, 0, 80]
      },
      {
        columns: [
          {
            stack: [
              { text: 'RÉFÉRENCE', fontSize: 6, color: COLORS.GOLD, characterSpacing: 2, margin: [0, 0, 0, 4] },
              { text: docRef, fontSize: 8, color: COLORS.TEXT_MAIN, characterSpacing: 1 }
            ]
          },
          {
            stack: [
              { text: 'DATE D\'ÉMISSION', fontSize: 6, color: COLORS.GOLD, characterSpacing: 2, margin: [0, 0, 0, 4] },
              { text: dateStr, fontSize: 8, color: COLORS.TEXT_MAIN, characterSpacing: 1 }
            ]
          }
        ]
      }
    ],
    pageBreak: 'after'
  };
};

export const generateProformaPDF = async (project: Project, companyConfig: CompanyConfig) => {
  const { totalAmount } = calculateProjectFinancials(project);
  
  const clientName = cleanText(project.name || 'CLIENT');
  const ref = `PRO-${clientName.substring(0,5).toUpperCase()}-${new Date().getFullYear()}-${project.id.slice(0, 4)}`;
  const dateStr = formatDate(new Date().toISOString());
  
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [60, 80, 60, 80],
    background: generateBackground(),
    header: getStandardHeader('FACTURE PRO FORMA', project.name),
    footer: getStandardFooter(companyConfig),
    content: [
      generateEditorialCover('FACTURE', 'PRO FORMA', clientName, ref, dateStr, companyConfig),
      
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'ÉMETTEUR', fontSize: 7, color: COLORS.GOLD, characterSpacing: 3, margin: [0, 0, 0, 15] },
              { text: cleanText(companyConfig?.companyName || 'ENTREPRISE').toUpperCase(), fontSize: 12, color: COLORS.TEXT_MAIN, characterSpacing: 1, margin: [0, 0, 0, 8] },
              { text: cleanText(companyConfig?.companyAddress || 'Conakry, République de Guinée').split(', ').join('\n'), fontSize: 9, color: COLORS.TEXT_MUTED, lineHeight: 1.5, margin: [0, 0, 0, 8] },
              { text: `Tél : ${cleanText(companyConfig?.companyPhone || '+224 000 00 00 00')}`, fontSize: 9, color: COLORS.TEXT_MUTED }
            ]
          },
          {
            width: '50%',
            stack: [
              { text: 'PROJET CONCERNÉ', fontSize: 7, color: COLORS.GOLD, characterSpacing: 3, margin: [0, 0, 0, 15] },
              { text: clientName.toUpperCase(), fontSize: 12, color: COLORS.TEXT_MAIN, characterSpacing: 1, margin: [0, 0, 0, 8] }
            ]
          }
        ],
        margin: [0, 0, 0, 60]
      },

      { text: 'DÉTAIL FINANCIER', fontSize: 14, color: COLORS.GOLD, bold: true, characterSpacing: 2, margin: [0, 0, 0, 30] },
      {
        columns: [
          { text: 'DESCRIPTION', fontSize: 7, color: COLORS.GOLD, characterSpacing: 2 },
          { text: 'MONTANT (GNF)', fontSize: 7, color: COLORS.GOLD, characterSpacing: 2, alignment: 'right' }
        ],
        margin: [0, 0, 0, 15]
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5, lineColor: COLORS.BORDER_LIGHT }], margin: [0, 0, 0, 20] },
      
      {
        stack: [
          {
            columns: [
              {
                width: '75%',
                stack: [
                  { text: 'PRESTATION DE SERVICES', fontSize: 9, color: COLORS.TEXT_MAIN, characterSpacing: 1, lineHeight: 1.4 },
                  { text: cleanText(project.description || 'Prestation générale'), fontSize: 6, color: COLORS.TEXT_MUTED, characterSpacing: 2, margin: [0, 6, 0, 0] }
                ]
              },
              { 
                width: '25%',
                text: formatGNF(totalAmount).replace(' GNF', ''), 
                alignment: 'right', 
                fontSize: 10, 
                color: COLORS.TEXT_MAIN, 
                margin: [0, 0, 0, 0]
              }
            ]
          },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5, lineColor: COLORS.BORDER_LIGHT }], margin: [0, 15, 0, 20] }
        ]
      },

      {
        columns: [
          { width: '*', text: '' },
          {
            width: 250,
            stack: [
              {
                columns: [
                  { text: 'SOUS-TOTAL', fontSize: 8, color: COLORS.TEXT_MUTED, characterSpacing: 2 },
                  { text: formatGNF(totalAmount).replace(' GNF', ''), fontSize: 9, color: COLORS.TEXT_MAIN, alignment: 'right' }
                ],
                margin: [0, 0, 0, 15]
              },
              {
                columns: [
                  { text: 'TVA (0%)', fontSize: 8, color: COLORS.TEXT_MUTED, characterSpacing: 2 },
                  { text: '0', fontSize: 9, color: COLORS.TEXT_MAIN, alignment: 'right' }
                ],
                margin: [0, 0, 0, 15]
              },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 250, y2: 0, lineWidth: 1, lineColor: COLORS.GOLD }], margin: [0, 0, 0, 15] },
              {
                columns: [
                  { text: 'TOTAL TTC', fontSize: 10, color: COLORS.GOLD, characterSpacing: 2, bold: true },
                  { text: formatGNF(totalAmount), fontSize: 12, color: COLORS.GOLD, alignment: 'right', bold: true }
                ]
              }
            ]
          }
        ],
        margin: [0, 20, 0, 60]
      },

      {
        stack: [
          { text: 'CONDITIONS DE RÈGLEMENT', fontSize: 7, color: COLORS.GOLD, characterSpacing: 3, margin: [0, 0, 0, 15] },
          { text: 'Le paiement de l\'acompte est requis pour valider la commande et démarrer la prestation.', fontSize: 9, color: COLORS.TEXT_MAIN, margin: [0, 0, 0, 8] },
          { text: 'Le solde restant sera exigible selon les tranches définies par l\'entreprise.', fontSize: 9, color: COLORS.TEXT_MUTED }
        ],
        margin: [0, 0, 0, 60]
      },
      
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'SIGNATURE CLIENT', fontSize: 7, color: COLORS.TEXT_MUTED, characterSpacing: 2, margin: [0, 0, 0, 40] },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: COLORS.BORDER_LIGHT }] }
            ]
          },
          {
            width: '50%',
            stack: [
              { text: 'DIRECTION / COMPTABILITÉ', fontSize: 7, color: COLORS.TEXT_MUTED, characterSpacing: 2, margin: [0, 0, 0, 40], alignment: 'right' },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: COLORS.BORDER_LIGHT }], alignment: 'right' }
            ]
          }
        ],
        pageBreak: 'avoid'
      }
    ],
    defaultStyle: { font: 'Roboto' }
  };

  const filename = `Proforma_${cleanText(project.name).replace(/\s+/g, '_')}_${project.id.slice(0, 6)}.pdf`;
  ensurePdfMake().then(m => m.createPdf(docDefinition)).then(d => d.download(filename));
};

export const generateReceiptPDF = async (project: Project, doc: any, companyConfig: CompanyConfig) => {
  const amountPaid = doc.amountPaid || 0;
  const { totalAmount, totalPaid, totalRemaining } = calculateProjectFinancials(project, doc.installmentId, amountPaid);

  const clientName = cleanText(project.name || 'CLIENT');
  const ref = `RE-${doc.id.slice(0, 6).toUpperCase()}-${new Date(doc.createdAt).getFullYear()}`;
  const refProjet = `PRO-${clientName.substring(0,5).toUpperCase()}-${new Date().getFullYear()}-${project.id.slice(0, 4)}`;
  const dateStr = formatDate(doc.createdAt);

  const libelle = doc.installmentName
    ? `Règlement de la tranche : ${cleanText(doc.installmentName)}`
    : `Règlement de provisions sur la prestation`;

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [60, 80, 60, 80],
    background: generateBackground(),
    header: getStandardHeader('REÇU DE PAIEMENT', project.name),
    footer: getStandardFooter(companyConfig),
    content: [
      generateEditorialCover('REÇU DE', 'PAIEMENT', clientName, ref, dateStr, companyConfig),
      
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'ÉMETTEUR', fontSize: 7, color: COLORS.GOLD, characterSpacing: 3, margin: [0, 0, 0, 15] },
              { text: cleanText(companyConfig?.companyName || 'ENTREPRISE').toUpperCase(), fontSize: 12, color: COLORS.TEXT_MAIN, characterSpacing: 1, margin: [0, 0, 0, 8] },
              { text: cleanText(companyConfig?.companyAddress || 'Conakry, République de Guinée').split(', ').join('\n'), fontSize: 9, color: COLORS.TEXT_MUTED, lineHeight: 1.5, margin: [0, 0, 0, 8] },
              { text: `Tél : ${cleanText(companyConfig?.companyPhone || '+224 000 00 00 00')}`, fontSize: 9, color: COLORS.TEXT_MUTED }
            ]
          },
          {
            width: '50%',
            stack: [
              { text: 'PROJET CONCERNÉ', fontSize: 7, color: COLORS.GOLD, characterSpacing: 3, margin: [0, 0, 0, 15] },
              { text: clientName.toUpperCase(), fontSize: 12, color: COLORS.TEXT_MAIN, characterSpacing: 1, margin: [0, 0, 0, 8] },
              { text: `Réf. Projet : ${refProjet}`, fontSize: 9, color: COLORS.TEXT_MUTED }
            ]
          }
        ],
        margin: [0, 0, 0, 60]
      },

      { text: 'SPÉCIFICATIONS DU VERSEMENT', fontSize: 14, color: COLORS.GOLD, bold: true, characterSpacing: 2, margin: [0, 0, 0, 30] },
      {
        columns: [
          { text: 'DESCRIPTION', fontSize: 7, color: COLORS.GOLD, characterSpacing: 2 },
          { text: 'MONTANT REÇU', fontSize: 7, color: COLORS.GOLD, characterSpacing: 2, alignment: 'right' }
        ],
        margin: [0, 0, 0, 15]
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5, lineColor: COLORS.BORDER_LIGHT }], margin: [0, 0, 0, 20] },
      
      {
        stack: [
          {
            columns: [
              {
                width: '75%',
                stack: [
                  { text: cleanText(libelle).toUpperCase(), fontSize: 9, color: COLORS.TEXT_MAIN, characterSpacing: 1, lineHeight: 1.4 },
                  { text: `PROJET : ${cleanText(project.name).toUpperCase()}`, fontSize: 6, color: COLORS.TEXT_MUTED, characterSpacing: 2, margin: [0, 6, 0, 0] }
                ]
              },
              { 
                width: '25%',
                text: formatGNF(amountPaid), 
                alignment: 'right', 
                fontSize: 12, 
                color: COLORS.TEXT_MAIN, 
                margin: [0, 0, 0, 0]
              }
            ]
          },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5, lineColor: COLORS.BORDER_LIGHT }], margin: [0, 15, 0, 20] }
        ]
      },

      {
        columns: [
          { width: '*', text: '' },
          {
            width: 250,
            stack: [
              {
                columns: [
                  { text: 'Montant total du contrat', fontSize: 8, color: COLORS.TEXT_MUTED, characterSpacing: 1 },
                  { text: formatGNF(totalAmount), fontSize: 9, color: COLORS.TEXT_MAIN, alignment: 'right' }
                ],
                margin: [0, 0, 0, 15]
              },
              {
                columns: [
                  { text: 'Total cumulé perçu', fontSize: 8, color: COLORS.TEXT_MUTED, characterSpacing: 1 },
                  { text: formatGNF(totalPaid), fontSize: 9, color: COLORS.GOLD, alignment: 'right' }
                ],
                margin: [0, 0, 0, 15]
              },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 250, y2: 0, lineWidth: 1, lineColor: COLORS.GOLD }], margin: [0, 0, 0, 15] },
              {
                columns: [
                  { text: 'Reste à recouvrer', fontSize: 10, color: COLORS.TEXT_MAIN, characterSpacing: 1 },
                  { text: totalRemaining <= 0 ? 'SOLDE RÉGLÉ' : formatGNF(totalRemaining), fontSize: 11, color: totalRemaining <= 0 ? COLORS.GOLD : COLORS.WHITE, alignment: 'right' }
                ]
              }
            ]
          }
        ],
        margin: [0, 20, 0, 60]
      },

      {
        stack: [
          { text: `Nous attestons par la présente avoir reçu la somme de ${formatGNF(amountPaid)} au titre du projet "${cleanText(project.name)}". Ce document constitue une quittance officielle de paiement pour la tranche concernée.`, fontSize: 8, color: COLORS.TEXT_MUTED, lineHeight: 1.8, italics: true, alignment: 'justify' }
        ],
        margin: [0, 0, 0, 60]
      },

      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'DIRECTION', fontSize: 7, color: COLORS.TEXT_MUTED, characterSpacing: 2, margin: [0, 0, 0, 40] },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: COLORS.BORDER_LIGHT }] }
            ]
          },
          {
            width: '50%',
            stack: [
              { text: 'SERVICE COMPTABILITÉ', fontSize: 7, color: COLORS.TEXT_MUTED, characterSpacing: 2, margin: [0, 0, 0, 40], alignment: 'right' },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: COLORS.BORDER_LIGHT }], alignment: 'right' }
            ]
          }
        ],
        pageBreak: 'avoid'
      }
    ],
    defaultStyle: { font: 'Roboto' }
  };

  const filename = `Recu_${cleanText(project.name).replace(/\s+/g, '_')}_${doc.id.slice(0, 6)}.pdf`;
  ensurePdfMake().then(m => m.createPdf(docDefinition)).then(d => d.download(filename));
};

/**
 * Génère le PDF d'un projet (facture proforma) sous forme de Blob.
 * Utilisé par l'archive ZIP (zipGenerator) et tout export programmatique.
 */
export const getProjectPDFBlob = async (project: Project, companyConfig: CompanyConfig): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      const { totalAmount } = calculateProjectFinancials(project);
      const clientName = cleanText(project.name || 'CLIENT');
      const ref = `PRO-${clientName.substring(0, 5).toUpperCase()}-${new Date().getFullYear()}-${project.id.slice(0, 4)}`;
      const dateStr = formatDate(new Date().toISOString());

      const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [60, 80, 60, 80],
        background: generateBackground(),
        header: getStandardHeader('CAHIER DES CHARGES', project.name),
        footer: getStandardFooter(companyConfig),
        content: [
          generateEditorialCover('DOSSIER', 'CAHIER DES CHARGES', clientName, ref, dateStr, companyConfig),
          {
            stack: [
              { text: 'PRÉSENTATION DU PROJET', fontSize: 14, color: COLORS.GOLD, bold: true, characterSpacing: 2, margin: [0, 0, 0, 20] },
              { text: cleanText(project.description || project.clientName || 'Projet client Einsof Digit.'), fontSize: 10, color: COLORS.TEXT_MAIN, lineHeight: 1.6 },
              { text: `Budget : ${formatGNF(totalAmount)}`, fontSize: 10, color: COLORS.TEXT_MUTED, margin: [0, 15, 0, 0] }
            ]
          }
        ],
        defaultStyle: { font: 'Roboto' }
      };

      ensurePdfMake().then(m => (m.createPdf(docDefinition) as any).getBlob((blob: Blob) => resolve(blob)));
    } catch (err) {
      reject(err);
    }
  });
};

/* ============================================================
   EXTENSION BTP — Ordres de Service & PV de réception
   ============================================================ */
import { BtpChantier as _BtpChantier, CompanyConfig as _CC } from '../types';

const formatGNF2 = (n: number) => `${(n || 0).toLocaleString('fr-FR')} GNF`;

export const generateOsPDF = async (chantier: _BtpChantier, os: { id: string; type: string; date: string; motif?: string }, companyConfig: _CC) => {
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [60, 80, 60, 80],
    header: getStandardHeader(`ORDRE DE SERVICE — ${os.type.toUpperCase()}`, chantier.nom),
    footer: getStandardFooter(companyConfig),
    content: [
      generateEditorialCover('ORDRE DE', `SERVICE — ${os.type.toUpperCase()}`, chantier.client, os.id.toUpperCase(), os.date, companyConfig),
      {
        stack: [
          { text: 'CHANTIER CONCERNÉ', fontSize: 8, color: COLORS.GOLD, characterSpacing: 3, margin: [0, 0, 0, 8] },
          { text: `${chantier.nom}\nClient : ${chantier.client}\nAdresse : ${chantier.adresse}`, fontSize: 11, color: COLORS.TEXT_MAIN, lineHeight: 1.5 },
          { text: `Réf. Ordre de Service : ${os.id}`, fontSize: 10, color: COLORS.TEXT_MUTED, margin: [0, 10, 0, 0] },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5, lineColor: COLORS.BORDER_LIGHT }], margin: [0, 24, 0, 24] },
          { text: 'OBJET', fontSize: 8, color: COLORS.GOLD, characterSpacing: 3, margin: [0, 0, 0, 8] },
          { text: `Le maître d'ouvrage notifie par le présent ordre de service la mise en œuvre de la décision suivante : ${os.type}.`, fontSize: 11, color: COLORS.TEXT_MAIN, lineHeight: 1.6 },
          ...(os.motif ? [{ text: `Motif : ${os.motif}`, fontSize: 10, color: COLORS.TEXT_MUTED, margin: [0, 10, 0, 0] }] : []),
          { text: `Fait à Conakry, le ${new Date(os.date).toLocaleDateString('fr-FR')}.`, fontSize: 10, color: COLORS.TEXT_MAIN, margin: [0, 30, 0, 0] },
        ],
        margin: [0, 20, 0, 40],
      },
      {
        columns: [
          { width: '50%', stack: [
            { text: 'LE MAÎTRE D\'OUVRAGE', fontSize: 7, color: COLORS.TEXT_MUTED, characterSpacing: 2, margin: [0, 0, 0, 40] },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: COLORS.BORDER_LIGHT }] },
          ]},
          { width: '50%', stack: [
            { text: 'L\'ENTREPRISE', fontSize: 7, color: COLORS.TEXT_MUTED, characterSpacing: 2, margin: [0, 0, 0, 40], alignment: 'right' },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: COLORS.BORDER_LIGHT }], alignment: 'right' },
          ]},
        ],
      },
    ],
    defaultStyle: { font: 'Roboto' },
  };
  ensurePdfMake().then(m => m.createPdf(docDefinition)).then(d => d.download(`OS_${os.type}_${chantier.nom.replace(/\s+/g, '_')}.pdf`));
};

export const generatePvPDF = async (chantier: _BtpChantier, type: 'provisoire' | 'définitive', companyConfig: _CC, avancecmtPct = 100) => {
  const today = new Date().toISOString();
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [60, 80, 60, 80],
    header: getStandardHeader(`PV DE RÉCEPTION ${type.toUpperCase()}`, chantier.nom),
    footer: getStandardFooter(companyConfig),
    content: [
      generateEditorialCover('PROCÈS-VERBAL', `RÉCEPTION ${type.toUpperCase()}`, chantier.client, `PV-${type.slice(0, 3).toUpperCase()}-${today.slice(0, 10)}`, today, companyConfig),
      {
        stack: [
          { text: 'TRANCHES CONCERNÉES', fontSize: 8, color: COLORS.GOLD, characterSpacing: 3, margin: [0, 0, 0, 8] },
          { text: `Chantier : ${chantier.nom}\nClient : ${chantier.client}\nAdresse : ${chantier.adresse}\nMontant du marché : ${formatGNF2(chantier.budget_initial)}`, fontSize: 11, color: COLORS.TEXT_MAIN, lineHeight: 1.6 },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5, lineColor: COLORS.BORDER_LIGHT }], margin: [0, 24, 0, 24] },
          { text: 'CONSTAT', fontSize: 8, color: COLORS.GOLD, characterSpacing: 3, margin: [0, 0, 0, 8] },
          { text: `En exécution du marché susvisé, la réception ${type} des travaux est prononcée ce jour. Les travaux ont été menés à leur terme${type === 'définitive' ? ' et l\u2019ensemble des réserves formulées à la réception provisoire est levé' : ''}.`, fontSize: 11, color: COLORS.TEXT_MAIN, lineHeight: 1.6 },
          { text: `Avancement constaté : ${avancecmtPct}%.`, fontSize: 10, color: COLORS.TEXT_MUTED, margin: [0, 12, 0, 0] },
          ...(type === 'définitive' ? [{ text: 'La présente réception définitive déclenche la libération des retenues de garantie conformément au marché.', fontSize: 10, color: COLORS.TEXT_MUTED, margin: [0, 12, 0, 0] }] : []),
        ],
        margin: [0, 20, 0, 40],
      },
      {
        columns: [
          { width: '50%', stack: [
            { text: 'LE MAÎTRE D\'OUVRAGE', fontSize: 7, color: COLORS.TEXT_MUTED, characterSpacing: 2, margin: [0, 0, 0, 40] },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: COLORS.BORDER_LIGHT }] },
          ]},
          { width: '50%', stack: [
            { text: 'L\'ENTREPRISE', fontSize: 7, color: COLORS.TEXT_MUTED, characterSpacing: 2, margin: [0, 0, 0, 40], alignment: 'right' },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: COLORS.BORDER_LIGHT }], alignment: 'right' },
          ]},
        ],
      },
    ],
    defaultStyle: { font: 'Roboto' },
  };
  ensurePdfMake().then(m => m.createPdf(docDefinition)).then(d => d.download(`PV_reception_${type}_${chantier.nom.replace(/\s+/g, '_')}.pdf`));
};
