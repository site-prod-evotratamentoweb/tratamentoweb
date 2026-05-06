import { FuncoesCompartilhadas } from './0_home.js';
import { MenuProfissional } from './0_complementos_menu_profissional.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';

export class CadastroCliente {
    constructor(userInfo) {
        this.userInfo = userInfo;
        this.funcoes = FuncoesCompartilhadas;
        this.clientesList = [];
        this.searchTerm = '';
        this.currentFilter = 'todos';
        this.isEditing = false;
        this.editingLogin = null;
        this.menu = null;
        this.navegador = criarNavegador(userInfo, this.clientesList);
    }

    async render() {
        const app = document.getElementById('app');
        app.innerHTML = this.renderHTML();
        
        // Atualiza a lista de pacientes no navegador
        this.navegador.pacientesList = this.clientesList;
        
        // Inicializa o menu e insere no container
        this.menu = new MenuProfissional(this.userInfo, (module) => this.navegador.navegarPara(module), 'cadastro_cliente');
        const menuHtml = this.menu.render();
        const menuContainer = document.getElementById('menuContainer');
        if (menuContainer) {
            menuContainer.innerHTML = menuHtml;
        }
        this.menu.attachEvents();
        
        this.attachEvents();
        await this.loadClientes();
    }

    renderHTML() {
        const podeCadastrar = this.funcoes.podeCriarPaciente(this.userInfo.perfil);
        
        return `
            <div class="dashboard-container">
                <div id="menuContainer"></div>

                <div class="main-content">
                    <div class="content-header">
                        <div class="header-title">
                            <h3>👥 Cadastro de Clientes / Pacientes</h3>
                            <p>Gerencie todos os clientes cadastrados no sistema</p>
                        </div>
                        ${podeCadastrar ? `
                            <button id="novoClienteBtn" class="btn-primary">
                                <span>➕</span> Novo Cliente
                            </button>
                        ` : `
                            <button class="btn-secondary" disabled style="opacity:0.5; cursor:not-allowed;">
                                <span>🔒</span> Apenas Gerentes podem cadastrar
                            </button>
                        `}
                    </div>

                    <div class="search-bar">
                        <div class="search-input-wrapper">
                            <span class="search-icon">🔍</span>
                            <input type="text" id="searchCliente" placeholder="Buscar por nome, login ou telefone..." class="search-input">
                        </div>
                        <div class="filter-buttons">
                            <button class="filter-btn active" data-filter="todos">Todos</button>
                            <button class="filter-btn" data-filter="ativos">Ativos</button>
                            <button class="filter-btn" data-filter="inativos">Inativos</button>
                        </div>
                    </div>

                    <div class="clientes-container">
                        <div class="clientes-table-container">
                            <table class="clientes-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Login</th>
                                        <th>Contato</th>
                                        <th>Data Nasc.</th>
                                        <th>Idade</th>
                                        <th>Status</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="clientesTableBody">
                                    ${this.renderClientesTable()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL CADASTRO/EDIÇÃO -->
            <div id="clienteModal" class="modal" style="display: none;">
                <div class="modal-content modal-medium">
                    <div class="modal-header">
                        <h3 id="modalTitle">📝 Cadastrar Cliente</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <form id="clienteForm">
                        <div class="form-section">
                            <h4>📋 Dados Pessoais</h4>
                            <div class="form-row">
                                <div class="form-field">
                                    <label>👤 Nome Completo *</label>
                                    <input type="text" id="nome" required placeholder="Ex: Maria da Silva">
                                </div>
                                <div class="form-field">
                                    <label>🔑 Login *</label>
                                    <input type="text" id="login" required placeholder="Ex: maria.silva">
                                    <small>Único e não pode ser alterado</small>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-field">
                                    <label>📅 Data de Nascimento *</label>
                                    <input type="date" id="dataNascimento" required>
                                </div>
                                <div class="form-field">
                                    <label>⚥ Sexo</label>
                                    <select id="sexo">
                                        <option value="">Selecione</option>
                                        <option value="feminino">Feminino</option>
                                        <option value="masculino">Masculino</option>
                                        <option value="outro">Outro</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h4>📱 Contato</h4>
                            <div class="form-row">
                                <div class="form-field">
                                    <label>📱 Telefone</label>
                                    <input type="text" id="telefone" placeholder="(11) 99999-9999">
                                </div>
                                <div class="form-field">
                                    <label>💬 WhatsApp</label>
                                    <input type="text" id="whatsapp" placeholder="(11) 99999-9999">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-field">
                                    <label>📧 E-mail</label>
                                    <input type="email" id="email" placeholder="cliente@email.com">
                                </div>
                                <div class="form-field">
                                    <label>📍 Endereço</label>
                                    <input type="text" id="endereco" placeholder="Cidade, Estado">
                                </div>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn-secondary" id="cancelarModalBtn">Cancelar</button>
                            <button type="submit" class="btn-primary">💾 Salvar Cliente</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- MODAL DETALHES -->
            <div id="detalhesModal" class="modal" style="display: none;">
                <div class="modal-content modal-medium">
                    <div class="modal-header">
                        <h3>👤 Detalhes do Cliente</h3>
                        <button class="close-detalhes-modal">&times;</button>
                    </div>
                    <div id="detalhesContent"></div>
                </div>
            </div>

            <!-- MODAL CÓDIGO -->
            <div id="codigoModal" class="modal" style="display: none;">
                <div class="modal-content modal-small">
                    <div class="modal-header">
                        <h3>🔑 Código de Acesso</h3>
                        <button class="close-codigo-modal">&times;</button>
                    </div>
                    <div id="codigoContent"></div>
                </div>
            </div>
        `;
    }

