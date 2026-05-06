import { FuncoesCompartilhadas } from './0_home.js';
import { MenuProfissional } from './0_complementos_menu_profissional.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';

export class HomeNutricionista {
    constructor(userInfo) {
        this.userInfo = userInfo;
        this.funcoes = FuncoesCompartilhadas;
        this.currentEvaluations = [];
        this.pacientesList = [];
        this.selectedPaciente = null;
        this.menu = null;
        this.navegador = criarNavegador(userInfo, this.pacientesList);
        
        // Gráficos
        this.weightChart = null;
        this.imcChart = null;
        this.muscleChart = null;
        
        // Período
        this.dataInicial = null;
        this.dataFinal = null;
    }

    render() {
        const app = document.getElementById('app');
        app.innerHTML = this.renderHTML();
        
        // Atualiza a lista de pacientes no navegador
        this.navegador.pacientesList = this.pacientesList;
        
        // Inicializa o menu
        this.menu = new MenuProfissional(this.userInfo, (module) => this.navegador.navegarPara(module), 'home');
        const menuHtml = this.menu.render();
        const menuContainer = document.getElementById('menuContainer');
        if (menuContainer) {
            menuContainer.innerHTML = menuHtml;
        }
        this.menu.attachEvents();
        
        this.attachEvents();
        this.loadPacientesList();
    }

