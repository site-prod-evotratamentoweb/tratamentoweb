// components/MenuProfissional.js
import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { db, doc, updateDoc, uploadParaImgbb } from '../0_firebase_api_config.js';

export class MenuProfissional {
    constructor(userInfo, onNavigate, currentModule = 'home') {
        this.userInfo = userInfo;
        this.onNavigate = onNavigate;
        this.currentModule = currentModule;
        this.isMenuOpen = false;
        this.navegador = criarNavegador(userInfo);
    }

    render() {
        const cargoFormatado = this.userInfo.cargo ? this.userInfo.cargo.charAt(0).toUpperCase() + this.userInfo.cargo.slice(1) : '';
        const perfil = this.userInfo.perfil || '';
        const fotoPerfil = this.userInfo.foto_perfil_url || this.userInfo.fotoPerfilUrl || this.userInfo.foto || '';
        
        return `
            <div class="top-bar">
                <div class="logo-area">
                    <img src="./imagens/logo.png" alt="TratamentoWeb" class="logo">
                    <h2>${this.getTitle()}</h2>
                </div>
                <div class="top-bar-actions">
                    <div class="user-greeting">
                        <button id="btnFotoPerfilProfissional" type="button" title="Inserir ou trocar foto" aria-label="Inserir ou trocar foto" style="width: 38px; height: 38px; padding: 0; border: 2px solid #e2e8f0; border-radius: 50%; overflow: hidden; background: white; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">
                            ${fotoPerfil ? `<img src="${fotoPerfil}" alt="Foto de ${this.userInfo.nome}" style="width: 100%; height: 100%; object-fit: cover;">` : '<span style="font-size: 18px;">📷</span>'}
                        </button>
                        <input id="inputFotoPerfilProfissional" type="file" accept="image/jpeg,image/png,image/webp" style="display: none;">
                        <span>👋 ${this.userInfo.nome}</span>
                        <span class="role-badge perfil-supervisor">${cargoFormatado}</span>
                        <span class="role-badge" style="background: #475569; color: white;">${perfil}</span>
                    </div>
                    <button class="menu-toggle" id="menuToggle">
                        <span class="menu-icon">☰</span>
                    </button>
                </div>
            </div>

            <div class="side-menu" id="sideMenu">
                <div class="menu-header">
                    <h3>Menu</h3>
                    <button class="close-menu" id="closeMenu">×</button>
                </div>
                <nav class="menu-nav">
                    ${this.renderMenuItems()}
                    <div class="menu-divider">Sistema</div>
                    <button class="menu-item logout" id="logoutMenuItem">
                        <span class="menu-icon">🚪</span>
                        <span>Sair</span>
                    </button>
                </nav>
            </div>
            <div class="menu-overlay" id="menuOverlay"></div>
        `;
    }

    getTitle() {
        if (this.userInfo.cargo === 'nutricionista') return 'Sistema Nutricional';
        if (this.userInfo.cargo === 'psicologo') return 'Sistema Psicológico';
        return 'TratamentoWeb';
    }

    renderMenuItems() {
        const items = [];
        
        // Home (comum)
        items.push(`
            <button class="menu-item ${this.currentModule === 'home' ? 'active' : ''}" data-module="home">
                <span class="menu-icon">🏠</span>
                <span>Home</span>
            </button>
        `);
        
        // Menu específico para nutricionista
        if (this.userInfo.cargo === 'nutricionista') {
            items.push(`
                <button class="menu-item ${this.currentModule === 'anamnese' ? 'active' : ''}" data-module="anamnese">
                    <span class="menu-icon">📋</span>
                    <span>Anamnese</span>
                </button>
                <button class="menu-item ${this.currentModule === 'plano_alimentar' ? 'active' : ''}" data-module="plano_alimentar">
                    <span class="menu-icon">🍽️</span>
                    <span>Plano Alimentar</span>
                </button>
                <button class="menu-item ${this.currentModule === 'calculo_energetico' ? 'active' : ''}" data-module="calculo_energetico">
                    <span class="menu-icon">🧮</span>
                    <span>Cálculo Energético</span>
                </button>
            `);
        }
        
        // Menu específico para psicólogo
        if (this.userInfo.cargo === 'psicologo') {
            items.push(`
                <button class="menu-item ${this.currentModule === 'avaliacao_psicologica' ? 'active' : ''}" data-module="avaliacao_psicologica">
                    <span class="menu-icon">🧠</span>
                    <span>Avaliação Psicológica</span>
                </button>
                <button class="menu-item ${this.currentModule === 'prontuario_psicologico' ? 'active' : ''}" data-module="prontuario_psicologico">
                    <span class="menu-icon">📝</span>
                    <span>Prontuário</span>
                </button>
            `);
        }
        
        // Shopping Nutri (comum a todos os profissionais)
        items.push(`
            <button class="menu-item ${this.currentModule === 'shopping_nutri' ? 'active' : ''}" data-module="shopping_nutri">
                <span class="menu-icon">🛍️</span>
                <span>Shopping Nutri</span>
            </button>
        `);
        
        // Itens comuns a todos os profissionais
        items.push(`
            <button class="menu-item ${this.currentModule === 'cadastro_cliente' ? 'active' : ''}" data-module="cadastro_cliente">
                <span class="menu-icon">👥</span>
                <span>Clientes</span>
            </button>
            <button class="menu-item ${this.currentModule === 'atendimento_grupo' ? 'active' : ''}" data-module="atendimento_grupo">
                <span class="menu-icon">👥</span>
                <span>Atendimento em Grupo</span>
            </button>
            <button class="menu-item ${this.currentModule === 'gestao_agendamentos' ? 'active' : ''}" data-module="gestao_agendamentos">
                <span class="menu-icon">📅</span>
                <span>Gestão de Agendamentos</span>
            </button>
            <button class="menu-item ${this.currentModule === 'acompanhar_jornadas' ? 'active' : ''}" data-module="acompanhar_jornadas">
                <span class="menu-icon">🌟</span>
                <span>Acompanhar Jornadas</span>
            </button>
            <button class="menu-item ${this.currentModule === 'palestras_videos' ? 'active' : ''}" data-module="palestras_videos">
                <span class="menu-icon">🎥</span>
                <span>Palestras e Vídeos</span>
            </button>
            <button class="menu-item ${this.currentModule === 'chat' ? 'active' : ''}" data-module="chat">
                <span class="menu-icon">💬</span>
                <span>Chat</span>
            </button>
        `);
        
        return items.join('');
    }

