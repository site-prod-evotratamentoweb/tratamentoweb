import { FuncoesCompartilhadas } from './0_home.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { 
    db, collection, getDocs, query, where, doc, getDoc
} from '../0_firebase_api_config.js';

export class AnamneseCliente {
    constructor(userInfo) {
        this.userInfo = userInfo;
        this.funcoes = FuncoesCompartilhadas;
        this.navegador = criarNavegador(userInfo);
        this.isMenuOpen = false;
        this.anamnese = null;
        this.profissionalInfo = null;
        this.pacienteData = null;
        this.exibirCompleta = false;
    }

    async render() {
        const app = document.getElementById('app');
        
        await this.carregarDadosPaciente();
        await this.carregarAnamnese();
        
        app.innerHTML = this.renderHTML();
        this.attachEvents();
    }

    async carregarDadosPaciente() {
        try {
            const userRef = doc(db, 'logins', this.userInfo.login);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                this.pacienteData = userDoc.data();
                
                if (this.pacienteData.profissionais_vinculados) {
                    for (const [login, info] of Object.entries(this.pacienteData.profissionais_vinculados)) {
                        if (info.cargo === 'nutricionista') {
                            this.profissionalInfo = {
                                login: login,
                                nome: info.nome || login,
                                cargo: info.cargo
                            };
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Erro ao carregar dados do paciente:", error);
        }
    }

    async carregarAnamnese() {
        try {
            const anamneseRef = collection(db, 'anamneses_nutricionais');
            const q = query(anamneseRef, where('paciente_login', '==', this.userInfo.login));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const docs = querySnapshot.docs;
                docs.sort((a, b) => {
                    const dateA = a.data().data_atualizacao || a.data().data_anamnese;
                    const dateB = b.data().data_atualizacao || b.data().data_anamnese;
                    return new Date(dateB) - new Date(dateA);
                });
                this.anamnese = { id: docs[0].id, ...docs[0].data() };
            } else {
                this.anamnese = null;
            }
        } catch (error) {
            console.error("Erro ao carregar anamnese:", error);
            this.anamnese = null;
        }
    }

    formatarNome(nomeCompleto) {
        if (!nomeCompleto) return 'Usuário';
        let primeiroNome = nomeCompleto.trim().split(' ')[0];
        primeiroNome = primeiroNome.toLowerCase();
        primeiroNome = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1);
        return primeiroNome;
    }

    formatarValor(valor) {
        if (valor === null || valor === undefined || valor === '') return '—';
        return valor;
    }

    renderHTML() {
        const nomeFormatado = this.formatarNome(this.userInfo.nome);
        const plano = this.pacienteData?.plano || 'Não informado';
        const temAnamnese = this.anamnese !== null;
        const profissionalNome = this.profissionalInfo?.nome || 'Profissional não vinculado';
        const dataAnamnese = this.anamnese?.data_anamnese 
            ? this.funcoes.formatDateToDisplay(this.anamnese.data_anamnese)
            : 'Não informada';
        
        return `
            <div class="home-container">
                <div class="header">
                    <div class="header-logo">
                        <img src="./imagens/logo.png" alt="TratamentoWeb" class="header-logo-img">
                        <h1>📋 Minha Anamnese</h1>
                    </div>
                    <div class="user-info">
                        <span>👋 Olá, ${nomeFormatado}</span>
                        <button class="menu-toggle-btn" id="menuToggleBtn">☰</button>
                    </div>
                </div>

                <div class="side-menu" id="sideMenu">
                    <div class="menu-header">
                        <h3>Menu</h3>
                        <button class="close-menu" id="closeMenu">×</button>
                    </div>
                    <nav class="menu-nav">
                        <button class="menu-item" data-module="home">
                            <span>🏠</span>
                            <span>Home</span>
                        </button>
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
                        <div class="menu-divider"></div>
                        <button class="menu-item logout" id="logoutMenuItem">
                            <span>🚪</span>
                            <span>Sair</span>
                        </button>
                    </nav>
                </div>
                <div class="menu-overlay" id="menuOverlay"></div>

                <div class="content p-3">
                    <div class="client-info mb-3">
                        <h3>📋 Meus Dados</h3>
                        <div class="info-card">
                            <p><strong>👤 Nome:</strong> ${this.userInfo.nome || 'Não informado'}</p>
                            <p><strong>📅 Idade:</strong> ${this.funcoes.calcularIdade(this.userInfo.dataNascimento) || 'Não informado'} anos</p>
                            <p><strong>📋 Plano:</strong> ${plano}</p>
                            <p><strong>👨‍⚕️ Nutricionista:</strong> ${profissionalNome}</p>
                            ${temAnamnese ? `<p><strong>📅 Data da Anamnese:</strong> ${dataAnamnese}</p>` : ''}
                        </div>
                    </div>

                    ${temAnamnese ? `
                        <div class="anamnese-container">
                            <div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
                                <button id="toggleVisualizacaoBtn" class="btn-small" style="background: #f97316; color: white; border: none; padding: 6px 12px; border-radius: 20px; cursor: pointer;">
                                    ${this.exibirCompleta ? '📋 Ver Resumo' : '🔍 Ver Completa'}
                                </button>
                            </div>

                            ${!this.exibirCompleta ? `
                                <div>
                                    <div class="evaluation-card" style="margin-bottom: 16px;">
                                        <div class="evaluation-date" style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px; margin-bottom: 12px;">
                                            🏥 Histórico Clínico
                                        </div>
                                        <div>
                                            ${this.anamnese?.historico_clinico?.doencas_preexistentes ? 
                                                `<p><strong>🩸 Doenças:</strong> ${this.anamnese.historico_clinico.doencas_preexistentes}</p>` : ''}
                                            ${this.anamnese?.historico_clinico?.medicamentos ? 
                                                `<p><strong>💊 Medicamentos:</strong> ${this.anamnese.historico_clinico.medicamentos}</p>` : ''}
                                            ${!this.anamnese?.historico_clinico?.doencas_preexistentes && !this.anamnese?.historico_clinico?.medicamentos ? 
                                                `<p style="color: #999;">Nenhuma informação cadastrada</p>` : ''}
                                        </div>
                                    </div>

                                    <div class="evaluation-card" style="margin-bottom: 16px;">
                                        <div class="evaluation-date" style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px; margin-bottom: 12px;">
                                            📏 Avaliação Antropométrica
                                        </div>
                                        <div>
                                            ${this.anamnese?.antropometria?.peso_atual ? 
                                                `<p><strong>📏 Peso:</strong> ${this.anamnese.antropometria.peso_atual} kg</p>` : ''}
                                            ${this.anamnese?.antropometria?.altura ? 
                                                `<p><strong>📐 Altura:</strong> ${this.anamnese.antropometria.altura} m</p>` : ''}
                                            ${this.anamnese?.antropometria?.imc ? 
                                                `<p><strong>📊 IMC:</strong> ${this.anamnese.antropometria.imc} - ${this.anamnese.antropometria.classificacao_imc || ''}</p>` : ''}
                                        </div>
                                    </div>

                                    <div class="evaluation-card" style="margin-bottom: 16px;">
                                        <div class="evaluation-date" style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px; margin-bottom: 12px;">
                                            💪 Composição Corporal
                                        </div>
                                        <div>
                                            ${this.anamnese?.composicao_corporal?.massa_muscular ? 
                                                `<p><strong>💪 Massa Muscular:</strong> ${this.anamnese.composicao_corporal.massa_muscular} kg</p>` : ''}
                                            ${this.anamnese?.composicao_corporal?.gordura_corporal ? 
                                                `<p><strong>🧈 Gordura:</strong> ${this.anamnese.composicao_corporal.gordura_corporal}%</p>` : ''}
                                            ${this.anamnese?.composicao_corporal?.agua_corporal ? 
                                                `<p><strong>💧 Água Corporal:</strong> ${this.anamnese.composicao_corporal.agua_corporal}%</p>` : ''}
                                        </div>
                                    </div>
                                </div>
                            ` : `
                                <div>
                                    <div class="evaluation-card" style="margin-bottom: 16px;">
                                        <div class="evaluation-date" style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px; margin-bottom: 12px;">
                                            🏥 1. Histórico Clínico
                                        </div>
                                        <div>
                                            <p><strong>🩸 Doenças Preexistentes:</strong><br>${this.formatarValor(this.anamnese?.historico_clinico?.doencas_preexistentes)}</p>
                                            <p><strong>💊 Medicamentos em Uso:</strong><br>${this.formatarValor(this.anamnese?.historico_clinico?.medicamentos)}</p>
                                            <p><strong>🏥 Cirurgias Prévias:</strong><br>${this.formatarValor(this.anamnese?.historico_clinico?.cirurgias)}</p>
                                            <p><strong>🩺 Histórico Familiar:</strong><br>${this.formatarValor(this.anamnese?.historico_clinico?.historico_familiar)}</p>
                                        </div>
                                    </div>

                                    <div class="evaluation-card" style="margin-bottom: 16px;">
                                        <div class="evaluation-date" style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px; margin-bottom: 12px;">
                                            🍽️ 2. Histórico Alimentar
                                        </div>
                                        <div>
                                            <p><strong>🍳 Hábitos Alimentares:</strong><br>${this.formatarValor(this.anamnese?.historico_alimentar?.habitos_alimentares)}</p>
                                            <p><strong>💧 Consumo de Água:</strong> ${this.formatarValor(this.anamnese?.historico_alimentar?.consumo_agua)} ml/dia</p>
                                            <p><strong>🚫 Restrições Alimentares:</strong><br>${this.formatarValor(this.anamnese?.historico_alimentar?.restricoes)}</p>
                                            <p><strong>❤️ Preferências Alimentares:</strong><br>${this.formatarValor(this.anamnese?.historico_alimentar?.preferencias)}</p>
                                            <p><strong>🥗 Uso de Suplementos:</strong><br>${this.formatarValor(this.anamnese?.historico_alimentar?.suplementos)}</p>
                                        </div>
                                    </div>

                                    <div class="evaluation-card" style="margin-bottom: 16px;">
                                        <div class="evaluation-date" style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px; margin-bottom: 12px;">
                                            📏 3. Avaliação Antropométrica
                                        </div>
                                        <div>
                                            <p><strong>📏 Peso Atual:</strong> ${this.formatarValor(this.anamnese?.antropometria?.peso_atual)} kg</p>
                                            <p><strong>📐 Altura:</strong> ${this.formatarValor(this.anamnese?.antropometria?.altura)} m</p>
                                            <p><strong>⚖️ Peso Habitual:</strong> ${this.formatarValor(this.anamnese?.antropometria?.peso_habitual)} kg</p>
                                            <p><strong>🎯 Peso Desejado:</strong> ${this.formatarValor(this.anamnese?.antropometria?.peso_desejado)} kg</p>
                                            <p><strong>📊 IMC:</strong> ${this.formatarValor(this.anamnese?.antropometria?.imc)} - ${this.formatarValor(this.anamnese?.antropometria?.classificacao_imc)}</p>
                                        </div>
                                    </div>

                                    <div class="evaluation-card" style="margin-bottom: 16px;">
                                        <div class="evaluation-date" style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px; margin-bottom: 12px;">
                                            💪 4. Composição Corporal
                                        </div>
                                        <div>
                                            <p><strong>💪 Massa Muscular:</strong> ${this.formatarValor(this.anamnese?.composicao_corporal?.massa_muscular)} kg</p>
                                            <p><strong>🧈 Gordura Corporal:</strong> ${this.formatarValor(this.anamnese?.composicao_corporal?.gordura_corporal)}%</p>
                                            <p><strong>💧 Água Corporal:</strong> ${this.formatarValor(this.anamnese?.composicao_corporal?.agua_corporal)}%</p>
                                            <p><strong>🦴 Massa Óssea:</strong> ${this.formatarValor(this.anamnese?.composicao_corporal?.massa_ossea)} kg</p>
                                            <p><strong>🔥 Metabolismo Basal:</strong> ${this.formatarValor(this.anamnese?.composicao_corporal?.metabolismo_basal)} kcal</p>
                                            <p><strong>📏 Circunferência Abdominal:</strong> ${this.formatarValor(this.anamnese?.composicao_corporal?.circunferencia_abdominal)} cm</p>
                                        </div>
                                    </div>

                                    <div class="evaluation-card" style="margin-bottom: 16px;">
                                        <div class="evaluation-date" style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px; margin-bottom: 12px;">
                                            🩸 5. Exames Laboratoriais
                                        </div>
                                        <div>
                                            <p><strong>🩸 Glicemia:</strong> ${this.formatarValor(this.anamnese?.exames_laboratoriais?.glicemia)} mg/dL</p>
                                            <p><strong>🩸 Colesterol Total:</strong> ${this.formatarValor(this.anamnese?.exames_laboratoriais?.colesterol_total)} mg/dL</p>
                                            <p><strong>🩸 HDL:</strong> ${this.formatarValor(this.anamnese?.exames_laboratoriais?.hdl)} mg/dL</p>
                                            <p><strong>🩸 LDL:</strong> ${this.formatarValor(this.anamnese?.exames_laboratoriais?.ldl)} mg/dL</p>
                                            <p><strong>🩸 Triglicerídeos:</strong> ${this.formatarValor(this.anamnese?.exames_laboratoriais?.triglicerideos)} mg/dL</p>
                                            <p><strong>🩸 Hemoglobina Glicada:</strong> ${this.formatarValor(this.anamnese?.exames_laboratoriais?.hemoglobina_glicada)}%</p>
                                            <p><strong>🩸 Vitamina D:</strong> ${this.formatarValor(this.anamnese?.exames_laboratoriais?.vitamina_d)} ng/mL</p>
                                            <p><strong>🩸 Ferritina:</strong> ${this.formatarValor(this.anamnese?.exames_laboratoriais?.ferritina)} ng/mL</p>
                                        </div>
                                    </div>

                                    <div class="evaluation-card" style="margin-bottom: 16px;">
                                        <div class="evaluation-date" style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px; margin-bottom: 12px;">
                                            🏃 6. Estilo de Vida
                                        </div>
                                        <div>
                                            <p><strong>🏋️ Atividade Física:</strong><br>${this.formatarValor(this.anamnese?.estilo_vida?.atividade_fisica)}</p>
                                            <p><strong>😴 Qualidade do Sono:</strong><br>${this.formatarValor(this.anamnese?.estilo_vida?.sono)}</p>
                                            <p><strong>🚭 Hábitos:</strong><br>${this.formatarValor(this.anamnese?.estilo_vida?.habitos)}</p>
                                            <p><strong>😊 Nível de Estresse:</strong> ${this.formatarValor(this.anamnese?.estilo_vida?.nivel_estresse)}</p>
                                        </div>
                                    </div>

                                    ${this.anamnese?.observacoes ? `
                                        <div class="evaluation-card" style="margin-bottom: 16px;">
                                            <div class="evaluation-date" style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px; margin-bottom: 12px;">
                                                📝 7. Observações e Condutas
                                            </div>
                                            <div>
                                                <p>${this.anamnese.observacoes}</p>
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            `}
                        </div>
                    ` : `
                        <div class="empty-state" style="text-align: center; padding: 60px; background: white; border-radius: 1rem; margin-top: 20px;">
                            <span class="empty-icon" style="font-size: 48px; opacity: 0.5;">📋</span>
                            <h3 style="margin-top: 16px;">Nenhuma anamnese disponível</h3>
                            <p style="color: #64748b;">Seu nutricionista ainda não cadastrou sua anamnese.</p>
                            <p style="color: #64748b; font-size: 13px; margin-top: 8px;">Entre em contato com seu profissional para realizar sua avaliação nutricional.</p>
                        </div>
                    `}
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

        document.querySelectorAll('.menu-item[data-module]').forEach(item => {
            item.addEventListener('click', async (e) => {
                const module = item.getAttribute('data-module');
                closeMenuFunc();
                await this.navegador.navegarPara(module);
            });
        });

        const logoutMenuItem = document.getElementById('logoutMenuItem');
        if (logoutMenuItem) {
            logoutMenuItem.addEventListener('click', () => {
                closeMenuFunc();
                this.navegador.navegarPara('logout');
            });
        }

        const toggleBtn = document.getElementById('toggleVisualizacaoBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.exibirCompleta = !this.exibirCompleta;
                this.render();
            });
        }
    }
}