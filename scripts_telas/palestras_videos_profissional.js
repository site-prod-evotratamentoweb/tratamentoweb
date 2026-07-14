import { FuncoesCompartilhadas } from './0_home.js';
import { MenuProfissional } from './0_complementos_menu_profissional.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { db, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, serverTimestamp, uploadParaCloudinary, excluirDoCloudinary } from '../0_firebase_api_config.js';

export class PalestrasVideosProfissional {
    constructor(userInfo, pacientesList = []) {
        this.userInfo = userInfo;
        this.pacientesList = pacientesList;
        this.conteudos = [];
        this.palestras = [];
        this.editando = null;
        this.palestraEditando = null;
        this.jitsiApi = null;
        this.menu = null;
        this.navegador = criarNavegador(userInfo, pacientesList);
    }

    escape(valor) { return String(valor ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])); }
    formatarData(valor) {
        const data = valor?.toDate ? valor.toDate() : new Date(valor || 0);
        return Number.isNaN(data.getTime()) ? '' : data.toLocaleDateString('pt-BR');
    }

    async render() {
        document.getElementById('app').innerHTML = this.renderHTML();
        this.menu = new MenuProfissional(this.userInfo, modulo => this.navegador.navegarPara(modulo), 'palestras_videos');
        document.getElementById('menuContainer').innerHTML = this.menu.render();
        this.menu.attachEvents();
        this.attachEvents();
        if (!this.pacientesList.length) this.pacientesList = await FuncoesCompartilhadas.loadPacientesList(this.userInfo.login);
        this.navegador.pacientesList = this.pacientesList;
        await Promise.all([this.carregarConteudos(), this.carregarPalestras()]);
    }

    renderHTML() {
        return `<div class="dashboard-container media-library-page"><div id="menuContainer"></div><main class="main-content media-library-main">
            <header class="media-library-hero"><div><span class="media-eyebrow">Conteúdo e encontros</span><h1>Palestras e vídeos</h1><p>Organize encontros ao vivo e publique materiais para sua audiência.</p></div><button id="btnNovaPalestra" class="media-primary-btn">＋ Criar palestra</button></header>
            <nav class="media-tabs" aria-label="Seções"><button class="active" data-media-tab="palestras">◉ Palestras</button><button data-media-tab="videos">▶ Vídeos e materiais</button></nav>
            <section id="painelPalestras" class="media-tab-panel"><div class="media-toolbar"><label><span>Buscar palestra</span><input id="buscaPalestra" type="search" placeholder="Título, profissional ou descrição"></label><label><span>Exibir</span><select id="filtroPalestra"><option value="">Todas</option><option value="minhas">Criadas por mim</option><option value="agendadas">Agendadas</option><option value="imediatas">Reuniões imediatas</option></select></label></div><section id="listaPalestras" class="lecture-list"><div class="media-empty"><div class="media-loader"></div><p>Carregando palestras...</p></div></section></section>
            <section id="painelVideos" class="media-tab-panel" hidden><section class="media-stats"><div><strong id="totalConteudos">0</strong><span>Publicações</span></div><div><strong id="totalGlobais">0</strong><span>Globais</span></div><div><strong id="totalRestritos">0</strong><span>Restritas</span></div></section><div class="media-section-action"><button id="btnNovoConteudo" class="media-primary-btn">＋ Novo vídeo ou material</button></div><div class="media-toolbar"><label><span>Buscar conteúdo</span><input id="buscaConteudo" type="search" placeholder="Título, descrição ou categoria"></label><label><span>Visibilidade</span><select id="filtroVisibilidade"><option value="">Todas</option><option value="global">Global</option><option value="privado">Privado</option><option value="exclusivo">Exclusivo</option></select></label></div><section id="listaConteudos" class="media-content-grid"><div class="media-empty"><div class="media-loader"></div><p>Carregando biblioteca...</p></div></section></section>
        </main><div id="modalConteudo" class="media-modal" hidden>${this.renderFormulario()}</div><div id="modalPalestra" class="media-modal" hidden>${this.renderFormularioPalestra()}</div><div id="modalSalaJitsi" class="media-modal lecture-room-modal" hidden><div class="lecture-room-dialog"><header><div><span class="media-eyebrow">Sala de palestra</span><h2 id="tituloSalaJitsi">Palestra ao vivo</h2></div><button id="btnFecharSala" aria-label="Sair da sala">×</button></header><div id="jitsiContainer"></div></div></div></div>`;
    }

    renderFormularioPalestra() {
        return `<div class="media-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="tituloModalPalestra"><header><div><span class="media-eyebrow">Sala virtual</span><h2 id="tituloModalPalestra">Criar palestra</h2></div><button id="btnFecharPalestra" type="button">×</button></header><form id="formPalestra"><div class="media-form-grid"><label class="media-field media-span-2"><span>Título *</span><input id="palestraTitulo" required maxlength="120" placeholder="Ex.: Conversa aberta sobre saúde e bem-estar"></label><label class="media-field media-span-2"><span>Descrição</span><textarea id="palestraDescricao" rows="3" maxlength="800"></textarea></label><fieldset class="lecture-start-options media-span-2"><legend>Quando começa?</legend><label><input type="radio" name="tipoInicio" value="imediato" checked><span><strong>Início imediato</strong><small>Criar a reunião e entrar agora</small></span></label><label><input type="radio" name="tipoInicio" value="agendado"><span><strong>Horário marcado</strong><small>Publicar na agenda dos participantes</small></span></label></fieldset><label id="campoDataPalestra" class="media-field" hidden><span>Data e horário *</span><input id="palestraData" type="datetime-local"></label><label class="media-field"><span>Duração prevista</span><select id="palestraDuracao"><option value="30">30 minutos</option><option value="60" selected>1 hora</option><option value="90">1h30</option><option value="120">2 horas</option></select></label><fieldset class="media-visibility media-span-2"><legend>Quem poderá participar?</legend><label><input type="radio" name="visibilidadePalestra" value="global" checked><span><strong>Global</strong><small>Todos da organização</small></span></label><label><input type="radio" name="visibilidadePalestra" value="privado"><span><strong>Privado</strong><small>Seus pacientes vinculados</small></span></label><label><input type="radio" name="visibilidadePalestra" value="exclusivo"><span><strong>Exclusivo</strong><small>Pacientes selecionados</small></span></label></fieldset><div id="selecaoPacientesPalestra" class="media-patient-picker media-span-2" hidden><div><strong>Participantes convidados</strong><button id="selecionarTodosPalestra" type="button">Selecionar todos</button></div><div id="listaPacientesPalestra"></div></div></div><footer><button id="btnCancelarPalestra" type="button" class="media-secondary-btn">Cancelar</button><button id="btnSalvarPalestra" class="media-primary-btn">Criar palestra</button></footer></form></div>`;
    }

    renderFormulario() {
        return `<div class="media-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="tituloModalConteudo"><header><div><span class="media-eyebrow">Publicação</span><h2 id="tituloModalConteudo">Novo conteúdo</h2></div><button id="btnFecharConteudo" type="button" aria-label="Fechar">×</button></header><form id="formConteudo"><div class="media-form-grid">
            <label class="media-field media-span-2"><span>Título *</span><input id="conteudoTitulo" maxlength="120" required placeholder="Ex.: Alimentação consciente na rotina"></label>
            <label class="media-field"><span>Categoria</span><input id="conteudoCategoria" maxlength="60" placeholder="Nutrição, saúde mental..."></label>
            <label class="media-field"><span>Tipo de material *</span><select id="conteudoTipo" required><option value="video">Vídeo</option><option value="apresentacao">Apresentação / documento</option></select></label>
            <label class="media-field media-span-2"><span>Descrição</span><textarea id="conteudoDescricao" maxlength="1000" rows="4" placeholder="Explique brevemente o que será abordado."></textarea></label>
            <label class="media-field media-span-2"><span>Arquivo ${this.editando ? '(selecione somente para substituir)' : '*'} </span><input id="conteudoArquivo" type="file" accept="video/*,.pdf,.ppt,.pptx,.odp" ${this.editando ? '' : 'required'}><small>Vídeos, PDF ou apresentações. O limite depende do seu plano Cloudinary.</small></label>
            <fieldset class="media-visibility media-span-2"><legend>Quem poderá visualizar?</legend><label><input type="radio" name="visibilidade" value="global" checked><span><strong>Global</strong><small>Todos os clientes da organização</small></span></label><label><input type="radio" name="visibilidade" value="privado"><span><strong>Privado</strong><small>Todos os seus pacientes vinculados</small></span></label><label><input type="radio" name="visibilidade" value="exclusivo"><span><strong>Exclusivo</strong><small>Somente pacientes selecionados</small></span></label></fieldset>
            <div id="selecaoPacientes" class="media-patient-picker media-span-2" hidden><div><strong>Selecione os pacientes</strong><button id="selecionarTodosPacientes" type="button">Selecionar todos</button></div><div id="listaPacientesConteudo"></div></div>
        </div><div id="uploadProgress" class="media-upload-progress" hidden><div><span id="uploadStatus">Enviando arquivo...</span><strong id="uploadPercent">0%</strong></div><progress max="100" value="0"></progress></div><footer><button id="btnCancelarConteudo" type="button" class="media-secondary-btn">Cancelar</button><button id="btnSalvarConteudo" class="media-primary-btn" type="submit">Publicar conteúdo</button></footer></form></div>`;
    }

    async carregarConteudos() {
        try {
            const snapshot = await getDocs(query(collection(db, 'palestras_videos'), where('profissional_login', '==', this.userInfo.login)));
            this.conteudos = snapshot.docs.map(item => ({ id:item.id, ...item.data() })).sort((a,b) => (b.criado_em?.seconds || 0) - (a.criado_em?.seconds || 0));
            this.atualizarLista();
        } catch (error) {
            document.getElementById('listaConteudos').innerHTML = `<div class="media-empty"><span>⚠</span><h3>Não foi possível carregar</h3><p>${this.escape(error.message)}</p></div>`;
        }
    }

    async carregarPalestras() {
        try {
            const snapshot = await getDocs(collection(db, 'palestras_ao_vivo'));
            this.palestras = snapshot.docs.map(item => ({ id:item.id, ...item.data() })).sort((a,b) => new Date(a.inicio_em) - new Date(b.inicio_em));
            this.atualizarPalestras();
        } catch (error) {
            document.getElementById('listaPalestras').innerHTML = `<div class="media-empty"><span>⚠</span><h3>Não foi possível carregar as palestras</h3><p>${this.escape(error.message)}</p></div>`;
        }
    }

    statusPalestra(palestra) {
        const inicio = new Date(palestra.inicio_em).getTime();
        const fim = inicio + Number(palestra.duracao_minutos || 60) * 60000;
        const agora = Date.now();
        if (agora < inicio - 15 * 60000) return { chave:'agendada', label:'Agendada' };
        if (agora <= fim) return { chave:'ao-vivo', label:'Ao vivo' };
        return { chave:'encerrada', label:'Encerrada' };
    }

    atualizarPalestras() {
        const busca = document.getElementById('buscaPalestra')?.value.toLowerCase() || '';
        const filtro = document.getElementById('filtroPalestra')?.value || '';
        const itens = this.palestras.filter(p => `${p.titulo} ${p.descricao} ${p.profissional_nome}`.toLowerCase().includes(busca) && (!filtro || (filtro === 'minhas' && p.profissional_login === this.userInfo.login) || (filtro === 'agendadas' && p.tipo_inicio === 'agendado') || (filtro === 'imediatas' && p.tipo_inicio === 'imediato')));
        document.getElementById('listaPalestras').innerHTML = itens.length ? itens.map(p => this.renderPalestra(p)).join('') : '<div class="media-empty"><span>◉</span><h3>Nenhuma palestra encontrada</h3><p>Crie uma sala ou altere os filtros.</p></div>';
        document.querySelectorAll('[data-entrar-palestra]').forEach(b => b.onclick = () => this.entrarNaSala(this.palestras.find(p => p.id === b.dataset.entrarPalestra)));
        document.querySelectorAll('[data-editar-palestra]').forEach(b => b.onclick = () => this.abrirModalPalestra(this.palestras.find(p => p.id === b.dataset.editarPalestra)));
        document.querySelectorAll('[data-excluir-palestra]').forEach(b => b.onclick = () => this.excluirPalestra(b.dataset.excluirPalestra));
    }

    renderPalestra(p) {
        const status = this.statusPalestra(p);
        const inicio = new Date(p.inicio_em);
        const data = inicio.toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
        const hora = inicio.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
        const propria = p.profissional_login === this.userInfo.login;
        const alcance = { global:'Global', privado:'Pacientes vinculados', exclusivo:'Exclusivo' }[p.visibilidade];
        return `<article class="lecture-card"><div class="lecture-date"><strong>${inicio.getDate().toString().padStart(2,'0')}</strong><span>${inicio.toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}</span></div><div class="lecture-info"><div class="lecture-meta"><span class="lecture-status is-${status.chave}">${status.label}</span><span class="media-badge is-${p.visibilidade}">${alcance}</span>${p.tipo_inicio === 'imediato' ? '<span>Reunião imediata</span>' : ''}</div><h3>${this.escape(p.titulo)}</h3><p>${this.escape(p.descricao || 'Sem descrição.')}</p><div class="lecture-details"><span>◷ ${data}, ${hora}</span><span>⌛ ${p.duracao_minutos || 60} min</span><span>Por ${this.escape(p.profissional_nome)}</span></div></div><div class="lecture-actions">${status.chave !== 'encerrada' ? `<button class="media-primary-btn" data-entrar-palestra="${p.id}">${propria ? 'Abrir sala' : 'Participar'}</button>` : ''}${propria ? `<button data-editar-palestra="${p.id}" class="media-secondary-btn">Editar</button><button data-excluir-palestra="${p.id}" class="lecture-delete-btn">Excluir</button>` : ''}</div></article>`;
    }

    abrirModalPalestra(palestra = null) {
        this.palestraEditando = palestra;
        document.getElementById('tituloModalPalestra').textContent = palestra ? 'Editar palestra' : 'Criar palestra';
        document.getElementById('palestraTitulo').value = palestra?.titulo || '';
        document.getElementById('palestraDescricao').value = palestra?.descricao || '';
        document.getElementById('palestraDuracao').value = palestra?.duracao_minutos || '60';
        const tipo = palestra?.tipo_inicio || 'imediato';
        document.querySelector(`[name="tipoInicio"][value="${tipo}"]`).checked = true;
        document.getElementById('palestraData').value = palestra?.inicio_em && tipo === 'agendado' ? palestra.inicio_em.slice(0,16) : '';
        const visibilidade = palestra?.visibilidade || 'global';
        document.querySelector(`[name="visibilidadePalestra"][value="${visibilidade}"]`).checked = true;
        document.getElementById('listaPacientesPalestra').innerHTML = this.pacientesList.map(p => `<label><input type="checkbox" name="pacientesPalestra" value="${this.escape(p.login)}" ${(palestra?.pacientes_exclusivos || []).includes(p.login) ? 'checked' : ''}><span><strong>${this.escape(p.nome)}</strong><small>${this.escape(p.login)}</small></span></label>`).join('') || '<p>Nenhum paciente vinculado.</p>';
        this.alternarCamposPalestra();
        document.getElementById('modalPalestra').hidden = false;
    }

    fecharModalPalestra() { document.getElementById('modalPalestra').hidden = true; this.palestraEditando = null; document.getElementById('formPalestra').reset(); }
    alternarCamposPalestra() {
        const agendada = document.querySelector('[name="tipoInicio"]:checked')?.value === 'agendado';
        document.getElementById('campoDataPalestra').hidden = !agendada;
        document.getElementById('palestraData').required = agendada;
        document.getElementById('selecaoPacientesPalestra').hidden = document.querySelector('[name="visibilidadePalestra"]:checked')?.value !== 'exclusivo';
    }

    gerarNomeSala() {
        const org = String(this.userInfo.organizacao || 'org').replace(/[^a-z0-9]/gi,'');
        return `TratamentoWeb${org}${this.userInfo.login.replace(/[^a-z0-9]/gi,'')}${Date.now()}${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
    }

    async salvarPalestra() {
        const tipo = document.querySelector('[name="tipoInicio"]:checked').value;
        const visibilidade = document.querySelector('[name="visibilidadePalestra"]:checked').value;
        const pacientes = [...document.querySelectorAll('[name="pacientesPalestra"]:checked')].map(i => i.value);
        if (visibilidade === 'exclusivo' && !pacientes.length) return alert('Selecione ao menos um paciente.');
        const inicio = tipo === 'imediato' ? new Date() : new Date(document.getElementById('palestraData').value);
        if (tipo === 'agendado' && (!inicio.getTime() || inicio.getTime() <= Date.now())) return alert('Escolha uma data e horário futuros.');
        const dados = { titulo:document.getElementById('palestraTitulo').value.trim(), descricao:document.getElementById('palestraDescricao').value.trim(), tipo_inicio:tipo, inicio_em:inicio.toISOString(), duracao_minutos:Number(document.getElementById('palestraDuracao').value), visibilidade, pacientes_exclusivos:visibilidade === 'exclusivo' ? pacientes : [], profissional_login:this.userInfo.login, profissional_nome:this.userInfo.nome || this.userInfo.login, profissional_cargo:this.userInfo.cargo, sala_jitsi:this.palestraEditando?.sala_jitsi || this.gerarNomeSala(), atualizado_em:serverTimestamp() };
        const botao = document.getElementById('btnSalvarPalestra'); botao.disabled = true;
        try {
            if (this.palestraEditando) await updateDoc(doc(db,'palestras_ao_vivo',this.palestraEditando.id),dados);
            else await addDoc(collection(db,'palestras_ao_vivo'),{...dados,criado_em:serverTimestamp()});
            this.fecharModalPalestra(); await this.carregarPalestras();
            if (tipo === 'imediato') this.entrarNaSala({ ...dados, id:this.palestraEditando?.id });
        } catch (error) { alert(`Não foi possível salvar a palestra: ${error.message}`); }
        finally { botao.disabled = false; }
    }

    async excluirPalestra(id) { const p=this.palestras.find(i=>i.id===id); if(!p||!confirm(`Excluir “${p.titulo}”?`))return; try{await deleteDoc(doc(db,'palestras_ao_vivo',id));await this.carregarPalestras();}catch(error){alert(`Não foi possível excluir: ${error.message}`);} }

    async carregarJitsi() {
        if (window.JitsiMeetExternalAPI) return;
        await new Promise((resolve,reject) => { const s=document.createElement('script');s.src='https://meet.jit.si/external_api.js';s.onload=resolve;s.onerror=()=>reject(new Error('Não foi possível carregar o Jitsi Meet.'));document.head.appendChild(s); });
    }

    async entrarNaSala(palestra) {
        if (!palestra) return;
        try {
            await this.carregarJitsi();
            document.getElementById('tituloSalaJitsi').textContent = palestra.titulo;
            document.getElementById('modalSalaJitsi').hidden = false;
            const container=document.getElementById('jitsiContainer'); container.innerHTML='';
            this.jitsiApi?.dispose();
            this.jitsiApi = new window.JitsiMeetExternalAPI('meet.jit.si',{ roomName:palestra.sala_jitsi, parentNode:container, width:'100%', height:'100%', lang:'pt', userInfo:{ displayName:this.userInfo.nome || this.userInfo.login }, configOverwrite:{ prejoinConfig:{enabled:true}, startWithAudioMuted:true, disableDeepLinking:true } });
        } catch(error) { alert(error.message); }
    }

    fecharSala() { this.jitsiApi?.dispose(); this.jitsiApi=null; document.getElementById('jitsiContainer').innerHTML=''; document.getElementById('modalSalaJitsi').hidden=true; }

    atualizarLista() {
        const busca = document.getElementById('buscaConteudo')?.value.toLowerCase() || '';
        const filtro = document.getElementById('filtroVisibilidade')?.value || '';
        const itens = this.conteudos.filter(c => (!filtro || c.visibilidade === filtro) && `${c.titulo} ${c.descricao} ${c.categoria}`.toLowerCase().includes(busca));
        document.getElementById('totalConteudos').textContent = this.conteudos.length;
        document.getElementById('totalGlobais').textContent = this.conteudos.filter(c => c.visibilidade === 'global').length;
        document.getElementById('totalRestritos').textContent = this.conteudos.filter(c => c.visibilidade !== 'global').length;
        document.getElementById('listaConteudos').innerHTML = itens.length ? itens.map(c => this.renderCard(c)).join('') : '<div class="media-empty"><span>▣</span><h3>Nenhum conteúdo encontrado</h3><p>Publique seu primeiro material ou altere os filtros.</p></div>';
        document.querySelectorAll('[data-editar-conteudo]').forEach(b => b.onclick = () => this.abrirModal(this.conteudos.find(c => c.id === b.dataset.editarConteudo)));
        document.querySelectorAll('[data-excluir-conteudo]').forEach(b => b.onclick = () => this.excluirConteudo(b.dataset.excluirConteudo));
    }

    renderCard(c) {
        const label = { global:'Global', privado:'Pacientes vinculados', exclusivo:'Exclusivo' }[c.visibilidade] || 'Privado';
        const preview = c.tipo === 'video' ? `<video controls preload="metadata" src="${this.escape(c.arquivo_url)}"></video>` : `<div class="media-document-preview"><span>▤</span><strong>${this.escape((c.formato || 'arquivo').toUpperCase())}</strong></div>`;
        return `<article class="media-card">${preview}<div class="media-card-body"><div class="media-card-meta"><span class="media-badge is-${this.escape(c.visibilidade)}">${label}</span><span>${this.escape(c.categoria || 'Sem categoria')}</span></div><h3>${this.escape(c.titulo)}</h3><p>${this.escape(c.descricao || 'Sem descrição.')}</p><div class="media-card-footer"><small>${this.formatarData(c.criado_em)}</small><div><a href="${this.escape(c.arquivo_url)}" target="_blank" rel="noopener" title="Abrir">↗</a><button data-editar-conteudo="${c.id}" title="Editar">✎</button><button data-excluir-conteudo="${c.id}" title="Excluir" class="is-danger">⌫</button></div></div></div></article>`;
    }

    attachEvents() {
        document.querySelectorAll('[data-media-tab]').forEach(button => button.onclick = () => {
            document.querySelectorAll('[data-media-tab]').forEach(item => item.classList.toggle('active', item === button));
            document.getElementById('painelPalestras').hidden = button.dataset.mediaTab !== 'palestras';
            document.getElementById('painelVideos').hidden = button.dataset.mediaTab !== 'videos';
            document.getElementById('btnNovaPalestra').hidden = button.dataset.mediaTab !== 'palestras';
        });
        document.getElementById('btnNovaPalestra').onclick = () => this.abrirModalPalestra();
        document.getElementById('btnFecharPalestra').onclick = () => this.fecharModalPalestra();
        document.getElementById('btnCancelarPalestra').onclick = () => this.fecharModalPalestra();
        document.getElementById('modalPalestra').onclick = e => { if (e.target.id === 'modalPalestra') this.fecharModalPalestra(); };
        document.getElementById('formPalestra').onsubmit = e => { e.preventDefault(); this.salvarPalestra(); };
        document.querySelectorAll('[name="tipoInicio"],[name="visibilidadePalestra"]').forEach(r => r.onchange = () => this.alternarCamposPalestra());
        document.getElementById('selecionarTodosPalestra').onclick = () => document.querySelectorAll('[name="pacientesPalestra"]').forEach(c => { c.checked=true; });
        document.getElementById('buscaPalestra').oninput = () => this.atualizarPalestras();
        document.getElementById('filtroPalestra').onchange = () => this.atualizarPalestras();
        document.getElementById('btnFecharSala').onclick = () => this.fecharSala();
        document.getElementById('btnNovoConteudo').onclick = () => this.abrirModal();
        document.getElementById('btnFecharConteudo').onclick = () => this.fecharModal();
        document.getElementById('btnCancelarConteudo').onclick = () => this.fecharModal();
        document.getElementById('modalConteudo').onclick = e => { if (e.target.id === 'modalConteudo') this.fecharModal(); };
        document.getElementById('buscaConteudo').oninput = () => this.atualizarLista();
        document.getElementById('filtroVisibilidade').onchange = () => this.atualizarLista();
        document.querySelectorAll('[name="visibilidade"]').forEach(r => r.onchange = () => this.alternarPacientes());
        document.getElementById('selecionarTodosPacientes').onclick = () => document.querySelectorAll('[name="pacientesConteudo"]').forEach(c => { c.checked = true; });
        document.getElementById('formConteudo').onsubmit = e => { e.preventDefault(); this.salvarConteudo(); };
    }

    abrirModal(conteudo = null) {
        this.editando = conteudo;
        const modal = document.getElementById('modalConteudo');
        document.getElementById('tituloModalConteudo').textContent = conteudo ? 'Editar conteúdo' : 'Novo conteúdo';
        document.getElementById('conteudoTitulo').value = conteudo?.titulo || '';
        document.getElementById('conteudoCategoria').value = conteudo?.categoria || '';
        document.getElementById('conteudoTipo').value = conteudo?.tipo || 'video';
        document.getElementById('conteudoDescricao').value = conteudo?.descricao || '';
        document.getElementById('conteudoArquivo').required = !conteudo;
        const visibilidade = conteudo?.visibilidade || 'global';
        document.querySelector(`[name="visibilidade"][value="${visibilidade}"]`).checked = true;
        document.getElementById('listaPacientesConteudo').innerHTML = this.pacientesList.map(p => `<label><input type="checkbox" name="pacientesConteudo" value="${this.escape(p.login)}" ${(conteudo?.pacientes_exclusivos || []).includes(p.login) ? 'checked' : ''}><span><strong>${this.escape(p.nome)}</strong><small>${this.escape(p.login)}</small></span></label>`).join('') || '<p>Nenhum paciente vinculado.</p>';
        this.alternarPacientes();
        modal.hidden = false;
    }
    fecharModal() { document.getElementById('modalConteudo').hidden = true; this.editando = null; document.getElementById('formConteudo').reset(); }
    alternarPacientes() { document.getElementById('selecaoPacientes').hidden = document.querySelector('[name="visibilidade"]:checked')?.value !== 'exclusivo'; }

    async salvarConteudo() {
        const botao = document.getElementById('btnSalvarConteudo');
        const arquivo = document.getElementById('conteudoArquivo').files[0];
        const visibilidade = document.querySelector('[name="visibilidade"]:checked').value;
        const pacientes = [...document.querySelectorAll('[name="pacientesConteudo"]:checked')].map(i => i.value);
        if (visibilidade === 'exclusivo' && !pacientes.length) return alert('Selecione ao menos um paciente para o conteúdo exclusivo.');
        botao.disabled = true;
        try {
            let asset = this.editando ? { secure_url:this.editando.arquivo_url, public_id:this.editando.cloudinary_public_id, resource_type:this.editando.cloudinary_resource_type, format:this.editando.formato, bytes:this.editando.tamanho_bytes } : null;
            if (arquivo) {
                document.getElementById('uploadProgress').hidden = false;
                asset = await uploadParaCloudinary(arquivo, percentual => { document.querySelector('#uploadProgress progress').value = percentual; document.getElementById('uploadPercent').textContent = `${percentual}%`; });
            }
            const dados = { titulo:document.getElementById('conteudoTitulo').value.trim(), categoria:document.getElementById('conteudoCategoria').value.trim(), tipo:document.getElementById('conteudoTipo').value, descricao:document.getElementById('conteudoDescricao').value.trim(), visibilidade, pacientes_exclusivos:visibilidade === 'exclusivo' ? pacientes : [], profissional_login:this.userInfo.login, profissional_nome:this.userInfo.nome || this.userInfo.login, profissional_cargo:this.userInfo.cargo, arquivo_url:asset.secure_url, cloudinary_public_id:asset.public_id, cloudinary_resource_type:asset.resource_type, formato:asset.format || arquivo?.name.split('.').pop(), tamanho_bytes:asset.bytes || null, atualizado_em:serverTimestamp() };
            if (this.editando) {
                await updateDoc(doc(db, 'palestras_videos', this.editando.id), dados);
                if (arquivo && this.editando.cloudinary_public_id) await excluirDoCloudinary(this.editando.cloudinary_public_id, this.editando.cloudinary_resource_type);
            } else await addDoc(collection(db, 'palestras_videos'), { ...dados, criado_em:serverTimestamp() });
            this.fecharModal(); await this.carregarConteudos();
        } catch (error) { alert(`Não foi possível salvar: ${error.message}`); }
        finally { botao.disabled = false; document.getElementById('uploadProgress').hidden = true; }
    }

    async excluirConteudo(id) {
        const conteudo = this.conteudos.find(c => c.id === id);
        if (!conteudo || !confirm(`Excluir “${conteudo.titulo}”?`)) return;
        try { await deleteDoc(doc(db, 'palestras_videos', id)); if (conteudo.cloudinary_public_id) await excluirDoCloudinary(conteudo.cloudinary_public_id, conteudo.cloudinary_resource_type); await this.carregarConteudos(); }
        catch (error) { alert(`Não foi possível excluir: ${error.message}`); }
    }
}
