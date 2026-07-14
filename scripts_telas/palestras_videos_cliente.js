import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { db, collection, getDocs, doc, getDoc } from '../0_firebase_api_config.js';

export class PalestrasVideosCliente {
    constructor(userInfo) { this.userInfo = userInfo; this.conteudos = []; this.profissionais = []; this.navegador = criarNavegador(userInfo); }
    escape(v) { return String(v ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])); }
    async render() {
        document.getElementById('app').innerHTML = this.renderHTML();
        this.attachEvents();
        await this.carregar();
    }
    renderHTML() { return `<div class="home-container media-library-page"><header class="header"><img src="./imagens/logo.png" alt="TratamentoWeb" class="header-logo-img"><div class="user-info"><span>Olá, ${this.escape((this.userInfo.nome || '').split(' ')[0])}</span><button id="menuToggleBtn">☰</button></div></header><aside class="side-menu" id="sideMenu"><div class="menu-header"><h3>Menu</h3><button id="closeMenu">×</button></div><nav class="menu-nav"><button class="menu-item" data-module="home"><span>🏠</span><span>Home</span></button><button class="menu-item active" data-module="palestras_videos"><span>🎥</span><span>Palestras e Vídeos</span></button><button class="menu-item" data-module="logout"><span>🚪</span><span>Sair</span></button></nav></aside><div id="menuOverlay" class="menu-overlay"></div><main class="media-library-main"><header class="media-library-hero is-client"><div><span class="media-eyebrow">Conteúdo para você</span><h1>Palestras e vídeos</h1><p>Materiais publicados pelos seus profissionais e pela organização.</p></div></header><div class="media-toolbar"><label><span>Buscar</span><input id="buscaConteudo" type="search" placeholder="Título, profissional ou categoria"></label><label><span>Formato</span><select id="filtroTipo"><option value="">Todos</option><option value="video">Vídeos</option><option value="apresentacao">Apresentações</option></select></label></div><section id="listaConteudos" class="media-content-grid"><div class="media-empty"><div class="media-loader"></div><p>Carregando conteúdos...</p></div></section></main></div>`; }
    attachEvents() {
        const menu = document.getElementById('sideMenu'), overlay = document.getElementById('menuOverlay');
        const fechar = () => { menu.classList.remove('open'); overlay.classList.remove('open'); };
        document.getElementById('menuToggleBtn').onclick = () => { menu.classList.add('open'); overlay.classList.add('open'); };
        document.getElementById('closeMenu').onclick = fechar; overlay.onclick = fechar;
        document.querySelectorAll('[data-module]').forEach(b => b.onclick = () => this.navegador.navegarPara(b.dataset.module));
        document.getElementById('buscaConteudo').oninput = () => this.atualizarLista();
        document.getElementById('filtroTipo').onchange = () => this.atualizarLista();
    }
    async carregar() {
        try {
            const usuario = await getDoc(doc(db, 'logins', this.userInfo.login));
            this.profissionais = Object.keys(usuario.data()?.profissionais_vinculados || {});
            const snapshot = await getDocs(collection(db, 'palestras_videos'));
            this.conteudos = snapshot.docs.map(d => ({ id:d.id, ...d.data() })).filter(c => c.visibilidade === 'global' || (c.visibilidade === 'privado' && this.profissionais.includes(c.profissional_login)) || (c.visibilidade === 'exclusivo' && this.profissionais.includes(c.profissional_login) && (c.pacientes_exclusivos || []).includes(this.userInfo.login))).sort((a,b) => (b.criado_em?.seconds || 0) - (a.criado_em?.seconds || 0));
            this.atualizarLista();
        } catch (error) { document.getElementById('listaConteudos').innerHTML = `<div class="media-empty"><span>⚠</span><h3>Não foi possível carregar</h3><p>${this.escape(error.message)}</p></div>`; }
    }
    atualizarLista() {
        const busca = document.getElementById('buscaConteudo').value.toLowerCase(), tipo = document.getElementById('filtroTipo').value;
        const itens = this.conteudos.filter(c => (!tipo || c.tipo === tipo) && `${c.titulo} ${c.descricao} ${c.categoria} ${c.profissional_nome}`.toLowerCase().includes(busca));
        document.getElementById('listaConteudos').innerHTML = itens.length ? itens.map(c => this.renderCard(c)).join('') : '<div class="media-empty"><span>▣</span><h3>Nenhum conteúdo disponível</h3><p>Novas publicações dos seus profissionais aparecerão aqui.</p></div>';
    }
    renderCard(c) {
        const preview = c.tipo === 'video' ? `<video controls preload="metadata" src="${this.escape(c.arquivo_url)}"></video>` : `<div class="media-document-preview"><span>▤</span><strong>${this.escape((c.formato || 'arquivo').toUpperCase())}</strong></div>`;
        const alcance = c.visibilidade === 'global' ? 'Organização' : c.visibilidade === 'exclusivo' ? 'Exclusivo para você' : 'Seus pacientes';
        return `<article class="media-card">${preview}<div class="media-card-body"><div class="media-card-meta"><span class="media-badge is-${c.visibilidade}">${alcance}</span><span>${this.escape(c.categoria || 'Conteúdo')}</span></div><h3>${this.escape(c.titulo)}</h3><p>${this.escape(c.descricao || 'Sem descrição.')}</p><div class="media-professional"><span>${this.escape((c.profissional_nome || 'P').charAt(0))}</span><div><strong>${this.escape(c.profissional_nome || 'Profissional')}</strong><small>${c.profissional_cargo === 'psicologo' ? 'Psicólogo(a)' : 'Nutricionista'}</small></div></div>${c.tipo !== 'video' ? `<a class="media-open-btn" href="${this.escape(c.arquivo_url)}" target="_blank" rel="noopener">Abrir apresentação ↗</a>` : ''}</div></article>`;
    }
}
