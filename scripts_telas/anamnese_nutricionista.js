import { FuncoesCompartilhadas } from './0_home.js';
import { MenuProfissional } from './0_complementos_menu_profissional.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { db, collection, addDoc, getDocs, query, where, doc, updateDoc } from '../0_firebase_api_config.js';

export class AnamneseNutricionista {
    constructor(userInfo, pacientesList) {
        this.userInfo = userInfo;
        this.funcoes = FuncoesCompartilhadas;
        this.pacientesList = pacientesList || [];
        this.selectedPaciente = null;
        this.currentAnamnese = null;
        this.menu = null;
        this.navegador = criarNavegador(userInfo, this.pacientesList);
    }

    render() {
        const app = document.getElementById('app');
        app.innerHTML = this.renderHTML();
        
        // Inicializa o menu e insere no container
        this.menu = new MenuProfissional(this.userInfo, (module) => this.navegador.navegarPara(module), 'anamnese');
        const menuHtml = this.menu.render();
        const menuContainer = document.getElementById('menuContainer');
        if (menuContainer) {
            menuContainer.innerHTML = menuHtml;
        }
        this.menu.attachEvents();
        
        this.attachEvents();
        
        // Atualiza a lista de pacientes no navegador
        this.navegador.pacientesList = this.pacientesList;
        
        if (this.selectedPaciente) {
            this.loadAnamnese();
            this.carregarDadosAntropometricos();
        }
    }

