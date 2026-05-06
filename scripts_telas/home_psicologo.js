import { FuncoesCompartilhadas } from './0_home.js';
import { MenuProfissional } from './0_complementos_menu_profissional.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';

export class HomePsicologo {
    constructor(userInfo) {
        this.userInfo = userInfo;
        this.funcoes = FuncoesCompartilhadas;
        this.pacientesList = [];
        this.currentEvaluations = [];
        this.selectedPaciente = null;
        this.psicologiaChart = null;
        this.menu = null;
        this.navegador = criarNavegador(userInfo, this.pacientesList);
    }

    render() {
        const app = document.getElementById('app');
        app.innerHTML = this.renderHTML();
        
        // Atualiza a lista de pacientes no navegador
        this.navegador.pacientesList = this.pacientesList;
        
        // Inicializa o menu e insere no container
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
        return `
            <div class="dashboard-container">
                <!-- O MENU SERÁ INSERIDO AQUI PELO COMPONENTE -->
                <div id="menuContainer"></div>

                <div class="main-content">
                    <div class="evaluation-form" style="text-align: left;">
                        <h3>👤 Selecionar Paciente</h3>
                        <select id="pacienteSelect" class="form-field" style="width: 100%; padding: 12px;">
                            <option value="">-- Selecione --</option>
                        </select>
                    </div>
                    
                    <div id="pacienteInfo" class="info-section" style="display: none;">
                        <h3>📋 Dados do Paciente</h3>
                        <div class="info-grid">
                            <div class="info-card">
                                <span class="info-label">Nome</span>
                                <span class="info-value" id="infoNome"></span>
                            </div>
                            <div class="info-card">
                                <span class="info-label">Login</span>
                                <span class="info-value" id="infoLogin"></span>
                            </div>
                            <div class="info-card">
                                <span class="info-label">Idade</span>
                                <span class="info-value" id="infoIdade"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div id="avaliacaoForm" class="evaluation-section" style="display: none;">
                        <div class="section-header">
                            <h3>📝 Nova Avaliação Psicológica</h3>
                        </div>
                        <form id="psicologiaForm">
                            <div class="form-grid">
                                <div class="form-field">
                                    <label>📅 Data</label>
                                    <input type="date" id="evaluationDate" required>
                                </div>
                                <div class="form-field">
                                    <label>😰 Ansiedade (0-10)</label>
                                    <input type="range" id="ansiedade" min="0" max="10" value="5">
                                    <span id="ansiedadeValue">5</span>
                                </div>
                                <div class="form-field">
                                    <label>😔 Depressão (0-10)</label>
                                    <input type="range" id="depressao" min="0" max="10" value="5">
                                    <span id="depressaoValue">5</span>
                                </div>
                                <div class="form-field">
                                    <label>😫 Estresse (0-10)</label>
                                    <input type="range" id="estresse" min="0" max="10" value="5">
                                    <span id="estresseValue">5</span>
                                </div>
                                <div class="form-field">
                                    <label>💤 Qualidade do Sono (0-10)</label>
                                    <input type="range" id="sono" min="0" max="10" value="5">
                                    <span id="sonoValue">5</span>
                                </div>
                                <div class="form-field full-width">
                                    <label>📝 Observações</label>
                                    <textarea id="observacoes" rows="3" class="form-control"></textarea>
                                </div>
                            </div>
                            <button type="submit" class="btn-primary">💾 Salvar Avaliação</button>
                        </form>
                    </div>
                    
                    <div id="avaliacoesList" class="client-evaluations" style="display: none;">
                        <h3>📊 Histórico de Avaliações</h3>
                        <div id="evaluationsList"></div>
                    </div>
                    
                    <div id="graficosSection" class="charts-section" style="display: none;">
                        <div class="chart-card">
                            <h4>📈 Evolução Psicológica</h4>
                            <canvas id="psicologiaChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL CADASTRO -->
            <div id="registerModal" class="modal" style="display: none;">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h3>📝 Cadastrar Novo Paciente</h3>
                    <form id="registerPacienteForm">
                        <div class="form-field">
                            <label>👤 Nome Completo:</label>
                            <input type="text" id="regNome" class="form-control" required>
                        </div>
                        <div class="form-field">
                            <label>⚥ Sexo:</label>
                            <select id="regSexo" class="form-control" required>
                                <option value="">Selecione</option>
                                <option value="feminino">Feminino</option>
                                <option value="masculino">Masculino</option>
                            </select>
                        </div>
                        <div class="form-field">
                            <label>🔑 Login:</label>
                            <input type="text" id="regLogin" class="form-control" required>
                            <small>⚠️ Login único</small>
                        </div>
                        <div class="form-field">
                            <label>📅 Data Nascimento:</label>
                            <input type="date" id="regDataNascimento" class="form-control" required>
                        </div>
                        <button type="submit" class="btn-primary w-100 mt-3">Cadastrar</button>
                    </form>
                </div>
            </div>
            
            <!-- MODAL LISTA PACIENTES -->
            <div id="listaPacientesModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 800px;">
                    <span class="close">&times;</span>
                    <h3>📋 Lista de Pacientes</h3>
                    <div id="listaPacientesContainer"></div>
                </div>
            </div>
        `;
    }

