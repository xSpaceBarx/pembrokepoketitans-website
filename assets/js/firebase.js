import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA1b9avIssQS8eRCDddguEaUwXPPf7t994",
    authDomain: "pembroke-poketitans.firebaseapp.com",
    projectId: "pembroke-poketitans",
    storageBucket: "pembroke-poketitans.firebasestorage.app",
    messagingSenderId: "921044433143",
    appId: "1:921044433143:web:8081207a672b37dac5fbf2"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };
