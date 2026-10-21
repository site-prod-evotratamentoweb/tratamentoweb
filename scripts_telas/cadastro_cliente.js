import { FuncoesCompartilhadas } from './0_home.js';
import { MenuProfissional } from './0_complementos_menu_profissional.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { db, doc, getDoc, updateDoc } from '../0_firebase_api_config.js';

export class CadastroCliente {
    constructor(userInfo) {
        this.userInfo = userInfo;
        this.funcoes = FuncoesCompartilhadas;
        this.clientesList = [];
        this.searchTerm = '';
        this.currentFilter = 'todos';
        this.isEditing = false;
        this.editingLogin = null;
        this.resetPasswordLogin = null;
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
            <div class="dashboard-container" style="height:calc(100vh - 12px); max-height:calc(100vh - 12px); margin:6px auto; display:flex; flex-direction:column;">
                <div id="menuContainer"></div>

                <div class="main-content" style="flex:1; min-height:0; overflow-y:auto; padding:12px 16px 90px;">
                    <div class="content-header" style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:14px 16px; margin-bottom:12px;">
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

                    <div class="search-bar" style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:12px; margin-bottom:12px; display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
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
                <div class="modal-content" style="padding:0; background:white; border-radius:16px; width:min(94vw,900px); max-width:900px; height:min(92vh,760px); margin:4vh auto; overflow:hidden; display:flex; flex-direction:column;">
                    <div class="modal-header" style="background:linear-gradient(135deg,#1a237e 0%,#283593 100%); color:white; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; flex:0 0 auto;">
                        <h3 id="modalTitle">📝 Cadastrar Cliente</h3>
                        <button class="close-modal" type="button" style="background:rgba(255,255,255,.18); color:white; border:none; border-radius:8px; width:34px; height:34px; cursor:pointer; font-size:18px;">X</button>
                    </div>
                    <form id="clienteForm" style="flex:1; min-height:0; overflow-y:auto; padding:16px;">
                        <div class="form-section">
                            <h4>📋 Dados Pessoais</h4>
                            <div class="form-row">
                                <div class="form-field">
                                    <label>👤 Nome Completo *</label>
                                    <input type="text" id="nome" required autocomplete="name" placeholder="Ex: Maria da Silva">
                                    <small>Somente letras; informe pelo menos nome e sobrenome</small>
                                </div>
                                <div class="form-field">
                                    <label>🔑 Login *</label>
                                    <input type="text" id="login" required readonly placeholder="Gerado pelo nome completo">
                                    <small>Gerado automaticamente com o primeiro e o último nome</small>
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
                <div class="modal-content" style="padding:0; background:white; border-radius:16px; width:min(94vw,900px); max-width:900px; max-height:92vh; margin:4vh auto; overflow:hidden; display:flex; flex-direction:column;">
                    <div class="modal-header" style="background:linear-gradient(135deg,#1a237e 0%,#283593 100%); color:white; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
                        <h3>👤 Detalhes do Cliente</h3>
                        <button class="close-detalhes-modal" type="button" style="background:rgba(255,255,255,.18); color:white; border:none; border-radius:8px; width:34px; height:34px; cursor:pointer; font-size:18px;">X</button>
                    </div>
                    <div id="detalhesContent" style="padding:16px; overflow-y:auto;"></div>
                </div>
            </div>

            <!-- MODAL CÓDIGO -->
            <div id="codigoModal" class="modal" style="display: none;">
                <div class="modal-content" style="padding:0; background:white; border-radius:16px; width:min(92vw,520px); max-width:520px; margin:8vh auto; overflow:hidden;">
                    <div class="modal-header" style="background:linear-gradient(135deg,#1a237e 0%,#283593 100%); color:white; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
                        <h3>🔑 Senha de Primeiro Acesso</h3>
                        <button class="close-codigo-modal" type="button" style="background:rgba(255,255,255,.18); color:white; border:none; border-radius:8px; width:34px; height:34px; cursor:pointer; font-size:18px;">X</button>
                    </div>
                    <div id="codigoContent" style="padding:18px;"></div>
                </div>
            </div>

            <!-- MODAL REDEFINIR SENHA -->
            <div id="resetPasswordModal" class="modal" style="display: none;">
                <div class="modal-content" style="padding:0; background:white; border-radius:16px; width:min(92vw,520px); max-width:520px; margin:8vh auto; overflow:hidden;">
                    <div class="modal-header" style="background:linear-gradient(135deg,#1a237e 0%,#283593 100%); color:white; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
                        <h3>🔑 Redefinir senha do paciente</h3>
                        <button class="close-reset-password-modal" type="button" aria-label="Fechar" style="background:rgba(255,255,255,.18); color:white; border:none; border-radius:8px; width:34px; height:34px; cursor:pointer; font-size:18px;">X</button>
                    </div>
                    <form id="resetPasswordForm" style="padding:18px;">
                        <p id="resetPasswordPatient" style="margin:0 0 16px; color:#475569;"></p>
                        <div class="form-field" style="margin-bottom:14px;">
                            <label for="patientNewPassword">Nova senha</label>
                            <input type="password" id="patientNewPassword" autocomplete="new-password" minlength="6" maxlength="128" required>
                            <small>Mínimo de 6 caracteres.</small>
                        </div>
                        <div class="form-field" style="margin-bottom:10px;">
                            <label for="patientConfirmPassword">Confirmar nova senha</label>
                            <input type="password" id="patientConfirmPassword" autocomplete="new-password" minlength="6" maxlength="128" required>
                        </div>
                        <label style="display:flex; align-items:center; gap:8px; margin:12px 0 16px; color:#475569; cursor:pointer;">
                            <input type="checkbox" id="showPatientPassword"> Mostrar senhas
                        </label>
                        <p style="font-size:13px; color:#64748b; margin:0 0 16px;">A senha será atualizada nos dois ambientes de autenticação. As sessões anteriores não poderão ser renovadas.</p>
                        <div class="form-actions" style="margin-top:0;">
                            <button type="button" class="btn-secondary" id="cancelResetPasswordBtn">Cancelar</button>
                            <button type="submit" class="btn-primary" id="saveResetPasswordBtn">Redefinir senha</button>
                        </div>
                    </form>
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
            filteredList = filteredList.filter(c => c.status_ativo_login === true);
        } else if (this.currentFilter === 'inativos') {
            filteredList = filteredList.filter(c => c.status_ativo_login !== true);
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
            <tr>
                <td><strong style="color:#1e293b;">${this.escapeHtml(c.nome || c.login)}</strong></td>
                <td><span class="login-code">${this.escapeHtml(c.login)}</span></td>
                <td>${this.escapeHtml(c.whatsapp || c.telefone || c.email || '--')}</td>
                <td>${this.escapeHtml(this.funcoes.formatDateToDisplay(c.dataNascimento) || '--')}</td>
                <td>${this.funcoes.calcularIdade(c.dataNascimento) ?? '--'}${this.funcoes.calcularIdade(c.dataNascimento) !== null ? ' anos' : ''}</td>
                <td><span class="status-badge ${c.status_ativo_login === true ? 'active' : 'inactive'}">${c.status_ativo_login === true ? 'Ativo' : 'Inativo'}</span></td>
                <td class="actions">
                    <button class="btn-icon view-cliente" data-login="${c.login}" title="Ver Detalhes">👁️</button>
                    <button class="btn-icon edit-cliente" data-login="${c.login}" title="Editar">✏️</button>
                    <!-- BOTÃO DESVINCULAR -->
                    <button class="btn-icon unlink-cliente" data-login="${c.login}" title="Desvincular" style="color: #dc2626;">🔗❌</button>
                    ${!c.hasUltimoLogin ? 
                        `<button class="btn-icon codigo-acesso" data-login="${c.login}" title="Senha de Primeiro Acesso">📱</button>` :
                        `<button class="btn-icon reset-senha" data-login="${c.login}" title="Resetar Senha">🔑</button>`
                    }
                    ${c.status_ativo_login === true ? 
                        `<button class="btn-icon suspend-cliente" data-login="${c.login}" title="Suspender">⏸️</button>` :
                        `<button class="btn-icon activate-cliente" data-login="${c.login}" title="Ativar">▶️</button>`
                    }
                </td>
            </tr>
        `).join('');
    }

    escapeHtml(valor) {
        return String(valor ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
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

        const nomeInput = document.getElementById('nome');
        const loginInput = document.getElementById('login');
        if (nomeInput && loginInput) {
            nomeInput.addEventListener('input', () => {
                if (!this.isEditing) loginInput.value = this.funcoes.gerarLoginPorNome(nomeInput.value);
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
        const resetPasswordModal = document.getElementById('resetPasswordModal');
        const closeResetPasswordBtn = document.querySelector('.close-reset-password-modal');
        const cancelResetPasswordBtn = document.getElementById('cancelResetPasswordBtn');

        if (closeModalBtn) closeModalBtn.onclick = () => modal.style.display = 'none';
        if (cancelarBtn) cancelarBtn.onclick = () => modal.style.display = 'none';
        if (closeResetPasswordBtn) closeResetPasswordBtn.onclick = () => this.closeResetPasswordModal();
        if (cancelResetPasswordBtn) cancelResetPasswordBtn.onclick = () => this.closeResetPasswordModal();
        if (novoClienteBtn) {
            novoClienteBtn.onclick = () => {
                this.clearForm();
                this.isEditing = false;
                this.editingLogin = null;
                document.getElementById('modalTitle').textContent = '📝 Cadastrar Cliente';
                document.getElementById('login').disabled = false;
                document.getElementById('login').readOnly = true;
                modal.style.display = 'flex';
            };
        }

        window.onclick = (event) => {
            if (event.target === modal) modal.style.display = 'none';
            if (event.target === document.getElementById('detalhesModal')) document.getElementById('detalhesModal').style.display = 'none';
            if (event.target === document.getElementById('codigoModal')) document.getElementById('codigoModal').style.display = 'none';
            if (event.target === resetPasswordModal) this.closeResetPasswordModal();
        };

        // Form submit
        const clienteForm = document.getElementById('clienteForm');
        if (clienteForm) {
            clienteForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveCliente();
            });
        }

        const resetPasswordForm = document.getElementById('resetPasswordForm');
        if (resetPasswordForm) {
            resetPasswordForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                await this.submitPasswordReset();
            });
        }
        document.getElementById('showPatientPassword')?.addEventListener('change', (event) => {
            const type = event.target.checked ? 'text' : 'password';
            document.getElementById('patientNewPassword').type = type;
            document.getElementById('patientConfirmPassword').type = type;
        });

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
                } else if (btn.classList.contains('unlink-cliente')) {
                    await this.desvincularPaciente(login);
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
        this.clientesList = await this.funcoes.loadPacientesList(this.userInfo.login);
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
                    document.getElementById('login').readOnly = true;
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
            const nome = this.funcoes.normalizarNomeCompleto(document.getElementById('nome').value);
            const login = this.isEditing
                ? this.editingLogin
                : this.funcoes.gerarLoginPorNome(nome);
            document.getElementById('login').value = login;
            const existingCliente = this.isEditing
                ? this.clientesList.find(c => c.login === this.editingLogin)
                : null;
            
            const clienteData = {
                nome,
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
                alert(`✅ Cliente cadastrado!\n\n📋 Login: ${result.login}\n🔑 Senha de primeiro acesso: ${result.codigo}`);
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
                    <div class="info-row"><span class="info-label">📊 Status:</span><span class="status-badge ${cliente.status_ativo_login === true ? 'active' : 'inactive'}">${cliente.status_ativo_login === true ? 'Ativo' : 'Inativo'}</span></div>
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
        const cliente = this.clientesList.find((item) => item.login === login);
        if (!cliente) return;

        this.resetPasswordLogin = login;
        document.getElementById('resetPasswordPatient').innerHTML = `Paciente: <strong>${this.escapeHtml(cliente.nome || login)}</strong><br>Login: <span class="login-code">${this.escapeHtml(login)}</span>`;
        document.getElementById('patientNewPassword').value = '';
        document.getElementById('patientConfirmPassword').value = '';
        document.getElementById('showPatientPassword').checked = false;
        document.getElementById('patientNewPassword').type = 'password';
        document.getElementById('patientConfirmPassword').type = 'password';
        document.getElementById('resetPasswordModal').style.display = 'flex';
        document.getElementById('patientNewPassword').focus();
    }

    closeResetPasswordModal() {
        const modal = document.getElementById('resetPasswordModal');
        if (modal) modal.style.display = 'none';
        this.resetPasswordLogin = null;
    }

    async submitPasswordReset() {
        const login = this.resetPasswordLogin;
        const newPassword = document.getElementById('patientNewPassword')?.value || '';
        const confirmPassword = document.getElementById('patientConfirmPassword')?.value || '';
        const submitButton = document.getElementById('saveResetPasswordBtn');

        if (!login) return;
        if (newPassword.length < 6) {
            alert('A nova senha deve ter no mínimo 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('As senhas não coincidem.');
            return;
        }
        if (!confirm(`Redefinir a senha de ${login}? As sessões anteriores não poderão ser renovadas.`)) return;

        const originalText = submitButton?.textContent || 'Redefinir senha';
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Redefinindo...';
        }
        try {
            await this.funcoes.redefinirSenhaPaciente(login, newPassword);
            this.closeResetPasswordModal();
            alert(`✅ Senha de ${login} redefinida com sucesso nos dois ambientes.`);
        } catch (error) {
            alert(`❌ Não foi possível redefinir a senha: ${error.message}`);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
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
                        <span class="codigo-label">📱 SENHA DE PRIMEIRO ACESSO</span>
                        <div class="codigo-value">${result.codigo}</div>
                    </div>
                    <p>Digite apenas os números da data de nascimento no formato DDMMAAAA.</p>
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
            await this.funcoes.updatePaciente(login, { status_ativo_login: false });
            alert(`✅ Cliente suspenso!`);
            await this.loadClientes();
        } catch (error) {
            alert('❌ Erro: ' + error.message);
        }
    }

    async activateCliente(login) {
        if (!confirm(`Reativar cliente ${login}?`)) return;
        try {
            await this.funcoes.updatePaciente(login, { status_ativo_login: true });
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
