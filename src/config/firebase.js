const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      return admin.app();
    }

    // Method 1: Service account from environment variable (RECOMMENDED FOR PRODUCTION)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log(
        "Initializing Firebase with service account from environment variable"
      );
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
      });
    }
    // Method 2: Service account from file path (DEVELOPMENT ONLY)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      console.log("Initializing Firebase with service account from file");
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
      });
    }
    // Method 3: Individual environment variables
    else if (
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL
    ) {
      console.log(
        "Initializing Firebase with individual environment variables"
      );
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace escaped newlines in private key
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
    // Method 4: Application Default Credentials (for Google Cloud environments)
    else if (
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.FIREBASE_PROJECT_ID
    ) {
      console.log("Initializing Firebase with Application Default Credentials");
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
      throw new Error(
        "Firebase configuration missing. Please set one of: FIREBASE_SERVICE_ACCOUNT, FIREBASE_SERVICE_ACCOUNT_PATH, or individual credentials"
      );
    }

    console.log("✓ Firebase Admin SDK initialized successfully");
    return admin.app();
  } catch (error) {
    console.error("✗ Error initializing Firebase:", error.message);
    throw error;
  }
};

module.exports = { admin, initializeFirebase };
