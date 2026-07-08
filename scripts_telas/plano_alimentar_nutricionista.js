// plano_alimentar_nutricionista.js 

import { FuncoesCompartilhadas } from './0_home.js';
import { MenuProfissional } from './0_complementos_menu_profissional.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { ALIMENTOS_TACO } from './base_alimentos_taco.js';
import { 
    db,
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    doc, 
    deleteDoc,
    updateDoc,
    getDoc,
    setDoc
} from '../0_firebase_api_config.js';

const CATEGORIAS_ALIMENTOS_PADRAO = [
    'Açúc./doces',
    'Alim. prep.',
    'Aves',
    'Bebidas',
    'Carnes',
    'Cereais',
    'Cogumelos',
    'Frutas',
    'Gord./óleos',
    'Industrial',
    'Laticínios',
    'Legumes',
    'Leguminosos',
    'Nozes/sem.',
    'Outros',
    'Ovos',
    'Pescados',
    'Suplementos',
    'Temperos',
    'Tub./raízes',
    'Verduras'
];

const UNIDADES_ALIMENTOS_PADRAO = [
    'Banda',
    'Bife',
    'Bisnaga',
    'Bola',
    'C. amer.',
    'C. requej.',
    'Caixa',
    'Caneca',
    'Col. café',
    'Col. chá',
    'Col. servir',
    'Col. sobrem',
    'Col. sopa',
    'Concha',
    'Copo',
    'Cubo',
    'Dente',
    'Dose',
    'Envelope',
    'Escumad.',
    'Fatia',
    'Filé',
    'Folha',
    'Frasco',
    'Garrafa',
    'Gomo',
    'Grama',
    'Lata',
    'Litro',
    'Maço',
    'Metade',
    'Miligrama',
    'Mililitro',
    'Oitavo',
    'P. fundo',
    'P. raso',
    'P. sobrem',
    'Pacote',
    'Pedaço',
    'Pegador',
    'Pires',
    'Porção',
    'Posta',
    'Pote',
    'Quarto',
    'Quilograma',
    'Ramo',
    'Rodela',
    'Sachê',
    'Scoop',
    'Talo',
    'Tigela',
    'Tubo',
    'Unidade',
    'Xíc. café',
    'Xíc. chá'
];

function mesclarListaPadrao(padrao, valores) {
    const extras = [...new Set(valores.map((valor) => String(valor || '').trim()).filter(Boolean))]
        .filter((valor) => !padrao.includes(valor))
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return [...padrao, ...extras];
}

export class PlanoAlimentarNutricionista {
    constructor(userInfo, pacientesList) {
        this.userInfo = userInfo;
        this.funcoes = FuncoesCompartilhadas;
        this.pacientesList = pacientesList || [];
        this.selectedPaciente = null;
        this.planosList = [];
        this.planoExpandido = null;
        this.planoEditando = null;
        this.alimentosBase = [];
        this.alimentosCarregados = false;
        this.configAlimentosCarregada = false;
        this.categoriasAlimentos = [];
        this.unidadesAlimentos = [];
        this.alimentoEditandoId = null;
        this.refeicaoSelecionada = 'breakfast';
        this.opcaoDestinoPlano = null;
        this.itemOpcaoEditando = null;
        this.dragItemPlano = null;
        this.visualizacaoPlanoEditando = false;
        this.visualizacaoMealSelecionada = 'breakfast';
        this.visualizacaoOpcaoDestino = null;
        this.planoExportandoId = null;
        this.modalSelecaoAlimentosMealId = null;
        this.selecoesAlimentosModal = {};
        this.itensPlano = this.criarEstadoItensPlano();
        this.observacoesRefeicoes = this.criarEstadoObservacoesRefeicoes();
        this.detalhesBuscaAlimentos = {};
        this.menu = null;
        this.navegador = criarNavegador(userInfo, this.pacientesList);
    }

    render() {
        localStorage.setItem('activeModule', 'plano_alimentar');

        const app = document.getElementById('app');
        app.innerHTML = this.renderHTML();
        
        this.navegador.pacientesList = this.pacientesList;
        
        this.menu = new MenuProfissional(this.userInfo, (module) => this.navegador.navegarPara(module), 'plano_alimentar');
        const menuHtml = this.menu.render();
        const menuContainer = document.getElementById('menuContainer');
        if (menuContainer) {
            menuContainer.innerHTML = menuHtml;
        }
        this.menu.attachEvents();
        
        this.attachEvents();
        if (this.selectedPaciente) {
            void this.loadPlanos();
        } else {
            void this.carregarPacientesERestaurar();
        }
    }

    restaurarPacienteSelecionado() {
        const loginSalvo = localStorage.getItem('planoAlimentarSelectedPacienteLogin');
        if (!loginSalvo) return false;

        const paciente = this.pacientesList.find((item) => item.login === loginSalvo);
        if (paciente) {
            this.selectedPaciente = paciente;
            return true;
        }

        return false;
    }

    async carregarPacientesERestaurar() {
        try {
            if (!this.pacientesList.length) {
                this.pacientesList = await this.funcoes.loadPacientesList(this.userInfo.login);
                this.navegador.pacientesList = this.pacientesList;
            }

            if (this.restaurarPacienteSelecionado()) {
                await this.loadPlanos();
                this.render();
            }
        } catch (_error) {}
    }

    renderHTML() {
        return `
            <div class="dashboard-container" style="height: calc(100vh - 12px); max-height: calc(100vh - 12px); margin: 6px auto; display: flex; flex-direction: column;">
                <div id="menuContainer"></div>
    
                <div class="main-content" style="flex: 1; overflow: hidden; padding: 8px 12px; min-height: 0;">
                    <!-- Seleção de Paciente -->
                    <div id="pacienteInfo" style="margin-bottom: 8px;">
                        <select id="pacienteSelect" style="width: 100%; max-width: 350px; padding: 9px 12px; border-radius: 8px; border: 2px solid #e2e8f0; background: white; font-size: 15px;">
                            <option value="">-- Selecione um paciente --</option>
                            ${this.pacientesList.map(p => `
                                <option value="${this.escapeHtml(p.login)}" ${this.selectedPaciente?.login === p.login ? 'selected' : ''}>
                                    ${this.escapeHtml(p.nome)} (${this.escapeHtml(p.login)})
                                </option>
                            `).join('')}
                        </select>
                    </div>
    
                    ${this.selectedPaciente ? `
                        <!-- Lista de Planos -->
                        <div style="margin-bottom: 0;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <h3 style="color: #1a237e; margin: 0; font-size: 20px; line-height: 1.2;">
                                    📋 Planos Alimentares
                                    ${this.planosList.length > 0 ? `<span style="font-size: 14px; color: #64748b;">(${this.planosList.length})</span>` : ''}
                                </h3>
                            </div>
                            
                            <div id="planosContainer">
                                ${this.renderPlanosList()}
                            </div>
                        </div>
                    ` : `
                        <div class="empty-state" style="text-align: center; padding: 60px; background: white; border-radius: 1rem;">
                            <span style="font-size: 48px; opacity: 0.5;">👆</span>
                            <h3 style="margin-top: 16px;">Selecione um paciente</h3>
                            <p style="color: #64748b;">Escolha um paciente para visualizar os planos alimentares</p>
                        </div>
                    `}
                </div>
    
                <!-- Botões Flutuantes -->
                <div class="fab-container" style="position: fixed; bottom: 30px; right: 30px; z-index: 1000;">
                    <button id="btnListaAlimentos" class="fab-button fab-button-green" title="Lista de Alimentos">
                        <span class="fab-icon">☷</span>
                        <span class="fab-text">Lista de Alimentos</span>
                    </button>
                    ${this.selectedPaciente ? `
                    <button id="btnImportarPlano" class="fab-button" title="Importar Plano Alimentar XLSX">
                        <span class="fab-icon">⇧</span>
                        <span class="fab-text">Importar Plano</span>
                    </button>
                    <input id="inputImportarPlano" type="file" accept=".xlsx,.xls" style="display: none;">
                    <button id="btnNovoPlano" class="fab-button" title="Novo Plano Alimentar">
                        <span class="fab-icon">+</span>
                        <span class="fab-text">Novo Plano Alimentar</span>
                    </button>
                    ` : ''}
                </div>
    
                <!-- Modal para Criar/Editar Plano -->
                <div id="modalPlano" class="modal-overlay" style="display: none;">
                    <div class="modal-content" style="position: relative; background: white; border-radius: 16px; width: 96vw; max-width: 1520px; height: 96vh; max-height: calc(100vh - 16px); overflow: hidden; margin: 8px auto; display: flex; flex-direction: column;">
                        <div data-plano-form style="padding: 8px 12px; flex: 1; overflow: hidden;">
                            ${this.renderFormularioPlano()}
                        </div>

                        <div style="position: absolute; top: 12px; right: 12px; display: inline-flex; align-items: flex-start; gap: 6px; z-index: 9999;">
                            <button id="btnFecharPlano" type="button" aria-label="Fechar modal" onclick="document.getElementById('modalPlano').style.display='none'" style="width: 40px; height: 40px; padding: 0; background: rgba(15, 23, 42, 0.16); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 20px; display: inline-flex; align-items: center; justify-content: center; transition: opacity 0.2s ease, background 0.2s ease;">
                                X
                            </button>
                        </div>
                        <button id="btnSalvarPlano" class="modal-save-button" type="button" title="Salvar Plano">
                            <span class="modal-save-icon">💾</span>
                            <span class="modal-save-text">Salvar</span>
                        </button>
                    </div>
                </div>

                <div id="modalListaAlimentos" class="modal-overlay" style="display: none;">
                    <div class="modal-content" style="position: relative; background: white; border-radius: 16px; width: 96vw; max-width: 1520px; height: 96vh; max-height: calc(100vh - 16px); overflow: hidden; margin: 8px auto; display: flex; flex-direction: column;">
                        <button onclick="document.getElementById('modalListaAlimentos').style.display='none'"
                                style="position: absolute; top: 12px; right: 12px; z-index: 5; background: rgba(15,23,42,0.14); color: #334155; border: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; font-size: 18px;">
                            X
                        </button>
                        <div data-lista-alimentos-form style="padding: 16px 58px 16px 16px; flex: 1; overflow: hidden;">
                            ${this.renderModalListaAlimentos()}
                        </div>
                    </div>
                </div>

                <div id="modalConfigAlimentos" class="modal-overlay" style="display: none; padding: 18px;">
                    <div style="background: white; border-radius: 16px; width: min(92vw, 1240px); max-width: none; height: min(90vh, 820px); max-height: calc(100vh - 36px); overflow: hidden; margin: 0 auto; display: flex; flex-direction: column; box-sizing: border-box;">
                        <div style="background: linear-gradient(135deg, #334155 0%, #1e293b 100%); color: white; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center;">
                            <strong style="font-size: 15px;">Configurações</strong>
                            <button id="btnFecharConfigAlimentos" type="button" style="background: rgba(255,255,255,0.18); color: white; border: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; font-size: 18px;">X</button>
                        </div>
                        <div data-config-alimentos-form style="padding: 14px; overflow: hidden; flex: 1; min-height: 0; box-sizing: border-box;">
                            ${this.renderConfiguracoesAlimentos()}
                        </div>
                    </div>
                </div>

                <div id="modalNovoAlimento" class="modal-overlay" style="display: none;">
                    <div class="modal-content" style="background: white; border-radius: 16px; width: min(94vw, 980px); max-height: calc(100vh - 24px); overflow: hidden; margin: 12px auto; display: flex; flex-direction: column;">
                        <div style="background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); color: white; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center;">
                            <strong id="modalNovoAlimentoTitulo" style="font-size: 15px;">Novo Alimento</strong>
                            <button id="btnFecharNovoAlimento" type="button" style="background: rgba(255,255,255,0.18); color: white; border: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; font-size: 18px;">X</button>
                        </div>
                        <div data-novo-alimento-form style="padding: 16px; overflow: auto;">
                            ${this.renderFormularioAlimento()}
                        </div>
                    </div>
                </div>

                <div id="modalDetalheAlimento" class="modal-overlay" style="display: none; z-index: 3000;">
                    <div class="modal-content" style="background: white; border-radius: 16px; width: min(92vw, 560px); max-width: 560px; max-height: calc(100vh - 24px); overflow: hidden; margin: 12px auto; display: flex; flex-direction: column;">
                        <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: white; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center;">
                            <strong style="font-size: 15px;">Detalhes do alimento</strong>
                            <button id="btnFecharDetalheAlimento" type="button" style="background: rgba(255,255,255,0.18); color: white; border: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; font-size: 18px;">✕</button>
                        </div>
                        <div data-detalhe-alimento-form style="padding: 16px; overflow: auto; font-size: 14px; color: #334155;"></div>
                    </div>
                </div>

                <div id="foodSelectDropdown" class="modal-overlay" style="display: none; z-index: 3100; padding: 14px;">
                    <div class="modal-content" style="background: white; border-radius: 16px; width: min(96vw, 1660px); height: min(92vh, 860px); max-height: calc(100vh - 28px); overflow: hidden; margin: 0 auto; display: flex; flex-direction: column;">
                        <div style="background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); color: white; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex: 0 0 auto;">
                            <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
                                <strong style="font-size: 15px;">Selecionar alimentos</strong>
                                <span style="font-size: 12px; opacity: 0.9;">Selecione um ou mais alimentos e confirme para adicionar na refeição atual.</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; flex: 0 0 auto;">
                                <button id="btnFecharSelecaoAlimento" type="button" style="background: rgba(255,255,255,0.18); color: white; border: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; font-size: 18px;">X</button>
                            </div>
                        </div>
                        <div style="padding: 14px 14px 10px; display: grid; gap: 10px; flex: 0 0 auto;">
                            <div style="display: grid; grid-template-columns: minmax(240px, 1fr) auto; gap: 10px; align-items: end;">
                                <label style="font-size: 12px; color: #475569; font-weight: 600; display: flex; flex-direction: column;">Pesquisar na lista
                                    <input id="foodSelectSearch" autocomplete="off" placeholder="Pesquisar alimento" value="${this.escapeHtml(termoLista)}" style="width: 100%; margin-top: 6px; height: 36px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">
                                </label>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <button id="btnConfirmarSelecaoAlimento" type="button" style="height: 36px; padding: 0 16px; border: none; border-radius: 8px; background: #16a34a; color: white; cursor: pointer; font-weight: 700;">Confirmar Seleção</button>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; color: #64748b;">
                                <span id="foodSelectCount">0 selecionado(s)</span>
                                <span>Refeição atual: <strong id="foodSelectMealLabel">${this.escapeHtml(this.getRefeicoesPlano().find((item) => item.id === this.obterRefeicaoSelecionada())?.titulo || 'Café da Manhã')}</strong></span>
                            </div>
                        </div>
                        <div style="padding: 0 14px 14px; flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column;">
                            <div id="foodSelectResults" style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 6px;">
                                ${this.renderListaSelecaoModalAlimentos(this.listarAlimentosSelecao(termoLista))}
                            </div>
                        </div>
                    </div>
                </div>

                <div id="modalVisualizarPlano" class="modal-overlay" style="display: none;">
                    <div class="modal-content" style="background: white; border-radius: 16px; width: 98vw; max-width: 1600px; height: 96vh; max-height: calc(100vh - 16px); overflow: hidden; margin: 8px auto; display: flex; flex-direction: column;">
                        <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: white; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex: 0 0 auto;">
                            <strong id="modalVisualizarPlanoTitulo" style="font-size: 16px;">Plano alimentar</strong>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <button id="btnConcluirEdicaoPlanoVisualizado" type="button" style="display: none; height: 34px; padding: 0 12px; background: #dcfce7; color: #166534; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">Concluir Edição</button>
                                <div data-visualizar-plano-actions style="display: flex; align-items: center; gap: 8px;"></div>
                                <button id="btnFecharVisualizarPlano" type="button" style="background: rgba(255,255,255,0.18); color: white; border: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; font-size: 18px;">X</button>
                            </div>
                        </div>
                        <div data-visualizar-plano-form style="padding: 10px; overflow: hidden; flex: 1; min-height: 0; background: #f8fafc;"></div>
                    </div>
                </div>

                <div id="modalEditarOpcaoPlano" class="modal-overlay" style="display: none;">
                    <div class="modal-content" style="background: white; border-radius: 16px; width: min(94vw, 760px); max-height: calc(100vh - 24px); overflow: hidden; margin: 12px auto; display: flex; flex-direction: column;">
                        <div style="background: linear-gradient(135deg, #334155 0%, #1e293b 100%); color: white; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center;">
                            <strong id="modalEditarOpcaoPlanoTitulo" style="font-size: 15px;">Editar opção</strong>
                            <button id="btnFecharEditarOpcaoPlano" type="button" style="background: rgba(255,255,255,0.18); color: white; border: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; font-size: 18px;">X</button>
                        </div>
                        <div data-editar-opcao-plano-form style="padding: 16px; overflow: auto;"></div>
                    </div>
                </div>

                <div id="modalExportarPlano" class="modal-overlay" style="display: none; z-index: 3100;">
                    <div class="modal-content" style="background: white; border-radius: 16px; width: min(92vw, 420px); overflow: hidden; margin: 12px auto; display: flex; flex-direction: column;">
                        <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: white; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center;">
                            <strong style="font-size: 15px;">Exportar Plano</strong>
                            <button id="btnFecharExportarPlano" type="button" style="background: rgba(255,255,255,0.18); color: white; border: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; font-size: 18px;">X</button>
                        </div>
                        <div style="padding: 16px; display: grid; gap: 14px;">
                            <div style="display: grid; gap: 8px; color: #334155;">
                                <label style="display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px solid #dbe3ef; border-radius: 8px; cursor: pointer;">
                                    <input type="radio" name="formatoExportarPlano" value="pdf" checked>
                                    <span>PDF</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px solid #dbe3ef; border-radius: 8px; cursor: pointer;">
                                    <input type="radio" name="formatoExportarPlano" value="xlsx">
                                    <span>XLSX</span>
                                </label>
                            </div>
                            <div style="display: flex; justify-content: flex-end; gap: 8px;">
                                <button id="btnCancelarExportarPlano" type="button" style="padding: 10px 14px; border: none; border-radius: 8px; background: #e2e8f0; color: #334155; cursor: pointer;">Cancelar</button>
                                <button id="btnConfirmarExportarPlano" type="button" style="padding: 10px 16px; border: none; border-radius: 8px; background: #1a237e; color: white; cursor: pointer; font-weight: 700;">OK</button>
                            </div>
                        </div>
                    </div>
                </div>
    
                <style>
                    .fab-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: flex-end;
                        gap: 12px;
                    }
                    
                    .fab-button {
                        background: #1a237e;
                        color: white;
                        border: none;
                        border-radius: 50px;
                        padding: 12px;
                        cursor: pointer;
                        box-shadow: 0 4px 12px rgba(26, 35, 126, 0.3);
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: 0;
                        width: 56px;
                        height: 56px;
                        overflow: hidden;
                        white-space: nowrap;
                    }
                    
                    .fab-button:hover {
                        width: 260px;
                        padding: 12px 24px;
                        gap: 12px;
                        background: #283593;
                        box-shadow: 0 6px 20px rgba(26, 35, 126, 0.4);
                    }

                    .fab-button-green {
                        background: #0f766e;
                        box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);
                    }

                    .fab-button-green:hover {
                        width: 240px;
                        background: #115e59;
                        box-shadow: 0 6px 20px rgba(15, 118, 110, 0.4);
                    }

                    .modal-save-button {
                        position: absolute;
                        right: 18px;
                        bottom: 18px;
                        width: 56px;
                        height: 56px;
                        padding: 0;
                        border: none;
                        border-radius: 50px;
                        background: #1a237e;
                        color: white;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0;
                        overflow: hidden;
                        white-space: nowrap;
                        box-shadow: 0 4px 12px rgba(26, 35, 126, 0.3);
                        transition: all 0.3s ease;
                        z-index: 9999;
                    }

                    .modal-save-button:hover {
                        width: 150px;
                        padding: 0 18px 0 0;
                        gap: 10px;
                        background: #283593;
                        box-shadow: 0 6px 20px rgba(26, 35, 126, 0.4);
                    }

                    .modal-save-icon {
                        font-size: 22px;
                        width: 56px;
                        min-width: 56px;
                        height: 56px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        line-height: 1;
                    }

                    .modal-save-text {
                        opacity: 0;
                        transform: translateX(-8px);
                        transition: all 0.3s ease;
                        font-size: 16px;
                        font-weight: 600;
                    }

                    .modal-save-button:hover .modal-save-text {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    
                    .fab-icon {
                        font-size: 28px;
                        font-weight: 300;
                        min-width: 32px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .fab-text {
                        opacity: 0;
                        transform: translateX(-10px);
                        transition: all 0.3s ease;
                        font-size: 16px;
                        font-weight: 600;
                    }
                    
                    .fab-button:hover .fab-text {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    
                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.5);
                        z-index: 2000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }
                    
                    .plano-card {
                        transition: all 0.3s ease;
                    }
                    
                    .plano-card:hover {
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    }
                    
                    .plano-detalhes {
                        animation: slideDown 0.3s ease;
                    }
                    
                    @keyframes slideDown {
                        from {
                            opacity: 0;
                            max-height: 0;
                        }
                        to {
                            opacity: 1;
                            max-height: 2000px;
                        }
                    }
                    
                    .meal-textarea {
                        font-family: inherit;
                        line-height: 1.5;
                    }
                    
                    .meal-textarea:focus {
                        outline: none;
                        box-shadow: 0 0 0 2px #1a237e;
                        border-radius: 4px;
                    }
                    
                    textarea[readonly] {
                        background: #f1f5f9;
                        cursor: default;
                    }
                </style>
            </div>
        `;
    }

