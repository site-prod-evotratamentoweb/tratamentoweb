// Firebase Configuration File
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
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

const firebaseApps = new Map();

const firebaseCentralLoginsConfig = {
    apiKey: "AIzaSyAiUrqXBB2i0SOkjTMPH_JAbQUBMlHGoiM",
    authDomain: "tratamentoweb-logins.firebaseapp.com",
    projectId: "tratamentoweb-logins",
    storageBucket: "tratamentoweb-logins.firebasestorage.app",
    messagingSenderId: "41126296955",
    appId: "1:41126296955:web:e92d527090632db54ad1de"
};

const firebaseConfig = {
    apiKey: "AIzaSyB8tkMR4kx_c4Hj9TNf0EPTEwWMEQc-oDs",
    authDomain: "tratamentoweb.firebaseapp.com",
    projectId: "tratamentoweb",
    storageBucket: "tratamentoweb.firebasestorage.app",
    messagingSenderId: "894728971208",
    appId: "1:894728971208:web:52278dc3754180626c16fd"
};

function getOrCreateFirebaseApp(name, config) {
    if (firebaseApps.has(name)) {
        return firebaseApps.get(name);
    }

    const firebaseApp = initializeApp(config, name);
    firebaseApps.set(name, firebaseApp);
    return firebaseApp;
}

const centralLoginsApp = getOrCreateFirebaseApp('central-logins', firebaseCentralLoginsConfig);
const centralLoginsDb = getFirestore(centralLoginsApp);
const centralLoginsAuth = getAuth(centralLoginsApp);

let app = getOrCreateFirebaseApp('org-default', firebaseConfig);

let appCheck = null;

let db = getFirestore(app);
let auth = getAuth(app);

function configureOrganizationFirebase(organizationFirebaseConfig, organizationId = 'org') {
    if (!organizationFirebaseConfig?.apiKey || !organizationFirebaseConfig?.projectId) {
        throw new Error('Configuracao Firebase da organizacao invalida.');
    }

    const appName = `org-${organizationId}-${organizationFirebaseConfig.projectId}`.replace(/[^a-zA-Z0-9-_]/g, '-');
    app = getOrCreateFirebaseApp(appName, organizationFirebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    imgbbApiKey = null;

    return { app, db, auth };
}

// ==================== IMGBB UPLOAD ====================

let imgbbApiKey = null;

async function getImgbbApiKey() {
    if (imgbbApiKey) return imgbbApiKey;

    try {
        const configRef = doc(db, 'config', 'api');
        const configDoc = await getDoc(configRef);

        if (configDoc.exists()) {
            imgbbApiKey = configDoc.data().imgbb_key_desafio_fotos;
            return imgbbApiKey;
        }

        console.error('Configuracao da API nao encontrada');
        return null;
    } catch (error) {
        console.error('Erro ao carregar chave do ImgBB:', error);
        return null;
    }
}

async function uploadParaImgbb(imagemBase64) {
    try {
        const apiKey = await getImgbbApiKey();
        if (!apiKey) {
            throw new Error('API key do ImgBB nao configurada');
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
        }

        throw new Error(result.error?.message || 'Erro no upload');
    } catch (error) {
        console.error('Erro no upload para ImgBB:', error);
        throw error;
    }
}

export {
    db,
    auth,
    app,
    centralLoginsDb,
    centralLoginsAuth,
    appCheck,
    firebaseCentralLoginsConfig,
    configureOrganizationFirebase,

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

    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    confirmPasswordReset,
    verifyPasswordResetCode,

    getImgbbApiKey,
    uploadParaImgbb
};