    attachEvents() {
        // Botões da interface
        const registerBtn = document.getElementById('registerPacienteBtn');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                this.clearRegisterForm();
                this.funcoes.showModal('registerModal');
            });
        }

        const listaBtn = document.getElementById('listaPacientesBtn');
        if (listaBtn) listaBtn.addEventListener('click', () => this.abrirListaPacientes());

        this.funcoes.setupModalEvents('registerModal');
        this.setupListaModalEvents();

        const registerForm = document.getElementById('registerPacienteForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.registerPaciente();
            });
        }

        const select = document.getElementById('pacienteSelect');
        if (select) {
            select.addEventListener('change', async (e) => {
                const login = e.target.value;
                if (login) {
                    this.selectedPaciente = this.pacientesList.find(p => p.login === login);
                    this.displayPacienteInfo();
                    await this.loadEvaluations();
                    document.getElementById('avaliacaoForm').style.display = 'block';
                    document.getElementById('avaliacoesList').style.display = 'block';
                    document.getElementById('graficosSection').style.display = 'block';
                    document.getElementById('evaluationDate').value = new Date().toISOString().split('T')[0];
                } else {
                    this.selectedPaciente = null;
                    document.getElementById('pacienteInfo').style.display = 'none';
                    document.getElementById('avaliacaoForm').style.display = 'none';
                    document.getElementById('avaliacoesList').style.display = 'none';
                    document.getElementById('graficosSection').style.display = 'none';
                }
            });
        }

        // Sliders
        ['ansiedade', 'depressao', 'estresse', 'sono'].forEach(id => {
            const slider = document.getElementById(id);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    const span = document.getElementById(`${id}Value`);
                    if (span) span.textContent = e.target.value;
                });
            }
        });

        const form = document.getElementById('psicologiaForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!this.selectedPaciente) return alert('Selecione um paciente');
                await this.saveEvaluation();
            });
        }
    }

    setupListaModalEvents() {
        const modal = document.getElementById('listaPacientesModal');
        if (!modal) return;
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) closeBtn.onclick = () => this.funcoes.closeModal('listaPacientesModal');
        window.onclick = (event) => { if (event.target === modal) this.funcoes.closeModal('listaPacientesModal'); };
    }

    async abrirListaPacientes() {
        await this.carregarListaPacientes();
        this.funcoes.showModal('listaPacientesModal');
    }

    async carregarListaPacientes() {
        const container = document.getElementById('listaPacientesContainer');
        if (!container) return;
        
        container.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading"></div> Carregando...</div>';
        await this.loadPacientesList();
        
        const tabelaHtml = this.gerarTabelaPacientes(this.pacientesList);
        container.innerHTML = tabelaHtml;
        
        document.querySelectorAll('.btn-ver-codigo').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                await this.visualizarCodigo(btn.getAttribute('data-login'));
            });
        });
        
        document.querySelectorAll('.btn-regerar-codigo').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                await this.regenerarCodigo(btn.getAttribute('data-login'));
            });
        });
        
        document.querySelectorAll('.btn-reset-senha').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                await this.resetarSenhaPaciente(btn.getAttribute('data-login'));
            });
        });
        
        document.querySelectorAll('.btn-ver-token').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                await this.visualizarTokenReset(btn.getAttribute('data-login'));
            });
        });
    }

    gerarTabelaPacientes(pacientesList) {
        if (pacientesList.length === 0) {
            return '<p style="text-align: center; padding: 40px;">Nenhum paciente cadastrado.</p>';
        }
        
        let html = `<div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #1a237e; color: white;">
                        <th style="padding: 12px; text-align: left;">Paciente</th>
                        <th style="padding: 12px; text-align: left;">Login</th>
                        <th style="padding: 12px; text-align: center;">Status</th>
                        <th style="padding: 12px; text-align: center;">Ações</th>
                    </tr>
                </thead>
                <tbody>`;
        
        for (const paciente of pacientesList) {
            const hasPrimeiroAcesso = paciente.hasUltimoLogin;
            const statusBadge = hasPrimeiroAcesso 
                ? '<span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 20px; font-size: 11px;">✅ Já acessou</span>'
                : '<span style="background: #f59e0b; color: white; padding: 4px 8px; border-radius: 20px; font-size: 11px;">⏳ Aguardando 1º acesso</span>';
            
            html += `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 12px;"><strong>${paciente.nome}</strong></td>
                    <td style="padding: 12px;"><code>${paciente.login}</code></td>
                    <td style="padding: 12px; text-align: center;">${statusBadge}</td>
                    <td style="padding: 12px; text-align: center;">`;
            
            if (!hasPrimeiroAcesso) {
                html += `
                    <button class="btn-ver-codigo" data-login="${paciente.login}" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 8px; margin-right: 8px; cursor: pointer;">👁️ Ver Código</button>
                    <button class="btn-regerar-codigo" data-login="${paciente.login}" style="background: #f59e0b; color: white; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer;">🔄 Gerar Código</button>
                `;
            } else {
                html += `
                    <button class="btn-reset-senha" data-login="${paciente.login}" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 8px; margin-right: 8px; cursor: pointer;">🔑 Reset Senha</button>
                    <button class="btn-ver-token" data-login="${paciente.login}" style="background: #8b5cf6; color: white; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer;">👁️ Ver Token</button>
                `;
            }
            
            html += `</td></tr>`;
        }
        
        html += `</tbody></table></div>`;
        return html;
    }

    async visualizarCodigo(login) {
        try {
            const result = await this.funcoes.visualizarCodigoPaciente(login);
            alert(`🔑 CÓDIGO DE ACESSO\n\nPaciente: ${result.nome}\nLogin: ${result.login}\nCódigo: ${result.codigo}\n\nExpira em: ${new Date(result.expiracao).toLocaleString('pt-BR')}`);
        } catch (error) {
            alert(error.message);
        }
    }

    async regenerarCodigo(login) {
        if (!confirm('⚠️ Gerar NOVO código? O anterior será invalidado.')) return;
        try {
            const result = await this.funcoes.regenerarCodigoPaciente(login);
            alert(`✅ NOVO CÓDIGO GERADO!\n\nPaciente: ${result.nome}\nLogin: ${result.login}\nNovo Código: ${result.codigo}`);
            await this.carregarListaPacientes();
        } catch (error) {
            alert(error.message);
        }
    }
   
    async resetarSenhaPaciente(login) {
        if (!confirm(`⚠️ ATENÇÃO!\n\nGerar TOKEN DE RESET DE SENHA para:\n\nPaciente: ${login}\n\nO token será válido por 1 hora.\n\nDeseja continuar?`)) return;
        
        try {
            const result = await this.funcoes.resetarSenhaPaciente(login);
            alert(`🔑 TOKEN DE RESET DE SENHA GERADO!\n\nPaciente: ${result.login}\nToken: ${result.token}\n\n⚠️ Válido por 1 hora\n\nInforme este token ao paciente.`);
            await this.carregarListaPacientes();
        } catch (error) {
            alert(error.message);
        }
    }
    
    async visualizarTokenReset(login) {
        try {
            const result = await this.funcoes.visualizarTokenReset(login);
            alert(`🔑 TOKEN DE RESET DE SENHA\n\nPaciente: ${result.nome}\nLogin: ${result.login}\nToken: ${result.token}\n\n⚠️ Expira em: ${new Date(result.expiracao).toLocaleString('pt-BR')}`);
        } catch (error) {
            alert(error.message);
        }
    }

    clearRegisterForm() {
        ['regNome', 'regLogin', 'regDataNascimento', 'regSexo'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    }

    async registerPaciente() {
        try {
            const result = await this.funcoes.registerPaciente({
                nome: document.getElementById('regNome').value,
                login: document.getElementById('regLogin').value,
                dataNascimento: document.getElementById('regDataNascimento').value,
                sexo: document.getElementById('regSexo').value
            });
            alert(`${result.message}\n\n📋 Login: ${result.login}\n🔑 Código: ${result.codigo}`);
            this.funcoes.closeModal('registerModal');
            await this.loadPacientesList();
        } catch (error) {
            alert('❌ ' + error.message);
        }
    }

    async loadPacientesList() {
        this.pacientesList = await this.funcoes.loadPacientesList();
        // Atualiza a lista no navegador
        this.navegador.pacientesList = this.pacientesList;
        const select = document.getElementById('pacienteSelect');
        if (select) {
            select.innerHTML = '<option value="">-- Selecione um paciente --</option>';
            this.pacientesList.forEach(p => {
                select.appendChild(new Option(`${p.nome} (${p.login})`, p.login));
            });
        }
    }

    displayPacienteInfo() {
        if (!this.selectedPaciente) return;
        document.getElementById('pacienteInfo').style.display = 'block';
        document.getElementById('infoNome').textContent = this.selectedPaciente.nome;
        document.getElementById('infoLogin').textContent = this.selectedPaciente.login;
        document.getElementById('infoIdade').textContent = this.funcoes.calcularIdade(this.selectedPaciente.dataNascimento) || '-';
    }

    async loadEvaluations() {
        if (!this.selectedPaciente) return;
        const all = await this.funcoes.loadEvaluationsByPatient(this.selectedPaciente.login);
        this.currentEvaluations = all.filter(e => e.tipo === 'psicologica');
        this.displayEvaluations();
        this.renderChart();
    }

    displayEvaluations() {
        const container = document.getElementById('evaluationsList');
        if (!container) return;
        if (this.currentEvaluations.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px;">Nenhuma avaliação encontrada.</p>';
            return;
        }
        container.innerHTML = this.currentEvaluations.map(e => `
            <div class="evaluation-card">
                <div class="evaluation-date">📅 ${e.data_avaliacao}</div>
                <div>😰 Ansiedade: ${e.escalas?.ansiedade}/10 | 😔 Depressão: ${e.escalas?.depressao}/10 | 😫 Estresse: ${e.escalas?.estresse}/10 | 💤 Sono: ${e.escalas?.qualidade_sono}/10</div>
                ${e.observacoes ? `<div class="mt-2">📝 ${e.observacoes}</div>` : ''}
            </div>
        `).join('');
    }

    async saveEvaluation() {
        try {
            await this.funcoes.saveNutritionalEvaluation({
                paciente_login: this.selectedPaciente.login,
                paciente_nome: this.selectedPaciente.nome,
                profissional: this.userInfo.nome,
                profissional_login: this.userInfo.login,
                cargo: 'psicologo',
                tipo: 'psicologica',
                data_avaliacao: document.getElementById('evaluationDate').value,
                escalas: {
                    ansiedade: parseInt(document.getElementById('ansiedade').value),
                    depressao: parseInt(document.getElementById('depressao').value),
                    estresse: parseInt(document.getElementById('estresse').value),
                    qualidade_sono: parseInt(document.getElementById('sono').value)
                },
                observacoes: document.getElementById('observacoes').value
            });
            alert('✅ Avaliação salva!');
            await this.loadEvaluations();
            ['ansiedade', 'depressao', 'estresse', 'sono'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = 5;
                const span = document.getElementById(`${id}Value`);
                if (span) span.textContent = '5';
            });
            document.getElementById('observacoes').value = '';
        } catch(e) { 
            alert('Erro: ' + e.message); 
        }
    }

    renderChart() {
        if (this.currentEvaluations.length === 0) return;
        if (typeof Chart === 'undefined') { 
            setTimeout(() => this.renderChart(), 500); 
            return; 
        }
        
        const sorted = [...this.currentEvaluations].sort((a,b) => new Date(a.data_avaliacao) - new Date(b.data_avaliacao));
        const labels = sorted.map(e => e.data_avaliacao);
        const data = {
            ansiedade: sorted.map(e => e.escalas?.ansiedade || 0),
            depressao: sorted.map(e => e.escalas?.depressao || 0),
            estresse: sorted.map(e => e.escalas?.estresse || 0),
            sono: sorted.map(e => e.escalas?.qualidade_sono || 0)
        };
        
        const ctx = document.getElementById('psicologiaChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.psicologiaChart) this.psicologiaChart.destroy();
        
        this.psicologiaChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'Ansiedade', data: data.ansiedade, borderColor: '#ef4444', tension: 0.4, fill: false },
                    { label: 'Depressão', data: data.depressao, borderColor: '#3b82f6', tension: 0.4, fill: false },
                    { label: 'Estresse', data: data.estresse, borderColor: '#f59e0b', tension: 0.4, fill: false },
                    { label: 'Sono', data: data.sono, borderColor: '#10b981', tension: 0.4, fill: false }
                ]
            },
            options: { 
                responsive: true, 
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        max: 10,
                        title: { display: true, text: 'Nível (0-10)' }
                    } 
                } 
            }
        });
    }
}
