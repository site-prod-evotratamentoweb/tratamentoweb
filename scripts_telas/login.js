import {
    db,
    auth,
    configureOrganizationFirebase,
    getDoc,
    doc,
    signInWithEmailAndPassword,
    updateDoc,
    signOut,
    serverTimestamp
} from '../0_firebase_api_config.js';
import { deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { HomeManager, FuncoesCompartilhadas } from './0_home.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';

const CARGOS_VALIDOS = ['paciente', 'nutricionista', 'psicologo'];
const LOGIN_EMAIL_DOMAIN = 'tratamentoweb.com.br';
const DEFAULT_RENDER_API_BASE_URL = 'https://backend-tratamentoweb.onrender.com';
const FIRST_ACCESS_ALREADY_COMPLETED_MESSAGE = 'Este login já existe e o primeiro acesso já foi realizado. Caso necessário, entre em contato com o administrador para resetar o acesso.';
// Encerra a sessao antes do token central do Firebase (1 hora) expirar.
const SESSION_DURATION_MS = 50 * 60 * 1000;

export class LoginManager {
    constructor() {
        this.tempData = null;
        this.sessionTimerId = null;
        this.isFirstAccessRoute = /^\/primeiro-acesso(?:\/index\.html)?\/?$/.test(window.location.pathname);
        this.isLoginRoute = /^\/login(?:\/index\.html)?\/?$/.test(window.location.pathname);
        if (this.isFirstAccessRoute) {
            this.renderFirstAccessScreen();
            this.setupFirstAccessEvents();
            this.loadFirstAccessDefaults();
        } else if (this.isLoginRoute) {
            this.renderLoginScreen();
            this.setupEventListeners();
            this.loadSavedCredentials();
            this.showPendingLoginNotice();
        } else {
            this.renderWelcomeScreen();
        }
        void this.loadPublicContacts();
        this.ativarKeepAliveBackend();
        this.checkAutoLogin();
    }

    renderWelcomeScreen() {
        const app = document.getElementById('app');
        if (!app) return;

        document.body.classList.remove('profile-paciente', 'profile-profissional');
        document.body.classList.add('landing-page');

        app.innerHTML = `
            <div class="marketing-page">
                <a class="marketing-skip-link" href="#conteudo-principal">Ir para o conteúdo</a>

                <header class="marketing-header">
                    <div class="marketing-shell marketing-nav-wrap">
                        <a href="/" class="marketing-brand" aria-label="TratamentoWeb - início">
                            <img src="/imagens/logo.png" alt="TratamentoWeb">
                        </a>
                        <nav class="marketing-nav" aria-label="Navegação principal">
                            <a href="#experiencia">Experiência</a>
                            <a href="#recursos">Recursos</a>
                            <a href="#para-profissionais">Para profissionais</a>
                        </nav>
                        <div class="marketing-nav-actions">
                            <a href="#contato" class="marketing-nav-contact" data-whatsapp-contact="comercial" hidden>
                                <i class="bi bi-whatsapp" aria-hidden="true"></i>
                                Contato comercial
                            </a>
                            <a href="/login" class="marketing-login-link">Entrar</a>
                        </div>
                    </div>
                </header>

                <main id="conteudo-principal">
                    <section class="marketing-hero">
                        <div class="marketing-shell marketing-hero-grid">
                            <div class="marketing-hero-copy">
                                <span class="marketing-eyebrow">
                                    <i class="bi bi-stars" aria-hidden="true"></i>
                                    Cuidado digital que aproxima
                                </span>
                                <h1>Transforme o acompanhamento em uma jornada que engaja.</h1>
                                <p>O TratamentoWeb conecta profissionais e pacientes em uma experiência personalizada, imersiva e contínua — com gamificação e suporte de IA.</p>
                                <div class="marketing-hero-actions">
                                    <a href="#experiencia" class="marketing-button marketing-button-primary">
                                        Conhecer a experiência
                                        <i class="bi bi-arrow-down-right" aria-hidden="true"></i>
                                    </a>
                                    <a href="/login" class="marketing-button marketing-button-secondary">
                                        <i class="bi bi-box-arrow-in-right" aria-hidden="true"></i>
                                        Entrar na plataforma
                                    </a>
                                </div>
                                <div class="marketing-audience" aria-label="Feito para profissionais e pacientes">
                                    <span><i class="bi bi-heart-pulse" aria-hidden="true"></i> Nutricionistas</span>
                                    <span><i class="bi bi-chat-heart" aria-hidden="true"></i> Psicólogos</span>
                                    <span><i class="bi bi-people" aria-hidden="true"></i> Pacientes</span>
                                </div>
                            </div>
                            <div class="marketing-hero-visual">
                                <img src="/imagens/landing/atendimento-digital.jpg" alt="Profissional de saúde realizando atendimento digital" fetchpriority="high">
                                <div class="marketing-floating-card marketing-floating-card-top">
                                    <span class="marketing-floating-icon"><i class="bi bi-camera-video" aria-hidden="true"></i></span>
                                    <div><strong>Atendimento digital</strong><small>Mais proximidade, onde estiver</small></div>
                                </div>
                                <div class="marketing-floating-card marketing-floating-card-bottom">
                                    <span class="marketing-floating-icon is-orange"><i class="bi bi-trophy" aria-hidden="true"></i></span>
                                    <div><strong>Jornada ativa</strong><small>Experiências que estimulam constância</small></div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section class="marketing-value-strip" aria-label="Benefícios da plataforma">
                        <div class="marketing-shell marketing-value-grid">
                            <article><i class="bi bi-person-check" aria-hidden="true"></i><div><strong>Cuidado personalizado</strong><span>Jornadas adaptadas a cada paciente.</span></div></article>
                            <article><i class="bi bi-controller" aria-hidden="true"></i><div><strong>Engajamento real</strong><span>Desafios e conquistas no dia a dia.</span></div></article>
                            <article><i class="bi bi-cpu" aria-hidden="true"></i><div><strong>IA como suporte</strong><span>Tecnologia para enriquecer a experiência.</span></div></article>
                        </div>
                    </section>

                    <section class="marketing-section marketing-intro" id="experiencia">
                        <div class="marketing-shell">
                            <div class="marketing-section-heading">
                                <span class="marketing-kicker">Muito além da consulta</span>
                                <h2>Uma experiência que continua depois do atendimento.</h2>
                                <p>O plano sai da tela e entra na rotina. Cada interação ajuda o paciente a manter o foco, perceber sua evolução e se aproximar do profissional.</p>
                            </div>
                            <div class="marketing-experience-grid" id="recursos">
                                <article class="marketing-feature-card">
                                    <div class="marketing-feature-image">
                                        <img src="/imagens/landing/gamificacao-saude.jpg" alt="Pessoa comemorando uma conquista na experiência gamificada do aplicativo" loading="lazy">
                                        <span class="marketing-feature-number">01</span>
                                    </div>
                                    <div class="marketing-feature-copy">
                                        <span class="marketing-feature-label"><i class="bi bi-trophy" aria-hidden="true"></i> Gamificação</span>
                                        <h3>Pequenas conquistas que mantêm o paciente em movimento.</h3>
                                        <p>Pontos, metas e evolução visual tornam o cuidado mais participativo e incentivam a constância entre os atendimentos.</p>
                                    </div>
                                </article>

                                <article class="marketing-feature-card is-reversed">
                                    <div class="marketing-feature-image">
                                        <img src="/imagens/landing/desafio-camera-ia.jpg" alt="Pessoa usando a câmera do celular em um desafio de hábitos com suporte de IA" loading="lazy">
                                        <span class="marketing-feature-number">02</span>
                                    </div>
                                    <div class="marketing-feature-copy">
                                        <span class="marketing-feature-label"><i class="bi bi-camera" aria-hidden="true"></i> Câmera + IA</span>
                                        <h3>Desafios imersivos conectados à vida real.</h3>
                                        <p>O paciente usa a câmera para registrar desafios. A IA apoia a experiência, enquanto o profissional permanece no centro do acompanhamento.</p>
                                    </div>
                                </article>

                                <article class="marketing-feature-card">
                                    <div class="marketing-feature-image">
                                        <img src="/imagens/landing/shopping-trocas.jpg" alt="Pessoa escolhendo uma recompensa no shopping de trocas pelo celular" loading="lazy">
                                        <span class="marketing-feature-number">03</span>
                                    </div>
                                    <div class="marketing-feature-copy">
                                        <span class="marketing-feature-label"><i class="bi bi-bag-heart" aria-hidden="true"></i> Shopping de trocas</span>
                                        <h3>Engajamento que pode virar recompensa.</h3>
                                        <p>Os pontos conquistados ganham significado no shopping de trocas, criando uma experiência positiva de reconhecimento e continuidade.</p>
                                    </div>
                                </article>
                            </div>
                        </div>
                    </section>

                    <section class="marketing-professionals" id="para-profissionais">
                        <div class="marketing-shell marketing-professionals-grid">
                            <div class="marketing-professionals-copy">
                                <span class="marketing-kicker is-light">Sua prática, mais presente</span>
                                <h2>Feito para profissionais que querem atender de forma web e personalizada.</h2>
                                <p>Nutricionistas e psicólogos ganham um ambiente para aproximar o cuidado da rotina dos pacientes, criar experiências próprias e acompanhar cada jornada com mais contexto.</p>
                                <ul class="marketing-check-list">
                                    <li><i class="bi bi-check2" aria-hidden="true"></i><span><strong>Personalização de verdade</strong> para respeitar a estratégia de cada profissional.</span></li>
                                    <li><i class="bi bi-check2" aria-hidden="true"></i><span><strong>Imersão e continuidade</strong> para manter o paciente conectado ao processo.</span></li>
                                    <li><i class="bi bi-check2" aria-hidden="true"></i><span><strong>Suporte de inteligência artificial</strong> sem tirar o profissional do centro.</span></li>
                                </ul>
                            </div>
                            <aside class="marketing-contact-card" id="contato">
                                <span class="marketing-contact-icon"><i class="bi bi-whatsapp" aria-hidden="true"></i></span>
                                <span class="marketing-contact-overline">Contato comercial</span>
                                <h3>Quer levar essa experiência aos seus pacientes?</h3>
                                <p>Converse com nossa equipe e descubra como o TratamentoWeb pode apoiar o seu modelo de atendimento.</p>
                                <a href="#contato" class="marketing-contact-button" data-whatsapp-contact="comercial" hidden>
                                    Falar com um especialista
                                    <i class="bi bi-arrow-up-right" aria-hidden="true"></i>
                                </a>
                                <small>Atendimento pelo WhatsApp</small>
                            </aside>
                        </div>
                    </section>

                    <section class="marketing-final-cta">
                        <div class="marketing-shell marketing-final-cta-inner">
                            <div>
                                <span>Já faz parte do TratamentoWeb?</span>
                                <h2>Sua jornada continua por aqui.</h2>
                            </div>
                            <div class="marketing-final-actions">
                                <a href="/login" class="marketing-button marketing-button-primary">Entrar</a>
                                <a href="/primeiro-acesso" class="marketing-first-access">Fazer primeiro acesso <i class="bi bi-arrow-right" aria-hidden="true"></i></a>
                            </div>
                        </div>
                    </section>
                </main>

                <footer class="marketing-footer">
                    <div class="marketing-shell marketing-footer-inner">
                        <img src="/imagens/logo.png" alt="TratamentoWeb">
                        <p>Saúde, tecnologia e conexão em uma experiência feita para pessoas.</p>
                        <div>
                            <a href="/login">Entrar</a>
                            <a href="/primeiro-acesso">Primeiro acesso</a>
                        </div>
                    </div>
                </footer>
            </div>
        `;
    }

    renderLoginScreen() {
        const app = document.getElementById('app');
        if (!app) return;

        document.body.classList.remove('landing-page');

        app.innerHTML = `
            <div class="login-wrapper">
                <div class="login-card">
                    <div class="login-header">
                        <div class="logo-container">
                            <img src="/imagens/logo.png" alt="TratamentoWeb" class="login-logo-img">
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
                                <label>Senha</label>
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

                        <div style="text-align:center; margin-bottom:16px;">
                            <a href="/primeiro-acesso" class="forgot-password">Primeiro acesso</a>
                        </div>

                        <button type="submit" class="login-button">
                            <i class="bi bi-box-arrow-in-right"></i>
                            Entrar
                        </button>
                        <a href="#" class="contact-button" data-whatsapp-contact="suporte" hidden>
                            <i class="bi bi-whatsapp"></i>
                            Contato ao Suporte
                        </a>
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

    async loadPublicContacts() {
        try {
            const apiBaseUrl = (
                window.TRATAMENTOWEB_API_BASE_URL ||
                localStorage.getItem('tratamentowebApiBaseUrl') ||
                DEFAULT_RENDER_API_BASE_URL
            ).replace(/\/$/, '');
            const response = await fetch(`${apiBaseUrl}/api/public/contacts`, {
                method: 'GET',
                cache: 'no-store',
                credentials: 'omit'
            });
            if (!response.ok) return;
            const contacts = await response.json().catch(() => ({}));
            const contactMap = {
                comercial: contacts.whatsapp_comercial,
                suporte: contacts.whatsapp_suporte
            };

            document.querySelectorAll('[data-whatsapp-contact]').forEach((link) => {
                const type = link.getAttribute('data-whatsapp-contact');
                const digits = String(contactMap[type] || '').replace(/\D/g, '');
                if (!/^55\d{10,11}$/.test(digits)) return;
                const message = type === 'comercial'
                    ? 'Olá! Sou profissional de saúde e gostaria de conhecer o TratamentoWeb para atender meus pacientes de forma digital e personalizada.'
                    : 'Ola! Preciso de suporte no TratamentoWeb.';
                link.href = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.hidden = false;
            });
        } catch (_error) {}
    }

    showPendingLoginNotice() {
        const message = sessionStorage.getItem('loginNotice');
        if (!message) return;
        sessionStorage.removeItem('loginNotice');
        this.showTemporaryPopup(message);
    }

    showTemporaryPopup(message) {
        document.querySelector('.temporary-login-popup')?.remove();
        const popup = document.createElement('div');
        popup.className = 'temporary-login-popup';
        popup.setAttribute('role', 'status');
        popup.innerHTML = `<i class="bi bi-info-circle-fill"></i><span>${message}</span>`;
        document.body.appendChild(popup);
        window.setTimeout(() => popup.classList.add('is-leaving'), 2600);
        window.setTimeout(() => popup.remove(), 3000);
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
            password: ''
        };

        localStorage.removeItem('savedPassword');

        if (!values.login) return;

        document.getElementById('organizacao').value = values.organizacao;
        document.getElementById('login').value = values.login;
        document.getElementById('rememberLogin').checked = true;
        setTimeout(() => this.setupFloatingLabels(), 100);
    }

    checkAutoLogin() {
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) return;

        try {
            const user = JSON.parse(savedUser);
            if (!this.isCargoValido(user.cargo)) {
                this.clearSessionState();
                return;
            }

            const storedExpiresAt = new Date(
                user.sessionExpiresAt || localStorage.getItem('sessionExpiresAt') || ''
            ).getTime();
            const sessionCreatedAt = new Date(
                user.sessionCreatedAt || localStorage.getItem('sessionCreatedAt') || ''
            ).getTime();
            const maximumExpiresAt = sessionCreatedAt + SESSION_DURATION_MS;
            const expiresAt = new Date(Math.min(storedExpiresAt, maximumExpiresAt)).toISOString();
            if (!this.isSessionValid(expiresAt)) {
                this.expirarSessao();
                return;
            }

            if (this.isFirstAccessRoute) {
                this.clearSessionState();
                sessionStorage.setItem('loginNotice', FIRST_ACCESS_ALREADY_COMPLETED_MESSAGE);
                void signOut(auth).finally(() => window.location.replace('/login'));
                return;
            }

            if (this.isLoginRoute) window.history.replaceState({}, '', '/');
            user.sessionExpiresAt = expiresAt;
            localStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('sessionExpiresAt', expiresAt);
            this.iniciarTimerSessao(expiresAt);
            void this.showHome(user).catch(() => {
                this.clearSessionState();
                window.location.replace('/login');
            });
        } catch (error) {
            this.clearSessionState();
        }
    }

    isSessionValid(expiresAt) {
        if (!expiresAt) return false;
        const expiracao = new Date(expiresAt).getTime();
        return Number.isFinite(expiracao) && expiracao > Date.now();
    }

    clearSessionState() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('activeModule');
        localStorage.removeItem('planoAlimentarSelectedPacienteLogin');
        localStorage.removeItem('sessionCreatedAt');
        localStorage.removeItem('sessionExpiresAt');
        this.pararTimerSessao();
    }

    pararTimerSessao() {
        if (this.sessionTimerId) {
            clearTimeout(this.sessionTimerId);
            this.sessionTimerId = null;
        }
    }

    ativarKeepAliveBackend() {
        const ping = async () => {
            try {
                const apiBaseUrl = (
                    window.TRATAMENTOWEB_API_BASE_URL ||
                    localStorage.getItem('tratamentowebApiBaseUrl') ||
                    DEFAULT_RENDER_API_BASE_URL
                ).replace(/\/$/, '');
                await fetch(`${apiBaseUrl}/health`, {
                    method: 'GET',
                    cache: 'no-store',
                    credentials: 'omit',
                    mode: 'cors'
                });
            } catch (_error) {}
        };

        void ping();
        this.keepAliveTimerId = setInterval(ping, 4 * 60 * 1000);
    }

    iniciarTimerSessao(expiresAt) {
        this.pararTimerSessao();
        const expiracao = new Date(expiresAt).getTime();
        const restante = expiracao - Date.now();
        if (!Number.isFinite(restante) || restante <= 0) {
            this.expirarSessao();
            return;
        }

        this.sessionTimerId = setTimeout(() => {
            this.expirarSessao();
        }, restante);
    }

    async expirarSessao() {
        this.clearSessionState();
        try {
            await signOut(auth);
        } catch (error) {}
        sessionStorage.setItem('loginNotice', 'Sessao expirada. Entre novamente.');
        window.location.replace('/login');
    }

    async validarUsuarioOrganizacaoEmBackground(userRef, sessionUser) {
        try {
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) {
                throw new Error('Dados do usuario nao encontrados no banco da organizacao.');
            }

            const userData = userDoc.data();
            if (!this.isCargoValido(userData.cargo)) {
                throw new Error('Conta desativada. Contate o administrador.');
            }

            const currentUser = this.montarUsuarioSessao(userData, sessionUser);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            void updateDoc(userRef, {
                ultimo_login: serverTimestamp(),
                status_ativo: deleteField()
            }).catch(() => {});
        } catch (error) {
            await this.signOutAll().catch(() => {});
            this.clearSessionState();
            sessionStorage.setItem('loginNotice', error.message || 'Nao foi possivel validar a conta.');
            window.location.replace('/login');
        }
    }

    isCargoValido(cargo) {
        return CARGOS_VALIDOS.includes(cargo);
    }

    getMensagemCargoInvalido(cargo) {
        return `Cargo invalido: ${cargo}`;
    }

    sanitizeSessionUser(userData) {
        const sanitized = { ...userData };
        delete sanitized.codigo_temporario;
        delete sanitized.codigo_expiracao;
        delete sanitized.reset_token;
        delete sanitized.reset_token_expiracao;
        delete sanitized.status_ativo;
        return sanitized;
    }

    montarUsuarioSessao(baseData, extras = {}) {
        return this.sanitizeSessionUser({
            ...baseData,
            ...extras
        });
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
            const apiBaseUrl = (
                window.TRATAMENTOWEB_API_BASE_URL ||
                localStorage.getItem('tratamentowebApiBaseUrl') ||
                DEFAULT_RENDER_API_BASE_URL
            ).replace(/\/$/, '');

            const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organization: organizacao, login, password })
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error?.message || 'Erro ao autenticar no backend.');
            }

            const organizationFirebaseConfig = result.firebaseConfig;
            configureOrganizationFirebase(organizationFirebaseConfig, organizacao);

            await signInWithEmailAndPassword(auth, emailMontado, password);

            const userRef = doc(db, 'logins', login);
            const loginGeral = result.loginGeral || {};
            const cargoLoginGeral = loginGeral.cargo || '';

            if (cargoLoginGeral && cargoLoginGeral !== 'paciente') {
                const sessionExpiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
                const sessionUser = this.montarUsuarioSessao(loginGeral, {
                    login,
                    email: emailMontado,
                    organizacao,
                    firebaseConfig: organizationFirebaseConfig,
                    authToken: result.token?.idToken || '',
                    sessionCreatedAt: new Date().toISOString(),
                    sessionExpiresAt,
                    activeModule: 'home'
                });

                this.saveRememberedCredentials(rememberCheckbox?.checked, organizacao, login);
                localStorage.setItem('currentUser', JSON.stringify(sessionUser));
                localStorage.setItem('sessionCreatedAt', sessionUser.sessionCreatedAt);
                localStorage.setItem('sessionExpiresAt', sessionUser.sessionExpiresAt);
                this.iniciarTimerSessao(sessionExpiresAt);
                void this.validarUsuarioOrganizacaoEmBackground(userRef, sessionUser);
                window.history.replaceState({}, '', '/');
                void this.showHome(sessionUser).catch(() => {
                    this.clearSessionState();
                    window.location.replace('/login');
                });
                return;
            }

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

            if (!this.isCargoValido(userData.cargo)) {
                await this.signOutAll();
                this.showError(this.getMensagemCargoInvalido(userData.cargo));
                return;
            }

            const isPaciente = userData.cargo === 'paciente';
            const hasPrimeiroAcesso = Object.prototype.hasOwnProperty.call(userData, 'ultimo_login');

            if (isPaciente && !hasPrimeiroAcesso) {
                sessionStorage.setItem('firstAccessOrganization', organizacao);
                sessionStorage.setItem('firstAccessLogin', login);
                this.saveRememberedCredentials(rememberCheckbox?.checked, organizacao, login);
                await this.signOutAll();
                window.location.replace('/primeiro-acesso');
                return;
            }

            void updateDoc(userRef, {
                ultimo_login: serverTimestamp(),
                status_ativo: deleteField()
            }).catch(() => {});

            const sessionExpiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
            const sessionUser = this.montarUsuarioSessao(userData, {
                login,
                email: emailMontado,
                organizacao,
                firebaseConfig: organizationFirebaseConfig,
                perfil: userData.perfil || (isPaciente ? 'operador' : 'supervisor'),
                authToken: result.token?.idToken || '',
                sessionCreatedAt: new Date().toISOString(),
                sessionExpiresAt,
                activeModule: 'home'
            });

            this.saveRememberedCredentials(rememberCheckbox?.checked, organizacao, login);
            localStorage.setItem('currentUser', JSON.stringify(sessionUser));
            localStorage.setItem('sessionCreatedAt', sessionUser.sessionCreatedAt);
            localStorage.setItem('sessionExpiresAt', sessionUser.sessionExpiresAt);
            this.iniciarTimerSessao(sessionExpiresAt);
            window.history.replaceState({}, '', '/');
            void this.showHome(sessionUser).catch(() => {
                this.clearSessionState();
                window.location.replace('/login');
            });
        } catch (error) {

            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                this.showError('Login ou senha incorretos.');
            } else if (error.code === 'auth/user-not-found') {
                this.showError('Login nao encontrado ou credenciais invalidas.');
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
            signOut(auth)
        ]);
    }

    saveRememberedCredentials(remember, organizacao, login) {
        if (remember) {
            localStorage.setItem('savedOrganizacao', organizacao);
            localStorage.setItem('savedLogin', login);
            localStorage.removeItem('savedPassword');
            localStorage.setItem('rememberLogin', 'true');
            return;
        }

        localStorage.removeItem('savedOrganizacao');
        localStorage.removeItem('savedLogin');
        localStorage.removeItem('savedPassword');
        localStorage.setItem('rememberLogin', 'false');
    }

    renderFirstAccessScreen() {
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <div class="login-wrapper">
                <div class="login-card">
                    <div class="login-header">
                        <div class="logo-container">
                            <img src="/imagens/logo.png" alt="TratamentoWeb" class="login-logo-img">
                        </div>
                        <h2>Primeiro acesso</h2>
                        <p>Crie sua senha pessoal para entrar no sistema.</p>
                    </div>

                    <form id="firstAccessForm" class="login-form">
                        <div class="input-group-custom">
                            <div class="input-icon"><i class="bi bi-building"></i></div>
                            <div class="input-field">
                                <input type="text" id="organizacao" placeholder=" " autocomplete="organization" list="organizacoesList" required>
                                <label>Organizacao</label>
                                <datalist id="organizacoesList"><option value="ORG_0001"></option></datalist>
                            </div>
                        </div>

                        <div class="input-group-custom">
                            <div class="input-icon"><i class="bi bi-person"></i></div>
                            <div class="input-field">
                                <input type="text" id="login" placeholder=" " autocomplete="username" required>
                                <label>Login</label>
                            </div>
                        </div>

                        <div class="input-group-custom">
                            <div class="input-icon"><i class="bi bi-lock"></i></div>
                            <div class="input-field">
                                <input type="password" id="temporaryPassword" placeholder=" " inputmode="numeric" autocomplete="current-password" maxlength="8" required>
                                <label>Senha Temporária</label>
                            </div>
                            <div class="input-icon password-toggle" id="toggleTemporaryPassword"><i class="bi bi-eye-slash"></i></div>
                        </div>
                        <small style="display:block; margin:-10px 0 14px 54px; color:#5f6368; line-height:1.35;">
                            Digite apenas os 8 números da sua data de nascimento (DDMMAAAA).
                        </small>

                        <div class="input-group-custom">
                            <div class="input-icon"><i class="bi bi-shield-lock"></i></div>
                            <div class="input-field">
                                <input type="password" id="newPassword" placeholder=" " autocomplete="new-password" required>
                                <label>Nova senha</label>
                            </div>
                            <div class="input-icon password-toggle" id="toggleNewPassword"><i class="bi bi-eye-slash"></i></div>
                        </div>

                        <div class="input-group-custom">
                            <div class="input-icon"><i class="bi bi-shield-check"></i></div>
                            <div class="input-field">
                                <input type="password" id="confirmPassword" placeholder=" " autocomplete="new-password" required>
                                <label>Repetir nova senha</label>
                            </div>
                            <div class="input-icon password-toggle" id="toggleConfirmPassword"><i class="bi bi-eye-slash"></i></div>
                        </div>

                        <div class="login-options">
                            <label class="checkbox-custom">
                                <input type="checkbox" id="rememberLogin">
                                <span class="checkmark"></span>
                                <span class="checkbox-text">Lembrar meus dados</span>
                            </label>
                            <a href="/" class="forgot-password">Voltar ao login</a>
                        </div>

                        <button type="submit" class="login-button">
                            <i class="bi bi-check-circle"></i>
                            Criar senha e entrar
                        </button>
                        <a href="#" class="contact-button" data-whatsapp-contact="suporte" hidden>
                            <i class="bi bi-whatsapp"></i>
                            Contato ao Suporte
                        </a>
                    </form>
                </div>
            </div>
        `;
    }

    loadFirstAccessDefaults() {
        const organization = sessionStorage.getItem('firstAccessOrganization') || localStorage.getItem('savedOrganizacao') || '';
        const login = sessionStorage.getItem('firstAccessLogin') || localStorage.getItem('savedLogin') || '';
        sessionStorage.removeItem('firstAccessOrganization');
        sessionStorage.removeItem('firstAccessLogin');

        const organizationInput = document.getElementById('organizacao');
        const loginInput = document.getElementById('login');
        if (organizationInput) organizationInput.value = organization;
        if (loginInput) loginInput.value = login;
        const rememberInput = document.getElementById('rememberLogin');
        if (rememberInput) rememberInput.checked = localStorage.getItem('rememberLogin') === 'true';
        this.setupFloatingLabels();
    }

    setupFirstAccessEvents() {
        this.setupPasswordToggle('toggleTemporaryPassword', 'temporaryPassword');
        this.setupPasswordToggle('toggleNewPassword', 'newPassword');
        this.setupPasswordToggle('toggleConfirmPassword', 'confirmPassword');
        this.setupFloatingLabels();
        document.getElementById('firstAccessForm')?.addEventListener('submit', (event) => {
            event.preventDefault();
            void this.handleFirstAccess();
        });
    }

    async redirectExistingLoginFromFirstAccess(apiBaseUrl, organization, login) {
        try {
            const response = await fetch(`${apiBaseUrl}/api/public/first-access-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'omit',
                body: JSON.stringify({ organization, login })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || result.login_existe !== true) return false;

            sessionStorage.removeItem('firstAccessOrganization');
            sessionStorage.removeItem('firstAccessLogin');
            sessionStorage.setItem('loginNotice', FIRST_ACCESS_ALREADY_COMPLETED_MESSAGE);
            await this.signOutAll().catch(() => {});
            window.location.replace('/login');
            return true;
        } catch (_error) {
            return false;
        }
    }

    async handleFirstAccess() {
        const organizacao = this.normalizeOrganizacao(document.getElementById('organizacao')?.value);
        const login = this.normalizeLogin(document.getElementById('login')?.value);
        const temporaryPassword = document.getElementById('temporaryPassword')?.value || '';
        const newPassword = document.getElementById('newPassword')?.value || '';
        const confirmPassword = document.getElementById('confirmPassword')?.value || '';
        const remember = document.getElementById('rememberLogin')?.checked;
        const submitBtn = document.querySelector('#firstAccessForm .login-button');

        if (!organizacao || !login || !temporaryPassword || !newPassword || !confirmPassword) {
            this.showError('Preencha todos os campos.', 'firstAccessForm');
            return;
        }
        if (!/^\d{8}$/.test(temporaryPassword)) {
            this.showError('A senha temporaria deve conter os 8 numeros da data de nascimento.', 'firstAccessForm');
            return;
        }
        if (newPassword.length < 6) {
            this.showError('A nova senha deve ter no minimo 6 caracteres.', 'firstAccessForm');
            return;
        }
        if (newPassword !== confirmPassword) {
            this.showError('As novas senhas nao coincidem.', 'firstAccessForm');
            return;
        }
        if (newPassword === temporaryPassword) {
            this.showError('A nova senha deve ser diferente da senha temporaria.', 'firstAccessForm');
            return;
        }

        const originalText = submitBtn?.innerHTML || '';
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Criando senha...';
            submitBtn.disabled = true;
        }

        try {
            const apiBaseUrl = (
                window.TRATAMENTOWEB_API_BASE_URL ||
                localStorage.getItem('tratamentowebApiBaseUrl') ||
                DEFAULT_RENDER_API_BASE_URL
            ).replace(/\/$/, '');
            const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organization: organizacao, login, password: temporaryPassword })
            });
            const loginResult = await response.json().catch(() => ({}));
            if (!response.ok) {
                const redirected = await this.redirectExistingLoginFromFirstAccess(apiBaseUrl, organizacao, login);
                if (redirected) return;
                throw new Error(loginResult.error?.message || 'Login ou senha temporaria incorretos.');
            }

            const email = this.montarEmailAuth(organizacao, login);
            configureOrganizationFirebase(loginResult.firebaseConfig, organizacao);
            await signInWithEmailAndPassword(auth, email, temporaryPassword);

            const userRef = doc(db, 'logins', login);
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) throw new Error('Dados do usuario nao encontrados.');
            const userData = userDoc.data();
            if (userData.cargo !== 'paciente') throw new Error('O primeiro acesso esta disponivel apenas para pacientes.');
            if (Object.prototype.hasOwnProperty.call(userData, 'ultimo_login')) {
                sessionStorage.removeItem('firstAccessOrganization');
                sessionStorage.removeItem('firstAccessLogin');
                sessionStorage.setItem('loginNotice', FIRST_ACCESS_ALREADY_COMPLETED_MESSAGE);
                await this.signOutAll();
                window.location.replace('/login');
                return;
            }

            const organizationToken = await auth.currentUser?.getIdToken();
            if (!organizationToken) throw new Error('Sessao da organizacao expirada. Tente novamente.');
            const passwordResponse = await fetch(`${apiBaseUrl}/api/auth/password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${loginResult.token?.idToken || ''}`,
                    'X-Organization-Token': organizationToken
                },
                body: JSON.stringify({
                    senha_atual: temporaryPassword,
                    nova_senha: newPassword
                })
            });
            const passwordResult = await passwordResponse.json().catch(() => ({}));
            if (!passwordResponse.ok) {
                throw new Error(passwordResult.error?.message || 'Nao foi possivel cadastrar a nova senha.');
            }

            await signOut(auth);
            await signInWithEmailAndPassword(auth, email, newPassword);
            await updateDoc(userRef, {
                ultimo_login: serverTimestamp(),
                codigo_temporario: deleteField(),
                codigo_expiracao: deleteField(),
                status_ativo: deleteField(),
                email
            });

            const sessionCreatedAt = new Date().toISOString();
            const sessionUser = this.montarUsuarioSessao(userData, {
                login,
                email,
                organizacao,
                firebaseConfig: loginResult.firebaseConfig,
                authToken: passwordResult.token?.idToken || '',
                perfil: userData.perfil || 'operador',
                sessionCreatedAt,
                sessionExpiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
                activeModule: 'home'
            });

            this.saveRememberedCredentials(remember, organizacao, login);
            localStorage.setItem('currentUser', JSON.stringify(sessionUser));
            localStorage.setItem('sessionCreatedAt', sessionUser.sessionCreatedAt);
            localStorage.setItem('sessionExpiresAt', sessionUser.sessionExpiresAt);
            this.iniciarTimerSessao(sessionUser.sessionExpiresAt);
            window.history.replaceState({}, '', '/');
            await this.showHome(sessionUser);
        } catch (error) {
            await this.signOutAll().catch(() => {});
            this.showError(error.message || 'Nao foi possivel concluir o primeiro acesso.', 'firstAccessForm');
        } finally {
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    showCreatePasswordScreen() {
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <div class="login-wrapper">
                <div class="login-card">
                    <div class="login-header">
                        <div class="logo-container">
                            <img src="/imagens/logo.png" alt="TratamentoWeb" class="login-logo-img">
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

            if (newPassword.value === this.tempData.senhaAtual) {
                this.showError('A senha definitiva deve ser diferente da senha de primeiro acesso.', 'createPasswordForm');
                return;
            }

            try {
                const organizationToken = await auth.currentUser?.getIdToken();
                if (!organizationToken) throw new Error('Sessao da organizacao expirada. Entre novamente.');

                const apiBaseUrl = (
                    window.TRATAMENTOWEB_API_BASE_URL ||
                    localStorage.getItem('tratamentowebApiBaseUrl') ||
                    DEFAULT_RENDER_API_BASE_URL
                ).replace(/\/$/, '');
                const response = await fetch(`${apiBaseUrl}/api/auth/password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.tempData.authToken}`,
                        'X-Organization-Token': organizationToken
                    },
                    body: JSON.stringify({
                        senha_atual: this.tempData.senhaAtual,
                        nova_senha: newPassword.value
                    })
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(result.error?.message || 'Nao foi possivel atualizar a senha nos dois projetos.');
                }

                await signOut(auth);
                await signInWithEmailAndPassword(auth, this.tempData.email, newPassword.value);
                await updateDoc(this.tempData.userRef, {
                    ultimo_login: serverTimestamp(),
                    codigo_temporario: deleteField(),
                    codigo_expiracao: deleteField(),
                    status_ativo: deleteField(),
                    email: this.tempData.email
                }).catch(() => {});

                const userData = this.tempData.userData || {};
                const sessionUser = this.montarUsuarioSessao(userData, {
                    login: this.tempData.login,
                    email: this.tempData.email,
                    organizacao: this.tempData.organizacao,
                    firebaseConfig: this.tempData.firebaseConfig,
                    authToken: result.token?.idToken || '',
                    perfil: userData.perfil || 'operador',
                    sessionCreatedAt: new Date().toISOString(),
                    sessionExpiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
                    activeModule: 'home'
                });

                this.saveRememberedCredentials(this.tempData.rememberLogin, this.tempData.organizacao, this.tempData.login);
                localStorage.setItem('currentUser', JSON.stringify(sessionUser));
                localStorage.setItem('sessionCreatedAt', sessionUser.sessionCreatedAt);
                localStorage.setItem('sessionExpiresAt', sessionUser.sessionExpiresAt);
                this.iniciarTimerSessao(sessionUser.sessionExpiresAt);
                void this.showHome(sessionUser).catch(() => {
                    this.clearSessionState();
                    this.renderLoginScreen();
                    this.setupEventListeners();
                });
            } catch (error) {
                if (error.code === 'auth/weak-password') {
                    this.showError('Senha muito fraca. Use pelo menos 6 caracteres.', 'createPasswordForm');
                } else {
                    this.showError('Erro ao cadastrar senha: ' + error.message, 'createPasswordForm');
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
                            <img src="/imagens/logo.png" alt="TratamentoWeb" class="login-logo-img">
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

    async showHome(userData) {
        document.body.classList.remove('landing-page', 'profile-paciente', 'profile-profissional');
        document.body.classList.add(userData.cargo === 'paciente' ? 'profile-paciente' : 'profile-profissional');

        if (userData.firebaseConfig?.apiKey && userData.firebaseConfig?.projectId) {
            configureOrganizationFirebase(userData.firebaseConfig, userData.organizacao || userData.login);
        }

        const activeModule = localStorage.getItem('activeModule') || userData.activeModule || 'home';
        if (activeModule && activeModule !== 'home' && this.isRestorableModule(activeModule, userData.cargo)) {
            try {
                const pacientesList = userData.cargo === 'paciente'
                    ? []
                    : await FuncoesCompartilhadas.loadPacientesList(userData.login);
                const navegador = criarNavegador(userData, pacientesList);
                const navegou = await navegador.navegarPara(activeModule);
                if (navegou === true) return;
                localStorage.setItem('activeModule', 'home');
            } catch (error) {
                localStorage.setItem('activeModule', 'home');
            }
        } else if (activeModule !== 'home') {
            localStorage.setItem('activeModule', 'home');
        }

        const homeManager = new HomeManager(userData);
        homeManager.render();
    }

    isRestorableModule(module, cargo) {
        const comuns = new Set(['home', 'cadastro_cliente', 'shopping_nutri', 'palestras_videos']);
        const porCargo = {
            nutricionista: new Set(['avaliacao_nutricional', 'anamnese', 'medidas_fisicas', 'exames_nutricionais', 'medidas_consumo', 'plano_alimentar', 'calculo_energetico']),
            psicologo: new Set(['avaliacao_psicologica']),
            paciente: new Set(['minhas_avaliacoes', 'meu_plano_alimentar', 'minha_anamnese'])
        };
        return comuns.has(module) || Boolean(porCargo[cargo]?.has(module));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});