    renderHTML() {
        const isPaciente = this.userInfo.cargo === 'paciente';
        
        return `
            <div class="dashboard-container" style="height: 100vh; display: flex; flex-direction: column;">
                <div id="menuContainer"></div>
    
                <div class="main-content" style="flex: 1; overflow-y: auto; padding: 20px 32px;">
                    
                    ${!isPaciente ? `
                    <!-- INFORMAÇÕES DO PACIENTE (com seletor dentro) - APENAS PARA PROFISSIONAIS -->
                    <div id="pacienteInfo" class="info-section" style="margin-bottom: 24px;">
                        
                        <!-- SELETOR DE PACIENTE DENTRO DO CARD -->
                        <div style="margin-bottom: 20px;">
                            <select id="pacienteSelect" style="width: 100%; max-width: 350px; padding: 10px 14px; border-radius: 10px; border: 2px solid #e2e8f0; background: white;">
                                <option value="">-- Selecione um paciente --</option>
                            </select>
                        </div>
    
                        <div class="info-grid">
                            <div class="info-card">
                                <span class="info-label">Nome</span>
                                <span class="info-value" id="infoNome">--</span>
                            </div>
                            <div class="info-card">
                                <span class="info-label">Login</span>
                                <span class="info-value" id="infoLogin">--</span>
                            </div>
                            <div class="info-card">
                                <span class="info-label">Data Nasc.</span>
                                <span class="info-value" id="infoDataNasc">--</span>
                            </div>
                            <div class="info-card">
                                <span class="info-label">Idade</span>
                                <span class="info-value" id="infoIdade">--</span>
                            </div>
                            <div class="info-card">
                                <span class="info-label">Sexo</span>
                                <span class="info-value" id="infoSexo">--</span>
                            </div>
                        </div>
                    </div>
    
                    <!-- SELEÇÃO DE PERÍODO -->
                    <div id="periodoSection" class="evaluation-section" style="display: none; margin-bottom: 24px;">
                        <div style="display: flex; gap: 20px; align-items: flex-end; flex-wrap: wrap;">
                            <div class="form-field">
                                <label>📅 Data Inicial</label>
                                <input type="date" id="dataInicial" class="form-control" style="padding: 10px 14px;">
                            </div>
                            <div class="form-field">
                                <label>📅 Data Final</label>
                                <input type="date" id="dataFinal" class="form-control" style="padding: 10px 14px;">
                            </div>
                        </div>
                    </div>
    
                    <!-- GRÁFICOS -->
                    <div id="chartsSection" class="charts-section" style="display: none;">
                        <div class="chart-card">
                            <h4>📈 Evolução do Peso</h4>
                            <canvas id="weightChart" style="max-height: 300px; width: 100%;"></canvas>
                        </div>
                        <div class="chart-card">
                            <h4>📊 Evolução do IMC</h4>
                            <canvas id="imcChart" style="max-height: 300px; width: 100%;"></canvas>
                        </div>
                        <div class="chart-card">
                            <h4>💪 Evolução da Massa Muscular</h4>
                            <canvas id="muscleChart" style="max-height: 300px; width: 100%;"></canvas>
                        </div>
                    </div>
    
                    <!-- BOTÃO NOVA AVALIAÇÃO -->
                    <div style="position: fixed; bottom: 30px; right: 30px; z-index: 100;">
                        <button id="novaAvaliacaoBtn" class="btn-primary btn-expand">
                            <span>➕</span>
                            <span class="btn-text">Nova Avaliação Nutricional</span>
                        </button>
                    </div>
                    ` : `
                    <!-- MENSAGEM PARA PACIENTE - ACESSO RESTRITO -->
                    <div style="display: flex; justify-content: center; align-items: center; height: 80vh;">
                        <div class="alert alert-warning" style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 1rem; padding: 2rem; text-align: center; max-width: 500px;">
                            <span style="font-size: 48px; display: block; margin-bottom: 16px;">🔒</span>
                            <h3 style="color: #92400e; margin-bottom: 12px;">Acesso Restrito</h3>
                            <p style="color: #78350f;">Você não tem permissão para acessar esta área.</p>
                            <p style="color: #78350f; font-size: 13px; margin-top: 8px;">Apenas profissionais podem visualizar lista de pacientes e realizar avaliações.</p>
                        </div>
                    </div>
                    `}
                </div>
            </div>
    
            <!-- MODAL NOVA AVALIAÇÃO - SÓ APARECE PARA PROFISSIONAIS -->
            ${!isPaciente ? `
            <div id="avaliacaoModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0;">📝 Nova Avaliação Nutricional</h3>
                        <button class="close-modal" style="background: none; border: none; font-size: 28px; cursor: pointer;">&times;</button>
                    </div>
                    <form id="nutritionalForm">
                        <div class="form-grid">
                            <div class="form-field">
                                <label>👤 Paciente</label>
                                <input type="text" id="modalPacienteNome" readonly style="background: #f1f5f9; padding: 12px 14px; border-radius: 10px; border: 2px solid #e2e8f0;">
                            </div>
                            <div class="form-field">
                                <label>📏 Peso (kg)</label>
                                <input type="number" id="weight" step="0.1" required placeholder="Ex: 70.5">
                            </div>
                            <div class="form-field">
                                <label>📐 Altura (m)</label>
                                <input type="number" id="height" step="0.01" required placeholder="Ex: 1.65">
                            </div>
                            <div class="form-field">
                                <label>📊 IMC</label>
                                <input type="text" id="imc" readonly>
                            </div>
                            <div class="form-field">
                                <label>📋 Classificação</label>
                                <input type="text" id="imcClassification" readonly>
                            </div>
                            <div class="form-field">
                                <label>💪 Massa Muscular (kg)</label>
                                <input type="number" id="muscleMass" step="0.1" placeholder="Opcional">
                            </div>
                            <div class="form-field">
                                <label>🧈 Gordura (%)</label>
                                <input type="number" id="bodyFat" step="0.1" placeholder="Opcional">
                            </div>
                            <div class="form-field">
                                <label>🩸 Glicemia (mg/dL)</label>
                                <input type="number" id="glucose" placeholder="Opcional">
                            </div>
                            <div class="form-field">
                                <label>🩸 Colesterol (mg/dL)</label>
                                <input type="number" id="cholesterol" placeholder="Opcional">
                            </div>
                        </div>
                        <div class="form-actions" style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
                            <button type="button" class="btn-secondary" id="cancelarModalBtn">Cancelar</button>
                            <button type="submit" class="btn-primary">💾 Salvar Avaliação</button>
                        </div>
                    </form>
                </div>
            </div>
            ` : ''}
        `;
    }

