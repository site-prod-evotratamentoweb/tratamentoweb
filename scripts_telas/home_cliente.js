import { FuncoesCompartilhadas } from './0_home.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { db, doc, getDoc } from '../0_firebase_api_config.js';

export class HomeCliente {
    constructor(userInfo) {
        this.userInfo = userInfo;
        this.funcoes = FuncoesCompartilhadas;
        this.currentEvaluations = [];
        this.navegador = criarNavegador(userInfo);
        this.isMenuOpen = false;
        
        // Dados adicionais do cliente
        this.plano = '';
        this.profissionaisVinculados = [];
        
        // Gráficos
        this.weightChart = null;
        this.imcChart = null;
        this.muscleChart = null;
    }

    async render() {
        const app = document.getElementById('app');
        await this.carregarDadosAdicionais();
        app.innerHTML = this.renderHTML();
        this.attachEvents();
        this.loadEvaluations();
    }

    async carregarDadosAdicionais() {
        try {
            const userRef = doc(db, 'logins', this.userInfo.login);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const data = userDoc.data();
                this.plano = data.plano || 'Não informado';
                
                // Processar profissionais vinculados (todos independente do cargo)
                this.profissionaisVinculados = [];
                if (data.profissionais_vinculados) {
                    for (const [login, info] of Object.entries(data.profissionais_vinculados)) {
                        this.profissionaisVinculados.push({
                            login: login,
                            nome: info.nome || login,
                            cargo: info.cargo || 'Profissional'
                        });
                    }
                }
                
                // Ordenar: nutricionista primeiro
                this.profissionaisVinculados.sort((a, b) => {
                    if (a.cargo === 'nutricionista') return -1;
                    if (b.cargo === 'nutricionista') return 1;
                    return 0;
                });
            }
        } catch (error) {
            console.error("Erro ao carregar dados adicionais:", error);
            this.plano = 'Erro ao carregar';
            this.profissionaisVinculados = [];
        }
    }

    // Formatar nome: apenas primeiro nome, primeira letra maiúscula
    formatarNome(nomeCompleto) {
        if (!nomeCompleto) return 'Usuário';
        let primeiroNome = nomeCompleto.trim().split(' ')[0];
        primeiroNome = primeiroNome.toLowerCase();
        primeiroNome = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1);
        return primeiroNome;
    }

    renderHTML() {
        const isMembro = this.userInfo.perfil === 'operador_membro' && !this.userInfo.isAdminView;
        const nomeFormatado = this.formatarNome(this.userInfo.nome);
        
        // Verifica se tem nutricionista vinculado
        const temNutricionista = this.profissionaisVinculados.some(prof => prof.cargo === 'nutricionista');
        
        // Renderizar profissionais vinculados com cargo
        const profissionaisHtml = this.profissionaisVinculados.map(prof => {
            const cargo = prof.cargo || 'profissional';
            return `
                <div class="profissional-item">
                    <strong>${cargo}:</strong> ${prof.nome}
                </div>
            `;
        }).join('');
        
        return `
            <div class="home-container">
                <!-- HEADER -->
                <div class="header d-flex justify-content-between align-items-center flex-wrap">
                    <div class="d-flex align-items-center gap-2">
                        <img src="./imagens/logo.png" alt="TratamentoWeb" class="header-logo-img" style="height: 36px; filter: brightness(0) invert(1);">
                    </div>
                    <div class="user-info d-flex align-items-center gap-2">
                        <span class="text-white">👋 Olá, ${nomeFormatado}</span>
                        <button class="menu-toggle-btn d-flex align-items-center justify-content-center" id="menuToggleBtn">☰</button>
                    </div>
                </div>
    
                <!-- MENU LATERAL -->
                <div class="side-menu" id="sideMenu">
                    <div class="menu-header">
                        <h3 class="m-0">Menu</h3>
                        <button class="close-menu" id="closeMenu">×</button>
                    </div>
                    <nav class="menu-nav">
                        <button class="menu-item" data-module="home">
                            <span>🏠</span>
                            <span>Home</span>
                        </button>
                        
                        <!-- SÓ MOSTRA ITENS DE NUTRIÇÃO SE TIVER NUTRICIONISTA VINCULADO -->
                        ${temNutricionista ? `
                            <button class="menu-item" data-module="meu_plano_alimentar">
                                <span>🍽️</span>
                                <span>Meu Plano Alimentar</span>
                            </button>
                            <button class="menu-item" data-module="minha_anamnese">
                                <span>📋</span>
                                <span>Minha Anamnese</span>
                            </button>
                            <button class="menu-item" data-module="shopping_nutri">
                                <span>🛍️</span>
                                <span>Shopping Nutri</span>
                            </button>
                        ` : ''}
                        
                        <button class="menu-item" id="minhaJornadaMenuItem">
                            <span>🌟</span>
                            <span>Minha Jornada</span>
                        </button>
                        ${isMembro ? `
                        <button class="menu-item" id="membroExclusiveMenuItem">
                            <span>⭐</span>
                            <span>Conteúdo Exclusivo</span>
                        </button>
                        ` : ''}
                        <div class="menu-divider"></div>
                        <button class="menu-item logout" id="logoutMenuItem">
                            <span>🚪</span>
                            <span>Sair</span>
                        </button>
                    </nav>
                </div>
                <div class="menu-overlay" id="menuOverlay"></div>
    
                <div class="content p-3">
                    <!-- DADOS DO CLIENTE -->
                    <div class="client-info mb-3">
                        <h3>📋 Meus Dados</h3>
                        <div class="info-card">
                            <p><strong>👤 Nome:</strong> ${this.userInfo.nome || 'Não informado'}</p>
                            <p><strong>📅 Nascimento:</strong> ${this.funcoes.formatDateToDisplay(this.userInfo.dataNascimento) || 'Não informado'}</p>
                            <p><strong>🎂 Idade:</strong> ${this.funcoes.calcularIdade(this.userInfo.dataNascimento) || 'Não informado'} anos</p>
                            <p><strong>📋 Plano:</strong> ${this.plano}</p>
                            <div class="profissionais-container">
                                <p class="mb-2"><strong>👨‍⚕️ Profissionais Vinculados:</strong></p>
                                ${profissionaisHtml || '<p class="text-white-50 mb-0">Nenhum profissional vinculado</p>'}
                            </div>
                        </div>
                    </div>
                    
                    <!-- AVALIAÇÕES -->
                    <div id="clientEvaluations">
                        <h3 class="mb-2" style="font-size: 16px; color: var(--secondary);">📊 Histórico de Avaliações Nutricionais</h3>
                        <div id="evaluationsList"></div>
                    </div>
                    
                    <!-- GRÁFICOS -->
                    ${isMembro ? `
                        <div class="charts-section mt-3">
                            <div class="chart-container mb-3">
                                <h4>📈 Evolução do Peso</h4>
                                <canvas id="weightChart"></canvas>
                            </div>
                            <div class="chart-container mb-3">
                                <h4>📊 Evolução do IMC</h4>
                                <canvas id="imcChart"></canvas>
                            </div>
                            <div class="chart-container">
                                <h4>💪 Evolução da Massa Muscular</h4>
                                <canvas id="muscleChart"></canvas>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
       `;
    }
    
    attachEvents() {
        const menuToggle = document.getElementById('menuToggleBtn');
        const sideMenu = document.getElementById('sideMenu');
        const menuOverlay = document.getElementById('menuOverlay');
        const closeMenu = document.getElementById('closeMenu');
    
        const openMenu = () => {
            if (sideMenu) sideMenu.classList.add('open');
            if (menuOverlay) menuOverlay.classList.add('open');
            this.isMenuOpen = true;
        };
    
        const closeMenuFunc = () => {
            if (sideMenu) sideMenu.classList.remove('open');
            if (menuOverlay) menuOverlay.classList.remove('open');
            this.isMenuOpen = false;
        };
    
        if (menuToggle) menuToggle.addEventListener('click', openMenu);
        if (closeMenu) closeMenu.addEventListener('click', closeMenuFunc);
        if (menuOverlay) menuOverlay.addEventListener('click', closeMenuFunc);
    
        // Eventos para botões com data-module (já tratados pelo navegador)
        document.querySelectorAll('.menu-item[data-module]').forEach(item => {
            item.addEventListener('click', async (e) => {
                const module = item.getAttribute('data-module');
                closeMenuFunc();
                await this.navegador.navegarPara(module);
            });
        });
    
        const minhaJornadaMenuItem = document.getElementById('minhaJornadaMenuItem');
        if (minhaJornadaMenuItem) {
            minhaJornadaMenuItem.addEventListener('click', () => {
                closeMenuFunc();
                this.showMinhaJornada();
            });
        }
    
        const membroExclusiveMenuItem = document.getElementById('membroExclusiveMenuItem');
        if (membroExclusiveMenuItem) {
            membroExclusiveMenuItem.addEventListener('click', () => {
                closeMenuFunc();
                this.showMembroExclusiveContent();
            });
        }
    
        const logoutMenuItem = document.getElementById('logoutMenuItem');
        if (logoutMenuItem) {
            logoutMenuItem.addEventListener('click', () => {
                closeMenuFunc();
                this.navegador.navegarPara('logout');
            });
        }
    }
    
    showMinhaJornada() {
        const evaluations = this.currentEvaluations;
        
        if (evaluations.length === 0) {
            alert('🌟 Minha Jornada\n\nVocê ainda não possui avaliações registradas.\n\nComece sua jornada agendando uma consulta!');
            return;
        }
        
        const totalAvaliacoes = evaluations.length;
        const primeiraAvaliacao = evaluations[0]?.data_avaliacao;
        const ultimaAvaliacao = evaluations[evaluations.length - 1]?.data_avaliacao;
        
        const primeiroPeso = evaluations[0]?.dados_antropometricos?.peso;
        const ultimoPeso = evaluations[evaluations.length - 1]?.dados_antropometricos?.peso;
        let evolucaoPeso = '';
        if (primeiroPeso && ultimoPeso) {
            const diferenca = ultimoPeso - primeiroPeso;
            evolucaoPeso = diferenca < 0 ? `📉 Perdeu ${Math.abs(diferenca).toFixed(1)} kg` : 
                           (diferenca > 0 ? `📈 Ganhou ${diferenca.toFixed(1)} kg` : '⚖️ Peso estável');
        }
        
        const primeiroImc = evaluations[0]?.dados_antropometricos?.imc;
        const ultimoImc = evaluations[evaluations.length - 1]?.dados_antropometricos?.imc;
        let evolucaoImc = '';
        if (primeiroImc && ultimoImc) {
            const diferenca = ultimoImc - primeiroImc;
            evolucaoImc = diferenca < 0 ? `📉 IMC reduziu ${Math.abs(diferenca).toFixed(1)} pontos` : 
                          (diferenca > 0 ? `📈 IMC aumentou ${diferenca.toFixed(1)} pontos` : '⚖️ IMC estável');
        }
        
        const modalHtml = `
            <div id="jornadaModal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 500px;">
                    <span class="close">&times;</span>
                    <h3 style="color: #8b5cf6;">🌟 Minha Jornada de Saúde</h3>
                    <div style="margin-top: 20px;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 16px; color: white; margin-bottom: 20px;">
                            <div style="font-size: 48px; text-align: center; margin-bottom: 10px;">📊</div>
                            <p style="text-align: center; margin: 0;"><strong>${totalAvaliacoes}</strong> avaliações realizadas</p>
                        </div>
                        
                        <div style="display: grid; gap: 15px;">
                            <div style="background: #f1f5f9; padding: 15px; border-radius: 12px;">
                                <strong>📅 Período</strong><br>
                                <span style="color: #475569;">${this.formatDate(primeiraAvaliacao)} até ${this.formatDate(ultimaAvaliacao)}</span>
                            </div>
                            
                            ${evolucaoPeso ? `
                            <div style="background: #f1f5f9; padding: 15px; border-radius: 12px;">
                                <strong>⚖️ Evolução do Peso</strong><br>
                                <span style="color: #475569;">${evolucaoPeso}</span>
                                <div style="margin-top: 5px; font-size: 12px; color: #666;">
                                    ${primeiroPeso} kg → ${ultimoPeso} kg
                                </div>
                            </div>
                            ` : ''}
                            
                            ${evolucaoImc ? `
                            <div style="background: #f1f5f9; padding: 15px; border-radius: 12px;">
                                <strong>📊 Evolução do IMC</strong><br>
                                <span style="color: #475569;">${evolucaoImc}</span>
                                <div style="margin-top: 5px; font-size: 12px; color: #666;">
                                    ${primeiroImc} → ${ultimoImc}
                                </div>
                            </div>
                            ` : ''}
                            
                            <div style="background: #f1f5f9; padding: 15px; border-radius: 12px;">
                                <strong>🏆 Próximos Passos</strong><br>
                                <span style="color: #475569;">Continue acompanhando sua saúde! Agende sua próxima avaliação.</span>
                            </div>
                        </div>
                    </div>
                    <button id="closeJornadaModal" class="submit-btn" style="margin-top: 20px;">Fechar</button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = document.getElementById('jornadaModal');
        const closeBtn = modal.querySelector('.close');
        const closeButton = document.getElementById('closeJornadaModal');
        
        const closeModal = () => modal.remove();
        closeBtn.onclick = closeModal;
        closeButton.onclick = closeModal;
        window.onclick = (event) => { if (event.target === modal) closeModal(); };
    }    

    showModuleMessage(module) {
        const messages = {
            'history': '📜 Histórico de Avaliações\n\nAqui você pode visualizar todo o seu histórico de avaliações realizadas pelos profissionais.',
            'results': '📈 Resultados\n\nAqui você pode acompanhar a evolução dos seus resultados ao longo do tempo.',
            'schedule': '📅 Agendamentos\n\nFuncionalidade em desenvolvimento. Em breve você poderá agendar consultas online!',
            'messages': '💬 Mensagens\n\nFuncionalidade em desenvolvimento. Em breve você poderá se comunicar com seus profissionais!'
        };
        
        alert(messages[module] || `🚧 Módulo "${module}" em desenvolvimento!`);
    }

    showMembroExclusiveContent() {
        const modalHtml = `
            <div id="exclusiveModal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 600px;">
                    <span class="close">&times;</span>
                    <h3 style="color: #ed8936;">⭐ Conteúdo Exclusivo para Membros</h3>
                    <div style="margin-top: 20px;">
                        <p style="margin-bottom: 15px;">🎯 <strong>Planos Alimentares Exclusivos</strong><br>
                        Acesso a planos alimentares personalizados desenvolvidos por nossos nutricionistas.</p>
                        
                        <p style="margin-bottom: 15px;">🏆 <strong>Desafios Especiais</strong><br>
                        Participe de desafios exclusivos e ganhe prêmios ao atingir suas metas.</p>
                        
                        <p style="margin-bottom: 15px;">💎 <strong>Consultoria Prioritária</strong><br>
                        Atendimento prioritário com nossa equipe de profissionais.</p>
                        
                        <p style="margin-bottom: 15px;">📚 <strong>Materiais Educativos</strong><br>
                        Acesso a e-books, vídeos e guias exclusivos sobre nutrição e bem-estar.</p>
                        
                        <p style="margin-bottom: 15px;">🎁 <strong>Brindes e Descontos</strong><br>
                        Receba brindes exclusivos e descontos em parceiros do programa.</p>
                    </div>
                    <button id="closeExclusiveModal" class="submit-btn" style="margin-top: 20px;">Fechar</button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = document.getElementById('exclusiveModal');
        const closeBtn = modal.querySelector('.close');
        const closeButton = document.getElementById('closeExclusiveModal');
        
        const closeModal = () => {
            modal.remove();
        };
        
        closeBtn.onclick = closeModal;
        closeButton.onclick = closeModal;
        
        window.onclick = (event) => {
            if (event.target === modal) {
                closeModal();
            }
        };
    }

    async loadEvaluations() {
        const evaluationsList = document.getElementById('evaluationsList');
        
        if (!evaluationsList) return;
        
        try {
            const evaluations = await this.funcoes.loadEvaluationsByPatient(this.userInfo.login);
            this.currentEvaluations = evaluations;
            
            evaluationsList.innerHTML = '';
            
            if (evaluations.length === 0) {
                evaluationsList.innerHTML = `
                    <div style="text-align: center; padding: 40px; background: white; border-radius: 16px;">
                        <p style="color: #666;">📭 Nenhuma avaliação encontrada.</p>
                        <p style="color: #999; font-size: 14px; margin-top: 10px;">Suas avaliações aparecerão aqui assim que forem registradas pelos profissionais.</p>
                    </div>
                `;
            } else {
                evaluations.forEach((data) => {
                    const card = document.createElement('div');
                    card.className = 'evaluation-card';
                    
                    const dataAvaliacao = data.data_avaliacao ? this.formatDate(data.data_avaliacao) : 'Data não informada';
                    
                    card.innerHTML = `
                        <div class="evaluation-date">
                            📅 ${dataAvaliacao}
                            <span style="float: right; font-size: 12px; color: #f97316;">por: ${data.profissional || 'Profissional'}</span>
                        </div>
                        <div><strong>👨‍⚕️ Profissional:</strong> ${data.profissional || 'Não informado'} (${data.cargo === 'nutricionista' ? 'Nutricionista' : (data.cargo === 'psicologo' ? 'Psicólogo' : data.cargo)})</div>
                        <div class="evaluation-data">
                            <div><strong>📏 Peso:</strong> ${data.dados_antropometricos?.peso || '-'} kg</div>
                            <div><strong>📐 Altura:</strong> ${data.dados_antropometricos?.altura || '-'} m</div>
                            <div><strong>📊 IMC:</strong> ${data.dados_antropometricos?.imc || '-'} - ${data.dados_antropometricos?.classificacao_imc || '-'}</div>
                            ${data.bioimpedancia?.massa_muscular ? `<div><strong>💪 Massa Muscular:</strong> ${data.bioimpedancia.massa_muscular} kg</div>` : ''}
                            ${data.bioimpedancia?.gordura_corporal ? `<div><strong>🧈 Gordura Corporal:</strong> ${data.bioimpedancia.gordura_corporal}%</div>` : ''}
                            ${data.exames_laboratoriais?.glicemia ? `<div><strong>🩸 Glicemia:</strong> ${data.exames_laboratoriais.glicemia} mg/dL</div>` : ''}
                            ${data.exames_laboratoriais?.colesterol_total ? `<div><strong>🩸 Colesterol:</strong> ${data.exames_laboratoriais.colesterol_total} mg/dL</div>` : ''}
                        </div>
                    `;
                    evaluationsList.appendChild(card);
                });
            }
            
            if (this.userInfo.perfil === 'operador_membro' && evaluations.length > 0) {
                this.renderCharts();
            } else if (this.userInfo.perfil === 'operador_membro' && evaluations.length === 0) {
                this.showEmptyCharts();
            }
            
        } catch (error) {
            console.error("Erro ao carregar avaliações:", error);
            evaluationsList.innerHTML = `
                <div style="text-align: center; padding: 40px; background: white; border-radius: 16px;">
                    <p style="color: #dc2626;">❌ Erro ao carregar avaliações.</p>
                    <p style="color: #999; font-size: 14px; margin-top: 10px;">Tente novamente mais tarde.</p>
                </div>
            `;
        }
    }

    formatDate(dateString) {
        if (!dateString) return '';
        if (dateString.includes('/')) return dateString;
        const partes = dateString.split('-');
        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        return dateString;
    }

    showEmptyCharts() {
        const weightCtx = document.getElementById('weightChart')?.getContext('2d');
        const imcCtx = document.getElementById('imcChart')?.getContext('2d');
        const muscleCtx = document.getElementById('muscleChart')?.getContext('2d');
        
        const showEmptyMessage = (ctx) => {
            if (ctx) {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.font = '14px Arial';
                ctx.fillStyle = '#999';
                ctx.textAlign = 'center';
                ctx.fillText('Nenhuma avaliação encontrada', ctx.canvas.width/2, ctx.canvas.height/2);
            }
        };
        
        showEmptyMessage(weightCtx);
        showEmptyMessage(imcCtx);
        showEmptyMessage(muscleCtx);
    }

    renderCharts() {
        if (this.currentEvaluations.length === 0) {
            this.showEmptyCharts();
            return;
        }
        
        if (typeof Chart === 'undefined') {
            setTimeout(() => this.renderCharts(), 500);
            return;
        }
        
        this.createCharts();
    }

    createCharts() {
        const sortedEvaluations = [...this.currentEvaluations].sort((a, b) => 
            new Date(a.data_avaliacao) - new Date(b.data_avaliacao)
        );
        
        const labels = sortedEvaluations.map(e => this.formatDate(e.data_avaliacao));
        const weights = sortedEvaluations.map(e => e.dados_antropometricos?.peso || 0);
        const imcs = sortedEvaluations.map(e => e.dados_antropometricos?.imc || 0);
        const muscles = sortedEvaluations.map(e => e.bioimpedancia?.massa_muscular || 0);
        
        if (this.weightChart) this.weightChart.destroy();
        if (this.imcChart) this.imcChart.destroy();
        if (this.muscleChart) this.muscleChart.destroy();
        
        const weightCtx = document.getElementById('weightChart')?.getContext('2d');
        if (weightCtx) {
            this.weightChart = new Chart(weightCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Peso (kg)',
                        data: weights,
                        borderColor: '#f97316',
                        backgroundColor: 'rgba(249, 115, 22, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
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
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.raw} kg`;
                                }
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
                    labels: labels,
                    datasets: [{
                        label: 'IMC',
                        data: imcs,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
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
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.raw}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            title: {
                                display: true,
                                text: 'IMC'
                            }
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
                        labels: labels,
                        datasets: [{
                            label: 'Massa Muscular (kg)',
                            data: muscles,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 3,
                            tension: 0.4,
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
                            legend: {
                                position: 'top',
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `${context.dataset.label}: ${context.raw} kg`;
                                    }
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
                muscleCtx.fillText('Dados de massa muscular não disponíveis', muscleCtx.canvas.width/2, muscleCtx.canvas.height/2);
            }
        }
    }
}
