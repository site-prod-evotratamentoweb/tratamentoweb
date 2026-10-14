import { getRenderApiBaseUrl } from '../0_firebase_api_config.js';
import { MenuProfissional } from './0_complementos_menu_profissional.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';

const WIDGET_SCRIPT_ID = 'agendaeBookingWidgetScript';

export class GestaoAgendamentos {
    constructor(userInfo, pacientesList = []) {
        this.userInfo = userInfo;
        this.pacientesList = pacientesList;
        this.navegador = criarNavegador(userInfo, pacientesList);
        this.menu = null;
    }

    async render() {
        document.getElementById('app').innerHTML = this.renderHTML();
        this.menu = new MenuProfissional(
            this.userInfo,
            (modulo) => this.navegador.navegarPara(modulo),
            'gestao_agendamentos'
        );
        document.getElementById('menuContainer').innerHTML = this.menu.render();
        this.menu.attachEvents();
        await this.carregarWidgetAgendae();
    }

    renderHTML() {
        return `
            <div class="dashboard-container agendae-management-page">
                <div id="menuContainer"></div>
                <main class="main-content agendae-management-main">
                    <section class="agendae-management-hero">
                        <div>
                            <span class="agendae-management-eyebrow">Integração Agendae</span>
                            <h1>Gestão de agendamentos</h1>
                            <p>Consulte a disponibilidade e registre horários na agenda oficial do seu atendimento.</p>
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
                                <span class="agendae-management-label">Agenda oficial</span>
                                <h2>Novo agendamento</h2>
                                <p>Escolha serviço, profissional, data e horário. A confirmação será registrada diretamente no Agendae.</p>
                            </div>
                            <button id="btnAbrirAgendae" class="agendae-management-button" type="button" data-agendae-open disabled>
                                <span id="agendaeButtonText">Preparando agenda…</span>
                                <span aria-hidden="true">→</span>
                            </button>
                            <p id="agendaeLoadStatus" class="agendae-management-status" role="status" aria-live="polite">Conectando ao serviço de agendamento.</p>
                        </article>

                        <aside class="agendae-management-card agendae-management-info">
                            <span class="agendae-management-label">Ambiente independente</span>
                            <h2>Dados sob responsabilidade do Agendae</h2>
                            <ul>
                                <li>Serviços e profissionais vêm do cadastro do Agendae.</li>
                                <li>Horários disponíveis são consultados em tempo real.</li>
                                <li>Agendamentos não são copiados para o banco do TratamentoWeb.</li>
                            </ul>
                        </aside>
                    </section>
                </main>
            </div>
        `;
    }

    async carregarWidgetAgendae() {
        const button = document.getElementById('btnAbrirAgendae');
        const buttonText = document.getElementById('agendaeButtonText');
        const status = document.getElementById('agendaeLoadStatus');

        try {
            await this.garantirScriptWidget();
            if (!window.AgendaeBooking) throw new Error('A interface do Agendae não iniciou.');
            if (button) button.disabled = false;
            if (buttonText) buttonText.textContent = 'Abrir agenda';
            if (status) {
                status.textContent = 'Agendae conectado e pronto para uso.';
                status.classList.add('is-ready');
            }
        } catch (error) {
            if (buttonText) buttonText.textContent = 'Agenda indisponível';
            if (status) {
                status.textContent = error.message || 'Não foi possível carregar a interface do Agendae.';
                status.classList.add('is-error');
            }
        }
    }

    garantirScriptWidget() {
        if (window.AgendaeBooking) return Promise.resolve();

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
            script.dataset.agendaeApi = `${getRenderApiBaseUrl()}/api/agenda`;
            script.dataset.agendaeEstablishment = 'TratamentoWeb';
            script.defer = true;
            script.addEventListener('load', resolve, { once: true });
            script.addEventListener('error', () => reject(new Error('Não foi possível carregar a interface do Agendae.')), { once: true });
            document.body.appendChild(script);
        });
    }
}
