import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Mutex } from "async-mutex";

const DB_FILE = path.join(process.cwd(), "db.json");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const dbMutex = new Mutex();

async function runSeed() {
  await dbMutex.runExclusive(async () => {
    let data: any = {};
    if (fs.existsSync(DB_FILE)) {
      data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    }

    if (!data.users) data.users = [];

    // Create default admin user if no users exist
    if (data.users.length === 0) {
      console.log("Creating default GERANT user...");
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash("admin123", salt);

      data.users.push({
        id: crypto.randomUUID(),
        username: "admin",
        passwordHash,
        role: "GERANT",
        firstName: "Admin",
        lastName: "System",
        createdAt: new Date().toISOString()
      });
      console.log("Default GERANT user created: username 'admin', password 'admin123'");
    } else {
      console.log("Users already exist, skipping default user creation.");
    }

    // Optional: Migrate base64 images from db.json to disk (uploads/)
    console.log("Migrating base64 images to disk...");
    let migratedCount = 0;

    const processBase64 = (base64Str: string, originalName: string, mimeType?: string) => {
      if (!base64Str || !base64Str.startsWith("data:")) return null;

      try {
        const matches = base64Str.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return null;

        const type = matches[1];
        const dataBuffer = Buffer.from(matches[2], "base64");
        
        const ext = mimeType ? path.extname(originalName) || `.${type.split('/')[1]}` : `.${type.split('/')[1]}`;
        const fileId = crypto.randomUUID();
        const newFilename = `${fileId}${ext}`;
        const filePath = path.join(UPLOADS_DIR, newFilename);

        fs.writeFileSync(filePath, dataBuffer);
        migratedCount++;

        return {
          url: `/api/uploads/${newFilename}`,
          fileId,
          name: originalName || newFilename,
          type: mimeType || type,
          size: Math.round(dataBuffer.length / 1024)
        };
      } catch (err) {
        console.error("Error processing base64 string", err);
        return null;
      }
    };

    if (data.companyConfig) {
      if (data.companyConfig.logoUrl && data.companyConfig.logoUrl.startsWith("data:")) {
         const fileInfo = processBase64(data.companyConfig.logoUrl, "logo.png");
         if (fileInfo) data.companyConfig.logoUrl = fileInfo.url;
      }
      if (data.companyConfig.stampUrl && data.companyConfig.stampUrl.startsWith("data:")) {
         const fileInfo = processBase64(data.companyConfig.stampUrl, "stamp.png");
         if (fileInfo) data.companyConfig.stampUrl = fileInfo.url;
      }
      if (data.companyConfig.signatureUrl && data.companyConfig.signatureUrl.startsWith("data:")) {
         const fileInfo = processBase64(data.companyConfig.signatureUrl, "signature.png");
         if (fileInfo) data.companyConfig.signatureUrl = fileInfo.url;
      }
    }

    if (data.projects) {
      data.projects.forEach((project: any) => {
        if (project.clientInfo) {
          const cl = project.clientInfo;
          // Example of migrating specific fields if they exist as base64 string directly
          if (cl.importedLogo && cl.importedLogo.base64) {
            const fileInfo = processBase64(cl.importedLogo.base64, cl.importedLogo.name, cl.importedLogo.type);
            if (fileInfo) cl.importedLogo = fileInfo;
          }
          if (cl.brandGuidelinesFile && cl.brandGuidelinesFile.base64) {
            const fileInfo = processBase64(cl.brandGuidelinesFile.base64, cl.brandGuidelinesFile.name, cl.brandGuidelinesFile.type);
            if (fileInfo) cl.brandGuidelinesFile = fileInfo;
          }
          
          if (cl.importedCompanyPhotos && Array.isArray(cl.importedCompanyPhotos)) {
            cl.importedCompanyPhotos = cl.importedCompanyPhotos.map((photo: any) => {
              if (photo.base64) {
                 const fileInfo = processBase64(photo.base64, photo.name, photo.type);
                 return fileInfo ? fileInfo : photo;
              }
              return photo;
            });
          }
          // similar for other arrays if any...
        }
      });
    }

    console.log(`Migrated ${migratedCount} base64 files to disk.`);
    
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    console.log("Database updated successfully.");
  });
}

runSeed().catch(console.error);