    attachEvents() {
        // 🔒 Se for paciente, não carrega eventos de profissional
        if (this.userInfo.cargo === 'paciente') {
            console.log('🔒 Paciente não tem permissão para usar esta tela');
            
            // Apenas configura o logout e menu
            const logoutMenuItem = document.getElementById('logoutMenuItem');
            if (logoutMenuItem) {
                logoutMenuItem.addEventListener('click', () => {
                    this.navegador.navegarPara('logout');
                });
            }
            
            // Configura menu se existir
            const menuToggle = document.getElementById('menuToggleBtn');
            const sideMenu = document.getElementById('sideMenu');
            const menuOverlay = document.getElementById('menuOverlay');
            const closeMenu = document.getElementById('closeMenu');
            
            if (menuToggle) menuToggle.addEventListener('click', () => sideMenu?.classList.add('open'));
            if (closeMenu) closeMenu.addEventListener('click', () => sideMenu?.classList.remove('open'));
            if (menuOverlay) menuOverlay.addEventListener('click', () => sideMenu?.classList.remove('open'));
            
            return; // 🔒 SAI AQUI - Não carrega eventos de profissional
        }
        
        // Seletor de paciente
        const pacienteSelect = document.getElementById('pacienteSelect');
        if (pacienteSelect) {
            pacienteSelect.addEventListener('change', async (e) => {
                const login = e.target.value;
                if (login) {
                    this.selectedPaciente = this.pacientesList.find(p => p.login === login);
                    this.displayPacienteInfo();
                    await this.loadEvaluationData();
                    document.getElementById('periodoSection').style.display = 'block';
                    document.getElementById('chartsSection').style.display = 'grid';
                } else {
                    this.selectedPaciente = null;
                    this.limparInfoPaciente();
                    document.getElementById('periodoSection').style.display = 'none';
                    document.getElementById('chartsSection').style.display = 'none';
                    this.currentEvaluations = [];
                    this.limparGraficos();
                }
            });
        }

        // Datas - ao mudar, atualiza automaticamente
        const dataInicialInput = document.getElementById('dataInicial');
        const dataFinalInput = document.getElementById('dataFinal');

        if (dataInicialInput) {
            dataInicialInput.addEventListener('change', () => {
                this.dataInicial = dataInicialInput.value;
                this.filtrarEvolucaoPorPeriodo();
            });
        }

        if (dataFinalInput) {
            dataFinalInput.addEventListener('change', () => {
                this.dataFinal = dataFinalInput.value;
                this.filtrarEvolucaoPorPeriodo();
            });
        }

        // Botão Nova Avaliação
        const novaAvaliacaoBtn = document.getElementById('novaAvaliacaoBtn');
        const modal = document.getElementById('avaliacaoModal');
        const closeModal = document.querySelector('.close-modal');
        const cancelarBtn = document.getElementById('cancelarModalBtn');

        if (novaAvaliacaoBtn) {
            novaAvaliacaoBtn.addEventListener('click', () => {
                if (!this.selectedPaciente) {
                    alert('❌ Selecione um paciente primeiro!');
                    return;
                }
                document.getElementById('modalPacienteNome').value = this.selectedPaciente.nome;
                this.limparFormularioAvaliacao();
                modal.style.display = 'flex';
            });
        }

        if (closeModal) closeModal.onclick = () => modal.style.display = 'none';
        if (cancelarBtn) cancelarBtn.onclick = () => modal.style.display = 'none';
        
        window.onclick = (event) => {
            if (event.target === modal) modal.style.display = 'none';
        };

        // Form de avaliação
        const form = document.getElementById('nutritionalForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveNutritionalEvaluation();
                modal.style.display = 'none';
            });
        }

        // Cálculo automático de IMC
        const weightInput = document.getElementById('weight');
        const heightInput = document.getElementById('height');
        const calculateFields = () => { if (this.selectedPaciente) this.calculateNutritionalParameters(); };
        if (weightInput && heightInput) {
            weightInput.addEventListener('input', calculateFields);
            heightInput.addEventListener('input', calculateFields);
        }
    }

    limparInfoPaciente() {
        document.getElementById('infoNome').textContent = '--';
        document.getElementById('infoLogin').textContent = '--';
        document.getElementById('infoDataNasc').textContent = '--';
        document.getElementById('infoIdade').textContent = '--';
        document.getElementById('infoSexo').textContent = '--';
    }

    limparGraficos() {
        ['weightChart', 'imcChart', 'muscleChart'].forEach(id => {
            const ctx = document.getElementById(id)?.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.font = '14px Arial';
                ctx.fillStyle = '#999';
                ctx.textAlign = 'center';
                ctx.fillText('Nenhum paciente selecionado', ctx.canvas.width / 2, ctx.canvas.height / 2);
            }
        });
    }

    limparFormularioAvaliacao() {
        const ids = ['weight', 'height', 'muscleMass', 'bodyFat', 'glucose', 'cholesterol', 'imc', 'imcClassification'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    }

    filtrarEvolucaoPorPeriodo() {
        if (!this.currentEvaluations || this.currentEvaluations.length === 0) {
            this.mostrarMensagemSemDados();
            return;
        }

        let filtered = [...this.currentEvaluations];
        
        if (this.dataInicial) {
            filtered = filtered.filter(e => e.data_avaliacao >= this.dataInicial);
        }
        if (this.dataFinal) {
            filtered = filtered.filter(e => e.data_avaliacao <= this.dataFinal);
        }

        if (filtered.length === 0) {
            this.mostrarMensagemSemDadosPeriodo();
            return;
        }

        this.renderChartsWithData(filtered);
    }

    mostrarMensagemSemDadosPeriodo() {
        const mensagem = 'Nenhuma avaliação encontrada no período selecionado';
        ['weightChart', 'imcChart', 'muscleChart'].forEach(id => {
            const ctx = document.getElementById(id)?.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.font = '14px Arial';
                ctx.fillStyle = '#999';
                ctx.textAlign = 'center';
                ctx.fillText(mensagem, ctx.canvas.width / 2, ctx.canvas.height / 2);
            }
        });
    }

    mostrarMensagemSemDados() {
        const mensagem = 'Nenhuma avaliação encontrada';
        ['weightChart', 'imcChart', 'muscleChart'].forEach(id => {
            const ctx = document.getElementById(id)?.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.font = '14px Arial';
                ctx.fillStyle = '#999';
                ctx.textAlign = 'center';
                ctx.fillText(mensagem, ctx.canvas.width / 2, ctx.canvas.height / 2);
            }
        });
    }

    async loadPacientesList() {
        this.pacientesList = await this.funcoes.loadPacientesList();
        // Atualiza a lista no navegador
        this.navegador.pacientesList = this.pacientesList;
        this.populatePacienteSelect();
    }

    populatePacienteSelect() {
        const select = document.getElementById('pacienteSelect');
        if (!select) return;
        select.innerHTML = '<option value="">-- Selecione um paciente --</option>';
        this.pacientesList.forEach(p => {
            select.appendChild(new Option(`${p.nome} (${p.login})`, p.login));
        });
    }

    displayPacienteInfo() {
        if (!this.selectedPaciente) return;
        document.getElementById('infoNome').textContent = this.selectedPaciente.nome || '--';
        document.getElementById('infoLogin').textContent = this.selectedPaciente.login || '--';
        document.getElementById('infoDataNasc').textContent = this.funcoes.formatDateToDisplay(this.selectedPaciente.dataNascimento) || '--';
        document.getElementById('infoSexo').textContent = this.selectedPaciente.sexo || '--';
        document.getElementById('infoIdade').textContent = this.funcoes.calcularIdade(this.selectedPaciente.dataNascimento) || '--';

        this.definirPeriodoPadrao();
    }

    definirPeriodoPadrao() {
        const dataInicialInput = document.getElementById('dataInicial');
        const dataFinalInput = document.getElementById('dataFinal');
        
        if (this.currentEvaluations.length > 0) {
            const primeiraData = this.currentEvaluations[0]?.data_avaliacao;
            const ultimaData = this.currentEvaluations[this.currentEvaluations.length - 1]?.data_avaliacao;
            
            if (dataInicialInput && primeiraData) dataInicialInput.value = primeiraData;
            if (dataFinalInput && ultimaData) dataFinalInput.value = ultimaData;
            
            this.dataInicial = primeiraData || null;
            this.dataFinal = ultimaData || null;
        } else {
            if (dataInicialInput) dataInicialInput.value = '';
            if (dataFinalInput) dataFinalInput.value = '';
            this.dataInicial = null;
            this.dataFinal = null;
        }
    }

    calculateNutritionalParameters() {
        const weight = parseFloat(document.getElementById('weight').value);
        const height = parseFloat(document.getElementById('height').value);
        const idade = parseInt(document.getElementById('infoIdade').textContent) || 30;
        const sexo = this.selectedPaciente?.sexo || 'feminino';
        const params = this.funcoes.calculateNutritionalParameters(weight, height, idade, sexo);
        if (params) {
            document.getElementById('imc').value = params.imc;
            document.getElementById('imcClassification').value = params.classification;
        }
    }

    async saveNutritionalEvaluation() {
        try {
            await this.funcoes.saveNutritionalEvaluation({
                paciente_login: this.selectedPaciente.login,
                paciente_nome: this.selectedPaciente.nome || '',
                profissional: this.userInfo.nome || '',
                profissional_login: this.userInfo.login || '',
                cargo: 'nutricionista',
                data_avaliacao: new Date().toISOString().split('T')[0],
                dados_antropometricos: {
                    peso: parseFloat(document.getElementById('weight').value) || 0,
                    altura: parseFloat(document.getElementById('height').value) || 0,
                    imc: parseFloat(document.getElementById('imc').value) || 0,
                    classificacao_imc: document.getElementById('imcClassification').value || ''
                },
                bioimpedancia: {
                    massa_muscular: parseFloat(document.getElementById('muscleMass').value) || null,
                    gordura_corporal: parseFloat(document.getElementById('bodyFat').value) || null
                },
                exames_laboratoriais: {
                    glicemia: parseFloat(document.getElementById('glucose').value) || null,
                    colesterol_total: parseFloat(document.getElementById('cholesterol').value) || null
                }
            });
            alert('✅ Avaliação salva com sucesso!');
            await this.loadEvaluationData();
            this.definirPeriodoPadrao();
        } catch (error) {
            alert('❌ Erro: ' + error.message);
        }
    }

    async loadEvaluationData() {
        if (!this.selectedPaciente) return;
        this.currentEvaluations = await this.funcoes.loadEvaluationsByPatient(this.selectedPaciente.login);
        
        if (this.currentEvaluations.length === 0) {
            this.mostrarMensagemSemDados();
            return;
        }
        
        this.renderCharts();
    }

    renderCharts() {
        if (this.currentEvaluations.length === 0) {
            this.mostrarMensagemSemDados();
            return;
        }
        if (typeof Chart === 'undefined') { 
            setTimeout(() => this.renderCharts(), 500); 
            return; 
        }
        this.createChartsWithData(this.currentEvaluations);
    }

    createChartsWithData(evaluations) {
        const labels = evaluations.map(e => e.data_avaliacao);
        const weights = evaluations.map(e => e.dados_antropometricos?.peso || 0);
        const imcs = evaluations.map(e => e.dados_antropometricos?.imc || 0);
        const muscles = evaluations.map(e => e.bioimpedancia?.massa_muscular || 0);
        
        if (this.weightChart) this.weightChart.destroy();
        if (this.imcChart) this.imcChart.destroy();
        if (this.muscleChart) this.muscleChart.destroy();
        
        const weightCtx = document.getElementById('weightChart')?.getContext('2d');
        if (weightCtx) {
            this.weightChart = new Chart(weightCtx, {
                type: 'line', 
                data: { 
                    labels, 
                    datasets: [{ 
                        label: 'Peso (kg)', 
                        data: weights, 
                        borderColor: '#f97316', 
                        backgroundColor: 'rgba(249, 115, 22, 0.1)',
                        borderWidth: 3, 
                        tension: 0.3, 
                        fill: true,
                        pointBackgroundColor: '#f97316',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }] 
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.dataset.label}: ${context.raw} kg`
                            }
                        }
                    }
                }
            });
        }
        
        const imcCtx = document.getElementById('imcChart')?.getContext('2d');
        if (imcCtx) {
            this.imcChart = new Chart(imcCtx, {
                type: 'line', 
                data: { 
                    labels, 
                    datasets: [{ 
                        label: 'IMC', 
                        data: imcs, 
                        borderColor: '#3b82f6', 
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3, 
                        tension: 0.3, 
                        fill: true,
                        pointBackgroundColor: '#3b82f6',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }] 
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        y: {
                            beginAtZero: false,
                            title: { display: true, text: 'IMC' }
                        }
                    }
                }
            });
        }
        
        const muscleCtx = document.getElementById('muscleChart')?.getContext('2d');
        if (muscleCtx) {
            const hasMuscleData = muscles.some(m => m > 0);
            if (hasMuscleData) {
                this.muscleChart = new Chart(muscleCtx, {
                    type: 'line', 
                    data: { 
                        labels, 
                        datasets: [{ 
                            label: 'Massa Muscular (kg)', 
                            data: muscles, 
                            borderColor: '#10b981', 
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 3, 
                            tension: 0.3, 
                            fill: true,
                            pointBackgroundColor: '#10b981',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            pointRadius: 5,
                            pointHoverRadius: 7
                        }] 
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: (context) => `${context.dataset.label}: ${context.raw} kg`
                                }
                            }
                        }
                    }
                });
            } else {
                muscleCtx.clearRect(0, 0, muscleCtx.canvas.width, muscleCtx.canvas.height);
                muscleCtx.font = '14px Arial';
                muscleCtx.fillStyle = '#999';
                muscleCtx.textAlign = 'center';
                muscleCtx.fillText('Dados de massa muscular não disponíveis', muscleCtx.canvas.width / 2, muscleCtx.canvas.height / 2);
            }
        }
    }
}
