import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { db, collection, getDocs, doc, getDoc } from '../0_firebase_api_config.js';

export class PalestrasVideosCliente {
    constructor(userInfo) { this.userInfo = userInfo; this.conteudos = []; this.palestras = []; this.profissionais = []; this.jitsiApi = null; this.navegador = criarNavegador(userInfo); }
    escape(v) { return String(v ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])); }
    async render() {
        document.getElementById('app').innerHTML = this.renderHTML();
        this.attachEvents();
        await this.carregar();
    }
    renderHTML() { return `<div class="home-container media-library-page"><header class="header"><img src="./imagens/logo.png" alt="TratamentoWeb" class="header-logo-img"><div class="user-info"><span>Olá, ${this.escape((this.userInfo.nome || '').split(' ')[0])}</span><button id="menuToggleBtn">☰</button></div></header><aside class="side-menu" id="sideMenu"><div class="menu-header"><h3>Menu</h3><button id="closeMenu">×</button></div><nav class="menu-nav"><button class="menu-item" data-module="home"><span>🏠</span><span>Home</span></button><button class="menu-item active" data-module="palestras_videos"><span>🎥</span><span>Palestras e Vídeos</span></button><button class="menu-item" data-module="logout"><span>🚪</span><span>Sair</span></button></nav></aside><div id="menuOverlay" class="menu-overlay"></div><main class="media-library-main"><header class="media-library-hero is-client"><div><span class="media-eyebrow">Conteúdo para você</span><h1>Palestras e vídeos</h1><p>Participe de encontros ao vivo e acesse materiais dos seus profissionais.</p></div></header><nav class="media-tabs"><button class="active" data-media-tab="palestras">◉ Palestras</button><button data-media-tab="videos">▶ Vídeos e materiais</button></nav><section id="painelPalestras" class="media-tab-panel"><div class="media-toolbar"><label><span>Buscar palestra</span><input id="buscaPalestra" type="search" placeholder="Título ou profissional"></label><label><span>Agenda</span><select id="filtroPalestra"><option value="">Todas</option><option value="proximas">Próximas</option><option value="aovivo">Ao vivo</option></select></label></div><section id="listaPalestras" class="lecture-list"><div class="media-empty"><div class="media-loader"></div><p>Carregando agenda...</p></div></section></section><section id="painelVideos" class="media-tab-panel" hidden><div class="media-toolbar"><label><span>Buscar</span><input id="buscaConteudo" type="search" placeholder="Título, profissional ou categoria"></label><label><span>Formato</span><select id="filtroTipo"><option value="">Todos</option><option value="video">Vídeos</option><option value="apresentacao">Apresentações</option></select></label></div><section id="listaConteudos" class="media-content-grid"><div class="media-empty"><div class="media-loader"></div><p>Carregando conteúdos...</p></div></section></section></main><div id="modalSalaJitsi" class="media-modal lecture-room-modal" hidden><div class="lecture-room-dialog"><header><div><span class="media-eyebrow">Palestra</span><h2 id="tituloSalaJitsi">Sala ao vivo</h2></div><button id="btnFecharSala">×</button></header><div id="jitsiContainer"></div></div></div></div>`; }
    attachEvents() {
        const menu = document.getElementById('sideMenu'), overlay = document.getElementById('menuOverlay');
        const fechar = () => { menu.classList.remove('open'); overlay.classList.remove('open'); };
        document.getElementById('menuToggleBtn').onclick = () => { menu.classList.add('open'); overlay.classList.add('open'); };
        document.getElementById('closeMenu').onclick = fechar; overlay.onclick = fechar;
        document.querySelectorAll('[data-module]').forEach(b => b.onclick = () => this.navegador.navegarPara(b.dataset.module));
        document.querySelectorAll('[data-media-tab]').forEach(button => button.onclick = () => { document.querySelectorAll('[data-media-tab]').forEach(i => i.classList.toggle('active',i===button)); document.getElementById('painelPalestras').hidden=button.dataset.mediaTab!=='palestras'; document.getElementById('painelVideos').hidden=button.dataset.mediaTab!=='videos'; });
        document.getElementById('buscaConteudo').oninput = () => this.atualizarLista();
        document.getElementById('filtroTipo').onchange = () => this.atualizarLista();
        document.getElementById('buscaPalestra').oninput = () => this.atualizarPalestras();
        document.getElementById('filtroPalestra').onchange = () => this.atualizarPalestras();
        document.getElementById('btnFecharSala').onclick = () => this.fecharSala();
    }
    async carregar() {
        try {
            const usuario = await getDoc(doc(db, 'logins', this.userInfo.login));
            this.profissionais = Object.keys(usuario.data()?.profissionais_vinculados || {});
            const snapshot = await getDocs(collection(db, 'palestras_videos'));
            this.conteudos = snapshot.docs.map(d => ({ id:d.id, ...d.data() })).filter(c => c.visibilidade === 'global' || (c.visibilidade === 'privado' && this.profissionais.includes(c.profissional_login)) || (c.visibilidade === 'exclusivo' && this.profissionais.includes(c.profissional_login) && (c.pacientes_exclusivos || []).includes(this.userInfo.login))).sort((a,b) => (b.criado_em?.seconds || 0) - (a.criado_em?.seconds || 0));
            const palestrasSnapshot = await getDocs(collection(db, 'palestras_ao_vivo'));
            this.palestras = palestrasSnapshot.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b) => new Date(a.inicio_em) - new Date(b.inicio_em));
            this.atualizarLista();
            this.atualizarPalestras();
        } catch (error) { document.getElementById('listaConteudos').innerHTML = `<div class="media-empty"><span>⚠</span><h3>Não foi possível carregar</h3><p>${this.escape(error.message)}</p></div>`; }
    }
    statusPalestra(p) { const inicio=new Date(p.inicio_em).getTime(),fim=inicio+Number(p.duracao_minutos||60)*60000,agora=Date.now();if(agora<inicio-15*60000)return{chave:'agendada',label:'Agendada'};if(agora<=fim)return{chave:'ao-vivo',label:'Ao vivo'};return{chave:'encerrada',label:'Encerrada'}; }
    atualizarPalestras() {
        const busca=document.getElementById('buscaPalestra').value.toLowerCase(),filtro=document.getElementById('filtroPalestra').value;
        const itens=this.palestras.filter(p=>`${p.titulo} ${p.descricao} ${p.profissional_nome}`.toLowerCase().includes(busca)&&(!filtro||(filtro==='proximas'&&this.statusPalestra(p).chave==='agendada')||(filtro==='aovivo'&&this.statusPalestra(p).chave==='ao-vivo')));
        document.getElementById('listaPalestras').innerHTML=itens.length?itens.map(p=>this.renderPalestra(p)).join(''):'<div class="media-empty"><span>◉</span><h3>Nenhuma palestra disponível</h3><p>Os próximos encontros aparecerão aqui.</p></div>';
        document.querySelectorAll('[data-entrar-palestra]').forEach(b=>b.onclick=()=>this.entrarNaSala(this.palestras.find(p=>p.id===b.dataset.entrarPalestra)));
    }
    renderPalestra(p) { const s=this.statusPalestra(p),i=new Date(p.inicio_em),data=i.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}),hora=i.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});return `<article class="lecture-card"><div class="lecture-date"><strong>${i.getDate().toString().padStart(2,'0')}</strong><span>${i.toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}</span></div><div class="lecture-info"><div class="lecture-meta"><span class="lecture-status is-${s.chave}">${s.label}</span></div><h3>${this.escape(p.titulo)}</h3><p>${this.escape(p.descricao||'Sem descrição.')}</p><div class="lecture-details"><span>◷ ${data}, ${hora}</span><span>⌛ ${p.duracao_minutos||60} min</span><span>Por ${this.escape(p.profissional_nome)}</span></div></div><div class="lecture-actions">${s.chave!=='encerrada'?`<button class="media-primary-btn" data-entrar-palestra="${p.id}">${s.chave==='agendada'?'Entrar na sala':'Participar agora'}</button>`:''}</div></article>`; }
    async carregarJitsi(){if(window.JitsiMeetExternalAPI)return;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://meet.jit.si/external_api.js';s.onload=resolve;s.onerror=()=>reject(new Error('Não foi possível carregar o Jitsi Meet.'));document.head.appendChild(s);});}
    async entrarNaSala(p){try{await this.carregarJitsi();document.getElementById('tituloSalaJitsi').textContent=p.titulo;document.getElementById('modalSalaJitsi').hidden=false;const c=document.getElementById('jitsiContainer');c.innerHTML='';this.jitsiApi?.dispose();this.jitsiApi=new window.JitsiMeetExternalAPI('meet.jit.si',{roomName:p.sala_jitsi,parentNode:c,width:'100%',height:'100%',lang:'pt',userInfo:{displayName:this.userInfo.nome||this.userInfo.login},configOverwrite:{prejoinConfig:{enabled:true},startWithAudioMuted:true,disableDeepLinking:true}});}catch(error){alert(error.message);}}
    fecharSala(){this.jitsiApi?.dispose();this.jitsiApi=null;document.getElementById('jitsiContainer').innerHTML='';document.getElementById('modalSalaJitsi').hidden=true;}
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
