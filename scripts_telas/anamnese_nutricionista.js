import { FuncoesCompartilhadas } from './0_home.js';
import { MenuProfissional } from './0_complementos_menu_profissional.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { db, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, uploadParaCloudinary, apiAutenticada } from '../0_firebase_api_config.js';

export class AnamneseNutricionista {
    constructor(userInfo, pacientesList, secaoAtiva = 'anamnese') {
        this.userInfo = userInfo;
        this.secaoAtiva = ['anamnese', 'exames', 'consumo'].includes(secaoAtiva) ? secaoAtiva : 'anamnese';
        this.funcoes = FuncoesCompartilhadas;
        this.pacientesList = pacientesList || [];
        this.selectedPaciente = null;
        this.currentAnamnese = null;
        this.anamnesesList = [];
        this.anamneseExpandida = null;
        this.historicoCarregadoLogin = null;
        this.menu = null;
        this.exameWorkflow = this.criarExameWorkflow();
        this.navegador = criarNavegador(userInfo, this.pacientesList);
    }

    render() {
        const modulos = { anamnese: 'avaliacao_nutricional', exames: 'exames_nutricionais', consumo: 'medidas_consumo' };
        localStorage.setItem('activeModule', modulos[this.secaoAtiva]);
        const app = document.getElementById('app');
        app.innerHTML = this.renderHTML();
        
        // Inicializa o menu e insere no container
        this.menu = new MenuProfissional(this.userInfo, (module) => this.navegador.navegarPara(module), 'avaliacao_nutricional');
        const menuHtml = this.menu.render();
        const menuContainer = document.getElementById('menuContainer');
        if (menuContainer) {
            menuContainer.innerHTML = menuHtml;
        }
        this.menu.attachEvents();
        
        this.attachEvents();
        
        // Atualiza a lista de pacientes no navegador
        this.navegador.pacientesList = this.pacientesList;
        
        if (this.selectedPaciente && this.historicoCarregadoLogin !== this.selectedPaciente.login) {
            void this.loadAnamnese();
        } else if (!this.pacientesList.length) {
            void this.carregarPacientes();
        }
    }

    async carregarPacientes() {
        this.pacientesList = await this.funcoes.loadPacientesList(this.userInfo.login);
        this.navegador.pacientesList = this.pacientesList;

        if (this.pacientesList.length) {
            this.render();
        }
    }

    renderHTML() {
        return `
            <div class="dashboard-container" style="height: calc(100vh - 24px); max-height: calc(100vh - 24px); margin: 12px auto; display: flex; flex-direction: column;">
                <div id="menuContainer"></div>

                <div class="main-content" style="flex: 1; overflow-y: auto; padding: 14px 20px 90px; min-height: 0;">
                    ${this.renderNavegacaoAvaliacao()}
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

                        <div class="info-grid" style="display:none;">
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
                        ${this.renderHistoricoAnamneses()}
                        <div id="modalNovaAnamnese" style="display:none; position:fixed; inset:0; z-index:3000; background:rgba(15,23,42,.62); padding:12px; align-items:center; justify-content:center;">
                            <div style="background:white; width:min(96vw,1100px); height:min(94vh,900px); border-radius:16px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 24px 70px rgba(15,23,42,.35);">
                                <div style="padding:14px 18px; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; gap:12px;">
                                    <h3 id="tituloModalAnamnese" style="margin:0; color:#1a237e;">${this.getSecaoConfig().novo}</h3>
                                    <button id="btnFecharNovaAnamnese" type="button" aria-label="Fechar" style="background:rgba(26,35,126,.12); color:#1a237e; border:none; border-radius:8px; width:34px; height:34px; cursor:pointer; font-size:18px;">X</button>
                                </div>
                                <div style="flex:1; min-height:0; overflow-y:auto; padding:16px;">
                        <!-- ANAMNESE COMPLETA -->
                        <div class="anamnese-container">
                            <!-- Dados da Consulta -->
                            <div class="evaluation-section" style="margin-bottom: 24px;">
                                <div class="section-header">
                                    <h3>📅 Dados da Consulta</h3>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                                    <div class="form-field">
                                        <label>📅 Data do Registro</label>
                                        <input type="date" id="dataAnamnese" class="form-control" style="padding: 12px 14px; border-radius: 10px; border: 2px solid #e2e8f0;">
                                    </div>
                                    <div class="form-field">
                                        <label>👨‍⚕️ Profissional Responsável</label>
                                        <input type="text" id="profissional" class="form-control" value="${this.userInfo.nome || ''}" readonly style="background: #f1f5f9; padding: 12px 14px; border-radius: 10px;">
                                    </div>
                                </div>
                            </div>

                            <!-- 1. HISTÓRICO CLÍNICO -->
                            <div class="evaluation-section" style="margin-bottom:24px;${this.secaoAtiva === 'anamnese' ? '' : 'display:none;'}">
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
                                    <div class="form-field">
                                        <label>🩺 Achados do Exame Físico</label>
                                        <textarea id="achados_exame_fisico" class="form-control" rows="3" placeholder="Estado geral, pele, cabelos, unhas, edema ou sinais de depleção..." style="resize:vertical;">${this.currentAnamnese?.exame_fisico?.achados_gerais || ''}</textarea>
                                    </div>
                                    <div class="form-field">
                                        <label>🗣️ Sinais, Sintomas e Funções</label>
                                        <textarea id="sintomas_funcoes" class="form-control" rows="3" placeholder="Sintomas gastrointestinais, mastigação, deglutição ou outras alterações..." style="resize:vertical;">${this.currentAnamnese?.exame_fisico?.sintomas_funcionais || ''}</textarea>
                                    </div>
                                </div>
                            </div>

                            <!-- CONSUMO ALIMENTAR -->
                            <div class="evaluation-section" style="margin-bottom:24px;${this.secaoAtiva === 'consumo' ? '' : 'display:none;'}">
                                <div class="section-header">
                                    <h3>🍽️ Consumo Alimentar</h3>
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
                            <div class="evaluation-section" style="display:none;margin-bottom:24px;">
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
                            <div class="evaluation-section" style="display:none;margin-bottom:24px;">
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
                            <div class="evaluation-section" style="margin-bottom:24px;${this.secaoAtiva === 'exames' ? '' : 'display:none;'}">
                                <div class="section-header">
                                    <h3>🩸 5. Exames Laboratoriais</h3>
                                </div>
                                ${this.renderExameWorkflow()}
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
                            <div class="evaluation-section" style="margin-bottom:24px;${this.secaoAtiva === 'anamnese' ? '' : 'display:none;'}">
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
                            <div class="evaluation-section" style="margin-bottom:24px;${this.secaoAtiva === 'anamnese' ? '' : 'display:none;'}">
                                <div class="section-header">
                                    <h3>📝 7. Observações e Condutas</h3>
                                </div>
                                <div class="form-field">
                                    <label>Observações Adicionais</label>
                                    <textarea id="observacoes" class="form-control" rows="4" placeholder="Informações relevantes, condutas adotadas, encaminhamentos, etc..." style="resize: vertical;">${this.currentAnamnese?.observacoes || ''}</textarea>
                                </div>
                            </div>
                        </div>
                                </div>
                                <div style="padding:12px 18px; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:10px;">
                                    <button id="btnCancelarNovaAnamnese" type="button" class="btn-secondary">Cancelar</button>
                                    <button id="saveAnamneseBtn" type="button" class="btn-primary">${this.getSecaoConfig().salvar}</button>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div class="empty-state" style="text-align: center; padding: 60px; background: white; border-radius: 1rem;">
                            <span class="empty-icon" style="font-size: 48px; opacity: 0.5;">👆</span>
                            <h3 style="margin-top: 16px;">Selecione um paciente</h3>
                            <p style="color: #64748b;">Escolha um paciente para consultar ${this.getSecaoConfig().descricao}.</p>
                        </div>
                    `}
                </div>