    renderHTML() {
        return `
            <div class="dashboard-container" style="height: 100vh; display: flex; flex-direction: column;">
                <div id="menuContainer"></div>

                <div class="main-content" style="flex: 1; overflow-y: auto; padding: 20px 32px;">
                    <!-- INFORMAÇÕES DO PACIENTE (com seletor dentro) -->
                    <div id="pacienteInfo" class="info-section" style="margin-bottom: 24px;">
                        <!-- SELETOR DE PACIENTE DENTRO DO CARD -->
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
                        <!-- ANAMNESE COMPLETA -->
                        <div class="anamnese-container">
                            <!-- Dados da Consulta -->
                            <div class="evaluation-section" style="margin-bottom: 24px;">
                                <div class="section-header">
                                    <h3>📅 Dados da Consulta</h3>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                                    <div class="form-field">
                                        <label>📅 Data da Anamnese</label>
                                        <input type="date" id="dataAnamnese" class="form-control" style="padding: 12px 14px; border-radius: 10px; border: 2px solid #e2e8f0;">
                                    </div>
                                    <div class="form-field">
                                        <label>👨‍⚕️ Profissional Responsável</label>
                                        <input type="text" id="profissional" class="form-control" value="${this.userInfo.nome || ''}" readonly style="background: #f1f5f9; padding: 12px 14px; border-radius: 10px;">
                                    </div>
                                </div>
                            </div>

                            <!-- 1. HISTÓRICO CLÍNICO -->
                            <div class="evaluation-section" style="margin-bottom: 24px;">
                                <div class="section-header">
                                    <h3>🏥 1. Histórico Clínico</h3>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                                    <div class="form-field">
                                        <label>🩸 Doenças Preexistentes</label>
                                        <textarea id="doencas_preexistentes" class="form-control" rows="3" placeholder="Hipertensão, Diabetes, Colesterol alto, etc..." style="resize: vertical;">${this.currentAnamnese?.historico_clinico?.doencas_preexistentes || ''}</textarea>
                                    </div>
                                    <div class="form-field">
                                        <label>💊 Medicamentos em Uso</label>
                                        <textarea id="medicamentos" class="form-control" rows="3" placeholder="Nome do medicamento, dosagem, horário..." style="resize: vertical;">${this.currentAnamnese?.historico_clinico?.medicamentos || ''}</textarea>
                                    </div>
                                    <div class="form-field">
                                        <label>🏥 Cirurgias Prévias</label>
                                        <textarea id="cirurgias" class="form-control" rows="3" placeholder="Tipo de cirurgia, data, complicações..." style="resize: vertical;">${this.currentAnamnese?.historico_clinico?.cirurgias || ''}</textarea>
                                    </div>
                                    <div class="form-field">
                                        <label>🩺 Histórico Familiar</label>
                                        <textarea id="historico_familiar" class="form-control" rows="3" placeholder="Doenças na família (pais, irmãos)..." style="resize: vertical;">${this.currentAnamnese?.historico_clinico?.historico_familiar || ''}</textarea>
                                    </div>
                                </div>
                            </div>

                            <!-- 2. HISTÓRICO ALIMENTAR -->
                            <div class="evaluation-section" style="margin-bottom: 24px;">
                                <div class="section-header">
                                    <h3>🍽️ 2. Histórico Alimentar</h3>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                                    <div class="form-field">
                                        <label>🍳 Hábitos Alimentares</label>
                                        <textarea id="habitos_alimentares" class="form-control" rows="3" placeholder="Número de refeições por dia, horários, local das refeições..." style="resize: vertical;">${this.currentAnamnese?.historico_alimentar?.habitos_alimentares || ''}</textarea>
                                    </div>
                                    <div class="form-field">
                                        <label>💧 Consumo de Água (ml/dia)</label>
                                        <input type="number" id="consumo_agua" class="form-control" placeholder="Ex: 2000" value="${this.currentAnamnese?.historico_alimentar?.consumo_agua || ''}" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>🚫 Restrições Alimentares</label>
                                        <textarea id="restricoes" class="form-control" rows="3" placeholder="Alergias, intolerâncias, alimentos que não consome..." style="resize: vertical;">${this.currentAnamnese?.historico_alimentar?.restricoes || ''}</textarea>
                                    </div>
                                    <div class="form-field">
                                        <label>❤️ Preferências Alimentares</label>
                                        <textarea id="preferencias" class="form-control" rows="3" placeholder="Alimentos que gosta, preparações favoritas..." style="resize: vertical;">${this.currentAnamnese?.historico_alimentar?.preferencias || ''}</textarea>
                                    </div>
                                    <div class="form-field">
                                        <label>🥗 Uso de Suplementos</label>
                                        <textarea id="suplementos" class="form-control" rows="3" placeholder="Quais suplementos, dosagem, frequência..." style="resize: vertical;">${this.currentAnamnese?.historico_alimentar?.suplementos || ''}</textarea>
                                    </div>
                                </div>
                            </div>

                            <!-- 3. AVALIAÇÃO ANTROPOMÉTRICA -->
                            <div class="evaluation-section" style="margin-bottom: 24px;">
                                <div class="section-header">
                                    <h3>📏 3. Avaliação Antropométrica</h3>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                                    <div class="form-field">
                                        <label>📏 Peso Atual (kg)</label>
                                        <input type="number" id="peso_atual" step="0.1" class="form-control" placeholder="Ex: 70.5" value="${this.currentAnamnese?.antropometria?.peso_atual || ''}" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>📐 Altura (m)</label>
                                        <input type="number" id="altura" step="0.01" class="form-control" placeholder="Ex: 1.65" value="${this.currentAnamnese?.antropometria?.altura || ''}" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>⚖️ Peso Habitual (kg)</label>
                                        <input type="number" id="peso_habitual" step="0.1" class="form-control" placeholder="Ex: 68.0" value="${this.currentAnamnese?.antropometria?.peso_habitual || ''}" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>🎯 Peso Desejado (kg)</label>
                                        <input type="number" id="peso_desejado" step="0.1" class="form-control" placeholder="Ex: 65.0" value="${this.currentAnamnese?.antropometria?.peso_desejado || ''}" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>📊 IMC Calculado</label>
                                        <input type="text" id="imc_calculado" class="form-control" readonly style="background: #f1f5f9; padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>📋 Classificação IMC</label>
                                        <input type="text" id="classificacao_imc" class="form-control" readonly style="background: #f1f5f9; padding: 12px 14px;">
                                    </div>
                                </div>
                            </div>

                            <!-- 4. COMPOSIÇÃO CORPORAL (BIOIMPEDÂNCIA) -->
                            <div class="evaluation-section" style="margin-bottom: 24px;">
                                <div class="section-header">
                                    <h3>💪 4. Composição Corporal</h3>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                                    <div class="form-field">
                                        <label>💪 Massa Muscular (kg)</label>
                                        <input type="number" id="massa_muscular" step="0.1" class="form-control" placeholder="Ex: 25.5" value="${this.currentAnamnese?.composicao_corporal?.massa_muscular || ''}" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>🧈 Gordura Corporal (%)</label>
                                        <input type="number" id="gordura_corporal" step="0.1" class="form-control" placeholder="Ex: 28.5" value="${this.currentAnamnese?.composicao_corporal?.gordura_corporal || ''}" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>💧 Água Corporal (%)</label>
                                        <input type="number" id="agua_corporal" step="0.1" class="form-control" placeholder="Ex: 55.0" value="${this.currentAnamnese?.composicao_corporal?.agua_corporal || ''}" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>🦴 Massa Óssea (kg)</label>
                                        <input type="number" id="massa_ossea" step="0.1" class="form-control" placeholder="Ex: 2.5" value="${this.currentAnamnese?.composicao_corporal?.massa_ossea || ''}" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>🔥 Metabolismo Basal (kcal)</label>
                                        <input type="number" id="metabolismo_basal" step="1" class="form-control" placeholder="Ex: 1400" value="${this.currentAnamnese?.composicao_corporal?.metabolismo_basal || ''}" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>📏 Circunferência Abdominal (cm)</label>
                                        <input type="number" id="circunferencia_abdominal" step="0.1" class="form-control" placeholder="Ex: 85.0" value="${this.currentAnamnese?.composicao_corporal?.circunferencia_abdominal || ''}" style="padding: 12px 14px;">
                                    </div>
                                </div>
                            </div>

                            <!-- 5. EXAMES LABORATORIAIS -->
                            <div class="evaluation-section" style="margin-bottom: 24px;">
                                <div class="section-header">
                                    <h3>🩸 5. Exames Laboratoriais</h3>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                                    <div class="form-field">
                                        <label>🩸 Glicemia (mg/dL)</label>
                                        <input type="number" id="glicemia" step="1" class="form-control" placeholder="Ex: 90" value="${this.currentAnamnese?.exames_laboratoriais?.glicemia || ''}" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>🩸 Colesterol Total (mg/dL)</label>
                                        <input type="number" id="colesterol_total" step="1" class="form-control" placeholder="Ex: 180" value="${this.currentAnamnese?.exames_laboratoriais?.colesterol_total || ''}" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>🩸 HDL (mg/dL)</label>
                                        <input type="number" id="hdl" step="1" class="form-control" placeholder="Ex: 45" value="${this.currentAnamnese?.exames_laboratoriais?.hdl || ''}" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>🩸 LDL (mg/dL)</label>
                                        <input type="number" id="ldl" step="1" class="form-control" placeholder="Ex: 100" value="${this.currentAnamnese?.exames_laboratoriais?.ldl || ''}" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>🩸 Triglicerídeos (mg/dL)</label>
                                        <input type="number" id="triglicerideos" step="1" class="form-control" placeholder="Ex: 150" value="${this.currentAnamnese?.exames_laboratoriais?.triglicerideos || ''}" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>🩸 Hemoglobina Glicada (%)</label>
                                        <input type="number" id="hemoglobina_glicada" step="0.1" class="form-control" placeholder="Ex: 5.5" value="${this.currentAnamnese?.exames_laboratoriais?.hemoglobina_glicada || ''}" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>🩸 Vitamina D (ng/mL)</label>
                                        <input type="number" id="vitamina_d" step="1" class="form-control" placeholder="Ex: 30" value="${this.currentAnamnese?.exames_laboratoriais?.vitamina_d || ''}" style="padding: 12px 14px;">
                                    </div>
                                    <div class="form-field">
                                        <label>🩸 Ferritina (ng/mL)</label>
                                        <input type="number" id="ferritina" step="1" class="form-control" placeholder="Ex: 50" value="${this.currentAnamnese?.exames_laboratoriais?.ferritina || ''}" style="padding: 12px 14px;">
                                    </div>
                                </div>
                            </div>

                            <!-- 6. ESTILO DE VIDA -->
                            <div class="evaluation-section" style="margin-bottom: 24px;">
                                <div class="section-header">
                                    <h3>🏃 6. Estilo de Vida</h3>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                                    <div class="form-field">
                                        <label>🏋️ Atividade Física</label>
                                        <textarea id="atividade_fisica" class="form-control" rows="3" placeholder="Tipo, frequência, duração, intensidade..." style="resize: vertical;">${this.currentAnamnese?.estilo_vida?.atividade_fisica || ''}</textarea>
                                    </div>
                                    <div class="form-field">
                                        <label>😴 Qualidade do Sono</label>
                                        <textarea id="sono" class="form-control" rows="3" placeholder="Horas de sono por noite, qualidade, dificuldades..." style="resize: vertical;">${this.currentAnamnese?.estilo_vida?.sono || ''}</textarea>
                                    </div>
                                    <div class="form-field">
                                        <label>🚭 Hábitos</label>
                                        <textarea id="habitos" class="form-control" rows="3" placeholder="Tabagismo, consumo de álcool, café, outras substâncias..." style="resize: vertical;">${this.currentAnamnese?.estilo_vida?.habitos || ''}</textarea>
                                    </div>
                                    <div class="form-field">
                                        <label>😊 Nível de Estresse</label>
                                        <select id="nivel_estresse" class="form-control" style="padding: 12px 14px;">
                                            <option value="">Selecione</option>
                                            <option value="baixo" ${this.currentAnamnese?.estilo_vida?.nivel_estresse === 'baixo' ? 'selected' : ''}>Baixo</option>
                                            <option value="moderado" ${this.currentAnamnese?.estilo_vida?.nivel_estresse === 'moderado' ? 'selected' : ''}>Moderado</option>
                                            <option value="alto" ${this.currentAnamnese?.estilo_vida?.nivel_estresse === 'alto' ? 'selected' : ''}>Alto</option>
                                            <option value="muito_alto" ${this.currentAnamnese?.estilo_vida?.nivel_estresse === 'muito_alto' ? 'selected' : ''}>Muito Alto</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- 7. OBSERVAÇÕES GERAIS -->
                            <div class="evaluation-section" style="margin-bottom: 24px;">
                                <div class="section-header">
                                    <h3>📝 7. Observações e Condutas</h3>
                                </div>
                                <div class="form-field">
                                    <label>Observações Adicionais</label>
                                    <textarea id="observacoes" class="form-control" rows="4" placeholder="Informações relevantes, condutas adotadas, encaminhamentos, etc..." style="resize: vertical;">${this.currentAnamnese?.observacoes || ''}</textarea>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div class="empty-state" style="text-align: center; padding: 60px; background: white; border-radius: 1rem;">
                            <span class="empty-icon" style="font-size: 48px; opacity: 0.5;">👆</span>
                            <h3 style="margin-top: 16px;">Selecione um paciente</h3>
                            <p style="color: #64748b;">Escolha um paciente para realizar a anamnese nutricional</p>
                        </div>
                    `}
                </div>

