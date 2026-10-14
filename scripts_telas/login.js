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
            this.setupLandingNavigation();
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
            <div class="marketing-page marketing-page-panels">
                <a class="marketing-skip-link" href="#atendimento">Ir para o conteúdo</a>

                <header class="marketing-header">
                    <div class="marketing-shell marketing-nav-wrap">
                        <a href="#atendimento" class="marketing-brand" data-landing-target="atendimento" aria-label="TratamentoWeb - início">
                            <img src="/imagens/logo.png" alt="TratamentoWeb">
                        </a>
                        <nav class="marketing-tabs" aria-label="Experiências da plataforma">
                            <a href="#atendimento" class="active" data-landing-target="atendimento" aria-current="page">Atendimento</a>
                            <a href="#gamificacao" data-landing-target="gamificacao">Gamificação</a>
                            <a href="#camera-ia" data-landing-target="camera-ia">Câmera + IA</a>
                            <a href="#recompensas" data-landing-target="recompensas">Recompensas</a>
                            <a href="#profissionais" data-landing-target="profissionais">Para profissionais</a>
                        </nav>
                        <div class="marketing-nav-actions">
                            <a href="#profissionais" class="marketing-nav-contact" data-whatsapp-contact="comercial" hidden>
                                <i class="bi bi-whatsapp" aria-hidden="true"></i><span>Comercial</span>
                            </a>
                            <a href="/login" class="marketing-login-link">Entrar</a>
                        </div>
                    </div>
                </header>

                <main class="marketing-panels" id="conteudo-principal">
                    <section class="marketing-panel marketing-panel-attendance" id="atendimento" data-landing-section="atendimento" aria-labelledby="attendance-title">
                        <div class="marketing-panel-media" role="img" aria-label="Profissional de saúde realizando atendimento digital"></div>
                        <div class="marketing-panel-shade"></div>
                        <div class="marketing-shell marketing-panel-inner">
                            <div class="marketing-panel-content">
                                <span class="marketing-panel-index">01 <small>/ 05</small></span>
                                <span class="marketing-eyebrow"><i class="bi bi-camera-video" aria-hidden="true"></i> Atendimento digital</span>
                                <h1 id="attendance-title">Cuidado digital que acompanha de verdade.</h1>
                                <p>Atenda de forma web, personalizada e próxima. O TratamentoWeb conecta profissionais e pacientes em uma jornada contínua, antes, durante e depois da consulta.</p>
                                <div class="marketing-panel-actions">
                                    <a href="/login" class="marketing-button marketing-button-primary">Entrar na plataforma <i class="bi bi-arrow-up-right" aria-hidden="true"></i></a>
                                    <a href="/primeiro-acesso" class="marketing-button marketing-button-secondary">Primeiro acesso</a>
                                </div>
                                <div class="marketing-panel-tags"><span>Nutricionistas</span><span>Psicólogos</span><span>Pacientes</span></div>
                            </div>
                        </div>
                        <a href="#gamificacao" class="marketing-scroll-next" data-landing-target="gamificacao"><span>Explore a experiência</span><i class="bi bi-arrow-down" aria-hidden="true"></i></a>
                    </section>

                    <section class="marketing-panel marketing-panel-gamification is-content-right" id="gamificacao" data-landing-section="gamificacao" aria-labelledby="gamification-title">
                        <div class="marketing-panel-media" role="img" aria-label="Pessoa usando a experiência gamificada de saúde no celular"></div>
                        <div class="marketing-panel-shade"></div>
                        <div class="marketing-shell marketing-panel-inner">
                            <div class="marketing-panel-content">
                                <span class="marketing-panel-index">02 <small>/ 05</small></span>
                                <span class="marketing-eyebrow"><i class="bi bi-trophy" aria-hidden="true"></i> Gamificação no aplicativo</span>
                                <h2 id="gamification-title">Cada avanço vira uma conquista visível.</h2>
                                <p>Pontos, metas, níveis e evolução transformam pequenas ações em motivação. O paciente participa da própria jornada e mantém a constância entre os atendimentos.</p>
                                <ul class="marketing-panel-list"><li>Metas personalizadas pelo profissional</li><li>Progresso simples de acompanhar</li><li>Reconhecimento a cada nova conquista</li></ul>
                            </div>
                        </div>
                        <a href="#camera-ia" class="marketing-scroll-next" data-landing-target="camera-ia"><span>Próxima experiência</span><i class="bi bi-arrow-down" aria-hidden="true"></i></a>
                    </section>

                    <section class="marketing-panel marketing-panel-camera" id="camera-ia" data-landing-section="camera-ia" aria-labelledby="camera-title">
                        <div class="marketing-panel-media" role="img" aria-label="Pessoa registrando um desafio com a câmera do celular e suporte de inteligência artificial"></div>
                        <div class="marketing-panel-shade"></div>
                        <div class="marketing-shell marketing-panel-inner">
                            <div class="marketing-panel-content">
                                <span class="marketing-panel-index">03 <small>/ 05</small></span>
                                <span class="marketing-eyebrow"><i class="bi bi-camera" aria-hidden="true"></i> Desafios com câmera e IA</span>
                                <h2 id="camera-title">A rotina se transforma em uma experiência imersiva.</h2>
                                <p>O paciente registra desafios com a câmera. A inteligência artificial apoia a experiência e organiza a interação, enquanto o profissional permanece no centro do cuidado.</p>
                                <div class="marketing-panel-note"><i class="bi bi-cpu" aria-hidden="true"></i><span><strong>IA como suporte</strong> à jornada definida pelo profissional.</span></div>
                            </div>
                        </div>
                        <a href="#recompensas" class="marketing-scroll-next" data-landing-target="recompensas"><span>Ver recompensas</span><i class="bi bi-arrow-down" aria-hidden="true"></i></a>
                    </section>

                    <section class="marketing-panel marketing-panel-rewards is-content-right" id="recompensas" data-landing-section="recompensas" aria-labelledby="rewards-title">
                        <div class="marketing-panel-media" role="img" aria-label="Pessoa escolhendo uma recompensa no shopping de trocas pelo celular"></div>
                        <div class="marketing-panel-shade"></div>
                        <div class="marketing-shell marketing-panel-inner">
                            <div class="marketing-panel-content">
                                <span class="marketing-panel-index">04 <small>/ 05</small></span>
                                <span class="marketing-eyebrow"><i class="bi bi-bag-heart" aria-hidden="true"></i> Shopping de trocas</span>
                                <h2 id="rewards-title">Engajamento que ganha significado.</h2>
                                <p>Os pontos conquistados nos desafios podem virar recompensas. Uma forma positiva de reconhecer o esforço e incentivar a continuidade do acompanhamento.</p>
                                <div class="marketing-panel-tags"><span>Conquistar</span><span>Acumular</span><span>Trocar</span></div>
                            </div>
                        </div>
                        <a href="#profissionais" class="marketing-scroll-next" data-landing-target="profissionais"><span>Conhecer para profissionais</span><i class="bi bi-arrow-down" aria-hidden="true"></i></a>
                    </section>

                    <section class="marketing-panel marketing-panel-professionals" id="profissionais" data-landing-section="profissionais" aria-labelledby="professionals-title">
                        <div class="marketing-panel-media" role="img" aria-label="Profissional realizando atendimento de saúde personalizado pela internet"></div>
                        <div class="marketing-panel-shade"></div>
                        <div class="marketing-shell marketing-panel-inner">
                            <div class="marketing-panel-content">
                                <span class="marketing-panel-index">05 <small>/ 05</small></span>
                                <span class="marketing-eyebrow"><i class="bi bi-heart-pulse" aria-hidden="true"></i> Para profissionais de saúde</span>
                                <h2 id="professionals-title">Sua prática mais presente, personalizada e inteligente.</h2>
                                <p>Para nutricionistas e psicólogos que querem atender pacientes pela web com mais imersão, proximidade e suporte de inteligência artificial.</p>
                                <ul class="marketing-panel-list"><li>Experiências adaptadas ao seu método</li><li>Continuidade além da consulta</li><li>Tecnologia sem tirar você do centro</li></ul>
                                <div class="marketing-panel-actions">
                                    <a href="#profissionais" class="marketing-button marketing-button-whatsapp" data-whatsapp-contact="comercial" hidden><i class="bi bi-whatsapp" aria-hidden="true"></i> Falar com o comercial</a>
                                    <a href="/login" class="marketing-button marketing-button-secondary">Já sou cliente</a>
                                </div>
                            </div>
                        </div>
                        <footer class="marketing-panel-footer"><span>TratamentoWeb</span><span>Saúde, tecnologia e conexão.</span></footer>
                    </section>
                </main>
            </div>
        `;
    }

    setupLandingNavigation() {
        const tabs = [...document.querySelectorAll('[data-landing-target]')];
        const sections = [...document.querySelectorAll('[data-landing-section]')];
        if (!sections.length) return;

        const activateTab = (sectionId) => {
            document.querySelectorAll('.marketing-tabs [data-landing-target]').forEach((tab) => {
                const isActive = tab.dataset.landingTarget === sectionId;
                tab.classList.toggle('active', isActive);
                if (isActive) {
                    tab.setAttribute('aria-current', 'page');
                    const tabList = tab.parentElement;
                    if (window.innerWidth <= 820 && tabList) {
                        tabList.scrollTo({
                            left: tab.offsetLeft - (tabList.clientWidth / 2) + (tab.clientWidth / 2),
                            behavior: 'smooth'
                        });
                    }
                }
                else tab.removeAttribute('aria-current');
            });
        };

        tabs.forEach((link) => {
            link.addEventListener('click', (event) => {
                const target = document.getElementById(link.dataset.landingTarget);
                if (!target) return;
                event.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        if ('IntersectionObserver' in window) {
            this.landingObserver?.disconnect();
            this.landingObserver = new IntersectionObserver((entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
                if (visible) activateTab(visible.target.dataset.landingSection);
            }, { threshold: [0.45, 0.6, 0.75] });
            sections.forEach((section) => this.landingObserver.observe(section));
        }
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
        const rememberLogin = localStorage.getItem('rememberLogin') === 'true';
        const values = {
            organizacao: localStorage.getItem('savedOrganizacao') || '',
            login: rememberLogin ? localStorage.getItem('savedLogin') || '' : '',
            password: ''
        };

        localStorage.removeItem('savedPassword');

        const organizationInput = document.getElementById('organizacao');
        const loginInput = document.getElementById('login');
        const rememberInput = document.getElementById('rememberLogin');
        if (organizationInput) organizationInput.value = values.organizacao;
        if (loginInput) loginInput.value = values.login;
        if (rememberInput) rememberInput.checked = rememberLogin;
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
                    agendae_habilitado: result.integrations?.agendae === true,
                    agendae_contexto: result.integrations?.agendaeContext || '',
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
                agendae_habilitado: result.integrations?.agendae === true,
                agendae_contexto: result.integrations?.agendaeContext || '',
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
        // A organizacao acompanha as credenciais lembradas pelo navegador, mas nao
        // e um segredo e pode permanecer preenchida mesmo sem guardar o login.
        localStorage.setItem('savedOrganizacao', organizacao);

        if (remember) {
            localStorage.setItem('savedLogin', login);
            localStorage.removeItem('savedPassword');
            localStorage.setItem('rememberLogin', 'true');
            return;
        }

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

    async redirectExistingLoginFromFirstAccess(apiBaseUrl, organization, login, remember = false) {
        try {
            const response = await fetch(`${apiBaseUrl}/api/public/first-access-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'omit',
                body: JSON.stringify({ organization, login })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || result.login_existe !== true) return false;

            this.saveRememberedCredentials(remember, organization, login);
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
                const redirected = await this.redirectExistingLoginFromFirstAccess(apiBaseUrl, organizacao, login, remember);
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
                agendae_habilitado: loginResult.integrations?.agendae === true,
                agendae_contexto: loginResult.integrations?.agendaeContext || '',
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
        this.landingObserver?.disconnect();
        document.body.classList.remove('landing-page', 'profile-paciente', 'profile-profissional');
        document.body.classList.add(userData.cargo === 'paciente' ? 'profile-paciente' : 'profile-profissional');

        if (userData.firebaseConfig?.apiKey && userData.firebaseConfig?.projectId) {
            configureOrganizationFirebase(userData.firebaseConfig, userData.organizacao || userData.login);
        }

        const activeModule = localStorage.getItem('activeModule') || userData.activeModule || 'home';
        const agendaeModuleUnavailable = ['meus_agendamentos', 'gestao_agendamentos'].includes(activeModule)
            && (userData.agendae_habilitado !== true || !userData.agendae_contexto);
        if (activeModule && activeModule !== 'home' && !agendaeModuleUnavailable && this.isRestorableModule(activeModule, userData.cargo)) {
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
            nutricionista: new Set(['avaliacao_nutricional', 'anamnese', 'medidas_fisicas', 'exames_nutricionais', 'medidas_consumo', 'plano_alimentar', 'calculo_energetico', 'gestao_agendamentos']),
            psicologo: new Set(['avaliacao_psicologica', 'gestao_agendamentos']),
            paciente: new Set(['minhas_avaliacoes', 'meu_plano_alimentar', 'minha_anamnese', 'meus_agendamentos'])
        };
        return comuns.has(module) || Boolean(porCargo[cargo]?.has(module));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});
