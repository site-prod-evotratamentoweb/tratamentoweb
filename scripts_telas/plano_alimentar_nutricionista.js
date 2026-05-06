// plano_alimentar_nutricionista.js - COMPLETO CORRIGIDO

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
    updateDoc 
} from '../0_firebase_api_config.js';

export class PlanoAlimentarNutricionista {
    constructor(userInfo, pacientesList) {
        this.userInfo = userInfo;
        this.funcoes = FuncoesCompartilhadas;
        this.pacientesList = pacientesList || [];
        this.selectedPaciente = null;
        this.currentMealPlan = null;
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
                        <div class="meal-plan-container">
                            <div class="meals-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; margin-bottom: 24px;">
                                <div class="meal-card" style="background: #f8fafc; border-radius: 1rem; overflow: hidden; border: 1px solid #e2e8f0;">
                                    <div class="meal-header" style="background: #1a237e; color: white; padding: 12px 16px; font-weight: 600;">🌅 Café da Manhã</div>
                                    <textarea id="breakfast" class="meal-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" placeholder="Alimentos e quantidades...">${this.currentMealPlan?.breakfast || ''}</textarea>
                                </div>
                                <div class="meal-card">
                                    <div class="meal-header" style="background: #1a237e; color: white; padding: 12px 16px; font-weight: 600;">🍎 Lanche Manhã</div>
                                    <textarea id="morningSnack" class="meal-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" placeholder="Alimentos e quantidades...">${this.currentMealPlan?.morningSnack || ''}</textarea>
                                </div>
                                <div class="meal-card">
                                    <div class="meal-header" style="background: #1a237e; color: white; padding: 12px 16px; font-weight: 600;">🍽️ Almoço</div>
                                    <textarea id="lunch" class="meal-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" placeholder="Alimentos e quantidades...">${this.currentMealPlan?.lunch || ''}</textarea>
                                </div>
                                <div class="meal-card">
                                    <div class="meal-header" style="background: #1a237e; color: white; padding: 12px 16px; font-weight: 600;">🍌 Lanche Tarde</div>
                                    <textarea id="afternoonSnack" class="meal-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" placeholder="Alimentos e quantidades...">${this.currentMealPlan?.afternoonSnack || ''}</textarea>
                                </div>
                                <div class="meal-card">
                                    <div class="meal-header" style="background: #1a237e; color: white; padding: 12px 16px; font-weight: 600;">🌙 Jantar</div>
                                    <textarea id="dinner" class="meal-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" placeholder="Alimentos e quantidades...">${this.currentMealPlan?.dinner || ''}</textarea>
                                </div>
                                <div class="meal-card">
                                    <div class="meal-header" style="background: #1a237e; color: white; padding: 12px 16px; font-weight: 600;">⭐ Ceia</div>
                                    <textarea id="supper" class="meal-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" placeholder="Alimentos e quantidades...">${this.currentMealPlan?.supper || ''}</textarea>
                                </div>
                            </div>

                            <div class="additional-info" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px;">
                                <div class="info-group" style="background: #f8fafc; border-radius: 1rem; overflow: hidden;">
                                    <label style="display: block; background: #1a237e; color: white; padding: 12px 16px; font-weight: 600; margin: 0;">📌 Orientações Gerais</label>
                                    <textarea id="guidelines" class="info-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" placeholder="Hidratação, horários, etc...">${this.currentMealPlan?.guidelines || ''}</textarea>
                                </div>
                                <div class="info-group" style="background: #f8fafc; border-radius: 1rem; overflow: hidden;">
                                    <label style="display: block; background: #1a237e; color: white; padding: 12px 16px; font-weight: 600; margin: 0;">⚠️ Restrições Alimentares</label>
                                    <textarea id="restrictions" class="info-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" placeholder="Alergias, intolerâncias...">${this.currentMealPlan?.restrictions || ''}</textarea>
                                </div>
                                <div class="info-group" style="background: #f8fafc; border-radius: 1rem; overflow: hidden;">
                                    <label style="display: block; background: #1a237e; color: white; padding: 12px 16px; font-weight: 600; margin: 0;">🎯 Objetivos</label>
                                    <textarea id="goals" class="info-textarea" style="width: 100%; min-height: 120px; padding: 12px; border: none; resize: vertical;" placeholder="Metas...">${this.currentMealPlan?.goals || ''}</textarea>
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

                <div style="position: fixed; bottom: 30px; right: 30px; z-index: 100;">
                    <button id="savePlanBtn" class="btn-primary btn-expand">
                        <span>💾</span>
                        <span class="btn-text">Salvar Plano Alimentar</span>
                    </button>
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
                    await this.render();
                } else {
                    this.selectedPaciente = null;
                    await this.render();
                }
            });
        }

        const savePlanBtn = document.getElementById('savePlanBtn');
        if (savePlanBtn) savePlanBtn.addEventListener('click', () => this.saveMealPlan());
    }

    async loadMealPlan() {
        if (!this.selectedPaciente) return;
        
        try {
            console.log('🔍 Buscando plano alimentar para:', this.selectedPaciente.login);
            
            const plansRef = collection(db, 'planos_alimentares');
            const q = query(plansRef, where('paciente_login', '==', this.selectedPaciente.login));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                this.currentMealPlan = { id: docSnap.id, ...docSnap.data() };
                console.log('✅ Plano encontrado');
            } else {
                this.currentMealPlan = null;
                console.log('📝 Nenhum plano encontrado, criando novo');
            }
        } catch (error) {
            console.error("Erro ao carregar plano:", error);
            this.currentMealPlan = null;
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

            const plansRef = collection(db, 'planos_alimentares');
            
            if (this.currentMealPlan?.id) {
                const planDoc = doc(db, 'planos_alimentares', this.currentMealPlan.id);
                await updateDoc(planDoc, mealPlanData);
                alert('✅ Plano atualizado com sucesso!');
            } else {
                await addDoc(plansRef, mealPlanData);
                alert('✅ Plano criado com sucesso!');
            }
            
            await this.loadMealPlan();
        } catch (error) {
            console.error("Erro ao salvar plano:", error);
            alert('❌ Erro ao salvar: ' + error.message);
        }
    }
}