    attachEvents() {
        const menuToggle = document.getElementById('menuToggle');
        const sideMenu = document.getElementById('sideMenu');
        const menuOverlay = document.getElementById('menuOverlay');
        const closeMenu = document.getElementById('closeMenu');

        const openMenu = () => sideMenu.classList.add('open');
        const closeMenuFunc = () => sideMenu.classList.remove('open');
        
        if (menuToggle) menuToggle.addEventListener('click', openMenu);
        if (closeMenu) closeMenu.addEventListener('click', closeMenuFunc);
        if (menuOverlay) menuOverlay.addEventListener('click', closeMenuFunc);

        const logoutMenuItem = document.getElementById('logoutMenuItem');
        if (logoutMenuItem) logoutMenuItem.addEventListener('click', () => this.onNavigate('logout'));

        const btnFotoPerfil = document.getElementById('btnFotoPerfilProfissional');
        const inputFotoPerfil = document.getElementById('inputFotoPerfilProfissional');
        if (btnFotoPerfil && inputFotoPerfil) {
            btnFotoPerfil.addEventListener('click', () => inputFotoPerfil.click());
            inputFotoPerfil.addEventListener('change', (event) => this.atualizarFotoPerfil(event));
        }

        document.querySelectorAll('.menu-item[data-module]').forEach(item => {
            item.addEventListener('click', async (e) => {
                const module = item.getAttribute('data-module');
                closeMenuFunc();
                
                // Usa o navegador centralizado
                await this.navegador.navegarPara(module);
                
                // Callback para atualizar estado se necessário
                if (this.onNavigate) this.onNavigate(module);
            });
        });
    }

    async atualizarFotoPerfil(event) {
        const input = event.target;
        const file = input?.files?.[0];
        if (!file) return;

        try {
            const dataUrl = await this.lerArquivoComoDataUrl(file);
            const uploadResult = await uploadParaImgbb(dataUrl);
            if (!uploadResult?.success || !uploadResult.url) {
                throw new Error('Upload da foto falhou.');
            }

            const payload = {
                foto_perfil_url: uploadResult.url,
                foto_perfil_thumb: uploadResult.thumb?.url || uploadResult.thumb || '',
                foto_perfil_delete_url: uploadResult.delete_url || '',
                foto_perfil_atualizada_em: new Date().toISOString()
            };

            await updateDoc(doc(db, 'logins', this.userInfo.login), payload);
            await this.atualizarFotoPerfilCentral(uploadResult);

            Object.assign(this.userInfo, payload);
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            localStorage.setItem('currentUser', JSON.stringify({ ...currentUser, ...payload }));

            const btnFotoPerfil = document.getElementById('btnFotoPerfilProfissional');
            if (btnFotoPerfil) {
                btnFotoPerfil.innerHTML = `<img src="${uploadResult.url}" alt="Foto de ${this.userInfo.nome}" style="width: 100%; height: 100%; object-fit: cover;">`;
            }
            alert('Foto atualizada com sucesso.');
        } catch (error) {
            alert(error.message || 'Nao foi possivel atualizar a foto.');
        } finally {
            if (input) input.value = '';
        }
    }

    lerArquivoComoDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Nao foi possivel ler a imagem.'));
            reader.readAsDataURL(file);
        });
    }

    async atualizarFotoPerfilCentral(uploadResult) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const token = currentUser.authToken || currentUser.idToken || currentUser.token || '';
        if (!token) return;

        const apiBaseUrl = (
            window.TRATAMENTOWEB_API_BASE_URL ||
            localStorage.getItem('tratamentowebApiBaseUrl') ||
            'https://backend-tratamentoweb.onrender.com'
        ).replace(/\/$/, '');

        const response = await fetch(`${apiBaseUrl}/api/auth/me/profile-photo`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                url: uploadResult.url,
                thumb: uploadResult.thumb,
                delete_url: uploadResult.delete_url
            })
        });

        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.error?.message || 'Nao foi possivel atualizar a foto no login central.');
        }
    }
}
