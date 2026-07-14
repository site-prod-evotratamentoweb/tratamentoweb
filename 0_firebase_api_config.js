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
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseApps = new Map();
const firebaseAppChecks = new Map();

function getOrCreateFirebaseApp(name, config) {
    if (firebaseApps.has(name)) {
        return firebaseApps.get(name);
    }

    const firebaseApp = initializeApp(config, name);
    firebaseApps.set(name, firebaseApp);
    return firebaseApp;
}

let app = null;
let appCheck = null;
let db = null;
let auth = null;

function configureOrganizationFirebase(organizationFirebaseConfig, organizationId = 'org') {
    if (!organizationFirebaseConfig?.apiKey || !organizationFirebaseConfig?.projectId) {
        throw new Error('Configuracao Firebase da organizacao invalida.');
    }

    const appName = `org-${organizationId}-${organizationFirebaseConfig.projectId}`.replace(/[^a-zA-Z0-9-_]/g, '-');
    app = getOrCreateFirebaseApp(appName, organizationFirebaseConfig);

    const appCheckSiteKey = organizationFirebaseConfig.appCheckSiteKey || organizationFirebaseConfig.recaptchaSiteKey;
    if (appCheckSiteKey && !firebaseAppChecks.has(appName)) {
        appCheck = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(appCheckSiteKey),
            isTokenAutoRefreshEnabled: true
        });
        firebaseAppChecks.set(appName, appCheck);
    } else {
        appCheck = firebaseAppChecks.get(appName) || null;
    }

    db = getFirestore(app);
    auth = getAuth(app);

    return { app, db, auth };
}

const DEFAULT_RENDER_API_BASE_URL = 'https://backend-tratamentoweb.onrender.com';

function getRenderApiBaseUrl() {
    return (
        window.TRATAMENTOWEB_API_BASE_URL ||
        localStorage.getItem('tratamentowebApiBaseUrl') ||
        DEFAULT_RENDER_API_BASE_URL
    ).replace(/\/$/, '');
}

function getSessionAuthToken() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return currentUser.authToken || currentUser.idToken || currentUser.token || '';
    } catch (_error) {
        return '';
    }
}

async function uploadParaImgbb(imagemBase64) {
    try {
        const token = getSessionAuthToken();
        if (!token) {
            throw new Error('Sessao expirada. Faca login novamente.');
        }

        const response = await fetch(`${getRenderApiBaseUrl()}/api/uploads/imgbb`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ image: imagemBase64 })
        });

        const result = await response.json().catch(() => ({}));

        if (response.ok && result.success) {
            return result;
        }

        throw new Error(result.error?.message || 'Erro no upload');
    } catch (error) {
        throw error;
    }
}

async function apiAutenticada(caminho, options = {}) {
    const token = getSessionAuthToken();
    if (!token) throw new Error('Sessão expirada. Faça login novamente.');
    const organizationToken = await auth?.currentUser?.getIdToken();
    const response = await fetch(`${getRenderApiBaseUrl()}${caminho}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(organizationToken ? { 'X-Organization-Token': organizationToken } : {}), ...(options.headers || {}) }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error?.message || 'Falha na comunicação com o servidor.');
    return result;
}

async function uploadParaCloudinary(file, onProgress = null) {
    const assinatura = await apiAutenticada('/api/uploads/cloudinary/signature', { method: 'POST', body: '{}' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', assinatura.apiKey);
    formData.append('timestamp', assinatura.timestamp);
    formData.append('folder', assinatura.folder);
    formData.append('signature', assinatura.signature);
    const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(assinatura.cloudName)}/auto/upload`;

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
        };
        xhr.onload = () => {
            const result = JSON.parse(xhr.responseText || '{}');
            if (xhr.status >= 200 && xhr.status < 300) resolve(result);
            else reject(new Error(result.error?.message || 'Falha ao enviar o arquivo ao Cloudinary.'));
        };
        xhr.onerror = () => reject(new Error('Falha de conexão durante o upload.'));
        xhr.send(formData);
    });
}

async function excluirDoCloudinary(publicId, resourceType) {
    return apiAutenticada('/api/uploads/cloudinary', {
        method: 'DELETE',
        body: JSON.stringify({ publicId, resourceType })
    });
}

export {
    db,
    auth,
    app,
    appCheck,
    configureOrganizationFirebase,

    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    updateDoc,
    deleteDoc,
    getDoc,
    setDoc,
    serverTimestamp,

    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,

    uploadParaImgbb,
    uploadParaCloudinary,
    excluirDoCloudinary
};
