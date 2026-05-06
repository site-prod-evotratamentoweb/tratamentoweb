import { FuncoesCompartilhadas } from './0_home.js';
import { MenuProfissional } from './0_complementos_menu_profissional.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { 
    db, collection, addDoc, getDocs, query, where, 
    doc, updateDoc, deleteDoc, getDoc, orderBy
} from '../0_firebase_api_config.js';

export class ShoppingNutriNutricionista {
    constructor(userInfo, pacientesList) {
        this.userInfo = userInfo;
        this.funcoes = FuncoesCompartilhadas;
        this.pacientesList = pacientesList || [];
        this.menu = null;
        this.navegador = criarNavegador(userInfo, this.pacientesList);
        
        // Dados do sistema
        this.itensRecompensa = [];
        this.desafiosDiarios = [];
        this.fotosDesafio = [];
        this.resgatesPendentes = [];
        this.rankingPontuacao = [];
        this.configGamificacao = null;
        
        // Estado da UI
        this.activeTab = 'dashboard';
        this.selectedPaciente = null;
    }

    async render() {
        const app = document.getElementById('app');
        await this.carregarTodosDados();
        
        app.innerHTML = this.renderHTML();
        
        this.navegador.pacientesList = this.pacientesList;
        
        this.menu = new MenuProfissional(this.userInfo, (module) => this.navegador.navegarPara(module), 'shopping_nutri');
        const menuHtml = this.menu.render();
        const menuContainer = document.getElementById('menuContainer');
        if (menuContainer) {
            menuContainer.innerHTML = menuHtml;
        }
        this.menu.attachEvents();
        
        this.attachEvents();
    }

