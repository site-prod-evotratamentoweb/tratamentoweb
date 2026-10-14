import { getRenderApiBaseUrl } from '../0_firebase_api_config.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';

const WIDGET_SCRIPT_ID = 'agendaeBookingWidgetScript';

export class AgendamentosCliente {
    constructor(userInfo) {
        this.userInfo = userInfo;
        this.navegador = criarNavegador(userInfo);
    }

    escape(value) {
        return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[char]));
    }

    async render() {
        localStorage.setItem('activeModule', 'meus_agendamentos');
        document.getElementById('app').innerHTML = this.renderHTML();
        this.attachEvents();
        await this.carregarWidgetAgendae();
    }

    renderHTML() {
        const firstName = this.escape((this.userInfo.nome || 'Paciente').trim().split(/\s+/)[0]);
        return `
            <div class="home-container agendae-management-page">
                <header class="header">
                    <img src="./imagens/logo.png" alt="TratamentoWeb" class="header-logo-img">
                    <div class="user-info"><span>Olá, ${firstName}</span><button id="menuToggleBtn" type="button">☰</button></div>
                </header>
                <aside class="side-menu" id="sideMenu">
                    <div class="menu-header"><h3>Menu</h3><button id="closeMenu" type="button">×</button></div>
                    <nav class="menu-nav">
                        <button class="menu-item" data-module="home"><span>🏠</span><span>Home</span></button>
                        <button class="menu-item active" data-module="meus_agendamentos"><span>📅</span><span>Agendar Atendimento</span></button>
                        <button class="menu-item" data-module="palestras_videos"><span>🎥</span><span>Palestras e Vídeos</span></button>
                        <button class="menu-item logout" data-module="logout"><span>🚪</span><span>Sair</span></button>
                    </nav>
                </aside>
                <div id="menuOverlay" class="menu-overlay"></div>

                <main class="agendae-management-main">
                    <section class="agendae-management-hero">
                        <div>
                            <span class="agendae-management-eyebrow">Seu atendimento</span>
                            <h1>Agende sua consulta</h1>
                            <p>Escolha o serviço, a data, o profissional e um horário disponível.</p>
                        </div>
                        <div class="agendae-management-brand" aria-label="Agendae">
                            <span class="agendae-management-calendar" aria-hidden="true">✓</span>
                            <strong>Agendae</strong>
                        </div>
                    </section>

                    <section class="agendae-management-grid">
                        <article class="agendae-management-card agendae-management-primary">
                            <span class="agendae-management-icon" aria-hidden="true">📅</span>
                            <div>
                                <span class="agendae-management-label">Reserva on-line</span>
                                <h2>Novo agendamento</h2>
                                <p>Os horários exibidos são consultados diretamente na agenda do seu profissional.</p>
                            </div>
                            <button id="btnAbrirAgendae" class="agendae-management-button" type="button" data-agendae-open disabled>
                                <span id="agendaeButtonText">Preparando agenda…</span>
                                <span aria-hidden="true">→</span>
                            </button>
                            <p id="agendaeLoadStatus" class="agendae-management-status" role="status" aria-live="polite">Conectando ao serviço de agendamento.</p>
                        </article>

                        <aside class="agendae-management-card agendae-management-info">
                            <span class="agendae-management-label">Antes de confirmar</span>
                            <h2>Confira seus dados</h2>
                            <ul>
                                <li>Informe seu nome e telefone corretamente.</li>
                                <li>Escolha apenas um horário em que poderá comparecer.</li>
                                <li>Guarde o código de presença mostrado após a confirmação.</li>
                            </ul>
                        </aside>
                    </section>
                </main>
            </div>
        `;
    }

    attachEvents() {
        const menu = document.getElementById('sideMenu');
        const overlay = document.getElementById('menuOverlay');
        const close = () => {
            menu?.classList.remove('open');
            overlay?.classList.remove('open');
        };
        document.getElementById('menuToggleBtn')?.addEventListener('click', () => {
            menu?.classList.add('open');
            overlay?.classList.add('open');
        });
        document.getElementById('closeMenu')?.addEventListener('click', close);
        overlay?.addEventListener('click', close);
        document.querySelectorAll('[data-module]').forEach((button) => {
            button.addEventListener('click', () => {
                close();
                void this.navegador.navegarPara(button.dataset.module);
            });
        });
    }

    async carregarWidgetAgendae() {
        const button = document.getElementById('btnAbrirAgendae');
        const buttonText = document.getElementById('agendaeButtonText');
        const status = document.getElementById('agendaeLoadStatus');

        try {
            await this.garantirScriptWidget();
            if (!window.AgendaeBooking) throw new Error('A interface do Agendae não iniciou.');
            if (button) button.disabled = false;
            if (buttonText) buttonText.textContent = 'Escolher horário';
            if (status) {
                status.textContent = 'Agenda conectada e pronta para uso.';
                status.classList.add('is-ready');
            }
        } catch (error) {
            if (buttonText) buttonText.textContent = 'Agenda indisponível';
            if (status) {
                status.textContent = error.message || 'Não foi possível carregar a agenda.';
                status.classList.add('is-error');
            }
        }
    }

    garantirScriptWidget() {
        if (window.AgendaeBooking) return Promise.resolve();
        const context = String(this.userInfo.agendae_contexto || '').trim().toUpperCase();
        if (!context) return Promise.reject(new Error('O profissional responsável não possui agenda disponível.'));

        const existing = document.getElementById(WIDGET_SCRIPT_ID);
        if (existing) {
            return new Promise((resolve, reject) => {
                existing.addEventListener('load', resolve, { once: true });
                existing.addEventListener('error', () => reject(new Error('Não foi possível carregar a interface do Agendae.')), { once: true });
            });
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.id = WIDGET_SCRIPT_ID;
            script.src = './integracoes/agendae-booking-widget.js';
            script.dataset.agendaeApi = `${getRenderApiBaseUrl()}/api/agenda/${encodeURIComponent(context)}`;
            script.defer = true;
            script.addEventListener('load', resolve, { once: true });
            script.addEventListener('error', () => reject(new Error('Não foi possível carregar a interface do Agendae.')), { once: true });
            document.body.appendChild(script);
        });
    }
}
