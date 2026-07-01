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
                    <div id="pacienteInfo" class="info-section" style="margin-bottom: 24px;">
                        <div style="margin-bottom: 20px;">
                            <select id="pacienteSelect" style="width: 100%; max-width: 350px; padding: 10px 14px; border-radius: 10px; border: 2px solid #e2e8f0; background: white;">
                                <option value="">-- Selecione um paciente --</option>
                                ${this.pacientesList.map(p => `
                                    <option value="${p.login}" ${this.selectedPaciente?.login === p.login ? 'selected' : ''}>
                                        ${p.nome} (${p.login})
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        ${this.selectedPaciente ? `
                            <div class="info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                                <div class="info-card" style="background: #f8fafc; padding: 12px; border-radius: 8px;">
                                    <span style="color: #64748b; font-size: 12px;">Nome</span>
                                    <div style="font-weight: 600;">${this.selectedPaciente.nome}</div>
                                </div>
                                <div class="info-card" style="background: #f8fafc; padding: 12px; border-radius: 8px;">
                                    <span style="color: #64748b; font-size: 12px;">Idade</span>
                                    <div style="font-weight: 600;">${this.funcoes.calcularIdade(this.selectedPaciente.dataNascimento)} anos</div>
                                </div>
                                <div class="info-card" style="background: #f8fafc; padding: 12px; border-radius: 8px;">
                                    <span style="color: #64748b; font-size: 12px;">Total de Planos</span>
                                    <div style="font-weight: 600;">${this.planosList.length}</div>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    ${this.selectedPaciente ? `
                        <!-- Lista de Planos -->
                        <div style="margin-bottom: 20px;">
                            <h3 style="color: #1a237e; margin-bottom: 20px;">
                                📋 Planos Alimentares
                                ${this.planosList.length > 0 ? `<span style="font-size: 14px; color: #64748b;">(${this.planosList.length} encontrados)</span>` : ''}
                            </h3>
                            
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
                    <div class="modal-content" style="background: white; border-radius: 16px; width: 90%; max-width: 1000px; max-height: 90vh; overflow-y: auto; margin: 20px auto;">
                        <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: white; padding: 20px 24px; border-radius: 16px 16px 0 0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10;">
                            <h3 style="margin: 0;">
                                ${this.planoEditando ? '✏️ Editar Plano Alimentar' : '📝 Novo Plano Alimentar'}
                            </h3>
                            <button onclick="document.getElementById('modalPlano').style.display='none'" 
                                    style="background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; font-size: 20px;">
                                ✕
                            </button>
                        </div>
                        
                        <div style="padding: 24px;">
                            ${this.renderFormularioPlano()}
                        </div>
                        
                        <div style="padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; position: sticky; bottom: 0; border-radius: 0 0 16px 16px;">
                            <button onclick="document.getElementById('modalPlano').style.display='none'" 
                                    style="padding: 10px 24px; background: #e2e8f0; color: #475569; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                Cancelar
                            </button>
                            <button id="btnSalvarPlano" 
                                    style="padding: 10px 24px; background: #1a237e; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                💾 Salvar Plano
                            </button>
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

        // Ordena por versão (mais recente primeiro)
        const planosOrdenados = [...this.planosList].sort((a, b) => (b.versao || 0) - (a.versao || 0));

        return planosOrdenados.map((plano, index) => {
            const isExpanded = this.planoExpandido === plano.id;
            const isAtivo = plano.status === 'ativo';
            
            return `
                <div class="plano-card" style="
                    background: white; 
                    border: 2px solid ${isAtivo ? '#22c55e' : '#e2e8f0'}; 
                    border-radius: 12px; 
                    margin-bottom: 16px; 
                    overflow: hidden;
                ">
                    <!-- Cabeçalho do Card -->
                    <div onclick="window.planoAlimentarInstance.toggleExpandirPlano('${plano.id}')" 
                         style="padding: 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <span style="
                                background: ${isAtivo ? '#22c55e' : '#64748b'}; 
                                color: white; 
                                padding: 6px 14px; 
                                border-radius: 20px; 
                                font-size: 14px; 
                                font-weight: 600;
                            ">
                                v${plano.versao || '?'}
                            </span>
                            
                            ${isAtivo ? `
                                <span style="background: #dcfce7; color: #16a34a; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                                    ✓ ATUAL
                                </span>
                            ` : `
                                <span style="background: #f1f5f9; color: #64748b; padding: 4px 10px; border-radius: 20px; font-size: 12px;">
                                    Histórico
                                </span>
                            `}
                            
                            <span style="color: #64748b; font-size: 13px;">
                                📅 ${this.formatarData(plano.data_criacao)}
                            </span>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${plano.goals ? `
                                <span style="color: #475569; font-size: 13px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    🎯 ${plano.goals}
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
                                    <strong style="color: #1a237e;">👤 Profissional:</strong>
                                    <span style="color: #475569;">${plano.profissional || 'Não informado'}</span>
                                </div>
                                ${plano.data_atualizacao ? `
                                    <div style="background: white; padding: 12px; border-radius: 8px;">
                                        <strong style="color: #1a237e;">🔄 Atualizado:</strong>
                                        <span style="color: #475569;">${this.formatarData(plano.data_atualizacao)}</span>
                                    </div>
                                ` : ''}
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
                                ${!isAtivo ? `
                                    <button onclick="window.planoAlimentarInstance.ativarPlano('${plano.id}')" 
                                            style="padding: 10px 20px; background: #22c55e; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                        ✅ Tornar Atual
                                    </button>
                                ` : ''}
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
                <p style="color: #475569; margin: 0; font-size: 14px; white-space: pre-wrap;">${conteudo}</p>
            </div>
        `;
    }

    renderInfoCard(titulo, conteudo) {
        return `
            <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 12px;">
                <strong style="color: #1a237e; display: block; margin-bottom: 8px;">${titulo}</strong>
                <p style="color: #475569; margin: 0; white-space: pre-wrap;">${conteudo}</p>
            </div>
        `;
    }

    renderFormularioPlano() {
        const plano = this.planoEditando || {};
        
        return `
            <div class="meals-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-bottom: 20px;">
                <div class="meal-card" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <div class="meal-header" style="background: #1a237e; color: white; padding: 10px 14px; font-weight: 600;">🌅 Café da Manhã</div>
                    <textarea id="breakfast" class="meal-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Alimentos e quantidades...">${plano.breakfast || ''}</textarea>
                </div>
                <div class="meal-card" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <div class="meal-header" style="background: #1a237e; color: white; padding: 10px 14px; font-weight: 600;">🍎 Lanche Manhã</div>
                    <textarea id="morningSnack" class="meal-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Alimentos e quantidades...">${plano.morningSnack || ''}</textarea>
                </div>
                <div class="meal-card" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <div class="meal-header" style="background: #1a237e; color: white; padding: 10px 14px; font-weight: 600;">🍽️ Almoço</div>
                    <textarea id="lunch" class="meal-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Alimentos e quantidades...">${plano.lunch || ''}</textarea>
                </div>
                <div class="meal-card" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <div class="meal-header" style="background: #1a237e; color: white; padding: 10px 14px; font-weight: 600;">🍌 Lanche Tarde</div>
                    <textarea id="afternoonSnack" class="meal-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Alimentos e quantidades...">${plano.afternoonSnack || ''}</textarea>
                </div>
                <div class="meal-card" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <div class="meal-header" style="background: #1a237e; color: white; padding: 10px 14px; font-weight: 600;">🌙 Jantar</div>
                    <textarea id="dinner" class="meal-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Alimentos e quantidades...">${plano.dinner || ''}</textarea>
                </div>
                <div class="meal-card" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <div class="meal-header" style="background: #1a237e; color: white; padding: 10px 14px; font-weight: 600;">⭐ Ceia</div>
                    <textarea id="supper" class="meal-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Alimentos e quantidades...">${plano.supper || ''}</textarea>
                </div>
            </div>

            <div class="additional-info" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
                <div class="info-group" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <label style="display: block; background: #1a237e; color: white; padding: 10px 14px; font-weight: 600; margin: 0;">📌 Orientações Gerais</label>
                    <textarea id="guidelines" class="info-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Hidratação, horários, etc...">${plano.guidelines || ''}</textarea>
                </div>
                <div class="info-group" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <label style="display: block; background: #1a237e; color: white; padding: 10px 14px; font-weight: 600; margin: 0;">⚠️ Restrições Alimentares</label>
                    <textarea id="restrictions" class="info-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Alergias, intolerâncias...">${plano.restrictions || ''}</textarea>
                </div>
                <div class="info-group" style="background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <label style="display: block; background: #1a237e; color: white; padding: 10px 14px; font-weight: 600; margin: 0;">🎯 Objetivos</label>
                    <textarea id="goals" class="info-textarea" style="width: 100%; min-height: 100px; padding: 12px; border: none; resize: vertical; background: white;" 
                        placeholder="Metas...">${plano.goals || ''}</textarea>
                </div>
            </div>
        `;
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
            btnNovoPlano.addEventListener('click', () => {
                this.planoEditando = null;
                this.abrirModal();
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
        window.planoAlimentarInstance = this;
    }

    async loadPlanos() {
        if (!this.selectedPaciente) return;
        
        try {
            console.log('🔍 Buscando planos para:', this.selectedPaciente.login);
            
            const historicoRef = collection(db, 'historico_planos_alimentares');
            const q = query(historicoRef, where('paciente_login', '==', this.selectedPaciente.login));
            const querySnapshot = await getDocs(q);
            
            this.planosList = [];
            querySnapshot.forEach((docSnap) => {
                this.planosList.push({ id: docSnap.id, ...docSnap.data() });
            });
            
            console.log(`✅ ${this.planosList.length} planos encontrados`);
        } catch (error) {
            console.error("Erro ao carregar planos:", error);
            this.planosList = [];
        }
    }

    abrirModal() {
        const modal = document.getElementById('modalPlano');
        if (modal) {
            modal.style.display = 'flex';
            // Focar no primeiro textarea
            setTimeout(() => {
                const primeiroTextarea = modal.querySelector('textarea');
                if (primeiroTextarea) primeiroTextarea.focus();
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
            delete this.planoEditando.id; // Remove ID para criar nova versão
            this.planoExpandido = null;
            this.abrirModal();
        }
    }

    async ativarPlano(planoId) {
        if (!confirm('Tornar este plano como o plano atual do paciente?')) return;
        
        try {
            // Desativar plano atual
            const planoAtual = this.planosList.find(p => p.status === 'ativo');
            if (planoAtual) {
                const planoAtualDoc = doc(db, 'historico_planos_alimentares', planoAtual.id);
                await updateDoc(planoAtualDoc, { 
                    status: 'inativo',
                    data_desativacao: new Date().toISOString()
                });
            }
            
            // Ativar plano selecionado
            const planoDoc = doc(db, 'historico_planos_alimentares', planoId);
            await updateDoc(planoDoc, { 
                status: 'ativo',
                data_ativacao: new Date().toISOString()
            });
            
            alert('✅ Plano ativado com sucesso!');
            await this.loadPlanos();
            this.planoExpandido = null;
            await this.render();
        } catch (error) {
            console.error("Erro ao ativar plano:", error);
            alert('❌ Erro ao ativar plano: ' + error.message);
        }
    }

    async saveMealPlan() {
        if (!this.selectedPaciente) {
            alert('❌ Selecione um paciente primeiro!');
            return;
        }

        try {
            const versoesExistentes = this.planosList.length;
            const novaVersao = versoesExistentes + 1;
            
            const mealPlanData = {
                paciente_login: this.selectedPaciente.login,
                paciente_nome: this.selectedPaciente.nome,
                profissional: this.userInfo.nome,
                profissional_login: this.userInfo.login,
                data_criacao: new Date().toISOString(),
                data_atualizacao: new Date().toISOString(),
                versao: novaVersao,
                status: 'ativo',
                breakfast: document.getElementById('breakfast')?.value || '',
                morningSnack: document.getElementById('morningSnack')?.value || '',
                lunch: document.getElementById('lunch')?.value || '',
                afternoonSnack: document.getElementById('afternoonSnack')?.value || '',
                dinner: document.getElementById('dinner')?.value || '',
                supper: document.getElementById('supper')?.value || '',
                guidelines: document.getElementById('guidelines')?.value || '',
                restrictions: document.getElementById('restrictions')?.value || '',
                goals: document.getElementById('goals')?.value || ''
            };

            // Desativar plano atual se existir
            const planoAtual = this.planosList.find(p => p.status === 'ativo');
            if (planoAtual) {
                const planoAtualDoc = doc(db, 'historico_planos_alimentares', planoAtual.id);
                await updateDoc(planoAtualDoc, { 
                    status: 'inativo',
                    data_desativacao: new Date().toISOString()
                });
            }

            // Salvar novo plano
            const historicoRef = collection(db, 'historico_planos_alimentares');
            await addDoc(historicoRef, mealPlanData);
            
            alert(`✅ Plano versão ${novaVersao} criado com sucesso!`);
            
            // Fechar modal e recarregar
            this.fecharModal();
            await this.loadPlanos();
            await this.render();
            
        } catch (error) {
            console.error("Erro ao salvar plano:", error);
            alert('❌ Erro ao salvar: ' + error.message);
        }
    }

    clonarPlano(planoId) {
        const plano = this.planosList.find(p => p.id === planoId);
        if (plano) {
            this.planoEditando = { ...plano };
            delete this.planoEditando.id;
            delete this.planoEditando.versao;
            delete this.planoEditando.status;
            delete this.planoEditando.data_criacao;
            this.planoExpandido = null;
            this.abrirModal();
        }
    }

    exportarPlano(planoId) {
        const plano = this.planosList.find(p => p.id === planoId);
        if (!plano) return;

        let conteudo = `PLANO ALIMENTAR - VERSÃO ${plano.versao || '?'}\n`;
        conteudo += `${'='.repeat(50)}\n\n`;
        conteudo += `👤 Paciente: ${plano.paciente_nome || 'Não informado'}\n`;
        conteudo += `👨‍⚕️ Profissional: ${plano.profissional || 'Não informado'}\n`;
        conteudo += `📅 Criado em: ${this.formatarData(plano.data_criacao)}\n`;
        conteudo += `📊 Status: ${plano.status === 'ativo' ? 'ATUAL' : 'Histórico'}\n`;
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
        link.download = `plano_alimentar_v${plano.versao}_${(plano.paciente_nome || 'paciente').toLowerCase().replace(/\s+/g, '_')}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    }

    formatarData(dataString) {
        if (!dataString) return 'Data não disponível';
        try {
            const data = new Date(dataString);
            return data.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dataString;
        }
    }
}