    renderHTML() {
        return `
            <div class="dashboard-container" style="height: 100vh; display: flex; flex-direction: column;">
                <div id="menuContainer"></div>

                <div class="main-content" style="flex: 1; overflow-y: auto; padding: 20px 32px;">
                    <!-- TABS -->
                    <div class="tabs-container" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">
                        <button class="tab-btn ${this.activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard" style="padding: 10px 20px; border-radius: 12px; border: none; cursor: pointer; ${this.activeTab === 'dashboard' ? 'background: #1a237e; color: white;' : 'background: #f1f5f9;'}">
                            📊 Dashboard
                        </button>
                        <button class="tab-btn ${this.activeTab === 'itens' ? 'active' : ''}" data-tab="itens" style="padding: 10px 20px; border-radius: 12px; border: none; cursor: pointer; ${this.activeTab === 'itens' ? 'background: #1a237e; color: white;' : 'background: #f1f5f9;'}">
                            🛍️ Itens para Troca
                        </button>
                        <button class="tab-btn ${this.activeTab === 'desafios' ? 'active' : ''}" data-tab="desafios" style="padding: 10px 20px; border-radius: 12px; border: none; cursor: pointer; ${this.activeTab === 'desafios' ? 'background: #1a237e; color: white;' : 'background: #f1f5f9;'}">
                            ⭐ Desafios Diários
                        </button>
                        <button class="tab-btn ${this.activeTab === 'fotos' ? 'active' : ''}" data-tab="fotos" style="padding: 10px 20px; border-radius: 12px; border: none; cursor: pointer; ${this.activeTab === 'fotos' ? 'background: #1a237e; color: white;' : 'background: #f1f5f9;'}">
                            📸 Desafios com Foto
                        </button>
                        <button class="tab-btn ${this.activeTab === 'resgates' ? 'active' : ''}" data-tab="resgates" style="padding: 10px 20px; border-radius: 12px; border: none; cursor: pointer; ${this.activeTab === 'resgates' ? 'background: #1a237e; color: white;' : 'background: #f1f5f9;'}">
                            🎁 Resgates Pendentes
                        </button>
                        <button class="tab-btn ${this.activeTab === 'ranking' ? 'active' : ''}" data-tab="ranking" style="padding: 10px 20px; border-radius: 12px; border: none; cursor: pointer; ${this.activeTab === 'ranking' ? 'background: #1a237e; color: white;' : 'background: #f1f5f9;'}">
                            🏆 Ranking
                        </button>
                        <button class="tab-btn ${this.activeTab === 'config' ? 'active' : ''}" data-tab="config" style="padding: 10px 20px; border-radius: 12px; border: none; cursor: pointer; ${this.activeTab === 'config' ? 'background: #1a237e; color: white;' : 'background: #f1f5f9;'}">
                            ⚙️ Configurações
                        </button>
                    </div>

                    <!-- CONTEÚDO DAS TABS -->
                    <div id="tabContent">
                        ${this.renderActiveTab()}
                    </div>
                </div>
            </div>

            <!-- MODAL ITEM -->
            <div id="itemModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 500px;">
                    <span class="close">&times;</span>
                    <h3 id="itemModalTitle">➕ Novo Item</h3>
                    <form id="itemForm">
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>🏷️ Nome do Item</label>
                            <input type="text" id="itemNome" class="form-control" required style="padding: 12px; border-radius: 12px;">
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>📝 Descrição</label>
                            <textarea id="itemDescricao" class="form-control" rows="2" style="padding: 12px; border-radius: 12px;"></textarea>
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>🎨 Ícone (emoji)</label>
                            <input type="text" id="itemIcone" class="form-control" value="🎁" style="padding: 12px; border-radius: 12px;">
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>⭐ Pontos Necessários</label>
                            <input type="number" id="itemPontos" class="form-control" required min="0" style="padding: 12px; border-radius: 12px;">
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>📦 Tipo do Item</label>
                            <select id="itemTipo" class="form-control" style="padding: 12px; border-radius: 12px;">
                                <option value="desconto_atendimento">🎯 Desconto em Atendimento</option>
                                <option value="atendimento_gratuito">⭐ Atendimento Grátis</option>
                                <option value="desconto_palestra">📚 Desconto em Palestra</option>
                                <option value="palestra_gratuita">🎤 Palestra Grátis</option>
                                <option value="produto_fisico">📦 Produto Físico</option>
                                <option value="brinde">🎁 Brinde</option>
                                <option value="outro">✨ Outro</option>
                            </select>
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>📋 Informações Adicionais</label>
                            <textarea id="itemInfo" class="form-control" rows="2" placeholder="Ex: Desconto de 20% na próxima consulta..." style="padding: 12px; border-radius: 12px;"></textarea>
                        </div>
                        <div class="form-actions" style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button type="button" id="cancelarItemBtn" class="btn-secondary">Cancelar</button>
                            <button type="submit" class="btn-primary">💾 Salvar Item</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- MODAL DESAFIO -->
            <div id="desafioModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 600px;">
                    <span class="close">&times;</span>
                    <h3 id="desafioModalTitle">➕ Novo Desafio</h3>
                    <form id="desafioForm">
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>🎯 Título do Desafio</label>
                            <input type="text" id="desafioTitulo" class="form-control" required style="padding: 12px; border-radius: 12px;">
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>📝 Descrição</label>
                            <textarea id="desafioDescricao" class="form-control" rows="2" required style="padding: 12px; border-radius: 12px;"></textarea>
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>🎨 Ícone (emoji)</label>
                            <input type="text" id="desafioIcone" class="form-control" value="🎯" style="padding: 12px; border-radius: 12px;">
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>🎯 Tipo do Desafio</label>
                            <select id="desafioTipo" class="form-control" style="padding: 12px; border-radius: 12px;">
                                <option value="comum">📋 Comum (clique para completar)</option>
                                <option value="foto">📸 Foto com IA</option>
                            </select>
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>🤖 Categoria (para desafios com foto)</label>
                            <select id="desafioCategoria" class="form-control" style="padding: 12px; border-radius: 12px;">
                                <option value="refeicao">🍽️ Refeição Saudável</option>
                                <option value="exercicio">🏋️ Exercício Físico</option>
                                <option value="selfie">🤳 Selfie</option>
                                <option value="amigo">👥 Amigo</option>
                                <option value="agua">💧 Água</option>
                                <option value="fruta">🍎 Fruta</option>
                            </select>
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>⭐ Pontos por Completar</label>
                            <input type="number" id="desafioPontos" class="form-control" required min="10" style="padding: 12px; border-radius: 12px;">
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>📅 Horário Início (opcional)</label>
                            <input type="datetime-local" id="desafioHorarioInicio" class="form-control" style="padding: 12px; border-radius: 12px;">
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>📅 Horário Fim (opcional)</label>
                            <input type="datetime-local" id="desafioHorarioFim" class="form-control" style="padding: 12px; border-radius: 12px;">
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>🔢 Quantidade Permitida por Usuário</label>
                            <input type="number" id="desafioQuantidadePermitida" class="form-control" value="1" min="1" style="padding: 12px; border-radius: 12px;">
                            <small>Quantas vezes cada usuário pode participar deste desafio</small>
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>📅 Data de Expiração (opcional)</label>
                            <input type="date" id="desafioExpiracao" class="form-control" style="padding: 12px; border-radius: 12px;">
                        </div>
                        <div class="form-actions" style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button type="button" id="cancelarDesafioBtn" class="btn-secondary">Cancelar</button>
                            <button type="submit" class="btn-primary">💾 Salvar Desafio</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- MODAL APROVAR FOTO -->
            <div id="aprovarFotoModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 600px;">
                    <span class="close">&times;</span>
                    <h3>📸 Analisar Foto do Desafio</h3>
                    <div id="fotoPreviewContainer" style="margin: 20px 0; text-align: center;">
                        <img id="fotoPreview" style="max-width: 100%; border-radius: 16px;">
                    </div>
                    <div id="fotoInfo">
                        <p><strong>👤 Usuário:</strong> <span id="fotoUsuario"></span></p>
                        <p><strong>📝 Desafio:</strong> <span id="fotoDesafio"></span></p>
                        <p><strong>📅 Envio:</strong> <span id="fotoData"></span></p>
                        <p><strong>🤖 Análise da IA:</strong> <span id="fotoAnaliseIA"></span></p>
                        <p><strong>🔍 Objetos Identificados:</strong> <span id="fotoObjetos"></span></p>
                    </div>
                    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;">
                        <button id="recusarFotoBtn" class="btn-secondary">❌ Recusar</button>
                        <button id="aprovarFotoBtn" class="btn-primary" style="background: #10b981;">✅ Aprovar e Dar Pontos</button>
                    </div>
                </div>
            </div>

            <!-- MODAL CONFIGURAÇÕES -->
            <div id="configModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 500px;">
                    <span class="close">&times;</span>
                    <h3>⚙️ Configurações da Gamificação</h3>
                    <form id="configForm">
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>🎡 Prêmios da Roleta (separados por vírgula)</label>
                            <input type="text" id="configRoleta" class="form-control" value="${this.configGamificacao?.roleta_premios?.join(', ') || '5, 10, 15, 20, 25, 50, 100'}" style="padding: 12px; border-radius: 12px;">
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>⭐ Pontos por Desafio (padrão)</label>
                            <input type="number" id="configPontosDesafio" class="form-control" value="${this.configGamificacao?.pontos_por_desafio || 50}" style="padding: 12px; border-radius: 12px;">
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>📸 Pontos por Envio de Foto</label>
                            <input type="number" id="configPontosFoto" class="form-control" value="${this.configGamificacao?.pontos_por_foto || 30}" style="padding: 12px; border-radius: 12px;">
                        </div>
                        <div class="form-actions" style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button type="button" id="cancelarConfigBtn" class="btn-secondary">Cancelar</button>
                            <button type="submit" class="btn-primary">💾 Salvar Configurações</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    renderActiveTab() {
        switch(this.activeTab) {
            case 'dashboard':
                return this.renderDashboard();
            case 'itens':
                return this.renderItensTab();
            case 'desafios':
                return this.renderDesafiosTab();
            case 'fotos':
                return this.renderFotosTab();
            case 'resgates':
                return this.renderResgatesTab();
            case 'ranking':
                return this.renderRankingTab();
            case 'config':
                return this.renderConfigTab();
            default:
                return this.renderDashboard();
        }
    }

    renderDashboard() {
        const totalPontos = this.rankingPontuacao.reduce((sum, u) => sum + u.pontos, 0);
        const fotosPendentes = this.fotosDesafio.filter(f => f.status === 'pendente_manual').length;
        const fotosAprovadas = this.fotosDesafio.filter(f => f.status === 'aprovado').length;
        const fotosRecusadas = this.fotosDesafio.filter(f => f.status === 'recusado').length;
        
        return `
            <div class="dashboard-grid">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 32px;">
                    <div style="background: linear-gradient(135deg, #f59e0b, #f97316); padding: 24px; border-radius: 20px; color: white;">
                        <div style="font-size: 32px;">⭐</div>
                        <div style="font-size: 28px; font-weight: bold;">${totalPontos}</div>
                        <div>Total de Pontos Distribuídos</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 24px; border-radius: 20px; color: white;">
                        <div style="font-size: 32px;">👥</div>
                        <div style="font-size: 28px; font-weight: bold;">${this.rankingPontuacao.length}</div>
                        <div>Usuários Ativos</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 24px; border-radius: 20px; color: white;">
                        <div style="font-size: 32px;">🎁</div>
                        <div style="font-size: 28px; font-weight: bold;">${this.resgatesPendentes.length}</div>
                        <div>Resgates Pendentes</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); padding: 24px; border-radius: 20px; color: white;">
                        <div style="font-size: 32px;">📸</div>
                        <div style="font-size: 28px; font-weight: bold;">${fotosPendentes}</div>
                        <div>Fotos Aguardando Análise</div>
                    </div>
                </div>

