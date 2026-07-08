// plano_alimentar_cliente.js

import { FuncoesCompartilhadas } from './0_home.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { 
    db, collection, getDocs, doc, getDoc
} from '../0_firebase_api_config.js';

export class PlanoAlimentarCliente {
    constructor(userInfo) {
        this.userInfo = userInfo;
        this.funcoes = FuncoesCompartilhadas;
        this.navegador = criarNavegador(userInfo);
        this.isMenuOpen = false;
        this.planosList = [];
        this.planoSelecionado = null;
        this.profissionalInfo = null;
        this.pacienteData = null;
    }

    async render() {
        const app = document.getElementById('app');
        
        await this.carregarDadosPaciente();
        await this.carregarPlanosAlimentares();
        
        app.innerHTML = this.renderHTML();
        this.attachEvents();
    }

    async carregarDadosPaciente() {
        try {
            const userRef = doc(db, 'logins', this.userInfo.login);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                this.pacienteData = userDoc.data();
                
                // Buscar informações do profissional nutricionista vinculado
                if (this.pacienteData.profissionais_vinculados) {
                    for (const [login, info] of Object.entries(this.pacienteData.profissionais_vinculados)) {
                        if (info.cargo === 'nutricionista') {
                            this.profissionalInfo = {
                                login: login,
                                nome: info.nome || login,
                                cargo: info.cargo
                            };
                            break;
                        }
                    }
                }
            }
        } catch (error) {
        }
    }

    async carregarPlanosAlimentares() {
        if (!this.profissionalInfo) {
            this.planosList = [];
            return;
        }

        try {
            const nutricionistaLogin = this.profissionalInfo.login;
            const pacienteLogin = this.userInfo.login; // GARANTE que é o login do paciente logado
            
            // Estrutura: planos_alimentares > nutricionista > paciente (login do paciente)
            const planosRef = collection(db, 'planos_alimentares', nutricionistaLogin, pacienteLogin);
            const querySnapshot = await getDocs(planosRef);
            
            this.planosList = [];
            querySnapshot.forEach((docSnap) => {
                this.planosList.push({ id: docSnap.id, ...docSnap.data() });
            });
            
        } catch (error) {
            this.planosList = [];
        }
    }

    formatarNome(nomeCompleto) {
        if (!nomeCompleto) return 'Usuário';
        let primeiroNome = nomeCompleto.trim().split(' ')[0];
        primeiroNome = primeiroNome.toLowerCase();
        primeiroNome = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1);
        return primeiroNome;
    }

    formatarDataExibicao(documentoId) {
        try {
            const partes = documentoId.split('_');
            const dataParte = partes[0];
            const horaParte = partes[1].replace('h', '');
            
            const [dia, mes, ano] = dataParte.split('-');
            const [hora, minuto] = horaParte.split(':');
            
            return `${dia}/${mes}/${ano} ${hora}:${minuto}h`;
        } catch {
            return documentoId;
        }
    }

    selecionarPlano(planoId) {
        if (this.planoSelecionado === planoId) {
            this.planoSelecionado = null;
        } else {
            this.planoSelecionado = planoId;
        }
        this.render();
    }

    renderHTML() {
        const nomeFormatado = this.formatarNome(this.userInfo.nome);
        const plano = this.pacienteData?.plano || 'Não informado';
        const profissionalNome = this.profissionalInfo?.nome || 'Profissional não vinculado';
        
        return `
            <div class="home-container">
                <div class="header">
                    <div class="header-logo">
                        <img src="./imagens/logo.png" alt="TratamentoWeb" class="header-logo-img">
                        <h1>🍽️ Meu Plano Alimentar</h1>
                    </div>
                    <div class="user-info">
                        <span>👋 Olá, ${nomeFormatado}</span>
                        <button class="menu-toggle-btn" id="menuToggleBtn">☰</button>
                    </div>
                </div>

                <div class="side-menu" id="sideMenu">
                    <div class="menu-header">
                        <h3>Menu</h3>
                        <button class="close-menu" id="closeMenu">×</button>
                    </div>
                    <nav class="menu-nav">
                        <button class="menu-item" data-module="home">
                            <span>🏠</span>
                            <span>Home</span>
                        </button>
                        <button class="menu-item" data-module="meu_plano_alimentar">
                            <span>🍽️</span>
                            <span>Meu Plano Alimentar</span>
                        </button>
                        <button class="menu-item" data-module="minha_anamnese">
                            <span>📋</span>
                            <span>Minha Anamnese</span>
                        </button>
                        <button class="menu-item" data-module="shopping_nutri">
                            <span>🛍️</span>
                            <span>Shopping Nutri</span>
                        </button>
                        <div class="menu-divider"></div>
                        <button class="menu-item logout" id="logoutMenuItem">
                            <span>🚪</span>
                            <span>Sair</span>
                        </button>
                    </nav>
                </div>
                <div class="menu-overlay" id="menuOverlay"></div>

                <div class="content p-3">
                    <div class="client-info mb-3">
                        <h3>📋 Meus Dados</h3>
                        <div class="info-card">
                            <p><strong>👤 Nome:</strong> ${this.userInfo.nome || 'Não informado'}</p>
                            <p><strong>📋 Plano:</strong> ${plano}</p>
                            <p><strong>👨‍⚕️ Nutricionista:</strong> ${profissionalNome}</p>
                            <p><strong>📊 Total de Planos:</strong> ${this.planosList.length}</p>
                        </div>
                    </div>

                    ${this.planosList.length > 0 ? `
                        <div class="planos-list-container">
                            <h3 style="color: #1a237e; margin-bottom: 20px;">
                                📅 Histórico de Planos Alimentares
                                <span style="font-size: 14px; color: #64748b;">(${this.planosList.length} encontrados)</span>
                            </h3>
                            
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                ${this.renderPlanosList()}
                            </div>
                        </div>
                    ` : `
                        <div class="empty-state" style="text-align: center; padding: 60px; background: white; border-radius: 1rem; margin-top: 20px;">
                            <span class="empty-icon" style="font-size: 48px; opacity: 0.5;">🍽️</span>
                            <h3 style="margin-top: 16px;">Nenhum plano alimentar disponível</h3>
                            <p style="color: #64748b;">Seu nutricionista ainda não cadastrou um plano alimentar para você.</p>
                            <p style="color: #64748b; font-size: 13px; margin-top: 8px;">Entre em contato com seu profissional para receber seu plano personalizado.</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    renderPlanosList() {
        // Ordena por data (mais recente primeiro)
        const planosOrdenados = [...this.planosList].sort((a, b) => {
            if (this.isPlanoAtual(a) !== this.isPlanoAtual(b)) {
                return this.isPlanoAtual(a) ? -1 : 1;
            }
            const dataA = this.extrairData(a.id);
            const dataB = this.extrairData(b.id);
            return dataB - dataA;
        });

        return planosOrdenados.map((plano, index) => {
            const isExpanded = this.planoSelecionado === plano.id;
            const dataFormatada = this.formatarDataExibicao(plano.id);
            const planoAtual = this.isPlanoAtual(plano, planosOrdenados, index);

            return `
                <div class="plano-card" style="
                    background: white;
                    border: 2px solid ${planoAtual ? '#22c55e' : '#e2e8f0'};
                    border-radius: 12px;
                    overflow: hidden;
                ">
                    <div onclick="window.planoClienteInstance.selecionarPlano('${plano.id}')" 
                         style="padding: 16px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            ${planoAtual ? `
                                <span style="background: #22c55e; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">
                                    ATUAL
                                </span>
                            ` : `
                                <span style="background: #64748b; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">
                                    Histórico
                                </span>
                            `}
                            
                            <span style="color: #1a237e; font-size: 16px; font-weight: 600;">
                                📅 ${dataFormatada}
                            </span>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${plano.profissional_nome ? `
                                <span style="color: #64748b; font-size: 13px;">
                                    👨‍⚕️ ${plano.profissional_nome}
                                </span>
                            ` : ''}
                            <span style="color: #64748b; font-size: 18px; transition: transform 0.3s; ${isExpanded ? 'transform: rotate(180deg);' : ''}">
                                ▼
                            </span>
                        </div>
                    </div>
                    
                    ${isExpanded ? `
                        <div style="border-top: 1px solid #e2e8f0; padding: 20px; background: #f8fafc;">
                            ${plano.breakfast ? this.renderRefeicaoCard('🌅 Café da Manhã', plano.breakfast, plano.observacoes_refeicoes?.breakfast) : ''}
                            ${plano.morningSnack ? this.renderRefeicaoCard('🍎 Lanche da Manhã', plano.morningSnack, plano.observacoes_refeicoes?.morningSnack) : ''}
                            ${plano.lunch ? this.renderRefeicaoCard('🍽️ Almoço', plano.lunch, plano.observacoes_refeicoes?.lunch) : ''}
                            ${plano.afternoonSnack ? this.renderRefeicaoCard('🍌 Lanche da Tarde', plano.afternoonSnack, plano.observacoes_refeicoes?.afternoonSnack) : ''}
                            ${plano.dinner ? this.renderRefeicaoCard('🌙 Jantar', plano.dinner, plano.observacoes_refeicoes?.dinner) : ''}
                            ${plano.supper ? this.renderRefeicaoCard('⭐ Ceia', plano.supper, plano.observacoes_refeicoes?.supper) : ''}
                            
                            ${plano.guidelines ? this.renderInfoCard('📌 Orientações Gerais', plano.guidelines) : ''}
                            ${plano.restrictions ? this.renderInfoCard('⚠️ Restrições Alimentares', plano.restrictions) : ''}
                            ${plano.goals ? this.renderInfoCard('🎯 Objetivos', plano.goals) : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    isPlanoAtual(plano) {
        return plano?.atual === true;
    }

    renderRefeicaoCard(titulo, conteudo, observacao = '') {
        return `
            <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 8px;">
                <strong style="color: #f97316; display: block; margin-bottom: 6px;">${titulo}</strong>
                <p style="color: #475569; margin: 0; font-size: 14px; white-space: pre-wrap;">${this.escapeHtml(conteudo)}</p>
                ${observacao ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; color: #7c2d12; font-size: 13px; white-space: pre-wrap;"><strong>Obs.:</strong> ${this.escapeHtml(observacao)}</div>` : ''}
            </div>
        `;
    }

    escapeHtml(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    renderInfoCard(titulo, conteudo) {
        return `
            <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 12px;">
                <strong style="color: #f97316; display: block; margin-bottom: 8px;">${titulo}</strong>
                <p style="color: #475569; margin: 0; white-space: pre-wrap;">${conteudo}</p>
            </div>
        `;
    }

    extrairData(documentoId) {
        try {
            const partes = documentoId.split('_');
            const dataParte = partes[0];
            const horaParte = partes[1].replace('h', '');
            
            const [dia, mes, ano] = dataParte.split('-');
            const [hora, minuto] = horaParte.split(':');
            
            return new Date(ano, mes - 1, dia, hora, minuto);
        } catch {
            return new Date(0);
        }
    }

    attachEvents() {
        const menuToggle = document.getElementById('menuToggleBtn');
        const sideMenu = document.getElementById('sideMenu');
        const menuOverlay = document.getElementById('menuOverlay');
        const closeMenu = document.getElementById('closeMenu');

        const openMenu = () => {
            if (sideMenu) sideMenu.classList.add('open');
            if (menuOverlay) menuOverlay.classList.add('open');
            this.isMenuOpen = true;
        };

        const closeMenuFunc = () => {
            if (sideMenu) sideMenu.classList.remove('open');
            if (menuOverlay) menuOverlay.classList.remove('open');
            this.isMenuOpen = false;
        };

        if (menuToggle) menuToggle.addEventListener('click', openMenu);
        if (closeMenu) closeMenu.addEventListener('click', closeMenuFunc);
        if (menuOverlay) menuOverlay.addEventListener('click', closeMenuFunc);

        document.querySelectorAll('.menu-item[data-module]').forEach(item => {
            item.addEventListener('click', async (e) => {
                const module = item.getAttribute('data-module');
                closeMenuFunc();
                await this.navegador.navegarPara(module);
            });
        });

        const logoutMenuItem = document.getElementById('logoutMenuItem');
        if (logoutMenuItem) {
            logoutMenuItem.addEventListener('click', () => {
                closeMenuFunc();
                this.navegador.navegarPara('logout');
            });
        }

        // Expor instância globalmente
        window.planoClienteInstance = this;
    }
}