                <!-- BOTÃO SALVAR ANAMNESE (flutuante) -->
                <div style="position: fixed; bottom: 30px; right: 30px; z-index: 100;">
                    <button id="saveAnamneseBtn" class="btn-primary btn-expand">
                        <span>💾</span>
                        <span class="btn-text">Salvar Anamnese</span>
                    </button>
                </div>
            </div>
        `;
    }

    attachEvents() {
        // Seletor de paciente
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

        // Cálculo automático de IMC
        const pesoInput = document.getElementById('peso_atual');
        const alturaInput = document.getElementById('altura');
        
        const calculateIMC = () => {
            const peso = parseFloat(document.getElementById('peso_atual')?.value);
            const altura = parseFloat(document.getElementById('altura')?.value);
            
            if (peso && altura && altura > 0) {
                const imc = peso / (altura * altura);
                document.getElementById('imc_calculado').value = imc.toFixed(2);
                
                // Classificação do IMC
                let classificacao = '';
                if (imc < 18.5) classificacao = 'Abaixo do peso';
                else if (imc < 25) classificacao = 'Peso normal';
                else if (imc < 30) classificacao = 'Sobrepeso';
                else if (imc < 35) classificacao = 'Obesidade grau I';
                else if (imc < 40) classificacao = 'Obesidade grau II';
                else classificacao = 'Obesidade grau III';
                
                document.getElementById('classificacao_imc').value = classificacao;
            } else {
                document.getElementById('imc_calculado').value = '';
                document.getElementById('classificacao_imc').value = '';
            }
        };
        
        if (pesoInput) pesoInput.addEventListener('input', calculateIMC);
        if (alturaInput) alturaInput.addEventListener('input', calculateIMC);

        // Botão salvar
        const saveBtn = document.getElementById('saveAnamneseBtn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveAnamnese());

        // Data padrão
        const dataInput = document.getElementById('dataAnamnese');
        if (dataInput && !dataInput.value) {
            dataInput.value = new Date().toISOString().split('T')[0];
        }
    }

    carregarDadosAntropometricos() {
        // Carrega dados da última avaliação se disponível
        if (this.currentAnamnese?.antropometria) {
            const { peso_atual, altura } = this.currentAnamnese.antropometria;
            if (peso_atual && document.getElementById('peso_atual')) {
                document.getElementById('peso_atual').value = peso_atual;
            }
            if (altura && document.getElementById('altura')) {
                document.getElementById('altura').value = altura;
            }
            // Dispara cálculo do IMC
            if (peso_atual && altura) {
                const event = new Event('input');
                document.getElementById('peso_atual')?.dispatchEvent(event);
                document.getElementById('altura')?.dispatchEvent(event);
            }
        }
    }

    async loadAnamnese() {
        if (!this.selectedPaciente) return;
        
        try {
            // CORRIGIDO: usar 'db' em vez de 'window.db'
            const anamneseRef = collection(db, 'anamneses_nutricionais');
            const q = query(anamneseRef, where('paciente_login', '==', this.selectedPaciente.login));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                // Pega a anamnese mais recente (última atualização)
                const docs = querySnapshot.docs;
                docs.sort((a, b) => {
                    const dateA = a.data().data_atualizacao || a.data().data_anamnese;
                    const dateB = b.data().data_atualizacao || b.data().data_anamnese;
                    return new Date(dateB) - new Date(dateA);
                });
                this.currentAnamnese = { id: docs[0].id, ...docs[0].data() };
            } else {
                this.currentAnamnese = null;
            }
        } catch (error) {
            console.error("Erro ao carregar anamnese:", error);
            this.currentAnamnese = null;
        }
    }

    async saveAnamnese() {
        if (!this.selectedPaciente) {
            alert('❌ Selecione um paciente primeiro!');
            return;
        }

        try {
            const anamneseData = {
                paciente_login: this.selectedPaciente.login,
                paciente_nome: this.selectedPaciente.nome,
                profissional: this.userInfo.nome,
                profissional_login: this.userInfo.login,
                data_anamnese: document.getElementById('dataAnamnese')?.value || new Date().toISOString().split('T')[0],
                data_atualizacao: new Date().toISOString(),
                
                historico_clinico: {
                    doencas_preexistentes: document.getElementById('doencas_preexistentes')?.value || '',
                    medicamentos: document.getElementById('medicamentos')?.value || '',
                    cirurgias: document.getElementById('cirurgias')?.value || '',
                    historico_familiar: document.getElementById('historico_familiar')?.value || ''
                },
                
                historico_alimentar: {
                    habitos_alimentares: document.getElementById('habitos_alimentares')?.value || '',
                    consumo_agua: parseFloat(document.getElementById('consumo_agua')?.value) || null,
                    restricoes: document.getElementById('restricoes')?.value || '',
                    preferencias: document.getElementById('preferencias')?.value || '',
                    suplementos: document.getElementById('suplementos')?.value || ''
                },
                
                antropometria: {
                    peso_atual: parseFloat(document.getElementById('peso_atual')?.value) || null,
                    altura: parseFloat(document.getElementById('altura')?.value) || null,
                    peso_habitual: parseFloat(document.getElementById('peso_habitual')?.value) || null,
                    peso_desejado: parseFloat(document.getElementById('peso_desejado')?.value) || null,
                    imc: parseFloat(document.getElementById('imc_calculado')?.value) || null,
                    classificacao_imc: document.getElementById('classificacao_imc')?.value || ''
                },
                
                composicao_corporal: {
                    massa_muscular: parseFloat(document.getElementById('massa_muscular')?.value) || null,
                    gordura_corporal: parseFloat(document.getElementById('gordura_corporal')?.value) || null,
                    agua_corporal: parseFloat(document.getElementById('agua_corporal')?.value) || null,
                    massa_ossea: parseFloat(document.getElementById('massa_ossea')?.value) || null,
                    metabolismo_basal: parseFloat(document.getElementById('metabolismo_basal')?.value) || null,
                    circunferencia_abdominal: parseFloat(document.getElementById('circunferencia_abdominal')?.value) || null
                },
                
                exames_laboratoriais: {
                    glicemia: parseFloat(document.getElementById('glicemia')?.value) || null,
                    colesterol_total: parseFloat(document.getElementById('colesterol_total')?.value) || null,
                    hdl: parseFloat(document.getElementById('hdl')?.value) || null,
                    ldl: parseFloat(document.getElementById('ldl')?.value) || null,
                    triglicerideos: parseFloat(document.getElementById('triglicerideos')?.value) || null,
                    hemoglobina_glicada: parseFloat(document.getElementById('hemoglobina_glicada')?.value) || null,
                    vitamina_d: parseFloat(document.getElementById('vitamina_d')?.value) || null,
                    ferritina: parseFloat(document.getElementById('ferritina')?.value) || null
                },
                
                estilo_vida: {
                    atividade_fisica: document.getElementById('atividade_fisica')?.value || '',
                    sono: document.getElementById('sono')?.value || '',
                    habitos: document.getElementById('habitos')?.value || '',
                    nivel_estresse: document.getElementById('nivel_estresse')?.value || ''
                },
                
                observacoes: document.getElementById('observacoes')?.value || ''
            };

            // CORRIGIDO: usar 'db' em vez de 'window.db'
            const anamneseRef = collection(db, 'anamneses_nutricionais');
            
            if (this.currentAnamnese?.id) {
                const anamneseDoc = doc(db, 'anamneses_nutricionais', this.currentAnamnese.id);
                await updateDoc(anamneseDoc, anamneseData);
                alert('✅ Anamnese atualizada com sucesso!');
            } else {
                await addDoc(anamneseRef, anamneseData);
                alert('✅ Anamnese criada com sucesso!');
            }
            
            await this.loadAnamnese();
        } catch (error) {
            console.error("Erro ao salvar anamnese:", error);
            alert('❌ Erro ao salvar: ' + error.message);
        }
    }
}