    renderPlanosList() {
        if (!this.planosList || this.planosList.length === 0) {
            return `
                <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 16px; border: 2px dashed #e2e8f0;">
                    <span style="font-size: 64px; display: block; margin-bottom: 16px;">📋</span>
                    <h4 style="color: #64748b; margin-bottom: 8px;">Nenhum plano alimentar</h4>
                    <p style="color: #94a3b8; margin-bottom: 24px;">Clique no botão + para criar o primeiro plano</p>
                </div>
            `;
        }

        // Ordena por data (mais recente primeiro)
        const planosOrdenados = [...this.planosList].sort((a, b) => {
            if (this.isPlanoAtual(a) !== this.isPlanoAtual(b)) {
                return this.isPlanoAtual(a) ? -1 : 1;
            }
            const dataA = this.extrairData(a.id);
            const dataB = this.extrairData(b.id);
            return dataB - dataA;
        });

        return planosOrdenados.map((plano, index) => {
            const dataFormatada = this.formatarDataExibicao(plano.id);
            const planoAtual = this.isPlanoAtual(plano, planosOrdenados, index);
            
            return `
                <div class="plano-card" style="
                    background: white;
                    border: 2px solid ${planoAtual ? '#22c55e' : '#e2e8f0'};
                    border-radius: 12px;
                    margin-bottom: 16px;
                    overflow: hidden;
                ">
                    <!-- Cabeçalho do Card -->
                    <div style="padding: 12px 14px; display: flex; align-items: center; justify-content: flex-start; gap: 12px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            ${planoAtual ? `<span style="
                                background: ${planoAtual ? '#22c55e' : '#64748b'};
                                color: white;
                                padding: 5px 12px;
                                border-radius: 20px;
                                font-size: 14px;
                                font-weight: 600;
                            ">
                                ATUAL
                            </span>` : `<button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.planoAlimentarInstance.definirPlanoAtual('${plano.id}')" title="Definir como plano atual" aria-label="Definir como plano atual" style="background: #64748b; color: white; padding: 5px 12px; border: none; border-radius: 20px; font-size: 14px; font-weight: 600; cursor: pointer;">
                                Tornar atual
                            </button>`}
                            
                            <span style="color: #1a237e; font-size: 17px; font-weight: 700;">
                                📅 ${dataFormatada}
                            </span>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 8px; margin-left: 4px;">
                            ${plano.goals ? `
                                <span style="color: #475569; font-size: 14px; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    🎯 ${this.escapeHtml(plano.goals)}
                                </span>
                            ` : ''}
                            <button type="button" onclick="window.planoAlimentarInstance.abrirModalVisualizarPlano('${plano.id}')" title="Exibir plano" aria-label="Exibir plano" style="height: 36px; padding: 0 14px; background: #1a237e; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 700;">Exibir Plano</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderRefeicaoCard(titulo, conteudo, modo = 'modal') {
        if (!conteudo || conteudo.trim() === '') return '';
        const altura = modo === 'modal' ? 'minmax(190px, 1fr)' : 'clamp(150px, 23vh, 220px)';
        
        return `
            <div style="background: white; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; height: ${altura}; overflow: hidden; display: flex; flex-direction: column;">
                <strong style="color: #1a237e; display: block; margin-bottom: 6px;">${titulo}</strong>
                <p style="color: #475569; margin: 0; font-size: 14px; white-space: pre-wrap; overflow-y: auto; flex: 1; padding-right: 4px;">${this.escapeHtml(conteudo)}</p>
            </div>
        `;
    }

    renderRefeicoesPlanoSalvo(plano, modo = 'modal') {
        const refeicoes = [
            { id: 'breakfast', titulo: 'Café da Manhã', icone: '🌅' },
            { id: 'morningSnack', titulo: 'Lanche da Manhã', icone: '🍎' },
            { id: 'lunch', titulo: 'Almoço', icone: '🍽️' },
            { id: 'afternoonSnack', titulo: 'Lanche da Tarde', icone: '🍌' },
            { id: 'dinner', titulo: 'Jantar', icone: '🌙' },
            { id: 'supper', titulo: 'Ceia', icone: '⭐' }
        ];
        const emEdicao = modo === 'modal-edit';
        const emModal = modo === 'modal' || emEdicao;
        const altura = emModal ? 'minmax(0, 1fr)' : 'clamp(150px, 23vh, 220px)';
        const gap = modo === 'modal' ? '10px' : '8px';
        return `
            <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(2, ${altura}); gap: ${gap}; min-height: 0; height: 100%; overflow: hidden;">
                ${refeicoes.map((refeicao) => this.renderRefeicaoPlanoSalvo(plano, refeicao, modo)).join('')}
            </div>
        `;
    }

    renderRefeicaoPlanoSalvo(plano, refeicao, modo = 'modal') {
        const itens = Array.isArray(plano.itens_plano?.[refeicao.id])
            ? plano.itens_plano[refeicao.id].map((item) => this.normalizarItemPlano(item))
            : [];
        const observacao = String(plano.observacoes_refeicoes?.[refeicao.id] || '').trim();
        const emEdicao = modo === 'modal-edit';
        const emModal = modo === 'modal' || emEdicao;
        const altura = emModal ? '100%' : 'clamp(150px, 23vh, 220px)';
        const headerPadding = emModal ? '8px 10px' : '5px 8px';
        const headerFont = emModal ? '15px' : '12px';
        const itemRows = emModal ? '48px' : 'minmax(34px, auto)';
        const itemGap = emModal ? '5px' : '4px';
        const bodyPadding = emModal ? '7px' : '6px';

        return `
            <section style="background: white; border: 1px solid #dbe3ef; border-radius: 8px; overflow: hidden; height: ${altura}; min-height: 0; display: flex; flex-direction: column;">
                <div style="background: #f1f5f9; color: #1a237e; padding: ${headerPadding}; font-weight: 700; display: flex; align-items: center; justify-content: space-between; gap: 6px; flex: 0 0 auto; font-size: ${headerFont}; line-height: 1.1;">
                    <span style="display: inline-flex; align-items: center; gap: 8px; min-width: 0;">
                        <span>${refeicao.icone}</span>
                        <span>${refeicao.titulo}</span>
                    </span>
                    <span style="display: inline-flex; align-items: center; gap: 5px;">
                        ${emEdicao
                            ? `<button type="button" onclick="event.stopPropagation(); window.planoAlimentarInstance.editarObservacaoPlanoSalvo('${plano.id}', '${refeicao.id}')" aria-label="Editar observações da refeição" title="Editar observações da refeição" style="height: 24px; min-width: 24px; padding: 0 7px; border: none; border-radius: 7px; background: ${observacao ? '#fef3c7' : '#e2e8f0'}; color: ${observacao ? '#92400e' : '#334155'}; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800;">Obs</button>`
                            : (observacao ? `<button type="button" onclick="event.stopPropagation(); window.planoAlimentarInstance.visualizarObservacaoPlanoSalvo('${plano.id}', '${refeicao.id}')" aria-label="Ver observações da refeição" title="Ver observações da refeição" style="height: 24px; min-width: 24px; padding: 0 7px; border: none; border-radius: 7px; background: #fef3c7; color: #92400e; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800;">Obs</button>` : '')}
                        <button type="button" onclick="event.stopPropagation(); window.planoAlimentarInstance.abrirDetalhesNutricionaisRefeicaoSalva('${plano.id}', '${refeicao.id}')" aria-label="Ver detalhes nutricionais da refeição" title="Ver detalhes nutricionais da refeição" style="width: 24px; min-width: 24px; height: 24px; padding: 0; border: none; border-radius: 7px; background: #e0f2fe; color: #0369a1; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">&#128065;</button>
                    </span>
                </div>
                <div style="padding: ${bodyPadding}; display: grid; align-content: start; grid-auto-rows: ${itemRows}; gap: ${itemGap}; overflow-y: auto; flex: 1; min-height: 0; ${emModal ? 'max-height: 219px;' : ''}">
                    ${itens.length
                        ? itens.map((item) => this.renderItemPlanoSalvo(plano.id, refeicao.id, item, modo)).join('')
                        : (plano[refeicao.id]
                            ? `<div style="color: #475569; margin: 0; font-size: 13px; white-space: pre-wrap; overflow-y: auto; padding-right: 4px;">${this.escapeHtml(plano[refeicao.id])}</div>`
                            : '<div style="color: #94a3b8; font-size: 12px; padding: 8px; border: 1px dashed #cbd5e1; border-radius: 8px;">Sem alimentos cadastrados.</div>')}
                </div>
            </section>
        `;
    }

    criarResumoNutricionalVazio() {
        return {
            gramas: 0,
            kcal: 0,
            carboidratos: 0,
            proteinas: 0,
            gorduras: 0,
            fibras: 0,
            sodio: 0
        };
    }

    somarResumoNutricional(destino, origem = {}) {
        Object.keys(destino).forEach((key) => {
            destino[key] += Number(origem[key] || 0);
        });
        return destino;
    }

    obterOpcaoVisivelItemPlanoSalvo(item) {
        const opcoes = Array.isArray(item.opcoes) && item.opcoes.length
            ? item.opcoes
            : [{ id: item.id, texto: item.texto, detalhes: item.detalhes }];
        const opcaoVisivelIndex = Math.max(0, Math.min(opcoes.length - 1, Number(item.opcaoVisivelIndex || 0)));
        return opcoes[opcaoVisivelIndex] || null;
    }

    calcularTotaisItensPlanoSalvo(itens = []) {
        return itens.reduce((total, item) => {
            const opcao = this.obterOpcaoVisivelItemPlanoSalvo(item);
            return this.somarResumoNutricional(total, opcao?.detalhes || {});
        }, this.criarResumoNutricionalVazio());
    }

    calcularTotaisPlanoSalvo(plano, refeicoes) {
        return refeicoes.reduce((total, refeicao) => {
            const itens = Array.isArray(plano.itens_plano?.[refeicao.id])
                ? plano.itens_plano[refeicao.id].map((item) => this.normalizarItemPlano(item))
                : [];
            return this.somarResumoNutricional(total, this.calcularTotaisItensPlanoSalvo(itens));
        }, this.criarResumoNutricionalVazio());
    }

    renderDetalhesNutricionaisResumo(titulo, resumo) {
        return `
            <div style="display: grid; gap: 12px;">
                <div style="font-size: 18px; font-weight: 700; color: #1a237e;">${this.escapeHtml(titulo)}</div>
                <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
                        <div style="font-size: 12px; color: #64748b;">Energia</div>
                        <div style="font-size: 18px; font-weight: 700; color: #1e293b;">${this.formatarNumero(resumo.kcal || 0, 0)} kcal</div>
                    </div>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
                        <div style="font-size: 12px; color: #64748b;">Quantidade</div>
                        <div style="font-size: 18px; font-weight: 700; color: #1e293b;">${this.formatarNumero(resumo.gramas || 0, 0)} g</div>
                    </div>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; line-height: 1.6;">
                    <div><strong>Carboidratos:</strong> ${this.formatarNumero(resumo.carboidratos || 0)} g</div>
                    <div><strong>Proteínas:</strong> ${this.formatarNumero(resumo.proteinas || 0)} g</div>
                    <div><strong>Gorduras:</strong> ${this.formatarNumero(resumo.gorduras || 0)} g</div>
                    <div><strong>Fibras:</strong> ${this.formatarNumero(resumo.fibras || 0)} g</div>
                    <div><strong>Sódio:</strong> ${this.formatarNumero(resumo.sodio || 0)} mg</div>
                </div>
            </div>
        `;
    }

    renderItemPlanoSalvo(planoId, mealId, item, modo = 'modal') {
        const opcoes = Array.isArray(item.opcoes) && item.opcoes.length
            ? item.opcoes
            : [{ id: item.id, texto: item.texto, detalhes: item.detalhes }];
        const opcaoVisivelIndex = Math.max(0, Math.min(opcoes.length - 1, Number(item.opcaoVisivelIndex || 0)));
        const opcaoVisivel = opcoes[opcaoVisivelIndex];
        const proximaOpcaoIndex = opcoes.length > 1 ? (opcaoVisivelIndex + 1) % opcoes.length : opcaoVisivelIndex;

        const emEdicao = modo === 'modal-edit';
        const emModal = modo === 'modal' || emEdicao;
        const itemMinHeight = emModal ? '48px' : '34px';
        const itemPadding = emModal ? '7px' : '4px 5px';
        const itemFont = emModal ? '14px' : '11px';
        const itemLineHeight = emModal ? '1.25' : '1.18';
        const itemTextMaxHeight = emModal ? '36px' : '26px';
        const optionWidth = emModal ? '42px' : '34px';
        const buttonSize = emModal ? '32px' : '24px';
        const dragAttrs = emEdicao
            ? `draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${planoId}|${mealId}|${item.id}')" ondragover="event.preventDefault()" ondrop="window.planoAlimentarInstance.moverItemPlanoVisualizado(event, '${planoId}', '${mealId}', '${item.id}')"`
            : '';
        return `
            <div ${dragAttrs} style="border: 1px solid #dbe3ef; border-left: 4px solid #1a237e; border-radius: 7px; padding: ${itemPadding}; background: #f8fafc; min-height: ${itemMinHeight}; overflow: hidden; cursor: ${emEdicao ? 'grab' : 'default'};">
                <div style="display: grid; grid-template-columns: 1fr auto auto ${emEdicao ? 'auto auto' : ''}; gap: 5px; align-items: start;">
                    <div style="min-width: 0; color: #334155; font-size: ${itemFont}; line-height: ${itemLineHeight}; max-height: ${itemTextMaxHeight}; overflow: hidden;">
                        ${this.escapeHtml(opcaoVisivel.texto)}
                    </div>
                    <button type="button" onclick="event.stopPropagation(); window.planoAlimentarInstance.alternarOpcaoPlanoSalvo('${planoId}', '${mealId}', '${item.id}')" aria-label="Alternar opção" title="${opcoes.length > 1 ? `Ver opção ${proximaOpcaoIndex + 1} de ${opcoes.length}` : 'Opção única'}" style="width: ${optionWidth}; min-width: ${optionWidth}; height: ${buttonSize}; padding: 0; border: none; border-radius: 6px; background: #fef3c7; color: #92400e; cursor: ${opcoes.length > 1 ? 'pointer' : 'default'}; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800;">${opcaoVisivelIndex + 1}/${opcoes.length}</button>
                    <button type="button" onclick="event.stopPropagation(); window.planoAlimentarInstance.abrirDetalheOpcaoPlanoSalvo('${planoId}', '${mealId}', '${item.id}')" aria-label="Ver detalhes" title="Ver detalhes da opção atual" style="width: ${buttonSize}; min-width: ${buttonSize}; height: ${buttonSize}; padding: 0; border: none; border-radius: 6px; background: #e0f2fe; color: #0369a1; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">&#128065;</button>
                    ${emEdicao ? `<button type="button" onclick="event.stopPropagation(); window.planoAlimentarInstance.prepararAdicionarOpcaoPlanoVisualizado('${planoId}', '${mealId}', '${item.id}')" aria-label="Adicionar opção" title="Adicionar opção neste alimento" style="width: ${buttonSize}; min-width: ${buttonSize}; height: ${buttonSize}; padding: 0; border: none; border-radius: 6px; background: #dcfce7; color: #166534; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-weight: 800;">+</button>` : ''}
                    ${emEdicao ? `<button type="button" onclick="event.stopPropagation(); window.planoAlimentarInstance.excluirOpcaoOuItemPlanoVisualizado('${planoId}', '${mealId}', '${item.id}')" aria-label="Remover" title="Remover opção atual" style="width: ${buttonSize}; min-width: ${buttonSize}; height: ${buttonSize}; padding: 0; border: none; border-radius: 6px; background: #fee2e2; color: #b91c1c; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">X</button>` : ''}
                </div>
            </div>
        `;
    }

    renderInfoCard(titulo, conteudo) {
        return `
            <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 12px;">
                <strong style="color: #1a237e; display: block; margin-bottom: 8px;">${titulo}</strong>
                <p style="color: #475569; margin: 0; white-space: pre-wrap;">${this.escapeHtml(conteudo)}</p>
            </div>
        `;
    }

    renderPlanoVisualizacao(plano) {
        return `
            <div style="height: 100%; min-height: 0; overflow: hidden; display: flex; flex-direction: column; gap: 8px;">
                ${this.visualizacaoPlanoEditando ? this.renderBarraEdicaoPlanoVisualizado(plano) : ''}
                <div style="flex: 1; min-height: 0; overflow: hidden;">
                    ${this.renderRefeicoesPlanoSalvo(plano, this.visualizacaoPlanoEditando ? 'modal-edit' : 'modal')}
                </div>
            </div>
        `;
    }

    renderBarraEdicaoPlanoVisualizado(plano) {
        const termo = document.getElementById('visualFoodSearch')?.value || '';
        const alimentos = this.filtrarAlimentos(termo);
        const destino = this.visualizacaoOpcaoDestino;
        return `
            <div style="background: white; border: 1px solid #dbe3ef; border-radius: 10px; padding: 8px; flex: 0 0 auto; display: grid; grid-template-columns: 190px minmax(180px, 260px) 1fr; gap: 8px; align-items: start;">
                <label style="font-size: 12px; color: #475569; font-weight: 700;">Refeição
                    <select id="visualMealSelect" onchange="window.planoAlimentarInstance.visualizacaoMealSelecionada = this.value" style="width: 100%; margin-top: 4px; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;">
                        ${this.getRefeicoesPlano().map((refeicao) => `<option value="${refeicao.id}" ${this.visualizacaoMealSelecionada === refeicao.id ? 'selected' : ''}>${refeicao.titulo}</option>`).join('')}
                    </select>
                </label>
                <label style="font-size: 12px; color: #475569; font-weight: 700;">Pesquisar alimento
                    <input id="visualFoodSearch" autocomplete="off" value="${this.escapeHtml(termo)}" oninput="window.planoAlimentarInstance.atualizarModalVisualizarPlano()" style="width: 100%; margin-top: 4px; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px;">
                </label>
                <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; min-height: 58px;">
                    ${destino ? `<div style="flex: 0 0 auto; align-self: center; font-size: 12px; color: #1a237e; font-weight: 700;">Adicionando opção</div>` : ''}
                    ${alimentos.map((alimento) => `
                        <div style="flex: 0 0 260px; display: grid; grid-template-columns: 1fr 54px 34px; gap: 6px; align-items: end; border-left: 2px solid #cbd5e1; padding-left: 8px;">
                            <div style="font-size: 13px; color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(alimento.nome)}">${this.escapeHtml(alimento.nome)}</div>
                            <input id="visualQtd_${this.escapeHtml(alimento.id)}" type="number" min="1" max="9999" step="1" value="1" style="width: 54px; padding: 7px 5px; border: 1px solid #cbd5e1; border-radius: 7px;">
                            <button type="button" onclick="window.planoAlimentarInstance.adicionarAlimentoPlanoVisualizado('${plano.id}', '${this.escapeHtml(alimento.id)}')" title="Adicionar" aria-label="Adicionar" style="width: 34px; height: 34px; border: none; border-radius: 8px; background: #16a34a; color: white; cursor: pointer;">+</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderAcoesPlanoVisualizacao(planoId) {
        return `
            <div style="position: relative;">
                <button type="button" onclick="event.stopPropagation(); window.planoAlimentarInstance.toggleMenuAcoesPlano()" title="Menu do plano" aria-label="Menu do plano" style="height: 34px; padding: 0 12px; background: rgba(255,255,255,0.18); color: white; border: none; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 18px;">☰</button>
                <div id="menuAcoesPlano" style="display: none; position: absolute; right: 0; top: 40px; width: 190px; background: white; color: #334155; border: 1px solid #dbe3ef; border-radius: 8px; box-shadow: 0 12px 28px rgba(15,23,42,0.18); overflow: hidden; z-index: 10000;">
                    <button type="button" onclick="window.planoAlimentarInstance.toggleMenuAcoesPlano(false); window.planoAlimentarInstance.abrirDetalhesNutricionaisPlanoSalvo('${planoId}')" style="width: 100%; padding: 10px 12px; border: none; background: white; color: #334155; text-align: left; cursor: pointer; font-size: 14px;">Detalhes do Plano</button>
                    <button type="button" onclick="window.planoAlimentarInstance.toggleMenuAcoesPlano(false); window.planoAlimentarInstance.alternarEdicaoPlanoVisualizado('${planoId}')" style="width: 100%; padding: 10px 12px; border: none; background: white; color: #334155; text-align: left; cursor: pointer; font-size: 14px;">Editar Plano</button>
                    <button type="button" onclick="window.planoAlimentarInstance.toggleMenuAcoesPlano(false); window.planoAlimentarInstance.exportarPlano('${planoId}')" style="width: 100%; padding: 10px 12px; border: none; background: white; color: #334155; text-align: left; cursor: pointer; font-size: 14px;">Exportar</button>
                    <button type="button" onclick="window.planoAlimentarInstance.toggleMenuAcoesPlano(false); window.planoAlimentarInstance.excluirPlano('${planoId}')" style="width: 100%; padding: 10px 12px; border: none; background: white; color: #b91c1c; text-align: left; cursor: pointer; font-size: 14px;">Excluir Plano</button>
                </div>
            </div>
        `;
    }

    getAlimentosIniciais() {
        return ALIMENTOS_TACO;
    }

    normalizarBusca(valor) {
        return String(valor || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    escapeHtml(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async carregarBaseAlimentos() {
        if (this.alimentosCarregados) return;

        const ref = collection(db, 'base_alimentos_nutricionais');
        const snapshot = await getDocs(ref);
        this.alimentosBase = [];
        snapshot.forEach((docSnap) => {
            if (docSnap.id !== '_configuracoes_alimentos') {
                this.alimentosBase.push({ id: docSnap.id, ...docSnap.data() });
            }
        });

        if (this.alimentosBase.length === 0) {
            for (const alimento of this.getAlimentosIniciais()) {
                await addDoc(ref, {
                    ...alimento,
                    fonte: alimento.fonte || 'base_inicial_editavel',
                    criado_por: this.userInfo.login,
                    data_criacao: new Date().toISOString()
                });
            }

            const novoSnapshot = await getDocs(ref);
            this.alimentosBase = [];
            novoSnapshot.forEach((docSnap) => {
                if (docSnap.id !== '_configuracoes_alimentos') {
                    this.alimentosBase.push({ id: docSnap.id, ...docSnap.data() });
                }
            });
        }

        this.alimentosCarregados = true;
    }

    obterCategoriasDerivadas() {
        const valores = [
            ...this.getAlimentosIniciais().map((alimento) => alimento.categoria),
            ...this.alimentosBase.map((alimento) => alimento.categoria)
        ];
        return mesclarListaPadrao(CATEGORIAS_ALIMENTOS_PADRAO, valores);
    }

    obterUnidadesDerivadas() {
        const valores = [
            ...this.getAlimentosIniciais().map((alimento) => alimento.unidadePadrao),
            ...this.alimentosBase.map((alimento) => alimento.unidadePadrao)
        ];
        return mesclarListaPadrao(UNIDADES_ALIMENTOS_PADRAO, valores);
    }

    async carregarConfiguracoesAlimentos() {
        if (this.configAlimentosCarregada) return;

        const configRef = doc(db, 'base_alimentos_nutricionais', '_configuracoes_alimentos');
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
            const data = configSnap.data();
            this.categoriasAlimentos = Array.isArray(data.categorias) ? data.categorias : [];
            this.unidadesAlimentos = Array.isArray(data.unidades) ? data.unidades : [];
        }

        if (!this.categoriasAlimentos.length) {
            this.categoriasAlimentos = this.obterCategoriasDerivadas();
        }

        if (!this.unidadesAlimentos.length) {
            this.unidadesAlimentos = this.obterUnidadesDerivadas();
        }

        this.configAlimentosCarregada = true;
    }

    renderSelectOptions(valores = [], selected = '') {
        return valores.map((valor) => `
            <option value="${this.escapeHtml(valor)}" ${valor === selected ? 'selected' : ''}>${this.escapeHtml(valor)}</option>
        `).join('');
    }

    renderConfiguracoesAlimentos() {
        const termo = document.getElementById('configFoodSearch')?.value || '';
        const alimentos = this.filtrarAlimentosConfiguracao(termo);
        return `
            <div style="display: grid; grid-template-columns: minmax(360px, 0.92fr) minmax(520px, 1.35fr); grid-template-rows: minmax(0, 1fr) 52px; gap: 12px; height: 100%; min-height: 0;">
                <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; min-height: 0; grid-row: 1 / 2;">
                    <label style="font-size: 12px; color: #475569; font-weight: 600; display: flex; flex-direction: column; min-height: 0;">Categorias Existentes
                        <textarea id="configCategoriasAlimentos" style="width: 100%; flex: 1; min-height: 0; resize: none; margin-top: 6px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; line-height: 1.35;">${this.escapeHtml(this.categoriasAlimentos.join('\n'))}</textarea>
                    </label>
                    <label style="font-size: 12px; color: #475569; font-weight: 600; display: flex; flex-direction: column; min-height: 0;">Unidades Existentes
                        <textarea id="configUnidadesAlimentos" style="width: 100%; flex: 1; min-height: 0; resize: none; margin-top: 6px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; line-height: 1.35;">${this.escapeHtml(this.unidadesAlimentos.join('\n'))}</textarea>
                    </label>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; min-height: 0; grid-row: 1 / 2;">
                    <div style="display: grid; grid-template-columns: minmax(240px, 1fr); gap: 8px; align-items: end; flex: 0 0 auto;">
                        <label style="font-size: 12px; color: #475569; font-weight: 600;">Unidade e Gramatura por Alimento
                            <input id="configFoodSearch" autocomplete="off" placeholder="Pesquisar alimento" value="${this.escapeHtml(termo)}" style="width: 100%; margin-top: 5px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;">
                        </label>
                    </div>
                    <div style="border: 1px solid #dbe3ef; border-radius: 10px; overflow: hidden; flex: 1; min-height: 0; display: flex; flex-direction: column;">
                        <div style="display: grid; grid-template-columns: minmax(260px, 1.5fr) minmax(150px, 0.75fr) minmax(96px, 0.45fr) minmax(96px, 0.45fr); gap: 10px; background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 700; padding: 9px 12px; flex: 0 0 auto;">
                            <span>Alimento</span>
                            <span>Unidade</span>
                            <span>g/unid</span>
                            <span>Estimativa</span>
                        </div>
                        <div id="configFoodRows" style="flex: 1; min-height: 0; overflow-y: auto;">
                            ${this.renderLinhasConfiguracaoGramatura(alimentos)}
                        </div>
                    </div>
                </div>
                <div style="grid-column: 1 / -1; grid-row: 2 / 3; display: flex; justify-content: flex-end; gap: 8px; padding-top: 10px; border-top: 1px solid #e2e8f0; flex: 0 0 auto;">
                    <button id="btnSalvarConfigAlimentos" type="button" style="height: 40px; padding: 0 16px; border: none; border-radius: 8px; background: #0f766e; color: white; cursor: pointer; font-weight: 600;">Salvar Configurações</button>
                </div>
            </div>
        `;
    }

    filtrarAlimentosConfiguracao(termo = '') {
        const busca = this.normalizarBusca(termo);
        return this.alimentosBase
            .filter((alimento) => !busca || this.normalizarBusca(alimento.nome).includes(busca))
            .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))
            .slice(0, 120);
    }

    renderLinhasConfiguracaoGramatura(alimentos) {
        if (!alimentos.length) {
            return '<div style="padding: 12px; color: #64748b; font-size: 13px;">Nenhum alimento encontrado.</div>';
        }

        return alimentos.map((alimento) => {
            const unidade = alimento.unidadePadrao || '';
            const unidadeDireta = this.unidadeIndicaGramatura(unidade);
            const gramasEfetivas = unidadeDireta ? 1 : this.obterGramasPorUnidadeEstimado(alimento);
            return `
                <div class="configFoodRow" data-food-id="${this.escapeHtml(alimento.id)}" style="display: grid; grid-template-columns: minmax(260px, 1.5fr) minmax(150px, 0.75fr) minmax(96px, 0.45fr) minmax(96px, 0.45fr); gap: 10px; align-items: center; padding: 9px 12px; border-top: 1px solid #e2e8f0; background: white;">
                    <div style="min-width: 0;">
                        <strong style="display: block; color: #1a237e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${this.escapeHtml(alimento.nome)}">${this.escapeHtml(alimento.nome)}</strong>
                        <span style="font-size: 11px; color: #64748b;">${this.escapeHtml(alimento.categoria || 'Sem categoria')}</span>
                    </div>
                    <select class="configFoodUnidade" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; background: white;">
                        ${this.renderSelectOptions(this.unidadesAlimentos, unidade)}
                    </select>
                    <input class="configFoodGramas" type="number" min="0.1" step="0.1" value="${this.escapeHtml(gramasEfetivas)}" ${unidadeDireta ? 'disabled' : ''} style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; background: ${unidadeDireta ? '#f1f5f9' : 'white'};">
                    <span style="font-size: 12px; color: #64748b;">${unidadeDireta ? 'medida direta' : `${this.formatarNumero(gramasEfetivas, 1)} g`}</span>
                </div>
            `;
        }).join('');
    }

    filtrarAlimentos(termo = '') {
        const busca = this.normalizarBusca(termo);
        if (!busca) return [];

        return this.alimentosBase
            .filter((alimento) => this.normalizarBusca(alimento.nome).startsWith(busca))
            .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))
            .slice(0, 20);
    }

    listarAlimentosSelecao(termo = '') {
        const busca = this.normalizarBusca(termo);
        return this.alimentosBase
            .filter((alimento) => !busca || this.normalizarBusca(alimento.nome).includes(busca))
            .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))
            .slice(0, 80);
    }

    normalizarUnidadeMedida(unidade = '') {
        return this.normalizarBusca(unidade)
            .replace(/\./g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    unidadeIndicaGramatura(unidade = '') {
        const normalizada = this.normalizarUnidadeMedida(unidade);
        return [
            'g',
            'gr',
            'grama',
            'gramas',
            'kg',
            'quilo',
            'quilos',
            'quilograma',
            'quilogramas',
            'mg',
            'miligrama',
            'miligramas',
            'ml',
            'mililitro',
            'mililitros',
            'l',
            'litro',
            'litros'
        ].includes(normalizada);
    }

    calcularGramasPorQuantidade(alimento, quantidade = 1) {
        const qtd = Number(quantidade || 0);
        const unidade = alimento?.unidadePadrao || '';
        const normalizada = this.normalizarUnidadeMedida(unidade);

        if (['kg', 'quilo', 'quilos', 'quilograma', 'quilogramas'].includes(normalizada)) {
            return qtd * 1000;
        }

        if (['mg', 'miligrama', 'miligramas'].includes(normalizada)) {
            return qtd / 1000;
        }

        if (['l', 'litro', 'litros'].includes(normalizada)) {
            return qtd * 1000;
        }

        if (['g', 'gr', 'grama', 'gramas', 'ml', 'mililitro', 'mililitros'].includes(normalizada)) {
            return qtd;
        }

        return qtd * this.obterGramasPorUnidadeEstimado(alimento);
    }

    obterGramasPorUnidadeEstimado(alimento = {}) {
        const gramasCadastradas = Number(alimento.gramasPorUnidade || 0);
        const unidade = this.normalizarUnidadeMedida(alimento.unidadePadrao || '');
        const nome = this.normalizarBusca(alimento.nome || '');
        const categoria = this.normalizarBusca(alimento.categoria || '');

        if (this.unidadeIndicaGramatura(alimento.unidadePadrao || '')) {
            return 1;
        }

        if (gramasCadastradas > 0 && gramasCadastradas !== 100) {
            return gramasCadastradas;
        }

        if (unidade === 'col servir') {
            if (nome.includes('feijao')) return 60;
            if (nome.includes('arroz')) return 50;
            if (nome.includes('cuscuz')) return 50;
            if (nome.includes('macarrao') || nome.includes('massa')) return 80;
            if (nome.includes('farofa')) return 35;
            if (nome.includes('pure')) return 60;
            if (nome.includes('salada') || nome.includes('alface') || nome.includes('couve')) return 30;
            if (categoria.includes('leguminos')) return 60;
            if (categoria.includes('legumes') || categoria.includes('verduras')) return 50;
            return 60;
        }

        if (unidade === 'concha') {
            if (nome.includes('feijao')) return 100;
            if (nome.includes('sopa') || nome.includes('caldo')) return 120;
            return 100;
        }

        const estimativasPorUnidade = {
            'banda': 50,
            'bife': 100,
            'bisnaga': 20,
            'bola': 60,
            'c amer': 150,
            'c requej': 200,
            'caixa': 200,
            'caneca': 240,
            'col cafe': 2,
            'col cha': 5,
            'col servir': 60,
            'col sobrem': 10,
            'col sopa': categoria.includes('gord') || categoria.includes('oleo') ? 8 : 15,
            'concha': 100,
            'copo': 200,
            'cubo': 10,
            'dente': 3,
            'dose': 50,
            'envelope': 10,
            'escumad': 80,
            'fatia': categoria.includes('latic') ? 25 : 30,
            'file': 120,
            'filé': 120,
            'folha': 5,
            'frasco': 200,
            'garrafa': 500,
            'gomo': 30,
            'lata': 300,
            'maco': 100,
            'maço': 100,
            'metade': 50,
            'oitavo': 25,
            'p fundo': 300,
            'p raso': 200,
            'p sobrem': 120,
            'pacote': 100,
            'pedaco': 80,
            'pedaço': 80,
            'pegador': 45,
            'pires': 80,
            'porcao': 100,
            'porção': 100,
            'posta': 120,
            'pote': 170,
            'quarto': 25,
            'ramo': 5,
            'rodela': 15,
            'sache': 10,
            'sachê': 10,
            'scoop': 30,
            'talo': 20,
            'tigela': 250,
            'tubo': 90,
            'unidade': categoria.includes('ovos') ? 50 : 100,
            'xic cafe': 50,
            'xic cha': 160
        };

        return estimativasPorUnidade[unidade] || gramasCadastradas || 100;
    }

    calcularNutrientes(alimento, quantidade, tipoQuantidade, gramasManual) {
        const qtd = Number(quantidade || 0);
        const gramas = tipoQuantidade === 'unidade'
            ? this.calcularGramasPorQuantidade(alimento, qtd)
            : Number(gramasManual || qtd || 0);
        const fator = gramas / 100;

        return {
            gramas,
            kcal: Number(alimento.kcal || 0) * fator,
            carboidratos: Number(alimento.carboidratos || 0) * fator,
            proteinas: Number(alimento.proteinas || 0) * fator,
            gorduras: Number(alimento.gorduras || 0) * fator,
            fibras: Number(alimento.fibras || 0) * fator,
            sodio: Number(alimento.sodio || 0) * fator
        };
    }

    formatarNumero(valor, casas = 1) {
        return Number(valor || 0).toLocaleString('pt-BR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: casas
        });
    }

    formatarQuantidadePreview(alimento, quantidade = 1, curto = false) {
        const qtd = Number(quantidade || 0);
        const unidade = alimento.unidadePadrao || 'porcao';
        const gramas = this.calcularGramasPorQuantidade(alimento, qtd);
        const quantidadeTexto = `${this.formatarNumero(qtd)} ${unidade}`;

        if (this.unidadeIndicaGramatura(unidade)) {
            return quantidadeTexto;
        }

        return `${quantidadeTexto} (${this.formatarNumero(gramas, 0)} g)`;
    }

    getRefeicoesPlano() {
        return [
            { id: 'breakfast', titulo: 'Café da Manhã' },
            { id: 'morningSnack', titulo: 'Lanche da Manhã' },
            { id: 'lunch', titulo: 'Almoço' },
            { id: 'afternoonSnack', titulo: 'Lanche da Tarde' },
            { id: 'dinner', titulo: 'Jantar' },
            { id: 'supper', titulo: 'Ceia' }
        ];
    }

    gerarIdItemPlano() {
        return `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    resumirTextoItemPlano(texto) {
        return String(texto || '')
            .split('|')[0]
            .trim();
    }

    criarItemPlanoDeLinha(linha) {
        const texto = this.resumirTextoItemPlano(linha);
        return {
            id: this.gerarIdItemPlano(),
            texto,
            detalhes: null,
            opcoes: [{
                id: this.gerarIdItemPlano(),
                texto,
                detalhes: null
            }],
            detalhesAberto: false
        };
    }

    criarOpcaoItemPlano(alimento, quantidade) {
        const nutrientes = this.calcularNutrientes(alimento, quantidade, 'unidade');
        const quantidadeTexto = this.formatarQuantidadePreview(alimento, quantidade, true);
        const texto = `${alimento.nome} - ${quantidadeTexto}`;

        return {
            id: this.gerarIdItemPlano(),
            texto,
            detalhes: {
                nome: alimento.nome,
                quantidadeTexto,
                gramas: nutrientes.gramas,
                kcal: nutrientes.kcal,
                carboidratos: nutrientes.carboidratos,
                proteinas: nutrientes.proteinas,
                gorduras: nutrientes.gorduras
            }
        };
    }

    normalizarItemPlano(item) {
        const texto = this.resumirTextoItemPlano(item.texto || '');
        const opcoesOriginais = Array.isArray(item.opcoes) && item.opcoes.length
            ? item.opcoes
            : [{
                id: item.id || this.gerarIdItemPlano(),
                texto,
                detalhes: item.detalhes || null
            }];

        const opcoes = opcoesOriginais
            .map((opcao) => ({
                id: opcao.id || this.gerarIdItemPlano(),
                texto: this.resumirTextoItemPlano(opcao.texto || ''),
                detalhes: opcao.detalhes || null
            }))
            .filter((opcao) => opcao.texto);

        return {
            id: item.id || this.gerarIdItemPlano(),
            texto: opcoes.length ? this.formatarTextoItemPlano({ opcoes }) : texto,
            detalhes: item.detalhes || opcoes[0]?.detalhes || null,
            opcoes,
            opcaoVisivelIndex: Number(item.opcaoVisivelIndex || 0),
            detalhesAberto: false
        };
    }

    formatarTextoItemPlano(item) {
        const opcoes = Array.isArray(item.opcoes) ? item.opcoes.filter((opcao) => opcao.texto) : [];
        if (!opcoes.length) return this.resumirTextoItemPlano(item.texto || '');
        if (opcoes.length === 1) return opcoes[0].texto;
        return opcoes.map((opcao) => opcao.texto).join(' ou ');
    }

    criarEstadoItensPlano(plano = {}) {
        return this.getRefeicoesPlano().reduce((estado, refeicao) => {
            if (Array.isArray(plano.itens_plano?.[refeicao.id])) {
                estado[refeicao.id] = plano.itens_plano[refeicao.id]
                    .map((item) => this.normalizarItemPlano(item))
                    .filter((item) => item.opcoes.length || item.texto);
                return estado;
            }

            const linhas = String(plano[refeicao.id] || '')
                .split('\n')
                .map((linha) => linha.trim())
                .filter(Boolean);
            estado[refeicao.id] = linhas.map((linha) => this.criarItemPlanoDeLinha(linha));
            return estado;
        }, {});
    }

    criarEstadoObservacoesRefeicoes(plano = {}) {
        const observacoes = plano.observacoes_refeicoes || {};
        return this.getRefeicoesPlano().reduce((estado, refeicao) => {
            estado[refeicao.id] = String(observacoes[refeicao.id] || '').trim();
            return estado;
        }, {});
    }

    renderRefeicoesPlano() {
        return `
            <div id="mealItemsGrid" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 12px; height: 100%; min-height: 0; overflow: hidden;">
                ${this.getRefeicoesPlano().map((refeicao) => this.renderRefeicaoEditor(refeicao)).join('')}
            </div>
        `;
    }

    renderRefeicaoEditor(refeicao) {
        const itens = this.itensPlano[refeicao.id] || [];
        const selecionada = this.refeicaoSelecionada === refeicao.id;
        const temObservacao = Boolean(this.observacoesRefeicoes?.[refeicao.id]);

        return `
            <div class="meal-editor-card" data-meal-id="${refeicao.id}" style="background: white; border: 2px solid ${selecionada ? '#1a237e' : '#e2e8f0'}; border-radius: 10px; overflow: hidden; height: 100%; min-height: 0; cursor: pointer; display: flex; flex-direction: column;">
                <div style="background: ${selecionada ? '#1a237e' : '#f1f5f9'}; color: ${selecionada ? 'white' : '#1a237e'}; padding: 10px 14px; font-weight: 600; display: flex; justify-content: space-between; gap: 8px;">
                    <span>${refeicao.titulo}</span>
                    <span style="display: inline-flex; align-items: center; gap: 6px;">
                        <button type="button" class="btnObservacaoRefeicao" data-meal-id="${refeicao.id}" title="Observações da refeição" aria-label="Observações da refeição" style="height: 24px; min-width: 24px; padding: 0 7px; border: none; border-radius: 7px; background: ${temObservacao ? '#fed7aa' : (selecionada ? 'rgba(255,255,255,0.18)' : '#e2e8f0')}; color: ${temObservacao ? '#9a3412' : (selecionada ? 'white' : '#334155')}; cursor: pointer; font-size: 12px; font-weight: 800;">Obs</button>
                        ${selecionada ? '<span style="font-size: 12px; font-weight: 500;">Selecionada</span>' : ''}
                    </span>
                </div>
                <div class="meal-items-scroll" data-meal-id="${refeicao.id}" style="padding: 8px; display: grid; align-content: start; grid-auto-rows: minmax(44px, auto); gap: 6px; flex: 1; overflow-y: auto; min-height: 0;">
                    ${itens.length ? itens.map((item) => this.renderItemRefeicao(refeicao.id, item)).join('') : '<div style="color: #94a3b8; font-size: 13px; padding: 10px; border: 1px dashed #cbd5e1; border-radius: 8px;">Nenhum alimento nesta refeição.</div>'}
                </div>
            </div>
        `;
    }

    renderItemRefeicao(mealId, item) {
        const opcoes = Array.isArray(item.opcoes) && item.opcoes.length
            ? item.opcoes
            : [{ id: item.id, texto: item.texto, detalhes: item.detalhes }];
        const opcaoVisivelIndex = Math.max(0, Math.min(opcoes.length - 1, Number(item.opcaoVisivelIndex || 0)));
        const opcaoVisivel = opcoes[opcaoVisivelIndex];
        const proximaOpcaoIndex = opcoes.length > 1 ? (opcaoVisivelIndex + 1) % opcoes.length : opcaoVisivelIndex;

        return `
            <div class="meal-item-row" draggable="true" data-meal-id="${mealId}" data-item-id="${item.id}" style="position: relative; overflow: hidden; border: 1px solid #dbe3ef; border-left: 4px solid #1a237e; border-radius: 8px; padding: 6px; background: #f8fafc; min-height: 44px;">
                <div style="display: grid; grid-template-columns: 1fr 76px; gap: 7px; align-items: start;">
                    <div style="min-width: 0; color: #334155; font-size: 12px; line-height: 1.25;">
                        ${this.escapeHtml(opcaoVisivel.texto)}
                    </div>
                    <div style="display: grid; grid-template-columns: 38px 30px; grid-template-rows: repeat(2, 30px); gap: 6px;">
                        <button type="button" class="btnAlternarOpcaoItemPlano" data-meal-id="${mealId}" data-item-id="${item.id}" aria-label="Alternar opção" title="${opcoes.length > 1 ? `Ver opção ${proximaOpcaoIndex + 1} de ${opcoes.length}` : 'Opção única'}" style="width: 38px; height: 30px; padding: 0; border: none; border-radius: 7px; background: #fef3c7; color: #92400e; cursor: ${opcoes.length > 1 ? 'pointer' : 'default'}; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800;">${opcaoVisivelIndex + 1}/${opcoes.length}</button>
                        <button type="button" class="btnDetalhesItemPlano" data-meal-id="${mealId}" data-item-id="${item.id}" aria-label="Exibir detalhes" title="Ver detalhes da opção atual" style="width: 30px; height: 30px; padding: 0; border: none; border-radius: 7px; background: #e0f2fe; color: #0369a1; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">&#128065;</button>
                        <button type="button" class="btnEditarOpcaoItemPlano" data-meal-id="${mealId}" data-item-id="${item.id}" aria-label="Editar opção" title="Editar opção atual" style="width: 38px; height: 30px; padding: 0; border: none; border-radius: 7px; background: #ede9fe; color: #6d28d9; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">✎</button>
                        <button type="button" class="btnExcluirItemPlano" data-meal-id="${mealId}" data-item-id="${item.id}" aria-label="Excluir item" title="Excluir alimento" style="width: 30px; height: 30px; padding: 0; border: none; border-radius: 7px; background: #fee2e2; color: #b91c1c; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">X</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderBaseNutricional() {
        const termo = document.getElementById('foodSearch')?.value || '';
        const termoLista = document.getElementById('foodSelectSearch')?.value || '';
        const alimentos = this.filtrarAlimentos(termo);
        const alimentosLista = this.listarAlimentosSelecao(termoLista);
        return `
                <div style="background: #f8fafc; border: 1px solid #dbe3ef; border-radius: 12px; padding: 6px 8px; margin-bottom: 10px; flex: 0 0 auto; overflow: visible; height: 72px; box-sizing: border-box; position: relative; z-index: 20;">
                <div style="display: grid; grid-template-columns: minmax(132px, 0.68fr) minmax(0, 4.32fr); gap: 8px; align-items: start; min-width: 0; height: 100%;">
                    <label style="display: grid; grid-template-rows: 16px 30px; gap: 4px; min-width: 0; align-items: start;">
                        <span style="font-size: 11px; color: #334155; font-weight: 700; line-height: 1; white-space: nowrap;">Pesquisar Alimento</span>
                        <span style="display: grid; grid-template-columns: minmax(0, 1fr) 34px; gap: 5px; position: relative;">
                            <input id="foodSearch" autocomplete="off" placeholder="Digite o alimento" style="width: 100%; min-width: 0; padding: 5px 7px; border: 1px solid #cbd5e1; border-radius: 8px; height: 30px; font-size: 13px;" value="${this.escapeHtml(termo)}">
                            <button id="btnAbrirSelecaoAlimento" type="button" title="Selecionar alimentos na lista" aria-label="Selecionar alimentos na lista" style="width: 34px; height: 30px; border: none; border-radius: 8px; background: #e2e8f0; color: #334155; cursor: pointer; font-size: 16px;">☰</button>
                        </span>
                    </label>
                    <div id="foodResults" style="min-width: 0; display: flex; gap: 8px; overflow-x: auto; overflow-y: hidden; padding: 0 0 8px 0; align-items: flex-start; min-height: 0; height: 100%; scrollbar-gutter: stable;">
                        ${this.renderResultadosAlimentos(alimentos)}
                    </div>
                </div>
            </div>
        `;
    }

    renderListaSelecaoAlimentos(alimentos) {
        if (!alimentos.length) {
            return '<div style="color: #94a3b8; font-size: 13px; padding: 8px;">Nenhum alimento encontrado.</div>';
        }

        return alimentos.slice(0, 80).map((alimento) => `
            <button type="button" class="btnSelecionarAlimentoLista" data-food-id="${this.escapeHtml(alimento.id)}" style="width: 100%; min-height: 34px; padding: 7px 8px; border: none; border-radius: 7px; background: #f8fafc; color: #334155; cursor: pointer; text-align: left; font-size: 13px;">
                ${this.escapeHtml(alimento.nome)}
            </button>
        `).join('');
    }

    renderListaSelecaoModalAlimentos(alimentos) {
        if (!alimentos.length) {
            return '<div style="padding: 12px; color: #64748b; font-size: 13px;">Nenhum alimento encontrado.</div>';
        }

        return `
            <div style="display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; align-content: start;">
                ${alimentos.map((alimento) => this.renderCardSelecaoAlimento(alimento)).join('')}
            </div>
        `;
    }

    renderCardSelecaoAlimento(alimento) {
        const selecionado = Boolean(this.selecoesAlimentosModal?.[alimento.id]);
        const quantidade = this.selecoesAlimentosModal?.[alimento.id]?.quantidade || 1;
        const unidade = alimento.unidadePadrao || '';
        return `
            <div class="btnCardSelecaoAlimento" data-food-id="${this.escapeHtml(alimento.id)}" role="button" tabindex="0" style="display: flex; flex-direction: column; gap: 8px; text-align: left; border: 2px solid ${selecionado ? '#ea580c' : '#dbe3ef'}; background: ${selecionado ? '#fff7ed' : 'white'}; color: #334155; border-radius: 12px; padding: 10px; cursor: pointer; min-height: 126px; box-shadow: ${selecionado ? '0 0 0 1px rgba(234,88,12,0.12)' : 'none'};">
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                    <div style="min-width: 0;">
                        <strong style="display: block; font-size: 13px; color: #1a237e; line-height: 1.3; white-space: normal;">${this.escapeHtml(alimento.nome)}</strong>
                        <span style="display: block; margin-top: 4px; font-size: 11px; color: #64748b;">${this.escapeHtml(alimento.categoria || 'Sem categoria')}</span>
                    </div>
                    <span style="flex: 0 0 auto; width: 18px; height: 18px; border-radius: 50%; border: 2px solid ${selecionado ? '#ea580c' : '#cbd5e1'}; background: ${selecionado ? '#ea580c' : 'white'}; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800;">${selecionado ? '✓' : ''}</span>
                </div>
                <label style="font-size: 11px; color: #475569; font-weight: 700; display: flex; flex-direction: column; gap: 4px;">
                    Quantidade
                    <input data-food-quantity="${this.escapeHtml(alimento.id)}" type="number" min="1" step="1" required value="${this.escapeHtml(quantidade)}" style="width: 100%; height: 32px; padding: 5px 8px; border: 1px solid ${selecionado ? '#fdba74' : '#cbd5e1'}; border-radius: 8px; font-size: 13px; background: white;">
                </label>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; font-size: 12px; color: #64748b;">
                    <span>Unidade</span>
                    <strong style="color: #334155;">${this.escapeHtml(unidade || 'porção')}</strong>
                </div>
            </div>
        `;
    }

    obterQuantidadeAlimento(foodId) {
        const input = document.getElementById(`foodQuantidade_${foodId}`);
        return Math.max(1, Math.min(9999, Number(input?.value || 1)));
    }

    atualizarPreviewQuantidadeAlimento(foodId) {
        const alimento = this.alimentosBase.find((item) => item.id === foodId);
        if (!alimento) return;

        const preview = document.querySelector(`[data-quantidade-preview="${foodId}"]`);
        if (preview) {
            const quantidade = this.obterQuantidadeAlimento(foodId);
            preview.textContent = this.formatarQuantidadePreview(alimento, quantidade, true).replace(/^[\d.,]+\s*/, '');
        }
    }

    renderResultadosAlimentos(alimentos) {
        if (!alimentos.length) {
            return '';
        }

        return alimentos.map((alimento) => {
            const quantidadeId = `foodQuantidade_${alimento.id}`;
            const quantidadeValor = Number(document.getElementById(quantidadeId)?.value || 1);
            const unidadeMedida = this.formatarQuantidadePreview(alimento, quantidadeValor || 1, true).replace(/^[\d.,]+\s*/, '');
            return `
                <div style="box-sizing: border-box; min-width: 0; flex: 0 0 calc((100% - 16px) / 3); height: 50px; overflow: hidden; display: grid; grid-template-columns: minmax(96px, 1fr) 52px minmax(46px, 0.44fr) 30px 30px; grid-template-rows: 16px 30px; gap: 4px 5px; align-items: start; padding-left: 8px; border-left: 2px solid #cbd5e1;">
                    <div style="font-size: 11px; color: #334155; font-weight: 700; line-height: 1; white-space: nowrap;">Nome do Alimento</div>
                    <div style="font-size: 11px; color: #334155; font-weight: 700; line-height: 1; white-space: nowrap;">QTD.</div>
                    <div style="font-size: 11px; color: #334155; font-weight: 700; line-height: 1; white-space: nowrap;">UNID.</div>
                    <div aria-hidden="true"></div>
                    <div aria-hidden="true"></div>
                    <div style="height: 30px; color: #1a237e; display: flex; align-items: center; overflow-x: auto; overflow-y: hidden; white-space: nowrap; font-size: 13px; line-height: 1.2; min-width: 0; border: 1px solid #e2e8f0; border-radius: 7px; padding: 0 7px; background: white;" title="${this.escapeHtml(alimento.nome)}">${this.escapeHtml(alimento.nome)}</div>
                    <label style="display: block; min-width: 0;">
                        <input id="${quantidadeId}" class="food-quantidade-input" data-food-id="${this.escapeHtml(alimento.id)}" type="number" min="1" max="9999" step="1" value="${Math.max(1, Math.min(9999, Math.round(quantidadeValor || 1)))}" oninput="this.value=this.value.slice(0,4)" aria-label="Quantidade de ${this.escapeHtml(alimento.nome)}" style="width: 52px; min-width: 52px; padding: 5px 4px; border: 1px solid #cbd5e1; border-radius: 7px; height: 30px; font-size: 13px;">
                    </label>
                    <div data-quantidade-preview="${this.escapeHtml(alimento.id)}" title="${this.escapeHtml(unidadeMedida)}" style="height: 30px; display: flex; align-items: center; font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; border: 1px solid #e2e8f0; border-radius: 7px; padding: 0 7px; background: white;">${this.escapeHtml(unidadeMedida)}</div>
                    <button type="button" class="btnDetalhesBuscaAlimento" data-food-id="${this.escapeHtml(alimento.id)}" aria-label="Ver detalhes" style="width: 30px; min-width: 30px; height: 30px; padding: 0; border: none; border-radius: 8px; background: #e0f2fe; color: #0369a1; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">&#128065;</button>
                    <button type="button" class="btnAdicionarAlimento" data-food-id="${this.escapeHtml(alimento.id)}" aria-label="Adicionar alimento" style="width: 30px; min-width: 30px; height: 30px; padding: 0; border: none; border-radius: 8px; background: #16a34a; color: white; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">+</button>
                    </div>
            `;
        }).join('');
    }

    renderizarPlanosContainer() {
        const container = document.getElementById('planosContainer');
        if (container) {
            container.innerHTML = this.renderPlanosList();
        }
    }

    isPlanoAtual(plano) {
        return plano?.atual === true;
    }

    async definirPlanoAtual(planoId) {
        if (!this.selectedPaciente || !planoId) return;

        try {
            const agoraIso = new Date().toISOString();
            await Promise.all(this.planosList.map((plano) => (
                updateDoc(
                    doc(db, 'planos_alimentares', this.userInfo.login, this.selectedPaciente.login, plano.id),
                    {
                        atual: plano.id === planoId,
                        data_atualizacao: agoraIso,
                        atualizado_por: this.userInfo.login
                    }
                )
            )));

            this.planosList = this.planosList.map((plano) => ({
                ...plano,
                atual: plano.id === planoId,
                data_atualizacao: agoraIso,
                atualizado_por: this.userInfo.login
            }));

            this.renderizarPlanosContainer();
        } catch (error) {
            alert('Nao foi possivel definir o plano atual.');
        }
    }

    recalcularItemPlanoComGramaturaAtual(item) {
        const itemNormalizado = this.normalizarItemPlano(item);
        const opcoesRecalculadas = (itemNormalizado.opcoes || [])
            .map((opcao) => {
                const alimento = this.encontrarAlimentoDaOpcao(opcao);
                if (!alimento) return opcao;

                const quantidade = this.obterQuantidadeOpcao(opcao);
                const opcaoRecalculada = this.criarOpcaoItemPlano(alimento, quantidade);
                return {
                    ...opcaoRecalculada,
                    id: opcao.id || opcaoRecalculada.id
                };
            })
            .filter((opcao) => opcao.texto);

        return {
            ...itemNormalizado,
            opcoes: opcoesRecalculadas,
            opcaoVisivelIndex: Math.max(0, Math.min(opcoesRecalculadas.length - 1, Number(itemNormalizado.opcaoVisivelIndex || 0))),
            texto: this.formatarTextoItemPlano({ opcoes: opcoesRecalculadas }),
            detalhes: opcoesRecalculadas[0]?.detalhes || itemNormalizado.detalhes || null,
            detalhesAberto: false
        };
    }

    recalcularPlanoComGramaturaAtual(plano) {
        const itensPlano = this.getRefeicoesPlano().reduce((estado, refeicao) => {
            const itens = Array.isArray(plano.itens_plano?.[refeicao.id])
                ? plano.itens_plano[refeicao.id]
                : this.criarEstadoItensPlano(plano)[refeicao.id] || [];

            estado[refeicao.id] = itens
                .map((item) => this.recalcularItemPlanoComGramaturaAtual(item))
                .filter((item) => item.opcoes?.length || item.texto);

            return estado;
        }, {});

        return {
            breakfast: this.obterTextoRefeicaoImportada(itensPlano, 'breakfast'),
            morningSnack: this.obterTextoRefeicaoImportada(itensPlano, 'morningSnack'),
            lunch: this.obterTextoRefeicaoImportada(itensPlano, 'lunch'),
            afternoonSnack: this.obterTextoRefeicaoImportada(itensPlano, 'afternoonSnack'),
            dinner: this.obterTextoRefeicaoImportada(itensPlano, 'dinner'),
            supper: this.obterTextoRefeicaoImportada(itensPlano, 'supper'),
            itens_plano: itensPlano,
            data_atualizacao: new Date().toISOString(),
            atualizado_por: this.userInfo.login
        };
    }

    async recalcularGramaturasPlanosExistentes(opcoes = {}) {
        const pacientes = (this.pacientesList || []).filter((paciente) => paciente?.login);
        if (!pacientes.length) return;

        if (opcoes.confirmar !== false) {
            const confirmado = confirm(`Recalcular gramaturas dos planos alimentares de todos os pacientes vinculados?\n\nOs documentos serao mantidos; apenas as quantidades em gramas e os totais nutricionais serao atualizados.`);
            if (!confirmado) return;
        }

        try {
            await this.carregarBaseAlimentos();
            let totalPlanos = 0;

            for (const paciente of pacientes) {
                const planosRef = collection(db, 'planos_alimentares', this.userInfo.login, paciente.login);
                const snapshot = await getDocs(planosRef);
                const atualizacoesPaciente = [];

                snapshot.forEach((docSnap) => {
                    const plano = { id: docSnap.id, ...docSnap.data() };
                    const payload = this.recalcularPlanoComGramaturaAtual(plano);
                    atualizacoesPaciente.push(updateDoc(
                        doc(db, 'planos_alimentares', this.userInfo.login, paciente.login, plano.id),
                        payload
                    ));
                });

                totalPlanos += atualizacoesPaciente.length;
                if (atualizacoesPaciente.length) {
                    await Promise.all(atualizacoesPaciente);
                }
            }

            if (opcoes.mostrarAlerta !== false) {
                alert(`Gramaturas recalculadas com sucesso.\n\nPlanos atualizados: ${totalPlanos}`);
            }
            if (this.selectedPaciente) {
                await this.loadPlanos();
                await this.render();
            }
        } catch (error) {
            alert('Nao foi possivel recalcular as gramaturas: ' + error.message);
        }
    }

    async desmarcarPlanosAtuais() {
        if (!this.selectedPaciente || !this.planosList.length) return;

        const agoraIso = new Date().toISOString();
        await Promise.all(this.planosList.map((plano) => (
            updateDoc(
                doc(db, 'planos_alimentares', this.userInfo.login, this.selectedPaciente.login, plano.id),
                {
                    atual: false,
                    data_atualizacao: agoraIso,
                    atualizado_por: this.userInfo.login
                }
            )
        )));

        this.planosList = this.planosList.map((plano) => ({
            ...plano,
            atual: false,
            data_atualizacao: agoraIso,
            atualizado_por: this.userInfo.login
        }));
    }

    renderFormularioPlano() {
        return `
            <div style="display: flex; flex-direction: column; gap: 14px; height: 100%; min-height: 0; overflow: hidden;">
                ${this.renderBaseNutricional()}
                <div style="flex: 1; min-height: 0; overflow: hidden; padding-right: 4px;">
                    ${this.renderRefeicoesPlano()}
                </div>
            </div>
        `;
    }

    filtrarAlimentosCadastro(termo = '') {
        const busca = this.normalizarBusca(termo);
        return this.alimentosBase
            .filter((alimento) => !busca || this.normalizarBusca(alimento.nome).startsWith(busca))
            .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    }

    renderModalListaAlimentos() {
        const termo = document.getElementById('listaFoodSearch')?.value || '';
        const alimentos = this.filtrarAlimentosCadastro(termo);

        return `
            <div style="display: flex; flex-direction: column; gap: 14px; height: 100%; overflow: hidden;">
                <div style="background: #f8fafc; border: 1px solid #dbe3ef; border-radius: 12px; padding: 14px; flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: grid; grid-template-columns: minmax(220px, 1fr) auto auto auto auto auto; gap: 8px; align-items: end; flex: 0 0 auto;">
                        <label style="font-size: 12px; color: #475569;">Pesquisar Alimento
                            <input id="listaFoodSearch" autocomplete="off" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;" value="${this.escapeHtml(termo)}">
                        </label>
                        <button id="btnConfigAlimentos" type="button" style="padding: 10px 14px; border: none; border-radius: 8px; background: #475569; color: white; cursor: pointer; font-weight: 600;">Configurações</button>
                        <button id="btnNovoAlimento" type="button" style="padding: 10px 14px; border: none; border-radius: 8px; background: #0f766e; color: white; cursor: pointer; font-weight: 600;">Novo Alimento</button>
                        <button id="btnAtualizarListaTaco" type="button" style="padding: 10px 14px; border: none; border-radius: 8px; background: #15803d; color: white; cursor: pointer; font-weight: 600;">Atualizar TACO</button>
                        <button id="btnExportarListaAlimentos" type="button" style="padding: 10px 14px; border: none; border-radius: 8px; background: #1a237e; color: white; cursor: pointer; font-weight: 600;">Exportar Lista</button>
                        <button id="btnImportarListaAlimentos" type="button" style="padding: 10px 14px; border: none; border-radius: 8px; background: #334155; color: white; cursor: pointer; font-weight: 600;">Importar Lista</button>
                        <input id="inputImportarListaAlimentos" type="file" accept=".xlsx,.xls" style="display: none;">
                    </div>

                    <div id="listaFoodResults" style="flex: 1; overflow-y: auto; display: grid; gap: 8px; padding-right: 4px;">
                        ${this.renderResultadosListaAlimentos(alimentos)}
                    </div>
                </div>
            </div>
        `;
    }

    renderFormularioAlimento() {
        return `
            <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; align-items: end;">
                <label style="font-size: 12px; color: #475569; grid-column: span 2;">Nome<input id="foodNome" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                <label style="font-size: 12px; color: #475569;">Categoria
                    <select id="foodCategoria" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: white;">
                        <option value="">Selecione</option>
                        ${this.renderSelectOptions(this.categoriasAlimentos)}
                    </select>
                </label>
                <label style="font-size: 12px; color: #475569;">Unidade
                    <select id="foodUnidade" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: white;">
                        <option value="">Selecione</option>
                        ${this.renderSelectOptions(this.unidadesAlimentos)}
                    </select>
                </label>
                <label style="font-size: 12px; color: #475569;">Gramatura por unidade
                    <input id="foodGramasUnidade" type="number" min="0.1" step="0.1" placeholder="Ex: 60" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;">
                </label>
                <label style="font-size: 12px; color: #475569;">kcal<input id="foodKcal" type="number" step="0.1" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                <label style="font-size: 12px; color: #475569;">Carb<input id="foodCarboidratos" type="number" step="0.1" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                <label style="font-size: 12px; color: #475569;">Prot<input id="foodProteinas" type="number" step="0.1" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                <label style="font-size: 12px; color: #475569;">Gord<input id="foodGorduras" type="number" step="0.1" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;"></label>
                <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 8px;">
                    <button id="btnCancelarAlimento" type="button" style="padding: 10px 14px; border: none; border-radius: 8px; background: #e2e8f0; color: #334155; cursor: pointer;">Cancelar</button>
                    <button id="btnSalvarAlimento" type="button" style="padding: 10px 16px; border: none; border-radius: 8px; background: #0f766e; color: white; cursor: pointer; font-weight: 600;">Salvar</button>
                </div>
            </div>
        `;
    }

    renderResultadosListaAlimentos(alimentos) {
        if (!alimentos.length) {
            return '<div style="color: #64748b; font-size: 13px;">Nenhum alimento encontrado.</div>';
        }

        return alimentos.map((alimento) => `
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center;">
                <div style="min-width: 0;">
                    <strong style="color: #1a237e; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(alimento.nome)}</strong>
                    <div style="font-size: 12px; color: #64748b;">${this.escapeHtml(alimento.categoria || 'Sem categoria')}</div>
                </div>
                <button type="button" class="btnEditarAlimento" data-food-id="${this.escapeHtml(alimento.id)}" style="padding: 8px 12px; border: none; border-radius: 8px; background: #e2e8f0; color: #334155; cursor: pointer;">Editar</button>
                <button type="button" class="btnExcluirAlimento" data-food-id="${this.escapeHtml(alimento.id)}" style="padding: 8px 12px; border: none; border-radius: 8px; background: #fee2e2; color: #b91c1c; cursor: pointer;">Excluir</button>
            </div>
        `).join('');
    }

    async abrirModalListaAlimentos() {
        const modal = document.getElementById('modalListaAlimentos');
        if (!modal) return;

        try {
            await this.carregarBaseAlimentos();
        } catch (error) {
            this.alimentosBase = [];
        }

        try {
            await this.carregarConfiguracoesAlimentos();
        } catch (error) {
            this.categoriasAlimentos = this.obterCategoriasDerivadas();
            this.unidadesAlimentos = this.obterUnidadesDerivadas();
            this.configAlimentosCarregada = true;
        }

        this.renderizarListaAlimentosModal();
        modal.style.display = 'flex';
        setTimeout(() => {
            document.getElementById('listaFoodSearch')?.focus();
        }, 80);
    }

    renderizarListaAlimentosModal() {
        const modal = document.getElementById('modalListaAlimentos');
        if (!modal) return;

        const formWrapper = modal.querySelector('[data-lista-alimentos-form]');
        if (formWrapper) {
            formWrapper.innerHTML = this.renderModalListaAlimentos();
            this.attachListaAlimentosEvents();
        }
    }

    renderizarConfigAlimentosModal() {
        const modal = document.getElementById('modalConfigAlimentos');
        if (!modal || modal.style.display === 'none') return;

        const formWrapper = modal.querySelector('[data-config-alimentos-form]');
        if (formWrapper) {
            formWrapper.innerHTML = this.renderConfiguracoesAlimentos();
            this.attachConfigAlimentosEvents();
        }
    }

    sincronizarModaisAlimentos({ lista = true, configuracoes = true, formulario = true } = {}) {
        if (lista) {
            this.renderizarListaAlimentosModal();
        }
        if (configuracoes) {
            this.renderizarConfigAlimentosModal();
        }
        if (formulario) {
            this.renderizarFormularioAlimentoModal(this.coletarDadosFormularioAlimento());
        }
    }

    attachListaAlimentosEvents() {
        const search = document.getElementById('listaFoodSearch');
        const results = document.getElementById('listaFoodResults');
        const refresh = () => {
            if (!results) return;
            results.innerHTML = this.renderResultadosListaAlimentos(this.filtrarAlimentosCadastro(search?.value || ''));
            this.attachListaAlimentosResultButtons();
        };

        search?.addEventListener('input', refresh);
        document.getElementById('btnConfigAlimentos')?.addEventListener('click', () => this.abrirModalConfigAlimentos());
        document.getElementById('btnNovoAlimento')?.addEventListener('click', () => this.abrirModalNovoAlimento());
        document.getElementById('btnAtualizarListaTaco')?.addEventListener('click', () => this.atualizarListaAlimentosTaco());
        document.getElementById('btnExportarListaAlimentos')?.addEventListener('click', () => this.exportarListaAlimentosXlsx());
        document.getElementById('btnImportarListaAlimentos')?.addEventListener('click', () => document.getElementById('inputImportarListaAlimentos')?.click());
        document.getElementById('inputImportarListaAlimentos')?.addEventListener('change', (event) => this.importarListaAlimentosXlsx(event));
        this.attachListaAlimentosResultButtons();
    }

    abrirModalConfigAlimentos() {
        const modal = document.getElementById('modalConfigAlimentos');
        if (!modal) return;

        const formWrapper = modal.querySelector('[data-config-alimentos-form]');
        if (formWrapper) formWrapper.innerHTML = this.renderConfiguracoesAlimentos();
        modal.style.display = 'flex';
        this.attachConfigAlimentosEvents();
    }

    fecharModalConfigAlimentos() {
        const modal = document.getElementById('modalConfigAlimentos');
        if (modal) modal.style.display = 'none';
    }

    lerListaConfigTextarea(id) {
        return [...new Set(String(document.getElementById(id)?.value || '')
            .split('\n')
            .map((valor) => valor.trim())
            .filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }

    attachConfigAlimentosEvents() {
        const search = document.getElementById('configFoodSearch');
        const rows = document.getElementById('configFoodRows');
        const refreshRows = () => {
            if (!rows) return;
            rows.innerHTML = this.renderLinhasConfiguracaoGramatura(this.filtrarAlimentosConfiguracao(search?.value || ''));
            this.attachConfigFoodRowEvents();
        };

        search?.addEventListener('input', refreshRows);
        document.getElementById('btnSalvarConfigAlimentos')?.addEventListener('click', () => this.salvarConfiguracoesAlimentos());
        this.attachConfigFoodRowEvents();
    }

    attachConfigFoodRowEvents() {
        document.querySelectorAll('.configFoodUnidade').forEach((select) => {
            select.addEventListener('change', () => {
                const row = select.closest('.configFoodRow');
                const alimento = this.alimentosBase.find((item) => item.id === row?.dataset.foodId);
                const input = row?.querySelector('.configFoodGramas');
                const estimativa = row?.querySelector('span:last-child');
                if (!alimento || !input || !estimativa) return;

                const unidadeDireta = this.unidadeIndicaGramatura(select.value);
                const alimentoPreview = { ...alimento, unidadePadrao: select.value };
                const gramas = unidadeDireta ? 1 : this.obterGramasPorUnidadeEstimado(alimentoPreview);
                input.disabled = unidadeDireta;
                input.value = gramas;
                input.style.background = unidadeDireta ? '#f1f5f9' : 'white';
                estimativa.textContent = unidadeDireta ? 'medida direta' : `${this.formatarNumero(gramas, 1)} g`;
            });
        });
    }

    async salvarConfiguracoesAlimentos() {
        const categorias = this.lerListaConfigTextarea('configCategoriasAlimentos');
        const unidades = this.lerListaConfigTextarea('configUnidadesAlimentos');
        const alimentosAlterados = this.coletarConfiguracoesGramaturaAlimentos();

        if (!categorias.length || !unidades.length) {
            alert('Informe pelo menos uma categoria e uma unidade.');
            return;
        }

        if (!alimentosAlterados) return;

        await setDoc(doc(db, 'base_alimentos_nutricionais', '_configuracoes_alimentos'), {
            tipo: 'configuracoes_alimentos',
            categorias,
            unidades,
            atualizado_por: this.userInfo.login,
            data_atualizacao: new Date().toISOString()
        }, { merge: true });

        if (alimentosAlterados.length) {
            await Promise.all(alimentosAlterados.map((alimento) => updateDoc(
                doc(db, 'base_alimentos_nutricionais', alimento.id),
                {
                    unidadePadrao: alimento.unidadePadrao,
                    gramasPorUnidade: alimento.gramasPorUnidade,
                    atualizado_por: this.userInfo.login,
                    data_atualizacao: new Date().toISOString()
                }
            )));

            this.alimentosBase = this.alimentosBase.map((alimento) => {
                const alterado = alimentosAlterados.find((item) => item.id === alimento.id);
                return alterado
                    ? { ...alimento, unidadePadrao: alterado.unidadePadrao, gramasPorUnidade: alterado.gramasPorUnidade }
                    : alimento;
            });
            this.alimentosCarregados = true;
        }

        this.categoriasAlimentos = categorias;
        this.unidadesAlimentos = unidades;
        this.configAlimentosCarregada = true;
        this.fecharModalConfigAlimentos();
        this.sincronizarModaisAlimentos({ configuracoes: false });

        if (alimentosAlterados.length && (this.pacientesList || []).length) {
            const recalcular = confirm('Unidades/gramaturas alteradas. Deseja recalcular os planos alimentares existentes de todos os pacientes vinculados agora?');
            if (recalcular) {
                await this.recalcularGramaturasPlanosExistentes({ confirmar: false });
            }
        }
    }

    coletarConfiguracoesGramaturaAlimentos() {
        const rows = [...document.querySelectorAll('.configFoodRow')];
        const alterados = [];

        for (const row of rows) {
            const alimento = this.alimentosBase.find((item) => item.id === row.dataset.foodId);
            const unidadePadrao = row.querySelector('.configFoodUnidade')?.value || '';
            const unidadeDireta = this.unidadeIndicaGramatura(unidadePadrao);
            const gramasPorUnidade = unidadeDireta
                ? 1
                : Number(row.querySelector('.configFoodGramas')?.value || 0);

            if (!alimento || !unidadePadrao) continue;
            if (!unidadeDireta && (!Number.isFinite(gramasPorUnidade) || gramasPorUnidade <= 0)) {
                alert(`Informe uma gramatura valida para ${alimento.nome}.`);
                return null;
            }

            if (alimento.unidadePadrao !== unidadePadrao || Number(alimento.gramasPorUnidade || 0) !== gramasPorUnidade) {
                alterados.push({ id: alimento.id, unidadePadrao, gramasPorUnidade });
            }
        }

        return alterados;
    }

    attachListaAlimentosResultButtons() {
        document.querySelectorAll('.btnEditarAlimento').forEach((button) => {
            button.addEventListener('click', () => this.abrirModalNovoAlimento(button.dataset.foodId));
        });
        document.querySelectorAll('.btnExcluirAlimento').forEach((button) => {
            button.addEventListener('click', () => this.excluirAlimentoBase(button.dataset.foodId));
        });
    }

    async excluirAlimentoBase(foodId) {
        const alimento = this.alimentosBase.find((item) => item.id === foodId);
        if (!alimento) return;
        if (!confirm(`Excluir ${alimento.nome}?`)) return;

        await deleteDoc(doc(db, 'base_alimentos_nutricionais', foodId));
        this.alimentosCarregados = false;
        await this.carregarBaseAlimentos();
        this.sincronizarModaisAlimentos();
    }

    async carregarXlsxLib() {
        if (window.XLSX) return window.XLSX;

        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Nao foi possivel carregar a biblioteca XLSX.'));
            document.head.appendChild(script);
        });

        return window.XLSX;
    }

    getCamposExportacaoAlimentos() {
        return [
            { key: 'nome', label: 'Nome' },
            { key: 'categoria', label: 'Categoria' },
            { key: 'unidadePadrao', label: 'Unidade' },
            { key: 'gramasPorUnidade', label: 'g/unid' },
            { key: 'kcal', label: 'kcal' },
            { key: 'carboidratos', label: 'Carb' },
            { key: 'proteinas', label: 'Prot' },
            { key: 'gorduras', label: 'Gord' },
            { key: 'fibras', label: 'Fibras' },
            { key: 'sodio', label: 'Sodio' }
        ];
    }

    normalizarAlimentoImportado(row) {
        const get = (...keys) => keys.map((key) => row[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '');
        const nome = String(get('Nome', 'nome') || '').trim();
        if (!nome) return null;

        return {
            nome,
            categoria: String(get('Categoria', 'categoria') || 'Geral').trim(),
            unidadePadrao: String(get('Unidade', 'unidadePadrao', 'Unidade Padrao') || 'porcao').trim(),
            gramasPorUnidade: Number(get('g/unid', 'gramasPorUnidade', 'Gramas Por Unidade') || 100),
            kcal: Number(get('kcal', 'Kcal') || 0),
            carboidratos: Number(get('Carb', 'carboidratos') || 0),
            proteinas: Number(get('Prot', 'proteinas') || 0),
            gorduras: Number(get('Gord', 'gorduras') || 0),
            fibras: Number(get('Fibras', 'fibras') || 0),
            sodio: Number(get('Sodio', 'sodio') || 0),
            fonte: 'xlsx_importado',
            atualizado_por: this.userInfo.login,
            data_atualizacao: new Date().toISOString()
        };
    }

    async substituirListaAlimentos(alimentos, fonte) {
        const ref = collection(db, 'base_alimentos_nutricionais');
        const snapshot = await getDocs(ref);
        await Promise.all(snapshot.docs
            .filter((docSnap) => docSnap.id !== '_configuracoes_alimentos')
            .map((docSnap) => deleteDoc(doc(db, 'base_alimentos_nutricionais', docSnap.id))));

        await Promise.all(alimentos.map((alimento) => addDoc(ref, {
            ...alimento,
            fonte: alimento.fonte || fonte,
            criado_por: this.userInfo.login,
            data_criacao: new Date().toISOString()
        })));

        this.alimentosCarregados = false;
        await this.carregarBaseAlimentos();
        this.categoriasAlimentos = this.obterCategoriasDerivadas();
        this.unidadesAlimentos = this.obterUnidadesDerivadas();
        await this.salvarConfiguracoesAlimentosSilencioso();
        this.sincronizarModaisAlimentos();
    }

    async salvarConfiguracoesAlimentosSilencioso() {
        await setDoc(doc(db, 'base_alimentos_nutricionais', '_configuracoes_alimentos'), {
            tipo: 'configuracoes_alimentos',
            categorias: this.categoriasAlimentos,
            unidades: this.unidadesAlimentos,
            atualizado_por: this.userInfo.login,
            data_atualizacao: new Date().toISOString()
        }, { merge: true });
        this.configAlimentosCarregada = true;
    }

    async atualizarListaAlimentosTaco() {
        const confirmado = confirm('A lista de alimentos atual sera substituida pela lista completa da TACO. Deseja continuar?');
        if (!confirmado) return;

        try {
            await this.substituirListaAlimentos(this.getAlimentosIniciais(), 'taco');
            alert('Lista TACO atualizada com sucesso.');
        } catch (error) {
            alert('Nao foi possivel atualizar a lista TACO.');
        }
    }

    async exportarListaAlimentosXlsx() {
        try {
            await this.carregarBaseAlimentos();
            const XLSX = await this.carregarXlsxLib();
            const campos = this.getCamposExportacaoAlimentos();
            const dados = this.alimentosBase
                .slice()
                .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))
                .map((alimento) => campos.reduce((row, campo) => {
                    row[campo.label] = alimento[campo.key] ?? '';
                    return row;
                }, {}));

            const worksheet = XLSX.utils.json_to_sheet(dados);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Alimentos');
            XLSX.writeFile(workbook, `lista_alimentos_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (error) {
            alert('Nao foi possivel exportar a lista de alimentos.');
        }
    }

    async importarListaAlimentosXlsx(event) {
        const input = event.target;
        const file = input?.files?.[0];
        if (!file) return;

        const confirmado = confirm('A lista de alimentos atual sera substituida pela lista importada. Deseja continuar?');
        if (!confirmado) {
            input.value = '';
            return;
        }

        try {
            const XLSX = await this.carregarXlsxLib();
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            const alimentosImportados = rows
                .map((row) => this.normalizarAlimentoImportado(row))
                .filter(Boolean);

            if (!alimentosImportados.length) {
                alert('A planilha nao possui alimentos validos.');
                return;
            }

            await this.substituirListaAlimentos(alimentosImportados, 'xlsx_importado');
            alert('Lista de alimentos importada com sucesso.');
        } catch (error) {
            alert('Nao foi possivel importar a lista de alimentos.');
        } finally {
            input.value = '';
        }
    }

    abrirModalNovoAlimento(foodId = null) {
        const modal = document.getElementById('modalNovoAlimento');
        if (!modal) return;

        this.alimentoEditandoId = foodId;
        const title = document.getElementById('modalNovoAlimentoTitulo');
        if (title) title.textContent = foodId ? 'Editar Alimento' : 'Novo Alimento';

        this.renderizarFormularioAlimentoModal();
        modal.style.display = 'flex';
        if (foodId) {
            this.preencherFormularioAlimento(foodId);
        } else {
            this.limparFormularioAlimento();
        }
        setTimeout(() => document.getElementById('foodNome')?.focus(), 80);
    }

    renderizarFormularioAlimentoModal(dados = null) {
        const modal = document.getElementById('modalNovoAlimento');
        if (!modal) return;

        const formWrapper = modal.querySelector('[data-novo-alimento-form]');
        if (formWrapper) {
            formWrapper.innerHTML = this.renderFormularioAlimento();
        }

        if (dados) {
            this.preencherFormularioAlimentoComDados(dados);
        } else if (this.alimentoEditandoId) {
            this.preencherFormularioAlimento(this.alimentoEditandoId);
        } else {
            this.limparFormularioAlimento();
        }

        this.attachFormularioAlimentoEvents();
    }

    attachFormularioAlimentoEvents() {
        document.getElementById('foodUnidade')?.addEventListener('change', () => this.atualizarCampoGramaturaAlimento());
        document.getElementById('btnSalvarAlimento')?.addEventListener('click', () => this.salvarAlimentoBase());
        document.getElementById('btnCancelarAlimento')?.addEventListener('click', () => this.fecharModalNovoAlimento());
    }

    fecharModalNovoAlimento() {
        const modal = document.getElementById('modalNovoAlimento');
        if (modal) modal.style.display = 'none';
        this.alimentoEditandoId = null;
    }

    attachEvents() {
        const pacienteSelect = document.getElementById('pacienteSelect');
        if (pacienteSelect) {
            pacienteSelect.addEventListener('change', async (e) => {
                const login = e.target.value;
                if (login) {
                    this.selectedPaciente = this.pacientesList.find(p => p.login === login);
                    localStorage.setItem('activeModule', 'plano_alimentar');
                    localStorage.setItem('planoAlimentarSelectedPacienteLogin', login);
                    this.planoExpandido = null;
                    this.planoEditando = null;
                    await this.loadPlanos();
                    await this.render();
                } else {
                    this.selectedPaciente = null;
                    localStorage.removeItem('planoAlimentarSelectedPacienteLogin');
                    this.planosList = [];
                    this.planoExpandido = null;
                    this.planoEditando = null;
                    await this.render();
                }
            });
        }

        const btnNovoPlano = document.getElementById('btnNovoPlano');
        if (btnNovoPlano) {
            btnNovoPlano.addEventListener('click', async () => {
                this.planoEditando = null;
                await this.abrirModal();
            });
        }

        document.getElementById('btnListaAlimentos')?.addEventListener('click', () => this.abrirModalListaAlimentos());
        document.getElementById('btnImportarPlano')?.addEventListener('click', () => document.getElementById('inputImportarPlano')?.click());
        document.getElementById('inputImportarPlano')?.addEventListener('change', (event) => this.importarPlanoXlsx(event));

        const btnSalvarPlano = document.getElementById('btnSalvarPlano');
        if (btnSalvarPlano) {
            btnSalvarPlano.addEventListener('click', () => this.saveMealPlan());
        }

        // Fechar modal ao clicar fora
        const modalPlano = document.getElementById('modalPlano');
        if (modalPlano) {
            modalPlano.addEventListener('click', (e) => {
                if (e.target === modalPlano) {
                    modalPlano.style.display = 'none';
                }
            });
        }

        // Expor instância globalmente
        const modalListaAlimentos = document.getElementById('modalListaAlimentos');
        if (modalListaAlimentos) {
            modalListaAlimentos.addEventListener('click', (e) => {
                if (e.target === modalListaAlimentos) {
                    modalListaAlimentos.style.display = 'none';
                }
            });
        }

        const modalDetalheAlimento = document.getElementById('modalDetalheAlimento');
        if (modalDetalheAlimento) {
            modalDetalheAlimento.addEventListener('click', (e) => {
                if (e.target === modalDetalheAlimento) {
                    modalDetalheAlimento.style.display = 'none';
                }
            });
        }

        const modalVisualizarPlano = document.getElementById('modalVisualizarPlano');
        if (modalVisualizarPlano) {
            modalVisualizarPlano.addEventListener('click', (e) => {
                if (e.target === modalVisualizarPlano) {
                    this.fecharModalVisualizarPlano();
                }
            });
        }

        const modalExportarPlano = document.getElementById('modalExportarPlano');
        if (modalExportarPlano) {
            modalExportarPlano.addEventListener('click', (e) => {
                if (e.target === modalExportarPlano) this.fecharModalExportarPlano();
            });
        }

        const modalNovoAlimento = document.getElementById('modalNovoAlimento');
        if (modalNovoAlimento) {
            modalNovoAlimento.addEventListener('click', (e) => {
                if (e.target === modalNovoAlimento) {
                    this.fecharModalNovoAlimento();
                }
            });
        }

        const modalConfigAlimentos = document.getElementById('modalConfigAlimentos');
        if (modalConfigAlimentos) {
            modalConfigAlimentos.addEventListener('click', (e) => {
                if (e.target === modalConfigAlimentos) {
                    this.fecharModalConfigAlimentos();
                }
            });
        }

        const modalEditarOpcaoPlano = document.getElementById('modalEditarOpcaoPlano');
        if (modalEditarOpcaoPlano) {
            modalEditarOpcaoPlano.addEventListener('click', (e) => {
                if (e.target === modalEditarOpcaoPlano) {
                    this.fecharModalEditarOpcaoPlano();
                }
            });
        }

        document.getElementById('btnFecharDetalheAlimento')?.addEventListener('click', () => {
            const modal = document.getElementById('modalDetalheAlimento');
            if (modal) modal.style.display = 'none';
        });

        document.getElementById('btnFecharNovoAlimento')?.addEventListener('click', () => this.fecharModalNovoAlimento());
        document.getElementById('btnFecharConfigAlimentos')?.addEventListener('click', () => this.fecharModalConfigAlimentos());
        document.getElementById('btnFecharEditarOpcaoPlano')?.addEventListener('click', () => this.fecharModalEditarOpcaoPlano());
        document.getElementById('btnFecharVisualizarPlano')?.addEventListener('click', () => this.fecharModalVisualizarPlano());
        document.getElementById('btnConcluirEdicaoPlanoVisualizado')?.addEventListener('click', () => {
            if (this.planoExpandido) this.alternarEdicaoPlanoVisualizado(this.planoExpandido);
        });
        document.getElementById('btnFecharExportarPlano')?.addEventListener('click', () => this.fecharModalExportarPlano());
        document.getElementById('btnCancelarExportarPlano')?.addEventListener('click', () => this.fecharModalExportarPlano());
        document.getElementById('btnConfirmarExportarPlano')?.addEventListener('click', () => this.confirmarExportarPlano());

        window.planoAlimentarInstance = this;
    }

    attachNutritionEvents() {
        const search = document.getElementById('foodSearch');
        const results = document.getElementById('foodResults');
        const btnAbrirSelecao = document.getElementById('btnAbrirSelecaoAlimento');
        const quantidade = document.getElementById('foodQuantidade');
        const refreshResults = () => {
            if (!results) return;
            results.innerHTML = this.renderResultadosAlimentos(this.filtrarAlimentos(search?.value || ''));
            this.attachFoodResultButtons();
        };

        search?.addEventListener('input', refreshResults);
        btnAbrirSelecao?.addEventListener('click', () => this.abrirModalSelecaoAlimentos());
        quantidade?.addEventListener('input', refreshResults);
        this.attachMealEditorEvents();
        this.attachFoodResultButtons();
        this.attachFoodSelectButtons();
        document.getElementById('btnFecharSelecaoAlimento')?.addEventListener('click', () => this.fecharModalSelecaoAlimentos());
        document.getElementById('btnConfirmarSelecaoAlimento')?.addEventListener('click', () => this.confirmarSelecaoAlimentosModal());
        document.getElementById('foodSelectSearch')?.addEventListener('input', () => this.renderizarModalSelecaoAlimentos());
        document.getElementById('foodSelectDropdown')?.addEventListener('click', (event) => {
            if (event.target.id === 'foodSelectDropdown') {
                this.fecharModalSelecaoAlimentos();
            }
        });
    }

    attachMealEditorEvents() {
        document.querySelectorAll('.meal-editor-card').forEach((card) => {
            card.addEventListener('click', (event) => {
                if (event.target.closest('button')) return;
                this.selecionarRefeicao(card.dataset.mealId);
            });
        });
        document.querySelectorAll('.btnExcluirItemPlano').forEach((button) => {
            button.addEventListener('click', () => this.excluirItemPlano(button.dataset.mealId, button.dataset.itemId));
        });
        document.querySelectorAll('.btnDetalhesItemPlano').forEach((button) => {
            button.addEventListener('click', () => this.alternarDetalhesItemPlano(button.dataset.mealId, button.dataset.itemId));
        });
        document.querySelectorAll('.btnEditarOpcaoItemPlano').forEach((button) => {
            button.addEventListener('click', () => this.abrirModalEditarOpcaoPlano(button.dataset.mealId, button.dataset.itemId));
        });
        document.querySelectorAll('.btnAlternarOpcaoItemPlano').forEach((button) => {
            button.addEventListener('click', () => this.alternarOpcaoVisivelItemPlano(button.dataset.mealId, button.dataset.itemId));
        });
        document.querySelectorAll('.btnObservacaoRefeicao').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                this.editarObservacaoRefeicao(button.dataset.mealId);
            });
        });
        document.querySelectorAll('.meal-item-row').forEach((row) => {
            row.addEventListener('dragstart', (event) => this.iniciarArrasteItemPlano(event, row.dataset.mealId, row.dataset.itemId));
            row.addEventListener('dragover', (event) => event.preventDefault());
            row.addEventListener('drop', (event) => this.soltarItemPlano(event, row.dataset.mealId, row.dataset.itemId));
            row.addEventListener('dragend', () => {
                this.dragItemPlano = null;
                row.style.opacity = '';
            });
        });
    }

    attachFoodResultButtons() {
        document.querySelectorAll('.btnDetalhesBuscaAlimento').forEach((button) => {
            button.addEventListener('click', () => this.alternarDetalhesBuscaAlimento(button.dataset.foodId));
        });
        document.querySelectorAll('.btnAdicionarAlimento').forEach((button) => {
            button.addEventListener('click', () => this.adicionarAlimentoNaRefeicao(button.dataset.foodId));
        });
        document.querySelectorAll('.food-quantidade-input').forEach((input) => {
            input.addEventListener('input', () => this.atualizarPreviewQuantidadeAlimento(input.dataset.foodId));
        });
    }

    attachFoodSelectButtons() {
        document.querySelectorAll('.btnCardSelecaoAlimento').forEach((button) => {
            button.addEventListener('click', (event) => {
                if (event.target.closest('input')) return;
                this.alternarSelecaoAlimentoModal(button.dataset.foodId);
            });
            button.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.alternarSelecaoAlimentoModal(button.dataset.foodId);
                }
            });
        });
        document.querySelectorAll('[data-food-quantity]').forEach((input) => {
            input.addEventListener('click', (event) => event.stopPropagation());
            input.addEventListener('input', () => this.atualizarQuantidadeSelecaoAlimentoModal(input.dataset.foodQuantity, input.value));
        });
    }

    abrirModalSelecaoAlimentos(mealId = null) {
        this.modalSelecaoAlimentosMealId = mealId || this.obterRefeicaoSelecionada();
        this.selecoesAlimentosModal = {};

        const modal = document.getElementById('foodSelectDropdown');
        if (!modal) return;

        const search = document.getElementById('foodSelectSearch');
        if (search) search.value = '';

        this.renderizarModalSelecaoAlimentos();
        modal.style.display = 'flex';
        setTimeout(() => search?.focus(), 60);
    }

    fecharModalSelecaoAlimentos() {
        const modal = document.getElementById('foodSelectDropdown');
        if (modal) modal.style.display = 'none';
        this.modalSelecaoAlimentosMealId = null;
        this.selecoesAlimentosModal = {};
    }

    alternarSelecaoAlimentoModal(foodId) {
        if (!foodId) return;
        if (this.selecoesAlimentosModal[foodId]) {
            delete this.selecoesAlimentosModal[foodId];
        } else {
            this.selecoesAlimentosModal[foodId] = {
                quantidade: 1
            };
        }
        this.renderizarModalSelecaoAlimentos();
    }

    atualizarQuantidadeSelecaoAlimentoModal(foodId, valor) {
        if (!foodId) return;
        const quantidade = Math.max(1, Math.floor(Number(valor || 1)));
        this.selecoesAlimentosModal[foodId] = {
            quantidade,
            ...(this.selecoesAlimentosModal[foodId] || {})
        };
        this.renderizarModalSelecaoAlimentos();
    }

    renderizarModalSelecaoAlimentos() {
        const modal = document.getElementById('foodSelectDropdown');
        if (!modal) return;

        const search = modal.querySelector('#foodSelectSearch');
        const results = modal.querySelector('#foodSelectResults');
        const count = modal.querySelector('#foodSelectCount');
        const mealLabel = modal.querySelector('#foodSelectMealLabel');

        if (mealLabel) {
            const mealId = this.modalSelecaoAlimentosMealId || this.obterRefeicaoSelecionada();
            const refeicao = this.getRefeicoesPlano().find((item) => item.id === mealId);
            mealLabel.textContent = refeicao?.titulo || 'Café da Manhã';
        }

        const alimentos = this.listarAlimentosSelecao(search?.value || '');
        if (results) {
            results.innerHTML = this.renderListaSelecaoModalAlimentos(alimentos);
            this.attachFoodSelectButtons();
        }

        if (count) {
            count.textContent = `${Object.keys(this.selecoesAlimentosModal || {}).length} selecionado(s)`;
        }
    }

    confirmarSelecaoAlimentosModal() {
        const mealId = this.modalSelecaoAlimentosMealId || this.obterRefeicaoSelecionada();
        const selecionados = Object.entries(this.selecoesAlimentosModal || {})
            .map(([foodId, dados]) => ({
                foodId,
                quantidade: Math.max(1, Math.floor(Number(dados?.quantidade || 1)))
            }))
            .filter((item) => item.foodId && item.quantidade > 0);

        if (!selecionados.length) {
            alert('Selecione ao menos um alimento.');
            return;
        }

        for (const item of selecionados) {
            const alimento = this.alimentosBase.find((registro) => registro.id === item.foodId);
            if (!alimento) continue;
            this.adicionarAlimentoNaRefeicaoComQuantidade(alimento, item.quantidade, mealId, false);
        }

        this.refeicaoSelecionada = mealId;
        this.fecharModalSelecaoAlimentos();
        this.renderizarRefeicoesPlano();
    }

    editarObservacaoRefeicao(mealId) {
        if (!this.getRefeicoesPlano().some((refeicao) => refeicao.id === mealId)) return;
        const refeicao = this.getRefeicoesPlano().find((item) => item.id === mealId);
        const atual = this.observacoesRefeicoes?.[mealId] || '';
        const novaObservacao = prompt(`Observações para ${refeicao.titulo}:`, atual);
        if (novaObservacao === null) return;

        this.observacoesRefeicoes[mealId] = String(novaObservacao || '').trim();
        this.renderizarRefeicoesPlano();
    }

    alternarDetalhesBuscaAlimento(foodId) {
        this.abrirModalDetalheAlimento(foodId);
    }

    abrirModalDetalheAlimento(foodId) {
        const alimento = this.alimentosBase.find((item) => item.id === foodId);
        if (!alimento) return;

        const quantidade = this.obterQuantidadeAlimento(foodId);
        const nutrientes = this.calcularNutrientes(alimento, quantidade, 'unidade');
        const quantidadeTexto = this.formatarQuantidadePreview(alimento, quantidade, true);
        const modal = document.getElementById('modalDetalheAlimento');
        const formWrapper = modal?.querySelector('[data-detalhe-alimento-form]');
        if (formWrapper) {
            formWrapper.innerHTML = `
                <div style="display: grid; gap: 12px;">
                    <div style="font-size: 18px; font-weight: 700; color: #1a237e;">${this.escapeHtml(alimento.nome)}</div>
                    <div style="font-size: 14px; color: #475569;">${this.escapeHtml(alimento.categoria || 'Sem categoria')}</div>
                    <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 10px; padding: 10px 12px; font-size: 15px; color: #1e293b; font-weight: 600;">
                        ${this.escapeHtml(quantidadeTexto)}
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
                            <div style="font-size: 12px; color: #64748b;">Energia</div>
                            <div style="font-size: 18px; font-weight: 700; color: #1e293b;">${this.formatarNumero(nutrientes.kcal || 0, 0)} kcal</div>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
                            <div style="font-size: 12px; color: #64748b;">Porção</div>
                            <div style="font-size: 18px; font-weight: 700; color: #1e293b;">${this.formatarNumero(nutrientes.gramas || 0, 0)} g</div>
                        </div>
                    </div>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; line-height: 1.6;">
                        <div><strong>Carboidratos:</strong> ${this.formatarNumero(nutrientes.carboidratos || 0)} g</div>
                        <div><strong>Proteínas:</strong> ${this.formatarNumero(nutrientes.proteinas || 0)} g</div>
                        <div><strong>Gorduras:</strong> ${this.formatarNumero(nutrientes.gorduras || 0)} g</div>
                        <div><strong>Fibras:</strong> ${this.formatarNumero(nutrientes.fibras || 0)} g</div>
                        <div><strong>Sódio:</strong> ${this.formatarNumero(nutrientes.sodio || 0)} mg</div>
                    </div>
                </div>
            `;
        }

        if (modal) modal.style.display = 'flex';
        setTimeout(() => document.getElementById('btnFecharDetalheAlimento')?.focus(), 50);
    }

    selecionarRefeicao(mealId) {
        if (!this.getRefeicoesPlano().some((refeicao) => refeicao.id === mealId)) return;
        this.refeicaoSelecionada = mealId;
        this.renderizarRefeicoesPlano();
    }

    obterRefeicaoSelecionada() {
        const mealId = this.refeicaoSelecionada || 'breakfast';
        return this.getRefeicoesPlano().some((refeicao) => refeicao.id === mealId) ? mealId : 'breakfast';
    }

    renderizarRefeicoesPlano() {
        const grid = document.getElementById('mealItemsGrid');
        if (!grid) return;

        grid.outerHTML = this.renderRefeicoesPlano();
        this.attachMealEditorEvents();
    }

    excluirItemPlano(mealId, itemId) {
        const item = (this.itensPlano[mealId] || []).find((registro) => registro.id === itemId);
        const opcoes = Array.isArray(item?.opcoes) && item.opcoes.length ? item.opcoes : [];
        const opcaoIndex = Math.max(0, Math.min(opcoes.length - 1, Number(item?.opcaoVisivelIndex || 0)));
        const opcaoNome = opcoes[opcaoIndex]?.texto || item?.texto || 'este alimento';
        if (!confirm(`Deseja excluir a opção em questão?\n\n${opcaoNome}`)) return;

        if (item && opcoes.length > 1) {
            item.opcoes.splice(opcaoIndex, 1);
            item.opcaoVisivelIndex = Math.max(0, Math.min(item.opcoes.length - 1, opcaoIndex));
            item.texto = this.formatarTextoItemPlano(item);
            item.detalhes = item.opcoes[0]?.detalhes || null;
        } else {
            this.itensPlano[mealId] = (this.itensPlano[mealId] || []).filter((itemPlano) => itemPlano.id !== itemId);
            if (this.opcaoDestinoPlano?.mealId === mealId && this.opcaoDestinoPlano?.itemId === itemId) {
                this.opcaoDestinoPlano = null;
            }
        }
        this.renderizarRefeicoesPlano();
    }

    iniciarArrasteItemPlano(event, mealId, itemId) {
        this.dragItemPlano = { mealId, itemId };
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', `${mealId}:${itemId}`);
        event.currentTarget.style.opacity = '0.55';
    }

    soltarItemPlano(event, mealIdDestino, itemIdDestino) {
        event.preventDefault();
        const origem = this.dragItemPlano;
        if (!origem || origem.mealId !== mealIdDestino || origem.itemId === itemIdDestino) return;

        const itens = this.itensPlano[mealIdDestino] || [];
        const origemIndex = itens.findIndex((item) => item.id === origem.itemId);
        const destinoIndex = itens.findIndex((item) => item.id === itemIdDestino);
        if (origemIndex < 0 || destinoIndex < 0) return;

        const [itemMovido] = itens.splice(origemIndex, 1);
        itens.splice(destinoIndex, 0, itemMovido);
        this.renderizarRefeicoesPlano();
    }

    obterQuantidadeOpcao(opcao) {
        const valor = String(opcao?.detalhes?.quantidadeTexto || '').match(/[\d.,]+/);
        if (!valor) return 1;
        return Math.max(1, Number(valor[0].replace(',', '.')) || 1);
    }

    encontrarAlimentoDaOpcao(opcao) {
        const nome = this.normalizarBusca(opcao?.detalhes?.nome || String(opcao?.texto || '').split(' - ')[0]);
        return this.alimentosBase.find((alimento) => this.normalizarBusca(alimento.nome) === nome) || null;
    }

    renderLinhaEditarOpcaoPlano(opcao = {}, index = 0) {
        const alimentoAtual = this.encontrarAlimentoDaOpcao(opcao);
        const quantidade = this.obterQuantidadeOpcao(opcao);
        const options = this.alimentosBase
            .slice()
            .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))
            .map((alimento) => `
                <option value="${this.escapeHtml(alimento.id)}" ${alimento.id === alimentoAtual?.id ? 'selected' : ''}>
                    ${this.escapeHtml(alimento.nome)}
                </option>
            `).join('');

        return `
            <div class="editar-opcao-plano-row" data-opcao-index="${index}" style="display: grid; grid-template-columns: 1fr 96px 34px; gap: 8px; align-items: end; padding: 10px; border: 1px solid #dbe3ef; border-radius: 10px; background: #f8fafc;">
                <label style="font-size: 12px; color: #475569; font-weight: 600;">Opção ${index + 1}
                    <select class="editarOpcaoPlanoAlimento" style="width: 100%; margin-top: 5px; padding: 9px; border: 1px solid #cbd5e1; border-radius: 8px; background: white;">
                        <option value="">Selecione um alimento</option>
                        ${options}
                    </select>
                </label>
                <label style="font-size: 12px; color: #475569; font-weight: 600;">Qtd.
                    <input class="editarOpcaoPlanoQuantidade" type="number" min="1" max="9999" step="1" value="${this.escapeHtml(quantidade)}" style="width: 100%; margin-top: 5px; padding: 9px; border: 1px solid #cbd5e1; border-radius: 8px;">
                </label>
                <button type="button" class="btnRemoverOpcaoPlanoModal" title="Remover esta opção" aria-label="Remover opção" style="width: 34px; height: 34px; border: none; border-radius: 8px; background: #fee2e2; color: #b91c1c; cursor: pointer;">X</button>
            </div>
        `;
    }

    renderFormularioEditarOpcaoPlano(opcoes) {
        return `
            <div style="display: grid; gap: 12px;">
                <div style="font-size: 13px; color: #475569;">Altere o alimento ou a quantidade da opção atual. Use "Adicionar outra opção" para criar uma nova alternativa para este mesmo alimento.</div>
                <div id="editarOpcaoPlanoRows" style="display: grid; gap: 10px;">
                    ${opcoes.map((opcao, index) => this.renderLinhaEditarOpcaoPlano(opcao, index)).join('')}
                </div>
                <div style="display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                    <button id="btnAdicionarOpcaoPlanoModal" type="button" style="padding: 10px 14px; border: none; border-radius: 8px; background: #0f766e; color: white; cursor: pointer; font-weight: 600;">Adicionar outra opção</button>
                    <div style="display: flex; gap: 8px;">
                        <button id="btnCancelarEditarOpcaoPlano" type="button" style="padding: 10px 14px; border: none; border-radius: 8px; background: #e2e8f0; color: #334155; cursor: pointer;">Cancelar</button>
                        <button id="btnSalvarEditarOpcaoPlano" type="button" style="padding: 10px 16px; border: none; border-radius: 8px; background: #1a237e; color: white; cursor: pointer; font-weight: 600;">Salvar</button>
                    </div>
                </div>
            </div>
        `;
    }

    coletarOpcoesEditadasPlano(permitirVazio = false) {
        const rows = [...document.querySelectorAll('.editar-opcao-plano-row')];
        return rows.map((row) => {
            const foodId = row.querySelector('.editarOpcaoPlanoAlimento')?.value || '';
            const quantidade = Math.max(1, Number(row.querySelector('.editarOpcaoPlanoQuantidade')?.value || 1));
            if (!foodId) return permitirVazio ? { foodId: '', quantidade } : null;
            const alimento = this.alimentosBase.find((item) => item.id === foodId);
            return alimento ? { foodId, quantidade, opcao: this.criarOpcaoItemPlano(alimento, quantidade) } : null;
        }).filter((item) => permitirVazio || item?.opcao);
    }

    anexarEventosModalEditarOpcaoPlano() {
        document.getElementById('btnCancelarEditarOpcaoPlano')?.addEventListener('click', () => this.fecharModalEditarOpcaoPlano());
        document.getElementById('btnSalvarEditarOpcaoPlano')?.addEventListener('click', () => this.salvarEdicaoOpcaoPlano());
        document.getElementById('btnAdicionarOpcaoPlanoModal')?.addEventListener('click', () => {
            const opcoesAtuais = this.coletarOpcoesEditadasPlano(true).map((item) => item?.opcao || {});
            opcoesAtuais.push({});
            const formWrapper = document.querySelector('[data-editar-opcao-plano-form]');
            if (formWrapper) {
                formWrapper.innerHTML = this.renderFormularioEditarOpcaoPlano(opcoesAtuais);
                this.anexarEventosModalEditarOpcaoPlano();
            }
        });
        document.querySelectorAll('.btnRemoverOpcaoPlanoModal').forEach((button) => {
            button.addEventListener('click', () => {
                const rows = [...document.querySelectorAll('.editar-opcao-plano-row')];
                if (rows.length <= 1) {
                    alert('Mantenha pelo menos uma opção.');
                    return;
                }
                button.closest('.editar-opcao-plano-row')?.remove();
                [...document.querySelectorAll('.editar-opcao-plano-row')].forEach((row, index) => {
                    const label = row.querySelector('label');
                    if (label?.firstChild) label.firstChild.textContent = `Opção ${index + 1}`;
                });
            });
        });
    }

    async abrirModalEditarOpcaoPlano(mealId, itemId) {
        try {
            await this.carregarBaseAlimentos();
        } catch (error) {
            alert('Nao foi possivel carregar a base de alimentos para editar.');
            return;
        }

        const item = (this.itensPlano[mealId] || []).find((registro) => registro.id === itemId);
        if (!item) return;

        const opcaoAtualIndex = Math.max(0, Math.min(
            (Array.isArray(item.opcoes) && item.opcoes.length ? item.opcoes.length : 1) - 1,
            Number(item.opcaoVisivelIndex || 0)
        ));
        this.itemOpcaoEditando = { mealId, itemId, opcaoIndex: opcaoAtualIndex };
        const opcoes = Array.isArray(item.opcoes) && item.opcoes.length
            ? item.opcoes
            : [{ id: item.id, texto: item.texto, detalhes: item.detalhes }];

        const modal = document.getElementById('modalEditarOpcaoPlano');
        const titulo = document.getElementById('modalEditarOpcaoPlanoTitulo');
        const formWrapper = modal?.querySelector('[data-editar-opcao-plano-form]');
        if (titulo) titulo.textContent = `Editar opção ${opcaoAtualIndex + 1}`;
        if (formWrapper) {
            formWrapper.innerHTML = this.renderFormularioEditarOpcaoPlano(opcoes);
            this.anexarEventosModalEditarOpcaoPlano();
        }
        if (modal) modal.style.display = 'flex';
    }

    salvarEdicaoOpcaoPlano() {
        if (!this.itemOpcaoEditando) return;
        const { mealId, itemId, opcaoIndex } = this.itemOpcaoEditando;
        const item = (this.itensPlano[mealId] || []).find((registro) => registro.id === itemId);
        if (!item) return;

        const opcoesEditadas = this.coletarOpcoesEditadasPlano(false).map((itemEditado) => itemEditado.opcao);
        if (!opcoesEditadas.length) {
            alert('Selecione pelo menos um alimento.');
            return;
        }

        item.opcoes = opcoesEditadas;
        item.opcaoVisivelIndex = Math.max(0, Math.min(opcoesEditadas.length - 1, Number(opcaoIndex || 0)));
        item.texto = this.formatarTextoItemPlano(item);
        item.detalhes = opcoesEditadas[0]?.detalhes || null;
        this.fecharModalEditarOpcaoPlano();
        this.renderizarRefeicoesPlano();
    }

    fecharModalEditarOpcaoPlano() {
        const modal = document.getElementById('modalEditarOpcaoPlano');
        if (modal) modal.style.display = 'none';
        this.itemOpcaoEditando = null;
    }

    alternarOpcaoVisivelItemPlano(mealId, itemId) {
        const item = (this.itensPlano[mealId] || []).find((registro) => registro.id === itemId);
        if (!item || !Array.isArray(item.opcoes) || item.opcoes.length < 2) return;

        item.opcaoVisivelIndex = (Number(item.opcaoVisivelIndex || 0) + 1) % item.opcoes.length;
        this.renderizarRefeicoesPlano();
    }

    alternarDetalhesItemPlano(mealId, itemId) {
        const item = (this.itensPlano[mealId] || []).find((registro) => registro.id === itemId);
        if (!item) return;

        this.abrirModalDetalheItemPlano(item, Number(item.opcaoVisivelIndex || 0));
    }

    abrirModalDetalheItemPlano(item, opcaoIndex = 0) {
        const detalhes = item.detalhes;
        const opcoes = Array.isArray(item.opcoes) ? item.opcoes : [];
        const opcaoAtualIndex = opcoes.length ? Math.max(0, Math.min(opcoes.length - 1, Number(opcaoIndex || 0))) : 0;
        const opcaoAtual = opcoes[opcaoAtualIndex] || null;
        const detalhesAtuais = opcaoAtual?.detalhes || detalhes;
        const modal = document.getElementById('modalDetalheAlimento');
        const formWrapper = modal?.querySelector('[data-detalhe-alimento-form]');
        if (formWrapper) {
            formWrapper.innerHTML = `
                <div style="display: grid; gap: 12px;">
                    <div style="font-size: 18px; font-weight: 700; color: #1a237e;">${this.escapeHtml(detalhesAtuais?.nome || opcaoAtual?.texto || item.texto)}</div>
                    <div style="font-size: 14px; color: #475569;">${this.escapeHtml(opcoes.length > 1 ? `${opcaoAtualIndex + 1}/${opcoes.length}` : detalhesAtuais?.quantidadeTexto || 'Sem quantidade informada')}</div>
                    <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 10px; padding: 10px 12px; font-size: 15px; color: #1e293b; font-weight: 600;">
                        ${this.escapeHtml(opcaoAtual?.texto || this.formatarTextoItemPlano(item))}
                    </div>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; line-height: 1.6;">
                        <div><strong>Quantidade:</strong> ${this.escapeHtml(detalhesAtuais?.quantidadeTexto || 'Sem quantidade informada')}</div>
                        <div><strong>Gramas:</strong> ${this.formatarNumero(detalhesAtuais?.gramas || 0, 0)} g</div>
                        <div><strong>Energia:</strong> ${this.formatarNumero(detalhesAtuais?.kcal || 0, 0)} kcal</div>
                        <div><strong>Carboidratos:</strong> ${this.formatarNumero(detalhesAtuais?.carboidratos || 0)} g</div>
                        <div><strong>Proteínas:</strong> ${this.formatarNumero(detalhesAtuais?.proteinas || 0)} g</div>
                        <div><strong>Gorduras:</strong> ${this.formatarNumero(detalhesAtuais?.gorduras || 0)} g</div>
                    </div>
                </div>
            `;
        }

        if (modal) modal.style.display = 'flex';
    }

    removerUltimoAlimentoDaRefeicao() {
        const textarea = document.getElementById(this.obterRefeicaoSelecionada());
        if (!textarea || !textarea.value.trim()) return;

        const linhas = textarea.value.split('\n').filter((linha) => linha.trim() !== '');
        linhas.pop();
        textarea.value = linhas.join('\n');
        textarea.focus();
    }

    limparRefeicaoSelecionada() {
        const textarea = document.getElementById(this.obterRefeicaoSelecionada());
        if (!textarea || !textarea.value.trim()) return;

        if (confirm('Limpar todos os itens desta refeicao?')) {
            textarea.value = '';
            textarea.focus();
        }
    }

    obterTextoRefeicao(mealId) {
        return (this.itensPlano[mealId] || [])
            .map((item) => this.formatarTextoItemPlano(item))
            .join('\n');
    }

    coletarDadosFormularioAlimento() {
        const modal = document.getElementById('modalNovoAlimento');
        if (!modal || modal.style.display === 'none') return null;

        return {
            nome: document.getElementById('foodNome')?.value || '',
            categoria: document.getElementById('foodCategoria')?.value || '',
            unidadePadrao: document.getElementById('foodUnidade')?.value || '',
            gramasPorUnidade: document.getElementById('foodGramasUnidade')?.value || '',
            kcal: document.getElementById('foodKcal')?.value || '',
            carboidratos: document.getElementById('foodCarboidratos')?.value || '',
            proteinas: document.getElementById('foodProteinas')?.value || '',
            gorduras: document.getElementById('foodGorduras')?.value || ''
        };
    }

    preencherFormularioAlimentoComDados(dados = {}) {
        const setValue = (id, valor = '') => {
            const input = document.getElementById(id);
            if (input) input.value = valor;
        };

        setValue('foodNome', dados.nome);
        setValue('foodCategoria', dados.categoria);
        setValue('foodUnidade', dados.unidadePadrao);
        setValue('foodGramasUnidade', dados.gramasPorUnidade);
        setValue('foodKcal', dados.kcal);
        setValue('foodCarboidratos', dados.carboidratos);
        setValue('foodProteinas', dados.proteinas);
        setValue('foodGorduras', dados.gorduras);
        this.atualizarCampoGramaturaAlimento();
    }

    limparFormularioAlimento() {
        this.alimentoEditandoId = null;
        ['foodNome', 'foodCategoria', 'foodUnidade', 'foodGramasUnidade', 'foodKcal', 'foodCarboidratos', 'foodProteinas', 'foodGorduras'].forEach((id) => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });
        this.atualizarCampoGramaturaAlimento();
    }

    preencherFormularioAlimento(foodId) {
        const alimento = this.alimentosBase.find((item) => item.id === foodId);
        if (!alimento) return;

        this.alimentoEditandoId = foodId;
        document.getElementById('foodNome').value = alimento.nome || '';
        document.getElementById('foodCategoria').value = alimento.categoria || '';
        document.getElementById('foodUnidade').value = alimento.unidadePadrao || '';
        document.getElementById('foodGramasUnidade').value = alimento.gramasPorUnidade || '';
        document.getElementById('foodKcal').value = alimento.kcal || '';
        document.getElementById('foodCarboidratos').value = alimento.carboidratos || '';
        document.getElementById('foodProteinas').value = alimento.proteinas || '';
        document.getElementById('foodGorduras').value = alimento.gorduras || '';
        this.atualizarCampoGramaturaAlimento();
    }

    atualizarCampoGramaturaAlimento() {
        const unidade = document.getElementById('foodUnidade')?.value || '';
        const gramasInput = document.getElementById('foodGramasUnidade');
        if (!gramasInput) return;

        const unidadeDireta = this.unidadeIndicaGramatura(unidade);
        gramasInput.disabled = unidadeDireta;
        gramasInput.required = Boolean(unidade && !unidadeDireta);
        gramasInput.placeholder = unidadeDireta ? 'Medida direta' : 'Ex: 60';
        gramasInput.style.background = unidadeDireta ? '#f1f5f9' : 'white';
        gramasInput.title = unidadeDireta
            ? 'Esta unidade ja informa a quantidade em gramas ou volume.'
            : 'Informe quantos gramas tem 1 unidade selecionada deste alimento.';

        if (unidadeDireta) {
            gramasInput.value = '1';
        }
    }

    async salvarAlimentoBase(onSaved) {
        const nome = document.getElementById('foodNome')?.value?.trim();
        const categoria = document.getElementById('foodCategoria')?.value?.trim();
        const unidadePadrao = document.getElementById('foodUnidade')?.value?.trim();
        if (!nome) {
            alert('Informe o nome do alimento.');
            return;
        }
        if (!categoria || !this.categoriasAlimentos.includes(categoria)) {
            alert('Selecione uma categoria cadastrada.');
            return;
        }
        if (!unidadePadrao || !this.unidadesAlimentos.includes(unidadePadrao)) {
            alert('Selecione uma unidade cadastrada.');
            return;
        }
        const unidadeDireta = this.unidadeIndicaGramatura(unidadePadrao);
        const gramasPorUnidade = unidadeDireta
            ? 1
            : Number(document.getElementById('foodGramasUnidade')?.value || 0);
        if (!unidadeDireta && (!Number.isFinite(gramasPorUnidade) || gramasPorUnidade <= 0)) {
            alert('Informe a gramatura por unidade deste alimento.');
            return;
        }

        const payload = {
            nome,
            categoria,
            unidadePadrao,
            gramasPorUnidade,
            kcal: Number(document.getElementById('foodKcal')?.value || 0),
            carboidratos: Number(document.getElementById('foodCarboidratos')?.value || 0),
            proteinas: Number(document.getElementById('foodProteinas')?.value || 0),
            gorduras: Number(document.getElementById('foodGorduras')?.value || 0),
            fibras: 0,
            sodio: 0,
            atualizado_por: this.userInfo.login,
            data_atualizacao: new Date().toISOString()
        };

        if (this.alimentoEditandoId) {
            await updateDoc(doc(db, 'base_alimentos_nutricionais', this.alimentoEditandoId), payload);
        } else {
            await addDoc(collection(db, 'base_alimentos_nutricionais'), {
                ...payload,
                fonte: 'custom',
                criado_por: this.userInfo.login,
                data_criacao: new Date().toISOString()
            });
        }

        this.alimentosCarregados = false;
        await this.carregarBaseAlimentos();
        this.limparFormularioAlimento();
        this.fecharModalNovoAlimento();
        this.sincronizarModaisAlimentos({ formulario: false });
        onSaved?.();
    }

    adicionarAlimentoNaRefeicao(foodId) {
        const alimento = this.alimentosBase.find((item) => item.id === foodId);
        const quantidade = Number(document.getElementById(`foodQuantidade_${foodId}`)?.value || 1);
        return this.adicionarAlimentoNaRefeicaoComQuantidade(alimento, quantidade, this.obterRefeicaoSelecionada());
    }

    adicionarAlimentoNaRefeicaoComQuantidade(alimento, quantidade, mealId = null, renderizar = true) {
        if (!alimento) return;
        const refeicaoId = mealId || this.obterRefeicaoSelecionada();
        this.refeicaoSelecionada = refeicaoId;
        const opcao = this.criarOpcaoItemPlano(alimento, quantidade);
        this.itensPlano[refeicaoId] = this.itensPlano[refeicaoId] || [];

        if (this.opcaoDestinoPlano) {
            const itemDestino = (this.itensPlano[this.opcaoDestinoPlano.mealId] || [])
                .find((item) => item.id === this.opcaoDestinoPlano.itemId);
            if (itemDestino) {
                itemDestino.opcoes = Array.isArray(itemDestino.opcoes) && itemDestino.opcoes.length
                    ? itemDestino.opcoes
                    : [{
                        id: itemDestino.id,
                        texto: itemDestino.texto,
                        detalhes: itemDestino.detalhes || null
                    }];
                itemDestino.opcoes.push(opcao);
                itemDestino.opcaoVisivelIndex = itemDestino.opcoes.length - 1;
                itemDestino.texto = this.formatarTextoItemPlano(itemDestino);
                itemDestino.detalhes = itemDestino.opcoes[0]?.detalhes || null;
                this.refeicaoSelecionada = this.opcaoDestinoPlano.mealId;
                this.opcaoDestinoPlano = null;
                if (renderizar) this.renderizarRefeicoesPlano();
                return;
            }
            this.opcaoDestinoPlano = null;
        }

        this.itensPlano[refeicaoId].push({
            id: this.gerarIdItemPlano(),
            texto: opcao.texto,
            detalhes: opcao.detalhes,
            opcoes: [opcao],
            detalhesAberto: false
        });
        if (renderizar) this.renderizarRefeicoesPlano();
    }

    async loadPlanos() {
        if (!this.selectedPaciente) return;
        
        try {
            const nutricionistaLogin = this.userInfo.login;
            const pacienteLogin = this.selectedPaciente.login;
            
            // Caminho: planos_alimentares > nutricionista > paciente
            const pacienteCollectionRef = collection(db, 'planos_alimentares', nutricionistaLogin, pacienteLogin);
            const querySnapshot = await getDocs(pacienteCollectionRef);
            
            this.planosList = [];
            querySnapshot.forEach((docSnap) => {
                this.planosList.push({ id: docSnap.id, ...docSnap.data() });
            });

            this.renderizarPlanosContainer();
            
        } catch (error) {
            this.planosList = [];
        }
    }

    async abrirModal() {
        this.itensPlano = this.criarEstadoItensPlano(this.planoEditando || {});
        this.observacoesRefeicoes = this.criarEstadoObservacoesRefeicoes(this.planoEditando || {});
        this.refeicaoSelecionada = 'breakfast';

        try {
            await this.carregarBaseAlimentos();
        } catch (error) {
            this.alimentosBase = [];
            this.alimentosCarregados = false;
            alert('Nao foi possivel carregar a base nutricional. Verifique as permissoes do Firestore.');
        }

        const modal = document.getElementById('modalPlano');
        if (modal) {
            const formWrapper = modal.querySelector('[data-plano-form]');
            if (formWrapper) {
                formWrapper.innerHTML = this.renderFormularioPlano();
                this.attachNutritionEvents();
            }

            modal.style.display = 'flex';
            setTimeout(() => {
                const buscaAlimento = modal.querySelector('#foodSearch');
                if (buscaAlimento) buscaAlimento.focus();
            }, 100);
        }
    }

    fecharModal() {
        const modal = document.getElementById('modalPlano');
        if (modal) {
            modal.style.display = 'none';
            this.planoEditando = null;
        }
    }

    toggleExpandirPlano(planoId) {
        this.abrirModalVisualizarPlano(planoId);
    }

    abrirModalVisualizarPlano(planoId) {
        const plano = this.planosList.find((registro) => registro.id === planoId);
        if (!plano) return;

        this.planoExpandido = planoId;
        const modal = document.getElementById('modalVisualizarPlano');
        const titulo = document.getElementById('modalVisualizarPlanoTitulo');
        const formWrapper = modal?.querySelector('[data-visualizar-plano-form]');
        const actionsWrapper = modal?.querySelector('[data-visualizar-plano-actions]');
        const concluirButton = document.getElementById('btnConcluirEdicaoPlanoVisualizado');
        if (titulo) titulo.textContent = `Plano alimentar - ${this.formatarDataExibicao(plano.id)}`;
        if (actionsWrapper) actionsWrapper.innerHTML = this.renderAcoesPlanoVisualizacao(plano.id);
        if (concluirButton) concluirButton.style.display = this.visualizacaoPlanoEditando ? 'inline-flex' : 'none';
        if (formWrapper) formWrapper.innerHTML = this.renderPlanoVisualizacao(plano);
        if (modal) modal.style.display = 'flex';
    }

    fecharModalVisualizarPlano() {
        const modal = document.getElementById('modalVisualizarPlano');
        if (modal) modal.style.display = 'none';
        const actionsWrapper = modal?.querySelector('[data-visualizar-plano-actions]');
        if (actionsWrapper) actionsWrapper.innerHTML = '';
        const concluirButton = document.getElementById('btnConcluirEdicaoPlanoVisualizado');
        if (concluirButton) concluirButton.style.display = 'none';
        this.visualizacaoPlanoEditando = false;
        this.visualizacaoOpcaoDestino = null;
    }

    toggleMenuAcoesPlano(forcarEstado = null) {
        const menu = document.getElementById('menuAcoesPlano');
        if (!menu) return;
        const abrir = forcarEstado === null ? menu.style.display !== 'block' : Boolean(forcarEstado);
        menu.style.display = abrir ? 'block' : 'none';
    }

    async alternarEdicaoPlanoVisualizado(planoId) {
        this.visualizacaoPlanoEditando = !this.visualizacaoPlanoEditando;
        this.visualizacaoOpcaoDestino = null;
        if (this.visualizacaoPlanoEditando) {
            try {
                await this.carregarBaseAlimentos();
            } catch (error) {
                this.visualizacaoPlanoEditando = false;
                alert('Nao foi possivel carregar a base de alimentos para editar.');
                return;
            }
        }
        this.abrirModalVisualizarPlano(planoId);
    }

    atualizarModalVisualizarPlano() {
        if (!this.planoExpandido) return;
        this.abrirModalVisualizarPlano(this.planoExpandido);
        const input = document.getElementById('visualFoodSearch');
        if (input) input.focus();
    }

    async salvarPlanoVisualizado(planoId) {
        const plano = this.planosList.find((registro) => registro.id === planoId);
        if (!plano || !this.selectedPaciente) return;

        const payload = {
            breakfast: this.obterTextoRefeicaoImportada(plano.itens_plano, 'breakfast'),
            morningSnack: this.obterTextoRefeicaoImportada(plano.itens_plano, 'morningSnack'),
            lunch: this.obterTextoRefeicaoImportada(plano.itens_plano, 'lunch'),
            afternoonSnack: this.obterTextoRefeicaoImportada(plano.itens_plano, 'afternoonSnack'),
            dinner: this.obterTextoRefeicaoImportada(plano.itens_plano, 'dinner'),
            supper: this.obterTextoRefeicaoImportada(plano.itens_plano, 'supper'),
            itens_plano: plano.itens_plano,
            observacoes_refeicoes: plano.observacoes_refeicoes || {},
            data_atualizacao: new Date().toISOString()
        };

        await updateDoc(doc(db, 'planos_alimentares', this.userInfo.login, this.selectedPaciente.login, planoId), payload);
        Object.assign(plano, payload);
    }

    async editarObservacaoPlanoSalvo(planoId, mealId) {
        const plano = this.planosList.find((registro) => registro.id === planoId);
        const refeicao = this.getRefeicoesPlano().find((item) => item.id === mealId);
        if (!plano || !refeicao) return;

        const observacoes = { ...(plano.observacoes_refeicoes || {}) };
        const novaObservacao = prompt(`Observações para ${refeicao.titulo}:`, observacoes[mealId] || '');
        if (novaObservacao === null) return;

        observacoes[mealId] = String(novaObservacao || '').trim();
        plano.observacoes_refeicoes = observacoes;
        await this.salvarPlanoVisualizado(planoId);
        this.abrirModalVisualizarPlano(planoId);
        this.renderizarPlanosContainer();
    }

    visualizarObservacaoPlanoSalvo(planoId, mealId) {
        const plano = this.planosList.find((registro) => registro.id === planoId);
        const refeicao = this.getRefeicoesPlano().find((item) => item.id === mealId);
        const observacao = String(plano?.observacoes_refeicoes?.[mealId] || '').trim();
        if (!plano || !refeicao || !observacao) return;

        alert(`Observações - ${refeicao.titulo}\n\n${observacao}`);
    }

    async adicionarAlimentoPlanoVisualizado(planoId, foodId) {
        const plano = this.planosList.find((registro) => registro.id === planoId);
        const alimento = this.alimentosBase.find((item) => item.id === foodId);
        if (!plano || !alimento) return;

        const quantidade = Math.max(1, Number(document.getElementById(`visualQtd_${foodId}`)?.value || 1));
        const opcao = this.criarOpcaoItemPlano(alimento, quantidade);
        plano.itens_plano = this.criarEstadoItensPlano(plano);

        if (this.visualizacaoOpcaoDestino) {
            const itemDestino = (plano.itens_plano[this.visualizacaoOpcaoDestino.mealId] || [])
                .find((item) => item.id === this.visualizacaoOpcaoDestino.itemId);
            if (itemDestino) {
                itemDestino.opcoes = Array.isArray(itemDestino.opcoes) && itemDestino.opcoes.length
                    ? itemDestino.opcoes
                    : [{ id: itemDestino.id, texto: itemDestino.texto, detalhes: itemDestino.detalhes || null }];
                itemDestino.opcoes.push(opcao);
                itemDestino.opcaoVisivelIndex = itemDestino.opcoes.length - 1;
                itemDestino.texto = this.formatarTextoItemPlano(itemDestino);
                itemDestino.detalhes = itemDestino.opcoes[0]?.detalhes || null;
                this.visualizacaoMealSelecionada = this.visualizacaoOpcaoDestino.mealId;
                this.visualizacaoOpcaoDestino = null;
            }
        } else {
            const mealId = this.visualizacaoMealSelecionada || 'breakfast';
            plano.itens_plano[mealId] = plano.itens_plano[mealId] || [];
            plano.itens_plano[mealId].push({
                id: this.gerarIdItemPlano(),
                texto: opcao.texto,
                detalhes: opcao.detalhes,
                opcoes: [opcao],
                opcaoVisivelIndex: 0,
                detalhesAberto: false
            });
        }

        await this.salvarPlanoVisualizado(planoId);
        this.abrirModalVisualizarPlano(planoId);
        this.renderizarPlanosContainer();
    }

    prepararAdicionarOpcaoPlanoVisualizado(planoId, mealId, itemId) {
        this.visualizacaoOpcaoDestino = { mealId, itemId };
        this.visualizacaoMealSelecionada = mealId;
        this.abrirModalVisualizarPlano(planoId);
        setTimeout(() => document.getElementById('visualFoodSearch')?.focus(), 50);
    }

    async excluirOpcaoOuItemPlanoVisualizado(planoId, mealId, itemId) {
        const plano = this.planosList.find((registro) => registro.id === planoId);
        const item = plano?.itens_plano?.[mealId]?.find((registro) => registro.id === itemId);
        if (!plano || !item) return;

        const opcoes = Array.isArray(item.opcoes) && item.opcoes.length
            ? item.opcoes
            : [{ id: item.id, texto: item.texto, detalhes: item.detalhes }];
        const opcaoIndex = Math.max(0, Math.min(opcoes.length - 1, Number(item.opcaoVisivelIndex || 0)));
        const opcaoNome = opcoes[opcaoIndex]?.texto || item.texto || 'este alimento';
        if (!confirm(`Remover a opção atual?\n\n${opcaoNome}`)) return;

        if (opcoes.length > 1) {
            item.opcoes.splice(opcaoIndex, 1);
            item.opcaoVisivelIndex = Math.max(0, Math.min(item.opcoes.length - 1, opcaoIndex));
            item.texto = this.formatarTextoItemPlano(item);
            item.detalhes = item.opcoes[0]?.detalhes || null;
        } else {
            plano.itens_plano[mealId] = (plano.itens_plano[mealId] || []).filter((registro) => registro.id !== itemId);
        }

        await this.salvarPlanoVisualizado(planoId);
        this.abrirModalVisualizarPlano(planoId);
        this.renderizarPlanosContainer();
    }

    async moverItemPlanoVisualizado(event, planoId, mealIdDestino, itemIdDestino) {
        event.preventDefault();
        const [planoOrigemId, mealIdOrigem, itemIdOrigem] = String(event.dataTransfer.getData('text/plain') || '').split('|');
        if (planoOrigemId !== planoId || mealIdOrigem !== mealIdDestino || itemIdOrigem === itemIdDestino) return;

        const plano = this.planosList.find((registro) => registro.id === planoId);
        const itens = plano?.itens_plano?.[mealIdDestino] || [];
        const origemIndex = itens.findIndex((item) => item.id === itemIdOrigem);
        const destinoIndex = itens.findIndex((item) => item.id === itemIdDestino);
        if (!plano || origemIndex < 0 || destinoIndex < 0) return;

        const [itemMovido] = itens.splice(origemIndex, 1);
        itens.splice(destinoIndex, 0, itemMovido);
        await this.salvarPlanoVisualizado(planoId);
        this.abrirModalVisualizarPlano(planoId);
        this.renderizarPlanosContainer();
    }

    encontrarItemPlanoSalvo(planoId, mealId, itemId) {
        const plano = this.planosList.find((registro) => registro.id === planoId);
        const item = plano?.itens_plano?.[mealId]?.find((registro) => registro.id === itemId);
        return { plano, item };
    }

    async alternarOpcaoPlanoSalvo(planoId, mealId, itemId) {
        const { item } = this.encontrarItemPlanoSalvo(planoId, mealId, itemId);
        if (!item || !Array.isArray(item.opcoes) || item.opcoes.length < 2) return;

        item.opcaoVisivelIndex = (Number(item.opcaoVisivelIndex || 0) + 1) % item.opcoes.length;
        await this.salvarPlanoVisualizado(planoId);
        const modalAberto = document.getElementById('modalVisualizarPlano')?.style.display === 'flex';
        if (modalAberto) {
            this.abrirModalVisualizarPlano(planoId);
        } else {
            this.renderizarPlanosContainer();
        }
    }

    abrirDetalheOpcaoPlanoSalvo(planoId, mealId, itemId) {
        const { item } = this.encontrarItemPlanoSalvo(planoId, mealId, itemId);
        if (!item) return;

        this.abrirModalDetalheItemPlano(this.normalizarItemPlano(item), Number(item.opcaoVisivelIndex || 0));
    }

    abrirModalResumoNutricional(titulo, resumo) {
        const modal = document.getElementById('modalDetalheAlimento');
        const formWrapper = modal?.querySelector('[data-detalhe-alimento-form]');
        if (formWrapper) {
            formWrapper.innerHTML = this.renderDetalhesNutricionaisResumo(titulo, resumo);
        }
        if (modal) {
            modal.style.zIndex = '3000';
            modal.style.display = 'flex';
        }
    }

    abrirDetalhesNutricionaisPlanoSalvo(planoId) {
        const plano = this.planosList.find((registro) => registro.id === planoId);
        if (!plano) return;

        const resumo = this.calcularTotaisPlanoSalvo(plano, this.getRefeicoesPlano());
        this.abrirModalResumoNutricional('Total do plano', resumo);
    }

    abrirDetalhesNutricionaisRefeicaoSalva(planoId, mealId) {
        const plano = this.planosList.find((registro) => registro.id === planoId);
        const refeicao = this.getRefeicoesPlano().find((item) => item.id === mealId);
        if (!plano || !refeicao) return;

        const itens = Array.isArray(plano.itens_plano?.[mealId])
            ? plano.itens_plano[mealId].map((item) => this.normalizarItemPlano(item))
            : [];
        const resumo = this.calcularTotaisItensPlanoSalvo(itens);
        this.abrirModalResumoNutricional(`Detalhes - ${refeicao.titulo}`, resumo);
    }

    editarPlano(planoId) {
        const plano = this.planosList.find(p => p.id === planoId);
        if (plano) {
            this.planoEditando = { ...plano };
            delete this.planoEditando.id;
            this.planoExpandido = null;
            this.abrirModal();
        }
    }

    async excluirPlano(planoId) {
        if (!this.selectedPaciente) return;

        const dataFormatada = this.formatarDataExibicao(planoId);
        const confirmado = confirm(`Excluir definitivamente este plano alimentar?\n\nPlano: ${dataFormatada}\n\nEsta ação não pode ser revertida.`);
        if (!confirmado) return;

        try {
            await deleteDoc(doc(db, 'planos_alimentares', this.userInfo.login, this.selectedPaciente.login, planoId));
            this.planosList = this.planosList.filter((plano) => plano.id !== planoId);
            if (this.planoExpandido === planoId) {
                this.planoExpandido = null;
                this.fecharModalVisualizarPlano();
            }
            this.renderizarPlanosContainer();
        } catch (error) {
            alert('Nao foi possivel excluir o plano alimentar.');
        }
    }

    async saveMealPlan() {
        if (!this.selectedPaciente) {
            alert('❌ Selecione um paciente primeiro!');
            return;
        }

        try {
            const agora = new Date();
            const documentoId = this.gerarIdDocumento(agora);
            
            const mealPlanData = {
                breakfast: this.obterTextoRefeicao('breakfast'),
                morningSnack: this.obterTextoRefeicao('morningSnack'),
                lunch: this.obterTextoRefeicao('lunch'),
                afternoonSnack: this.obterTextoRefeicao('afternoonSnack'),
                dinner: this.obterTextoRefeicao('dinner'),
                supper: this.obterTextoRefeicao('supper'),
                itens_plano: this.itensPlano,
                observacoes_refeicoes: this.observacoesRefeicoes,
                profissional_nome: this.userInfo.nome,
                profissional_foto_url: this.userInfo.foto_perfil_url || this.userInfo.fotoPerfilUrl || this.userInfo.foto || '',
                modelo_plano: 'base_nutricional_linhas_v2',
                atual: true,
                criado_por: this.userInfo.login,
                data_criacao: agora.toISOString()
            };

            const nutricionistaLogin = this.userInfo.login;
            const pacienteLogin = this.selectedPaciente.login;

            // Caminho: planos_alimentares > nutricionista > paciente > documento
            await this.desmarcarPlanosAtuais();
            await setDoc(doc(db, 'planos_alimentares', nutricionistaLogin, pacienteLogin, documentoId), mealPlanData);
            
            alert(`✅ Plano criado com sucesso!\n📅 ${this.formatarDataExibicao(documentoId)}`);
            
            this.fecharModal();
            await this.loadPlanos();
            await this.render();
            
        } catch (error) {
            alert('❌ Erro ao salvar: ' + error.message);
        }
    }

    clonarPlano(planoId) {
        const plano = this.planosList.find(p => p.id === planoId);
        if (plano) {
            this.planoEditando = { ...plano };
            delete this.planoEditando.id;
            this.planoExpandido = null;
            this.abrirModal();
        }
    }

    montarLinhasExportacaoPlano(plano) {
        const linhas = [];
        this.getRefeicoesPlano().forEach((refeicao) => {
            const itens = Array.isArray(plano.itens_plano?.[refeicao.id])
                ? plano.itens_plano[refeicao.id].map((item) => this.normalizarItemPlano(item))
                : [];

            if (!itens.length && plano[refeicao.id]) {
                String(plano[refeicao.id]).split('\n').filter(Boolean).forEach((texto, index) => {
                    linhas.push({
                        RefeicaoId: refeicao.id,
                        Refeicao: refeicao.titulo,
                        Ordem: index + 1,
                        Opcao: 1,
                        Alimento: '',
                        Quantidade: '',
                        Texto: texto
                    });
                });
                return;
            }

            itens.forEach((item, itemIndex) => {
                const opcoes = Array.isArray(item.opcoes) && item.opcoes.length
                    ? item.opcoes
                    : [{ texto: item.texto, detalhes: item.detalhes }];
                opcoes.forEach((opcao, opcaoIndex) => {
                    linhas.push({
                        RefeicaoId: refeicao.id,
                        Refeicao: refeicao.titulo,
                        Ordem: itemIndex + 1,
                        Opcao: opcaoIndex + 1,
                        Alimento: opcao.detalhes?.nome || String(opcao.texto || '').split(' - ')[0],
                        Quantidade: this.obterQuantidadeOpcao(opcao),
                        Texto: opcao.texto || ''
                    });
                });
            });
        });
        return linhas;
    }

    async exportarPlano(planoId) {
        this.planoExportandoId = planoId;
        const modal = document.getElementById('modalExportarPlano');
        if (modal) {
            const pdfOption = modal.querySelector('input[name="formatoExportarPlano"][value="pdf"]');
            if (pdfOption) pdfOption.checked = true;
            modal.style.display = 'flex';
        }
    }

    fecharModalExportarPlano() {
        const modal = document.getElementById('modalExportarPlano');
        if (modal) modal.style.display = 'none';
        this.planoExportandoId = null;
    }

    async confirmarExportarPlano() {
        const planoId = this.planoExportandoId;
        if (!planoId) return;

        const formato = document.querySelector('input[name="formatoExportarPlano"]:checked')?.value || 'pdf';
        this.fecharModalExportarPlano();

        if (formato === 'xlsx') {
            await this.exportarPlanoXlsx(planoId);
            return;
        }

        await this.exportarPlanoPdf(planoId);
    }

    async exportarPlanoXlsx(planoId) {
        const plano = this.planosList.find(p => p.id === planoId);
        if (!plano) return;

        try {
            const XLSX = await this.carregarXlsxLib();
            const dataFormatada = this.formatarDataExibicao(planoId);
            const workbook = XLSX.utils.book_new();
            const metadados = [
                { Campo: 'Paciente', Valor: this.selectedPaciente?.nome || '' },
                { Campo: 'Paciente Login', Valor: this.selectedPaciente?.login || '' },
                { Campo: 'Profissional', Valor: plano.profissional_nome || '' },
                { Campo: 'Data', Valor: dataFormatada },
                { Campo: 'Modelo', Valor: plano.modelo_plano || 'base_nutricional_linhas_v2' }
            ];
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(metadados), 'Metadados');
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(this.montarLinhasExportacaoPlano(plano)), 'Plano');
            XLSX.writeFile(workbook, `plano_alimentar_${dataFormatada.replace(/\//g, '-').replace(/ /g, '_').replace(/:/g, '-')}.xlsx`);
        } catch (error) {
            alert('Nao foi possivel exportar o plano em XLSX.');
        }
    }

    montarRefeicoesPdfPlano(plano) {
        return this.getRefeicoesPlano().map((refeicao) => {
            const itens = Array.isArray(plano.itens_plano?.[refeicao.id])
                ? plano.itens_plano[refeicao.id].map((item) => this.normalizarItemPlano(item))
                : [];
            const linhas = itens.length
                ? itens.map((item) => this.obterOpcaoVisivelItemPlanoSalvo(item)?.texto || item.texto).filter(Boolean)
                : String(plano[refeicao.id] || '').split('\n').map((linha) => linha.trim()).filter(Boolean);

            return { ...refeicao, linhas };
        });
    }

    montarRefeicoesDetalhadasPdfPlano(plano) {
        return this.getRefeicoesPlano().map((refeicao) => {
            const itens = Array.isArray(plano.itens_plano?.[refeicao.id])
                ? plano.itens_plano[refeicao.id].map((item) => this.normalizarItemPlano(item))
                : [];
            const resumo = this.calcularTotaisItensPlanoSalvo(itens);
            return {
                ...refeicao,
                itens,
                resumo,
                substituicoes: itens.map((item, itemIndex) => {
                    const opcoes = Array.isArray(item.opcoes) && item.opcoes.length
                        ? item.opcoes
                        : [{ texto: item.texto, detalhes: item.detalhes }];
                    const opcaoVisivelIndex = Math.max(0, Math.min(opcoes.length - 1, Number(item.opcaoVisivelIndex || 0)));
                    return {
                        itemIndex,
                        opcaoVisivelIndex,
                        opcoes
                    };
                })
            };
        });
    }

    renderNutrientesPdf(resumo) {
        return `
            <div class="nutri-row">
                <span><strong>${this.formatarNumero(resumo.kcal || 0, 0)}</strong> kcal</span>
                <span><strong>${this.formatarNumero(resumo.gramas || 0, 0)}</strong> g</span>
                <span><strong>${this.formatarNumero(resumo.carboidratos || 0)}</strong> g carb.</span>
                <span><strong>${this.formatarNumero(resumo.proteinas || 0)}</strong> g prot.</span>
                <span><strong>${this.formatarNumero(resumo.gorduras || 0)}</strong> g gord.</span>
                <span><strong>${this.formatarNumero(resumo.fibras || 0)}</strong> g fibras</span>
            </div>
        `;
    }

    renderDetalhesOpcaoPdf(opcao) {
        const detalhes = opcao?.detalhes || {};
        return `
            <div class="option-text">${this.escapeHtml(opcao?.texto || '')}</div>
            <div class="macro-line">
                <span>${this.escapeHtml(detalhes.quantidadeTexto || 'Quantidade nao informada')}</span>
                <span>${this.formatarNumero(detalhes.gramas || 0, 0)} g</span>
                <span>${this.formatarNumero(detalhes.kcal || 0, 0)} kcal</span>
                <span>${this.formatarNumero(detalhes.carboidratos || 0)} g carb.</span>
                <span>${this.formatarNumero(detalhes.proteinas || 0)} g prot.</span>
                <span>${this.formatarNumero(detalhes.gorduras || 0)} g gord.</span>
            </div>
        `;
    }

    normalizarDataGrafico(data) {
        const valor = String(data || '');
        if (!valor) return '';
        const [ano, mes, dia] = valor.split('-');
        return dia && mes ? `${dia}/${mes}` : valor;
    }

    renderGraficoLinhaPdf(titulo, subtitulo, dados, unidade, cor) {
        const valores = dados.map((item) => Number(item.valor || 0)).filter((valor) => Number.isFinite(valor));
        if (!dados.length || !valores.some((valor) => valor > 0)) {
            return `
                <article class="evolution-card">
                    <h3>${this.escapeHtml(titulo)}</h3>
                    <p class="chart-empty">Dados ainda não disponíveis.</p>
                </article>
            `;
        }

        const width = 520;
        const height = 176;
        const pad = 34;
        const min = Math.min(...valores);
        const max = Math.max(...valores);
        const range = max - min || 1;
        const points = dados.map((item, index) => {
            const x = pad + (index * ((width - pad * 2) / Math.max(1, dados.length - 1)));
            const y = height - pad - (((Number(item.valor || 0) - min) / range) * (height - pad * 2));
            return { x, y, ...item };
        });
        const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
        const areaPath = `${path} L ${points[points.length - 1].x.toFixed(1)} ${height - pad} L ${points[0].x.toFixed(1)} ${height - pad} Z`;

        return `
            <article class="evolution-card">
                <h3>${this.escapeHtml(titulo)}</h3>
                <p>${this.escapeHtml(subtitulo)}</p>
                <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${this.escapeHtml(titulo)}">
                    <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#cbd5e1" stroke-width="1" />
                    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke="#cbd5e1" stroke-width="1" />
                    <path d="${areaPath}" fill="${cor}" opacity="0.10"></path>
                    <path d="${path}" fill="none" stroke="${cor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
                    ${points.map((point) => `
                        <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="5" fill="${cor}" stroke="white" stroke-width="2"></circle>
                        <text x="${point.x.toFixed(1)}" y="${(point.y - 10).toFixed(1)}" text-anchor="middle" font-size="11" fill="#334155">${this.formatarNumero(point.valor, 1)}${unidade}</text>
                        <text x="${point.x.toFixed(1)}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#64748b">${this.escapeHtml(this.normalizarDataGrafico(point.label))}</text>
                    `).join('')}
                </svg>
            </article>
        `;
    }

    async montarGraficosEvolucaoPdf() {
        if (!this.selectedPaciente?.login) return '';

        let evaluations = [];
        try {
            evaluations = await this.funcoes.loadEvaluationsByPatient(this.selectedPaciente.login);
        } catch (_error) {
            evaluations = [];
        }

        const ordenadas = evaluations
            .slice()
            .sort((a, b) => String(a.data_avaliacao || '').localeCompare(String(b.data_avaliacao || '')))
            .slice(-8);

        const peso = ordenadas.map((item) => ({
            label: item.data_avaliacao,
            valor: item.dados_antropometricos?.peso || 0
        }));
        const imc = ordenadas.map((item) => ({
            label: item.data_avaliacao,
            valor: item.dados_antropometricos?.imc || 0
        }));
        const massa = ordenadas.map((item) => ({
            label: item.data_avaliacao,
            valor: item.bioimpedancia?.massa_muscular || 0
        }));

        return `
            <section class="evolution-section page-break">
                <h2 class="section-title">Evolução do paciente</h2>
                <p class="patient-help">Estes gráficos mostram a evolução registrada nas avaliações nutricionais. O objetivo é acompanhar tendências ao longo do tempo, não avaliar um dia isolado.</p>
                <div class="evolution-grid">
                    ${this.renderGraficoLinhaPdf('Evolução do Peso', 'Peso corporal registrado em cada avaliação.', peso, 'kg', '#f97316')}
                    ${this.renderGraficoLinhaPdf('Evolução do IMC', 'Indicador que relaciona peso e altura.', imc, '', '#3b82f6')}
                    ${this.renderGraficoLinhaPdf('Evolução da Massa Muscular', 'Quando disponível, acompanha massa muscular em kg.', massa, 'kg', '#10b981')}
                </div>
            </section>
        `;
    }

    obterOrganizacaoAtual() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return String(this.userInfo.organizacao || currentUser.organizacao || '').trim().toUpperCase();
        } catch (_error) {
            return String(this.userInfo.organizacao || '').trim().toUpperCase();
        }
    }

    montarCaminhoQrPortfolio() {
        const organizacao = this.obterOrganizacaoAtual();
        const loginUnder = String(this.userInfo.login || '').trim().replace(/\./g, '_');
        if (!organizacao || !loginUnder) return '';
        return `./imagens/qr_code_portfolios_profissionais/${organizacao}/${loginUnder}.jpg`;
    }

    async montarQrPortfolioPdf() {
        try {
            const profissionalSnap = await getDoc(doc(db, 'logins', this.userInfo.login));
            if (!profissionalSnap.exists() || profissionalSnap.data()?.habilitar_portfolio !== true) {
                return '';
            }

            const qrPath = this.montarCaminhoQrPortfolio();
            if (!qrPath) return '';

            const qrUrl = new URL(qrPath, window.location.href).href;
            return `
                <section class="portfolio-section">
                    <h2 class="section-title">Portfolio profissional</h2>
                    <div class="portfolio-box">
                        <div>
                            <strong>${this.escapeHtml(this.userInfo.nome || 'Profissional')}</strong>
                            <p>Aponte a câmera do celular para acessar o portfolio profissional.</p>
                        </div>
                        <img src="${this.escapeHtml(qrUrl)}" alt="QR Code do portfolio profissional">
                    </div>
                </section>
            `;
        } catch (_error) {
            return '';
        }
    }

    async exportarPlanoPdf(planoId) {
        const plano = this.planosList.find(p => p.id === planoId);
        if (!plano) return;

        const dataFormatada = this.formatarDataExibicao(planoId);
        const fotoProfissional = this.userInfo.foto_perfil_url || this.userInfo.fotoPerfilUrl || this.userInfo.foto || plano.profissional_foto_url || '';
        const profissionalNome = plano.profissional_nome || this.userInfo.nome || 'Profissional';
        const pacienteNome = this.selectedPaciente?.nome || plano.paciente_nome || 'Paciente';
        const refeicoes = this.montarRefeicoesPdfPlano(plano);
        const refeicoesDetalhadas = this.montarRefeicoesDetalhadasPdfPlano(plano);
        const resumoTotal = this.calcularTotaisPlanoSalvo(plano, this.getRefeicoesPlano());
        const graficosEvolucao = await this.montarGraficosEvolucaoPdf();
        const qrPortfolio = await this.montarQrPortfolioPdf();

        const html = `
            <!doctype html>
            <html lang="pt-BR">
            <head>
                <meta charset="utf-8">
                <title>Plano alimentar - ${this.escapeHtml(pacienteNome)}</title>
                <style>
                    @page { size: A4; margin: 10mm; }
                    * { box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; background: #f8fafc; }
                    .page { background: white; padding: 14px; }
                    .header { display: flex; justify-content: space-between; align-items: center; gap: 14px; border-bottom: 2px solid #1a237e; padding-bottom: 10px; margin-bottom: 12px; }
                    .brand h1 { margin: 0 0 4px; color: #1a237e; font-size: 25px; }
                    .brand p { margin: 3px 0; color: #475569; font-size: 14px; }
                    .prof { display: flex; align-items: center; gap: 10px; text-align: right; }
                    .prof img { width: 62px; height: 62px; object-fit: cover; border-radius: 50%; border: 2px solid #e0e7ff; }
                    .prof-name { font-weight: 700; color: #1a237e; font-size: 15px; }
                    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
                    .meal { border: 1px solid #dbe3ef; border-radius: 10px; overflow: hidden; break-inside: avoid; background: #fff; }
                    .meal h2 { margin: 0; padding: 8px 10px; background: #eef2ff; color: #1a237e; font-size: 16px; }
                    .meal ul { margin: 0; padding: 8px 14px 9px 24px; }
                    .meal li { margin: 4px 0; line-height: 1.28; font-size: 13px; }
                    .empty { color: #94a3b8; font-style: italic; }
                    .page-break { break-before: page; page-break-before: always; }
                    .section-title { margin: 14px 0 8px; color: #1a237e; font-size: 20px; border-bottom: 2px solid #e0e7ff; padding-bottom: 5px; }
                    .section-title.page-break, .evolution-section .section-title { margin-top: 0; }
                    .patient-help { color: #475569; font-size: 12px; line-height: 1.35; margin: 0 0 8px; }
                    .summary { border: 1px solid #c7d2fe; background: #eef2ff; border-radius: 10px; padding: 9px; margin-bottom: 8px; break-inside: avoid; }
                    .nutri-row { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; font-size: 11px; color: #334155; }
                    .detail-meal { border: 1px solid #dbe3ef; border-radius: 9px; margin-bottom: 8px; overflow: hidden; break-inside: avoid; }
                    .detail-meal h3 { margin: 0; padding: 7px 10px; background: #f1f5f9; color: #1a237e; font-size: 14px; display: flex; justify-content: space-between; gap: 10px; }
                    .detail-body { padding: 8px 10px; display: grid; gap: 7px; }
                    .substitution { border-left: 3px solid #1a237e; padding-left: 8px; }
                    .substitution-title { font-weight: 700; color: #334155; margin-bottom: 4px; font-size: 12px; }
                    .option-detail { border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; margin: 4px 0; }
                    .option-detail.selected { border-color: #1a237e; background: #eef2ff; }
                    .option-text { font-size: 12px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
                    .macro-line { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 5px; font-size: 10px; color: #475569; }
                    .evolution-section { break-inside: auto; }
                    .evolution-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
                    .evolution-card { border: 1px solid #dbe3ef; border-radius: 9px; padding: 8px; background: #fff; break-inside: avoid; }
                    .evolution-card h3 { margin: 0 0 3px; color: #1a237e; font-size: 15px; }
                    .evolution-card p { margin: 0 0 5px; color: #64748b; font-size: 11px; }
                    .evolution-card svg { width: 100%; height: 176px; display: block; }
                    .chart-empty { padding: 26px 0; text-align: center; background: #f8fafc; border-radius: 8px; }
                    .portfolio-section { margin-top: 12px; break-inside: avoid; }
                    .portfolio-box { border: 1px solid #dbe3ef; border-radius: 12px; padding: 12px; display: flex; align-items: center; justify-content: space-between; gap: 16px; background: #f8fafc; }
                    .portfolio-box strong { color: #1a237e; font-size: 16px; }
                    .portfolio-box p { margin: 6px 0 0; color: #475569; font-size: 12px; }
                    .portfolio-box img { width: 118px; height: 118px; object-fit: contain; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; }
                    .notes { margin-top: 8px; display: grid; gap: 7px; }
                    .note { border: 1px solid #e2e8f0; border-radius: 9px; padding: 9px; break-inside: avoid; font-size: 12px; line-height: 1.35; }
                    .note strong { color: #1a237e; display: block; margin-bottom: 4px; }
                    .print-copyright { position: fixed; left: 0; bottom: 0; color: #64748b; font-size: 10px; }
                    @media print { body { background: white; } .page { padding: 0; } }
                </style>
            </head>
            <body>
                <main class="page">
                    <header class="header">
                        <div class="brand">
                            <h1>Plano Alimentar</h1>
                            <p><strong>Paciente:</strong> ${this.escapeHtml(pacienteNome)}</p>
                            <p><strong>Data:</strong> ${this.escapeHtml(dataFormatada)}</p>
                        </div>
                        <div class="prof">
                            <div>
                                <div class="prof-name">${this.escapeHtml(profissionalNome)}</div>
                                <div>Profissional responsável</div>
                            </div>
                            ${fotoProfissional ? `<img src="${this.escapeHtml(fotoProfissional)}" alt="Foto do profissional">` : ''}
                        </div>
                    </header>

                    <section class="grid">
                        ${refeicoes.map((refeicao) => `
                            <article class="meal">
                                <h2>${refeicao.titulo}</h2>
                                ${refeicao.linhas.length
                                    ? `<ul>${refeicao.linhas.map((linha) => `<li>${this.escapeHtml(linha)}</li>`).join('')}</ul>`
                                    : `<div class="empty" style="padding: 12px;">Sem alimentos cadastrados.</div>`}
                            </article>
                        `).join('')}
                    </section>

                    <h2 class="section-title page-break">Resumo nutricional</h2>
                    <section class="summary">
                        <strong>Total do plano</strong>
                        ${this.renderNutrientesPdf(resumoTotal)}
                    </section>
                    ${refeicoesDetalhadas.map((refeicao) => `
                        <section class="detail-meal">
                            <h3><span>${refeicao.titulo}</span></h3>
                            <div class="detail-body">
                                ${this.renderNutrientesPdf(refeicao.resumo)}
                            </div>
                        </section>
                    `).join('')}

                    <h2 class="section-title page-break">Substituições e detalhes dos alimentos</h2>
                    ${refeicoesDetalhadas.map((refeicao) => `
                        <section class="detail-meal">
                            <h3><span>${refeicao.titulo}</span></h3>
                            <div class="detail-body">
                                ${refeicao.substituicoes.length ? refeicao.substituicoes.map((grupo) => `
                                    <div class="substitution">
                                        <div class="substitution-title">Alimento ${grupo.itemIndex + 1}</div>
                                        ${grupo.opcoes.map((opcao, index) => `
                                            <div class="option-detail ${index === grupo.opcaoVisivelIndex ? 'selected' : ''}">
                                                <div style="font-size: 11px; color: #1a237e; font-weight: 700; margin-bottom: 4px;">${index === grupo.opcaoVisivelIndex ? 'Selecionado' : 'Substituição'} ${index + 1}/${grupo.opcoes.length}</div>
                                                ${this.renderDetalhesOpcaoPdf(opcao)}
                                            </div>
                                        `).join('')}
                                    </div>
                                `).join('') : '<div class="empty">Sem alimentos cadastrados.</div>'}
                            </div>
                        </section>
                    `).join('')}

                    ${(plano.guidelines || plano.restrictions || plano.goals) ? `
                        <section class="notes">
                            ${plano.guidelines ? `<div class="note"><strong>Orientações Gerais</strong>${this.escapeHtml(plano.guidelines).replace(/\n/g, '<br>')}</div>` : ''}
                            ${plano.restrictions ? `<div class="note"><strong>Restrições</strong>${this.escapeHtml(plano.restrictions).replace(/\n/g, '<br>')}</div>` : ''}
                            ${plano.goals ? `<div class="note"><strong>Objetivos</strong>${this.escapeHtml(plano.goals).replace(/\n/g, '<br>')}</div>` : ''}
                        </section>
                    ` : ''}

                    ${graficosEvolucao}
                    ${qrPortfolio}
                    <div class="print-copyright">© TRATAMENTO WEB</div>
                </main>
                <script>
                    window.addEventListener('load', () => {
                        setTimeout(() => window.print(), 300);
                    });
                </script>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Permita pop-ups para exportar o PDF.');
            return;
        }
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    }

    normalizarLinhaPlanoImportado(row) {
        const get = (...keys) => keys.map((key) => row[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '');
        const mealId = String(get('RefeicaoId', 'RefeiçãoId', 'refeicaoId') || '').trim();
        if (!this.getRefeicoesPlano().some((refeicao) => refeicao.id === mealId)) return null;

        return {
            mealId,
            ordem: Number(get('Ordem', 'ordem') || 1),
            opcaoIndex: Number(get('Opcao', 'Opção', 'opcao') || 1),
            alimentoNome: String(get('Alimento', 'alimento') || '').trim(),
            quantidade: Math.max(1, Number(get('Quantidade', 'quantidade') || 1)),
            texto: String(get('Texto', 'texto') || '').trim()
        };
    }

    criarOpcaoImportada(linha) {
        const alimento = this.alimentosBase.find((item) => this.normalizarBusca(item.nome) === this.normalizarBusca(linha.alimentoNome));
        if (alimento) {
            return this.criarOpcaoItemPlano(alimento, linha.quantidade);
        }

        const texto = linha.texto || [linha.alimentoNome, linha.quantidade ? `${linha.quantidade}` : ''].filter(Boolean).join(' - ');
        return {
            id: this.gerarIdItemPlano(),
            texto,
            detalhes: linha.alimentoNome ? {
                nome: linha.alimentoNome,
                quantidadeTexto: String(linha.quantidade || ''),
                gramas: 0,
                kcal: 0,
                carboidratos: 0,
                proteinas: 0,
                gorduras: 0
            } : null
        };
    }

    montarPlanoImportadoDeLinhas(linhas) {
        const itensPlano = this.criarEstadoItensPlano();
        const grupos = new Map();
        linhas.forEach((linha) => {
            const chave = `${linha.mealId}:${linha.ordem}`;
            if (!grupos.has(chave)) grupos.set(chave, []);
            grupos.get(chave).push(linha);
        });

        [...grupos.entries()]
            .sort((a, b) => {
                const [mealA, ordemA] = a[0].split(':');
                const [mealB, ordemB] = b[0].split(':');
                if (mealA !== mealB) return mealA.localeCompare(mealB);
                return Number(ordemA) - Number(ordemB);
            })
            .forEach(([chave, linhasGrupo]) => {
                const [mealId] = chave.split(':');
                const opcoes = linhasGrupo
                    .sort((a, b) => a.opcaoIndex - b.opcaoIndex)
                    .map((linha) => this.criarOpcaoImportada(linha))
                    .filter((opcao) => opcao.texto);
                if (!opcoes.length) return;

                itensPlano[mealId].push({
                    id: this.gerarIdItemPlano(),
                    texto: this.formatarTextoItemPlano({ opcoes }),
                    detalhes: opcoes[0]?.detalhes || null,
                    opcoes,
                    opcaoVisivelIndex: 0,
                    detalhesAberto: false
                });
            });

        return itensPlano;
    }

    async importarPlanoXlsx(event) {
        const input = event.target;
        const file = input?.files?.[0];
        if (!file || !this.selectedPaciente) return;

        try {
            await this.carregarBaseAlimentos();
            const XLSX = await this.carregarXlsxLib();
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.Sheets.Plano || workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            const linhas = rows.map((row) => this.normalizarLinhaPlanoImportado(row)).filter(Boolean);
            if (!linhas.length) {
                alert('A planilha nao possui linhas validas de plano alimentar.');
                return;
            }

            const itensPlano = this.montarPlanoImportadoDeLinhas(linhas);
            const agora = new Date();
            const observacoesRefeicoes = this.criarEstadoObservacoesRefeicoes();
            const mealPlanData = {
                breakfast: this.obterTextoRefeicaoImportada(itensPlano, 'breakfast'),
                morningSnack: this.obterTextoRefeicaoImportada(itensPlano, 'morningSnack'),
                lunch: this.obterTextoRefeicaoImportada(itensPlano, 'lunch'),
                afternoonSnack: this.obterTextoRefeicaoImportada(itensPlano, 'afternoonSnack'),
                dinner: this.obterTextoRefeicaoImportada(itensPlano, 'dinner'),
                supper: this.obterTextoRefeicaoImportada(itensPlano, 'supper'),
                itens_plano: itensPlano,
                observacoes_refeicoes: observacoesRefeicoes,
                profissional_nome: this.userInfo.nome,
                modelo_plano: 'base_nutricional_linhas_v2',
                origem_importacao: file.name,
                data_importacao: agora.toISOString(),
                atual: true,
                criado_por: this.userInfo.login,
                data_criacao: agora.toISOString()
            };

            const documentoId = this.gerarIdDocumento(agora);
            await this.desmarcarPlanosAtuais();
            await setDoc(doc(db, 'planos_alimentares', this.userInfo.login, this.selectedPaciente.login, documentoId), mealPlanData);
            alert('Plano alimentar importado com sucesso.');
            await this.loadPlanos();
            await this.render();
        } catch (error) {
            alert('Nao foi possivel importar o plano alimentar.');
        } finally {
            input.value = '';
        }
    }

    obterTextoRefeicaoImportada(itensPlano, mealId) {
        return (itensPlano[mealId] || [])
            .map((item) => this.formatarTextoItemPlano(item))
            .join('\n');
    }

    gerarIdDocumento(data) {
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        const hora = String(data.getHours()).padStart(2, '0');
        const minuto = String(data.getMinutes()).padStart(2, '0');
        
        return `${dia}-${mes}-${ano}_${hora}:${minuto}h`;
    }

    extrairData(documentoId) {
        try {
            const partes = documentoId.split('_');
            const dataParte = partes[0];
            const horaParte = partes[1].replace('h', '');
            
            const [dia, mes, ano] = dataParte.split('-');
            const [hora, minuto] = horaParte.split(':');
            
            return new Date(ano, mes - 1, dia, hora, minuto);
        } catch {
            return new Date(0);
        }
    }

    formatarDataExibicao(documentoId) {
        try {
            const partes = documentoId.split('_');
            const dataParte = partes[0];
            const horaParte = partes[1].replace('h', '');
            
            const [dia, mes, ano] = dataParte.split('-');
            const [hora, minuto] = horaParte.split(':');
            
            return `${dia}/${mes}/${ano} ${hora}:${minuto}h`;
        } catch {
            return documentoId;
        }
    }
}
