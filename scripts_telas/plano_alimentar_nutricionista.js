// plano_alimentar_nutricionista.js 

import { FuncoesCompartilhadas } from './0_home.js';
import { MenuProfissional } from './0_complementos_menu_profissional.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';
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
    getDoc
} from '../0_firebase_api_config.js';

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
        this.alimentoEditandoId = null;
        this.refeicaoSelecionada = 'breakfast';
        this.itensPlano = this.criarEstadoItensPlano();
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
            <div class="dashboard-container" style="height: 100vh; display: flex; flex-direction: column;">
                <div id="menuContainer"></div>
    
                <div class="main-content" style="flex: 1; overflow-y: auto; padding: 20px 32px;">
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
    
                <!-- Botão + Flutuante -->
                ${this.selectedPaciente ? `
                    <div class="fab-container" style="position: fixed; bottom: 30px; right: 30px; z-index: 1000;">
                        <button id="btnNovoPlano" class="fab-button" title="Novo Plano Alimentar">
                            <span class="fab-icon">+</span>
                            <span class="fab-text">Novo Plano Alimentar</span>
                        </button>
                    </div>
                ` : ''}
    
                <!-- Modal para Criar/Editar Plano -->
                <div id="modalPlano" class="modal-overlay" style="display: none;">
                    <div class="modal-content" style="background: white; border-radius: 16px; width: 90%; max-width: 1100px; height: 90vh; overflow: hidden; margin: 20px auto; display: flex; flex-direction: column;">
                        <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: white; padding: 20px 24px; border-radius: 16px 16px 0 0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10;">
                            <h3 style="margin: 0;">
                                ${this.planoEditando ? '✏️ Editar Plano Alimentar' : '📝 Novo Plano Alimentar'}
                            </h3>
                            <button onclick="document.getElementById('modalPlano').style.display='none'" 
                                    style="background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; font-size: 20px;">
                                ✕
                            </button>
                        </div>
                        
                        <div data-plano-form style="padding: 16px 24px; flex: 1; overflow: hidden;">
                            ${this.renderFormularioPlano()}
                        </div>
                        
                        <div style="padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; gap: 12px; border-radius: 0 0 16px 16px;">
                            <button id="btnListaAlimentos"
                                    style="padding: 12px 18px; background: #0f766e; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                Lista de Alimentos
                            </button>
                            <button id="btnSalvarPlano" 
                                    style="padding: 12px 28px; background: #1a237e; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                💾 Salvar Plano
                            </button>
                        </div>
                    </div>
                </div>

                <div id="modalListaAlimentos" class="modal-overlay" style="display: none;">
                    <div class="modal-content" style="background: white; border-radius: 16px; width: 90%; max-width: 1100px; height: 90vh; overflow: hidden; margin: 20px auto; display: flex; flex-direction: column;">
                        <div style="background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); color: white; padding: 20px 24px; border-radius: 16px 16px 0 0; display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="margin: 0;">Lista de Alimentos</h3>
                            <button onclick="document.getElementById('modalListaAlimentos').style.display='none'" 
                                    style="background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; font-size: 20px;">
                                X
                            </button>
                        </div>
                        
                        <div data-lista-alimentos-form style="padding: 16px 24px; flex: 1; overflow: hidden;">
                            ${this.renderModalListaAlimentos()}
                        </div>
                    </div>
                </div>
    
                <style>
                    .fab-container {
                        display: flex;
                        align-items: center;
                        justify-content: flex-end;
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
                                ${this.renderRefeicaoCard('🍎 Lanche Manhã', plano.morningSnack)}
                                ${this.renderRefeicaoCard('🍽️ Almoço', plano.lunch)}
                                ${this.renderRefeicaoCard('🍌 Lanche Tarde', plano.afternoonSnack)}
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
        return [
            { nome: 'Arroz branco cozido', categoria: 'Cereais', unidadePadrao: 'colher de sopa', gramasPorUnidade: 25, kcal: 128, carboidratos: 28.1, proteinas: 2.5, gorduras: 0.2, fibras: 1.6, sodio: 1 },
            { nome: 'Feijao carioca cozido', categoria: 'Leguminosas', unidadePadrao: 'concha media', gramasPorUnidade: 86, kcal: 76, carboidratos: 13.6, proteinas: 4.8, gorduras: 0.5, fibras: 8.5, sodio: 2 },
            { nome: 'Peito de frango grelhado', categoria: 'Proteinas', unidadePadrao: 'file medio', gramasPorUnidade: 100, kcal: 159, carboidratos: 0, proteinas: 32, gorduras: 2.5, fibras: 0, sodio: 50 },
            { nome: 'Ovo de galinha inteiro', categoria: 'Proteinas', unidadePadrao: 'unidade', gramasPorUnidade: 50, kcal: 143, carboidratos: 1.6, proteinas: 13, gorduras: 8.9, fibras: 0, sodio: 168 },
            { nome: 'Banana prata', categoria: 'Frutas', unidadePadrao: 'unidade', gramasPorUnidade: 86, kcal: 98, carboidratos: 26, proteinas: 1.3, gorduras: 0.1, fibras: 2, sodio: 0 },
            { nome: 'Maca com casca', categoria: 'Frutas', unidadePadrao: 'unidade', gramasPorUnidade: 130, kcal: 56, carboidratos: 15.2, proteinas: 0.3, gorduras: 0.2, fibras: 1.3, sodio: 0 },
            { nome: 'Aveia em flocos', categoria: 'Cereais', unidadePadrao: 'colher de sopa', gramasPorUnidade: 10, kcal: 394, carboidratos: 66.6, proteinas: 13.9, gorduras: 8.5, fibras: 9.1, sodio: 5 },
            { nome: 'Leite integral', categoria: 'Laticinios', unidadePadrao: 'copo', gramasPorUnidade: 200, kcal: 61, carboidratos: 4.7, proteinas: 3.2, gorduras: 3.3, fibras: 0, sodio: 43 },
            { nome: 'Iogurte natural integral', categoria: 'Laticinios', unidadePadrao: 'pote', gramasPorUnidade: 170, kcal: 76, carboidratos: 5.3, proteinas: 4.1, gorduras: 4.3, fibras: 0, sodio: 52 },
            { nome: 'Batata doce cozida', categoria: 'Tuberculos', unidadePadrao: 'fatia media', gramasPorUnidade: 50, kcal: 77, carboidratos: 18.4, proteinas: 0.6, gorduras: 0.1, fibras: 2.2, sodio: 3 },
            { nome: 'Azeite de oliva', categoria: 'Oleos e gorduras', unidadePadrao: 'colher de sopa', gramasPorUnidade: 8, kcal: 884, carboidratos: 0, proteinas: 0, gorduras: 100, fibras: 0, sodio: 0 },
            { nome: 'Pao frances', categoria: 'Paes', unidadePadrao: 'unidade', gramasPorUnidade: 50, kcal: 300, carboidratos: 58.6, proteinas: 8, gorduras: 3.1, fibras: 2.3, sodio: 648 }
        ];
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
        snapshot.forEach((docSnap) => this.alimentosBase.push({ id: docSnap.id, ...docSnap.data() }));

        if (this.alimentosBase.length === 0) {
            for (const alimento of this.getAlimentosIniciais()) {
                await addDoc(ref, {
                    ...alimento,
                    fonte: 'base_inicial_editavel',
                    criado_por: this.userInfo.login,
                    data_criacao: new Date().toISOString()
                });
            }

            const novoSnapshot = await getDocs(ref);
            this.alimentosBase = [];
            novoSnapshot.forEach((docSnap) => this.alimentosBase.push({ id: docSnap.id, ...docSnap.data() }));
        }

        this.alimentosCarregados = true;
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

    formatarQuantidadePreview(alimento, curto = false) {
        const quantidade = Number(document.getElementById('foodQuantidade')?.value || 1);
        const unidade = alimento.unidadePadrao || 'porcao';
        const gramas = quantidade * Number(alimento.gramasPorUnidade || 100);

        if (curto) {
            return `${this.formatarNumero(quantidade)} ${unidade}`;
        }

        return `${this.formatarNumero(quantidade)} ${unidade} (${this.formatarNumero(gramas, 0)} g)`;
    }

    getRefeicoesPlano() {
        return [
            { id: 'breakfast', titulo: 'Cafe da Manha' },
            { id: 'morningSnack', titulo: 'Lanche Manha' },
            { id: 'lunch', titulo: 'Almoco' },
            { id: 'afternoonSnack', titulo: 'Lanche Tarde' },
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
        return {
            id: this.gerarIdItemPlano(),
            texto: this.resumirTextoItemPlano(linha),
            detalhes: null,
            detalhesAberto: false
        };
    }

    criarEstadoItensPlano(plano = {}) {
        return this.getRefeicoesPlano().reduce((estado, refeicao) => {
            if (Array.isArray(plano.itens_plano?.[refeicao.id])) {
                estado[refeicao.id] = plano.itens_plano[refeicao.id].map((item) => ({
                    id: item.id || this.gerarIdItemPlano(),
                    texto: this.resumirTextoItemPlano(item.texto || ''),
                    detalhes: item.detalhes || null,
                    detalhesAberto: false
                })).filter((item) => item.texto);
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
            <div id="mealItemsGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-bottom: 20px;">
                ${this.getRefeicoesPlano().map((refeicao) => this.renderRefeicaoEditor(refeicao)).join('')}
            </div>
        `;
    }

    renderRefeicaoEditor(refeicao) {
        const itens = this.itensPlano[refeicao.id] || [];
        const selecionada = this.refeicaoSelecionada === refeicao.id;

        return `
            <div class="meal-editor-card" data-meal-id="${refeicao.id}" style="background: white; border: 2px solid ${selecionada ? '#1a237e' : '#e2e8f0'}; border-radius: 10px; overflow: hidden; min-height: 190px; cursor: pointer;">
                <div style="background: ${selecionada ? '#1a237e' : '#f1f5f9'}; color: ${selecionada ? 'white' : '#1a237e'}; padding: 10px 14px; font-weight: 600; display: flex; justify-content: space-between; gap: 8px;">
                    <span>${refeicao.titulo}</span>
                    ${selecionada ? '<span style="font-size: 12px; font-weight: 500;">Selecionada</span>' : ''}
                </div>
                <div style="padding: 10px; display: grid; gap: 8px;">
                    ${itens.length ? itens.map((item) => this.renderItemRefeicao(refeicao.id, item)).join('') : '<div style="color: #94a3b8; font-size: 13px; padding: 10px; border: 1px dashed #cbd5e1; border-radius: 8px;">Nenhum alimento nesta refeicao.</div>'}
                </div>
            </div>
        `;
    }

    renderItemRefeicao(mealId, item) {
        const detalhes = item.detalhes;
        return `
            <div class="meal-item-row" data-meal-id="${mealId}" data-item-id="${item.id}" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px; background: #f8fafc;">
                <div style="display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center;">
                    <div style="color: #334155; font-size: 13px; line-height: 1.35;">${this.escapeHtml(item.texto)}</div>
                    <button type="button" class="btnDetalhesItemPlano" data-meal-id="${mealId}" data-item-id="${item.id}" aria-label="Exibir detalhes" style="padding: 6px 9px; border: none; border-radius: 7px; background: #e0f2fe; color: #0369a1; cursor: pointer;">&#128065;</button>
                    <button type="button" class="btnExcluirItemPlano" data-meal-id="${mealId}" data-item-id="${item.id}" aria-label="Excluir item" style="padding: 6px 9px; border: none; border-radius: 7px; background: #fee2e2; color: #b91c1c; cursor: pointer;">X</button>
                </div>
                ${item.detalhesAberto ? `
                    <div style="margin-top: 8px; color: #64748b; font-size: 12px; line-height: 1.5;">
                        ${detalhes ? `
                            ${this.escapeHtml(detalhes.nome)} | ${this.escapeHtml(detalhes.quantidadeTexto)} | ${this.formatarNumero(detalhes.gramas)} g<br>
                            ${this.formatarNumero(detalhes.kcal, 0)} kcal | C ${this.formatarNumero(detalhes.carboidratos)}g | P ${this.formatarNumero(detalhes.proteinas)}g | G ${this.formatarNumero(detalhes.gorduras)}g
                        ` : 'Item criado a partir de texto antigo do plano.'}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderBaseNutricional() {
        const alimentos = this.filtrarAlimentos();
        return `
            <div style="background: #f8fafc; border: 1px solid #dbe3ef; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px;">
                    <div>
                        <h4 style="margin: 0; color: #1a237e;">Base nutricional</h4>
                        <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Base propria, gratuita e editavel. Valores por 100 g/ml.</p>
                    </div>
                    <button id="btnLimparAlimentoForm" type="button" style="padding: 8px 12px; border: none; border-radius: 8px; background: #e2e8f0; color: #334155; cursor: pointer;">Novo alimento</button>
                </div>

                <div style="display: grid; grid-template-columns: 1.2fr 150px 120px 120px 110px 110px 110px 110px 110px; gap: 8px; align-items: end;">
                    <label style="font-size: 12px; color: #475569;">Nome<input id="foodNome" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                    <label style="font-size: 12px; color: #475569;">Categoria<input id="foodCategoria" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                    <label style="font-size: 12px; color: #475569;">Unidade<input id="foodUnidade" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;" placeholder="unidade"></label>
                    <label style="font-size: 12px; color: #475569;">g/unid<input id="foodGramasUnidade" type="number" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                    <label style="font-size: 12px; color: #475569;">kcal<input id="foodKcal" type="number" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                    <label style="font-size: 12px; color: #475569;">Carb<input id="foodCarboidratos" type="number" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                    <label style="font-size: 12px; color: #475569;">Prot<input id="foodProteinas" type="number" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                    <label style="font-size: 12px; color: #475569;">Gord<input id="foodGorduras" type="number" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                    <button id="btnSalvarAlimento" type="button" style="padding: 9px 10px; border: none; border-radius: 8px; background: #1a237e; color: white; cursor: pointer;">Salvar</button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; align-items: end; margin-top: 14px;">
                    <label style="font-size: 12px; color: #475569;">Buscar alimento<input id="foodSearch" style="width: 100%; padding: 9px; border: 1px solid #cbd5e1; border-radius: 8px;" placeholder="Ex: arroz, frango, banana"></label>
                    <label style="font-size: 12px; color: #475569;">Refeicao
                        <select id="foodMealTarget" style="width: 100%; padding: 9px; border: 1px solid #cbd5e1; border-radius: 8px;">
                            <option value="breakfast" ${this.refeicaoSelecionada === 'breakfast' ? 'selected' : ''}>Cafe da manha</option>
                            <option value="morningSnack" ${this.refeicaoSelecionada === 'morningSnack' ? 'selected' : ''}>Lanche manha</option>
                            <option value="lunch" ${this.refeicaoSelecionada === 'lunch' ? 'selected' : ''}>Almoco</option>
                            <option value="afternoonSnack" ${this.refeicaoSelecionada === 'afternoonSnack' ? 'selected' : ''}>Lanche tarde</option>
                            <option value="dinner" ${this.refeicaoSelecionada === 'dinner' ? 'selected' : ''}>Jantar</option>
                            <option value="supper" ${this.refeicaoSelecionada === 'supper' ? 'selected' : ''}>Ceia</option>
                        </select>
                    </label>
                    <label style="font-size: 12px; color: #475569;">Quantidade<input id="foodQuantidade" type="number" step="0.1" value="1" style="width: 100%; padding: 9px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                    <label style="font-size: 12px; color: #475569;">Tipo
                        <select id="foodTipoQuantidade" style="width: 100%; padding: 9px; border: 1px solid #cbd5e1; border-radius: 8px;">
                            <option value="unidade">unidade/porcao</option>
                            <option value="gramas">gramas</option>
                        </select>
                    </label>
                    <label style="font-size: 12px; color: #475569;">Gramas se manual<input id="foodGramasManual" type="number" step="0.1" style="width: 100%; padding: 9px; border: 1px solid #cbd5e1; border-radius: 8px;" placeholder="Ex: 100"></label>
                    <button id="btnRemoverUltimoAlimento" type="button" style="padding: 9px 10px; border: none; border-radius: 8px; background: #f97316; color: white; cursor: pointer; white-space: nowrap;">Remover ultimo</button>
                    <button id="btnLimparRefeicao" type="button" style="padding: 9px 10px; border: none; border-radius: 8px; background: #dc2626; color: white; cursor: pointer; white-space: nowrap;">Limpar refeicao</button>
                </div>

                <div id="foodResults" style="margin-top: 12px; display: grid; gap: 8px;">
                    ${this.renderResultadosAlimentos(alimentos)}
                </div>
            </div>
        `;
    }

    renderResultadosAlimentos(alimentos) {
        if (!alimentos.length) {
            return '<div style="color: #64748b; font-size: 13px;">Nenhum alimento cadastrado.</div>';
        }

        return alimentos.map((alimento) => `
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center;">
                <div>
                    <strong style="color: #1a237e;">${this.escapeHtml(alimento.nome)}</strong>
                    <div style="font-size: 12px; color: #64748b;">${this.escapeHtml(alimento.categoria || 'Sem categoria')} | ${this.escapeHtml(alimento.kcal || 0)} kcal | C ${this.escapeHtml(alimento.carboidratos || 0)}g P ${this.escapeHtml(alimento.proteinas || 0)}g G ${this.escapeHtml(alimento.gorduras || 0)}g por 100g</div>
                </div>
                <button type="button" class="btnEditarAlimento" data-food-id="${this.escapeHtml(alimento.id)}" style="padding: 7px 10px; border: none; border-radius: 8px; background: #e2e8f0; color: #334155; cursor: pointer;">Editar</button>
                <button type="button" class="btnAdicionarAlimento" data-food-id="${this.escapeHtml(alimento.id)}" style="padding: 7px 10px; border: none; border-radius: 8px; background: #16a34a; color: white; cursor: pointer;">Adicionar</button>
            </div>
        `).join('');
    }

    renderFormularioPlano() {
        const plano = this.planoEditando || {};
        const safePlano = {
            breakfast: this.escapeHtml(plano.breakfast || ''),
            morningSnack: this.escapeHtml(plano.morningSnack || ''),
            lunch: this.escapeHtml(plano.lunch || ''),
            afternoonSnack: this.escapeHtml(plano.afternoonSnack || ''),
            dinner: this.escapeHtml(plano.dinner || ''),
            supper: this.escapeHtml(plano.supper || ''),
            guidelines: this.escapeHtml(plano.guidelines || ''),
            restrictions: this.escapeHtml(plano.restrictions || ''),
            goals: this.escapeHtml(plano.goals || '')
        };
        
        return `
            ${this.renderBaseNutricional()}

            <div class="meals-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-bottom: 20px;">
                <div class="meal-card" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <div class="meal-header" style="background: #1a237e; color: white; padding: 10px 14px; font-weight: 600;">🌅 Café da Manhã</div>
                    <textarea id="breakfast" class="meal-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Alimentos e quantidades...">${safePlano.breakfast}</textarea>
                </div>
                <div class="meal-card" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <div class="meal-header" style="background: #1a237e; color: white; padding: 10px 14px; font-weight: 600;">🍎 Lanche Manhã</div>
                    <textarea id="morningSnack" class="meal-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Alimentos e quantidades...">${safePlano.morningSnack}</textarea>
                </div>
                <div class="meal-card" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <div class="meal-header" style="background: #1a237e; color: white; padding: 10px 14px; font-weight: 600;">🍽️ Almoço</div>
                    <textarea id="lunch" class="meal-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Alimentos e quantidades...">${safePlano.lunch}</textarea>
                </div>
                <div class="meal-card" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <div class="meal-header" style="background: #1a237e; color: white; padding: 10px 14px; font-weight: 600;">🍌 Lanche Tarde</div>
                    <textarea id="afternoonSnack" class="meal-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Alimentos e quantidades...">${safePlano.afternoonSnack}</textarea>
                </div>
                <div class="meal-card" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <div class="meal-header" style="background: #1a237e; color: white; padding: 10px 14px; font-weight: 600;">🌙 Jantar</div>
                    <textarea id="dinner" class="meal-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Alimentos e quantidades...">${safePlano.dinner}</textarea>
                </div>
                <div class="meal-card" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <div class="meal-header" style="background: #1a237e; color: white; padding: 10px 14px; font-weight: 600;">⭐ Ceia</div>
                    <textarea id="supper" class="meal-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Alimentos e quantidades...">${safePlano.supper}</textarea>
                </div>
            </div>

            <div class="additional-info" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
                <div class="info-group" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <label style="display: block; background: #1a237e; color: white; padding: 10px 14px; font-weight: 600; margin: 0;">📌 Orientações Gerais</label>
                    <textarea id="guidelines" class="info-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Hidratação, horários, etc...">${safePlano.guidelines}</textarea>
                </div>
                <div class="info-group" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <label style="display: block; background: #1a237e; color: white; padding: 10px 14px; font-weight: 600; margin: 0;">⚠️ Restrições Alimentares</label>
                    <textarea id="restrictions" class="info-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Alergias, intolerâncias...">${safePlano.restrictions}</textarea>
                </div>
                <div class="info-group" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <label style="display: block; background: #1a237e; color: white; padding: 10px 14px; font-weight: 600; margin: 0;">🎯 Objetivos</label>
                    <textarea id="goals" class="info-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Metas...">${safePlano.goals}</textarea>
                </div>
            </div>
        `;
    }

    renderBaseNutricional() {
        const termo = document.getElementById('foodSearch')?.value || '';
        const alimentos = this.filtrarAlimentos(termo);
        const quantidade = Number(document.getElementById('foodQuantidade')?.value || 1);
        return `
            <div style="background: #f8fafc; border: 1px solid #dbe3ef; border-radius: 12px; padding: 14px; margin-bottom: 14px; flex: 0 0 auto;">
                <div style="display: grid; grid-template-columns: minmax(260px, 1fr) 120px; gap: 8px; align-items: end;">
                    <label style="font-size: 12px; color: #475569;">Pesquisar alimento
                        <input id="foodSearch" autocomplete="off" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;" placeholder="Digite: ar, pao, frango..." value="${this.escapeHtml(termo)}">
                    </label>
                    <label style="font-size: 12px; color: #475569;">Quantidade
                        <input id="foodQuantidade" type="number" min="0.1" step="0.1" value="${quantidade || 1}" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;">
                    </label>
                </div>
                <div id="foodResults" style="margin-top: 12px; display: grid; gap: 8px; max-height: 180px; overflow-y: auto; padding-right: 4px;">
                    ${this.renderResultadosAlimentos(alimentos)}
                </div>
            </div>
        `;
    }

    renderResultadosAlimentos(alimentos) {
        if (!alimentos.length) {
            return '<div style="color: #64748b; font-size: 13px;">Digite para pesquisar alimentos.</div>';
        }

        return alimentos.map((alimento) => `
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center;">
                <div style="min-width: 0;">
                    <strong style="color: #1a237e; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(alimento.nome)}</strong>
                </div>
                <div style="font-size: 13px; color: #475569; white-space: nowrap;">${this.escapeHtml(this.formatarQuantidadePreview(alimento))}</div>
                <button type="button" class="btnAdicionarAlimento" data-food-id="${this.escapeHtml(alimento.id)}" style="padding: 8px 12px; border: none; border-radius: 8px; background: #16a34a; color: white; cursor: pointer;">Adicionar</button>
            </div>
        `).join('');
    }

    renderFormularioPlano() {
        return `
            <div style="display: flex; flex-direction: column; gap: 14px; height: 100%; overflow: hidden;">
                ${this.renderBaseNutricional()}
                <div style="flex: 1; overflow-y: auto; padding-right: 4px;">
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
                <div style="background: #f8fafc; border: 1px solid #dbe3ef; border-radius: 12px; padding: 14px; flex: 0 0 auto;">
                    <div style="display: grid; grid-template-columns: 1.2fr 150px 120px 120px 120px 120px 120px 120px 120px auto; gap: 8px; align-items: end;">
                        <label style="font-size: 12px; color: #475569;">Nome<input id="foodNome" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                        <label style="font-size: 12px; color: #475569;">Categoria<input id="foodCategoria" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                        <label style="font-size: 12px; color: #475569;">Unidade<input id="foodUnidade" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;" placeholder="porcao"></label>
                        <label style="font-size: 12px; color: #475569;">g/unid<input id="foodGramasUnidade" type="number" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                        <label style="font-size: 12px; color: #475569;">kcal<input id="foodKcal" type="number" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                        <label style="font-size: 12px; color: #475569;">Carb<input id="foodCarboidratos" type="number" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                        <label style="font-size: 12px; color: #475569;">Prot<input id="foodProteinas" type="number" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                        <label style="font-size: 12px; color: #475569;">Gord<input id="foodGorduras" type="number" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                        <button id="btnSalvarAlimento" type="button" style="padding: 9px 10px; border: none; border-radius: 8px; background: #0f766e; color: white; cursor: pointer;">Salvar</button>
                    </div>
                </div>

                <div style="background: #f8fafc; border: 1px solid #dbe3ef; border-radius: 12px; padding: 14px; flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: grid; grid-template-columns: minmax(220px, 1fr) auto; gap: 8px; align-items: end; flex: 0 0 auto;">
                        <label style="font-size: 12px; color: #475569;">Pesquisar na lista
                            <input id="listaFoodSearch" autocomplete="off" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;" placeholder="Digite: ar, pao, frango..." value="${this.escapeHtml(termo)}">
                        </label>
                        <button id="btnLimparAlimentoForm" type="button" style="padding: 10px 14px; border: none; border-radius: 8px; background: #e2e8f0; color: #334155; cursor: pointer;">Novo alimento</button>
                    </div>

                    <div id="listaFoodResults" style="flex: 1; overflow-y: auto; display: grid; gap: 8px; padding-right: 4px;">
                        ${this.renderResultadosListaAlimentos(alimentos)}
                    </div>
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
        document.getElementById('btnSalvarAlimento')?.addEventListener('click', () => this.salvarAlimentoBase(refresh));
        document.getElementById('btnLimparAlimentoForm')?.addEventListener('click', () => this.limparFormularioAlimento());
        this.attachListaAlimentosResultButtons();
    }

    attachListaAlimentosResultButtons() {
        document.querySelectorAll('.btnEditarAlimento').forEach((button) => {
            button.addEventListener('click', () => this.preencherFormularioAlimento(button.dataset.foodId));
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
        document.getElementById('btnListaAlimentos')?.addEventListener('click', () => this.abrirModalListaAlimentos());
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
    }

    attachFoodResultButtons() {
        document.querySelectorAll('.btnAdicionarAlimento').forEach((button) => {
            button.addEventListener('click', () => this.adicionarAlimentoNaRefeicao(button.dataset.foodId));
        });
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
        this.renderizarRefeicoesPlano();
    }

    alternarDetalhesItemPlano(mealId, itemId) {
        const item = (this.itensPlano[mealId] || []).find((registro) => registro.id === itemId);
        if (!item) return;

        item.detalhesAberto = !item.detalhesAberto;
        this.renderizarRefeicoesPlano();
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
            .map((item) => item.texto)
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
        if (!nome) {
            alert('Informe o nome do alimento.');
            return;
        }

        const payload = {
            nome,
            categoria: document.getElementById('foodCategoria')?.value?.trim() || 'Geral',
            unidadePadrao: document.getElementById('foodUnidade')?.value?.trim() || 'porcao',
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
        onSaved?.();
    }

    adicionarAlimentoNaRefeicao(foodId) {
        const alimento = this.alimentosBase.find((item) => item.id === foodId);
        if (!alimento) return;

        const quantidade = Number(document.getElementById('foodQuantidade')?.value || 1);
        const mealId = this.obterRefeicaoSelecionada();
        this.refeicaoSelecionada = mealId;
        const nutrientes = this.calcularNutrientes(alimento, quantidade, 'unidade');
        const quantidadeTexto = this.formatarQuantidadePreview(alimento, true);
        const linha = `${alimento.nome} - ${quantidadeTexto}`;
        this.itensPlano[mealId] = this.itensPlano[mealId] || [];
        this.itensPlano[mealId].push({
            id: this.gerarIdItemPlano(),
            texto: linha,
            detalhes: {
                nome: alimento.nome,
                quantidadeTexto,
                gramas: nutrientes.gramas,
                kcal: nutrientes.kcal,
                carboidratos: nutrientes.carboidratos,
                proteinas: nutrientes.proteinas,
                gorduras: nutrientes.gorduras
            },
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
