import {
    db,
    auth,
    centralLoginsDb,
    centralLoginsAuth,
    configureOrganizationFirebase,
    getDoc,
    doc,
    signInWithEmailAndPassword,
    updateDoc,
    createUserWithEmailAndPassword,
    signOut,
    serverTimestamp
} from '../0_firebase_api_config.js';
import { deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { HomeManager } from './0_home.js';

const CARGOS_VALIDOS = ['paciente', 'nutricionista', 'psicologo'];
const LOGIN_EMAIL_DOMAIN = 'tratamentoweb.com.br';
const DEFAULT_RENDER_API_BASE_URL = 'https://backend-tratamentoweb.onrender.com';

export class LoginManager {
    constructor() {
        this.tempData = null;
        this.renderLoginScreen();
        this.setupEventListeners();
        this.checkAutoLogin();
        this.loadSavedCredentials();
    }

    renderLoginScreen() {
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <div class="login-wrapper">
                <div class="login-card">
                    <div class="login-header">
                        <div class="logo-container">
                            <img src="./imagens/logo.png" alt="TratamentoWeb" class="login-logo-img">
                        </div>
                    </div>

                    <form id="loginForm" class="login-form">
                        <div class="input-group-custom">
                            <div class="input-icon">
                                <i class="bi bi-building"></i>
                            </div>
                            <div class="input-field">
                                <input type="text" id="organizacao" placeholder=" " autocomplete="organization" list="organizacoesList">
                                <label>Organizacao</label>
                                <datalist id="organizacoesList">
                                    <option value="ORG_0001"></option>
                                </datalist>
                            </div>
                        </div>

                        <div class="input-group-custom">
                            <div class="input-icon">
                                <i class="bi bi-person"></i>
                            </div>
                            <div class="input-field">
                                <input type="text" id="login" placeholder=" " autocomplete="username">
                                <label>Login</label>
                            </div>
                        </div>

                        <div class="input-group-custom">
                            <div class="input-icon">
                                <i class="bi bi-lock"></i>
                            </div>
                            <div class="input-field">
                                <input type="password" id="password" placeholder=" " autocomplete="current-password">
                                <label>Senha / Codigo</label>
                            </div>
                            <div class="input-icon password-toggle" id="togglePassword">
                                <i class="bi bi-eye-slash"></i>
                            </div>
                        </div>

                        <div class="login-options">
                            <label class="checkbox-custom">
                                <input type="checkbox" id="rememberLogin">
                                <span class="checkmark"></span>
                                <span class="checkbox-text">Lembrar meus dados</span>
                            </label>
                            <a href="#" id="forgotPasswordLink" class="forgot-password">Esqueci minha senha</a>
                        </div>

                        <button type="submit" class="login-button">
                            <i class="bi bi-box-arrow-in-right"></i>
                            Entrar
                        </button>
                    </form>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        loginForm?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.handleLogin();
        });

        document.getElementById('forgotPasswordLink')?.addEventListener('click', (event) => {
            event.preventDefault();
            this.showPasswordResetDialog();
        });

        this.setupPasswordToggle('togglePassword', 'password');
        this.setupFloatingLabels();
    }

    setupFloatingLabels() {
        document.querySelectorAll('.input-field input').forEach((input) => {
            input.addEventListener('focus', () => input.parentElement.classList.add('focused'));
            input.addEventListener('blur', () => {
                if (!input.value) input.parentElement.classList.remove('focused');
            });
            if (input.value) input.parentElement.classList.add('focused');
        });
    }

    setupPasswordToggle(toggleId, inputId) {
        const toggle = document.getElementById(toggleId);
        const input = document.getElementById(inputId);
        if (!toggle || !input) return;

        toggle.addEventListener('click', () => {
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);

            const icon = toggle.querySelector('i');
            icon?.classList.toggle('bi-eye');
            icon?.classList.toggle('bi-eye-slash');
        });
    }

    loadSavedCredentials() {
        if (localStorage.getItem('rememberLogin') !== 'true') return;

        const values = {
            organizacao: localStorage.getItem('savedOrganizacao') || '',
            login: localStorage.getItem('savedLogin') || '',
            password: localStorage.getItem('savedPassword') || ''
        };

        if (!values.login || !values.password) return;

        document.getElementById('organizacao').value = values.organizacao;
        document.getElementById('login').value = values.login;
        document.getElementById('password').value = values.password;
        document.getElementById('rememberLogin').checked = true;
        setTimeout(() => this.setupFloatingLabels(), 100);
    }

    checkAutoLogin() {
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) return;

        try {
            const user = JSON.parse(savedUser);
            if (!this.isCargoValido(user.cargo)) {
                localStorage.removeItem('currentUser');
                return;
            }

            this.showHome(user);
        } catch (error) {
            localStorage.removeItem('currentUser');
        }
    }

    isCargoValido(cargo) {
        return CARGOS_VALIDOS.includes(cargo);
    }

    getMensagemCargoInvalido(cargo) {
        return `Cargo invalido: ${cargo}`;
    }

    normalizeOrganizacao(organizacao) {
        return String(organizacao || '').trim().toUpperCase();
    }

    normalizeLogin(login) {
        return String(login || '').trim().toLowerCase();
    }

    montarEmailAuth(organizacao, login) {
        return `${this.normalizeOrganizacao(organizacao)}-${this.normalizeLogin(login)}@${LOGIN_EMAIL_DOMAIN}`.toLowerCase();
    }

    getRenderApiBaseUrl() {
        return (
            window.TRATAMENTOWEB_API_BASE_URL ||
            localStorage.getItem('tratamentowebApiBaseUrl') ||
            DEFAULT_RENDER_API_BASE_URL
        ).replace(/\/$/, '');
    }

    async buscarConfigFirebaseOrganizacao(organizacao, idToken) {
        const apiBaseUrl = this.getRenderApiBaseUrl();

        if (apiBaseUrl) {
            const response = await fetch(`${apiBaseUrl}/api/auth/organization-config/${encodeURIComponent(organizacao)}`, {
                headers: { Authorization: `Bearer ${idToken}` }
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.message || 'Nao foi possivel carregar a configuracao da organizacao no Render.');
            }

            return result.firebaseConfig;
        }

        throw new Error('Configure a URL do backend Render em window.TRATAMENTOWEB_API_BASE_URL ou localStorage.tratamentowebApiBaseUrl.');
    }

    async validarLoginGeral(organizacao, login) {
        const orgRef = doc(centralLoginsDb, 'logins_geral', organizacao);
        const orgDoc = await getDoc(orgRef);

        if (!orgDoc.exists()) {
            throw new Error('Organizacao nao encontrada ou sem permissao de acesso.');
        }

        const orgData = orgDoc.data();
        if (orgData.status_ativo_org !== true) {
            throw new Error('Organizacao desativada. Contate o administrador.');
        }

        const loginsOrg = orgData.logins_org || {};
        const loginData = loginsOrg[login] || login.split('.').reduce((current, part) => current?.[part], loginsOrg);
        if (!loginData) {
            throw new Error(`Login ${login} nao cadastrado em logins_geral/${organizacao}/logins_org.`);
        }

        if (loginData.status_ativo_login !== true) {
            throw new Error('Login desativado nesta organizacao. Contate o administrador.');
        }

        return loginData;
    }

    async handleLogin() {
        const organizacao = this.normalizeOrganizacao(document.getElementById('organizacao')?.value);
        const login = this.normalizeLogin(document.getElementById('login')?.value);
        const password = document.getElementById('password')?.value;
        const rememberCheckbox = document.getElementById('rememberLogin');

        if (!organizacao || !login || !password) {
            this.showError('Preencha organizacao, login e senha.');
            return;
        }

        const submitBtn = document.querySelector('.login-button');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Entrando...';
        submitBtn.disabled = true;

        try {
            const emailMontado = this.montarEmailAuth(organizacao, login);

            const generalCredential = await signInWithEmailAndPassword(centralLoginsAuth, emailMontado, password);
            const generalIdToken = await generalCredential.user.getIdToken();

            await this.validarLoginGeral(organizacao, login);

            const organizationFirebaseConfig = await this.buscarConfigFirebaseOrganizacao(organizacao, generalIdToken);
            configureOrganizationFirebase(organizationFirebaseConfig, organizacao);

            await signInWithEmailAndPassword(auth, emailMontado, password);

            const userRef = doc(db, 'logins', login);
            let userDoc;

            try {
                userDoc = await getDoc(userRef);
            } catch (error) {
                if (String(error.message || '').includes('permissions')) {
                    throw new Error(`Sem permissao para ler logins/${login} no Firestore da organizacao. Ajuste as regras do projeto Firebase da organizacao.`);
                }
                throw error;
            }

            if (!userDoc.exists()) {
                await this.signOutAll();
                this.showError('Dados do usuario nao encontrados no banco da organizacao. Contate o administrador.');
                return;
            }

            const userData = userDoc.data();

            if (userData.status_ativo === false) {
                await this.signOutAll();
                this.showError('Conta desativada. Contate o administrador.');
                return;
            }

            if (!this.isCargoValido(userData.cargo)) {
                await this.signOutAll();
                this.showError(this.getMensagemCargoInvalido(userData.cargo));
                return;
            }

            const isPaciente = userData.cargo === 'paciente';
            const hasPrimeiroAcesso = Object.prototype.hasOwnProperty.call(userData, 'ultimo_login');

            if (isPaciente && !hasPrimeiroAcesso) {
                await this.signOutAll();

                if (password !== userData.codigo_temporario) {
                    this.showError('Codigo temporario invalido.');
                    return;
                }

                if (new Date(userData.codigo_expiracao) < new Date()) {
                    this.showError('Codigo expirado. Solicite um novo codigo.');
                    return;
                }

                this.tempData = {
                    organizacao,
                    login,
                    email: emailMontado,
                    nome: userData.nome,
                    cargo: userData.cargo,
                    perfil: userData.perfil,
                    userRef
                };

                this.showCreatePasswordScreen();
                return;
            }

            try {
                await updateDoc(userRef, { ultimo_login: serverTimestamp() });
            } catch (_error) {}

            const sessionUser = {
                ...userData,
                login,
                email: emailMontado,
                organizacao,
                perfil: userData.perfil || (isPaciente ? 'operador' : 'supervisor')
            };

            this.saveRememberedCredentials(rememberCheckbox?.checked, organizacao, login, password);
            localStorage.setItem('currentUser', JSON.stringify(sessionUser));
            this.showHome(sessionUser);
        } catch (error) {

            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                this.showError('Login ou senha incorretos.');
            } else if (error.code === 'auth/user-not-found') {
                this.showError('Login nao encontrado no Auth geral desta organizacao.');
            } else if (String(error.message || '').includes('permissions')) {
                this.showError('Erro de permissao no banco de dados. Contate o administrador.');
            } else {
                this.showError(error.message || 'Erro ao realizar login.');
            }
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async signOutAll() {
        await Promise.allSettled([
            signOut(auth),
            signOut(centralLoginsAuth)
        ]);
    }

    saveRememberedCredentials(remember, organizacao, login, password) {
        if (remember) {
            localStorage.setItem('savedOrganizacao', organizacao);
            localStorage.setItem('savedLogin', login);
            localStorage.setItem('savedPassword', password);
            localStorage.setItem('rememberLogin', 'true');
            return;
        }

        localStorage.removeItem('savedOrganizacao');
        localStorage.removeItem('savedLogin');
        localStorage.removeItem('savedPassword');
        localStorage.setItem('rememberLogin', 'false');
    }

    showCreatePasswordScreen() {
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <div class="login-wrapper">
                <div class="login-card">
                    <div class="login-header">
                        <div class="logo-container">
                            <img src="./imagens/logo.png" alt="TratamentoWeb" class="login-logo-img">
                        </div>
                        <h2>Primeiro Acesso</h2>
                        <p>Ola, <strong>${this.tempData.nome || this.tempData.login}</strong>!</p>
                        <p>Cadastre sua senha pessoal para continuar.</p>
                    </div>

                    <form id="createPasswordForm" class="login-form">
                        <div class="info-box" style="background: #e8eaf6; padding: 12px; border-radius: 12px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                            <i class="bi bi-info-circle" style="color: #1a237e;"></i>
                            <span style="font-size: 13px; color: #1a237e;">Crie uma senha forte e segura para suas proximas visitas.</span>
                        </div>

                        <div class="input-group-custom">
                            <div class="input-icon">
                                <i class="bi bi-shield-lock"></i>
                            </div>
                            <div class="input-field">
                                <input type="password" id="newPassword" placeholder=" " required>
                                <label>Nova Senha</label>
                            </div>
                            <div class="input-icon password-toggle" id="toggleNewPassword">
                                <i class="bi bi-eye-slash"></i>
                            </div>
                        </div>

                        <div class="input-group-custom">
                            <div class="input-icon">
                                <i class="bi bi-shield-check"></i>
                            </div>
                            <div class="input-field">
                                <input type="password" id="confirmPassword" placeholder=" " required>
                                <label>Confirmar Senha</label>
                            </div>
                            <div class="input-icon password-toggle" id="toggleConfirmPassword">
                                <i class="bi bi-eye-slash"></i>
                            </div>
                        </div>

                        <button type="submit" class="login-button">
                            <i class="bi bi-check-circle"></i>
                            Cadastrar Senha e Entrar
                        </button>
                    </form>
                </div>
            </div>
        `;

        this.setupCreatePasswordEvents();
    }

    setupCreatePasswordEvents() {
        const form = document.getElementById('createPasswordForm');
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');

        this.setupPasswordToggle('toggleNewPassword', 'newPassword');
        this.setupPasswordToggle('toggleConfirmPassword', 'confirmPassword');
        this.setupFloatingLabels();

        form?.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (newPassword.value !== confirmPassword.value) {
                this.showError('As senhas nao coincidem.', 'createPasswordForm');
                return;
            }

            if (newPassword.value.length < 6) {
                this.showError('A senha deve ter no minimo 6 caracteres.', 'createPasswordForm');
                return;
            }

            try {
                await createUserWithEmailAndPassword(auth, this.tempData.email, newPassword.value);
                await updateDoc(this.tempData.userRef, {
                    ultimo_login: serverTimestamp(),
                    codigo_temporario: deleteField(),
                    codigo_expiracao: deleteField(),
                    email: this.tempData.email
                });

                const updatedDoc = await getDoc(this.tempData.userRef);
                const userData = updatedDoc.data();
                const sessionUser = {
                    ...userData,
                    login: this.tempData.login,
                    email: this.tempData.email,
                    organizacao: this.tempData.organizacao,
                    perfil: userData.perfil || 'operador'
                };

                localStorage.setItem('currentUser', JSON.stringify(sessionUser));
                this.showHome(sessionUser);
            } catch (error) {

                if (error.code === 'auth/email-already-in-use') {
                    this.showError('Este login ja possui cadastro. Contate o administrador.', 'createPasswordForm');
                } else if (error.code === 'auth/weak-password') {
                    this.showError('Senha muito fraca. Use pelo menos 6 caracteres.', 'createPasswordForm');
                } else {
                    this.showError('Erro ao criar conta: ' + error.message, 'createPasswordForm');
                }
            }
        });
    }

    showPasswordResetDialog() {
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <div class="login-wrapper">
                <div class="login-card">
                    <div class="login-header">
                        <div class="logo-container">
                            <img src="./imagens/logo.png" alt="TratamentoWeb" class="login-logo-img">
                        </div>
                        <h2>Recuperar Senha</h2>
                        <p>Para recuperar sua senha, entre em contato com o profissional responsavel.</p>
                        <p>Ele podera gerar uma nova senha temporaria para voce.</p>
                    </div>

                    <form id="resetForm" class="login-form">
                        <button type="button" id="backToLoginBtn" class="login-button">
                            <i class="bi bi-arrow-left"></i>
                            Voltar ao Login
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('backToLoginBtn')?.addEventListener('click', () => {
            this.renderLoginScreen();
            this.setupEventListeners();
            this.loadSavedCredentials();
        });
    }

    showError(message, formId = 'loginForm') {
        document.querySelector('.error-message-custom')?.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message-custom';
        errorDiv.innerHTML = `
            <i class="bi bi-exclamation-triangle-fill"></i>
            <span>${message}</span>
        `;

        const form = document.getElementById(formId);
        if (form) {
            const button = form.querySelector('button');
            if (button) {
                form.insertBefore(errorDiv, button);
            } else {
                form.appendChild(errorDiv);
            }
        }

        setTimeout(() => errorDiv.remove(), 5000);
    }

    showHome(userData) {
        document.body.classList.remove('profile-paciente', 'profile-profissional');
        document.body.classList.add(userData.cargo === 'paciente' ? 'profile-paciente' : 'profile-profissional');

        const homeManager = new HomeManager(userData);
        homeManager.render();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});
