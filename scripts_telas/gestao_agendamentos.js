import { getRenderApiBaseUrl } from '../0_firebase_api_config.js';
import { MenuProfissional } from './0_complementos_menu_profissional.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { FuncoesCompartilhadas } from './0_home.js';

const WIDGET_SCRIPT_ID = 'agendaeBookingWidgetScript';

export class GestaoAgendamentos {
    constructor(userInfo, pacientesList = []) {
        this.userInfo = userInfo;
        this.pacientesList = pacientesList;
        this.navegador = criarNavegador(userInfo, pacientesList);
        this.menu = null;
        this.widgetReady = false;
    }

    escape(value) {
        return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
    }

    async render() {
        if (!this.pacientesList.length) {
            try {
                this.pacientesList = await FuncoesCompartilhadas.loadPacientesList(this.userInfo.login);
            } catch (_error) {
                this.pacientesList = [];
            }
            this.navegador.pacientesList = this.pacientesList;
        }
        document.getElementById('app').innerHTML = this.renderHTML();
        this.menu = new MenuProfissional(
            this.userInfo,
            (modulo) => this.navegador.navegarPara(modulo),
            'gestao_agendamentos'
        );
        document.getElementById('menuContainer').innerHTML = this.menu.render();
        this.menu.attachEvents();
        this.attachAgendaEvents();
        await this.carregarWidgetAgendae();
    }

    renderHTML() {
        const patientOptions = this.pacientesList.map((patient, index) => `
            <option value="${index}">${this.escape(patient.nome || patient.login)}</option>
        `).join('');
        return `
            <div class="dashboard-container agendae-management-page">
                <div id="menuContainer"></div>
                <main class="main-content agendae-management-main">
                    <section class="agendae-management-hero">
                        <div>
                            <span class="agendae-management-eyebrow">Integração Agendae</span>
                            <h1>Agendar paciente</h1>
                            <p>Consulte a disponibilidade e reserve um horário para um paciente vinculado.</p>
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
                                <h2>Novo agendamento para paciente</h2>
                                <p>Escolha serviço, profissional, data e horário e informe os dados do paciente. A confirmação será registrada diretamente no Agendae.</p>
                            </div>
                            <label class="agendae-patient-picker">
                                <span>Paciente vinculado</span>
                                <select id="agendaePaciente" ${patientOptions ? '' : 'disabled'}>
                                    <option value="">${patientOptions ? 'Selecione o paciente' : 'Nenhum paciente vinculado'}</option>
                                    ${patientOptions}
                                </select>
                            </label>
                            <button id="btnAbrirAgendae" class="agendae-management-button" type="button" data-agendae-open disabled>
                                <span id="agendaeButtonText">Preparando agenda…</span>
                                <span aria-hidden="true">→</span>
                            </button>
                            <p id="agendaeLoadStatus" class="agendae-management-status" role="status" aria-live="polite">Conectando ao serviço de agendamento.</p>
                        </article>

                        <aside class="agendae-management-card agendae-management-info">
                            <span class="agendae-management-label">Ambiente independente</span>
                            <h2>Criação sem gestão administrativa</h2>
                            <ul>
                                <li>Serviços e profissionais vêm do cadastro do Agendae.</li>
                                <li>Horários disponíveis são consultados em tempo real.</li>
                                <li>Alterações, cancelamentos e configurações são feitos no Agendae.</li>
                                <li>Agendamentos não são copiados para o banco do TratamentoWeb.</li>
                            </ul>
                        </aside>
                    </section>
                </main>
            </div>
        `;
    }

    attachAgendaEvents() {
        const select = document.getElementById('agendaePaciente');
        const button = document.getElementById('btnAbrirAgendae');
        select?.addEventListener('change', () => this.atualizarBotaoAgenda());
        button?.addEventListener('click', () => {
            const patient = this.pacientesList[Number(select?.value)];
            if (!patient) return;
            setTimeout(() => {
                const root = document.querySelector('agendae-booking-widget')?.shadowRoot;
                const nameInput = root?.querySelector('[name="client"]');
                const phoneInput = root?.querySelector('[name="phone"]');
                if (nameInput) nameInput.value = patient.nome || patient.login || '';
                if (phoneInput) phoneInput.value = patient.whatsapp || patient.telefone || '';
                nameInput?.dispatchEvent(new Event('input', { bubbles: true }));
                phoneInput?.dispatchEvent(new Event('input', { bubbles: true }));
            }, 0);
        });
    }

    atualizarBotaoAgenda() {
        const button = document.getElementById('btnAbrirAgendae');
        const selected = document.getElementById('agendaePaciente')?.value;
        if (button) button.disabled = !this.widgetReady || selected === '' || selected == null;
    }

    async carregarWidgetAgendae() {
        const button = document.getElementById('btnAbrirAgendae');
        const buttonText = document.getElementById('agendaeButtonText');
        const status = document.getElementById('agendaeLoadStatus');

        try {
            await this.garantirScriptWidget();
            if (!window.AgendaeBooking) throw new Error('A interface do Agendae não iniciou.');
            this.widgetReady = true;
            this.atualizarBotaoAgenda();
            if (buttonText) buttonText.textContent = this.pacientesList.length ? 'Escolher horário' : 'Sem pacientes vinculados';
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

        const context = String(this.userInfo.agendae_contexto || '').trim().toUpperCase();
        if (!context) return Promise.reject(new Error('A agenda desta organização não está habilitada.'));

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
