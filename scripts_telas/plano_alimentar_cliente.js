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
                    <a class="fab-button manual-usage-button" href="manuais/manual-plano-alimentar-paciente.pdf" download="Manual-de-Uso-Meu-Plano-Alimentar.pdf" title="Baixar Manual de Uso" aria-label="Baixar Manual de Uso" style="position:fixed;right:24px;bottom:24px;z-index:1000;">
                        <span class="fab-icon">?</span><span class="fab-text">Manual de Uso</span>
                    </a>
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
                            ${this.renderPainelDiario(plano)}
                            ${this.getRefeicoes().map((refeicao) => this.renderRefeicaoComCheckin(plano, refeicao)).join('')}
                            
                            ${plano.guidelines ? this.renderInfoCard('📌 Orientações Gerais', plano.guidelines) : ''}
                            ${plano.restrictions ? this.renderInfoCard('⚠️ Restrições Alimentares', plano.restrictions) : ''}
                            ${plano.goals ? this.renderInfoCard('🎯 Objetivos', plano.goals) : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    getRefeicoes() {
        return [
            { id: 'breakfast', titulo: 'Café da Manhã' }, { id: 'morningSnack', titulo: 'Lanche da Manhã' },
            { id: 'lunch', titulo: 'Almoço' }, { id: 'afternoonSnack', titulo: 'Lanche da Tarde' },
            { id: 'dinner', titulo: 'Jantar' }, { id: 'supper', titulo: 'Ceia' }
        ];
    }

    resumoVazio() {
        return { kcal: 0, carboidratos: 0, proteinas: 0, gorduras: 0, gordurasSaturadas: 0, gordurasTrans: 0, fibras: 0 };
    }

    resumoRefeicao(plano, mealId) {
        const total = this.resumoVazio();
        (plano.itens_plano?.[mealId] || []).forEach((item) => {
            const opcoes = Array.isArray(item.opcoes) && item.opcoes.length ? item.opcoes : [item];
            const opcao = opcoes[Math.max(0, Math.min(opcoes.length - 1, Number(item.opcaoVisivelIndex || 0)))];
            Object.keys(total).forEach((campo) => { total[campo] += Number(opcao?.detalhes?.[campo] || 0); });
        });
        return total;
    }

    chaveCheckin(planoId) {
        const hoje = new Date().toLocaleDateString('sv-SE');
        return `checkinPlano:${this.userInfo.login}:${planoId}:${hoje}`;
    }

    obterCheckins(planoId) {
        try { return JSON.parse(localStorage.getItem(this.chaveCheckin(planoId)) || '{}'); } catch { return {}; }
    }

    alternarCheckin(planoId, mealId, marcado) {
        const estado = this.obterCheckins(planoId);
        estado[mealId] = Boolean(marcado);
        localStorage.setItem(this.chaveCheckin(planoId), JSON.stringify(estado));
        this.render();
    }

    renderPainelDiario(plano) {
        const refeicoes = this.getRefeicoes();
        const total = refeicoes.reduce((soma, refeicao) => {
            const parcial = this.resumoRefeicao(plano, refeicao.id);
            Object.keys(soma).forEach((campo) => { soma[campo] += parcial[campo]; });
            return soma;
        }, this.resumoVazio());
        const checkins = this.obterCheckins(plano.id);
        const concluidas = refeicoes.filter((refeicao) => checkins[refeicao.id]).length;
        const meta = Number(plano.meta_calorica || 0);
        const percentualMeta = meta ? Math.min(100, total.kcal / meta * 100) : 0;
        return `<section style="background:white;border:1px solid #c7d2fe;border-radius:12px;padding:14px;margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;"><strong style="color:#1a237e;">Resumo nutricional diário</strong><span>${concluidas}/${refeicoes.length} refeições concluídas</span></div>
            <div style="margin:10px 0 12px;height:12px;background:#e2e8f0;border-radius:99px;overflow:hidden;"><div style="width:${percentualMeta}%;height:100%;background:${percentualMeta >= 95 ? '#16a34a' : '#f97316'};"></div></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;font-size:13px;">
                <span><strong>${total.kcal.toFixed(0)}</strong> / ${meta || '--'} kcal</span><span><strong>${total.proteinas.toFixed(1)}</strong> g proteínas</span>
                <span><strong>${total.carboidratos.toFixed(1)}</strong> g carboidratos</span><span><strong>${total.gorduras.toFixed(1)}</strong> g lipídios</span>
                <span><strong>${total.fibras.toFixed(1)}</strong> g fibras</span><span><strong>${total.gordurasSaturadas.toFixed(1)}</strong> g saturadas</span><span><strong>${total.gordurasTrans.toFixed(1)}</strong> g trans</span>
            </div></section>`;
    }

    renderRefeicaoComCheckin(plano, refeicao) {
        const conteudo = plano[refeicao.id] || '';
        const itens = plano.itens_plano?.[refeicao.id] || [];
        if (!conteudo && !itens.length) return '';
        const resumo = this.resumoRefeicao(plano, refeicao.id);
        const marcado = Boolean(this.obterCheckins(plano.id)[refeicao.id]);
        return `<div style="background:white;padding:12px;border-radius:8px;border:1px solid ${marcado ? '#86efac' : '#e2e8f0'};margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;"><strong style="color:#f97316;">${refeicao.titulo}</strong>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" ${marcado ? 'checked' : ''} onchange="window.planoClienteInstance.alternarCheckin('${plano.id}','${refeicao.id}',this.checked)"> Refeição realizada</label></div>
            <p style="color:#475569;margin:7px 0;font-size:14px;white-space:pre-wrap;">${this.escapeHtml(conteudo)}</p>
            <small style="color:#64748b;">${resumo.kcal.toFixed(0)} kcal · ${resumo.proteinas.toFixed(1)} g proteína · ${resumo.carboidratos.toFixed(1)} g carboidratos · ${resumo.gorduras.toFixed(1)} g lipídios · ${resumo.fibras.toFixed(1)} g fibras</small>
        </div>`;
    }

    isPlanoAtual(plano) {
        return plano?.atual === true;
    }

    renderRefeicaoCard(titulo, conteudo) {
        return `
            <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 8px;">
                <strong style="color: #f97316; display: block; margin-bottom: 6px;">${titulo}</strong>
                <p style="color: #475569; margin: 0; font-size: 14px; white-space: pre-wrap;">${this.escapeHtml(conteudo)}</p>
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
