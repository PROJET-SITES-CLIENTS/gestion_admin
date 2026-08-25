import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Project, CompanyConfig } from '../types';
import { getProjectPDFBlob } from './pdfGenerator';

const base64ToBlob = async (dataStr: string): Promise<Blob | null> => {
  try {
    if (!dataStr) return null;

    // Check if it's a URL (http/https or relative api path)
    if (dataStr.startsWith('http') || dataStr.startsWith('/')) {
      const response = await fetch(dataStr);
      if (!response.ok) return null;
      return await response.blob();
    }

    // Parse data URI manually (much safer for huge payloads than fetch)
    if (dataStr.startsWith('data:')) {
      const arr = dataStr.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    }
    
    // Fallback for raw base64 (not a data URI)
    let mime = 'application/octet-stream';
    const bstr = atob(dataStr);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.error("Failed to convert data to Blob", err);
    return null;
  }
};

const getExtension = (mimeType: string, defaultExt: string = '.bin'): string => {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc'
  };
  return map[mimeType] || defaultExt;
};

export const downloadProjectArchive = async (project: Project, companyConfig: CompanyConfig) => {
  try {
    const zip = new JSZip();

    // 1. Cahier des charges complet en PDF
    const pdfBlob = await getProjectPDFBlob(project, companyConfig);
    zip.file(`Cahier_des_charges_${project.name.replace(/\s+/g, '_')}.pdf`, pdfBlob);

    const cl = project.clientInfo;

    if (cl) {
      // 2. Données brutes JSON (référence technique)
      zip.file('specifications_brutes.json', JSON.stringify(project, null, 2));

      // --- Création des sous-dossiers ---
      const mediasFolder   = zip.folder('1_Identite_Visuelle_et_Medias');
      const contenuFolder  = zip.folder('2_Contenu_et_Documents');
      const legauxFolder   = zip.folder('3_Documents_Legaux');

      // 3. Directives du commercial
      if (project.commercialInfo && (project.commercialInfo.needsSummary || project.commercialInfo.notes)) {
        const txt = `RÉSUMÉ DES BESOINS PERÇUS:\n${project.commercialInfo.needsSummary || 'Non spécifié'}\n\nNOTES SUPPLÉMENTAIRES:\n${project.commercialInfo.notes || 'Aucune note'}`;
        zip.file('4_directives_commercial.txt', txt);
      }

      // ──── LOGOS ────────────────────────────────────────────────────────────────────────────────────────────────────
      if (mediasFolder) {
        if (cl.importedLogo?.url || cl.importedLogo?.base64) {
          const b = await base64ToBlob(cl.importedLogo.url || cl.importedLogo.base64!);
          if (b) mediasFolder.file(`Logo${getExtension(cl.importedLogo.type, '.png')}`, b);
        }

        // ──── CHARTE GRAPHIQUE (nouveau champ brandGuidelinesFile + ancien importedBrandGuidelines) ────
        if (cl.brandGuidelinesFile?.url || cl.brandGuidelinesFile?.base64) {
          const b = await base64ToBlob(cl.brandGuidelinesFile.url || cl.brandGuidelinesFile.base64!);
          if (b) mediasFolder.file(`Charte_Graphique${getExtension(cl.brandGuidelinesFile.type, '.pdf')}`, b);
        } else if ((cl as any).importedBrandGuidelines?.url || (cl as any).importedBrandGuidelines?.base64) {
          const bg = (cl as any).importedBrandGuidelines;
          const b = await base64ToBlob(bg.url || bg.base64);
          if (b) mediasFolder.file(`Charte_Graphique${getExtension(bg.type, '.pdf')}`, b);
        }

        // ──── PHOTOS D'ENTREPRISE ────────────────────────────────────────────────────────────────
        if (cl.importedCompanyPhotos && cl.importedCompanyPhotos.length > 0) {
          const photosFolder = mediasFolder.folder('Photos_Entreprise');
          if (photosFolder) {
            for (let i = 0; i < cl.importedCompanyPhotos.length; i++) {
              const f = cl.importedCompanyPhotos[i];
              if (f.url || f.base64) {
                const b = await base64ToBlob(f.url || f.base64!);
                if (b) photosFolder.file(`Photo_${i + 1}_${f.name || ''}${getExtension(f.type, '.jpg')}`, b);
              }
            }
          }
        }

        // ──── IMAGES SPÉCIFIQUES (nouveau champ) ──────────────────────────────
        if (cl.importedSpecificImages && cl.importedSpecificImages.length > 0) {
          const imgsFolder = mediasFolder.folder('Images_Specifiques');
          if (imgsFolder) {
            for (let i = 0; i < cl.importedSpecificImages.length; i++) {
              const f = cl.importedSpecificImages[i];
              if (f.url || f.base64) {
                const b = await base64ToBlob(f.url || f.base64!);
                if (b) imgsFolder.file(`Image_${i + 1}_${f.name || ''}${getExtension(f.type, '.jpg')}`, b);
              }
            }
          }
        }
      }

      // ──── DOCUMENTS DE CONTENU EXISTANTS (nouveau champ) ──────────────
      if (contenuFolder) {
        if (cl.importedContentDocs && cl.importedContentDocs.length > 0) {
          for (let i = 0; i < cl.importedContentDocs.length; i++) {
            const f = cl.importedContentDocs[i];
            if (f.url || f.base64) {
              const b = await base64ToBlob(f.url || f.base64!);
              if (b) contenuFolder.file(`Document_Contenu_${i + 1}_${f.name || ''}${getExtension(f.type, '.pdf')}`, b);
            }
          }
        }
      }

      // ──── DOCUMENTS LÉGAUX ────────────────────────────────────────────────────────────────────────────
      if (legauxFolder) {
        if (cl.rccmFile?.url || cl.rccmFile?.base64) {
          const b = await base64ToBlob(cl.rccmFile.url || cl.rccmFile.base64!);
          if (b) legauxFolder.file(`RCCM_Kbis${getExtension(cl.rccmFile.type, '.pdf')}`, b);
        } else if ((cl as any).importedRccmDoc?.url || (cl as any).importedRccmDoc?.base64) {
          const b = await base64ToBlob((cl as any).importedRccmDoc.url || (cl as any).importedRccmDoc.base64!);
          if (b) legauxFolder.file(`RCCM_Kbis${getExtension((cl as any).importedRccmDoc.type, '.pdf')}`, b);
        }
        
        if (cl.identityFile?.url || cl.identityFile?.base64) {
          const b = await base64ToBlob(cl.identityFile.url || cl.identityFile.base64!);
          if (b) legauxFolder.file(`Piece_Identite${getExtension(cl.identityFile.type, '.pdf')}`, b);
        } else if ((cl as any).importedIdentityDoc?.url || (cl as any).importedIdentityDoc?.base64) {
          const b = await base64ToBlob((cl as any).importedIdentityDoc.url || (cl as any).importedIdentityDoc.base64!);
          if (b) legauxFolder.file(`Piece_Identite${getExtension((cl as any).importedIdentityDoc.type, '.pdf')}`, b);
        }
      }
    }

    // 3. Générer et déclencher le téléchargement du ZIP
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `Archive_Complete_${project.name.replace(/\s+/g, '_')}.zip`);
    return true;
  } catch (error) {
    console.error("Erreur lors de la génération de l'archive ZIP:", error);
    throw error;
  }
};


