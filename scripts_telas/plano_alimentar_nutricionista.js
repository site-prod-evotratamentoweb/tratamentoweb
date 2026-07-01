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
    orderBy,
    limit,
    getDoc,
    deleteDoc
} from '../0_firebase_api_config.js';

export class PlanoAlimentarNutricionista {
    constructor(userInfo, pacientesList) {
        this.userInfo = userInfo;
        this.funcoes = FuncoesCompartilhadas;
        this.pacientesList = pacientesList || [];
        this.selectedPaciente = null;
        this.currentMealPlan = null;
        this.historicoPlanos = [];
        this.planoSelecionadoHistorico = null;
        this.mostrarHistorico = false;
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
            this.loadMealPlan();
            this.loadHistoricoPlanos();
        }
    }

    renderHTML() {
        return `
            <div class="dashboard-container" style="height: 100vh; display: flex; flex-direction: column;">
                <div id="menuContainer"></div>

                <div class="main-content" style="flex: 1; overflow-y: auto; padding: 20px 32px;">
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

                        <div class="info-grid">
                            <div class="info-card">
                                <span class="info-label">Nome</span>
                                <span class="info-value" id="infoNome">${this.selectedPaciente?.nome || '--'}</span>
                            </div>
                            <div class="info-card">
                                <span class="info-label">Login</span>
                                <span class="info-value" id="infoLogin">${this.selectedPaciente?.login || '--'}</span>
                            </div>
                            <div class="info-card">
                                <span class="info-label">Idade</span>
                                <span class="info-value" id="infoIdade">${this.selectedPaciente ? this.funcoes.calcularIdade(this.selectedPaciente.dataNascimento) : '--'} anos</span>
                            </div>
                            <div class="info-card">
                                <span class="info-label">Sexo</span>
                                <span class="info-value" id="infoSexo">${this.selectedPaciente?.sexo || '--'}</span>
                            </div>
                        </div>
                    </div>

                    ${this.selectedPaciente ? `
                        <!-- BOTÃO DO HISTÓRICO -->
                        <div style="margin-bottom: 20px;">
                            <button id="toggleHistoricoBtn" class="btn-historico" style="
                                width: 100%;
                                padding: 12px;
                                background: ${this.mostrarHistorico ? '#64748b' : '#0ea5e9'};
                                color: white;
                                border: none;
                                border-radius: 10px;
                                font-size: 16px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.3s;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 8px;
                            ">
                                <span>📋</span>
                                <span>${this.mostrarHistorico ? 'Ocultar Histórico' : 'Ver Histórico de Planos'}</span>
                            </button>
                        </div>

                        <!-- SEÇÃO DE HISTÓRICO -->
                        <div id="historicoSection" style="display: ${this.mostrarHistorico ? 'block' : 'none'}; margin-bottom: 30px;">
                            ${this.renderHistoricoHTML()}
                        </div>

                        <!-- PLANO ATUAL -->
                        <div class="meal-plan-container" id="mealPlanContainer" style="display: ${this.mostrarHistorico && this.planoSelecionadoHistorico ? 'none' : 'block'};">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <h4 style="margin: 0; color: #1a237e;">
                                    ${this.planoSelecionadoHistorico ? 
                                        `📝 Visualizando Plano (v${this.planoSelecionadoHistorico.versao || 1})` : 
                                        '📝 Plano Alimentar Atual'}
                                </h4>
                                ${this.planoSelecionadoHistorico ? `
                                    <button onclick="window.planoAlimentarInstance.voltarParaEdicao()" 
                                            style="padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">
                                        ✕ Fechar Visualização
                                    </button>
                                ` : ''}
                            </div>

                            <div class="meals-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; margin-bottom: 24px;">
                                <div class="meal-card" style="background: #f8fafc; border-radius: 1rem; overflow: hidden; border: 1px solid #e2e8f0;">
                                    <div class="meal-header" style="background: #1a237e; color: white; padding: 12px 16px; font-weight: 600;">🌅 Café da Manhã</div>
                                    <textarea id="breakfast" class="meal-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" 
                                        placeholder="Alimentos e quantidades..."
                                        ${this.planoSelecionadoHistorico ? 'readonly' : ''}>${this.planoSelecionadoHistorico?.breakfast || this.currentMealPlan?.breakfast || ''}</textarea>
                                </div>
                                <div class="meal-card">
                                    <div class="meal-header" style="background: #1a237e; color: white; padding: 12px 16px; font-weight: 600;">🍎 Lanche Manhã</div>
                                    <textarea id="morningSnack" class="meal-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" 
                                        placeholder="Alimentos e quantidades..."
                                        ${this.planoSelecionadoHistorico ? 'readonly' : ''}>${this.planoSelecionadoHistorico?.morningSnack || this.currentMealPlan?.morningSnack || ''}</textarea>
                                </div>
                                <div class="meal-card">
                                    <div class="meal-header" style="background: #1a237e; color: white; padding: 12px 16px; font-weight: 600;">🍽️ Almoço</div>
                                    <textarea id="lunch" class="meal-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" 
                                        placeholder="Alimentos e quantidades..."
                                        ${this.planoSelecionadoHistorico ? 'readonly' : ''}>${this.planoSelecionadoHistorico?.lunch || this.currentMealPlan?.lunch || ''}</textarea>
                                </div>
                                <div class="meal-card">
                                    <div class="meal-header" style="background: #1a237e; color: white; padding: 12px 16px; font-weight: 600;">🍌 Lanche Tarde</div>
                                    <textarea id="afternoonSnack" class="meal-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" 
                                        placeholder="Alimentos e quantidades..."
                                        ${this.planoSelecionadoHistorico ? 'readonly' : ''}>${this.planoSelecionadoHistorico?.afternoonSnack || this.currentMealPlan?.afternoonSnack || ''}</textarea>
                                </div>
                                <div class="meal-card">
                                    <div class="meal-header" style="background: #1a237e; color: white; padding: 12px 16px; font-weight: 600;">🌙 Jantar</div>
                                    <textarea id="dinner" class="meal-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" 
                                        placeholder="Alimentos e quantidades..."
                                        ${this.planoSelecionadoHistorico ? 'readonly' : ''}>${this.planoSelecionadoHistorico?.dinner || this.currentMealPlan?.dinner || ''}</textarea>
                                </div>
                                <div class="meal-card">
                                    <div class="meal-header" style="background: #1a237e; color: white; padding: 12px 16px; font-weight: 600;">⭐ Ceia</div>
                                    <textarea id="supper" class="meal-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" 
                                        placeholder="Alimentos e quantidades..."
                                        ${this.planoSelecionadoHistorico ? 'readonly' : ''}>${this.planoSelecionadoHistorico?.supper || this.currentMealPlan?.supper || ''}</textarea>
                                </div>
                            </div>

                            <div class="additional-info" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px;">
                                <div class="info-group" style="background: #f8fafc; border-radius: 1rem; overflow: hidden;">
                                    <label style="display: block; background: #1a237e; color: white; padding: 12px 16px; font-weight: 600; margin: 0;">📌 Orientações Gerais</label>
                                    <textarea id="guidelines" class="info-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" 
                                        placeholder="Hidratação, horários, etc..."
                                        ${this.planoSelecionadoHistorico ? 'readonly' : ''}>${this.planoSelecionadoHistorico?.guidelines || this.currentMealPlan?.guidelines || ''}</textarea>
                                </div>
                                <div class="info-group" style="background: #f8fafc; border-radius: 1rem; overflow: hidden;">
                                    <label style="display: block; background: #1a237e; color: white; padding: 12px 16px; font-weight: 600; margin: 0;">⚠️ Restrições Alimentares</label>
                                    <textarea id="restrictions" class="info-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" 
                                        placeholder="Alergias, intolerâncias..."
                                        ${this.planoSelecionadoHistorico ? 'readonly' : ''}>${this.planoSelecionadoHistorico?.restrictions || this.currentMealPlan?.restrictions || ''}</textarea>
                                </div>
                                <div class="info-group" style="background: #f8fafc; border-radius: 1rem; overflow: hidden;">
                                    <label style="display: block; background: #1a237e; color: white; padding: 12px 16px; font-weight: 600; margin: 0;">🎯 Objetivos</label>
                                    <textarea id="goals" class="info-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" 
                                        placeholder="Metas..."
                                        ${this.planoSelecionadoHistorico ? 'readonly' : ''}>${this.planoSelecionadoHistorico?.goals || this.currentMealPlan?.goals || ''}</textarea>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div class="empty-state" style="text-align: center; padding: 60px; background: white; border-radius: 1rem;">
                            <span class="empty-icon" style="font-size: 48px; opacity: 0.5;">👆</span>
                            <h3 style="margin-top: 16px;">Selecione um paciente</h3>
                            <p style="color: #64748b;">Escolha um paciente para criar ou editar o plano alimentar</p>
                        </div>
                    `}
                </div>

                ${this.selectedPaciente && !this.planoSelecionadoHistorico ? `
                    <div style="position: fixed; bottom: 30px; right: 30px; z-index: 100;">
                        <button id="savePlanBtn" class="btn-primary btn-expand">
                            <span>💾</span>
                            <span class="btn-text">Salvar Plano Alimentar</span>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderHistoricoHTML() {
        if (!this.historicoPlanos || this.historicoPlanos.length === 0) {
            return `
                <div class="card" style="background: white; border-radius: 1rem; padding: 40px; text-align: center;">
                    <span style="font-size: 48px;">📋</span>
                    <h4 style="margin-top: 16px; color: #64748b;">Nenhum histórico encontrado</h4>
                    <p style="color: #94a3b8;">Os planos anteriores deste paciente aparecerão aqui</p>
                </div>
            `;
        }

        return `
            <div class="card" style="background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: white; padding: 20px;">
                    <h4 style="margin: 0;">
                        📋 Histórico de Planos Alimentares
                        <span style="font-size: 14px; opacity: 0.9; margin-left: 10px;">
                            (${this.historicoPlanos.length} versões)
                        </span>
                    </h4>
                </div>
                
                <div style="padding: 20px;">
                    <!-- Estatísticas -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 25px;">
                        <div style="background: #f0f9ff; padding: 15px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #0ea5e9;">${this.historicoPlanos.length}</div>
                            <div style="color: #64748b; font-size: 14px;">Total de Versões</div>
                        </div>
                        <div style="background: #f0fdf4; padding: 15px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #22c55e;">v${this.historicoPlanos[0]?.versao || 1}</div>
                            <div style="color: #64748b; font-size: 14px;">Versão Atual</div>
                        </div>
                        <div style="background: #fefce8; padding: 15px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 14px; font-weight: bold; color: #eab308;">
                                ${this.formatarData(this.historicoPlanos[0]?.data_criacao)}
                            </div>
                            <div style="color: #64748b; font-size: 14px;">Última Atualização</div>
                        </div>
                    </div>

                    <!-- Timeline -->
                    <div style="position: relative; padding-left: 30px;">
                        <div style="position: absolute; left: 8px; top: 0; bottom: 0; width: 2px; background: #e2e8f0;"></div>
                        
                        ${this.historicoPlanos.map((plano, index) => `
                            <div style="position: relative; margin-bottom: 25px;">
                                <div style="
                                    position: absolute; 
                                    left: -26px; 
                                    top: 10px; 
                                    width: 12px; 
                                    height: 12px; 
                                    border-radius: 50%; 
                                    background: ${index === 0 ? '#22c55e' : '#0ea5e9'};
                                    border: 3px solid white;
                                    box-shadow: 0 0 0 2px ${index === 0 ? '#22c55e' : '#0ea5e9'};
                                "></div>
                                
                                <div style="
                                    background: ${index === 0 ? '#f0fdf4' : '#f8fafc'}; 
                                    border: 1px solid ${index === 0 ? '#bbf7d0' : '#e2e8f0'}; 
                                    border-radius: 10px; 
                                    padding: 15px;
                                    ${index === 0 ? 'border-left: 4px solid #22c55e;' : ''}
                                ">
                                    <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 10px;">
                                        <div>
                                            <h5 style="margin: 0; color: #1a237e;">
                                                Versão ${plano.versao || index + 1}
                                                ${index === 0 ? '<span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px;">ATUAL</span>' : ''}
                                            </h5>
                                            <small style="color: #64748b;">
                                                📅 ${this.formatarData(plano.data_criacao)}
                                                ${plano.data_atualizacao ? ` | Atualizado: ${this.formatarData(plano.data_atualizacao)}` : ''}
                                            </small>
                                        </div>
                                        <div style="display: flex; gap: 8px;">
                                            <button onclick="window.planoAlimentarInstance.visualizarPlanoHistorico('${plano.id}')" 
                                                    style="padding: 6px 12px; background: #0ea5e9; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                                                👁️ Ver
                                            </button>
                                            <button onclick="window.planoAlimentarInstance.carregarPlanoParaEdicao('${plano.id}')" 
                                                    style="padding: 6px 12px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                                                📝 Editar
                                            </button>
                                            <button onclick="window.planoAlimentarInstance.exportarPlano('${plano.id}')" 
                                                    style="padding: 6px 12px; background: #22c55e; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                                                📥 Exportar
                                            </button>
                                        </div>
                                    </div>
                                    
                                    ${plano.goals ? `
                                        <div style="margin-top: 10px; padding: 8px; background: white; border-radius: 6px;">
                                            <strong>🎯 Objetivos:</strong> ${plano.goals}
                                        </div>
                                    ` : ''}
                                    
                                    ${index < this.historicoPlanos.length - 1 ? `
                                        <div style="margin-top: 10px; font-size: 13px; color: #64748b;">
                                            🔄 ${this.compararPlanos(this.historicoPlanos[index + 1], plano)}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
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
                    this.planoSelecionadoHistorico = null;
                    this.mostrarHistorico = false;
                    await this.loadMealPlan();
                    await this.loadHistoricoPlanos();
                    await this.render();
                } else {
                    this.selectedPaciente = null;
                    this.historicoPlanos = [];
                    this.planoSelecionadoHistorico = null;
                    this.mostrarHistorico = false;
                    await this.render();
                }
            });
        }

        const toggleHistoricoBtn = document.getElementById('toggleHistoricoBtn');
        if (toggleHistoricoBtn) {
            toggleHistoricoBtn.addEventListener('click', () => {
                this.mostrarHistorico = !this.mostrarHistorico;
                this.planoSelecionadoHistorico = null;
                this.render();
            });
        }

        const savePlanBtn = document.getElementById('savePlanBtn');
        if (savePlanBtn) savePlanBtn.addEventListener('click', () => this.saveMealPlan());

        // Expor instância globalmente para botões inline
        window.planoAlimentarInstance = this;
    }

    async loadMealPlan() {
        if (!this.selectedPaciente) return;
        
        try {
            console.log('🔍 Buscando plano alimentar atual para:', this.selectedPaciente.login);
            
            const plansRef = collection(db, 'planos_alimentares');
            const q = query(
                plansRef, 
                where('paciente_login', '==', this.selectedPaciente.login),
                where('status', '==', 'ativo'),
                limit(1)
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                this.currentMealPlan = { id: docSnap.id, ...docSnap.data() };
                console.log('✅ Plano atual encontrado');
            } else {
                this.currentMealPlan = null;
                console.log('📝 Nenhum plano ativo encontrado');
            }
        } catch (error) {
            console.error("Erro ao carregar plano:", error);
            this.currentMealPlan = null;
        }
    }

    async loadHistoricoPlanos() {
        if (!this.selectedPaciente) return;
        
        try {
            console.log('🔍 Buscando histórico de planos para:', this.selectedPaciente.login);
            
            const historicoRef = collection(db, 'historico_planos_alimentares');
            const q = query(
                historicoRef,
                where('paciente_login', '==', this.selectedPaciente.login),
                orderBy('versao', 'desc')
            );
            const querySnapshot = await getDocs(q);
            
            this.historicoPlanos = [];
            querySnapshot.forEach((doc) => {
                this.historicoPlanos.push({ id: doc.id, ...doc.data() });
            });
            
            console.log(`✅ ${this.historicoPlanos.length} versões encontradas no histórico`);
        } catch (error) {
            console.error("Erro ao carregar histórico:", error);
            this.historicoPlanos = [];
        }
    }

    async saveMealPlan() {
        if (!this.selectedPaciente) {
            alert('❌ Selecione um paciente primeiro!');
            return;
        }

        try {
            const mealPlanData = {
                paciente_login: this.selectedPaciente.login,
                paciente_nome: this.selectedPaciente.nome,
                profissional: this.userInfo.nome,
                profissional_login: this.userInfo.login,
                data_atualizacao: new Date().toISOString(),
                data_criacao: this.currentMealPlan?.data_criacao || new Date().toISOString(),
                versao: (this.currentMealPlan?.versao || 0) + 1,
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

            // 1. Salvar no histórico (sempre cria nova versão)
            const historicoRef = collection(db, 'historico_planos_alimentares');
            const docRef = await addDoc(historicoRef, {
                ...mealPlanData,
                tipo: 'historico'
            });
            console.log('📚 Versão salva no histórico:', docRef.id);

            // 2. Atualizar ou criar plano ativo
            const plansRef = collection(db, 'planos_alimentares');
            
            if (this.currentMealPlan?.id) {
                // Marcar plano anterior como inativo
                const oldPlanDoc = doc(db, 'planos_alimentares', this.currentMealPlan.id);
                await updateDoc(oldPlanDoc, { status: 'inativo' });
                
                // Criar novo plano ativo
                await addDoc(plansRef, {
                    ...mealPlanData,
                    tipo: 'ativo'
                });
            } else {
                // Primeiro plano
                await addDoc(plansRef, {
                    ...mealPlanData,
                    tipo: 'ativo'
                });
            }

            alert(`✅ Plano alimentar versão ${mealPlanData.versao} salvo com sucesso!`);
            
            // Recarregar dados
            await this.loadMealPlan();
            await this.loadHistoricoPlanos();
            this.mostrarHistorico = true;
            await this.render();
            
        } catch (error) {
            console.error("Erro ao salvar plano:", error);
            alert('❌ Erro ao salvar: ' + error.message);
        }
    }

    async visualizarPlanoHistorico(planoId) {
        const plano = this.historicoPlanos.find(p => p.id === planoId);
        if (plano) {
            this.planoSelecionadoHistorico = plano;
            await this.render();
            
            // Scroll para o plano
            document.getElementById('mealPlanContainer')?.scrollIntoView({ behavior: 'smooth' });
        }
    }

    async carregarPlanoParaEdicao(planoId) {
        const plano = this.historicoPlanos.find(p => p.id === planoId);
        if (plano && confirm(`Carregar versão ${plano.versao} para edição?\n\nAo salvar, uma nova versão será criada.`)) {
            this.planoSelecionadoHistorico = null;
            this.mostrarHistorico = false;
            this.currentMealPlan = { ...plano };
            await this.render();
            
            document.getElementById('mealPlanContainer')?.scrollIntoView({ behavior: 'smooth' });
        }
    }

    voltarParaEdicao() {
        this.planoSelecionadoHistorico = null;
        this.render();
    }

    exportarPlano(planoId) {
        const plano = this.historicoPlanos.find(p => p.id === planoId);
        if (!plano) return;

        let conteudo = `PLANO ALIMENTAR - VERSÃO ${plano.versao}\n`;
        conteudo += `${'='.repeat(50)}\n`;
        conteudo += `Paciente: ${plano.paciente_nome}\n`;
        conteudo += `Profissional: ${plano.profissional}\n`;
        conteudo += `Data: ${this.formatarData(plano.data_criacao)}\n\n`;
        
        conteudo += `REFEIÇÕES:\n${'-'.repeat(50)}\n`;
        conteudo += `🌅 Café da Manhã:\n${plano.breakfast || 'Não definido'}\n\n`;
        conteudo += `🍎 Lanche Manhã:\n${plano.morningSnack || 'Não definido'}\n\n`;
        conteudo += `🍽️ Almoço:\n${plano.lunch || 'Não definido'}\n\n`;
        conteudo += `🍌 Lanche Tarde:\n${plano.afternoonSnack || 'Não definido'}\n\n`;
        conteudo += `🌙 Jantar:\n${plano.dinner || 'Não definido'}\n\n`;
        conteudo += `⭐ Ceia:\n${plano.supper || 'Não definido'}\n\n`;
        
        conteudo += `ORIENTAÇÕES:\n${'-'.repeat(50)}\n`;
        conteudo += `📌 Gerais: ${plano.guidelines || 'Não definido'}\n`;
        conteudo += `⚠️ Restrições: ${plano.restrictions || 'Não definido'}\n`;
        conteudo += `🎯 Objetivos: ${plano.goals || 'Não definido'}\n`;

        const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `plano_alimentar_v${plano.versao}_${plano.paciente_nome.toLowerCase().replace(/\s+/g, '_')}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    }

    formatarData(dataString) {
        if (!dataString) return '--';
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

    compararPlanos(planoAntigo, planoNovo) {
        const mudancas = [];
        
        if (!planoAntigo || !planoNovo) return 'Versão inicial do plano';
        
        const campos = [
            { key: 'breakfast', nome: 'Café da Manhã' },
            { key: 'morningSnack', nome: 'Lanche da Manhã' },
            { key: 'lunch', nome: 'Almoço' },
            { key: 'afternoonSnack', nome: 'Lanche da Tarde' },
            { key: 'dinner', nome: 'Jantar' },
            { key: 'supper', nome: 'Ceia' },
            { key: 'guidelines', nome: 'Orientações' },
            { key: 'restrictions', nome: 'Restrições' },
            { key: 'goals', nome: 'Objetivos' }
        ];
        
        campos.forEach(campo => {
            if (planoAntigo[campo.key] !== planoNovo[campo.key]) {
                mudancas.push(campo.nome);
            }
        });
        
        return mudancas.length > 0 
            ? `Alterações em: ${mudancas.join(', ')}` 
            : 'Ajustes gerais no plano';
    }
}