                <!-- BOTÃO SALVAR ANAMNESE (flutuante) -->
                <div style="position: fixed; bottom: 30px; right: 30px; z-index: 100;">
                    <button id="btnNovaAnamnese" class="btn-primary btn-expand" title="${this.getSecaoConfig().novo}" ${this.selectedPaciente ? '' : 'style="display:none;"'}>
                        <span>+</span>
                        <span class="btn-text">${this.getSecaoConfig().novo}</span>
                    </button>
                </div>
            </div>
        `;
    }

    attachEvents() {
        document.getElementById('abaMedidasFisicas')?.addEventListener('click', () => this.navegador.navegarPara('medidas_fisicas'));
        document.getElementById('abaAnamneses')?.addEventListener('click', () => {
            if (this.secaoAtiva !== 'anamnese') this.navegador.navegarPara('avaliacao_nutricional');
        });
        document.getElementById('abaExames')?.addEventListener('click', () => {
            if (this.secaoAtiva !== 'exames') this.navegador.navegarPara('exames_nutricionais');
        });
        document.getElementById('abaConsumo')?.addEventListener('click', () => {
            if (this.secaoAtiva !== 'consumo') this.navegador.navegarPara('medidas_consumo');
        });
        const modalNovaAnamnese = document.getElementById('modalNovaAnamnese');
        const abrirNovaAnamnese = () => {
            this.currentAnamnese = null;
            this.exameWorkflow = this.criarExameWorkflow();
            this.atualizarPainelExame();
            modalNovaAnamnese?.querySelectorAll('input:not([readonly]), textarea, select').forEach((campo) => {
                campo.value = '';
            });
            const titulo = document.getElementById('tituloModalAnamnese');
            if (titulo) titulo.textContent = this.getSecaoConfig().novo;
            if (modalNovaAnamnese) modalNovaAnamnese.style.display = 'flex';
        };
        const fecharNovaAnamnese = () => {
            if (modalNovaAnamnese) modalNovaAnamnese.style.display = 'none';
        };
        document.getElementById('btnNovaAnamnese')?.addEventListener('click', abrirNovaAnamnese);
        document.getElementById('btnFecharNovaAnamnese')?.addEventListener('click', fecharNovaAnamnese);
        document.getElementById('btnCancelarNovaAnamnese')?.addEventListener('click', fecharNovaAnamnese);
        this.attachExameWorkflowEvents();
        modalNovaAnamnese?.addEventListener('click', (event) => {
            if (event.target === modalNovaAnamnese) fecharNovaAnamnese();
        });

        // Seletor de paciente
        const pacienteSelect = document.getElementById('pacienteSelect');
        if (pacienteSelect) {
            pacienteSelect.addEventListener('change', async (e) => {
                const login = e.target.value;
                if (login) {
                    this.selectedPaciente = this.pacientesList.find(p => p.login === login);
                    this.currentAnamnese = null;
                    this.anamnesesList = [];
                    this.anamneseExpandida = null;
                    this.historicoCarregadoLogin = null;
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

        document.querySelectorAll('[data-anamnese-detalhes]').forEach((button) => {
            button.addEventListener('click', () => {
                this.anamneseExpandida = button.dataset.anamneseDetalhes;
                this.render();
            });
        });
        document.querySelectorAll('[data-anamnese-editar]').forEach((button) => {
            button.addEventListener('click', () => this.editarAnamnese(button.dataset.anamneseEditar));
        });
        document.querySelectorAll('[data-anamnese-excluir]').forEach((button) => {
            button.addEventListener('click', () => this.excluirAnamnese(button.dataset.anamneseExcluir));
        });
        const modalDetalhesAnamnese = document.getElementById('modalDetalhesAnamnese');
        const fecharDetalhesAnamnese = () => {
            this.anamneseExpandida = null;
            this.render();
        };
        document.getElementById('btnFecharDetalhesAnamnese')?.addEventListener('click', fecharDetalhesAnamnese);
        modalDetalhesAnamnese?.addEventListener('click', (event) => {
            if (event.target === modalDetalhesAnamnese) fecharDetalhesAnamnese();
        });

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
        const pacienteLogin = this.selectedPaciente.login;
        
        try {
            // CORRIGIDO: usar 'db' em vez de 'window.db'
            const anamneseRef = collection(db, 'anamneses_nutricionais');
            const q = query(anamneseRef, where('paciente_login', '==', pacienteLogin));
            const querySnapshot = await getDocs(q);
            if (this.selectedPaciente?.login !== pacienteLogin) return;
            
            if (!querySnapshot.empty) {
                // Pega a anamnese mais recente (última atualização)
                this.anamnesesList = querySnapshot.docs
                    .map((item) => ({ id: item.id, ...item.data() }))
                    .filter((registro) => this.registroPertenceSecao(registro));
                this.anamnesesList.sort((a, b) => this.obterDataRegistro(b) - this.obterDataRegistro(a));
                this.currentAnamnese = null;
            } else {
                this.anamnesesList = [];
                this.currentAnamnese = null;
            }
        } catch (error) {
            this.anamnesesList = [];
            this.currentAnamnese = null;
        }
        if (this.selectedPaciente?.login !== pacienteLogin) return;
        this.historicoCarregadoLogin = pacienteLogin;
        this.render();
    }

    renderNavegacaoAvaliacao() {
        const botao = (id, rotulo, ativo) => `<button id="${id}" type="button" style="padding:9px 14px;border:1px solid ${ativo ? '#1a237e' : '#cbd5e1'};border-radius:8px;background:${ativo ? '#1a237e' : 'white'};color:${ativo ? 'white' : '#334155'};font-weight:700;cursor:pointer;">${rotulo}</button>`;
        return `
            <section style="margin-bottom:16px;background:white;border:1px solid #dbe3ef;border-radius:12px;padding:12px 14px;">
                <div style="margin-bottom:10px;"><h2 style="margin:0;color:#1a237e;font-size:21px;">Avaliação Nutricional</h2><p style="margin:3px 0 0;color:#64748b;font-size:13px;">Informações clínicas organizadas por etapa da consulta.</p></div>
                <nav style="display:flex;gap:8px;flex-wrap:wrap;" aria-label="Seções da avaliação nutricional">
                    ${botao('abaAnamneses', 'Anamnese Clínica', this.secaoAtiva === 'anamnese')}
                    ${botao('abaMedidasFisicas', 'Avaliação Antropométrica', false)}
                    ${botao('abaExames', 'Exames Laboratoriais', this.secaoAtiva === 'exames')}
                    ${botao('abaConsumo', 'Consumo Alimentar', this.secaoAtiva === 'consumo')}
                </nav>
            </section>`;
    }

    getSecaoConfig() {
        return {
            anamnese: { novo: 'Nova Anamnese Clínica', salvar: 'Salvar Anamnese', descricao: 'a anamnese clínica', historico: 'Histórico de anamneses clínicas' },
            exames: { novo: 'Novo Registro de Exames', salvar: 'Salvar Exames', descricao: 'os exames laboratoriais', historico: 'Histórico de exames laboratoriais' },
            consumo: { novo: 'Novo Registro de Consumo', salvar: 'Salvar Consumo Alimentar', descricao: 'o consumo alimentar', historico: 'Histórico de consumo alimentar' }
        }[this.secaoAtiva];
    }

    criarExameWorkflow(registro = null) {
        const documento = registro?.documento_exame || {};
        return {
            attachment: documento.anexo || null,
            extraction: documento.leitura || null,
            confirmed: documento.confirmado === true,
            confirmedAt: documento.confirmado_em || null,
            analysis: registro?.analise_ia_exames?.resultado || null,
            readingModel: documento.modelo_leitura || null,
            analysisModel: registro?.analise_ia_exames?.modelo || null,
            analyzedAt: registro?.analise_ia_exames?.analisado_em || null,
            busy: false
        };
    }

    renderExameWorkflow() {
        if (this.secaoAtiva !== 'exames') return '';
        const anexo = this.exameWorkflow.attachment;
        const anexoUrl = this.safeCloudinaryUrl(anexo?.url);
        return `
            <section class="exam-import-card" aria-labelledby="examImportTitle">
                <header class="exam-import-header">
                    <div>
                        <span class="exam-import-eyebrow">Leitura assistida</span>
                        <h4 id="examImportTitle">Anexe o laudo e economize digitação</h4>
                        <p>O original é armazenado, os resultados são lidos e você confere tudo antes da análise.</p>
                    </div>
                    <div class="exam-steps" aria-label="Etapas do processamento">
                        <span class="${anexo ? 'is-done' : 'is-active'}">1. Anexar</span>
                        <span class="${this.exameWorkflow.extraction ? 'is-done' : ''}">2. Conferir</span>
                        <span class="${this.exameWorkflow.analysis ? 'is-done' : ''}">3. Analisar</span>
                    </div>
                </header>
                <div class="exam-upload-actions">
                    <input id="exameArquivoInput" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden>
                    <input id="exameCameraInput" type="file" accept="image/*" capture="environment" hidden>
                    <button id="btnSelecionarExame" type="button" class="exam-action-primary">Anexar PDF ou imagem</button>
                    <button id="btnFotografarExame" type="button" class="exam-action-secondary">Tirar foto</button>
                    <small>PDF, JPG, PNG ou WEBP · até 5 MB · prefira imagens nítidas e sem cortes</small>
                </div>
                ${anexo ? `<div class="exam-file-chip"><span aria-hidden="true">✓</span><div><strong>${this.escapeHtml(anexo.nome || 'Exame anexado')}</strong><small>Original armazenado com segurança</small></div>${anexoUrl ? `<a href="${anexoUrl}" target="_blank" rel="noopener noreferrer">Abrir</a>` : ''}</div>` : ''}
                <div id="exameProcessamentoStatus" class="exam-process-status" role="status" aria-live="polite">${anexo ? 'Arquivo carregado. Confira os dados abaixo.' : 'Nenhum arquivo selecionado.'}</div>
                <div id="exameLeituraArea">${this.renderResultadosExame()}</div>
                <div class="exam-confirmation">
                    <label>
                        <input id="confirmarDadosExame" type="checkbox" ${this.exameWorkflow.confirmed ? 'checked' : ''} ${this.exameWorkflow.extraction?.documento_valido ? '' : 'disabled'}>
                        <span><strong>Confirmo que conferi os dados carregados</strong><small>A análise usa somente os valores confirmados por você.</small></span>
                    </label>
                    <button id="btnAnalisarExameIA" type="button" class="exam-ai-button" ${this.exameWorkflow.confirmed ? '' : 'disabled'}>Analisar com IA</button>
                </div>
                <div id="exameAnaliseArea">${this.renderAnaliseExame()}</div>
            </section>`;
    }

    renderResultadosExame() {
        const leitura = this.exameWorkflow.extraction;
        if (!leitura) return '<div class="exam-reading-empty">Os dados reconhecidos aparecerão aqui para conferência.</div>';
        const mensagens = leitura.qualidade?.mensagens || [];
        const resultados = leitura.resultados || [];
        const qualidade = leitura.qualidade?.status || 'parcial';
        const metadados = [
            ['Paciente identificado', leitura.paciente_nome],
            ['Data da coleta', leitura.data_coleta],
            ['Laboratório', leitura.laboratorio]
        ].filter(([, valor]) => valor);
        const options = (atual) => ['baixo', 'normal', 'alto', 'critico', 'indefinido']
            .map((valor) => `<option value="${valor}" ${valor === atual ? 'selected' : ''}>${valor === 'critico' ? 'Crítico' : valor.charAt(0).toUpperCase() + valor.slice(1)}</option>`).join('');
        return `
            <div class="exam-reading-summary is-${this.escapeHtml(qualidade)}">
                <div><strong>${leitura.documento_valido ? `${resultados.length} resultado(s) identificado(s)` : 'O arquivo não parece ser um laudo legível'}</strong><span>Qualidade da leitura: ${this.escapeHtml(qualidade)}</span></div>
                ${mensagens.length ? `<ul>${mensagens.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul>` : ''}
            </div>
            ${metadados.length ? `<div class="exam-document-meta">${metadados.map(([rotulo, valor]) => `<div><span>${this.escapeHtml(rotulo)}</span><strong>${this.escapeHtml(valor)}</strong></div>`).join('')}</div>` : ''}
            ${leitura.documento_valido ? `
                <div class="exam-results-toolbar"><strong>Dados extraídos</strong><button id="btnAdicionarResultadoExame" type="button">+ Adicionar resultado</button></div>
                <div class="exam-results-table" role="table" aria-label="Resultados extraídos do exame">
                    <div class="exam-results-head" role="row"><span>Exame</span><span>Resultado</span><span>Unidade</span><span>Referência</span><span>Status</span><span></span></div>
                    <div id="exameResultadosRows">
                        ${resultados.map((item, index) => `
                            <div class="exam-result-row ${item.lido_com_confianca ? '' : 'is-uncertain'}" role="row" data-exame-row="${index}">
                                <input data-exame-field="name" aria-label="Nome do exame" value="${this.escapeHtml(item.nome)}">
                                <input data-exame-field="value" aria-label="Resultado" value="${this.escapeHtml(item.valor_texto ?? item.valor_numerico ?? '')}">
                                <input data-exame-field="unit" aria-label="Unidade" value="${this.escapeHtml(item.unidade || '')}">
                                <input data-exame-field="reference" aria-label="Referência" value="${this.escapeHtml(item.referencia || '')}">
                                <select data-exame-field="status" aria-label="Status">${options(item.status)}</select>
                                <button type="button" data-remover-resultado="${index}" aria-label="Remover resultado">×</button>
                            </div>`).join('')}
                    </div>
                </div>` : ''}
        `;
    }

    renderAnaliseExame() {
        const analise = this.exameWorkflow.analysis;
        if (!analise) return '';
        const achados = analise.achados || [];
        const lista = (titulo, itens, classe = '') => itens?.length ? `<div class="exam-analysis-list ${classe}"><strong>${titulo}</strong><ul>${itens.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul></div>` : '';
        return `
            <section class="exam-analysis-card">
                <header><div><span>Análise dos dados confirmados</span><h4>Apoio à decisão profissional</h4></div><span class="exam-analysis-badge">IA · revisar</span></header>
                <p class="exam-analysis-summary">${this.escapeHtml(analise.resumo || '')}</p>
                ${achados.length ? `<div class="exam-findings">${achados.map((item) => `<article class="is-${this.escapeHtml(item.nivel)}"><strong>${this.escapeHtml(item.titulo)}</strong><p>${this.escapeHtml(item.descricao)}</p>${item.exames_relacionados?.length ? `<small>${this.escapeHtml(item.exames_relacionados.join(' · '))}</small>` : ''}</article>`).join('')}</div>` : ''}
                ${lista('Correlações para revisar', analise.correlacoes)}
                ${lista('Próximos passos sugeridos', analise.proximos_passos)}
                ${lista('Alertas', analise.alertas, 'is-alert')}
                <footer>${this.escapeHtml(analise.aviso_profissional || 'Resultado de apoio. A interpretação final é do profissional responsável.')}</footer>
            </section>`;
    }

    safeCloudinaryUrl(value) {
        const url = String(value || '');
        return /^https:\/\/res\.cloudinary\.com\//i.test(url) ? this.escapeHtml(url) : '';
    }

    attachExameWorkflowEvents() {
        if (this.secaoAtiva !== 'exames') return;
        const arquivoInput = document.getElementById('exameArquivoInput');
        const cameraInput = document.getElementById('exameCameraInput');
        document.getElementById('btnSelecionarExame')?.addEventListener('click', () => arquivoInput?.click());
        document.getElementById('btnFotografarExame')?.addEventListener('click', () => cameraInput?.click());
        const receberArquivo = (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void this.processarArquivoExame(file);
        };
        arquivoInput?.addEventListener('change', receberArquivo);
        cameraInput?.addEventListener('change', receberArquivo);

        document.getElementById('confirmarDadosExame')?.addEventListener('change', (event) => {
            if (!event.target.checked) {
                this.invalidarConfirmacaoExame();
                return;
            }
            const resultados = this.obterResultadosExameDoFormulario();
            if (!resultados.length || resultados.some((item) => !item.nome || item.valor_texto === '')) {
                event.target.checked = false;
                alert('Preencha o nome e o resultado de todos os itens antes de confirmar.');
                return;
            }
            this.exameWorkflow.extraction.resultados = resultados;
            this.exameWorkflow.confirmed = true;
            this.exameWorkflow.confirmedAt = new Date().toISOString();
            this.sincronizarCamposPadrao(resultados);
            const analisar = document.getElementById('btnAnalisarExameIA');
            if (analisar) analisar.disabled = false;
            this.setExameStatus('Dados conferidos. A análise com IA está liberada.');
        });
        document.getElementById('btnAnalisarExameIA')?.addEventListener('click', () => this.analisarExameConfirmado());
        this.attachResultadosExameEvents();

        const camposPadrao = ['glicemia', 'colesterol_total', 'hdl', 'ldl', 'triglicerideos', 'hemoglobina_glicada', 'vitamina_d', 'ferritina'];
        camposPadrao.forEach((campo) => {
            document.getElementById(campo)?.addEventListener('input', (event) => {
                const item = this.exameWorkflow.extraction?.resultados?.find((resultado) => resultado.campo_padrao === campo);
                if (item) {
                    item.valor_texto = event.target.value;
                    const numero = Number(String(event.target.value).replace(',', '.'));
                    item.valor_numerico = Number.isFinite(numero) ? numero : null;
                    const index = this.exameWorkflow.extraction.resultados.indexOf(item);
                    const valorExtraido = document.querySelector(`[data-exame-row="${index}"] [data-exame-field="value"]`);
                    if (valorExtraido) valorExtraido.value = event.target.value;
                }
                if (this.exameWorkflow.extraction) this.invalidarConfirmacaoExame('Valor alterado. Confira os dados novamente.');
            });
        });
    }

    attachResultadosExameEvents() {
        document.querySelectorAll('[data-exame-row] input, [data-exame-row] select').forEach((campo) => {
            campo.addEventListener('input', () => this.invalidarConfirmacaoExame('Dados ajustados. Confirme novamente antes da análise.'));
        });
        document.querySelectorAll('[data-remover-resultado]').forEach((button) => {
            button.addEventListener('click', () => {
                const resultados = this.obterResultadosExameDoFormulario();
                resultados.splice(Number(button.dataset.removerResultado), 1);
                this.exameWorkflow.extraction.resultados = resultados;
                this.invalidarConfirmacaoExame();
                this.atualizarPainelExame();
            });
        });
        document.getElementById('btnAdicionarResultadoExame')?.addEventListener('click', () => {
            const resultados = this.obterResultadosExameDoFormulario();
            resultados.push({
                nome: '',
                campo_padrao: 'outro',
                valor_texto: '',
                valor_numerico: null,
                unidade: '',
                referencia: '',
                status: 'indefinido',
                lido_com_confianca: true
            });
            this.exameWorkflow.extraction.resultados = resultados;
            this.invalidarConfirmacaoExame();
            this.atualizarPainelExame();
        });
    }

    invalidarConfirmacaoExame(mensagem = '') {
        this.exameWorkflow.confirmed = false;
        this.exameWorkflow.confirmedAt = null;
        this.exameWorkflow.analysis = null;
        this.exameWorkflow.analysisModel = null;
        this.exameWorkflow.analyzedAt = null;
        const confirmar = document.getElementById('confirmarDadosExame');
        const analisar = document.getElementById('btnAnalisarExameIA');
        const analise = document.getElementById('exameAnaliseArea');
        if (confirmar) confirmar.checked = false;
        if (analisar) analisar.disabled = true;
        if (analise) analise.innerHTML = '';
        if (mensagem) this.setExameStatus(mensagem);
    }

    obterResultadosExameDoFormulario() {
        const rows = [...document.querySelectorAll('[data-exame-row]')];
        if (!rows.length) return this.exameWorkflow.extraction?.resultados || [];
        return rows.map((row, index) => {
            const valor = row.querySelector('[data-exame-field="value"]')?.value.trim() || '';
            const numero = Number(valor.replace(',', '.'));
            const anterior = this.exameWorkflow.extraction?.resultados?.[index] || {};
            return {
                nome: row.querySelector('[data-exame-field="name"]')?.value.trim() || '',
                campo_padrao: anterior.campo_padrao || 'outro',
                valor_texto: valor,
                valor_numerico: valor && Number.isFinite(numero) ? numero : null,
                unidade: row.querySelector('[data-exame-field="unit"]')?.value.trim() || '',
                referencia: row.querySelector('[data-exame-field="reference"]')?.value.trim() || '',
                status: row.querySelector('[data-exame-field="status"]')?.value || 'indefinido',
                lido_com_confianca: anterior.lido_com_confianca !== false
            };
        });
    }

    sincronizarCamposPadrao(resultados) {
        resultados.forEach((item) => {
            if (!item.campo_padrao || item.campo_padrao === 'outro') return;
            const campo = document.getElementById(item.campo_padrao);
            const valor = item.valor_texto ?? item.valor_numerico ?? '';
            if (campo && valor !== '') campo.value = String(valor).replace(',', '.');
        });
    }

    setExameStatus(mensagem, tipo = '') {
        const status = document.getElementById('exameProcessamentoStatus');
        if (!status) return;
        status.textContent = mensagem;
        status.className = `exam-process-status ${tipo ? `is-${tipo}` : ''}`;
    }

    atualizarPainelExame() {
        const painel = document.querySelector('.exam-import-card');
        if (!painel) return;
        painel.outerHTML = this.renderExameWorkflow();
        this.attachExameWorkflowEvents();
    }

    lerArquivoComoDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Não foi possível ler o arquivo selecionado.'));
            reader.readAsDataURL(file);
        });
    }

    async processarArquivoExame(file) {
        const tipos = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!tipos.includes(file.type)) {
            alert('Envie um arquivo PDF, JPG, PNG ou WEBP.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('O arquivo deve ter no máximo 5 MB.');
            return;
        }
        if (this.exameWorkflow.busy) return;
        this.exameWorkflow.busy = true;
        this.invalidarConfirmacaoExame();
        this.setExameStatus('Preparando o arquivo para armazenamento e leitura...');
        document.querySelectorAll('#btnSelecionarExame, #btnFotografarExame').forEach((button) => { button.disabled = true; });

        try {
            const dataUrl = await this.lerArquivoComoDataUrl(file);
            const [asset, leitura] = await Promise.all([
                uploadParaCloudinary(file, (percentual) => this.setExameStatus(`Armazenando original... ${percentual}%`), {
                    category: 'exames',
                    patientLogin: this.selectedPaciente?.login || ''
                }),
                apiAutenticada('/api/lab-exams/extract', {
                    method: 'POST',
                    body: JSON.stringify({ file: { name: file.name, mimeType: file.type, dataUrl } })
                })
            ]);
            this.exameWorkflow.attachment = {
                nome: file.name,
                mime_type: file.type,
                tamanho: file.size,
                url: asset.secure_url || asset.url,
                public_id: asset.public_id,
                resource_type: asset.resource_type || 'image',
                formato: asset.format || ''
            };
            this.exameWorkflow.extraction = leitura.extraction;
            this.exameWorkflow.readingModel = leitura.model;
            this.exameWorkflow.confirmed = false;
            this.exameWorkflow.analysis = null;
            this.sincronizarCamposPadrao(leitura.extraction?.resultados || []);
            this.atualizarPainelExame();
            this.setExameStatus(
                leitura.extraction?.documento_valido
                    ? 'Leitura concluída. Revise os valores e confirme os dados.'
                    : 'Não foi possível validar o documento. Envie uma imagem mais nítida ou outro arquivo.',
                leitura.extraction?.documento_valido ? 'success' : 'error'
            );
        } catch (error) {
            this.setExameStatus(error.message || 'Não foi possível processar o exame.', 'error');
        } finally {
            this.exameWorkflow.busy = false;
            document.querySelectorAll('#btnSelecionarExame, #btnFotografarExame').forEach((button) => { button.disabled = false; });
        }
    }

    async analisarExameConfirmado() {
        if (!this.exameWorkflow.confirmed) {
            alert('Confirme os dados carregados antes de solicitar a análise.');
            return;
        }
        const button = document.getElementById('btnAnalisarExameIA');
        if (button) {
            button.disabled = true;
            button.textContent = 'Analisando...';
        }
        this.setExameStatus('Analisando somente os dados que você confirmou...');
        try {
            const resultados = this.obterResultadosExameDoFormulario();
            this.exameWorkflow.extraction.resultados = resultados;
            const response = await apiAutenticada('/api/lab-exams/analyze', {
                method: 'POST',
                body: JSON.stringify({
                    confirmed: true,
                    collectionDate: this.exameWorkflow.extraction?.data_coleta || '',
                    patient: {
                        age: this.funcoes.calcularIdade(this.selectedPaciente?.dataNascimento),
                        sex: this.selectedPaciente?.sexo || ''
                    },
                    results: resultados.map((item) => ({
                        name: item.nome,
                        value: item.valor_texto,
                        unit: item.unidade,
                        reference: item.referencia,
                        status: item.status
                    }))
                })
            });
            this.exameWorkflow.analysis = response.analysis;
            this.exameWorkflow.analysisModel = response.model;
            this.exameWorkflow.analyzedAt = response.analyzedAt;
            this.atualizarPainelExame();
            this.setExameStatus('Análise concluída e pronta para sua revisão.', 'success');
        } catch (error) {
            this.setExameStatus(error.message || 'Não foi possível analisar os dados confirmados.', 'error');
            if (button) {
                button.disabled = false;
                button.textContent = 'Analisar com IA';
            }
        }
    }

    obterDataRegistro(registro) {
        const valor = registro?.data_criacao || registro?.data_atualizacao || registro?.data_anamnese;
        if (valor?.toDate) return valor.toDate();
        const data = new Date(valor || 0);
        return Number.isNaN(data.getTime()) ? new Date(0) : data;
    }

    registroPertenceSecao(registro) {
        if (registro.tipo_registro) return registro.tipo_registro === this.secaoAtiva;
        if (this.secaoAtiva === 'anamnese') return true;
        const grupos = this.secaoAtiva === 'exames'
            ? [registro.exames_laboratoriais]
            : [registro.historico_alimentar];
        return grupos.some((grupo) => Object.values(grupo || {}).some((valor) => valor !== null && valor !== undefined && String(valor).trim() !== ''));
    }

    formatarDataHora(registro) {
        const data = this.obterDataRegistro(registro);
        if (!data.getTime()) return registro?.data_anamnese || 'Data não informada';
        return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }

    escapeHtml(valor) {
        return String(valor ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
    }

    renderDetalhes(registro) {
        const vazio = (valor) => valor === null || valor === '' || valor === undefined;
        const campo = (rotulo, valor, unidade = '') => `<div class="anamnese-detail-field"><span class="anamnese-detail-label">${this.escapeHtml(rotulo)}</span><span class="anamnese-detail-value ${vazio(valor) ? 'is-empty' : ''}">${vazio(valor) ? 'Não informado' : `${this.escapeHtml(valor)}${unidade ? ` <small>${this.escapeHtml(unidade)}</small>` : ''}`}</span></div>`;
        const secao = (icone, titulo, subtitulo, campos, classe = '') => `<section class="anamnese-detail-section ${classe}"><header class="anamnese-detail-section-header"><span class="anamnese-detail-icon" aria-hidden="true">${icone}</span><div><h3>${titulo}</h3><p>${subtitulo}</p></div></header><div class="anamnese-detail-grid">${campos.join('')}</div></section>`;
        const clinico = registro.historico_clinico || {};
        const alimentar = registro.historico_alimentar || {};
        const exameFisico = registro.exame_fisico || {};
        const antropometria = registro.antropometria || {};
        const composicao = registro.composicao_corporal || {};
        const exames = registro.exames_laboratoriais || {};
        const estilo = registro.estilo_vida || {};
        const documentoExame = registro.documento_exame || {};
        const anexoUrl = this.safeCloudinaryUrl(documentoExame.anexo?.url);
        const analiseExame = registro.analise_ia_exames?.resultado || null;
        const detalhesDocumento = this.secaoAtiva === 'exames' && documentoExame.anexo ? `
            <section class="anamnese-detail-section exam-history-document">
                <header class="anamnese-detail-section-header"><span class="anamnese-detail-icon" aria-hidden="true">▣</span><div><h3>Documento original e conferência</h3><p>Rastreabilidade dos dados importados</p></div></header>
                <div class="exam-history-file">
                    <div><strong>${this.escapeHtml(documentoExame.anexo.nome || 'Exame anexado')}</strong><small>${documentoExame.leitura?.resultados?.length || 0} resultado(s) extraído(s) · ${documentoExame.confirmado ? 'Dados conferidos' : 'Conferência pendente'}</small></div>
                    ${anexoUrl ? `<a href="${anexoUrl}" target="_blank" rel="noopener noreferrer">Abrir original</a>` : ''}
                </div>
            </section>` : '';
        const detalhesAnalise = this.secaoAtiva === 'exames' && analiseExame ? `
            <section class="anamnese-detail-section exam-history-analysis">
                <header class="anamnese-detail-section-header"><span class="anamnese-detail-icon" aria-hidden="true">✦</span><div><h3>Análise assistida</h3><p>Gerada após a confirmação dos dados</p></div></header>
                <p>${this.escapeHtml(analiseExame.resumo || '')}</p>
                ${analiseExame.achados?.length ? `<ul>${analiseExame.achados.map((item) => `<li><strong>${this.escapeHtml(item.titulo)}</strong> — ${this.escapeHtml(item.descricao)}</li>`).join('')}</ul>` : ''}
                <small>${this.escapeHtml(analiseExame.aviso_profissional || 'A interpretação final cabe ao profissional responsável.')}</small>
            </section>` : '';
        return `<div class="anamnese-detail-summary">${campo('Data da anamnese', registro.data_anamnese)}${campo('Profissional responsável', registro.profissional)}${campo('Paciente', registro.paciente_nome || this.selectedPaciente?.nome)}</div><div class="anamnese-detail-sections">
            ${this.secaoAtiva === 'anamnese' ? secao('✚', 'Histórico clínico', 'Condições de saúde e antecedentes', [campo('Doenças preexistentes', clinico.doencas_preexistentes), campo('Medicamentos em uso', clinico.medicamentos), campo('Cirurgias prévias', clinico.cirurgias), campo('Histórico familiar', clinico.historico_familiar)]) : ''}
            ${this.secaoAtiva === 'anamnese' ? secao('🩺', 'Exame físico nutricional', 'Sinais e sintomas observados durante a consulta', [campo('Achados do exame físico', exameFisico.achados_gerais), campo('Sinais, sintomas e funções', exameFisico.sintomas_funcionais)]) : ''}
            ${this.secaoAtiva === 'consumo' ? secao('◉', 'Consumo alimentar', 'Rotina, hidratação, preferências e restrições', [campo('Hábitos alimentares', alimentar.habitos_alimentares), campo('Consumo de água', alimentar.consumo_agua, 'ml/dia'), campo('Restrições alimentares', alimentar.restricoes), campo('Preferências alimentares', alimentar.preferencias), campo('Suplementos', alimentar.suplementos)]) : ''}
            ${this.secaoAtiva === 'exames' ? secao('⌁', 'Exames laboratoriais', 'Principais marcadores bioquímicos', [campo('Glicemia', exames.glicemia, 'mg/dL'), campo('Colesterol total', exames.colesterol_total, 'mg/dL'), campo('HDL', exames.hdl, 'mg/dL'), campo('LDL', exames.ldl, 'mg/dL'), campo('Triglicerídeos', exames.triglicerideos, 'mg/dL'), campo('Hemoglobina glicada', exames.hemoglobina_glicada, '%'), campo('Vitamina D', exames.vitamina_d, 'ng/mL'), campo('Ferritina', exames.ferritina, 'ng/mL')], 'is-compact') : ''}
            ${detalhesDocumento}
            ${detalhesAnalise}
            ${this.secaoAtiva === 'anamnese' ? secao('☀', 'Estilo de vida', 'Atividade, descanso e bem-estar', [campo('Atividade física', estilo.atividade_fisica), campo('Qualidade do sono', estilo.sono), campo('Hábitos', estilo.habitos), campo('Nível de estresse', estilo.nivel_estresse)]) : ''}
            ${this.secaoAtiva === 'anamnese' ? secao('✎', 'Observações profissionais', 'Considerações complementares da consulta', [campo('Observações', registro.observacoes)], 'is-full') : ''}
        </div>`;
    }

    renderHistoricoAnamneses() {
        const registroAberto = this.anamnesesList.find((registro) => registro.id === this.anamneseExpandida);
        const conteudo = this.anamnesesList.length ? this.anamnesesList.map((registro) => `
            <div class="plano-card" style="background:white; border:2px solid #e2e8f0; border-radius:12px; margin-bottom:16px; overflow:hidden; transition:all .3s ease;">
                <div style="padding:12px 14px; display:flex; align-items:center; justify-content:flex-start; gap:12px; flex-wrap:wrap;">
                    <div><strong>${this.getSecaoConfig().historico.replace('Histórico de ', '')} · ${this.escapeHtml(this.formatarDataHora(registro))}</strong><div style="color:#64748b; font-size:13px; margin-top:3px;">${this.escapeHtml(registro.profissional || '')}${registro.documento_exame?.confirmado ? ' · Anexo conferido' : ''}${registro.analise_ia_exames ? ' · Analisado com IA' : ''}</div></div>
                    <div style="display:flex; align-items:center; gap:8px; margin-left:4px; flex-wrap:wrap;">
                        <button type="button" data-anamnese-detalhes="${this.escapeHtml(registro.id)}" title="Exibir detalhes" aria-label="Exibir detalhes" style="height:36px; padding:0 14px; background:#1a237e; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px; font-weight:700;">Exibir Detalhes</button>
                        <button type="button" data-anamnese-editar="${this.escapeHtml(registro.id)}" style="height:36px; padding:0 14px; background:#e0e7ff; color:#1a237e; border:none; border-radius:8px; cursor:pointer; font-size:14px; font-weight:700;">Editar</button>
                        <button type="button" data-anamnese-excluir="${this.escapeHtml(registro.id)}" style="height:36px; padding:0 14px; background:#fee2e2; color:#b91c1c; border:none; border-radius:8px; cursor:pointer; font-size:14px; font-weight:700;">Excluir</button>
                    </div>
                </div>
            </div>`).join('') : `<p style="color:#64748b; margin:12px 0 0;">Nenhum registro em ${this.getSecaoConfig().historico.toLowerCase()} para este paciente.</p>`;
        const modal = registroAberto ? `
            <div id="modalDetalhesAnamnese" class="anamnese-detail-modal" role="dialog" aria-modal="true" aria-labelledby="tituloDetalhesAnamnese">
                <div class="anamnese-detail-dialog">
                    <div class="anamnese-detail-modal-header">
                        <div><span class="anamnese-detail-eyebrow">Prontuário nutricional</span><h2 id="tituloDetalhesAnamnese">${this.getSecaoConfig().historico}</h2><p>${this.escapeHtml(this.formatarDataHora(registroAberto))} · ${this.escapeHtml(registroAberto.paciente_nome || this.selectedPaciente?.nome || '')}</p></div>
                        <button id="btnFecharDetalhesAnamnese" type="button" aria-label="Fechar detalhes da anamnese">×</button>
                    </div>
                    <div class="anamnese-detail-body">
                        ${this.renderDetalhes(registroAberto)}
                    </div>
                </div>
            </div>` : '';
        return `<section class="evaluation-section" style="margin-bottom:24px;"><div class="section-header"><h3>${this.getSecaoConfig().historico}</h3></div>${conteudo}</section>${modal}`;
    }

    editarAnamnese(id) {
        const registro = this.anamnesesList.find((item) => item.id === id);
        if (!registro) return;
        this.currentAnamnese = registro;
        this.exameWorkflow = this.criarExameWorkflow(registro);
        this.render();
        const titulo = document.getElementById('tituloModalAnamnese');
        if (titulo) titulo.textContent = `Editar — ${this.getSecaoConfig().historico}`;
        const salvar = document.getElementById('saveAnamneseBtn');
        if (salvar) salvar.textContent = 'Salvar Ajustes';
        const dataAnamnese = document.getElementById('dataAnamnese');
        if (dataAnamnese) {
            dataAnamnese.disabled = true;
            dataAnamnese.title = 'A data original do prontuário é preservada durante ajustes.';
        }
        const modal = document.getElementById('modalNovaAnamnese');
        if (modal) modal.style.display = 'flex';
    }

    async excluirAnamnese(id) {
        const registro = this.anamnesesList.find((item) => item.id === id);
        if (!registro || !confirm(`Excluir este registro de ${this.getSecaoConfig().historico.toLowerCase()} (${this.formatarDataHora(registro)})?\n\nEsta ação não pode ser desfeita.`)) return;
        try {
            await deleteDoc(doc(db, 'anamneses_nutricionais', id));
            if (this.currentAnamnese?.id === id) this.currentAnamnese = null;
            this.historicoCarregadoLogin = null;
            await this.loadAnamnese();
        } catch (error) {
            alert('Erro ao excluir: ' + error.message);
        }
    }

    async saveAnamnese() {
        if (!this.selectedPaciente) {
            alert('❌ Selecione um paciente primeiro!');
            return;
        }

        if (this.secaoAtiva === 'exames' && this.exameWorkflow.attachment && !this.exameWorkflow.confirmed) {
            alert('Confira e confirme os dados carregados do anexo antes de salvar.');
            return;
        }

        try {
            const agora = new Date().toISOString();
            const anamneseData = {
                tipo_registro: this.currentAnamnese?.tipo_registro || this.secaoAtiva,
                paciente_login: this.selectedPaciente.login,
                paciente_nome: this.selectedPaciente.nome,
                profissional: this.userInfo.nome,
                profissional_login: this.userInfo.login,
                data_anamnese: this.currentAnamnese?.data_anamnese || document.getElementById('dataAnamnese')?.value || agora.split('T')[0],
                data_criacao: this.currentAnamnese?.data_criacao || this.currentAnamnese?.data_atualizacao || agora,
                data_atualizacao: agora,
                
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

                exame_fisico: {
                    achados_gerais: document.getElementById('achados_exame_fisico')?.value ?? this.currentAnamnese?.exame_fisico?.achados_gerais ?? '',
                    sintomas_funcionais: document.getElementById('sintomas_funcoes')?.value ?? this.currentAnamnese?.exame_fisico?.sintomas_funcionais ?? ''
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

                documento_exame: this.secaoAtiva === 'exames' && this.exameWorkflow.attachment ? {
                    anexo: this.exameWorkflow.attachment,
                    leitura: this.exameWorkflow.extraction ? {
                        ...this.exameWorkflow.extraction,
                        resultados: this.obterResultadosExameDoFormulario()
                    } : null,
                    confirmado: this.exameWorkflow.confirmed,
                    confirmado_em: this.exameWorkflow.confirmedAt,
                    confirmado_por: this.exameWorkflow.confirmed ? this.userInfo.login : null,
                    modelo_leitura: this.exameWorkflow.readingModel
                } : null,
                analise_ia_exames: this.secaoAtiva === 'exames' && this.exameWorkflow.analysis ? {
                    resultado: this.exameWorkflow.analysis,
                    modelo: this.exameWorkflow.analysisModel,
                    analisado_em: this.exameWorkflow.analyzedAt
                } : null,
                
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
                alert('✅ Registro atualizado com sucesso!');
            } else {
                await addDoc(anamneseRef, anamneseData);
                alert('✅ Registro criado com sucesso!');
            }
            
            this.historicoCarregadoLogin = null;
            await this.loadAnamnese();
        } catch (error) {
            alert('❌ Erro ao salvar: ' + error.message);
        }
    }
}