    renderClientesTable() {
        let filteredList = [...this.clientesList];
        
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filteredList = filteredList.filter(c => 
                c.nome?.toLowerCase().includes(term) ||
                c.login?.toLowerCase().includes(term) ||
                c.telefone?.includes(term) ||
                c.whatsapp?.includes(term)
            );
        }
        
        if (this.currentFilter === 'ativos') {
            filteredList = filteredList.filter(c => c.status_ativo !== false);
        } else if (this.currentFilter === 'inativos') {
            filteredList = filteredList.filter(c => c.status_ativo === false);
        }
        
        if (filteredList.length === 0) {
            return `
                <tr>
                    <td colspan="7" class="text-center empty-state">
                        <span class="empty-icon">👥</span>
                        <p>Nenhum cliente encontrado</p>
                        <button class="btn-small" id="emptyStateAddBtn">+ Adicionar Cliente</button>
                    </td>
                </tr>
            `;
        }
        
        return filteredList.map(c => `
            <table>
                <td>...</td>
                <td>...</td>
                <td class="actions">
                    <button class="btn-icon view-cliente" data-login="${c.login}" title="Ver Detalhes">👁️</button>
                    <button class="btn-icon edit-cliente" data-login="${c.login}" title="Editar">✏️</button>
                    <!-- BOTÃO DESVINCULAR -->
                    <button class="btn-icon unlink-cliente" data-login="${c.login}" title="Desvincular" style="color: #dc2626;">🔗❌</button>
                    ${!c.hasUltimoLogin ? 
                        `<button class="btn-icon codigo-acesso" data-login="${c.login}" title="Código de Acesso">📱</button>` :
                        `<button class="btn-icon reset-senha" data-login="${c.login}" title="Resetar Senha">🔑</button>`
                    }
                    ${c.status_ativo !== false ? 
                        `<button class="btn-icon suspend-cliente" data-login="${c.login}" title="Suspender">⏸️</button>` :
                        `<button class="btn-icon activate-cliente" data-login="${c.login}" title="Ativar">▶️</button>`
                    }
                </td>
            </tr>
        `).join('');
    }

    attachEvents() {
        // Search
        const searchInput = document.getElementById('searchCliente');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.refreshTable();
            });
        }

        // Filter
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = btn.getAttribute('data-filter');
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.refreshTable();
            });
        });

        document.querySelectorAll('.unlink-cliente').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const login = btn.getAttribute('data-login');
                await this.desvincularPaciente(login);
            });
        });

        // Modal
        const modal = document.getElementById('clienteModal');
        const closeModalBtn = document.querySelector('.close-modal');
        const cancelarBtn = document.getElementById('cancelarModalBtn');
        const novoClienteBtn = document.getElementById('novoClienteBtn');

        if (closeModalBtn) closeModalBtn.onclick = () => modal.style.display = 'none';
        if (cancelarBtn) cancelarBtn.onclick = () => modal.style.display = 'none';
        if (novoClienteBtn) {
            novoClienteBtn.onclick = () => {
                this.clearForm();
                this.isEditing = false;
                this.editingLogin = null;
                document.getElementById('modalTitle').textContent = '📝 Cadastrar Cliente';
                document.getElementById('login').disabled = false;
                modal.style.display = 'flex';
            };
        }

        window.onclick = (event) => {
            if (event.target === modal) modal.style.display = 'none';
            if (event.target === document.getElementById('detalhesModal')) document.getElementById('detalhesModal').style.display = 'none';
            if (event.target === document.getElementById('codigoModal')) document.getElementById('codigoModal').style.display = 'none';
        };

        // Form submit
        const clienteForm = document.getElementById('clienteForm');
        if (clienteForm) {
            clienteForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveCliente();
            });
        }

        // Table actions
        const tableBody = document.getElementById('clientesTableBody');
        if (tableBody) {
            tableBody.addEventListener('click', async (e) => {
                const btn = e.target.closest('.btn-icon');
                if (!btn) return;
                
                const login = btn.getAttribute('data-login');
                if (btn.classList.contains('view-cliente')) {
                    await this.viewCliente(login);
                } else if (btn.classList.contains('edit-cliente')) {
                    await this.editCliente(login);
                } else if (btn.classList.contains('reset-senha')) {
                    await this.resetPassword(login);
                } else if (btn.classList.contains('codigo-acesso')) {
                    await this.showAccessCode(login);
                } else if (btn.classList.contains('suspend-cliente')) {
                    await this.suspendCliente(login);
                } else if (btn.classList.contains('activate-cliente')) {
                    await this.activateCliente(login);
                }
            });
        }

        // Empty state add
        const emptyStateBtn = document.getElementById('emptyStateAddBtn');
        if (emptyStateBtn) {
            emptyStateBtn.onclick = () => {
                this.clearForm();
                this.isEditing = false;
                this.editingLogin = null;
                document.getElementById('modalTitle').textContent = '📝 Cadastrar Cliente';
                document.getElementById('login').disabled = false;
                modal.style.display = 'flex';
            };
        }
    }

    async loadClientes() {
        this.clientesList = await this.funcoes.loadPacientesList();
        // Atualiza a lista no navegador
        this.navegador.pacientesList = this.clientesList;
        this.refreshTable();
    }

    refreshTable() {
        const tbody = document.getElementById('clientesTableBody');
        if (tbody) {
            tbody.innerHTML = this.renderClientesTable();
            
            const emptyStateBtn = document.getElementById('emptyStateAddBtn');
            if (emptyStateBtn) {
                emptyStateBtn.onclick = () => {
                    this.clearForm();
                    this.isEditing = false;
                    this.editingLogin = null;
                    document.getElementById('modalTitle').textContent = '📝 Cadastrar Cliente';
                    document.getElementById('login').disabled = false;
                    document.getElementById('clienteModal').style.display = 'flex';
                };
            }
        }
    }

    clearForm() {
        document.getElementById('nome').value = '';
        document.getElementById('login').value = '';
        document.getElementById('dataNascimento').value = '';
        document.getElementById('sexo').value = '';
        document.getElementById('telefone').value = '';
        document.getElementById('whatsapp').value = '';
        document.getElementById('email').value = '';
        document.getElementById('endereco').value = '';
    }

    async saveCliente() {
        try {
            const login = document.getElementById('login').value;
            const existingCliente = this.clientesList.find(c => c.login === login);
            
            const clienteData = {
                nome: document.getElementById('nome').value,
                login: login,
                dataNascimento: document.getElementById('dataNascimento').value,
                sexo: document.getElementById('sexo').value,
                telefone: document.getElementById('telefone').value,
                whatsapp: document.getElementById('whatsapp').value,
                email: document.getElementById('email').value,
                endereco: document.getElementById('endereco').value
            };
    
            if (existingCliente) {
                await this.funcoes.updatePaciente(login, clienteData);
                alert(`✅ Cliente "${clienteData.nome}" atualizado com sucesso!`);
            } else {
                const result = await this.funcoes.registerPaciente(clienteData);
                alert(`✅ Cliente cadastrado!\n\n📋 Login: ${result.login}\n🔑 Código: ${result.codigo}`);
            }
            
            document.getElementById('clienteModal').style.display = 'none';
            await this.loadClientes();
        } catch (error) {
            alert('❌ Erro: ' + error.message);
        }
    }
        
    async editCliente(login) {
        const cliente = this.clientesList.find(c => c.login === login);
        if (!cliente) return;

        this.isEditing = true;
        this.editingLogin = login;
        document.getElementById('modalTitle').textContent = '✏️ Editar Cliente';
        document.getElementById('nome').value = cliente.nome || '';
        document.getElementById('login').value = cliente.login;
        document.getElementById('login').disabled = true;
        document.getElementById('dataNascimento').value = cliente.dataNascimento || '';
        document.getElementById('sexo').value = cliente.sexo || '';
        document.getElementById('telefone').value = cliente.telefone || '';
        document.getElementById('whatsapp').value = cliente.whatsapp || '';
        document.getElementById('email').value = cliente.email || '';
        document.getElementById('endereco').value = cliente.endereco || '';
        
        document.getElementById('clienteModal').style.display = 'flex';
    }

    async viewCliente(login) {
        const cliente = this.clientesList.find(c => c.login === login);
        if (!cliente) return;

        const detalhesHtml = `
            <div class="detalhes-cliente">
                <div class="detalhes-header">
                    <div class="detalhes-avatar">👤</div>
                    <div class="detalhes-nome">
                        <h2>${cliente.nome}</h2>
                        <p>${cliente.login}</p>
                    </div>
                </div>
                <div class="detalhes-info">
                    <div class="info-row"><span class="info-label">📅 Data Nasc.:</span><span>${this.funcoes.formatDateToDisplay(cliente.dataNascimento) || 'N/I'}</span></div>
                    <div class="info-row"><span class="info-label">🎂 Idade:</span><span>${this.funcoes.calcularIdade(cliente.dataNascimento)} anos</span></div>
                    <div class="info-row"><span class="info-label">⚥ Sexo:</span><span>${cliente.sexo || 'N/I'}</span></div>
                    <div class="info-row"><span class="info-label">📱 Telefone:</span><span>${cliente.telefone || 'N/I'}</span></div>
                    <div class="info-row"><span class="info-label">💬 WhatsApp:</span><span>${cliente.whatsapp || 'N/I'}</span></div>
                    <div class="info-row"><span class="info-label">📧 E-mail:</span><span>${cliente.email || 'N/I'}</span></div>
                    <div class="info-row"><span class="info-label">📍 Endereço:</span><span>${cliente.endereco || 'N/I'}</span></div>
                    <div class="info-row"><span class="info-label">📊 Status:</span><span class="status-badge ${cliente.status_ativo !== false ? 'active' : 'inactive'}">${cliente.status_ativo !== false ? 'Ativo' : 'Inativo'}</span></div>
                    <div class="info-row"><span class="info-label">📅 Cadastro:</span><span>${cliente.dataHoraCadastro || 'N/I'}</span></div>
                </div>
                <div class="detalhes-actions">
                    <button class="btn-primary" id="editFromDetails">✏️ Editar</button>
                    <button class="btn-secondary" id="closeDetailsBtn">Fechar</button>
                </div>
            </div>
        `;
        
        const detalhesModal = document.getElementById('detalhesModal');
        const detalhesContent = document.getElementById('detalhesContent');
        detalhesContent.innerHTML = detalhesHtml;
        detalhesModal.style.display = 'flex';
        
        document.getElementById('editFromDetails').onclick = () => {
            detalhesModal.style.display = 'none';
            this.editCliente(login);
        };
        document.getElementById('closeDetailsBtn').onclick = () => detalhesModal.style.display = 'none';
        document.querySelector('.close-detalhes-modal').onclick = () => detalhesModal.style.display = 'none';
    }

    async resetPassword(login) {
        if (!confirm(`⚠️ Gerar token de reset de senha para ${login}?`)) return;
        try {
            const result = await this.funcoes.resetarSenhaPaciente(login);
            alert(`🔑 TOKEN: ${result.token}\nVálido por 1 hora`);
        } catch (error) {
            alert(error.message);
        }
    }

    async showAccessCode(login) {
        try {
            const result = await this.funcoes.visualizarCodigoPaciente(login);
            const codigoHtml = `
                <div class="codigo-content">
                    <p><strong>👤 Cliente:</strong> ${result.nome}</p>
                    <p><strong>🔑 Login:</strong> ${result.login}</p>
                    <div class="codigo-display">
                        <span class="codigo-label">📱 CÓDIGO DE ACESSO</span>
                        <div class="codigo-value">${result.codigo}</div>
                    </div>
                    <p>⏰ Expira em: ${new Date(result.expiracao).toLocaleString('pt-BR')}</p>
                </div>
            `;
            const codigoModal = document.getElementById('codigoModal');
            const codigoContent = document.getElementById('codigoContent');
            codigoContent.innerHTML = codigoHtml;
            codigoModal.style.display = 'flex';
            document.querySelector('.close-codigo-modal').onclick = () => codigoModal.style.display = 'none';
        } catch (error) {
            alert(error.message);
        }
    }

    async suspendCliente(login) {
        if (!confirm(`Suspender cliente ${login}?`)) return;
        try {
            await this.funcoes.updatePaciente(login, { status_ativo: false });
            alert(`✅ Cliente suspenso!`);
            await this.loadClientes();
        } catch (error) {
            alert('❌ Erro: ' + error.message);
        }
    }

    async activateCliente(login) {
        if (!confirm(`Reativar cliente ${login}?`)) return;
        try {
            await this.funcoes.updatePaciente(login, { status_ativo: true });
            alert(`✅ Cliente reativado!`);
            await this.loadClientes();
        } catch (error) {
            alert('❌ Erro: ' + error.message);
        }
    }

    async desvincularPaciente(login) {
        try {
            if (!confirm(`Desvincular paciente ${login}?`)) return;
            
            // Remove do MAPA de pacientes
            const profissionalRef = doc(db, "logins", this.userInfo.login);
            const profissionalDoc = await getDoc(profissionalRef);
            const pacientesAtuais = profissionalDoc.data().pacientes || {};
            
            delete pacientesAtuais[login];
            
            await updateDoc(profissionalRef, {
                pacientes: pacientesAtuais
            });
            
            alert(`✅ Paciente ${login} desvinculado com sucesso!`);
            await this.loadClientes();
        } catch (error) {
            alert('❌ Erro: ' + error.message);
        }
    }
    
}
