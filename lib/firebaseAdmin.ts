import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  try {
    let serviceAccount;
    
    // 1. Try Environment Variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } else {
        // 2. Try the file that we know has content
        const validKeyPath = path.join(process.cwd(), 'app', 'fir-auth-cca62-firebase-adminsdk-fbsvc-58abf4df05.json');
        const rootKeyPath = path.join(process.cwd(), 'fir-auth-cca62-firebase-adminsdk-fbsvc-467d6da11b.json');
        
        if (fs.existsSync(validKeyPath) && fs.statSync(validKeyPath).size > 0) {
            console.log("Using valid service account key from app/ folder");
            serviceAccount = JSON.parse(fs.readFileSync(validKeyPath, 'utf8'));
        } else if (fs.existsSync(rootKeyPath) && fs.statSync(rootKeyPath).size > 0) {
            console.log("Using service account key from root folder");
            serviceAccount = JSON.parse(fs.readFileSync(rootKeyPath, 'utf8'));
        }
    }

    if (serviceAccount) {
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } else {
        throw new Error('No valid Firebase service account key found.');
    }
  } catch (error: any) {
    console.error('Firebase admin initialization error:', error.message);
    throw error;
  }
}

// Export getters instead of raw objects to ensure initialization
export const getAdminDb = () => {
    initializeFirebaseAdmin();
    return admin.firestore();
};

export const getAdminAuth = () => {
    initializeFirebaseAdmin();
    return admin.auth();
};
