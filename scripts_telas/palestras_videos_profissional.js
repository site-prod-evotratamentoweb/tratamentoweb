import { FuncoesCompartilhadas } from './0_home.js';
import { MenuProfissional } from './0_complementos_menu_profissional.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { db, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, serverTimestamp, uploadParaCloudinary, excluirDoCloudinary } from '../0_firebase_api_config.js';

export class PalestrasVideosProfissional {
    constructor(userInfo, pacientesList = []) {
        this.userInfo = userInfo;
        this.pacientesList = pacientesList;
        this.conteudos = [];
        this.editando = null;
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
        await this.carregarConteudos();
    }

    renderHTML() {
        return `<div class="dashboard-container media-library-page"><div id="menuContainer"></div><main class="main-content media-library-main">
            <header class="media-library-hero"><div><span class="media-eyebrow">Biblioteca profissional</span><h1>Palestras e conteúdos</h1><p>Publique vídeos, apresentações e materiais para sua audiência.</p></div><button id="btnNovoConteudo" class="media-primary-btn">＋ Novo conteúdo</button></header>
            <section class="media-stats"><div><strong id="totalConteudos">0</strong><span>Publicações</span></div><div><strong id="totalGlobais">0</strong><span>Globais</span></div><div><strong id="totalRestritos">0</strong><span>Restritas</span></div></section>
            <div class="media-toolbar"><label><span>Buscar conteúdo</span><input id="buscaConteudo" type="search" placeholder="Título, descrição ou categoria"></label><label><span>Visibilidade</span><select id="filtroVisibilidade"><option value="">Todas</option><option value="global">Global</option><option value="privado">Privado</option><option value="exclusivo">Exclusivo</option></select></label></div>
            <section id="listaConteudos" class="media-content-grid"><div class="media-empty"><div class="media-loader"></div><p>Carregando biblioteca...</p></div></section>
        </main><div id="modalConteudo" class="media-modal" hidden>${this.renderFormulario()}</div></div>`;
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
