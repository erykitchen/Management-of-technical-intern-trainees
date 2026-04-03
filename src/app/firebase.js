import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // 追加

const firebaseConfig = {
  apiKey: "AIzaSyCStzExuiWL4TQDtkLI7nMefzrQapWG3cs",
  authDomain: "assistnet-97bde.firebaseapp.com",
  projectId: "assistnet-97bde",
  storageBucket: "assistnet-97bde.firebasestorage.app",
  messagingSenderId: "859791885515",
  appId: "1:859791885515:web:c29c19b3433652bc25474e",
  measurementId: "G-8KKC6H9QQ8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app); // 追加：これで「倉庫」が使えるようになります