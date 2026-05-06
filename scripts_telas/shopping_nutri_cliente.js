import { FuncoesCompartilhadas } from './0_home.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { 
    db, collection, addDoc, getDocs, query, where, 
    doc, updateDoc, getDoc, setDoc, uploadParaImgbb
} from '../0_firebase_api_config.js';
import { carregarModeloIA, analisarImagemComIA, isModeloCarregado } from './0_ia_tensorflowjs.js';

export class ShoppingNutriCliente {
    constructor(userInfo) {
        this.userInfo = userInfo;
        this.funcoes = FuncoesCompartilhadas;
        this.navegador = criarNavegador(userInfo);
        this.isMenuOpen = false;
        
        // Dados do usuário
        this.userPontos = 0;
        this.userNivel = 1;
        this.userExperiencia = 0;
        
        // Itens disponíveis
        this.itensDisponiveis = [];
        
        // Histórico de transações
        this.historicoTransacoes = [];
        
        // Status da roleta diária
        this.roletaDisponivel = true;
        this.ultimaRoleta = null;
        
        // Desafios diários (comuns)
        this.desafiosDiarios = [];
        
        // Desafios com foto (múltiplos)
        this.desafiosFoto = [];
        this.desafioSelecionado = null;
        this.streamCamera = null;
        this.fotoTemp = null;
        this.carregandoIA = false;
        
        // Participações do usuário nos desafios
        this.participacoesDesafios = new Map();
        
        // Conteúdo gamificado
        this.configGamificacao = null;
        
        // Variáveis da roleta
        this.roletaCanvas = null;
        this.roletaCtx = null;
        this.roletaAnguloAtual = 0;
        this.roletaGirando = false;
        this.roletaAnimacaoId = null;
        this.roletaPremios = [];
        this.roletaCores = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
            '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8C471', '#A9DFBF'
        ];
        
