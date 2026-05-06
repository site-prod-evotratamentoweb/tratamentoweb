import { FuncoesCompartilhadas } from './0_home.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { 
    db, collection, getDocs, query, where, doc, getDoc
} from '../0_firebase_api_config.js';

export class PlanoAlimentarCliente {
    constructor(userInfo) {
        this.userInfo = userInfo;
        this.funcoes = FuncoesCompartilhadas;
        this.navegador = criarNavegador(userInfo);
        this.isMenuOpen = false;
        this.planoAlimentar = null;
        this.profissionalInfo = null;
        this.pacienteData = null;
    }

    async render() {
        const app = document.getElementById('app');
        
        await this.carregarDadosPaciente();
        await this.carregarPlanoAlimentar();
        
        app.innerHTML = this.renderHTML();
        this.attachEvents();
    }

    async carregarDadosPaciente() {
        try {
            const userRef = doc(db, 'logins', this.userInfo.login);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                this.pacienteData = userDoc.data();
                
                // Buscar informações do profissional nutricionista vinculado
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

    async carregarPlanoAlimentar() {
        try {
            const planosRef = collection(db, 'planos_alimentares');
            const q = query(planosRef, where('paciente_login', '==', this.userInfo.login));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const docs = querySnapshot.docs;
                docs.sort((a, b) => {
                    const dateA = a.data().data_atualizacao || a.data().data_criacao;
                    const dateB = b.data().data_atualizacao || b.data().data_criacao;
                    return new Date(dateB) - new Date(dateA);
                });
                this.planoAlimentar = { id: docs[0].id, ...docs[0].data() };
            } else {
                this.planoAlimentar = null;
            }
        } catch (error) {
            console.error("Erro ao carregar plano alimentar:", error);
            this.planoAlimentar = null;
        }
    }

    formatarNome(nomeCompleto) {
        if (!nomeCompleto) return 'Usuário';
        let primeiroNome = nomeCompleto.trim().split(' ')[0];
        primeiroNome = primeiroNome.toLowerCase();
        primeiroNome = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1);
        return primeiroNome;
    }

    renderHTML() {
        const nomeFormatado = this.formatarNome(this.userInfo.nome);
        const plano = this.pacienteData?.plano || 'Não informado';
        const temPlano = this.planoAlimentar !== null;
        const profissionalNome = this.profissionalInfo?.nome || 'Profissional não vinculado';
        const dataAtualizacao = this.planoAlimentar?.data_atualizacao 
            ? new Date(this.planoAlimentar.data_atualizacao).toLocaleDateString('pt-BR')
            : 'Não informada';
        
        return `
            <div class="home-container">
                <div class="header">
                    <div class="header-logo">
                        <img src="./imagens/logo.png" alt="TratamentoWeb" class="header-logo-img">
                        <h1>🍽️ Meu Plano Alimentar</h1>
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
                            <p><strong>📋 Plano:</strong> ${plano}</p>
                            <p><strong>👨‍⚕️ Nutricionista:</strong> ${profissionalNome}</p>
                            ${temPlano ? `<p><strong>📅 Última atualização:</strong> ${dataAtualizacao}</p>` : ''}
                        </div>
                    </div>

                    ${temPlano ? `
                        <div class="meal-plan-container">
                            <div class="evaluation-card" style="margin-bottom: 16px;">
                                <div class="evaluation-date" style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px; margin-bottom: 12px;">
                                    🌅 Café da Manhã
                                </div>
                                <div style="white-space: pre-wrap; line-height: 1.5;">
                                    ${this.planoAlimentar?.breakfast || '<span style="color: #999;">Nenhuma informação cadastrada</span>'}
                                </div>
                            </div>

                            <div class="evaluation-card" style="margin-bottom: 16px;">
                                <div class="evaluation-date" style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px; margin-bottom: 12px;">
                                    🍎 Lanche da Manhã
                                </div>
                                <div style="white-space: pre-wrap; line-height: 1.5;">
                                    ${this.planoAlimentar?.morningSnack || '<span style="color: #999;">Nenhuma informação cadastrada</span>'}
                                </div>
                            </div>

                            <div class="evaluation-card" style="margin-bottom: 16px;">
                                <div class="evaluation-date" style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px; margin-bottom: 12px;">
                                    🍽️ Almoço
                                </div>
                                <div style="white-space: pre-wrap; line-height: 1.5;">
                                    ${this.planoAlimentar?.lunch || '<span style="color: #999;">Nenhuma informação cadastrada</span>'}
                                </div>
                            </div>

                            <div class="evaluation-card" style="margin-bottom: 16px;">
                                <div class="evaluation-date" style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px; margin-bottom: 12px;">
                                    🍌 Lanche da Tarde
                                </div>
                                <div style="white-space: pre-wrap; line-height: 1.5;">
                                    ${this.planoAlimentar?.afternoonSnack || '<span style="color: #999;">Nenhuma informação cadastrada</span>'}
                                </div>
                            </div>

                            <div class="evaluation-card" style="margin-bottom: 16px;">
                                <div class="evaluation-date" style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px; margin-bottom: 12px;">
                                    🌙 Jantar
                                </div>
                                <div style="white-space: pre-wrap; line-height: 1.5;">
                                    ${this.planoAlimentar?.dinner || '<span style="color: #999;">Nenhuma informação cadastrada</span>'}
                                </div>
                            </div>

                            <div class="evaluation-card" style="margin-bottom: 16px;">
                                <div class="evaluation-date" style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px; margin-bottom: 12px;">
                                    ⭐ Ceia
                                </div>
                                <div style="white-space: pre-wrap; line-height: 1.5;">
                                    ${this.planoAlimentar?.supper || '<span style="color: #999;">Nenhuma informação cadastrada</span>'}
                                </div>
                            </div>

                            ${(this.planoAlimentar?.guidelines || this.planoAlimentar?.restrictions || this.planoAlimentar?.goals) ? `
                                <div class="client-info" style="margin-top: 20px;">
                                    <h3>📌 Informações Complementares</h3>
                                    <div class="info-card">
                                        ${this.planoAlimentar?.guidelines ? `
                                            <div style="margin-bottom: 16px;">
                                                <strong style="color: #f97316;">📝 Orientações Gerais</strong>
                                                <div style="white-space: pre-wrap; margin-top: 8px;">${this.planoAlimentar.guidelines}</div>
                                            </div>
                                        ` : ''}
                                        ${this.planoAlimentar?.restrictions ? `
                                            <div style="margin-bottom: 16px;">
                                                <strong style="color: #f97316;">⚠️ Restrições Alimentares</strong>
                                                <div style="white-space: pre-wrap; margin-top: 8px;">${this.planoAlimentar.restrictions}</div>
                                            </div>
                                        ` : ''}
                                        ${this.planoAlimentar?.goals ? `
                                            <div>
                                                <strong style="color: #f97316;">🎯 Objetivos</strong>
                                                <div style="white-space: pre-wrap; margin-top: 8px;">${this.planoAlimentar.goals}</div>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    ` : `
                        <div class="empty-state" style="text-align: center; padding: 60px; background: white; border-radius: 1rem; margin-top: 20px;">
                            <span class="empty-icon" style="font-size: 48px; opacity: 0.5;">🍽️</span>
                            <h3 style="margin-top: 16px;">Nenhum plano alimentar disponível</h3>
                            <p style="color: #64748b;">Seu nutricionista ainda não cadastrou um plano alimentar para você.</p>
                            <p style="color: #64748b; font-size: 13px; margin-top: 8px;">Entre em contato com seu profissional para receber seu plano personalizado.</p>
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
    }
}