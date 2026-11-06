import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBBjihmwI0lyKXzJfap7FnIW9y8gNIG45s",
  authDomain: "tab-a11.firebaseapp.com",
  projectId: "tab-a11",
  storageBucket: "tab-a11.firebasestorage.app",
  messagingSenderId: "567537146456",
  appId: "1:567537146456:web:0f066911212226df66082d",
  measurementId: "G-KJZ0XE2QC5"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
