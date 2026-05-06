// Firebase Configuration File
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-check.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit,
    doc,
    updateDoc,
    deleteDoc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    confirmPasswordReset,
    verifyPasswordResetCode
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Configuração do projeto Firebase: tratamentoweb
const firebaseConfig = {
    apiKey: "AIzaSyB8tkMR4kx_c4Hj9TNf0EPTEwWMEQc-oDs",
    authDomain: "tratamentoweb.firebaseapp.com",
    projectId: "tratamentoweb",
    storageBucket: "tratamentoweb.firebasestorage.app",
    messagingSenderId: "894728971208",
    appId: "1:894728971208:web:52278dc3754180626c16fd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 🔐 Initialize App Check with reCAPTCHA v3
const SITE_KEY = "6LfxeLEsAAAAABNCDaVNHce2WYM45NlQSa8us17c";

const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(SITE_KEY),
    isTokenAutoRefreshEnabled: true
});

// Initialize Firestore and Auth
const db = getFirestore(app);
const auth = getAuth(app);

// ==================== IMGBB UPLOAD ====================

let imgbbApiKey = null;

// Carregar a chave da API do ImgBB do Firestore
async function getImgbbApiKey() {
    if (imgbbApiKey) return imgbbApiKey;
    
    try {
        const configRef = doc(db, 'config', 'api');
        const configDoc = await getDoc(configRef);
        
        if (configDoc.exists()) {
            imgbbApiKey = configDoc.data().imgbb_key_desafio_fotos;
            return imgbbApiKey;
        } else {
            console.error('Configuração da API não encontrada');
            return null;
        }
    } catch (error) {
        console.error('Erro ao carregar chave do ImgBB:', error);
        return null;
    }
}

// Upload de imagem para o ImgBB
async function uploadParaImgbb(imagemBase64) {
    try {
        const apiKey = await getImgbbApiKey();
        if (!apiKey) {
            throw new Error('API key do ImgBB não configurada');
        }
        
        const base64Data = imagemBase64.split(',')[1] || imagemBase64;
        
        const formData = new FormData();
        formData.append('key', apiKey);
        formData.append('image', base64Data);
        
        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            return {
                success: true,
                url: result.data.url,
                delete_url: result.data.delete_url,
                thumb: result.data.thumb
            };
        } else {
            throw new Error(result.error?.message || 'Erro no upload');
        }
        
    } catch (error) {
        console.error('Erro no upload para ImgBB:', error);
        throw error;
    }
}

// Export all necessary modules
export { 
    // Firebase instances
    db,      // ✅ db é exportado daqui (depois de criado)
    auth,
    appCheck,
    
    // Firestore functions
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit,
    doc,
    updateDoc,
    deleteDoc,
    getDoc,
    setDoc,
    serverTimestamp,
    
    // Auth functions
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    confirmPasswordReset,
    verifyPasswordResetCode,
    
    // ImgBB functions
    getImgbbApiKey,
    uploadParaImgbb
};