                <div style="background: white; border-radius: 20px; padding: 24px; margin-bottom: 24px;">
                    <h3 style="margin-bottom: 20px;">🏆 Top 10 Ranking</h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f1f5f9;">
                                    <th style="padding: 12px;">Posição</th>
                                    <th style="padding: 12px; text-align: left;">Usuário</th>
                                    <th style="padding: 12px;">Nível</th>
                                    <th style="padding: 12px;">Pontos</th>
                                 </tr>
                            </thead>
                            <tbody>
                                ${this.rankingPontuacao.slice(0, 10).map((u, idx) => `
                                    <tr style="border-bottom: 1px solid #e2e8f0;">
                                        <td style="padding: 12px; text-align: center;">${idx + 1}°</td>
                                        <td style="padding: 12px;"><strong>${u.nome}</strong><br><span style="font-size: 12px; color: #666;">${u.login}</span></td>
                                        <td style="padding: 12px; text-align: center;">🏆 ${u.nivel}</td>
                                        <td style="padding: 12px; text-align: center; color: #f97316; font-weight: bold;">${u.pontos} pts</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style="background: white; border-radius: 20px; padding: 24px;">
                    <h3 style="margin-bottom: 20px;">📈 Estatísticas de Desafios com Foto</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                        <div style="text-align: center; padding: 16px; background: #f1f5f9; border-radius: 16px;">
                            <div style="font-size: 32px;">⏳</div>
                            <div style="font-size: 24px; font-weight: bold;">${fotosPendentes}</div>
                            <div style="color: #666;">Aguardando Análise</div>
                        </div>
                        <div style="text-align: center; padding: 16px; background: #d1fae5; border-radius: 16px;">
                            <div style="font-size: 32px;">✅</div>
                            <div style="font-size: 24px; font-weight: bold;">${fotosAprovadas}</div>
                            <div style="color: #666;">Aprovadas</div>
                        </div>
                        <div style="text-align: center; padding: 16px; background: #fee2e2; border-radius: 16px;">
                            <div style="font-size: 32px;">❌</div>
                            <div style="font-size: 24px; font-weight: bold;">${fotosRecusadas}</div>
                            <div style="color: #666;">Recusadas</div>
                        </div>
                        <div style="text-align: center; padding: 16px; background: #fef3c7; border-radius: 16px;">
                            <div style="font-size: 32px;">🤖</div>
                            <div style="font-size: 24px; font-weight: bold;">${this.fotosDesafio.filter(f => f.status === 'aprovado_ia').length}</div>
                            <div style="color: #666;">Aprovadas por IA</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderItensTab() {
        return `
            <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
                <button id="novoItemBtn" class="btn-primary" style="background: #f97316;">➕ Novo Item</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                ${this.itensRecompensa.map(item => `
                    <div class="item-card" style="border: 2px solid #e2e8f0; border-radius: 20px; padding: 20px; position: relative;">
                        <div style="font-size: 48px; text-align: center; margin-bottom: 12px;">${item.icone || '🎁'}</div>
                        <h4 style="text-align: center; margin-bottom: 8px;">${item.nome}</h4>
                        <p style="font-size: 13px; color: #666; text-align: center; margin-bottom: 12px;">${item.descricao || ''}</p>
                        <div style="text-align: center; font-size: 24px; font-weight: bold; color: #f97316; margin-bottom: 16px;">${item.pontos} pts</div>
                        <div style="display: flex; gap: 8px; justify-content: center;">
                            <button class="editar-item-btn btn-small" data-item-id="${item.id}" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer;">✏️ Editar</button>
                            <button class="excluir-item-btn btn-small" data-item-id="${item.id}" style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer;">🗑️ Excluir</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderDesafiosTab() {
        const hoje = new Date().toISOString().split('T')[0];
        
        return `
            <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
                <button id="novoDesafioBtn" class="btn-primary" style="background: #f97316;">➕ Novo Desafio</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 16px;">
                ${this.desafiosDiarios.map(desafio => {
                    const expirado = desafio.data_expiracao && desafio.data_expiracao < hoje;
                    const tipoLabel = desafio.tipo === 'foto' ? '📸 Desafio com Foto' : '📋 Desafio Comum';
                    return `
                        <div class="desafio-card" style="border: 2px solid ${expirado ? '#dc2626' : (desafio.tipo === 'foto' ? '#8b5cf6' : '#e2e8f0')}; border-radius: 16px; padding: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                            <div style="display: flex; align-items: center; gap: 16px;">
                                <div style="font-size: 40px;">${desafio.icone || '🎯'}</div>
                                <div>
                                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                        <h4 style="margin-bottom: 4px;">${desafio.titulo}</h4>
                                        <span style="font-size: 11px; padding: 2px 8px; background: ${desafio.tipo === 'foto' ? '#8b5cf6' : '#10b981'}; color: white; border-radius: 20px;">${tipoLabel}</span>
                                    </div>
                                    <p style="font-size: 13px; color: #666; margin-bottom: 4px;">${desafio.descricao}</p>
                                    <div style="font-size: 12px; display: flex; flex-wrap: wrap; gap: 12px;">
                                        <span style="color: #f97316; font-weight: bold;">+${desafio.pontos} pts</span>
                                        ${desafio.categoria ? `<span style="color: #8b5cf6;">🤖 Categoria: ${desafio.categoria}</span>` : ''}
                                        ${desafio.quantidade_permitida ? `<span>🎯 Participações: ${desafio.quantidade_permitida}x</span>` : ''}
                                        ${desafio.horario_inicio ? `<span>⏰ ${new Date(desafio.horario_inicio).toLocaleDateString('pt-BR')}</span>` : ''}
                                        ${desafio.data_expiracao ? `<span style="color: ${expirado ? '#dc2626' : '#666'}; margin-left: 12px;">📅 Expira: ${this.funcoes.formatDateToDisplay(desafio.data_expiracao)}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="editar-desafio-btn" data-desafio-id="${desafio.id}" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer;">✏️ Editar</button>
                                <button class="excluir-desafio-btn" data-desafio-id="${desafio.id}" style="background: ${expirado ? '#6b7280' : '#dc2626'}; color: white; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer;">🗑️ Excluir</button>
                            </div>
                        </div>
                    `;
                }).join('')}
                ${this.desafiosDiarios.length === 0 ? '<p style="text-align: center; color: #666; padding: 40px;">Nenhum desafio criado ainda. Clique em "Novo Desafio" para começar!</p>' : ''}
            </div>
        `;
    }

    renderFotosTab() {
        const fotosPendentes = this.fotosDesafio.filter(f => f.status === 'pendente_manual');
        const fotosAprovadas = this.fotosDesafio.filter(f => f.status === 'aprovado' || f.status === 'aprovado_ia');
        const fotosRecusadas = this.fotosDesafio.filter(f => f.status === 'recusado');
        
        return `
            <div class="fotos-container">
                <div style="display: flex; gap: 12px; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
                    <button class="fotos-filter-btn active" data-filter="pendentes" style="padding: 8px 20px; border-radius: 20px; border: none; cursor: pointer; background: #f97316; color: white;">📸 Pendentes (${fotosPendentes.length})</button>
                    <button class="fotos-filter-btn" data-filter="aprovadas" style="padding: 8px 20px; border-radius: 20px; border: none; cursor: pointer; background: #e2e8f0;">✅ Aprovadas (${fotosAprovadas.length})</button>
                    <button class="fotos-filter-btn" data-filter="recusadas" style="padding: 8px 20px; border-radius: 20px; border: none; cursor: pointer; background: #e2e8f0;">❌ Recusadas (${fotosRecusadas.length})</button>
                </div>
                
                <div id="fotosListContainer">
                    ${this.renderFotosList('pendentes')}
                </div>
            </div>
        `;
    }

    renderFotosList(filtro = 'pendentes') {
        let fotosFiltradas = [];
        
        if (filtro === 'pendentes') {
            fotosFiltradas = this.fotosDesafio.filter(f => f.status === 'pendente_manual');
        } else if (filtro === 'aprovadas') {
            fotosFiltradas = this.fotosDesafio.filter(f => f.status === 'aprovado' || f.status === 'aprovado_ia');
        } else if (filtro === 'recusadas') {
            fotosFiltradas = this.fotosDesafio.filter(f => f.status === 'recusado');
        }
        
        if (fotosFiltradas.length === 0) {
            return `<p style="text-align: center; color: #666; padding: 40px;">Nenhuma foto encontrada nesta categoria.</p>`;
        }
        
        return `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                ${fotosFiltradas.map(foto => {
                    const statusIcon = foto.status === 'aprovado_ia' ? '🤖' : (foto.status === 'aprovado' ? '✅' : (foto.status === 'recusado' ? '❌' : '⏳'));
                    const statusText = foto.status === 'aprovado_ia' ? 'Aprovado por IA' : (foto.status === 'aprovado' ? 'Aprovado' : (foto.status === 'recusado' ? 'Recusado' : 'Pendente'));
                    
                    return `
                        <div class="foto-card" style="border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 16px;">
                                <div style="flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                        <div style="font-size: 32px;">📸</div>
                                        <div>
                                            <strong>${foto.usuario_nome}</strong>
                                            <div style="font-size: 12px; color: #666;">${foto.usuario_login}</div>
                                        </div>
                                    </div>
                                    <p style="margin-bottom: 8px;"><strong>Desafio:</strong> ${foto.desafio_titulo}</p>
                                    <p style="margin-bottom: 8px;"><strong>Descrição:</strong> ${foto.descricao || 'Não informada'}</p>
                                    <div style="font-size: 12px; color: #999; margin-top: 8px;">
                                        Enviado em: ${new Date(foto.data_envio).toLocaleString('pt-BR')}
                                    </div>
                                    ${foto.analise_ia ? `
                                        <div style="margin-top: 12px; padding: 8px; background: #f1f5f9; border-radius: 8px;">
                                            <div style="font-size: 12px;">
                                                <strong>🤖 Análise da IA:</strong> ${foto.analise_ia.mensagem || 'Sem análise'}
                                            </div>
                                            ${foto.analise_ia.objetos_encontrados?.length > 0 ? `
                                                <div style="font-size: 12px; margin-top: 4px;">
                                                    <strong>🔍 Objetos:</strong> ${foto.analise_ia.objetos_encontrados.join(', ')}
                                                </div>
                                            ` : ''}
                                            <div style="font-size: 12px; margin-top: 4px;">
                                                <strong>📊 Confiança:</strong> ${Math.round((foto.analise_ia.confianca || 0) * 100)}%
                                            </div>
                                        </div>
                                    ` : ''}
                                    <div style="margin-top: 12px;">
                                        <span style="background: ${foto.status === 'pendente_manual' ? '#fef3c7' : (foto.status === 'aprovado_ia' ? '#d1fae5' : '#fee2e2')}; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                                            ${statusIcon} ${statusText}
                                        </span>
                                        ${foto.pontos_ganhos ? `<span style="background: #d1fae5; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-left: 8px;">+${foto.pontos_ganhos} pts</span>` : ''}
                                    </div>
                                </div>
                                ${foto.foto_base64 ? `
                                    <div style="max-width: 200px;">
                                        <img src="${foto.foto_base64}" style="width: 100%; border-radius: 12px; cursor: pointer;" onclick="window.open(this.src)">
                                    </div>
                                ` : ''}
                            </div>
                            ${foto.status === 'pendente_manual' ? `
                                <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                                    <button class="recusar-foto-btn btn-secondary" data-foto-id="${foto.id}">❌ Recusar</button>
                                    <button class="aprovar-foto-btn btn-primary" data-foto-id="${foto.id}" data-pontos="${foto.pontos_ganhos || 50}" data-usuario="${foto.usuario_login}" style="background: #10b981;">✅ Aprovar e Dar Pontos</button>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderResgatesTab() {
        return `
            <div class="resgates-container" style="display: flex; flex-direction: column; gap: 16px;">
                ${this.resgatesPendentes.map(resgate => `
                    <div class="resgate-card" style="border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <div style="font-size: 28px;">🎁</div>
                                <div>
                                    <strong>${resgate.usuario_nome}</strong>
                                    <div style="font-size: 12px; color: #666;">${resgate.usuario_login}</div>
                                </div>
                            </div>
                            <div><strong>Item:</strong> ${resgate.item_nome}</div>
                            <div><strong>Pontos gastos:</strong> ${resgate.pontos_gastos} pts</div>
                            <div style="font-size: 12px; color: #999;">Data: ${new Date(resgate.data_resgate).toLocaleString('pt-BR')}</div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="recusar-resgate-btn" data-resgate-id="${resgate.id}" data-usuario-login="${resgate.usuario_login}" style="background: #dc2626; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer;">❌ Recusar</button>
                            <button class="aprovar-resgate-btn" data-resgate-id="${resgate.id}" data-usuario-login="${resgate.usuario_login}" data-item-nome="${resgate.item_nome}" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer;">✅ Aprovar</button>
                        </div>
                    </div>
                `).join('')}
                ${this.resgatesPendentes.length === 0 ? '<p style="text-align: center; color: #666; padding: 40px;">Nenhum resgate pendente.</p>' : ''}
            </div>
        `;
    }

    renderRankingTab() {
        return `
            <div style="background: white; border-radius: 20px; padding: 24px;">
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f1f5f9;">
                                <th style="padding: 12px;">Posição</th>
                                <th style="padding: 12px; text-align: left;">Usuário</th>
                                <th style="padding: 12px;">Nível</th>
                                <th style="padding: 12px;">Pontos</th>
                                <th style="padding: 12px;">Experiência</th>
                                <th style="padding: 12px;">Último Acesso</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.rankingPontuacao.map((u, idx) => `
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px; text-align: center;">
                                        ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}
                                    </td>
                                    <td style="padding: 12px;">
                                        <strong>${u.nome}</strong><br>
                                        <span style="font-size: 12px; color: #666;">${u.login}</span>
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        <span style="background: #f1f5f9; padding: 4px 12px; border-radius: 20px;">🏆 ${u.nivel}</span>
                                    </td>
                                    <td style="padding: 12px; text-align: center; color: #f97316; font-weight: bold;">${u.pontos} pts</td>
                                    <td style="padding: 12px; text-align: center;">${u.experiencia || 0} XP</td>
                                    <td style="padding: 12px; text-align: center; font-size: 12px;">${u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleDateString('pt-BR') : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderConfigTab() {
        return `
            <div style="background: white; border-radius: 20px; padding: 24px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 32px;">
                    <div>
                        <h4>⚙️ Configurações Gerais</h4>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>🎡 Prêmios da Roleta (separados por vírgula)</label>
                            <input type="text" id="configRoleta" class="form-control" value="${this.configGamificacao?.roleta_premios?.join(', ') || '5, 10, 15, 20, 25, 50, 100'}" style="padding: 12px; border-radius: 12px;">
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>⭐ Pontos por Desafio (padrão)</label>
                            <input type="number" id="configPontosDesafio" class="form-control" value="${this.configGamificacao?.pontos_por_desafio || 50}" style="padding: 12px; border-radius: 12px;">
                        </div>
                        <div class="form-field" style="margin-bottom: 16px;">
                            <label>📸 Pontos por Envio de Foto</label>
                            <input type="number" id="configPontosFoto" class="form-control" value="${this.configGamificacao?.pontos_por_foto || 30}" style="padding: 12px; border-radius: 12px;">
                        </div>
                    </div>
                    <div>
                        <h4>📌 Dicas de Gamificação</h4>
                        <ul style="color: #666; line-height: 1.6;">
                            <li>✅ Crie desafios variados para manter o engajamento</li>
                            <li>✅ Ofereça recompensas atrativas e diversificadas</li>
                            <li>✅ Atualize os itens da loja periodicamente</li>
                            <li>✅ Aprove os resgates rapidamente para motivar os usuários</li>
                            <li>✅ Utilize desafios com foto para maior engajamento</li>
                            <li>✅ A IA ajuda na validação, mas você tem a palavra final</li>
                        </ul>
                    </div>
                </div>
                <div style="margin-top: 24px; text-align: right;">
                    <button id="salvarConfigBtn" class="btn-primary" style="background: #f97316;">💾 Salvar Configurações</button>
                </div>
            </div>
        `;
    }

    async carregarTodosDados() {
        await this.carregarItensRecompensa();
        await this.carregarDesafios();
        await this.carregarFotosDesafio();
        await this.carregarResgatesPendentes();
        await this.carregarRanking();
        await this.carregarConfigGamificacao();
    }

    async carregarItensRecompensa() {
        try {
            const itensRef = collection(db, 'itens_recompensa');
            const querySnapshot = await getDocs(itensRef);
            this.itensRecompensa = [];
            querySnapshot.forEach(doc => {
                this.itensRecompensa.push({ id: doc.id, ...doc.data() });
            });
            this.itensRecompensa.sort((a, b) => a.pontos - b.pontos);
        } catch (error) {
            console.error("Erro ao carregar itens:", error);
        }
    }

    async carregarDesafios() {
        try {
            const desafiosRef = collection(db, 'desafios_diarios');
            const querySnapshot = await getDocs(desafiosRef);
            this.desafiosDiarios = [];
            querySnapshot.forEach(doc => {
                this.desafiosDiarios.push({ id: doc.id, ...doc.data() });
            });
        } catch (error) {
            console.error("Erro ao carregar desafios:", error);
        }
    }

    async carregarFotosDesafio() {
        try {
            const fotosRef = collection(db, 'fotos_desafio');
            const querySnapshot = await getDocs(fotosRef);
            this.fotosDesafio = [];
            querySnapshot.forEach(doc => {
                this.fotosDesafio.push({ id: doc.id, ...doc.data() });
            });
            this.fotosDesafio.sort((a, b) => new Date(b.data_envio) - new Date(a.data_envio));
        } catch (error) {
            console.error("Erro ao carregar fotos desafio:", error);
        }
    }

    async carregarResgatesPendentes() {
        try {
            const resgatesRef = collection(db, 'resgates_realizados');
            const q = query(resgatesRef, where('status', '==', 'pendente'));
            const querySnapshot = await getDocs(q);
            this.resgatesPendentes = [];
            querySnapshot.forEach(doc => {
                this.resgatesPendentes.push({ id: doc.id, ...doc.data() });
            });
            this.resgatesPendentes.sort((a, b) => new Date(b.data_resgate) - new Date(a.data_resgate));
        } catch (error) {
            console.error("Erro ao carregar resgates:", error);
        }
    }

    async carregarRanking() {
        try {
            const pontosRef = collection(db, 'pontuacao_usuarios');
            const querySnapshot = await getDocs(pontosRef);
            this.rankingPontuacao = [];
            
            querySnapshot.forEach(doc => {
                const data = doc.data();
                // Filtra apenas se for paciente ou se tiver dados válidos
                if (data.login && (data.cargo === 'paciente' || !data.cargo)) {
                    this.rankingPontuacao.push({
                        id: doc.id,
                        login: data.login,
                        nome: data.nome || data.login,
                        pontos: data.pontos || 0,
                        nivel: data.nivel || 1,
                        experiencia: data.experiencia || 0,
                        ultimo_acesso: data.ultimo_acesso_diario || data.ultima_atualizacao
                    });
                }
            });
            
            // Ordena por pontos (maior para menor)
            this.rankingPontuacao.sort((a, b) => b.pontos - a.pontos);
            console.log(`✅ Ranking carregado: ${this.rankingPontuacao.length} usuários`);
            
        } catch (error) {
            console.error("Erro ao carregar ranking:", error);
            this.rankingPontuacao = [];
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
                    roleta_premios: [5, 10, 15, 20, 25, 50, 100],
                    pontos_por_desafio: 50,
                    pontos_por_foto: 30
                };
            }
        } catch (error) {
            console.error("Erro ao carregar config:", error);
        }
    }

    async salvarConfigGamificacao(roletaPremios, pontosDesafio, pontosFoto) {
        try {
            const configRef = doc(db, 'config_gamificacao', 'principal');
            await this.funcoes.setDoc(configRef, {
                roleta_premios: roletaPremios,
                pontos_por_desafio: pontosDesafio,
                pontos_por_foto: pontosFoto,
                ultima_atualizacao: new Date().toISOString(),
                atualizado_por: this.userInfo.nome,
                atualizado_por_login: this.userInfo.login
            });
            this.configGamificacao = { roleta_premios: roletaPremios, pontos_por_desafio: pontosDesafio, pontos_por_foto: pontosFoto };
            alert('✅ Configurações salvas com sucesso!');
        } catch (error) {
            console.error("Erro ao salvar config:", error);
            alert('❌ Erro ao salvar configurações.');
        }
    }

    async salvarItem(itemData, itemId = null) {
        try {
            const itensRef = collection(db, 'itens_recompensa');
            if (itemId) {
                const itemDoc = doc(db, 'itens_recompensa', itemId);
                await updateDoc(itemDoc, itemData);
                alert('✅ Item atualizado com sucesso!');
            } else {
                await addDoc(itensRef, itemData);
                alert('✅ Item criado com sucesso!');
            }
            await this.carregarItensRecompensa();
            this.activeTab = 'itens';
            await this.render();
        } catch (error) {
            console.error("Erro ao salvar item:", error);
            alert('❌ Erro ao salvar item.');
        }
    }

    async excluirItem(itemId) {
        if (!confirm('Tem certeza que deseja excluir este item?')) return;
        try {
            const itemDoc = doc(db, 'itens_recompensa', itemId);
            await deleteDoc(itemDoc);
            alert('✅ Item excluído com sucesso!');
            await this.carregarItensRecompensa();
            this.activeTab = 'itens';
            await this.render();
        } catch (error) {
            console.error("Erro ao excluir item:", error);
            alert('❌ Erro ao excluir item.');
        }
    }

    async salvarDesafio(desafioData, desafioId = null) {
        try {
            const desafiosRef = collection(db, 'desafios_diarios');
            if (desafioId) {
                const desafioDoc = doc(db, 'desafios_diarios', desafioId);
                await updateDoc(desafioDoc, desafioData);
                alert('✅ Desafio atualizado com sucesso!');
            } else {
                await addDoc(desafiosRef, desafioData);
                alert('✅ Desafio criado com sucesso!');
            }
            await this.carregarDesafios();
            this.activeTab = 'desafios';
            await this.render();
        } catch (error) {
            console.error("Erro ao salvar desafio:", error);
            alert('❌ Erro ao salvar desafio.');
        }
    }

    async excluirDesafio(desafioId) {
        if (!confirm('Tem certeza que deseja excluir este desafio?')) return;
        try {
            const desafioDoc = doc(db, 'desafios_diarios', desafioId);
            await deleteDoc(desafioDoc);
            alert('✅ Desafio excluído com sucesso!');
            await this.carregarDesafios();
            this.activeTab = 'desafios';
            await this.render();
        } catch (error) {
            console.error("Erro ao excluir desafio:", error);
            alert('❌ Erro ao excluir desafio.');
        }
    }

    async aprovarFoto(fotoId, usuarioLogin, pontos) {
        if (!confirm(`Confirmar aprovação da foto?\n\nUsuário: ${usuarioLogin}\nPontos: +${pontos}`)) return;
        
        try {
            const fotoDoc = doc(db, 'fotos_desafio', fotoId);
            await updateDoc(fotoDoc, {
                status: 'aprovado',
                pontos_ganhos: pontos,
                data_aprovacao: new Date().toISOString(),
                aprovado_por: this.userInfo.nome,
                aprovado_por_login: this.userInfo.login
            });
            
            // Adicionar pontos ao usuário
            await this.adicionarPontosUsuario(usuarioLogin, pontos, `📸 Desafio aprovado pelo nutricionista`);
            
            alert(`✅ Foto aprovada!\n\nUsuário: ${usuarioLogin}\n+${pontos} pontos adicionados!`);
            
            await this.carregarFotosDesafio();
            await this.carregarRanking();
            this.activeTab = 'fotos';
            await this.render();
            
        } catch (error) {
            console.error("Erro ao aprovar foto:", error);
            alert('❌ Erro ao aprovar foto.');
        }
    }

    async recusarFoto(fotoId) {
        if (!confirm('Tem certeza que deseja recusar esta foto? O usuário NÃO receberá os pontos.')) return;
        
        try {
            const fotoDoc = doc(db, 'fotos_desafio', fotoId);
            await updateDoc(fotoDoc, {
                status: 'recusado',
                data_recusado: new Date().toISOString(),
                recusado_por: this.userInfo.nome,
                recusado_por_login: this.userInfo.login
            });
            
            alert(`❌ Foto recusada. O usuário não receberá os pontos.`);
            
            await this.carregarFotosDesafio();
            this.activeTab = 'fotos';
            await this.render();
            
        } catch (error) {
            console.error("Erro ao recusar foto:", error);
            alert('❌ Erro ao recusar foto.');
        }
    }

    async adicionarPontosUsuario(usuarioLogin, pontos, descricao) {
        try {
            const userRef = doc(db, 'pontuacao_usuarios', usuarioLogin);
            const userDoc = await getDoc(userRef);
            
            let pontosAtuais = 0;
            let experienciaAtual = 0;
            let nivelAtual = 1;
            
            if (userDoc.exists()) {
                pontosAtuais = userDoc.data().pontos || 0;
                experienciaAtual = userDoc.data().experiencia || 0;
                nivelAtual = userDoc.data().nivel || 1;
            }
            
            const novosPontos = pontosAtuais + pontos;
            const novaExperiencia = experienciaAtual + pontos;
            const experienciaProxNivel = nivelAtual * 100;
            let novoNivel = nivelAtual;
            
            if (novaExperiencia >= experienciaProxNivel) {
                novoNivel = nivelAtual + Math.floor(novaExperiencia / 100);
            }
            
            if (userDoc.exists()) {
                await updateDoc(userRef, {
                    pontos: novosPontos,
                    experiencia: novaExperiencia,
                    nivel: novoNivel,
                    ultima_atualizacao: new Date().toISOString()
                });
            } else {
                await this.funcoes.setDoc(userRef, {
                    login: usuarioLogin,
                    pontos: novosPontos,
                    experiencia: novaExperiencia,
                    nivel: novoNivel,
                    data_criacao: new Date().toISOString()
                });
            }
            
            const transacaoRef = collection(db, 'transacoes_pontos');
            await addDoc(transacaoRef, {
                usuario_login: usuarioLogin,
                pontos: pontos,
                descricao: descricao,
                tipo: 'ganho',
                data: new Date().toISOString()
            });
            
        } catch (error) {
            console.error("Erro ao adicionar pontos:", error);
            throw error;
        }
    }

    async aprovarResgate(resgateId, usuarioLogin, itemNome) {
        if (!confirm(`Confirmar resgate de "${itemNome}" para o usuário?`)) return;
        
        try {
            const resgateDoc = doc(db, 'resgates_realizados', resgateId);
            await updateDoc(resgateDoc, {
                status: 'aprovado',
                data_aprovacao: new Date().toISOString(),
                aprovado_por: this.userInfo.nome,
                aprovado_por_login: this.userInfo.login
            });
            
            alert(`✅ Resgate aprovado!\n\nItem: ${itemNome}\nUsuário: ${usuarioLogin}\n\nO usuário será notificado.`);
            
            await this.carregarResgatesPendentes();
            this.activeTab = 'resgates';
            await this.render();
            
        } catch (error) {
            console.error("Erro ao aprovar resgate:", error);
            alert('❌ Erro ao aprovar resgate.');
        }
    }

    async recusarResgate(resgateId, usuarioLogin) {
        if (!confirm('Tem certeza que deseja recusar este resgate? Os pontos serão devolvidos ao usuário.')) return;
        
        try {
            const resgateDoc = doc(db, 'resgates_realizados', resgateId);
            const resgateData = (await getDoc(resgateDoc)).data();
            const pontosGastos = resgateData?.pontos_gastos || 0;
            
            // Devolver pontos ao usuário
            if (pontosGastos > 0) {
                await this.adicionarPontosUsuario(usuarioLogin, pontosGastos, `🔄 Devolução de pontos - Resgate recusado: ${resgateData?.item_nome || 'item'}`);
            }
            
            await updateDoc(resgateDoc, {
                status: 'recusado',
                data_recusado: new Date().toISOString(),
                recusado_por: this.userInfo.nome,
                recusado_por_login: this.userInfo.login,
                pontos_devolvidos: pontosGastos
            });
            
            alert(`❌ Resgate recusado.\n\nUsuário: ${usuarioLogin}\n${pontosGastos > 0 ? `${pontosGastos} pontos devolvidos ao usuário.` : ''}`);
            
            await this.carregarResgatesPendentes();
            await this.carregarRanking();
            this.activeTab = 'resgates';
            await this.render();
            
        } catch (error) {
            console.error("Erro ao recusar resgate:", error);
            alert('❌ Erro ao recusar resgate.');
        }
    }

    attachEvents() {
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tab = btn.getAttribute('data-tab');
                if (tab) {
                    this.activeTab = tab;
                    await this.render();
                }
            });
        });
        
        // Filtros da aba de fotos
        document.querySelectorAll('.fotos-filter-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const filtro = btn.getAttribute('data-filter');
                document.querySelectorAll('.fotos-filter-btn').forEach(b => {
                    b.style.background = '#e2e8f0';
                    b.style.color = '#333';
                });
                btn.style.background = '#f97316';
                btn.style.color = 'white';
                
                const container = document.getElementById('fotosListContainer');
                if (container) {
                    container.innerHTML = this.renderFotosList(filtro);
                    this.attachFotoEvents();
                }
            });
        });
        
        // Botões de itens
        const novoItemBtn = document.getElementById('novoItemBtn');
        if (novoItemBtn) {
            novoItemBtn.addEventListener('click', () => {
                document.getElementById('itemModalTitle').textContent = '➕ Novo Item';
                document.getElementById('itemForm').reset();
                document.getElementById('itemModal').style.display = 'flex';
            });
        }
        
        document.querySelectorAll('.editar-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.getAttribute('data-item-id');
                const item = this.itensRecompensa.find(i => i.id === itemId);
                if (item) {
                    document.getElementById('itemModalTitle').textContent = '✏️ Editar Item';
                    document.getElementById('itemNome').value = item.nome || '';
                    document.getElementById('itemDescricao').value = item.descricao || '';
                    document.getElementById('itemIcone').value = item.icone || '🎁';
                    document.getElementById('itemPontos').value = item.pontos || 0;
                    document.getElementById('itemTipo').value = item.tipo || 'outro';
                    document.getElementById('itemInfo').value = item.info_adicional || '';
                    document.getElementById('itemModal').style.display = 'flex';
                    
                    const form = document.getElementById('itemForm');
                    const handler = async (e) => {
                        e.preventDefault();
                        await this.salvarItem({
                            nome: document.getElementById('itemNome').value,
                            descricao: document.getElementById('itemDescricao').value,
                            icone: document.getElementById('itemIcone').value,
                            pontos: parseInt(document.getElementById('itemPontos').value),
                            tipo: document.getElementById('itemTipo').value,
                            info_adicional: document.getElementById('itemInfo').value,
                            ativo: true,
                            data_criacao: item.data_criacao || new Date().toISOString(),
                            data_atualizacao: new Date().toISOString()
                        }, itemId);
                        form.removeEventListener('submit', handler);
                        document.getElementById('itemModal').style.display = 'none';
                    };
                    form.removeEventListener('submit', form._submitHandler);
                    form._submitHandler = handler;
                    form.addEventListener('submit', handler);
                }
            });
        });
        
        document.querySelectorAll('.excluir-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.getAttribute('data-item-id');
                this.excluirItem(itemId);
            });
        });
        
        // Botões de desafios
        const novoDesafioBtn = document.getElementById('novoDesafioBtn');
        if (novoDesafioBtn) {
            novoDesafioBtn.addEventListener('click', () => {
                document.getElementById('desafioModalTitle').textContent = '➕ Novo Desafio';
                document.getElementById('desafioForm').reset();
                document.getElementById('desafioModal').style.display = 'flex';
            });
        }
        
        document.querySelectorAll('.editar-desafio-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const desafioId = btn.getAttribute('data-desafio-id');
                const desafio = this.desafiosDiarios.find(d => d.id === desafioId);
                if (desafio) {
                    document.getElementById('desafioModalTitle').textContent = '✏️ Editar Desafio';
                    document.getElementById('desafioTitulo').value = desafio.titulo || '';
                    document.getElementById('desafioDescricao').value = desafio.descricao || '';
                    document.getElementById('desafioIcone').value = desafio.icone || '🎯';
                    document.getElementById('desafioTipo').value = desafio.tipo || 'comum';
                    document.getElementById('desafioCategoria').value = desafio.categoria || 'refeicao';
                    document.getElementById('desafioPontos').value = desafio.pontos || 0;
                    document.getElementById('desafioHorarioInicio').value = desafio.horario_inicio || '';
                    document.getElementById('desafioHorarioFim').value = desafio.horario_fim || '';
                    document.getElementById('desafioQuantidadePermitida').value = desafio.quantidade_permitida || 1;
                    document.getElementById('desafioExpiracao').value = desafio.data_expiracao || '';
                    document.getElementById('desafioModal').style.display = 'flex';
                    
                    const form = document.getElementById('desafioForm');
                    const handler = async (e) => {
                        e.preventDefault();
                        const desafioData = {
                            titulo: document.getElementById('desafioTitulo').value,
                            descricao: document.getElementById('desafioDescricao').value,
                            icone: document.getElementById('desafioIcone').value,
                            tipo: document.getElementById('desafioTipo').value,
                            pontos: parseInt(document.getElementById('desafioPontos').value),
                            quantidade_permitida: parseInt(document.getElementById('desafioQuantidadePermitida').value) || 1,
                            ativo: true,
                            data_atualizacao: new Date().toISOString()
                        };
                        
                        if (desafioData.tipo === 'foto') {
                            desafioData.categoria = document.getElementById('desafioCategoria').value;
                            desafioData.horario_inicio = document.getElementById('desafioHorarioInicio').value || null;
                            desafioData.horario_fim = document.getElementById('desafioHorarioFim').value || null;
                        }
                        
                        const expiracao = document.getElementById('desafioExpiracao').value;
                        if (expiracao) desafioData.data_expiracao = expiracao;
                        
                        await this.salvarDesafio(desafioData, desafioId);
                        form.removeEventListener('submit', handler);
                        document.getElementById('desafioModal').style.display = 'none';
                    };
                    form.removeEventListener('submit', form._submitHandler);
                    form._submitHandler = handler;
                    form.addEventListener('submit', handler);
                }
            });
        });
        
        document.querySelectorAll('.excluir-desafio-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const desafioId = btn.getAttribute('data-desafio-id');
                this.excluirDesafio(desafioId);
            });
        });
        
        // Eventos de foto
        this.attachFotoEvents();
        
        // Botões de resgates
        document.querySelectorAll('.aprovar-resgate-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const resgateId = btn.getAttribute('data-resgate-id');
                const usuarioLogin = btn.getAttribute('data-usuario-login');
                const itemNome = btn.getAttribute('data-item-nome');
                this.aprovarResgate(resgateId, usuarioLogin, itemNome);
            });
        });
        
        document.querySelectorAll('.recusar-resgate-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const resgateId = btn.getAttribute('data-resgate-id');
                const usuarioLogin = btn.getAttribute('data-usuario-login');
                this.recusarResgate(resgateId, usuarioLogin);
            });
        });
        
        // Botão salvar configurações
        const salvarConfigBtn = document.getElementById('salvarConfigBtn');
        if (salvarConfigBtn) {
            salvarConfigBtn.addEventListener('click', async () => {
                const roletaStr = document.getElementById('configRoleta')?.value;
                const roletaPremios = roletaStr ? roletaStr.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v)) : [5, 10, 15, 20, 25, 50, 100];
                const pontosDesafio = parseInt(document.getElementById('configPontosDesafio')?.value) || 50;
                const pontosFoto = parseInt(document.getElementById('configPontosFoto')?.value) || 30;
                await this.salvarConfigGamificacao(roletaPremios, pontosDesafio, pontosFoto);
            });
        }
        
        // Fechar modais
        const modais = ['itemModal', 'desafioModal', 'configModal', 'aprovarFotoModal'];
        modais.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                const closeBtn = modal.querySelector('.close');
                if (closeBtn) {
                    closeBtn.onclick = () => modal.style.display = 'none';
                }
                const cancelBtn = document.getElementById(`cancelar${modalId.charAt(0).toUpperCase() + modalId.slice(1)}Btn`);
                if (cancelBtn) {
                    cancelBtn.onclick = () => modal.style.display = 'none';
                }
            }
        });
        
        window.onclick = (event) => {
            modais.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (event.target === modal) modal.style.display = 'none';
            });
        };
        
        const itemForm = document.getElementById('itemForm');
        if (itemForm && !itemForm._hasListener) {
            const handler = async (e) => {
                e.preventDefault();
                await this.salvarItem({
                    nome: document.getElementById('itemNome').value,
                    descricao: document.getElementById('itemDescricao').value,
                    icone: document.getElementById('itemIcone').value,
                    pontos: parseInt(document.getElementById('itemPontos').value),
                    tipo: document.getElementById('itemTipo').value,
                    info_adicional: document.getElementById('itemInfo').value,
                    ativo: true,
                    data_criacao: new Date().toISOString()
                });
                document.getElementById('itemModal').style.display = 'none';
            };
            itemForm.addEventListener('submit', handler);
            itemForm._hasListener = true;
        }
        
        const desafioForm = document.getElementById('desafioForm');
        if (desafioForm && !desafioForm._hasListener) {
            const handler = async (e) => {
                e.preventDefault();
                const desafioData = {
                    titulo: document.getElementById('desafioTitulo').value,
                    descricao: document.getElementById('desafioDescricao').value,
                    icone: document.getElementById('desafioIcone').value,
                    tipo: document.getElementById('desafioTipo').value,
                    pontos: parseInt(document.getElementById('desafioPontos').value),
                    quantidade_permitida: parseInt(document.getElementById('desafioQuantidadePermitida').value) || 1,
                    ativo: true,
                    data_criacao: new Date().toISOString()
                };
                
                if (desafioData.tipo === 'foto') {
                    desafioData.categoria = document.getElementById('desafioCategoria').value;
                    desafioData.horario_inicio = document.getElementById('desafioHorarioInicio').value || null;
                    desafioData.horario_fim = document.getElementById('desafioHorarioFim').value || null;
                }
                
                const expiracao = document.getElementById('desafioExpiracao').value;
                if (expiracao) desafioData.data_expiracao = expiracao;
                
                await this.salvarDesafio(desafioData);
                document.getElementById('desafioModal').style.display = 'none';
            };
            desafioForm.addEventListener('submit', handler);
            desafioForm._hasListener = true;
        }
    }
    
    attachFotoEvents() {
        document.querySelectorAll('.aprovar-foto-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const fotoId = btn.getAttribute('data-foto-id');
                const pontos = parseInt(btn.getAttribute('data-pontos')) || 50;
                const usuario = btn.getAttribute('data-usuario');
                this.aprovarFoto(fotoId, usuario, pontos);
            });
        });
        
        document.querySelectorAll('.recusar-foto-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const fotoId = btn.getAttribute('data-foto-id');
                this.recusarFoto(fotoId);
            });
        });
    }
}
