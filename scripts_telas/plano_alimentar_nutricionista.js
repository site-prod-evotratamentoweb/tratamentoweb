// plano_alimentar_nutricionista.js 

import { FuncoesCompartilhadas } from './0_home.js';
import { MenuProfissional } from './0_complementos_menu_profissional.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { ALIMENTOS_TACO } from './base_alimentos_taco.js';
import { PLANO_BIA_SANTOS_NOVO_MODELO } from './plano_bia_santos_template.js';
import { 
    db,
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    doc, 
    deleteDoc,
    updateDoc,
    getDoc,
    setDoc
} from '../0_firebase_api_config.js';

const CATEGORIAS_ALIMENTOS_PADRAO = [
    'Açúc./doces',
    'Alim. prep.',
    'Aves',
    'Bebidas',
    'Carnes',
    'Cereais',
    'Cogumelos',
    'Frutas',
    'Gord./óleos',
    'Industrial',
    'Laticínios',
    'Legumes',
    'Leguminosos',
    'Nozes/sem.',
    'Outros',
    'Ovos',
    'Pescados',
    'Suplementos',
    'Temperos',
    'Tub./raízes',
    'Verduras'
];

const UNIDADES_ALIMENTOS_PADRAO = [
    'Banda',
    'Bife',
    'Bisnaga',
    'Bola',
    'C. amer.',
    'C. requej.',
    'Caixa',
    'Caneca',
    'Col. café',
    'Col. chá',
    'Col. servir',
    'Col. sobrem',
    'Col. sopa',
    'Concha',
    'Copo',
    'Cubo',
    'Dente',
    'Dose',
    'Envelope',
    'Escumad.',
    'Fatia',
    'Filé',
    'Folha',
    'Frasco',
    'Garrafa',
    'Gomo',
    'Grama',
    'Lata',
    'Litro',
    'Maço',
    'Metade',
    'Miligrama',
    'Mililitro',
    'Oitavo',
    'P. fundo',
    'P. raso',
    'P. sobrem',
    'Pacote',
    'Pedaço',
    'Pegador',
    'Pires',
    'Porção',
    'Posta',
    'Pote',
    'Quarto',
    'Quilograma',
    'Ramo',
    'Rodela',
    'Sachê',
    'Scoop',
    'Talo',
    'Tigela',
    'Tubo',
    'Unidade',
    'Xíc. café',
    'Xíc. chá'
];

function mesclarListaPadrao(padrao, valores) {
    const extras = [...new Set(valores.map((valor) => String(valor || '').trim()).filter(Boolean))]
        .filter((valor) => !padrao.includes(valor))
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return [...padrao, ...extras];
}

const PLANO_BIA_SANTOS_DOCUMENTO_ID = '30-06-2026_14:04h';

export class PlanoAlimentarNutricionista {
    constructor(userInfo, pacientesList) {
        this.userInfo = userInfo;
        this.funcoes = FuncoesCompartilhadas;
        this.pacientesList = pacientesList || [];
        this.selectedPaciente = null;
        this.planosList = [];
        this.planoExpandido = null;
        this.planoEditando = null;
        this.alimentosBase = [];
        this.alimentosCarregados = false;
        this.configAlimentosCarregada = false;
        this.categoriasAlimentos = [];
        this.unidadesAlimentos = [];
        this.alimentoEditandoId = null;
        this.refeicaoSelecionada = 'breakfast';
        this.opcaoDestinoPlano = null;
        this.criandoPlanoBiaSantos = false;
        this.itensPlano = this.criarEstadoItensPlano();
        this.detalhesBuscaAlimentos = {};
        this.menu = null;
        this.navegador = criarNavegador(userInfo, this.pacientesList);
    }

    render() {
        const app = document.getElementById('app');
        app.innerHTML = this.renderHTML();
        
        this.navegador.pacientesList = this.pacientesList;
        
        this.menu = new MenuProfissional(this.userInfo, (module) => this.navegador.navegarPara(module), 'plano_alimentar');
        const menuHtml = this.menu.render();
        const menuContainer = document.getElementById('menuContainer');
        if (menuContainer) {
            menuContainer.innerHTML = menuHtml;
        }
        this.menu.attachEvents();
        
        this.attachEvents();
        if (this.selectedPaciente) {
            this.loadPlanos();
        }
    }

    renderHTML() {
        return `
            <div class="dashboard-container" style="height: calc(100vh - 24px); max-height: calc(100vh - 24px); margin: 12px auto; display: flex; flex-direction: column;">
                <div id="menuContainer"></div>
    
                <div class="main-content" style="flex: 1; overflow: hidden; padding: 14px 20px; min-height: 0;">
                    <!-- Seleção de Paciente -->
                    <div id="pacienteInfo" style="margin-bottom: 24px;">
                        <select id="pacienteSelect" style="width: 100%; max-width: 350px; padding: 10px 14px; border-radius: 10px; border: 2px solid #e2e8f0; background: white;">
                            <option value="">-- Selecione um paciente --</option>
                            ${this.pacientesList.map(p => `
                                <option value="${this.escapeHtml(p.login)}" ${this.selectedPaciente?.login === p.login ? 'selected' : ''}>
                                    ${this.escapeHtml(p.nome)} (${this.escapeHtml(p.login)})
                                </option>
                            `).join('')}
                        </select>
                    </div>
    
                    ${this.selectedPaciente ? `
                        <!-- Lista de Planos -->
                        <div style="margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                                <h3 style="color: #1a237e; margin: 0;">
                                    📋 Planos Alimentares
                                    ${this.planosList.length > 0 ? `<span style="font-size: 14px; color: #64748b;">(${this.planosList.length} encontrados)</span>` : ''}
                                </h3>
                            </div>
                            
                            <div id="planosContainer">
                                ${this.renderPlanosList()}
                            </div>
                        </div>
                    ` : `
                        <div class="empty-state" style="text-align: center; padding: 60px; background: white; border-radius: 1rem;">
                            <span style="font-size: 48px; opacity: 0.5;">👆</span>
                            <h3 style="margin-top: 16px;">Selecione um paciente</h3>
                            <p style="color: #64748b;">Escolha um paciente para visualizar os planos alimentares</p>
                        </div>
                    `}
                </div>
    
                <!-- Botões Flutuantes -->
                <div class="fab-container" style="position: fixed; bottom: 30px; right: 30px; z-index: 1000;">
                    <button id="btnListaAlimentos" class="fab-button fab-button-green" title="Lista de Alimentos">
                        <span class="fab-icon">☷</span>
                        <span class="fab-text">Lista de Alimentos</span>
                    </button>
                    ${this.selectedPaciente ? `
                    ${this.podeCriarPlanoModeloBiaSantos() ? `
                    <button id="btnCriarPlanoBiaSantos" class="fab-button fab-button-green" title="Criar Plano Bia Santos">
                        <span class="fab-icon">+</span>
                        <span class="fab-text">Plano Bia Santos</span>
                    </button>
                    ` : ''}
                    <button id="btnNovoPlano" class="fab-button" title="Novo Plano Alimentar">
                        <span class="fab-icon">+</span>
                        <span class="fab-text">Novo Plano Alimentar</span>
                    </button>
                    ` : ''}
                </div>
    
                <!-- Modal para Criar/Editar Plano -->
                <div id="modalPlano" class="modal-overlay" style="display: none;">
                    <div class="modal-content" style="position: relative; background: white; border-radius: 16px; width: 96vw; max-width: 1520px; height: 96vh; max-height: calc(100vh - 16px); overflow: hidden; margin: 8px auto; display: flex; flex-direction: column;">
                        <div data-plano-form style="padding: 8px 12px; flex: 1; overflow: hidden;">
                            ${this.renderFormularioPlano()}
                        </div>

                        <div style="position: absolute; top: 12px; right: 12px; display: inline-flex; align-items: flex-start; gap: 6px; z-index: 9999;">
                            <button id="btnFecharPlano" type="button" aria-label="Fechar modal" onclick="document.getElementById('modalPlano').style.display='none'" style="width: 40px; height: 40px; padding: 0; background: rgba(15, 23, 42, 0.16); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 20px; display: inline-flex; align-items: center; justify-content: center; transition: opacity 0.2s ease, background 0.2s ease;">
                                X
                            </button>
                        </div>
                        <button id="btnSalvarPlano" class="modal-save-button" type="button" title="Salvar Plano">
                            <span class="modal-save-icon">💾</span>
                            <span class="modal-save-text">Salvar</span>
                        </button>
                    </div>
                </div>

                <div id="modalListaAlimentos" class="modal-overlay" style="display: none;">
                    <div class="modal-content" style="position: relative; background: white; border-radius: 16px; width: 96vw; max-width: 1520px; height: 96vh; max-height: calc(100vh - 16px); overflow: hidden; margin: 8px auto; display: flex; flex-direction: column;">
                        <button onclick="document.getElementById('modalListaAlimentos').style.display='none'"
                                style="position: absolute; top: 12px; right: 12px; z-index: 5; background: rgba(15,23,42,0.14); color: #334155; border: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; font-size: 18px;">
                            X
                        </button>
                        <div data-lista-alimentos-form style="padding: 16px 58px 16px 16px; flex: 1; overflow: hidden;">
                            ${this.renderModalListaAlimentos()}
                        </div>
                    </div>
                </div>

                <div id="modalConfigAlimentos" class="modal-overlay" style="display: none;">
                    <div class="modal-content" style="background: white; border-radius: 16px; width: min(94vw, 860px); max-height: calc(100vh - 24px); overflow: hidden; margin: 12px auto; display: flex; flex-direction: column;">
                        <div style="background: linear-gradient(135deg, #334155 0%, #1e293b 100%); color: white; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center;">
                            <strong style="font-size: 15px;">Configurações</strong>
                            <button id="btnFecharConfigAlimentos" type="button" style="background: rgba(255,255,255,0.18); color: white; border: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; font-size: 18px;">X</button>
                        </div>
                        <div data-config-alimentos-form style="padding: 16px; overflow: auto;">
                            ${this.renderConfiguracoesAlimentos()}
                        </div>
                    </div>
                </div>

                <div id="modalNovoAlimento" class="modal-overlay" style="display: none;">
                    <div class="modal-content" style="background: white; border-radius: 16px; width: min(94vw, 980px); max-height: calc(100vh - 24px); overflow: hidden; margin: 12px auto; display: flex; flex-direction: column;">
                        <div style="background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); color: white; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center;">
                            <strong id="modalNovoAlimentoTitulo" style="font-size: 15px;">Novo Alimento</strong>
                            <button id="btnFecharNovoAlimento" type="button" style="background: rgba(255,255,255,0.18); color: white; border: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; font-size: 18px;">X</button>
                        </div>
                        <div data-novo-alimento-form style="padding: 16px; overflow: auto;">
                            ${this.renderFormularioAlimento()}
                        </div>
                    </div>
                </div>

                <div id="modalDetalheAlimento" class="modal-overlay" style="display: none;">
                    <div class="modal-content" style="background: white; border-radius: 16px; width: min(92vw, 560px); max-width: 560px; max-height: calc(100vh - 24px); overflow: hidden; margin: 12px auto; display: flex; flex-direction: column;">
                        <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: white; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center;">
                            <strong style="font-size: 15px;">Detalhes do alimento</strong>
                            <button id="btnFecharDetalheAlimento" type="button" style="background: rgba(255,255,255,0.18); color: white; border: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; font-size: 18px;">✕</button>
                        </div>
                        <div data-detalhe-alimento-form style="padding: 16px; overflow: auto; font-size: 14px; color: #334155;"></div>
                    </div>
                </div>
    
                <style>
                    .fab-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: flex-end;
                        gap: 12px;
                    }
                    
                    .fab-button {
                        background: #1a237e;
                        color: white;
                        border: none;
                        border-radius: 50px;
                        padding: 12px;
                        cursor: pointer;
                        box-shadow: 0 4px 12px rgba(26, 35, 126, 0.3);
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: 0;
                        width: 56px;
                        height: 56px;
                        overflow: hidden;
                        white-space: nowrap;
                    }
                    
                    .fab-button:hover {
                        width: 260px;
                        padding: 12px 24px;
                        gap: 12px;
                        background: #283593;
                        box-shadow: 0 6px 20px rgba(26, 35, 126, 0.4);
                    }

                    .fab-button-green {
                        background: #0f766e;
                        box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);
                    }

                    .fab-button-green:hover {
                        width: 240px;
                        background: #115e59;
                        box-shadow: 0 6px 20px rgba(15, 118, 110, 0.4);
                    }

                    .modal-save-button {
                        position: absolute;
                        right: 18px;
                        bottom: 18px;
                        width: 56px;
                        height: 56px;
                        padding: 0;
                        border: none;
                        border-radius: 50px;
                        background: #1a237e;
                        color: white;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0;
                        overflow: hidden;
                        white-space: nowrap;
                        box-shadow: 0 4px 12px rgba(26, 35, 126, 0.3);
                        transition: all 0.3s ease;
                        z-index: 9999;
                    }

                    .modal-save-button:hover {
                        width: 150px;
                        padding: 0 18px 0 0;
                        gap: 10px;
                        background: #283593;
                        box-shadow: 0 6px 20px rgba(26, 35, 126, 0.4);
                    }

                    .modal-save-icon {
                        font-size: 22px;
                        flex: 0 0 56px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .modal-save-text {
                        opacity: 0;
                        transform: translateX(-8px);
                        transition: all 0.3s ease;
                        font-size: 16px;
                        font-weight: 600;
                    }

                    .modal-save-button:hover .modal-save-text {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    
                    .fab-icon {
                        font-size: 28px;
                        font-weight: 300;
                        min-width: 32px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .fab-text {
                        opacity: 0;
                        transform: translateX(-10px);
                        transition: all 0.3s ease;
                        font-size: 16px;
                        font-weight: 600;
                    }
                    
                    .fab-button:hover .fab-text {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    
                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.5);
                        z-index: 2000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }
                    
                    .plano-card {
                        transition: all 0.3s ease;
                    }
                    
                    .plano-card:hover {
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    }
                    
                    .plano-detalhes {
                        animation: slideDown 0.3s ease;
                    }
                    
                    @keyframes slideDown {
                        from {
                            opacity: 0;
                            max-height: 0;
                        }
                        to {
                            opacity: 1;
                            max-height: 2000px;
                        }
                    }
                    
                    .meal-textarea {
                        font-family: inherit;
                        line-height: 1.5;
                    }
                    
                    .meal-textarea:focus {
                        outline: none;
                        box-shadow: 0 0 0 2px #1a237e;
                        border-radius: 4px;
                    }
                    
                    textarea[readonly] {
                        background: #f1f5f9;
                        cursor: default;
                    }
                </style>
            </div>
        `;
    }

