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

    uploadParaImgbb
};
