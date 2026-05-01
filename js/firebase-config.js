const firebaseConfig = {
  apiKey: "AIzaSyB1i9cXBLhGsoM2tyxhNl8EsKScoZL7ae0",
  authDomain: "the-gravity-d818f.firebaseapp.com",
  projectId: "the-gravity-d818f",
  storageBucket: "the-gravity-d818f.firebasestorage.app",
  messagingSenderId: "873211179047",
  appId: "1:873211179047:web:b6e6f76dffd7036600de02",
  measurementId: "G-QKP1QHM34L"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Auth, Firestore & Storage
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