    renderPlanosList() {
        if (!this.planosList || this.planosList.length === 0) {
            return `
                <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 16px; border: 2px dashed #e2e8f0;">
                    <span style="font-size: 64px; display: block; margin-bottom: 16px;">📋</span>
                    <h4 style="color: #64748b; margin-bottom: 8px;">Nenhum plano alimentar</h4>
                    <p style="color: #94a3b8; margin-bottom: 24px;">Clique no botão + para criar o primeiro plano</p>
                </div>
            `;
        }

        // Ordena por data (mais recente primeiro)
        const planosOrdenados = [...this.planosList].sort((a, b) => {
            const dataA = this.extrairData(a.id);
            const dataB = this.extrairData(b.id);
            return dataB - dataA;
        });

        return planosOrdenados.map((plano, index) => {
            const isExpanded = this.planoExpandido === plano.id;
            const dataFormatada = this.formatarDataExibicao(plano.id);
            
            return `
                <div class="plano-card" style="
                    background: white; 
                    border: 2px solid ${index === 0 ? '#22c55e' : '#e2e8f0'}; 
                    border-radius: 12px; 
                    margin-bottom: 16px; 
                    overflow: hidden;
                ">
                    <!-- Cabeçalho do Card -->
                    <div onclick="window.planoAlimentarInstance.toggleExpandirPlano('${plano.id}')" 
                         style="padding: 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <span style="
                                background: ${index === 0 ? '#22c55e' : '#64748b'}; 
                                color: white; 
                                padding: 6px 14px; 
                                border-radius: 20px; 
                                font-size: 14px; 
                                font-weight: 600;
                            ">
                                ${index === 0 ? 'ATUAL' : `v${planosOrdenados.length - index}`}
                            </span>
                            
                            <span style="color: #1a237e; font-size: 16px; font-weight: 600;">
                                📅 ${dataFormatada}
                            </span>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${plano.goals ? `
                                <span style="color: #475569; font-size: 13px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    🎯 ${this.escapeHtml(plano.goals)}
                                </span>
                            ` : ''}
                            <span style="color: #64748b; font-size: 20px; transition: transform 0.3s; ${isExpanded ? 'transform: rotate(180deg);' : ''}">
                                ▼
                            </span>
                        </div>
                    </div>
                    
                    <!-- Detalhes Expandidos -->
                    ${isExpanded ? `
                        <div class="plano-detalhes" style="border-top: 1px solid #e2e8f0; padding: 20px; background: #f8fafc;">
                            <!-- Informações -->
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 20px;">
                                <div style="background: white; padding: 12px; border-radius: 8px;">
                                    <strong style="color: #1a237e;">👨‍⚕️ Profissional:</strong>
                                    <span style="color: #475569;">${this.escapeHtml(plano.profissional_nome || 'Não informado')}</span>
                                </div>
                                <div style="background: white; padding: 12px; border-radius: 8px;">
                                    <strong style="color: #1a237e;">📅 Data:</strong>
                                    <span style="color: #475569;">${dataFormatada}</span>
                                </div>
                            </div>
                            
                            <!-- Refeições -->
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin-bottom: 16px;">
                                ${this.renderRefeicaoCard('🌅 Café da Manhã', plano.breakfast)}
                                ${this.renderRefeicaoCard('🍎 Lanche da Manhã', plano.morningSnack)}
                                ${this.renderRefeicaoCard('🍽️ Almoço', plano.lunch)}
                                ${this.renderRefeicaoCard('🍌 Lanche da Tarde', plano.afternoonSnack)}
                                ${this.renderRefeicaoCard('🌙 Jantar', plano.dinner)}
                                ${this.renderRefeicaoCard('⭐ Ceia', plano.supper)}
                            </div>
                            
                            <!-- Informações Adicionais -->
                            ${plano.guidelines ? this.renderInfoCard('📌 Orientações Gerais', plano.guidelines) : ''}
                            ${plano.restrictions ? this.renderInfoCard('⚠️ Restrições', plano.restrictions) : ''}
                            ${plano.goals ? this.renderInfoCard('🎯 Objetivos', plano.goals) : ''}
                            
                            <!-- Botões de Ação -->
                            <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
                                <button onclick="window.planoAlimentarInstance.editarPlano('${plano.id}')" 
                                        style="padding: 10px 20px; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                    ✏️ Editar
                                </button>
                                <button onclick="window.planoAlimentarInstance.exportarPlano('${plano.id}')" 
                                        style="padding: 10px 20px; background: #0ea5e9; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                    📥 Exportar
                                </button>
                                <button onclick="window.planoAlimentarInstance.clonarPlano('${plano.id}')" 
                                        style="padding: 10px 20px; background: #8b5cf6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                    📋 Clonar
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    renderRefeicaoCard(titulo, conteudo) {
        if (!conteudo || conteudo.trim() === '') return '';
        
        return `
            <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <strong style="color: #1a237e; display: block; margin-bottom: 6px;">${titulo}</strong>
                <p style="color: #475569; margin: 0; font-size: 14px; white-space: pre-wrap;">${this.escapeHtml(conteudo)}</p>
            </div>
        `;
    }

    renderInfoCard(titulo, conteudo) {
        return `
            <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 12px;">
                <strong style="color: #1a237e; display: block; margin-bottom: 8px;">${titulo}</strong>
                <p style="color: #475569; margin: 0; white-space: pre-wrap;">${this.escapeHtml(conteudo)}</p>
            </div>
        `;
    }

    getAlimentosIniciais() {
        return ALIMENTOS_TACO;
    }

    podeCriarPlanoModeloBiaSantos() {
        return this.userInfo?.login === 'grazielle.carvalho'
            && this.selectedPaciente?.login === 'bia.santos';
    }

    planoModeloBiaSantosJaExiste() {
        return this.planosList.some((plano) => (
            plano.id === PLANO_BIA_SANTOS_DOCUMENTO_ID
            || (
            plano.modelo_plano === 'base_nutricional_linhas_v2_opcoes'
            && plano.paciente_login === 'bia.santos'
            && plano.origem_plano_antigo === PLANO_BIA_SANTOS_NOVO_MODELO.origem_plano_antigo
            )
        ));
    }

    obterPlanoModeloBiaSantosAleatorio() {
        return this.planosList.find((plano) => (
            plano.id !== PLANO_BIA_SANTOS_DOCUMENTO_ID
            && plano.modelo_plano === 'base_nutricional_linhas_v2_opcoes'
            && plano.paciente_login === 'bia.santos'
            && plano.origem_plano_antigo === PLANO_BIA_SANTOS_NOVO_MODELO.origem_plano_antigo
        ));
    }

    normalizarBusca(valor) {
        return String(valor || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    escapeHtml(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async carregarBaseAlimentos() {
        if (this.alimentosCarregados) return;

        const ref = collection(db, 'base_alimentos_nutricionais');
        const snapshot = await getDocs(ref);
        this.alimentosBase = [];
        snapshot.forEach((docSnap) => {
            if (docSnap.id !== '_configuracoes_alimentos') {
                this.alimentosBase.push({ id: docSnap.id, ...docSnap.data() });
            }
        });

        if (this.alimentosBase.length === 0) {
            for (const alimento of this.getAlimentosIniciais()) {
                await addDoc(ref, {
                    ...alimento,
                    fonte: alimento.fonte || 'base_inicial_editavel',
                    criado_por: this.userInfo.login,
                    data_criacao: new Date().toISOString()
                });
            }

            const novoSnapshot = await getDocs(ref);
            this.alimentosBase = [];
            novoSnapshot.forEach((docSnap) => {
                if (docSnap.id !== '_configuracoes_alimentos') {
                    this.alimentosBase.push({ id: docSnap.id, ...docSnap.data() });
                }
            });
        }

        this.alimentosCarregados = true;
    }

    obterCategoriasDerivadas() {
        const valores = [
            ...this.getAlimentosIniciais().map((alimento) => alimento.categoria),
            ...this.alimentosBase.map((alimento) => alimento.categoria)
        ];
        return mesclarListaPadrao(CATEGORIAS_ALIMENTOS_PADRAO, valores);
    }

    obterUnidadesDerivadas() {
        const valores = [
            ...this.getAlimentosIniciais().map((alimento) => alimento.unidadePadrao),
            ...this.alimentosBase.map((alimento) => alimento.unidadePadrao)
        ];
        return mesclarListaPadrao(UNIDADES_ALIMENTOS_PADRAO, valores);
    }

    async carregarConfiguracoesAlimentos() {
        if (this.configAlimentosCarregada) return;

        const configRef = doc(db, 'base_alimentos_nutricionais', '_configuracoes_alimentos');
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
            const data = configSnap.data();
            this.categoriasAlimentos = Array.isArray(data.categorias) ? data.categorias : [];
            this.unidadesAlimentos = Array.isArray(data.unidades) ? data.unidades : [];
        }

        if (!this.categoriasAlimentos.length) {
            this.categoriasAlimentos = this.obterCategoriasDerivadas();
        }

        if (!this.unidadesAlimentos.length) {
            this.unidadesAlimentos = this.obterUnidadesDerivadas();
        }

        this.configAlimentosCarregada = true;
    }

    renderSelectOptions(valores = [], selected = '') {
        return valores.map((valor) => `
            <option value="${this.escapeHtml(valor)}" ${valor === selected ? 'selected' : ''}>${this.escapeHtml(valor)}</option>
        `).join('');
    }

    renderConfiguracoesAlimentos() {
        return `
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;">
                <div style="display: grid; gap: 10px;">
                    <label style="font-size: 12px; color: #475569; font-weight: 600;">Categorias existentes
                        <textarea id="configCategoriasAlimentos" rows="12" style="width: 100%; resize: vertical; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit;">${this.escapeHtml(this.categoriasAlimentos.join('\n'))}</textarea>
                    </label>
                </div>
                <div style="display: grid; gap: 10px;">
                    <label style="font-size: 12px; color: #475569; font-weight: 600;">Unidades existentes
                        <textarea id="configUnidadesAlimentos" rows="12" style="width: 100%; resize: vertical; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit;">${this.escapeHtml(this.unidadesAlimentos.join('\n'))}</textarea>
                    </label>
                </div>
                <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 8px;">
                    <button id="btnCancelarConfigAlimentos" type="button" style="padding: 10px 14px; border: none; border-radius: 8px; background: #e2e8f0; color: #334155; cursor: pointer;">Cancelar</button>
                    <button id="btnSalvarConfigAlimentos" type="button" style="padding: 10px 16px; border: none; border-radius: 8px; background: #0f766e; color: white; cursor: pointer; font-weight: 600;">Salvar Configurações</button>
                </div>
            </div>
        `;
    }

    filtrarAlimentos(termo = '') {
        const busca = this.normalizarBusca(termo);
        if (!busca) return [];

        return this.alimentosBase
            .filter((alimento) => this.normalizarBusca(alimento.nome).startsWith(busca))
            .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))
            .slice(0, 20);
    }

    calcularNutrientes(alimento, quantidade, tipoQuantidade, gramasManual) {
        const qtd = Number(quantidade || 0);
        const gramas = tipoQuantidade === 'unidade'
            ? qtd * Number(alimento.gramasPorUnidade || 100)
            : Number(gramasManual || qtd || 0);
        const fator = gramas / 100;

        return {
            gramas,
            kcal: Number(alimento.kcal || 0) * fator,
            carboidratos: Number(alimento.carboidratos || 0) * fator,
            proteinas: Number(alimento.proteinas || 0) * fator,
            gorduras: Number(alimento.gorduras || 0) * fator,
            fibras: Number(alimento.fibras || 0) * fator,
            sodio: Number(alimento.sodio || 0) * fator
        };
    }

    formatarNumero(valor, casas = 1) {
        return Number(valor || 0).toLocaleString('pt-BR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: casas
        });
    }

    formatarQuantidadePreview(alimento, quantidade = 1, curto = false) {
        const qtd = Number(quantidade || 0);
        const unidade = alimento.unidadePadrao || 'porcao';
        const gramas = qtd * Number(alimento.gramasPorUnidade || 100);

        if (curto) {
            return `${this.formatarNumero(qtd)} ${unidade}`;
        }

        return `${this.formatarNumero(qtd)} ${unidade} (${this.formatarNumero(gramas, 0)} g)`;
    }

    getRefeicoesPlano() {
        return [
            { id: 'breakfast', titulo: 'Café da Manhã' },
            { id: 'morningSnack', titulo: 'Lanche da Manhã' },
            { id: 'lunch', titulo: 'Almoço' },
            { id: 'afternoonSnack', titulo: 'Lanche da Tarde' },
            { id: 'dinner', titulo: 'Jantar' },
            { id: 'supper', titulo: 'Ceia' }
        ];
    }

    gerarIdItemPlano() {
        return `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    resumirTextoItemPlano(texto) {
        return String(texto || '')
            .split('|')[0]
            .trim();
    }

    criarItemPlanoDeLinha(linha) {
        const texto = this.resumirTextoItemPlano(linha);
        return {
            id: this.gerarIdItemPlano(),
            texto,
            detalhes: null,
            opcoes: [{
                id: this.gerarIdItemPlano(),
                texto,
                detalhes: null
            }],
            detalhesAberto: false
        };
    }

    criarOpcaoItemPlano(alimento, quantidade) {
        const nutrientes = this.calcularNutrientes(alimento, quantidade, 'unidade');
        const quantidadeTexto = this.formatarQuantidadePreview(alimento, quantidade, true);
        const texto = `${alimento.nome} - ${quantidadeTexto}`;

        return {
            id: this.gerarIdItemPlano(),
            texto,
            detalhes: {
                nome: alimento.nome,
                quantidadeTexto,
                gramas: nutrientes.gramas,
                kcal: nutrientes.kcal,
                carboidratos: nutrientes.carboidratos,
                proteinas: nutrientes.proteinas,
                gorduras: nutrientes.gorduras
            }
        };
    }

    normalizarItemPlano(item) {
        const texto = this.resumirTextoItemPlano(item.texto || '');
        const opcoesOriginais = Array.isArray(item.opcoes) && item.opcoes.length
            ? item.opcoes
            : [{
                id: item.id || this.gerarIdItemPlano(),
                texto,
                detalhes: item.detalhes || null
            }];

        const opcoes = opcoesOriginais
            .map((opcao) => ({
                id: opcao.id || this.gerarIdItemPlano(),
                texto: this.resumirTextoItemPlano(opcao.texto || ''),
                detalhes: opcao.detalhes || null
            }))
            .filter((opcao) => opcao.texto);

        return {
            id: item.id || this.gerarIdItemPlano(),
            texto: opcoes.length ? this.formatarTextoItemPlano({ opcoes }) : texto,
            detalhes: item.detalhes || opcoes[0]?.detalhes || null,
            opcoes,
            opcaoVisivelIndex: Number(item.opcaoVisivelIndex || 0),
            detalhesAberto: false
        };
    }

    formatarTextoItemPlano(item) {
        const opcoes = Array.isArray(item.opcoes) ? item.opcoes.filter((opcao) => opcao.texto) : [];
        if (!opcoes.length) return this.resumirTextoItemPlano(item.texto || '');
        if (opcoes.length === 1) return opcoes[0].texto;
        return opcoes.map((opcao, index) => `Opção ${index + 1}: ${opcao.texto}`).join(' ou ');
    }

    criarEstadoItensPlano(plano = {}) {
        return this.getRefeicoesPlano().reduce((estado, refeicao) => {
            if (Array.isArray(plano.itens_plano?.[refeicao.id])) {
                estado[refeicao.id] = plano.itens_plano[refeicao.id]
                    .map((item) => this.normalizarItemPlano(item))
                    .filter((item) => item.opcoes.length || item.texto);
                return estado;
            }

            const linhas = String(plano[refeicao.id] || '')
                .split('\n')
                .map((linha) => linha.trim())
                .filter(Boolean);
            estado[refeicao.id] = linhas.map((linha) => this.criarItemPlanoDeLinha(linha));
            return estado;
        }, {});
    }

    renderRefeicoesPlano() {
        return `
            <div id="mealItemsGrid" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-auto-rows: minmax(0, 1fr); gap: 12px; height: 100%; min-height: 0; overflow: hidden;">
                ${this.getRefeicoesPlano().map((refeicao) => this.renderRefeicaoEditor(refeicao)).join('')}
            </div>
        `;
    }

    renderRefeicaoEditor(refeicao) {
        const itens = this.itensPlano[refeicao.id] || [];
        const selecionada = this.refeicaoSelecionada === refeicao.id;

        return `
            <div class="meal-editor-card" data-meal-id="${refeicao.id}" style="background: white; border: 2px solid ${selecionada ? '#1a237e' : '#e2e8f0'}; border-radius: 10px; overflow: visible; height: 100%; min-height: 0; cursor: pointer; display: flex; flex-direction: column;">
                <div style="background: ${selecionada ? '#1a237e' : '#f1f5f9'}; color: ${selecionada ? 'white' : '#1a237e'}; padding: 10px 14px; font-weight: 600; display: flex; justify-content: space-between; gap: 8px;">
                    <span>${refeicao.titulo}</span>
                    ${selecionada ? '<span style="font-size: 12px; font-weight: 500;">Selecionada</span>' : ''}
                </div>
                <div style="padding: 10px; display: grid; gap: 8px; flex: 1; overflow-y: auto; min-height: 0;">
                    ${itens.length ? itens.map((item) => this.renderItemRefeicao(refeicao.id, item)).join('') : '<div style="color: #94a3b8; font-size: 13px; padding: 10px; border: 1px dashed #cbd5e1; border-radius: 8px;">Nenhum alimento nesta refeição.</div>'}
                </div>
            </div>
        `;
    }

    renderItemRefeicao(mealId, item) {
        const ativoParaOpcao = this.opcaoDestinoPlano?.mealId === mealId && this.opcaoDestinoPlano?.itemId === item.id;
        const opcoes = Array.isArray(item.opcoes) && item.opcoes.length
            ? item.opcoes
            : [{ id: item.id, texto: item.texto, detalhes: item.detalhes }];
        const opcaoVisivelIndex = Math.max(0, Math.min(opcoes.length - 1, Number(item.opcaoVisivelIndex || 0)));
        const opcaoVisivel = opcoes[opcaoVisivelIndex];
        const proximaOpcaoIndex = opcoes.length > 1 ? (opcaoVisivelIndex + 1) % opcoes.length : 0;

        return `
            <div class="meal-item-row" data-meal-id="${mealId}" data-item-id="${item.id}" style="position: relative; overflow: visible; border: 1px solid #dbe3ef; border-left: 4px solid #1a237e; border-radius: 8px; padding: 9px; background: #f8fafc;">
                <div style="display: grid; grid-template-columns: 1fr auto auto auto; gap: 8px; align-items: start;">
                    <div style="display: grid; gap: 5px; min-width: 0;">
                        <div style="display: grid; grid-template-columns: auto 1fr; gap: 6px; align-items: start; color: #334155; font-size: 13px; line-height: 1.35;">
                            <span style="color: #1a237e; font-weight: 700; white-space: nowrap;">Opção ${opcaoVisivelIndex + 1}</span>
                            <span>${this.escapeHtml(opcaoVisivel.texto)}</span>
                        </div>
                        ${opcoes.length > 1 ? `<div style="font-size: 11px; color: #64748b;">${opcoes.length} opções cadastradas para este alimento</div>` : ''}
                    </div>
                    <button type="button" class="btnAdicionarOpcaoItemPlano" data-meal-id="${mealId}" data-item-id="${item.id}" aria-label="Adicionar opção" title="Adicionar opção neste alimento" style="width: 30px; min-width: 30px; height: 30px; padding: 0; border: none; border-radius: 7px; background: ${ativoParaOpcao ? '#1a237e' : '#dcfce7'}; color: ${ativoParaOpcao ? 'white' : '#166534'}; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700;">+</button>
                    ${opcoes.length > 1 ? `<button type="button" class="btnAlternarOpcaoItemPlano" data-meal-id="${mealId}" data-item-id="${item.id}" aria-label="Ver opção ${proximaOpcaoIndex + 1}" title="Ver opção ${proximaOpcaoIndex + 1}" style="width: 30px; min-width: 30px; height: 30px; padding: 0; border: none; border-radius: 7px; background: #fef3c7; color: #92400e; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">${proximaOpcaoIndex + 1}</button>` : `<button type="button" aria-hidden="true" tabindex="-1" style="width: 30px; min-width: 30px; height: 30px; padding: 0; border: none; background: transparent;"></button>`}
                    <button type="button" class="btnDetalhesItemPlano" data-meal-id="${mealId}" data-item-id="${item.id}" aria-label="Exibir detalhes" title="Ver detalhes da opção atual" style="width: 30px; min-width: 30px; height: 30px; padding: 0; border: none; border-radius: 7px; background: #e0f2fe; color: #0369a1; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">&#128065;</button>
                    <button type="button" class="btnExcluirItemPlano" data-meal-id="${mealId}" data-item-id="${item.id}" aria-label="Excluir item" style="padding: 6px 9px; border: none; border-radius: 7px; background: #fee2e2; color: #b91c1c; cursor: pointer;">X</button>
                </div>
                ${ativoParaOpcao ? '<div style="margin-top: 7px; font-size: 12px; color: #1a237e; font-weight: 600;">Selecione um alimento acima para adicionar como próxima opção.</div>' : ''}
            </div>
        `;
    }

    renderBaseNutricional() {
        const termo = document.getElementById('foodSearch')?.value || '';
        const alimentos = this.filtrarAlimentos(termo);
        return `
                <div style="background: #f8fafc; border: 1px solid #dbe3ef; border-radius: 12px; padding: 6px 8px; margin-bottom: 10px; flex: 0 0 auto; overflow: hidden; height: 72px; box-sizing: border-box;">
                <div style="display: grid; grid-template-columns: minmax(132px, 0.68fr) minmax(0, 4.32fr); gap: 8px; align-items: start; min-width: 0; height: 100%;">
                    <label style="display: grid; grid-template-rows: 16px 30px; gap: 4px; min-width: 0; align-items: start;">
                        <span style="font-size: 11px; color: #334155; font-weight: 700; line-height: 1; white-space: nowrap;">Pesquisar Alimento</span>
                        <input id="foodSearch" autocomplete="off" style="width: 100%; min-width: 0; padding: 5px 7px; border: 1px solid #cbd5e1; border-radius: 8px; height: 30px; font-size: 13px;" value="${this.escapeHtml(termo)}">
                    </label>
                    <div id="foodResults" style="min-width: 0; display: flex; gap: 8px; overflow-x: auto; overflow-y: hidden; padding: 0 0 8px 0; align-items: flex-start; min-height: 0; height: 100%; scrollbar-gutter: stable;">
                        ${this.renderResultadosAlimentos(alimentos)}
                    </div>
                </div>
            </div>
        `;
    }

    obterQuantidadeAlimento(foodId) {
        const input = document.getElementById(`foodQuantidade_${foodId}`);
        return Math.max(1, Math.min(9999, Number(input?.value || 1)));
    }

    atualizarPreviewQuantidadeAlimento(foodId) {
        const alimento = this.alimentosBase.find((item) => item.id === foodId);
        if (!alimento) return;

        const preview = document.querySelector(`[data-quantidade-preview="${foodId}"]`);
        if (preview) {
            preview.textContent = alimento.unidadePadrao || 'porcao';
        }
    }

    renderResultadosAlimentos(alimentos) {
        if (!alimentos.length) {
            return '';
        }

        return alimentos.map((alimento) => {
            const quantidadeId = `foodQuantidade_${alimento.id}`;
            const quantidadeValor = Number(document.getElementById(quantidadeId)?.value || 1);
            const unidadeMedida = alimento.unidadePadrao || 'porcao';
            return `
                <div style="box-sizing: border-box; min-width: 0; flex: 0 0 calc((100% - 16px) / 3); height: 50px; overflow: hidden; display: grid; grid-template-columns: minmax(96px, 1fr) 52px minmax(46px, 0.44fr) 30px 30px; grid-template-rows: 16px 30px; gap: 4px 5px; align-items: start; padding-left: 8px; border-left: 2px solid #cbd5e1;">
                    <div style="font-size: 11px; color: #334155; font-weight: 700; line-height: 1; white-space: nowrap;">Nome do Alimento</div>
                    <div style="font-size: 11px; color: #334155; font-weight: 700; line-height: 1; white-space: nowrap;">QTD.</div>
                    <div style="font-size: 11px; color: #334155; font-weight: 700; line-height: 1; white-space: nowrap;">UNID.</div>
                    <div aria-hidden="true"></div>
                    <div aria-hidden="true"></div>
                    <div style="height: 30px; color: #1a237e; display: flex; align-items: center; overflow-x: auto; overflow-y: hidden; white-space: nowrap; font-size: 13px; line-height: 1.2; min-width: 0; border: 1px solid #e2e8f0; border-radius: 7px; padding: 0 7px; background: white;" title="${this.escapeHtml(alimento.nome)}">${this.escapeHtml(alimento.nome)}</div>
                    <label style="display: block; min-width: 0;">
                        <input id="${quantidadeId}" class="food-quantidade-input" data-food-id="${this.escapeHtml(alimento.id)}" type="number" min="1" max="9999" step="1" value="${Math.max(1, Math.min(9999, Math.round(quantidadeValor || 1)))}" oninput="this.value=this.value.slice(0,4)" aria-label="Quantidade de ${this.escapeHtml(alimento.nome)}" style="width: 52px; min-width: 52px; padding: 5px 4px; border: 1px solid #cbd5e1; border-radius: 7px; height: 30px; font-size: 13px;">
                    </label>
                    <div data-quantidade-preview="${this.escapeHtml(alimento.id)}" title="${this.escapeHtml(unidadeMedida)}" style="height: 30px; display: flex; align-items: center; font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; border: 1px solid #e2e8f0; border-radius: 7px; padding: 0 7px; background: white;">${this.escapeHtml(unidadeMedida)}</div>
                    <button type="button" class="btnDetalhesBuscaAlimento" data-food-id="${this.escapeHtml(alimento.id)}" aria-label="Ver detalhes" style="width: 30px; min-width: 30px; height: 30px; padding: 0; border: none; border-radius: 8px; background: #e0f2fe; color: #0369a1; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">&#128065;</button>
                    <button type="button" class="btnAdicionarAlimento" data-food-id="${this.escapeHtml(alimento.id)}" aria-label="Adicionar alimento" style="width: 30px; min-width: 30px; height: 30px; padding: 0; border: none; border-radius: 8px; background: #16a34a; color: white; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">+</button>
                    </div>
            `;
        }).join('');
    }

    renderizarPlanosContainer() {
        const container = document.getElementById('planosContainer');
        if (container) {
            container.innerHTML = this.renderPlanosList();
        }
    }

    renderFormularioPlano() {
        return `
            <div style="display: flex; flex-direction: column; gap: 14px; height: 100%; min-height: 0; overflow: hidden;">
                ${this.renderBaseNutricional()}
                <div style="flex: 1; min-height: 0; overflow: hidden; padding-right: 4px;">
                    ${this.renderRefeicoesPlano()}
                </div>
            </div>
        `;
    }

    filtrarAlimentosCadastro(termo = '') {
        const busca = this.normalizarBusca(termo);
        return this.alimentosBase
            .filter((alimento) => !busca || this.normalizarBusca(alimento.nome).startsWith(busca))
            .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    }

    renderModalListaAlimentos() {
        const termo = document.getElementById('listaFoodSearch')?.value || '';
        const alimentos = this.filtrarAlimentosCadastro(termo);

        return `
            <div style="display: flex; flex-direction: column; gap: 14px; height: 100%; overflow: hidden;">
                <div style="background: #f8fafc; border: 1px solid #dbe3ef; border-radius: 12px; padding: 14px; flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: grid; grid-template-columns: minmax(220px, 1fr) auto auto auto auto auto; gap: 8px; align-items: end; flex: 0 0 auto;">
                        <label style="font-size: 12px; color: #475569;">Pesquisar Alimento
                            <input id="listaFoodSearch" autocomplete="off" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;" value="${this.escapeHtml(termo)}">
                        </label>
                        <button id="btnConfigAlimentos" type="button" style="padding: 10px 14px; border: none; border-radius: 8px; background: #475569; color: white; cursor: pointer; font-weight: 600;">Configurações</button>
                        <button id="btnNovoAlimento" type="button" style="padding: 10px 14px; border: none; border-radius: 8px; background: #0f766e; color: white; cursor: pointer; font-weight: 600;">Novo Alimento</button>
                        <button id="btnAtualizarListaTaco" type="button" style="padding: 10px 14px; border: none; border-radius: 8px; background: #15803d; color: white; cursor: pointer; font-weight: 600;">Atualizar TACO</button>
                        <button id="btnExportarListaAlimentos" type="button" style="padding: 10px 14px; border: none; border-radius: 8px; background: #1a237e; color: white; cursor: pointer; font-weight: 600;">Exportar Lista</button>
                        <button id="btnImportarListaAlimentos" type="button" style="padding: 10px 14px; border: none; border-radius: 8px; background: #334155; color: white; cursor: pointer; font-weight: 600;">Importar Lista</button>
                        <input id="inputImportarListaAlimentos" type="file" accept=".xlsx,.xls" style="display: none;">
                    </div>

                    <div id="listaFoodResults" style="flex: 1; overflow-y: auto; display: grid; gap: 8px; padding-right: 4px;">
                        ${this.renderResultadosListaAlimentos(alimentos)}
                    </div>
                </div>
            </div>
        `;
    }

    renderFormularioAlimento() {
        return `
            <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; align-items: end;">
                <label style="font-size: 12px; color: #475569; grid-column: span 2;">Nome<input id="foodNome" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                <label style="font-size: 12px; color: #475569;">Categoria
                    <select id="foodCategoria" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: white;">
                        <option value="">Selecione</option>
                        ${this.renderSelectOptions(this.categoriasAlimentos)}
                    </select>
                </label>
                <label style="font-size: 12px; color: #475569;">Unidade
                    <select id="foodUnidade" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: white;">
                        <option value="">Selecione</option>
                        ${this.renderSelectOptions(this.unidadesAlimentos)}
                    </select>
                </label>
                <label style="font-size: 12px; color: #475569;">g/unid<input id="foodGramasUnidade" type="number" step="0.1" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                <label style="font-size: 12px; color: #475569;">kcal<input id="foodKcal" type="number" step="0.1" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                <label style="font-size: 12px; color: #475569;">Carb<input id="foodCarboidratos" type="number" step="0.1" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                <label style="font-size: 12px; color: #475569;">Prot<input id="foodProteinas" type="number" step="0.1" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                <label style="font-size: 12px; color: #475569;">Gord<input id="foodGorduras" type="number" step="0.1" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 8px;">
                    <button id="btnCancelarAlimento" type="button" style="padding: 10px 14px; border: none; border-radius: 8px; background: #e2e8f0; color: #334155; cursor: pointer;">Cancelar</button>
                    <button id="btnSalvarAlimento" type="button" style="padding: 10px 16px; border: none; border-radius: 8px; background: #0f766e; color: white; cursor: pointer; font-weight: 600;">Salvar</button>
                </div>
            </div>
        `;
    }

    renderResultadosListaAlimentos(alimentos) {
        if (!alimentos.length) {
            return '<div style="color: #64748b; font-size: 13px;">Nenhum alimento encontrado.</div>';
        }

        return alimentos.map((alimento) => `
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center;">
                <div style="min-width: 0;">
                    <strong style="color: #1a237e; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(alimento.nome)}</strong>
                    <div style="font-size: 12px; color: #64748b;">${this.escapeHtml(alimento.categoria || 'Sem categoria')}</div>
                </div>
                <button type="button" class="btnEditarAlimento" data-food-id="${this.escapeHtml(alimento.id)}" style="padding: 8px 12px; border: none; border-radius: 8px; background: #e2e8f0; color: #334155; cursor: pointer;">Editar</button>
                <button type="button" class="btnExcluirAlimento" data-food-id="${this.escapeHtml(alimento.id)}" style="padding: 8px 12px; border: none; border-radius: 8px; background: #fee2e2; color: #b91c1c; cursor: pointer;">Excluir</button>
            </div>
        `).join('');
    }

    async abrirModalListaAlimentos() {
        const modal = document.getElementById('modalListaAlimentos');
        if (!modal) return;

        try {
            await this.carregarBaseAlimentos();
        } catch (error) {
            this.alimentosBase = [];
        }

        try {
            await this.carregarConfiguracoesAlimentos();
        } catch (error) {
            this.categoriasAlimentos = this.obterCategoriasDerivadas();
            this.unidadesAlimentos = this.obterUnidadesDerivadas();
            this.configAlimentosCarregada = true;
        }

        this.renderizarListaAlimentosModal();
        modal.style.display = 'flex';
        setTimeout(() => {
            document.getElementById('listaFoodSearch')?.focus();
        }, 80);
    }

    renderizarListaAlimentosModal() {
        const modal = document.getElementById('modalListaAlimentos');
        if (!modal) return;

        const formWrapper = modal.querySelector('[data-lista-alimentos-form]');
        if (formWrapper) {
            formWrapper.innerHTML = this.renderModalListaAlimentos();
            this.attachListaAlimentosEvents();
        }
    }

    attachListaAlimentosEvents() {
        const search = document.getElementById('listaFoodSearch');
        const results = document.getElementById('listaFoodResults');
        const refresh = () => {
            if (!results) return;
            results.innerHTML = this.renderResultadosListaAlimentos(this.filtrarAlimentosCadastro(search?.value || ''));
            this.attachListaAlimentosResultButtons();
        };

        search?.addEventListener('input', refresh);
        document.getElementById('btnConfigAlimentos')?.addEventListener('click', () => this.abrirModalConfigAlimentos());
        document.getElementById('btnNovoAlimento')?.addEventListener('click', () => this.abrirModalNovoAlimento());
        document.getElementById('btnAtualizarListaTaco')?.addEventListener('click', () => this.atualizarListaAlimentosTaco());
        document.getElementById('btnExportarListaAlimentos')?.addEventListener('click', () => this.exportarListaAlimentosXlsx());
        document.getElementById('btnImportarListaAlimentos')?.addEventListener('click', () => document.getElementById('inputImportarListaAlimentos')?.click());
        document.getElementById('inputImportarListaAlimentos')?.addEventListener('change', (event) => this.importarListaAlimentosXlsx(event));
        this.attachListaAlimentosResultButtons();
    }

    abrirModalConfigAlimentos() {
        const modal = document.getElementById('modalConfigAlimentos');
        if (!modal) return;

        const formWrapper = modal.querySelector('[data-config-alimentos-form]');
        if (formWrapper) formWrapper.innerHTML = this.renderConfiguracoesAlimentos();
        modal.style.display = 'flex';
        this.attachConfigAlimentosEvents();
    }

    fecharModalConfigAlimentos() {
        const modal = document.getElementById('modalConfigAlimentos');
        if (modal) modal.style.display = 'none';
    }

    lerListaConfigTextarea(id) {
        return [...new Set(String(document.getElementById(id)?.value || '')
            .split('\n')
            .map((valor) => valor.trim())
            .filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }

    attachConfigAlimentosEvents() {
        document.getElementById('btnCancelarConfigAlimentos')?.addEventListener('click', () => this.fecharModalConfigAlimentos());
        document.getElementById('btnSalvarConfigAlimentos')?.addEventListener('click', () => this.salvarConfiguracoesAlimentos());
    }

    async salvarConfiguracoesAlimentos() {
        const categorias = this.lerListaConfigTextarea('configCategoriasAlimentos');
        const unidades = this.lerListaConfigTextarea('configUnidadesAlimentos');

        if (!categorias.length || !unidades.length) {
            alert('Informe pelo menos uma categoria e uma unidade.');
            return;
        }

        await setDoc(doc(db, 'base_alimentos_nutricionais', '_configuracoes_alimentos'), {
            tipo: 'configuracoes_alimentos',
            categorias,
            unidades,
            atualizado_por: this.userInfo.login,
            data_atualizacao: new Date().toISOString()
        }, { merge: true });

        this.categoriasAlimentos = categorias;
        this.unidadesAlimentos = unidades;
        this.configAlimentosCarregada = true;
        this.fecharModalConfigAlimentos();
        this.renderizarListaAlimentosModal();
    }

    attachListaAlimentosResultButtons() {
        document.querySelectorAll('.btnEditarAlimento').forEach((button) => {
            button.addEventListener('click', () => this.abrirModalNovoAlimento(button.dataset.foodId));
        });
        document.querySelectorAll('.btnExcluirAlimento').forEach((button) => {
            button.addEventListener('click', () => this.excluirAlimentoBase(button.dataset.foodId));
        });
    }

    async excluirAlimentoBase(foodId) {
        const alimento = this.alimentosBase.find((item) => item.id === foodId);
        if (!alimento) return;
        if (!confirm(`Excluir ${alimento.nome}?`)) return;

        await deleteDoc(doc(db, 'base_alimentos_nutricionais', foodId));
        this.alimentosCarregados = false;
        await this.carregarBaseAlimentos();
        this.renderizarListaAlimentosModal();
    }

    async carregarXlsxLib() {
        if (window.XLSX) return window.XLSX;

        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Nao foi possivel carregar a biblioteca XLSX.'));
            document.head.appendChild(script);
        });

        return window.XLSX;
    }

    getCamposExportacaoAlimentos() {
        return [
            { key: 'nome', label: 'Nome' },
            { key: 'categoria', label: 'Categoria' },
            { key: 'unidadePadrao', label: 'Unidade' },
            { key: 'gramasPorUnidade', label: 'g/unid' },
            { key: 'kcal', label: 'kcal' },
            { key: 'carboidratos', label: 'Carb' },
            { key: 'proteinas', label: 'Prot' },
            { key: 'gorduras', label: 'Gord' },
            { key: 'fibras', label: 'Fibras' },
            { key: 'sodio', label: 'Sodio' }
        ];
    }

    normalizarAlimentoImportado(row) {
        const get = (...keys) => keys.map((key) => row[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '');
        const nome = String(get('Nome', 'nome') || '').trim();
        if (!nome) return null;

        return {
            nome,
            categoria: String(get('Categoria', 'categoria') || 'Geral').trim(),
            unidadePadrao: String(get('Unidade', 'unidadePadrao', 'Unidade Padrao') || 'porcao').trim(),
            gramasPorUnidade: Number(get('g/unid', 'gramasPorUnidade', 'Gramas Por Unidade') || 100),
            kcal: Number(get('kcal', 'Kcal') || 0),
            carboidratos: Number(get('Carb', 'carboidratos') || 0),
            proteinas: Number(get('Prot', 'proteinas') || 0),
            gorduras: Number(get('Gord', 'gorduras') || 0),
            fibras: Number(get('Fibras', 'fibras') || 0),
            sodio: Number(get('Sodio', 'sodio') || 0),
            fonte: 'xlsx_importado',
            atualizado_por: this.userInfo.login,
            data_atualizacao: new Date().toISOString()
        };
    }

    async substituirListaAlimentos(alimentos, fonte) {
        const ref = collection(db, 'base_alimentos_nutricionais');
        const snapshot = await getDocs(ref);
        await Promise.all(snapshot.docs
            .filter((docSnap) => docSnap.id !== '_configuracoes_alimentos')
            .map((docSnap) => deleteDoc(doc(db, 'base_alimentos_nutricionais', docSnap.id))));

        await Promise.all(alimentos.map((alimento) => addDoc(ref, {
            ...alimento,
            fonte: alimento.fonte || fonte,
            criado_por: this.userInfo.login,
            data_criacao: new Date().toISOString()
        })));

        this.alimentosCarregados = false;
        await this.carregarBaseAlimentos();
        this.categoriasAlimentos = this.obterCategoriasDerivadas();
        this.unidadesAlimentos = this.obterUnidadesDerivadas();
        await this.salvarConfiguracoesAlimentosSilencioso();
        this.renderizarListaAlimentosModal();
    }

    async salvarConfiguracoesAlimentosSilencioso() {
        await setDoc(doc(db, 'base_alimentos_nutricionais', '_configuracoes_alimentos'), {
            tipo: 'configuracoes_alimentos',
            categorias: this.categoriasAlimentos,
            unidades: this.unidadesAlimentos,
            atualizado_por: this.userInfo.login,
            data_atualizacao: new Date().toISOString()
        }, { merge: true });
        this.configAlimentosCarregada = true;
    }

    async atualizarListaAlimentosTaco() {
        const confirmado = confirm('A lista de alimentos atual sera substituida pela lista completa da TACO. Deseja continuar?');
        if (!confirmado) return;

        try {
            await this.substituirListaAlimentos(this.getAlimentosIniciais(), 'taco');
            alert('Lista TACO atualizada com sucesso.');
        } catch (error) {
            alert('Nao foi possivel atualizar a lista TACO.');
        }
    }

    async exportarListaAlimentosXlsx() {
        try {
            await this.carregarBaseAlimentos();
            const XLSX = await this.carregarXlsxLib();
            const campos = this.getCamposExportacaoAlimentos();
            const dados = this.alimentosBase
                .slice()
                .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))
                .map((alimento) => campos.reduce((row, campo) => {
                    row[campo.label] = alimento[campo.key] ?? '';
                    return row;
                }, {}));

            const worksheet = XLSX.utils.json_to_sheet(dados);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Alimentos');
            XLSX.writeFile(workbook, `lista_alimentos_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (error) {
            alert('Nao foi possivel exportar a lista de alimentos.');
        }
    }

    async importarListaAlimentosXlsx(event) {
        const input = event.target;
        const file = input?.files?.[0];
        if (!file) return;

        const confirmado = confirm('A lista de alimentos atual sera substituida pela lista importada. Deseja continuar?');
        if (!confirmado) {
            input.value = '';
            return;
        }

        try {
            const XLSX = await this.carregarXlsxLib();
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            const alimentosImportados = rows
                .map((row) => this.normalizarAlimentoImportado(row))
                .filter(Boolean);

            if (!alimentosImportados.length) {
                alert('A planilha nao possui alimentos validos.');
                return;
            }

            await this.substituirListaAlimentos(alimentosImportados, 'xlsx_importado');
            alert('Lista de alimentos importada com sucesso.');
        } catch (error) {
            alert('Nao foi possivel importar a lista de alimentos.');
        } finally {
            input.value = '';
        }
    }

    abrirModalNovoAlimento(foodId = null) {
        const modal = document.getElementById('modalNovoAlimento');
        if (!modal) return;

        this.alimentoEditandoId = foodId;
        const title = document.getElementById('modalNovoAlimentoTitulo');
        if (title) title.textContent = foodId ? 'Editar Alimento' : 'Novo Alimento';

        const formWrapper = modal.querySelector('[data-novo-alimento-form]');
        if (formWrapper) formWrapper.innerHTML = this.renderFormularioAlimento();

        modal.style.display = 'flex';
        if (foodId) {
            this.preencherFormularioAlimento(foodId);
        } else {
            this.limparFormularioAlimento();
        }

        document.getElementById('btnSalvarAlimento')?.addEventListener('click', () => this.salvarAlimentoBase());
        document.getElementById('btnCancelarAlimento')?.addEventListener('click', () => this.fecharModalNovoAlimento());
        setTimeout(() => document.getElementById('foodNome')?.focus(), 80);
    }

    fecharModalNovoAlimento() {
        const modal = document.getElementById('modalNovoAlimento');
        if (modal) modal.style.display = 'none';
        this.alimentoEditandoId = null;
    }

    attachEvents() {
        const pacienteSelect = document.getElementById('pacienteSelect');
        if (pacienteSelect) {
            pacienteSelect.addEventListener('change', async (e) => {
                const login = e.target.value;
                if (login) {
                    this.selectedPaciente = this.pacientesList.find(p => p.login === login);
                    this.planoExpandido = null;
                    this.planoEditando = null;
                    await this.loadPlanos();
                    await this.render();
                } else {
                    this.selectedPaciente = null;
                    this.planosList = [];
                    this.planoExpandido = null;
                    this.planoEditando = null;
                    await this.render();
                }
            });
        }

        const btnNovoPlano = document.getElementById('btnNovoPlano');
        if (btnNovoPlano) {
            btnNovoPlano.addEventListener('click', async () => {
                this.planoEditando = null;
                await this.abrirModal();
            });
        }

        document.getElementById('btnCriarPlanoBiaSantos')?.addEventListener('click', () => this.criarPlanoModeloBiaSantos());

        document.getElementById('btnListaAlimentos')?.addEventListener('click', () => this.abrirModalListaAlimentos());

        const btnSalvarPlano = document.getElementById('btnSalvarPlano');
        if (btnSalvarPlano) {
            btnSalvarPlano.addEventListener('click', () => this.saveMealPlan());
        }

        // Fechar modal ao clicar fora
        const modalPlano = document.getElementById('modalPlano');
        if (modalPlano) {
            modalPlano.addEventListener('click', (e) => {
                if (e.target === modalPlano) {
                    modalPlano.style.display = 'none';
                }
            });
        }

        // Expor instância globalmente
        const modalListaAlimentos = document.getElementById('modalListaAlimentos');
        if (modalListaAlimentos) {
            modalListaAlimentos.addEventListener('click', (e) => {
                if (e.target === modalListaAlimentos) {
                    modalListaAlimentos.style.display = 'none';
                }
            });
        }

        const modalDetalheAlimento = document.getElementById('modalDetalheAlimento');
        if (modalDetalheAlimento) {
            modalDetalheAlimento.addEventListener('click', (e) => {
                if (e.target === modalDetalheAlimento) {
                    modalDetalheAlimento.style.display = 'none';
                }
            });
        }

        const modalNovoAlimento = document.getElementById('modalNovoAlimento');
        if (modalNovoAlimento) {
            modalNovoAlimento.addEventListener('click', (e) => {
                if (e.target === modalNovoAlimento) {
                    this.fecharModalNovoAlimento();
                }
            });
        }

        const modalConfigAlimentos = document.getElementById('modalConfigAlimentos');
        if (modalConfigAlimentos) {
            modalConfigAlimentos.addEventListener('click', (e) => {
                if (e.target === modalConfigAlimentos) {
                    this.fecharModalConfigAlimentos();
                }
            });
        }

        document.getElementById('btnFecharDetalheAlimento')?.addEventListener('click', () => {
            const modal = document.getElementById('modalDetalheAlimento');
            if (modal) modal.style.display = 'none';
        });

        document.getElementById('btnFecharNovoAlimento')?.addEventListener('click', () => this.fecharModalNovoAlimento());
        document.getElementById('btnFecharConfigAlimentos')?.addEventListener('click', () => this.fecharModalConfigAlimentos());

        window.planoAlimentarInstance = this;
    }

    attachNutritionEvents() {
        const search = document.getElementById('foodSearch');
        const results = document.getElementById('foodResults');
        const quantidade = document.getElementById('foodQuantidade');
        const refreshResults = () => {
            if (!results) return;
            results.innerHTML = this.renderResultadosAlimentos(this.filtrarAlimentos(search?.value || ''));
            this.attachFoodResultButtons();
        };

        search?.addEventListener('input', refreshResults);
        quantidade?.addEventListener('input', refreshResults);
        this.attachMealEditorEvents();
        this.attachFoodResultButtons();
    }

    attachMealEditorEvents() {
        document.querySelectorAll('.meal-editor-card').forEach((card) => {
            card.addEventListener('click', (event) => {
                if (event.target.closest('button')) return;
                this.selecionarRefeicao(card.dataset.mealId);
            });
        });
        document.querySelectorAll('.btnExcluirItemPlano').forEach((button) => {
            button.addEventListener('click', () => this.excluirItemPlano(button.dataset.mealId, button.dataset.itemId));
        });
        document.querySelectorAll('.btnDetalhesItemPlano').forEach((button) => {
            button.addEventListener('click', () => this.alternarDetalhesItemPlano(button.dataset.mealId, button.dataset.itemId));
        });
        document.querySelectorAll('.btnAdicionarOpcaoItemPlano').forEach((button) => {
            button.addEventListener('click', () => this.prepararAdicionarOpcaoItemPlano(button.dataset.mealId, button.dataset.itemId));
        });
        document.querySelectorAll('.btnAlternarOpcaoItemPlano').forEach((button) => {
            button.addEventListener('click', () => this.alternarOpcaoVisivelItemPlano(button.dataset.mealId, button.dataset.itemId));
        });
    }

    attachFoodResultButtons() {
        document.querySelectorAll('.btnDetalhesBuscaAlimento').forEach((button) => {
            button.addEventListener('click', () => this.alternarDetalhesBuscaAlimento(button.dataset.foodId));
        });
        document.querySelectorAll('.btnAdicionarAlimento').forEach((button) => {
            button.addEventListener('click', () => this.adicionarAlimentoNaRefeicao(button.dataset.foodId));
        });
        document.querySelectorAll('.food-quantidade-input').forEach((input) => {
            input.addEventListener('input', () => this.atualizarPreviewQuantidadeAlimento(input.dataset.foodId));
        });
    }

    alternarDetalhesBuscaAlimento(foodId) {
        this.abrirModalDetalheAlimento(foodId);
    }

    abrirModalDetalheAlimento(foodId) {
        const alimento = this.alimentosBase.find((item) => item.id === foodId);
        if (!alimento) return;

        const quantidade = this.obterQuantidadeAlimento(foodId);
        const nutrientes = this.calcularNutrientes(alimento, quantidade, 'unidade');
        const quantidadeTexto = this.formatarQuantidadePreview(alimento, quantidade, true);
        const modal = document.getElementById('modalDetalheAlimento');
        const formWrapper = modal?.querySelector('[data-detalhe-alimento-form]');
        if (formWrapper) {
            formWrapper.innerHTML = `
                <div style="display: grid; gap: 12px;">
                    <div style="font-size: 18px; font-weight: 700; color: #1a237e;">${this.escapeHtml(alimento.nome)}</div>
                    <div style="font-size: 14px; color: #475569;">${this.escapeHtml(alimento.categoria || 'Sem categoria')}</div>
                    <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 10px; padding: 10px 12px; font-size: 15px; color: #1e293b; font-weight: 600;">
                        ${this.escapeHtml(quantidadeTexto)}
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
                            <div style="font-size: 12px; color: #64748b;">Energia</div>
                            <div style="font-size: 18px; font-weight: 700; color: #1e293b;">${this.formatarNumero(nutrientes.kcal || 0, 0)} kcal</div>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
                            <div style="font-size: 12px; color: #64748b;">Porção</div>
                            <div style="font-size: 18px; font-weight: 700; color: #1e293b;">${this.formatarNumero(nutrientes.gramas || 0, 0)} g</div>
                        </div>
                    </div>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; line-height: 1.6;">
                        <div><strong>Carboidratos:</strong> ${this.formatarNumero(nutrientes.carboidratos || 0)} g</div>
                        <div><strong>Proteínas:</strong> ${this.formatarNumero(nutrientes.proteinas || 0)} g</div>
                        <div><strong>Gorduras:</strong> ${this.formatarNumero(nutrientes.gorduras || 0)} g</div>
                        <div><strong>Fibras:</strong> ${this.formatarNumero(nutrientes.fibras || 0)} g</div>
                        <div><strong>Sódio:</strong> ${this.formatarNumero(nutrientes.sodio || 0)} mg</div>
                    </div>
                </div>
            `;
        }

        if (modal) modal.style.display = 'flex';
        setTimeout(() => document.getElementById('btnFecharDetalheAlimento')?.focus(), 50);
    }

    selecionarRefeicao(mealId) {
        if (!this.getRefeicoesPlano().some((refeicao) => refeicao.id === mealId)) return;
        this.refeicaoSelecionada = mealId;
        this.renderizarRefeicoesPlano();
    }

    obterRefeicaoSelecionada() {
        const mealId = this.refeicaoSelecionada || 'breakfast';
        return this.getRefeicoesPlano().some((refeicao) => refeicao.id === mealId) ? mealId : 'breakfast';
    }

    renderizarRefeicoesPlano() {
        const grid = document.getElementById('mealItemsGrid');
        if (!grid) return;

        grid.outerHTML = this.renderRefeicoesPlano();
        this.attachMealEditorEvents();
    }

    excluirItemPlano(mealId, itemId) {
        this.itensPlano[mealId] = (this.itensPlano[mealId] || []).filter((item) => item.id !== itemId);
        if (this.opcaoDestinoPlano?.mealId === mealId && this.opcaoDestinoPlano?.itemId === itemId) {
            this.opcaoDestinoPlano = null;
        }
        this.renderizarRefeicoesPlano();
    }

    prepararAdicionarOpcaoItemPlano(mealId, itemId) {
        if (this.opcaoDestinoPlano?.mealId === mealId && this.opcaoDestinoPlano?.itemId === itemId) {
            this.opcaoDestinoPlano = null;
        } else {
            this.opcaoDestinoPlano = { mealId, itemId };
            this.refeicaoSelecionada = mealId;
        }
        this.renderizarRefeicoesPlano();
    }

    alternarOpcaoVisivelItemPlano(mealId, itemId) {
        const item = (this.itensPlano[mealId] || []).find((registro) => registro.id === itemId);
        if (!item || !Array.isArray(item.opcoes) || item.opcoes.length < 2) return;

        item.opcaoVisivelIndex = (Number(item.opcaoVisivelIndex || 0) + 1) % item.opcoes.length;
        this.renderizarRefeicoesPlano();
        this.abrirModalDetalheItemPlano(item, item.opcaoVisivelIndex);
    }

    alternarDetalhesItemPlano(mealId, itemId) {
        const item = (this.itensPlano[mealId] || []).find((registro) => registro.id === itemId);
        if (!item) return;

        this.abrirModalDetalheItemPlano(item, Number(item.opcaoVisivelIndex || 0));
    }

    abrirModalDetalheItemPlano(item, opcaoIndex = 0) {
        const detalhes = item.detalhes;
        const opcoes = Array.isArray(item.opcoes) ? item.opcoes : [];
        const opcaoAtualIndex = opcoes.length ? Math.max(0, Math.min(opcoes.length - 1, Number(opcaoIndex || 0))) : 0;
        const opcaoAtual = opcoes[opcaoAtualIndex] || null;
        const detalhesAtuais = opcaoAtual?.detalhes || detalhes;
        const modal = document.getElementById('modalDetalheAlimento');
        const formWrapper = modal?.querySelector('[data-detalhe-alimento-form]');
        if (formWrapper) {
            formWrapper.innerHTML = `
                <div style="display: grid; gap: 12px;">
                    <div style="font-size: 18px; font-weight: 700; color: #1a237e;">${this.escapeHtml(detalhesAtuais?.nome || opcaoAtual?.texto || item.texto)}</div>
                    <div style="font-size: 14px; color: #475569;">${this.escapeHtml(opcoes.length > 1 ? `Opção ${opcaoAtualIndex + 1} de ${opcoes.length}` : detalhesAtuais?.quantidadeTexto || 'Sem quantidade informada')}</div>
                    <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 10px; padding: 10px 12px; font-size: 15px; color: #1e293b; font-weight: 600;">
                        ${this.escapeHtml(opcaoAtual?.texto || this.formatarTextoItemPlano(item))}
                    </div>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; line-height: 1.6;">
                        <div><strong>Quantidade:</strong> ${this.escapeHtml(detalhesAtuais?.quantidadeTexto || 'Sem quantidade informada')}</div>
                        <div><strong>Gramas:</strong> ${this.formatarNumero(detalhesAtuais?.gramas || 0, 0)} g</div>
                        <div><strong>Energia:</strong> ${this.formatarNumero(detalhesAtuais?.kcal || 0, 0)} kcal</div>
                        <div><strong>Carboidratos:</strong> ${this.formatarNumero(detalhesAtuais?.carboidratos || 0)} g</div>
                        <div><strong>Proteínas:</strong> ${this.formatarNumero(detalhesAtuais?.proteinas || 0)} g</div>
                        <div><strong>Gorduras:</strong> ${this.formatarNumero(detalhesAtuais?.gorduras || 0)} g</div>
                    </div>
                </div>
            `;
        }

        if (modal) modal.style.display = 'flex';
    }

    removerUltimoAlimentoDaRefeicao() {
        const textarea = document.getElementById(this.obterRefeicaoSelecionada());
        if (!textarea || !textarea.value.trim()) return;

        const linhas = textarea.value.split('\n').filter((linha) => linha.trim() !== '');
        linhas.pop();
        textarea.value = linhas.join('\n');
        textarea.focus();
    }

    limparRefeicaoSelecionada() {
        const textarea = document.getElementById(this.obterRefeicaoSelecionada());
        if (!textarea || !textarea.value.trim()) return;

        if (confirm('Limpar todos os itens desta refeicao?')) {
            textarea.value = '';
            textarea.focus();
        }
    }

    obterTextoRefeicao(mealId) {
        return (this.itensPlano[mealId] || [])
            .map((item) => this.formatarTextoItemPlano(item))
            .join('\n');
    }

    limparFormularioAlimento() {
        this.alimentoEditandoId = null;
        ['foodNome', 'foodCategoria', 'foodUnidade', 'foodGramasUnidade', 'foodKcal', 'foodCarboidratos', 'foodProteinas', 'foodGorduras'].forEach((id) => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });
    }

    preencherFormularioAlimento(foodId) {
        const alimento = this.alimentosBase.find((item) => item.id === foodId);
        if (!alimento) return;

        this.alimentoEditandoId = foodId;
        document.getElementById('foodNome').value = alimento.nome || '';
        document.getElementById('foodCategoria').value = alimento.categoria || '';
        document.getElementById('foodUnidade').value = alimento.unidadePadrao || '';
        document.getElementById('foodGramasUnidade').value = alimento.gramasPorUnidade || '';
        document.getElementById('foodKcal').value = alimento.kcal || '';
        document.getElementById('foodCarboidratos').value = alimento.carboidratos || '';
        document.getElementById('foodProteinas').value = alimento.proteinas || '';
        document.getElementById('foodGorduras').value = alimento.gorduras || '';
    }

    async salvarAlimentoBase(onSaved) {
        const nome = document.getElementById('foodNome')?.value?.trim();
        const categoria = document.getElementById('foodCategoria')?.value?.trim();
        const unidadePadrao = document.getElementById('foodUnidade')?.value?.trim();
        if (!nome) {
            alert('Informe o nome do alimento.');
            return;
        }
        if (!categoria || !this.categoriasAlimentos.includes(categoria)) {
            alert('Selecione uma categoria cadastrada.');
            return;
        }
        if (!unidadePadrao || !this.unidadesAlimentos.includes(unidadePadrao)) {
            alert('Selecione uma unidade cadastrada.');
            return;
        }

        const payload = {
            nome,
            categoria,
            unidadePadrao,
            gramasPorUnidade: Number(document.getElementById('foodGramasUnidade')?.value || 100),
            kcal: Number(document.getElementById('foodKcal')?.value || 0),
            carboidratos: Number(document.getElementById('foodCarboidratos')?.value || 0),
            proteinas: Number(document.getElementById('foodProteinas')?.value || 0),
            gorduras: Number(document.getElementById('foodGorduras')?.value || 0),
            fibras: 0,
            sodio: 0,
            atualizado_por: this.userInfo.login,
            data_atualizacao: new Date().toISOString()
        };

        if (this.alimentoEditandoId) {
            await updateDoc(doc(db, 'base_alimentos_nutricionais', this.alimentoEditandoId), payload);
        } else {
            await addDoc(collection(db, 'base_alimentos_nutricionais'), {
                ...payload,
                fonte: 'custom',
                criado_por: this.userInfo.login,
                data_criacao: new Date().toISOString()
            });
        }

        this.alimentosCarregados = false;
        await this.carregarBaseAlimentos();
        this.limparFormularioAlimento();
        this.renderizarListaAlimentosModal();
        this.fecharModalNovoAlimento();
        onSaved?.();
    }

    adicionarAlimentoNaRefeicao(foodId) {
        const alimento = this.alimentosBase.find((item) => item.id === foodId);
        if (!alimento) return;

        const quantidade = Number(document.getElementById(`foodQuantidade_${foodId}`)?.value || 1);
        const mealId = this.obterRefeicaoSelecionada();
        this.refeicaoSelecionada = mealId;
        const opcao = this.criarOpcaoItemPlano(alimento, quantidade);
        this.itensPlano[mealId] = this.itensPlano[mealId] || [];

        if (this.opcaoDestinoPlano) {
            const itemDestino = (this.itensPlano[this.opcaoDestinoPlano.mealId] || [])
                .find((item) => item.id === this.opcaoDestinoPlano.itemId);
            if (itemDestino) {
                itemDestino.opcoes = Array.isArray(itemDestino.opcoes) && itemDestino.opcoes.length
                    ? itemDestino.opcoes
                    : [{
                        id: itemDestino.id,
                        texto: itemDestino.texto,
                        detalhes: itemDestino.detalhes || null
                    }];
                itemDestino.opcoes.push(opcao);
                itemDestino.opcaoVisivelIndex = itemDestino.opcoes.length - 1;
                itemDestino.texto = this.formatarTextoItemPlano(itemDestino);
                itemDestino.detalhes = itemDestino.opcoes[0]?.detalhes || null;
                this.refeicaoSelecionada = this.opcaoDestinoPlano.mealId;
                this.opcaoDestinoPlano = null;
                this.renderizarRefeicoesPlano();
                return;
            }
            this.opcaoDestinoPlano = null;
        }

        this.itensPlano[mealId].push({
            id: this.gerarIdItemPlano(),
            texto: opcao.texto,
            detalhes: opcao.detalhes,
            opcoes: [opcao],
            detalhesAberto: false
        });
        this.renderizarRefeicoesPlano();
    }

    async loadPlanos() {
        if (!this.selectedPaciente) return;
        
        try {
            const nutricionistaLogin = this.userInfo.login;
            const pacienteLogin = this.selectedPaciente.login;
            
            // Caminho: planos_alimentares > nutricionista > paciente
            const pacienteCollectionRef = collection(db, 'planos_alimentares', nutricionistaLogin, pacienteLogin);
            const querySnapshot = await getDocs(pacienteCollectionRef);
            
            this.planosList = [];
            querySnapshot.forEach((docSnap) => {
                this.planosList.push({ id: docSnap.id, ...docSnap.data() });
            });

            await this.garantirPlanoModeloBiaSantos();
            this.renderizarPlanosContainer();
            
        } catch (error) {
            this.planosList = [];
        }
    }

    async abrirModal() {
        this.itensPlano = this.criarEstadoItensPlano(this.planoEditando || {});
        this.refeicaoSelecionada = 'breakfast';

        try {
            await this.carregarBaseAlimentos();
        } catch (error) {
            this.alimentosBase = [];
            this.alimentosCarregados = false;
            alert('Nao foi possivel carregar a base nutricional. Verifique as permissoes do Firestore.');
        }

        const modal = document.getElementById('modalPlano');
        if (modal) {
            const formWrapper = modal.querySelector('[data-plano-form]');
            if (formWrapper) {
                formWrapper.innerHTML = this.renderFormularioPlano();
                this.attachNutritionEvents();
            }

            modal.style.display = 'flex';
            setTimeout(() => {
                const buscaAlimento = modal.querySelector('#foodSearch');
                if (buscaAlimento) buscaAlimento.focus();
            }, 100);
        }
    }

    fecharModal() {
        const modal = document.getElementById('modalPlano');
        if (modal) {
            modal.style.display = 'none';
            this.planoEditando = null;
        }
    }

    toggleExpandirPlano(planoId) {
        if (this.planoExpandido === planoId) {
            this.planoExpandido = null;
        } else {
            this.planoExpandido = planoId;
        }
        this.render();
    }

    editarPlano(planoId) {
        const plano = this.planosList.find(p => p.id === planoId);
        if (plano) {
            this.planoEditando = { ...plano };
            delete this.planoEditando.id;
            this.planoExpandido = null;
            this.abrirModal();
        }
    }

    async saveMealPlan() {
        if (!this.selectedPaciente) {
            alert('❌ Selecione um paciente primeiro!');
            return;
        }

        try {
            const agora = new Date();
            const documentoId = this.gerarIdDocumento(agora);
            
            const mealPlanData = {
                breakfast: this.obterTextoRefeicao('breakfast'),
                morningSnack: this.obterTextoRefeicao('morningSnack'),
                lunch: this.obterTextoRefeicao('lunch'),
                afternoonSnack: this.obterTextoRefeicao('afternoonSnack'),
                dinner: this.obterTextoRefeicao('dinner'),
                supper: this.obterTextoRefeicao('supper'),
                itens_plano: this.itensPlano,
                profissional_nome: this.userInfo.nome,
                modelo_plano: 'base_nutricional_linhas_v2'
            };

            const nutricionistaLogin = this.userInfo.login;
            const pacienteLogin = this.selectedPaciente.login;
            
            // Caminho: planos_alimentares > nutricionista > paciente > documento
            const pacienteCollectionRef = collection(db, 'planos_alimentares', nutricionistaLogin, pacienteLogin);
            await addDoc(pacienteCollectionRef, mealPlanData);
            
            // Ou se quiser usar o ID personalizado com data/hora:
            // await setDoc(doc(db, 'planos_alimentares', nutricionistaLogin, pacienteLogin, documentoId), mealPlanData);
            
            alert(`✅ Plano criado com sucesso!\n📅 ${this.formatarDataExibicao(documentoId)}`);
            
            this.fecharModal();
            await this.loadPlanos();
            await this.render();
            
        } catch (error) {
            alert('❌ Erro ao salvar: ' + error.message);
        }
    }

    montarPlanoModeloBiaSantos() {
        return {
            ...PLANO_BIA_SANTOS_NOVO_MODELO,
            profissional_nome: this.userInfo.nome || PLANO_BIA_SANTOS_NOVO_MODELO.profissional_nome,
            profissional_login: this.userInfo.login,
            paciente_login: this.selectedPaciente.login,
            paciente_nome: this.selectedPaciente.nome || '',
            criado_por: this.userInfo.login,
            data_criacao: new Date().toISOString()
        };
    }

    async garantirPlanoModeloBiaSantos() {
        if (!this.podeCriarPlanoModeloBiaSantos() || this.criandoPlanoBiaSantos) {
            return;
        }

        await this.migrarPlanoModeloBiaSantosParaIdComData();

        if (this.planoModeloBiaSantosJaExiste()) {
            await this.sincronizarPlanoModeloBiaSantosComTemplate();
            return;
        }

        await this.criarPlanoModeloBiaSantos({ silencioso: true, semRecarregar: true });
    }

    async migrarPlanoModeloBiaSantosParaIdComData() {
        const planoAleatorio = this.obterPlanoModeloBiaSantosAleatorio();
        if (!planoAleatorio) return;

        if (this.planosList.some((plano) => plano.id === PLANO_BIA_SANTOS_DOCUMENTO_ID)) {
            await deleteDoc(doc(db, 'planos_alimentares', 'grazielle.carvalho', 'bia.santos', planoAleatorio.id));
            this.planosList = this.planosList.filter((plano) => plano.id !== planoAleatorio.id);
            return;
        }

        const { id: planoAleatorioId, ...dadosPlano } = planoAleatorio;
        const refComData = doc(db, 'planos_alimentares', 'grazielle.carvalho', 'bia.santos', PLANO_BIA_SANTOS_DOCUMENTO_ID);
        await setDoc(refComData, {
            ...dadosPlano,
            id_migrado_de: planoAleatorioId,
            data_migracao_id: new Date().toISOString()
        }, { merge: true });

        await deleteDoc(doc(db, 'planos_alimentares', 'grazielle.carvalho', 'bia.santos', planoAleatorioId));

        this.planosList = this.planosList
            .filter((plano) => plano.id !== planoAleatorioId)
            .concat([{ id: PLANO_BIA_SANTOS_DOCUMENTO_ID, ...dadosPlano }]);
    }

    async sincronizarPlanoModeloBiaSantosComTemplate() {
        const planoAtualizado = this.montarPlanoModeloBiaSantos();
        await setDoc(doc(db, 'planos_alimentares', 'grazielle.carvalho', 'bia.santos', PLANO_BIA_SANTOS_DOCUMENTO_ID), planoAtualizado, { merge: true });
        this.planosList = this.planosList.map((plano) => (
            plano.id === PLANO_BIA_SANTOS_DOCUMENTO_ID
                ? { ...plano, ...planoAtualizado }
                : plano
        ));
    }

    async criarPlanoModeloBiaSantos(opcoes = {}) {
        if (!this.podeCriarPlanoModeloBiaSantos()) {
            if (!opcoes.silencioso) {
                alert('Selecione a paciente bia.santos com a profissional grazielle.carvalho.');
            }
            return;
        }

        if (this.planoModeloBiaSantosJaExiste()) {
            if (!opcoes.silencioso) {
                alert('Este plano novo modelo ja existe para bia.santos.');
            }
            return;
        }

        if (!opcoes.silencioso) {
            const confirmado = confirm('Criar o plano alimentar novo modelo para bia.santos?');
            if (!confirmado) return;
        }

        try {
            this.criandoPlanoBiaSantos = true;
            const mealPlanData = this.montarPlanoModeloBiaSantos();

            await setDoc(doc(db, 'planos_alimentares', 'grazielle.carvalho', 'bia.santos', PLANO_BIA_SANTOS_DOCUMENTO_ID), mealPlanData, { merge: true });
            this.planosList.push({ id: PLANO_BIA_SANTOS_DOCUMENTO_ID, ...mealPlanData });

            if (!opcoes.silencioso) {
                alert('Plano novo modelo criado para bia.santos.');
            }
            if (!opcoes.semRecarregar) {
                await this.loadPlanos();
                await this.render();
            }
        } catch (error) {
            if (!opcoes.silencioso) {
                alert('Nao foi possivel criar o plano para bia.santos: ' + error.message);
            }
        } finally {
            this.criandoPlanoBiaSantos = false;
        }
    }

    clonarPlano(planoId) {
        const plano = this.planosList.find(p => p.id === planoId);
        if (plano) {
            this.planoEditando = { ...plano };
            delete this.planoEditando.id;
            this.planoExpandido = null;
            this.abrirModal();
        }
    }

    exportarPlano(planoId) {
        const plano = this.planosList.find(p => p.id === planoId);
        if (!plano) return;

        const dataFormatada = this.formatarDataExibicao(planoId);

        let conteudo = `PLANO ALIMENTAR\n`;
        conteudo += `${'='.repeat(50)}\n\n`;
        conteudo += `👤 Paciente: ${this.selectedPaciente.nome}\n`;
        conteudo += `👨‍⚕️ Profissional: ${plano.profissional_nome || 'Não informado'}\n`;
        conteudo += `📅 Data: ${dataFormatada}\n`;
        conteudo += `\n${'='.repeat(50)}\n\n`;
        
        conteudo += `🍽️ REFEIÇÕES\n${'-'.repeat(50)}\n\n`;
        if (plano.breakfast) conteudo += `🌅 Café da Manhã:\n${plano.breakfast}\n\n`;
        if (plano.morningSnack) conteudo += `🍎 Lanche da Manhã:\n${plano.morningSnack}\n\n`;
        if (plano.lunch) conteudo += `🍽️ Almoço:\n${plano.lunch}\n\n`;
        if (plano.afternoonSnack) conteudo += `🍌 Lanche da Tarde:\n${plano.afternoonSnack}\n\n`;
        if (plano.dinner) conteudo += `🌙 Jantar:\n${plano.dinner}\n\n`;
        if (plano.supper) conteudo += `⭐ Ceia:\n${plano.supper}\n\n`;
        
        if (plano.guidelines || plano.restrictions || plano.goals) {
            conteudo += `📋 INFORMAÇÕES ADICIONAIS\n${'-'.repeat(50)}\n\n`;
            if (plano.guidelines) conteudo += `📌 Orientações Gerais:\n${plano.guidelines}\n\n`;
            if (plano.restrictions) conteudo += `⚠️ Restrições Alimentares:\n${plano.restrictions}\n\n`;
            if (plano.goals) conteudo += `🎯 Objetivos:\n${plano.goals}\n\n`;
        }
        
        conteudo += `${'='.repeat(50)}\n`;
        conteudo += `Exportado em: ${new Date().toLocaleDateString('pt-BR')}\n`;

        const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `plano_alimentar_${dataFormatada.replace(/\//g, '-').replace(/ /g, '_')}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    }

    gerarIdDocumento(data) {
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        const hora = String(data.getHours()).padStart(2, '0');
        const minuto = String(data.getMinutes()).padStart(2, '0');
        
        return `${dia}-${mes}-${ano}_${hora}:${minuto}h`;
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
}
