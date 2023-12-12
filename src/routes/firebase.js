const admin = require('firebase-admin');
// require('dotenv').config();
const serviceAccount = require('./fire.json');
// const firebaseConfig = {
//   type: 'service_account',
//   project_id: process.env.FIREBASE_PROJECT_ID,
//   private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
//   private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Replace escaped newline characters
//   client_email: process.env.FIREBASE_CLIENT_EMAIL,
//   client_id: process.env.FIREBASE_CLIENT_ID,
//   auth_uri: process.env.FIREBASE_AUTH_URI,
//   token_uri: process.env.FIREBASE_TOKEN_URI,
//   auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
//   client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
//   universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
// };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `gs://${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
});

const storageBucket = admin.storage().bucket();

// Log statements to check the connection
console.log('Firebase Admin SDK initialized successfully.');
console.log('Connected to Firebase Storage bucket:', storageBucket.name);

module.exports = storageBucket;
