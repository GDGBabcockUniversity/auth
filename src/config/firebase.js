const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      return admin.app();
    }

    // Initialize with service account or application default credentials
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Use application default credentials (for production)
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
      throw new Error(
        "Firebase configuration missing. Please set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID"
      );
    }

    console.log("Firebase Admin SDK initialized successfully");
    return admin.app();
  } catch (error) {
    console.error("Error initializing Firebase:", error.message);
    throw error;
  }
};

module.exports = { admin, initializeFirebase };