        this.currentSlideIndex = 0;
        this.totalSlides = 0;
    }

    async render() {
        const app = document.getElementById('app');
        
        await this.carregarDadosUsuario();
        await this.carregarItensDisponiveis();
        await this.carregarHistorico();
        await this.carregarConfigGamificacao();
        await this.verificarRoletaDiaria();
        await this.carregarDesafiosDiarios();
        await this.carregarDesafiosFoto();
        await this.carregarParticipacoesUsuario();
        
        app.innerHTML = this.renderHTML();
        this.attachEvents();
        this.inicializarRoleta();
        this.inicializarCarrossel();
    }

    formatarNome(nomeCompleto) {
        if (!nomeCompleto) return 'Usuário';
        let primeiroNome = nomeCompleto.trim().split(' ')[0];
        primeiroNome = primeiroNome.toLowerCase();
        primeiroNome = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1);
        return primeiroNome;
    }

    renderHTML() {
        const experienciaParaProxNivel = this.userNivel * 100;
        const progressoExp = (this.userExperiencia / experienciaParaProxNivel) * 100;
        const nomeFormatado = this.formatarNome(this.userInfo.nome);
        
        this.roletaPremios = this.configGamificacao?.roleta_premios || [5, 10, 15, 20, 25, 50, 100];
        
        const desafiosDisponiveis = this.desafiosFoto.filter(desafio => {
            const disponivel = this.verificarDisponibilidadeDesafioFoto(desafio);
            const participacoesRestantes = this.getParticipacoesRestantes(desafio);
            return disponivel && participacoesRestantes > 0;
        });
        
        const desafiosIndisponiveis = this.desafiosFoto.filter(desafio => {
            const disponivel = this.verificarDisponibilidadeDesafioFoto(desafio);
            const participacoesRestantes = this.getParticipacoesRestantes(desafio);
            return !disponivel || participacoesRestantes === 0;
        });
        
        this.totalSlides = desafiosDisponiveis.length + desafiosIndisponiveis.length;
    
        return `
            <div class="home-container">
                <!-- HEADER PADRÃO IGUAL A HOME -->
                <div class="header">
                    <div class="header-logo">
                        <img src="./imagens/logo.png" alt="TratamentoWeb" class="header-logo-img">
                        <h1>🛍️ Shopping Nutri</h1>
                    </div>
                    <div class="user-info">
                        <span>👋 Olá, ${nomeFormatado}</span>
                        <button class="menu-toggle-btn" id="menuToggleBtn">☰</button>
                    </div>
                </div>
    
                <!-- MENU LATERAL -->
                <div class="side-menu" id="sideMenu">
                    <div class="menu-header">
                        <h3>Menu</h3>
                        <button class="close-menu" id="closeMenu">×</button>
                    </div>
                    <nav class="menu-nav">
                        <button class="menu-item" data-module="home">
                            <span class="menu-icon">🏠</span>
                            <span>Home</span>
                        </button>
                        <button class="menu-item" data-module="meu_plano_alimentar">
                            <span class="menu-icon">🍽️</span>
                            <span>Meu Plano Alimentar</span>
                        </button>
                        <button class="menu-item" data-module="minha_anamnese">
                            <span class="menu-icon">📋</span>
                            <span>Minha Anamnese</span>
                        </button>
                        <button class="menu-item" data-module="shopping_nutri">
                            <span class="menu-icon">🛍️</span>
                            <span>Shopping Nutri</span>
                        </button>
                        <button class="menu-item" id="minhaJornadaMenuItem">
                            <span class="menu-icon">🌟</span>
                            <span>Minha Jornada</span>
                        </button>
                        <div class="menu-divider"></div>
                        <button class="menu-item logout" id="logoutMenuItem">
                            <span class="menu-icon">🚪</span>
                            <span>Sair</span>
                        </button>
                    </nav>
                </div>
                <div class="menu-overlay" id="menuOverlay"></div>
    
                <!-- CONTEÚDO PRINCIPAL -->
                <div class="content">
                    <!-- CARD DE PONTOS E NÍVEL -->
                    <div class="client-info" style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); margin-bottom: 20px;">
                        <h3>⭐ MEUS PONTOS</h3>
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                            <div style="font-size: 36px; font-weight: bold;" id="userPontosDisplay">${this.userPontos}</div>
                            <div style="text-align: center;">
                                <div>🏆 NÍVEL</div>
                                <div style="font-size: 24px; font-weight: bold;" id="userNivelDisplay">${this.userNivel}</div>
                            </div>
                            <div style="flex: 1; min-width: 150px;">
                                <div style="font-size: 12px;">📈 Próximo nível: ${this.userNivel + 1}</div>
                                <div style="background: rgba(255,255,255,0.3); border-radius: 10px; height: 6px; margin-top: 5px;">
                                    <div style="background: white; width: ${progressoExp}%; height: 100%; border-radius: 10px;"></div>
                                </div>
                                <div style="font-size: 11px; margin-top: 5px;">${this.userExperiencia}/${experienciaParaProxNivel} XP</div>
                            </div>
                        </div>
                    </div>
    
                    <!-- DESAFIOS COM FOTO (CARROSSEL) -->
                    ${this.desafiosFoto.length > 0 ? `
                    <div style="margin-bottom: 20px;">
                        <h3 style="font-size: 16px; margin-bottom: 12px; color: white;">📸 Desafios com Foto</h3>
                        <div class="carrossel-container" style="position: relative; overflow: hidden;">
                            <div class="carrossel-wrapper" id="desafiosCarrossel" style="display: flex; transition: transform 0.3s ease;">
                                ${desafiosDisponiveis.map(desafio => `
                                    <div class="carrossel-slide" style="min-width: 100%; padding: 0 4px;">
                                        <div class="evaluation-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border-left-color: white;">
                                            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                                                <div style="font-size: 40px;">📸</div>
                                                <div style="flex: 1;">
                                                    <div style="font-weight: bold; margin-bottom: 5px;">${desafio.titulo || 'Desafio Especial'}</div>
                                                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">${desafio.descricao || ''}</div>
                                                    <div style="display: flex; gap: 8px; flex-wrap: wrap; font-size: 11px;">
                                                        <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 20px;">⭐ +${desafio.pontos || 50}</span>
                                                        <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 20px;">⏰ ${this.formatarHorarioDesafio(desafio)}</span>
                                                        <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 20px;">🎯 ${this.getParticipacoesRestantes(desafio)}/${desafio.quantidade_permitida || 1}</span>
                                                    </div>
                                                </div>
                                                <button class="participar-desafio-btn" data-desafio-id="${desafio.id}" style="background: white; color: #7c3aed; border: none; padding: 8px 16px; border-radius: 30px; font-weight: bold; cursor: pointer;">📷 Participar</button>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                                ${desafiosIndisponiveis.map(desafio => `
                                    <div class="carrossel-slide" style="min-width: 100%; padding: 0 4px;">
                                        <div class="evaluation-card" style="background: #6b7280; color: white; opacity: 0.7; border-left-color: #9ca3af;">
                                            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                                                <div style="font-size: 40px;">🔒</div>
                                                <div style="flex: 1;">
                                                    <div style="font-weight: bold; margin-bottom: 5px;">${desafio.titulo || 'Desafio Especial'}</div>
                                                    <div style="font-size: 12px; opacity: 0.9;">${desafio.descricao || ''}</div>
                                                    <div style="margin-top: 5px; font-size: 11px;">⭐ +${desafio.pontos || 50}</div>
                                                </div>
                                                <button class="btn-disabled" disabled style="background: #9ca3af; color: white; border: none; padding: 8px 16px; border-radius: 30px;">🔒 Indisponível</button>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            ${this.totalSlides > 1 ? `
                            <button class="carrossel-prev" style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; z-index: 10;">◀</button>
                            <button class="carrossel-next" style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; z-index: 10;">▶</button>
                            <div class="carrossel-dots" style="display: flex; justify-content: center; gap: 6px; margin-top: 10px;"></div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}
    
                    <!-- ROLETA ANIMADA -->
                    <div class="client-info" style="margin-bottom: 20px; text-align: center;">
                        <h3>🎡 Roleta da Sorte</h3>
                        <p style="font-size: 12px; opacity: 0.9; margin-bottom: 16px;">Gire a roleta uma vez por dia e ganhe pontos!</p>
                        
                        <div style="position: relative; display: inline-block;">
                            <canvas id="roletaCanvas" width="280" height="280" style="max-width: 100%; height: auto; border-radius: 50%; background: white;"></canvas>
                            
                            <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 12px solid transparent; border-right: 12px solid transparent; border-top: 25px solid #f97316; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3)); z-index: 10;">
                            </div>
                            
                            <button id="girarRoletaBtn" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 55px; height: 55px; border-radius: 50%; background: linear-gradient(135deg, #f97316, #ea580c); color: white; border: none; font-size: 12px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 20;" ${!this.roletaDisponivel ? 'disabled style="opacity:0.5;"' : ''}>
                                ${this.roletaDisponivel ? 'GIRAR' : '✓'}
                            </button>
                        </div>
                        
                        ${!this.roletaDisponivel ? '<p style="margin-top: 12px; font-size: 11px; color: #10b981;">✅ Você já girou hoje! Volte amanhã!</p>' : ''}
                    </div>
    
                    <!-- DESAFIOS DIÁRIOS -->
                    <div class="client-info" style="margin-bottom: 20px;">
                        <h3>⭐ Desafios Diários</h3>
                        <div id="desafiosList">
                            ${this.renderDesafios()}
                        </div>
                    </div>
    
                    <!-- LOJA DE ITENS -->
                    <div class="client-info" style="margin-bottom: 20px;">
                        <h3>🛍️ Trocar Pontos</h3>
                        <div id="itensLoja" style="display: flex; flex-direction: column; gap: 10px;">
                            ${this.renderItensLoja()}
                        </div>
                    </div>
    
                    <!-- HISTÓRICO -->
                    <div class="client-info">
                        <h3>📜 Histórico</h3>
                        <div id="historicoList" style="max-height: 250px; overflow-y: auto;">
                            ${this.renderHistorico()}
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL LOADING IA -->
            <div id="loadingIAModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 350px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🧠</div>
                    <h3 id="loadingIATitulo">Carregando IA...</h3>
                    <p id="loadingIAMensagem" style="font-size: 12px; color: #666;">Preparando análise de imagens</p>
                    <div style="width: 100%; height: 4px; background: #e2e8f0; border-radius: 4px; margin: 15px 0; overflow: hidden;">
                        <div id="loadingIABarra" style="width: 0%; height: 100%; background: #f97316; transition: width 0.3s;"></div>
                    </div>
                    <p id="loadingIADetalhe" style="font-size: 11px; color: #999;"></p>
                </div>
            </div>

            <!-- MODAL CÂMERA -->
            <div id="cameraModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 500px;">
                    <span class="close">&times;</span>
                    <h3 id="cameraModalTitulo">📸 Tirar Foto</h3>
                    <p id="cameraModalDescricao" style="font-size: 13px; color: #666;"></p>
                    <div style="margin: 15px 0;">
                        <video id="videoCamera" autoplay playsinline style="width: 100%; border-radius: 12px; background: #000;"></video>
                        <canvas id="canvasFoto" style="display: none;"></canvas>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button id="tirarFotoBtn" style="background: #f97316; color: white; border: none; padding: 10px 20px; border-radius: 30px; cursor: pointer;">📷 Tirar Foto</button>
                        <button id="cancelarCameraBtn" style="background: #6b7280; color: white; border: none; padding: 10px 20px; border-radius: 30px; cursor: pointer;">Cancelar</button>
                    </div>
                    <div id="iaAnaliseResultado" style="margin-top: 15px; padding: 12px; border-radius: 12px; display: none;">
                        <div id="iaAnaliseIcone" style="font-size: 28px; text-align: center;">🤖</div>
                        <p id="iaAnaliseMensagem" style="font-size: 12px; margin-top: 5px;"></p>
                        <p id="iaAnaliseDetalhes" style="font-size: 11px; color: #666;"></p>
                    </div>
                </div>
            </div>

            <!-- MODAL PRÉ-VISUALIZAÇÃO -->
            <div id="previewModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 450px;">
                    <span class="close">&times;</span>
                    <h3>📸 Pré-visualização</h3>
                    <img id="previewImagem" style="width: 100%; border-radius: 12px; margin: 15px 0;">
                    <p id="previewResultadoIA" style="padding: 10px; border-radius: 10px; font-size: 12px;"></p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button id="refazerFotoBtn" style="background: #6b7280; color: white; border: none; padding: 8px 16px; border-radius: 30px; cursor: pointer;">📷 Refazer</button>
                        <button id="confirmarEnvioBtn" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 30px; cursor: pointer;">✅ Enviar</button>
                    </div>
                </div>
            </div>

            <!-- MODAL RESULTADO DA ROLETA -->
            <div id="resultadoRoletaModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 350px; text-align: center;">
                    <span class="close">&times;</span>
                    <div id="resultadoIcone" style="font-size: 64px; margin: 10px 0;">🎉</div>
                    <h3 id="resultadoTitulo" style="color: #f97316;">Parabéns!</h3>
                    <p id="resultadoMensagem" style="font-size: 16px; margin: 15px 0;"></p>
                    <button id="fecharResultadoBtn" style="background: #f97316; color: white; border: none; padding: 10px 20px; border-radius: 30px; cursor: pointer;">Continuar</button>
                </div>
            </div>

            <!-- MODAL CONFIRMAÇÃO DE TROCA -->
            <div id="trocaModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 380px;">
                    <span class="close">&times;</span>
                    <h3 id="trocaModalTitulo">Confirmar Troca</h3>
                    <p id="trocaModalDescricao" style="margin: 15px 0;"></p>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="cancelarTrocaBtn" style="background: #6b7280; color: white; border: none; padding: 8px 16px; border-radius: 30px; cursor: pointer;">Cancelar</button>
                        <button id="confirmarTrocaBtn" style="background: #f97316; color: white; border: none; padding: 8px 16px; border-radius: 30px; cursor: pointer;">Confirmar</button>
                    </div>
                </div>
            </div>
        `;
    }

    inicializarCarrossel() {
        const slides = document.querySelectorAll('.carrossel-slide');
        const prevBtn = document.querySelector('.carrossel-prev');
        const nextBtn = document.querySelector('.carrossel-next');
        const dotsContainer = document.querySelector('.carrossel-dots');
        const wrapper = document.querySelector('.carrossel-wrapper');
        
        if (slides.length <= 1) return;
        
        this.totalSlides = slides.length;
        this.currentSlideIndex = 0;
        
        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            for (let i = 0; i < this.totalSlides; i++) {
                const dot = document.createElement('button');
                dot.className = `carrossel-dot ${i === this.currentSlideIndex ? 'active' : ''}`;
                dot.style.cssText = 'width: 8px; height: 8px; border-radius: 50%; background: white; border: none; cursor: pointer; opacity: 0.5; margin: 0 4px;';
                dot.addEventListener('click', () => this.goToSlide(i, wrapper, dotsContainer));
                dotsContainer.appendChild(dot);
            }
            if (dotsContainer.children[this.currentSlideIndex]) {
                dotsContainer.children[this.currentSlideIndex].style.opacity = '1';
            }
        }
        
        const updateSlide = () => {
            const offset = -this.currentSlideIndex * 100;
            if (wrapper) wrapper.style.transform = `translateX(${offset}%)`;
            if (dotsContainer) {
                for (let i = 0; i < dotsContainer.children.length; i++) {
                    dotsContainer.children[i].style.opacity = i === this.currentSlideIndex ? '1' : '0.5';
                }
            }
        };
        
        if (prevBtn) {
            prevBtn.onclick = () => {
                this.currentSlideIndex = (this.currentSlideIndex - 1 + this.totalSlides) % this.totalSlides;
                updateSlide();
            };
        }
        
        if (nextBtn) {
            nextBtn.onclick = () => {
                this.currentSlideIndex = (this.currentSlideIndex + 1) % this.totalSlides;
                updateSlide();
            };
        }
        
        updateSlide();
    }
    
    goToSlide(index, wrapper, dotsContainer) {
        this.currentSlideIndex = index;
        const offset = -this.currentSlideIndex * 100;
        if (wrapper) wrapper.style.transform = `translateX(${offset}%)`;
        if (dotsContainer) {
            for (let i = 0; i < dotsContainer.children.length; i++) {
                dotsContainer.children[i].style.opacity = i === this.currentSlideIndex ? '1' : '0.5';
            }
        }
    }

    formatarHorarioDesafio(desafio) {
        if (!desafio.horario_inicio || !desafio.horario_fim) return 'Horário flexível';
        
        const inicio = new Date(desafio.horario_inicio);
        const fim = new Date(desafio.horario_fim);
        const mesmoDia = inicio.toDateString() === fim.toDateString();
        
        if (mesmoDia) {
            return `${inicio.toLocaleDateString('pt-BR')} ${inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        }
        
        return `${inicio.toLocaleDateString('pt-BR')} até ${fim.toLocaleDateString('pt-BR')}`;
    }

    verificarDisponibilidadeDesafioFoto(desafio) {
        if (!desafio || !desafio.ativo) return false;
        
        const agora = new Date();
        const horarioInicio = desafio.horario_inicio ? new Date(desafio.horario_inicio) : null;
        const horarioFim = desafio.horario_fim ? new Date(desafio.horario_fim) : null;
        
        if (!horarioInicio || !horarioFim) return true;
        return agora >= horarioInicio && agora <= horarioFim;
    }
    
    getParticipacoesRestantes(desafio) {
        const maxParticipacoes = desafio.quantidade_permitida || 1;
        const participacoesFeitas = this.participacoesDesafios.get(desafio.id) || 0;
        return Math.max(0, maxParticipacoes - participacoesFeitas);
    }

    async carregarParticipacoesUsuario() {
        try {
            const participacoesRef = collection(db, 'participacoes_desafios');
            const q = query(participacoesRef, where('usuario_login', '==', this.userInfo.login));
            const querySnapshot = await getDocs(q);
            
            this.participacoesDesafios.clear();
            querySnapshot.forEach(doc => {
                const data = doc.data();
                this.participacoesDesafios.set(data.desafio_id, data.quantidade || 1);
            });
        } catch (error) {
            console.error("Erro ao carregar participações:", error);
        }
    }
    
    async registrarParticipacao(desafioId) {
        try {
            const participacoesRef = collection(db, 'participacoes_desafios');
            const q = query(participacoesRef, where('usuario_login', '==', this.userInfo.login), where('desafio_id', '==', desafioId));
            const querySnapshot = await getDocs(q);
            const novaQuantidade = (this.participacoesDesafios.get(desafioId) || 0) + 1;
            
            if (!querySnapshot.empty) {
                const docRef = doc(db, 'participacoes_desafios', querySnapshot.docs[0].id);
                await updateDoc(docRef, { quantidade: novaQuantidade, ultima_participacao: new Date().toISOString() });
            } else {
                await addDoc(participacoesRef, {
                    usuario_login: this.userInfo.login,
                    usuario_nome: this.userInfo.nome,
                    desafio_id: desafioId,
                    quantidade: 1,
                    data_primeira_participacao: new Date().toISOString(),
                    ultima_participacao: new Date().toISOString()
                });
            }
            this.participacoesDesafios.set(desafioId, novaQuantidade);
        } catch (error) {
            console.error("Erro ao registrar participação:", error);
        }
    }

    async carregarDesafiosFoto() {
        try {
            const desafiosRef = collection(db, 'desafios_diarios');
            const q = query(desafiosRef, where('tipo', '==', 'foto'));
            const querySnapshot = await getDocs(q);
            this.desafiosFoto = [];
            querySnapshot.forEach(doc => {
                this.desafiosFoto.push({ id: doc.id, ...doc.data() });
            });
        } catch (error) {
            console.error("Erro ao carregar desafios foto:", error);
        }
    }

    async participarDesafio(desafioId) {
        const desafio = this.desafiosFoto.find(d => d.id === desafioId);
        if (!desafio) {
            alert('Desafio não encontrado!');
            return;
        }
        
        if (!this.verificarDisponibilidadeDesafioFoto(desafio)) {
            alert('🔒 Desafio não está disponível no momento. Verifique o horário!');
            return;
        }
        
        if (this.getParticipacoesRestantes(desafio) <= 0) {
            alert('🔒 Você já atingiu o limite de participações neste desafio!');
            return;
        }
        
        this.desafioSelecionado = desafio;
        
        if (!isModeloCarregado()) {
            await this.mostrarLoadingIAEcarregar();
        }
        
        await this.abrirCamera();
    }
    
    async mostrarLoadingIAEcarregar() {
        return new Promise(async (resolve, reject) => {
            const modal = document.getElementById('loadingIAModal');
            const barra = document.getElementById('loadingIABarra');
            const detalhe = document.getElementById('loadingIADetalhe');
            
            modal.style.display = 'flex';
            
            const onProgress = (percent, msg) => {
                barra.style.width = `${percent}%`;
                if (msg) detalhe.textContent = msg;
            };
            
            try {
                await carregarModeloIA(onProgress);
                modal.style.display = 'none';
                resolve();
            } catch (error) {
                modal.style.display = 'none';
                reject(error);
            }
        });
    }

    async abrirCamera() {
        try {
            if (this.streamCamera) {
                this.streamCamera.getTracks().forEach(track => track.stop());
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            this.streamCamera = stream;
            const video = document.getElementById('videoCamera');
            if (video) video.srcObject = stream;
            
            const modal = document.getElementById('cameraModal');
            document.getElementById('cameraModalTitulo').textContent = `📸 Desafio: ${this.desafioSelecionado?.titulo || 'Foto'}`;
            document.getElementById('cameraModalDescricao').textContent = this.desafioSelecionado?.descricao || '';
            modal.style.display = 'flex';
            
            document.getElementById('tirarFotoBtn').onclick = () => this.tirarFoto();
            document.getElementById('cancelarCameraBtn').onclick = () => this.fecharCamera();
            
        } catch (error) {
            console.error('Erro ao acessar câmera:', error);
            alert('❌ Não foi possível acessar a câmera. Verifique as permissões.');
        }
    }

    async tirarFoto() {
        const video = document.getElementById('videoCamera');
        const canvas = document.getElementById('canvasFoto');
        const context = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imagemDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        this.fecharCamera();
        await this.analisarComIA(imagemDataUrl);
    }

    async analisarComIA(imagemDataUrl) {
        const iaResultado = document.getElementById('iaAnaliseResultado');
        const iaIcone = document.getElementById('iaAnaliseIcone');
        const iaMensagem = document.getElementById('iaAnaliseMensagem');
        const iaDetalhes = document.getElementById('iaAnaliseDetalhes');
        
        iaResultado.style.display = 'block';
        iaIcone.innerHTML = '🔍';
        iaMensagem.innerHTML = 'Analisando imagem...';
        iaDetalhes.innerHTML = '';
        
        let analise = { aprovado: false, confianca: 0, objetosEncontrados: [], mensagem: '' };
        
        try {
            const resultado = await analisarImagemComIA(imagemDataUrl, this.desafioSelecionado?.categoria);
            analise = resultado;
        } catch (error) {
            console.error('Erro na análise de IA:', error);
            analise.mensagem = 'Erro na análise. Foto será enviada para avaliação manual.';
        }
        
        if (analise.aprovado && analise.confianca >= 0.7) {
            iaIcone.innerHTML = '✅';
            iaMensagem.innerHTML = `✔️ Imagem validada pela IA! ${analise.mensagem}`;
            iaDetalhes.innerHTML = `Objetos: ${analise.objetosEncontrados.join(', ')}`;
        } else if (analise.aprovado && analise.confianca < 0.7) {
            iaIcone.innerHTML = '⚠️';
            iaMensagem.innerHTML = `🤔 Análise em dúvida. Enviando para avaliação manual.`;
            iaDetalhes.innerHTML = `Motivo: ${analise.mensagem}`;
        } else {
            iaIcone.innerHTML = '👩‍⚕️';
            iaMensagem.innerHTML = `📋 Foto enviada para avaliação do nutricionista.`;
            iaDetalhes.innerHTML = `Motivo: ${analise.mensagem || 'IA não reconheceu o conteúdo'}`;
        }
        
        const previewModal = document.getElementById('previewModal');
        const previewImg = document.getElementById('previewImagem');
        const previewResultado = document.getElementById('previewResultadoIA');
        
        previewImg.src = imagemDataUrl;
        previewResultado.innerHTML = `
            <strong>${analise.aprovado ? '🟢 Aprovado pela IA' : '🟡 Pendente de análise'}</strong><br>
            ${analise.mensagem}
            ${analise.objetosEncontrados.length > 0 ? `<br><small>🔍 ${analise.objetosEncontrados.join(', ')}</small>` : ''}
        `;
        previewResultado.style.background = analise.aprovado && analise.confianca >= 0.7 ? '#d1fae5' : '#fed7aa';
        
        this.fotoTemp = { dataUrl: imagemDataUrl, analise: analise };
        
        document.getElementById('confirmarEnvioBtn').onclick = () => this.confirmarEnvioFoto();
        document.getElementById('refazerFotoBtn').onclick = () => {
            previewModal.style.display = 'none';
            this.abrirCamera();
        };
        
        previewModal.style.display = 'flex';
    }

    async confirmarEnvioFoto() {
        if (!this.fotoTemp || !this.desafioSelecionado) return;
        
        document.getElementById('previewModal').style.display = 'none';
        
        const pontos = this.desafioSelecionado.pontos || 50;
        const status = (this.fotoTemp.analise.aprovado && this.fotoTemp.analise.confianca >= 0.7) ? 'aprovado_ia' : 'pendente_manual';
        
        try {
            let imagemUrl = '';
            try {
                const uploadResult = await uploadParaImgbb(this.fotoTemp.dataUrl);
                if (uploadResult.success) imagemUrl = uploadResult.url;
            } catch (uploadError) {
                console.error('Erro no upload para ImgBB:', uploadError);
            }
            
            await addDoc(collection(db, 'fotos_desafio'), {
                usuario_login: this.userInfo.login,
                usuario_nome: this.userInfo.nome,
                desafio_id: this.desafioSelecionado.id,
                desafio_titulo: this.desafioSelecionado.titulo,
                descricao: this.desafioSelecionado.descricao,
                foto_base64: imagemUrl || this.fotoTemp.dataUrl,
                foto_armazenada_em: imagemUrl ? 'imgbb' : 'firebase',
                status: status,
                analise_ia: {
                    aprovado: this.fotoTemp.analise.aprovado,
                    confianca: this.fotoTemp.analise.confianca,
                    objetos_encontrados: this.fotoTemp.analise.objetosEncontrados,
                    mensagem: this.fotoTemp.analise.mensagem
                },
                data_envio: new Date().toISOString()
            });
            
            await this.registrarParticipacao(this.desafioSelecionado.id);
            
            if (status === 'aprovado_ia') {
                await this.adicionarPontos(pontos, `📸 Desafio: ${this.desafioSelecionado.titulo} (Validado por IA)`, 'ganho');
                alert(`✅ Parabéns! +${pontos} pontos!`);
            } else {
                alert(`📸 Foto enviada! Aguarde análise do nutricionista.`);
            }
            
            this.fotoTemp = null;
            this.fecharCamera();
            await this.carregarParticipacoesUsuario();
            await this.carregarDesafiosFoto();
            await this.render();
            
        } catch (error) {
            console.error('Erro ao enviar foto:', error);
            alert('❌ Erro ao enviar foto. Tente novamente.');
        }
    }

    fecharCamera() {
        if (this.streamCamera) {
            this.streamCamera.getTracks().forEach(track => track.stop());
            this.streamCamera = null;
        }
        
        document.getElementById('cameraModal').style.display = 'none';
        document.getElementById('loadingIAModal').style.display = 'none';
    }

    // ==================== MÉTODOS DA ROLETA ====================

    inicializarRoleta() {
        this.roletaCanvas = document.getElementById('roletaCanvas');
        if (!this.roletaCanvas) return;
        
        this.roletaCtx = this.roletaCanvas.getContext('2d');
        this.desenharRoleta();
        
        const resizeRoleta = () => {
            const container = this.roletaCanvas.parentElement;
            const size = Math.min(container.clientWidth, 300);
            this.roletaCanvas.width = size;
            this.roletaCanvas.height = size;
            this.desenharRoleta();
        };
        
        window.addEventListener('resize', resizeRoleta);
        resizeRoleta();
    }

    desenharRoleta() {
        if (!this.roletaCtx || !this.roletaCanvas) return;
        
        const width = this.roletaCanvas.width;
        const height = this.roletaCanvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = width / 2 - 5;
        
        this.roletaCtx.clearRect(0, 0, width, height);
        
        const numSegments = this.roletaPremios.length;
        const anglePerSegment = (Math.PI * 2) / numSegments;
        
        for (let i = 0; i < numSegments; i++) {
            const startAngle = this.roletaAnguloAtual + i * anglePerSegment;
            const endAngle = startAngle + anglePerSegment;
            
            this.roletaCtx.beginPath();
            this.roletaCtx.moveTo(centerX, centerY);
            this.roletaCtx.arc(centerX, centerY, radius, startAngle, endAngle);
            this.roletaCtx.closePath();
            
            this.roletaCtx.fillStyle = this.roletaCores[i % this.roletaCores.length];
            this.roletaCtx.fill();
            
            this.roletaCtx.strokeStyle = 'white';
            this.roletaCtx.lineWidth = 1.5;
            this.roletaCtx.stroke();
            
            this.roletaCtx.save();
            this.roletaCtx.translate(centerX, centerY);
            this.roletaCtx.rotate(startAngle + anglePerSegment / 2);
            this.roletaCtx.textAlign = 'center';
            this.roletaCtx.textBaseline = 'middle';
            this.roletaCtx.font = `bold ${Math.max(10, radius / 12)}px "Segoe UI"`;
            this.roletaCtx.fillStyle = '#333';
            
            this.roletaCtx.fillText(`${this.roletaPremios[i]}`, radius * 0.7, 0);
            this.roletaCtx.restore();
        }
        
        this.roletaCtx.beginPath();
        this.roletaCtx.arc(centerX, centerY, radius * 0.12, 0, Math.PI * 2);
        this.roletaCtx.fillStyle = '#f97316';
        this.roletaCtx.fill();
        this.roletaCtx.strokeStyle = 'white';
        this.roletaCtx.lineWidth = 2;
        this.roletaCtx.stroke();
    }

    async girarRoleta() {
        if (!this.roletaDisponivel) {
            alert('❌ Você já girou a roleta hoje! Volte amanhã!');
            return;
        }
        if (this.roletaGirando) return;
        
        this.roletaGirando = true;
        const girarBtn = document.getElementById('girarRoletaBtn');
        if (girarBtn) girarBtn.disabled = true;
        
        const voltasCompletas = 5 + Math.random() * 5;
        const duracao = 3000;
        const inicio = performance.now();
        const anguloInicial = this.roletaAnguloAtual;
        const premioIndex = Math.floor(Math.random() * this.roletaPremios.length);
        const premioGanho = this.roletaPremios[premioIndex];
        const anguloPorSegmento = (Math.PI * 2) / this.roletaPremios.length;
        const anguloAlvo = (-Math.PI / 2) - (premioIndex * anguloPorSegmento) - (anguloPorSegmento / 2);
        
        let rotacaoNecessaria = anguloAlvo - (this.roletaAnguloAtual % (Math.PI * 2));
        while (rotacaoNecessaria > Math.PI) rotacaoNecessaria -= Math.PI * 2;
        while (rotacaoNecessaria < -Math.PI) rotacaoNecessaria += Math.PI * 2;
        
        const anguloDestino = this.roletaAnguloAtual + (Math.PI * 2 * voltasCompletas) + rotacaoNecessaria;
        
        const animar = (agora) => {
            const elapsed = agora - inicio;
            const progresso = Math.min(1, elapsed / duracao);
            const easeOut = 1 - Math.pow(1 - progresso, 3);
            const anguloAtual = anguloInicial + (anguloDestino - anguloInicial) * easeOut;
            this.roletaAnguloAtual = anguloAtual;
            this.desenharRoleta();
            
            if (progresso < 1) {
                this.roletaAnimacaoId = requestAnimationFrame(animar);
            } else {
                this.roletaGirando = false;
                if (girarBtn) girarBtn.disabled = false;
                this.finalizarGiroRoleta(premioGanho);
            }
        };
        
        if (this.roletaAnimacaoId) cancelAnimationFrame(this.roletaAnimacaoId);
        this.roletaAnimacaoId = requestAnimationFrame(animar);
    }

    async finalizarGiroRoleta(premioGanho) {
        try {
            const userRef = doc(db, 'pontuacao_usuarios', this.userInfo.login);
            let userDoc = await getDoc(userRef);
            if (!userDoc.exists()) {
                await this.criarDocumentoUsuario();
                userDoc = await getDoc(userRef);
            }
            
            const ultimaRoleta = userDoc.data()?.ultima_roleta;
            if (ultimaRoleta) {
                const hoje = new Date().toISOString().split('T')[0];
                const ultimaRoletaData = ultimaRoleta.split('T')[0];
                if (hoje === ultimaRoletaData) {
                    alert('Você já girou a roleta hoje!');
                    this.roletaGirando = false;
                    return;
                }
            }
            
            await updateDoc(userRef, { ultima_roleta: new Date().toISOString() });
            await this.adicionarPontos(premioGanho, `🎡 Roleta - Ganhou ${premioGanho} pontos`, 'ganho');
            this.roletaDisponivel = false;
            this.mostrarResultadoRoleta(premioGanho);
            
            const girarBtn = document.getElementById('girarRoletaBtn');
            if (girarBtn) {
                girarBtn.disabled = true;
                girarBtn.textContent = '✓';
                girarBtn.style.opacity = '0.5';
            }
            
            await this.carregarHistorico();
            
        } catch (error) {
            console.error("Erro ao finalizar giro:", error);
            alert('❌ Erro ao processar o giro.');
            this.roletaGirando = false;
        }
    }

    mostrarResultadoRoleta(premio) {
        const modal = document.getElementById('resultadoRoletaModal');
        const icone = document.getElementById('resultadoIcone');
        const titulo = document.getElementById('resultadoTitulo');
        const mensagem = document.getElementById('resultadoMensagem');
        
        if (premio >= 50) {
            icone.innerHTML = '🎉🎊🏆';
            titulo.textContent = '🎉 JACKPOT! 🎉';
            mensagem.innerHTML = `Você ganhou <strong style="color: #f97316; font-size: 24px;">${premio} pontos</strong>!`;
        } else if (premio >= 25) {
            icone.innerHTML = '🎉✨';
            titulo.textContent = 'Parabéns!';
            mensagem.innerHTML = `Você ganhou <strong style="color: #f97316; font-size: 24px;">${premio} pontos</strong>!`;
        } else {
            icone.innerHTML = '🎲🍀';
            titulo.textContent = 'Boa Sorte!';
            mensagem.innerHTML = `Você ganhou <strong style="color: #f97316; font-size: 24px;">${premio} pontos</strong>!`;
        }
        
        modal.style.display = 'flex';
        
        document.getElementById('fecharResultadoBtn').onclick = () => {
            modal.style.display = 'none';
            const pontosElement = document.getElementById('userPontosDisplay');
            if (pontosElement) pontosElement.textContent = this.userPontos;
        };
        
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    }

    // ==================== MÉTODOS AUXILIARES ====================

    renderDesafios() {
        if (this.desafiosDiarios.length === 0) {
            return '<p style="text-align: center; padding: 20px;">Nenhum desafio ativo.</p>';
        }
        
        return this.desafiosDiarios.map(desafio => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <div>
                    <span style="font-size: 20px; margin-right: 8px;">${desafio.icone || '🎯'}</span>
                    <strong>${desafio.titulo}</strong>
                    <p style="font-size: 11px; opacity: 0.8; margin: 3px 0 0;">${desafio.descricao}</p>
                </div>
                <div class="text-end">
                    <div style="color: #f97316; font-weight: bold;">+${desafio.pontos} pts</div>
                    ${!desafio.completado ? 
                        `<button class="completar-desafio-btn" data-desafio-id="${desafio.id}" style="background: #10b981; color: white; border: none; padding: 4px 12px; border-radius: 20px; font-size: 11px; margin-top: 5px; cursor: pointer;">Completar</button>` :
                        '<span style="background: #10b981; padding: 2px 8px; border-radius: 20px; font-size: 10px;">✅ Concluído</span>'
                    }
                </div>
            </div>
        `).join('');
    }

    renderItensLoja() {
        if (this.itensDisponiveis.length === 0) {
            return '<p style="text-align: center; padding: 20px;">Nenhum item disponível.</p>';
        }
        
        return this.itensDisponiveis.map(item => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.08); border-radius: 12px; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 28px;">${item.icone || '🎁'}</div>
                    <div>
                        <div style="font-weight: bold;">${item.nome}</div>
                        <div style="font-size: 11px; opacity: 0.8;">${item.descricao || ''}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="color: #f97316; font-weight: bold;">${item.pontos} pts</div>
                    <button class="trocar-item-btn" data-item-id="${item.id}" data-item-nome="${item.nome}" data-item-pontos="${item.pontos}" ${item.pontos <= this.userPontos ? '' : 'disabled style="opacity:0.5;"'} style="background: ${item.pontos <= this.userPontos ? '#f97316' : '#6b7280'}; color: white; border: none; padding: 4px 12px; border-radius: 20px; font-size: 11px; margin-top: 4px; cursor: pointer;">
                        ${item.pontos <= this.userPontos ? 'Trocar' : '🔒'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderHistorico() {
        if (this.historicoTransacoes.length === 0) {
            return '<p style="text-align: center; padding: 20px;">Nenhuma transação.</p>';
        }
        
        return this.historicoTransacoes.slice(0, 8).map(transacao => `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 12px;">
                <div>
                    <span>${transacao.tipo === 'ganho' ? '➕' : '➖'}</span>
                    <span style="margin-left: 5px;">${transacao.descricao.substring(0, 35)}</span>
                    <div style="font-size: 10px; opacity: 0.6;">${new Date(transacao.data).toLocaleString('pt-BR')}</div>
                </div>
                <div style="font-weight: bold; color: ${transacao.tipo === 'ganho' ? '#10b981' : '#f97316'}">
                    ${transacao.tipo === 'ganho' ? '+' : '-'} ${transacao.pontos}
                </div>
            </div>
        `).join('');
    }

    async carregarDadosUsuario() {
        try {
            const userRef = doc(db, 'pontuacao_usuarios', this.userInfo.login);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const data = userDoc.data();
                this.userPontos = data.pontos || 0;
                this.userNivel = data.nivel || 1;
                this.userExperiencia = data.experiencia || 0;
            } else {
                await this.criarDocumentoUsuario();
            }
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        }
    }

    async criarDocumentoUsuario() {
        try {
            const userRef = doc(db, 'pontuacao_usuarios', this.userInfo.login);
            await setDoc(userRef, {
                login: this.userInfo.login,
                nome: this.userInfo.nome,
                pontos: 0,
                nivel: 1,
                experiencia: 0,
                ultimo_acesso_diario: null,
                ultima_roleta: null,
                data_criacao: new Date().toISOString()
            });
        } catch (error) {
            console.error("Erro ao criar documento:", error);
        }
    }

    async carregarItensDisponiveis() {
        try {
            const itensRef = collection(db, 'itens_recompensa');
            const querySnapshot = await getDocs(itensRef);
            this.itensDisponiveis = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                if (data.ativo !== false) {
                    this.itensDisponiveis.push({ id: doc.id, ...data });
                }
            });
            this.itensDisponiveis.sort((a, b) => a.pontos - b.pontos);
        } catch (error) {
            console.error("Erro ao carregar itens:", error);
        }
    }

    async carregarHistorico() {
        try {
            const historicoRef = collection(db, 'transacoes_pontos');
            const q = query(historicoRef, where('usuario_login', '==', this.userInfo.login));
            const querySnapshot = await getDocs(q);
            this.historicoTransacoes = [];
            querySnapshot.forEach(doc => {
                this.historicoTransacoes.push({ id: doc.id, ...doc.data() });
            });
            this.historicoTransacoes.sort((a, b) => new Date(b.data) - new Date(a.data));
        } catch (error) {
            console.error("Erro ao carregar histórico:", error);
        }
    }

    async carregarConfigGamificacao() {
        try {
            const configRef = doc(db, 'config_gamificacao', 'principal');
            const configDoc = await getDoc(configRef);
            if (configDoc.exists()) {
                this.configGamificacao = configDoc.data();
            } else {
                this.configGamificacao = {
                    roleta_premios: [5, 10, 15, 20, 25, 50, 100]
                };
            }
        } catch (error) {
            console.error("Erro ao carregar config:", error);
        }
    }

    async verificarRoletaDiaria() {
        try {
            const userRef = doc(db, 'pontuacao_usuarios', this.userInfo.login);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const ultimaRoleta = userDoc.data().ultima_roleta;
                if (ultimaRoleta) {
                    const hoje = new Date().toISOString().split('T')[0];
                    this.roletaDisponivel = hoje !== ultimaRoleta.split('T')[0];
                } else {
                    this.roletaDisponivel = true;
                }
            } else {
                this.roletaDisponivel = true;
            }
        } catch (error) {
            console.error("Erro ao verificar roleta:", error);
            this.roletaDisponivel = true;
        }
    }

    async carregarDesafiosDiarios() {
        try {
            const desafiosRef = collection(db, 'desafios_diarios');
            const querySnapshot = await getDocs(desafiosRef);
            const hoje = new Date().toISOString().split('T')[0];
            
            this.desafiosDiarios = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                if (data.ativo && data.tipo !== 'foto' && (!data.data_expiracao || data.data_expiracao >= hoje)) {
                    this.desafiosDiarios.push({ id: doc.id, ...data, completado: false });
                }
            });
            
            await this.verificarDesafiosCompletados();
        } catch (error) {
            console.error("Erro ao carregar desafios:", error);
        }
    }

    async verificarDesafiosCompletados() {
        try {
            const completadosRef = collection(db, 'desafios_completados');
            const q = query(completadosRef, where('usuario_login', '==', this.userInfo.login));
            const querySnapshot = await getDocs(q);
            
            const desafiosCompletados = new Set();
            querySnapshot.forEach(doc => {
                desafiosCompletados.add(doc.data().desafio_id);
            });
            
            this.desafiosDiarios.forEach(desafio => {
                desafio.completado = desafiosCompletados.has(desafio.id);
            });
        } catch (error) {
            console.error("Erro ao verificar desafios completados:", error);
        }
    }

    async adicionarPontos(pontos, descricao, tipo = 'ganho') {
        try {
            const userRef = doc(db, 'pontuacao_usuarios', this.userInfo.login);
            
            let userDoc = await getDoc(userRef);
            if (!userDoc.exists()) {
                await this.criarDocumentoUsuario();
                userDoc = await getDoc(userRef);
            }
            
            this.userPontos += pontos;
            this.userExperiencia += pontos;
            
            let novoNivel = this.userNivel;
            if (this.userExperiencia >= this.userNivel * 100) {
                novoNivel = this.userNivel + 1;
            }
            
            await updateDoc(userRef, {
                pontos: this.userPontos,
                experiencia: this.userExperiencia,
                nivel: novoNivel,
                ultima_atualizacao: new Date().toISOString()
            });
            
            await addDoc(collection(db, 'transacoes_pontos'), {
                usuario_login: this.userInfo.login,
                usuario_nome: this.userInfo.nome,
                pontos: pontos,
                descricao: descricao,
                tipo: tipo,
                data: new Date().toISOString(),
                saldo_apos: this.userPontos
            });
            
            this.userNivel = novoNivel;
            
            const pontosElement = document.getElementById('userPontosDisplay');
            const nivelElement = document.getElementById('userNivelDisplay');
            if (pontosElement) pontosElement.textContent = this.userPontos;
            if (nivelElement) nivelElement.textContent = this.userNivel;
            
            await this.carregarHistorico();
            
            return true;
        } catch (error) {
            console.error("Erro ao adicionar pontos:", error);
            return false;
        }
    }

    async gastarPontos(pontos, descricao, itemId, itemNome) {
        if (this.userPontos < pontos) {
            alert('❌ Pontos insuficientes!');
            return false;
        }
        
        try {
            const userRef = doc(db, 'pontuacao_usuarios', this.userInfo.login);
            this.userPontos -= pontos;
            
            await updateDoc(userRef, {
                pontos: this.userPontos,
                ultima_atualizacao: new Date().toISOString()
            });
            
            await addDoc(collection(db, 'transacoes_pontos'), {
                usuario_login: this.userInfo.login,
                usuario_nome: this.userInfo.nome,
                pontos: pontos,
                descricao: descricao,
                tipo: 'gasto',
                item_id: itemId,
                item_nome: itemNome,
                data: new Date().toISOString(),
                saldo_apos: this.userPontos
            });
            
            await addDoc(collection(db, 'resgates_realizados'), {
                usuario_login: this.userInfo.login,
                usuario_nome: this.userInfo.nome,
                item_id: itemId,
                item_nome: itemNome,
                pontos_gastos: pontos,
                status: 'pendente',
                data_resgate: new Date().toISOString()
            });
            
            await this.carregarHistorico();
            
            const pontosElement = document.getElementById('userPontosDisplay');
            if (pontosElement) pontosElement.textContent = this.userPontos;
            
            alert(`✅ Resgate realizado!\n\nItem: ${itemNome}\nPontos: ${pontos}`);
            
            return true;
        } catch (error) {
            console.error("Erro ao gastar pontos:", error);
            alert('❌ Erro ao realizar resgate.');
            return false;
        }
    }

    async completarDesafio(desafioId) {
        try {
            const desafio = this.desafiosDiarios.find(d => d.id === desafioId);
            if (!desafio || desafio.completado) {
                alert('Desafio já completado!');
                return;
            }
            
            const completadosRef = collection(db, 'desafios_completados');
            const q = query(completadosRef, where('usuario_login', '==', this.userInfo.login), where('desafio_id', '==', desafioId), where('data_completado', '>=', new Date().toISOString().split('T')[0]));
            const checkSnapshot = await getDocs(q);
            
            if (!checkSnapshot.empty) {
                alert('Você já completou este desafio hoje!');
                return;
            }
            
            await addDoc(completadosRef, {
                usuario_login: this.userInfo.login,
                usuario_nome: this.userInfo.nome,
                desafio_id: desafioId,
                desafio_titulo: desafio.titulo,
                pontos_ganhos: desafio.pontos,
                data_completado: new Date().toISOString()
            });
            
            await this.adicionarPontos(desafio.pontos, `⭐ Desafio: ${desafio.titulo}`, 'ganho');
            alert(`🎉 Desafio completado! +${desafio.pontos} pontos`);
            
            await this.carregarDesafiosDiarios();
            this.render();
            this.inicializarRoleta();
            
        } catch (error) {
            console.error("Erro ao completar desafio:", error);
            alert('❌ Erro ao completar desafio.');
        }
    }

    async registrarAcessoDiario() {
        try {
            const userRef = doc(db, 'pontuacao_usuarios', this.userInfo.login);
            let userDoc = await getDoc(userRef);
            if (!userDoc.exists()) {
                await this.criarDocumentoUsuario();
                userDoc = await getDoc(userRef);
            }
            
            const hoje = new Date().toISOString().split('T')[0];
            const ultimoAcesso = userDoc.data()?.ultimo_acesso_diario;
            
            if (ultimoAcesso && ultimoAcesso.split('T')[0] === hoje) return;
            
            await updateDoc(userRef, { ultimo_acesso_diario: new Date().toISOString() });
            await this.adicionarPontos(5, '📅 Acesso diário', 'ganho');
            
        } catch (error) {
            console.error("Erro ao registrar acesso:", error);
        }
    }

    attachEvents() {
        // Menu lateral
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

        // Botões do menu
        document.querySelectorAll('.menu-item[data-module]').forEach(item => {
            item.addEventListener('click', async (e) => {
                const module = item.getAttribute('data-module');
                closeMenuFunc();
                await this.navegador.navegarPara(module);
            });
        });

        // Botão Sair
        const logoutMenuItem = document.getElementById('logoutMenuItem');
        if (logoutMenuItem) {
            logoutMenuItem.addEventListener('click', () => {
                closeMenuFunc();
                this.navegador.navegarPara('logout');
            });
        }

        // Minha Jornada
        const minhaJornadaMenuItem = document.getElementById('minhaJornadaMenuItem');
        if (minhaJornadaMenuItem) {
            minhaJornadaMenuItem.addEventListener('click', () => {
                closeMenuFunc();
                alert('🌟 Minha Jornada\n\nEm breve você poderá acompanhar sua jornada de saúde aqui!');
            });
        }
        
        // Roleta
        document.getElementById('girarRoletaBtn')?.addEventListener('click', () => this.girarRoleta());
        
        // Desafios com foto
        document.querySelectorAll('.participar-desafio-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const desafioId = btn.getAttribute('data-desafio-id');
                if (desafioId) this.participarDesafio(desafioId);
            });
        });
        
        // Desafios simples
        document.querySelectorAll('.completar-desafio-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const desafioId = btn.getAttribute('data-desafio-id');
                if (desafioId) this.completarDesafio(desafioId);
            });
        });
        
        // Troca de itens
        document.querySelectorAll('.trocar-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = btn.getAttribute('data-item-id');
                const itemNome = btn.getAttribute('data-item-nome');
                const itemPontos = parseInt(btn.getAttribute('data-item-pontos'));
                
                if (this.userPontos >= itemPontos) {
                    const modal = document.getElementById('trocaModal');
                    document.getElementById('trocaModalTitulo').textContent = `Confirmar Troca: ${itemNome}`;
                    document.getElementById('trocaModalDescricao').innerHTML = `Você está trocando <strong>${itemPontos} pontos</strong> por:<br><strong>${itemNome}</strong><br><br>Deseja confirmar?`;
                    modal.style.display = 'flex';
                    
                    document.getElementById('confirmarTrocaBtn').onclick = () => {
                        this.gastarPontos(itemPontos, `🛍️ Troca: ${itemNome}`, itemId, itemNome);
                        modal.style.display = 'none';
                    };
                    document.getElementById('cancelarTrocaBtn').onclick = () => modal.style.display = 'none';
                    
                    const closeBtn = modal.querySelector('.close');
                    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
                }
            });
        });
        
        // Fechar modais
        const modais = ['cameraModal', 'previewModal', 'trocaModal', 'resultadoRoletaModal', 'loadingIAModal'];
        modais.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                const closeBtn = modal.querySelector('.close');
                if (closeBtn) {
                    closeBtn.onclick = () => {
                        modal.style.display = 'none';
                        if (modalId === 'cameraModal') this.fecharCamera();
                    };
                }
            }
        });
        
        window.onclick = (event) => {
            modais.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (event.target === modal) {
                    modal.style.display = 'none';
                    if (modalId === 'cameraModal') this.fecharCamera();
                }
            });
        };
        
        this.registrarAcessoDiario();
    }
}
