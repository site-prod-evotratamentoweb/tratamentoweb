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

export class CalculoEnergeticoNutricionista {
    constructor(userInfo, pacientesList) {
        this.userInfo = userInfo;
        this.funcoes = FuncoesCompartilhadas;
        this.pacientesList = pacientesList || [];
        this.selectedPaciente = null;
        this.currentCalculo = null;
        this.menu = null;
        this.navegador = criarNavegador(userInfo, this.pacientesList);
    }

    render() {
        const app = document.getElementById('app');
        app.innerHTML = this.renderHTML();
        
        this.navegador.pacientesList = this.pacientesList;
        
        this.menu = new MenuProfissional(this.userInfo, (module) => this.navegador.navegarPara(module), 'calculo_energetico');
        const menuHtml = this.menu.render();
        const menuContainer = document.getElementById('menuContainer');
        if (menuContainer) {
            menuContainer.innerHTML = menuHtml;
        }
        this.menu.attachEvents();
        
        this.attachEvents();
        if (this.selectedPaciente) {
            this.loadCalculo();
            this.carregarDadosPaciente();
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
                                <span class="info-label">Idade</span>
                                <span class="info-value" id="infoIdade">${this.selectedPaciente ? this.funcoes.calcularIdade(this.selectedPaciente.dataNascimento) : '--'} anos</span>
                            </div>
                            <div class="info-card">
                                <span class="info-label">Sexo</span>
                                <span class="info-value" id="infoSexo">${this.selectedPaciente?.sexo || '--'}</span>
                            </div>
                            <div class="info-card">
                                <span class="info-label">Peso (kg)</span>
                                <span class="info-value" id="infoPeso">--</span>
                            </div>
                            <div class="info-card">
                                <span class="info-label">Altura (m)</span>
                                <span class="info-value" id="infoAltura">--</span>
                            </div>
                        </div>
                    </div>

                    ${this.selectedPaciente ? `
                        <div class="calculo-container">
                            <div class="evaluation-section" style="margin-bottom: 24px;">
                                <div class="section-header">
                                    <h3>📏 Dados Antropométricos</h3>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                                    <div class="form-field">
                                        <label>📏 Peso Atual (kg)</label>
                                        <input type="number" id="peso" step="0.1" class="form-control" value="${this.currentCalculo?.peso || ''}" placeholder="Ex: 70.5" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>📐 Altura (m)</label>
                                        <input type="number" id="altura" step="0.01" class="form-control" value="${this.currentCalculo?.altura || ''}" placeholder="Ex: 1.75" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>🎂 Idade (anos)</label>
                                        <input type="number" id="idade" step="1" class="form-control" readonly style="background: #f1f5f9; padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>⚥ Sexo</label>
                                        <select id="sexo" class="form-control" style="padding: 12px 14px;">
                                            <option value="masculino" ${this.currentCalculo?.sexo === 'masculino' ? 'selected' : ''}>Masculino</option>
                                            <option value="feminino" ${this.currentCalculo?.sexo === 'feminino' ? 'selected' : ''}>Feminino</option>
                                        </select>
                                    </div>
                                    <div class="form-field">
                                        <label>📊 Fator de Atividade</label>
                                        <select id="fator_atividade" class="form-control" style="padding: 12px 14px;">
                                            <option value="1.2" ${this.currentCalculo?.fator_atividade === 1.2 ? 'selected' : ''}>Sedentário (1.2)</option>
                                            <option value="1.375" ${this.currentCalculo?.fator_atividade === 1.375 ? 'selected' : ''}>Leve (1.375)</option>
                                            <option value="1.55" ${this.currentCalculo?.fator_atividade === 1.55 ? 'selected' : ''}>Moderado (1.55)</option>
                                            <option value="1.725" ${this.currentCalculo?.fator_atividade === 1.725 ? 'selected' : ''}>Intenso (1.725)</option>
                                            <option value="1.9" ${this.currentCalculo?.fator_atividade === 1.9 ? 'selected' : ''}>Muito Intenso (1.9)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="evaluation-section" style="margin-bottom: 24px;">
                                <div class="section-header">
                                    <h3>🧮 Fórmula de Cálculo do GEB/TMB</h3>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                                    <div class="form-field">
                                        <label>📐 Fórmula</label>
                                        <select id="formula" class="form-control" style="padding: 12px 14px;">
                                            <option value="harris_benedict" ${this.currentCalculo?.formula === 'harris_benedict' ? 'selected' : ''}>Harris-Benedict (1919)</option>
                                            <option value="mifflin" ${this.currentCalculo?.formula === 'mifflin' ? 'selected' : ''}>Mifflin-St Jeor (1990)</option>
                                            <option value="cunningham" ${this.currentCalculo?.formula === 'cunningham' ? 'selected' : ''}>Cunningham (1980) - Massa Magra</option>
                                            <option value="fao_who" ${this.currentCalculo?.formula === 'fao_who' ? 'selected' : ''}>FAO/WHO/UNU (1985)</option>
                                            <option value="katch_mcardle" ${this.currentCalculo?.formula === 'katch_mcardle' ? 'selected' : ''}>Katch-McArdle</option>
                                        </select>
                                    </div>
                                    <div class="form-field">
                                        <label>💪 Massa Magra (kg) - p/ Cunningham/Katch</label>
                                        <input type="number" id="massa_magra" step="0.1" class="form-control" value="${this.currentCalculo?.massa_magra || ''}" placeholder="Opcional" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>📊 GEB/TMB Calculado</label>
                                        <input type="text" id="geb_calculado" class="form-control" readonly style="background: #f1f5f9; padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>⚡ GET/VET Calculado</label>
                                        <input type="text" id="get_calculado" class="form-control" readonly style="background: #f1f5f9; padding: 12px 14px;">
                                    </div>
                                </div>
                            </div>

                            <div class="evaluation-section" style="margin-bottom: 24px;">
                                <div class="section-header">
                                    <h3>🎯 Objetivo e Adicional Energético</h3>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                                    <div class="form-field">
                                        <label>🎯 Objetivo</label>
                                        <select id="objetivo" class="form-control" style="padding: 12px 14px;">
                                            <option value="hipertrofia" ${this.currentCalculo?.objetivo === 'hipertrofia' ? 'selected' : ''}>Hipertrofia Muscular</option>
                                            <option value="emagrecimento" ${this.currentCalculo?.objetivo === 'emagrecimento' ? 'selected' : ''}>Emagrecimento</option>
                                            <option value="manutencao" ${this.currentCalculo?.objetivo === 'manutencao' ? 'selected' : ''}>Manutenção</option>
                                            <option value="ganho_peso" ${this.currentCalculo?.objetivo === 'ganho_peso' ? 'selected' : ''}>Ganho de Peso</option>
                                        </select>
                                    </div>
                                    <div class="form-field">
                                        <label>➕ Adicional Energético (kcal/dia)</label>
                                        <input type="number" id="adicional_energetico" step="50" class="form-control" value="${this.currentCalculo?.adicional_energetico || '0'}" placeholder="Ex: 300" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>➖ Déficit Energético (kcal/dia)</label>
                                        <input type="number" id="deficit_energetico" step="50" class="form-control" value="${this.currentCalculo?.deficit_energetico || '0'}" placeholder="Ex: 500" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>⚡ VET Final Ajustado</label>
                                        <input type="text" id="vet_ajustado" class="form-control" readonly style="background: #f1f5f9; padding: 12px 14px; font-weight: bold; color: #f97316;">
                                    </div>
                                </div>
                            </div>

                            <div class="evaluation-section" style="margin-bottom: 24px;">
                                <div class="section-header">
                                    <h3>🥩 Distribuição de Macronutrientes</h3>
                                </div>
                                
                                <div style="background: #f0fdf4; border-radius: 1rem; padding: 20px; margin-bottom: 20px;">
                                    <h4 style="color: #166534; margin-bottom: 16px;">🥩 PROTEÍNAS</h4>
                                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                                        <div class="form-field">
                                            <label>📊 Método de Cálculo</label>
                                            <select id="ptn_metodo" class="form-control" style="padding: 12px 14px;">
                                                <option value="g_kg" ${this.currentCalculo?.ptn_metodo === 'g_kg' ? 'selected' : ''}>g/kg de peso</option>
                                                <option value="percentual" ${this.currentCalculo?.ptn_metodo === 'percentual' ? 'selected' : ''}>% do VET</option>
                                            </select>
                                        </div>
                                        <div class="form-field">
                                            <label>🥩 Proteína (g/kg/dia)</label>
                                            <input type="number" id="ptn_g_kg" step="0.1" class="form-control" value="${this.currentCalculo?.ptn_g_kg || '1.6'}" placeholder="Hipertrofia: 1.6-2.2" style="padding: 12px 14px;">
                                            <small style="color: #666;">Hipertrofia: 1.6-2.2 g/kg | Manutenção: 0.8-1.2 g/kg</small>
                                        </div>
                                        <div class="form-field">
                                            <label>🥩 Proteína (g/dia)</label>
                                            <input type="text" id="ptn_gramas" class="form-control" readonly style="background: #f1f5f9; padding: 12px 14px;">
                                        </div>
                                        <div class="form-field">
                                            <label>🥩 Proteína (kcal)</label>
                                            <input type="text" id="ptn_kcal" class="form-control" readonly style="background: #f1f5f9; padding: 12px 14px;">
                                        </div>
                                        <div class="form-field">
                                            <label>🥩 % do VET</label>
                                            <input type="text" id="ptn_percentual" class="form-control" readonly style="background: #f1f5f9; padding: 12px 14px;">
                                        </div>
                                    </div>
                                </div>

                                <div style="background: #fef3c7; border-radius: 1rem; padding: 20px; margin-bottom: 20px;">
                                    <h4 style="color: #92400e; margin-bottom: 16px;">🍚 CARBOIDRATOS</h4>
                                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                                        <div class="form-field">
                                            <label>📊 Método de Cálculo</label>
                                            <select id="cho_metodo" class="form-control" style="padding: 12px 14px;">
                                                <option value="g_kg" ${this.currentCalculo?.cho_metodo === 'g_kg' ? 'selected' : ''}>g/kg de peso</option>
                                                <option value="percentual" ${this.currentCalculo?.cho_metodo === 'percentual' ? 'selected' : ''}>% do VET</option>
                                            </select>
                                        </div>
                                        <div class="form-field">
                                            <label>🍚 Carboidrato (g/kg/dia)</label>
                                            <input type="number" id="cho_g_kg" step="0.5" class="form-control" value="${this.currentCalculo?.cho_g_kg || '5'}" placeholder="Hipertrofia: 4-7 g/kg" style="padding: 12px 14px;">
                                            <small style="color: #666;">Hipertrofia: 4-7 g/kg | Manutenção: 3-5 g/kg</small>
                                        </div>
                                        <div class="form-field">
                                            <label>🍚 Carboidrato (g/dia)</label>
                                            <input type="text" id="cho_gramas" class="form-control" readonly style="background: #f1f5f9; padding: 12px 14px;">
                                        </div>
                                        <div class="form-field">
                                            <label>🍚 Carboidrato (kcal)</label>
                                            <input type="text" id="cho_kcal" class="form-control" readonly style="background: #f1f5f9; padding: 12px 14px;">
                                        </div>
                                        <div class="form-field">
                                            <label>🍚 % do VET</label>
                                            <input type="text" id="cho_percentual" class="form-control" readonly style="background: #f1f5f9; padding: 12px 14px;">
                                        </div>
                                    </div>
                                </div>

                                <div style="background: #fee2e2; border-radius: 1rem; padding: 20px; margin-bottom: 20px;">
                                    <h4 style="color: #991b1b; margin-bottom: 16px;">🧈 LIPÍDIOS (GORDURAS)</h4>
                                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                                        <div class="form-field">
                                            <label>📊 Método de Cálculo</label>
                                            <select id="lip_metodo" class="form-control" style="padding: 12px 14px;">
                                                <option value="g_kg" ${this.currentCalculo?.lip_metodo === 'g_kg' ? 'selected' : ''}>g/kg de peso</option>
                                                <option value="percentual" ${this.currentCalculo?.lip_metodo === 'percentual' ? 'selected' : ''}>% do VET</option>
                                            </select>
                                        </div>
                                        <div class="form-field">
                                            <label>🧈 Lipídio (g/kg/dia)</label>
                                            <input type="number" id="lip_g_kg" step="0.1" class="form-control" value="${this.currentCalculo?.lip_g_kg || '0.8'}" placeholder="Hipertrofia: 0.8-1.2 g/kg" style="padding: 12px 14px;">
                                            <small style="color: #666;">Hipertrofia: 0.8-1.2 g/kg | Mínimo: 0.5-0.7 g/kg</small>
                                        </div>
                                        <div class="form-field">
                                            <label>🧈 Lipídio (g/dia)</label>
                                            <input type="text" id="lip_gramas" class="form-control" readonly style="background: #f1f5f9; padding: 12px 14px;">
                                        </div>
                                        <div class="form-field">
                                            <label>🧈 Lipídio (kcal)</label>
                                            <input type="text" id="lip_kcal" class="form-control" readonly style="background: #f1f5f9; padding: 12px 14px;">
                                        </div>
                                        <div class="form-field">
                                            <label>🧈 % do VET</label>
                                            <input type="text" id="lip_percentual" class="form-control" readonly style="background: #f1f5f9; padding: 12px 14px;">
                                        </div>
                                    </div>
                                </div>

                                <div style="background: linear-gradient(135deg, #1a237e 0%, #0f1a5c 100%); border-radius: 1rem; padding: 20px; color: white;">
                                    <h4 style="margin-bottom: 16px;">📊 RESUMO DA DIETA</h4>
                                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                                        <div><strong>⚡ VET Total:</strong> <span id="resumo_vet">--</span> kcal</div>
                                        <div><strong>🥩 Proteína:</strong> <span id="resumo_ptn_g">--</span> g (<span id="resumo_ptn_perc">--</span>%)</div>
                                        <div><strong>🍚 Carboidrato:</strong> <span id="resumo_cho_g">--</span> g (<span id="resumo_cho_perc">--</span>%)</div>
                                        <div><strong>🧈 Lipídio:</strong> <span id="resumo_lip_g">--</span> g (<span id="resumo_lip_perc">--</span>%)</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div class="empty-state" style="text-align: center; padding: 60px; background: white; border-radius: 1rem;">
                            <span class="empty-icon" style="font-size: 48px; opacity: 0.5;">🧮</span>
                            <h3 style="margin-top: 16px;">Selecione um paciente</h3>
                            <p style="color: #64748b;">Escolha um paciente para realizar o cálculo energético</p>
                        </div>
                    `}
                </div>

                <div style="position: fixed; bottom: 30px; right: 30px; z-index: 100;">
                    <button id="saveCalculoBtn" class="btn-primary btn-expand">
                        <span>💾</span>
                        <span class="btn-text">Salvar Cálculo</span>
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
                    this.carregarDadosPaciente();
                } else {
                    this.selectedPaciente = null;
                    await this.render();
                }
            });
        }

        const inputs = ['peso', 'altura', 'fator_atividade', 'formula', 'massa_magra', 
                        'objetivo', 'adicional_energetico', 'deficit_energetico',
                        'ptn_g_kg', 'ptn_metodo', 'cho_g_kg', 'cho_metodo', 'lip_g_kg', 'lip_metodo'];
        
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.calcularTudo());
        });

        const selects = ['sexo', 'formula', 'fator_atividade', 'objetivo', 'ptn_metodo', 'cho_metodo', 'lip_metodo'];
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => this.calcularTudo());
        });

        const saveBtn = document.getElementById('saveCalculoBtn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveCalculo());
    }

    carregarDadosPaciente() {
        if (!this.selectedPaciente) return;
        
        const idade = this.funcoes.calcularIdade(this.selectedPaciente.dataNascimento);
        const sexo = this.selectedPaciente.sexo || 'masculino';
        
        const idadeInput = document.getElementById('idade');
        const sexoSelect = document.getElementById('sexo');
        
        if (idadeInput) idadeInput.value = idade;
        if (sexoSelect) sexoSelect.value = sexo;
    }

    calcularGEB() {
        const peso = parseFloat(document.getElementById('peso')?.value) || 0;
        const altura = parseFloat(document.getElementById('altura')?.value) || 0;
        const idade = parseFloat(document.getElementById('idade')?.value) || 30;
        const sexo = document.getElementById('sexo')?.value || 'masculino';
        const formula = document.getElementById('formula')?.value || 'harris_benedict';
        const massaMagra = parseFloat(document.getElementById('massa_magra')?.value) || 0;
        
        let geb = 0;
        
        switch(formula) {
            case 'harris_benedict':
                if (sexo === 'masculino') {
                    geb = 66.47 + (13.75 * peso) + (5.003 * altura * 100) - (6.755 * idade);
                } else {
                    geb = 655.1 + (9.563 * peso) + (1.85 * altura * 100) - (4.676 * idade);
                }
                break;
                
            case 'mifflin':
                if (sexo === 'masculino') {
                    geb = (10 * peso) + (6.25 * altura * 100) - (5 * idade) + 5;
                } else {
                    geb = (10 * peso) + (6.25 * altura * 100) - (5 * idade) - 161;
                }
                break;
                
            case 'cunningham':
                if (massaMagra > 0) {
                    geb = 500 + (22 * massaMagra);
                } else {
                    const estimativaMassaMagra = sexo === 'masculino' ? peso * 0.8 : peso * 0.7;
                    geb = 500 + (22 * estimativaMassaMagra);
                }
                break;
                
            case 'fao_who':
                if (sexo === 'masculino') {
                    if (idade <= 18) geb = 17.5 * peso + 651;
                    else if (idade <= 30) geb = 15.3 * peso + 679;
                    else if (idade <= 60) geb = 11.6 * peso + 879;
                    else geb = 13.5 * peso + 487;
                } else {
                    if (idade <= 18) geb = 12.2 * peso + 746;
                    else if (idade <= 30) geb = 14.7 * peso + 496;
                    else if (idade <= 60) geb = 8.7 * peso + 829;
                    else geb = 10.5 * peso + 596;
                }
                break;
                
            case 'katch_mcardle':
                if (massaMagra > 0) {
                    geb = 370 + (21.6 * massaMagra);
                } else {
                    const estimativaMassaMagra = sexo === 'masculino' ? peso * 0.8 : peso * 0.7;
                    geb = 370 + (21.6 * estimativaMassaMagra);
                }
                break;
        }
        
        return Math.round(geb);
    }

    calcularGET() {
        const geb = this.calcularGEB();
        const fatorAtividade = parseFloat(document.getElementById('fator_atividade')?.value) || 1.2;
        return Math.round(geb * fatorAtividade);
    }

    calcularVETAjustado() {
        const get = this.calcularGET();
        const adicional = parseFloat(document.getElementById('adicional_energetico')?.value) || 0;
        const deficit = parseFloat(document.getElementById('deficit_energetico')?.value) || 0;
        const objetivo = document.getElementById('objetivo')?.value || 'manutencao';
        
        let ajuste = 0;
        
        switch(objetivo) {
            case 'hipertrofia':
                ajuste = adicional > 0 ? adicional : 300;
                break;
            case 'emagrecimento':
                ajuste = deficit > 0 ? -deficit : -500;
                break;
            case 'ganho_peso':
                ajuste = adicional > 0 ? adicional : 500;
                break;
            default:
                ajuste = 0;
        }
        
        return Math.round(get + ajuste);
    }

    calcularMacros() {
        const vetAjustado = this.calcularVETAjustado();
        const peso = parseFloat(document.getElementById('peso')?.value) || 0;
        const ptnMetodo = document.getElementById('ptn_metodo')?.value || 'g_kg';
        const ptnGkg = parseFloat(document.getElementById('ptn_g_kg')?.value) || 1.6;
        const choMetodo = document.getElementById('cho_metodo')?.value || 'g_kg';
        const choGkg = parseFloat(document.getElementById('cho_g_kg')?.value) || 5;
        const lipMetodo = document.getElementById('lip_metodo')?.value || 'g_kg';
        const lipGkg = parseFloat(document.getElementById('lip_g_kg')?.value) || 0.8;
        
        let ptnGramas = 0, ptnKcal = 0, ptnPercentual = 0;
        let choGramas = 0, choKcal = 0, choPercentual = 0;
        let lipGramas = 0, lipKcal = 0, lipPercentual = 0;
        
        if (ptnMetodo === 'g_kg' && peso > 0) {
            ptnGramas = ptnGkg * peso;
            ptnKcal = ptnGramas * 4;
        } else if (ptnMetodo === 'percentual') {
            ptnPercentual = parseFloat(document.getElementById('ptn_percentual_input')?.value) || 25;
            ptnKcal = (vetAjustado * ptnPercentual) / 100;
            ptnGramas = ptnKcal / 4;
        }
        
        if (choMetodo === 'g_kg' && peso > 0) {
            choGramas = choGkg * peso;
            choKcal = choGramas * 4;
        } else if (choMetodo === 'percentual') {
            choPercentual = parseFloat(document.getElementById('cho_percentual_input')?.value) || 55;
            choKcal = (vetAjustado * choPercentual) / 100;
            choGramas = choKcal / 4;
        }
        
        if (lipMetodo === 'g_kg' && peso > 0) {
            lipGramas = lipGkg * peso;
            lipKcal = lipGramas * 9;
        } else if (lipMetodo === 'percentual') {
            lipPercentual = parseFloat(document.getElementById('lip_percentual_input')?.value) || 20;
            lipKcal = (vetAjustado * lipPercentual) / 100;
            lipGramas = lipKcal / 9;
        }
        
        const totalKcal = ptnKcal + choKcal + lipKcal;
        if (totalKcal > 0) {
            ptnPercentual = Math.round((ptnKcal / vetAjustado) * 100);
            choPercentual = Math.round((choKcal / vetAjustado) * 100);
            lipPercentual = Math.round((lipKcal / vetAjustado) * 100);
            
            const soma = ptnPercentual + choPercentual + lipPercentual;
            if (soma !== 100 && soma > 0) {
                choPercentual += (100 - soma);
            }
        }
        
        return {
            vet: vetAjustado,
            ptn: { gramas: Math.round(ptnGramas), kcal: Math.round(ptnKcal), percentual: ptnPercentual },
            cho: { gramas: Math.round(choGramas), kcal: Math.round(choKcal), percentual: choPercentual },
            lip: { gramas: Math.round(lipGramas), kcal: Math.round(lipKcal), percentual: lipPercentual }
        };
    }

    calcularTudo() {
        const peso = parseFloat(document.getElementById('peso')?.value);
        const altura = parseFloat(document.getElementById('altura')?.value);
        
        if (!peso || !altura) return;
        
        const geb = this.calcularGEB();
        const get = this.calcularGET();
        const vetAjustado = this.calcularVETAjustado();
        const macros = this.calcularMacros();
        
        const gebInput = document.getElementById('geb_calculado');
        const getInput = document.getElementById('get_calculado');
        const vetInput = document.getElementById('vet_ajustado');
        
        if (gebInput) gebInput.value = geb + ' kcal';
        if (getInput) getInput.value = get + ' kcal';
        if (vetInput) vetInput.value = vetAjustado + ' kcal';
        
        const ptnGramas = document.getElementById('ptn_gramas');
        const ptnKcal = document.getElementById('ptn_kcal');
        const ptnPercentual = document.getElementById('ptn_percentual');
        
        if (ptnGramas) ptnGramas.value = macros.ptn.gramas + ' g';
        if (ptnKcal) ptnKcal.value = macros.ptn.kcal + ' kcal';
        if (ptnPercentual) ptnPercentual.value = macros.ptn.percentual + '%';
        
        const choGramas = document.getElementById('cho_gramas');
        const choKcal = document.getElementById('cho_kcal');
        const choPercentual = document.getElementById('cho_percentual');
        
        if (choGramas) choGramas.value = macros.cho.gramas + ' g';
        if (choKcal) choKcal.value = macros.cho.kcal + ' kcal';
        if (choPercentual) choPercentual.value = macros.cho.percentual + '%';
        
        const lipGramas = document.getElementById('lip_gramas');
        const lipKcal = document.getElementById('lip_kcal');
        const lipPercentual = document.getElementById('lip_percentual');
        
        if (lipGramas) lipGramas.value = macros.lip.gramas + ' g';
        if (lipKcal) lipKcal.value = macros.lip.kcal + ' kcal';
        if (lipPercentual) lipPercentual.value = macros.lip.percentual + '%';
        
        const resumoVet = document.getElementById('resumo_vet');
        const resumoPtnG = document.getElementById('resumo_ptn_g');
        const resumoPtnPerc = document.getElementById('resumo_ptn_perc');
        const resumoChoG = document.getElementById('resumo_cho_g');
        const resumoChoPerc = document.getElementById('resumo_cho_perc');
        const resumoLipG = document.getElementById('resumo_lip_g');
        const resumoLipPerc = document.getElementById('resumo_lip_perc');
        
        if (resumoVet) resumoVet.textContent = macros.vet;
        if (resumoPtnG) resumoPtnG.textContent = macros.ptn.gramas;
        if (resumoPtnPerc) resumoPtnPerc.textContent = macros.ptn.percentual;
        if (resumoChoG) resumoChoG.textContent = macros.cho.gramas;
        if (resumoChoPerc) resumoChoPerc.textContent = macros.cho.percentual;
        if (resumoLipG) resumoLipG.textContent = macros.lip.gramas;
        if (resumoLipPerc) resumoLipPerc.textContent = macros.lip.percentual;
    }

    async loadCalculo() {
        if (!this.selectedPaciente) return;
        
        try {
            // ✅ CORRIGIDO: window.db → db
            const calculoRef = collection(db, 'calculos_energeticos');
            const q = query(calculoRef, where('paciente_login', '==', this.selectedPaciente.login));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const docs = querySnapshot.docs;
                docs.sort((a, b) => {
                    const dateA = a.data().data_atualizacao || a.data().data_calculo;
                    const dateB = b.data().data_atualizacao || b.data().data_calculo;
                    return new Date(dateB) - new Date(dateA);
                });
                this.currentCalculo = { id: docs[0].id, ...docs[0].data() };
            } else {
                this.currentCalculo = null;
            }
        } catch (error) {
            console.error("Erro ao carregar cálculo:", error);
            this.currentCalculo = null;
        }
    }

    async saveCalculo() {
        if (!this.selectedPaciente) {
            alert('❌ Selecione um paciente primeiro!');
            return;
        }

        try {
            const macros = this.calcularMacros();
            
            const calculoData = {
                paciente_login: this.selectedPaciente.login,
                paciente_nome: this.selectedPaciente.nome,
                profissional: this.userInfo.nome,
                profissional_login: this.userInfo.login,
                data_calculo: new Date().toISOString().split('T')[0],
                data_atualizacao: new Date().toISOString(),
                
                peso: parseFloat(document.getElementById('peso')?.value) || null,
                altura: parseFloat(document.getElementById('altura')?.value) || null,
                idade: parseInt(document.getElementById('idade')?.value) || null,
                sexo: document.getElementById('sexo')?.value,
                fator_atividade: parseFloat(document.getElementById('fator_atividade')?.value) || 1.2,
                
                formula: document.getElementById('formula')?.value,
                massa_magra: parseFloat(document.getElementById('massa_magra')?.value) || null,
                geb: this.calcularGEB(),
                get: this.calcularGET(),
                
                objetivo: document.getElementById('objetivo')?.value,
                adicional_energetico: parseFloat(document.getElementById('adicional_energetico')?.value) || 0,
                deficit_energetico: parseFloat(document.getElementById('deficit_energetico')?.value) || 0,
                vet_ajustado: macros.vet,
                
                proteinas: {
                    metodo: document.getElementById('ptn_metodo')?.value,
                    g_kg: parseFloat(document.getElementById('ptn_g_kg')?.value) || 1.6,
                    gramas: macros.ptn.gramas,
                    kcal: macros.ptn.kcal,
                    percentual: macros.ptn.percentual
                },
                carboidratos: {
                    metodo: document.getElementById('cho_metodo')?.value,
                    g_kg: parseFloat(document.getElementById('cho_g_kg')?.value) || 5,
                    gramas: macros.cho.gramas,
                    kcal: macros.cho.kcal,
                    percentual: macros.cho.percentual
                },
                lipidios: {
                    metodo: document.getElementById('lip_metodo')?.value,
                    g_kg: parseFloat(document.getElementById('lip_g_kg')?.value) || 0.8,
                    gramas: macros.lip.gramas,
                    kcal: macros.lip.kcal,
                    percentual: macros.lip.percentual
                }
            };

            // ✅ CORRIGIDO: window.db → db
            const calculoRef = collection(db, 'calculos_energeticos');
            
            if (this.currentCalculo?.id) {
                // ✅ CORRIGIDO: window.db → db
                const calculoDoc = doc(db, 'calculos_energeticos', this.currentCalculo.id);
                await updateDoc(calculoDoc, calculoData);
                alert('✅ Cálculo energético atualizado com sucesso!');
            } else {
                await addDoc(calculoRef, calculoData);
                alert('✅ Cálculo energético salvo com sucesso!');
            }
            
            await this.loadCalculo();
        } catch (error) {
            console.error("Erro ao salvar cálculo:", error);
            alert('❌ Erro ao salvar: ' + error.message);
        }
    }
}
