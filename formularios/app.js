<<<<<<< HEAD
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

/* ============================================================
   FIREBASE
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyDpY7dDlFIrROaXOc6QwJyUUDjrf24VQGQ",
  authDomain: "formularios-graziellematos.firebaseapp.com",
  projectId: "formularios-graziellematos",
  storageBucket: "formularios-graziellematos.firebasestorage.app",
  messagingSenderId: "377913733401",
  appId: "1:377913733401:web:8251c590b38dd7fa131588"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

/* ============================================================
   CATÁLOGO DE FORMULÁRIOS

   Para criar um novo formulário futuramente:
   1. Crie a coleção correspondente no Firestore pelas regras.
   2. Adicione uma nova configuração aqui, por exemplo "2".
   3. Crie uma nova função renderFormulario2().
   ============================================================ */
const FORMULARIOS = {
  "1": {
    numero: "1",
    colecao: "formulario1",
    titulo: "Minha Rota dos 30 Dias",
    descricaoGerador: "Formulário personalizado de acompanhamento para os próximos 30 dias.",
    render: renderFormulario1,
=======
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

/* ============================================================
   FIREBASE
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyDpY7dDlFIrROaXOc6QwJyUUDjrf24VQGQ",
  authDomain: "formularios-graziellematos.firebaseapp.com",
  projectId: "formularios-graziellematos",
  storageBucket: "formularios-graziellematos.firebasestorage.app",
  messagingSenderId: "377913733401",
  appId: "1:377913733401:web:8251c590b38dd7fa131588"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

/* ============================================================
   CATÁLOGO DE FORMULÁRIOS

   Para criar um novo formulário futuramente:
   1. Crie a coleção correspondente no Firestore pelas regras.
   2. Adicione uma nova configuração aqui, por exemplo "2".
   3. Crie uma nova função renderFormulario2().
   ============================================================ */
const FORMULARIOS = {
  "1": {
    numero: "1",
    colecao: "formulario1",
    titulo: "Minha Rota dos 30 Dias",
    descricaoGerador: "Formulário personalizado de acompanhamento para os próximos 30 dias.",
    render: renderFormulario1,
>>>>>>> bf6d5538731ba43065b6986d40d549da19de86ae
    coletar: coletarFormulario1
  },
  "2": {
    numero: "2",
    colecao: "formulario2",
    titulo: "Pré-Consulta - Rota da Mulher Real",
    descricaoGerador: "Pré-consulta preenchida pela cliente antes da Sessão Clareza.",
    nomePreenchidoPeloCliente: true,
    render: renderFormulario2,
    coletar: coletarFormulario2,
    validar: validarFormulario2
  }
};
<<<<<<< HEAD

const pagina = document.body.dataset.page;
const app = document.getElementById("app");

if (pagina === "gerador") {
  renderGerador();
} else {
  iniciarFormularioPublico();
}

/* ============================================================
   GERADOR DE LINKS
   ============================================================ */
function renderGerador() {
  const opcoes = Object.values(FORMULARIOS)
    .map(form => `<option value="${escapeHtml(form.numero)}">${escapeHtml(form.titulo)}</option>`)
    .join("");

  app.innerHTML = `
    <main class="admin-page">
      <header class="admin-header">
        <div>
          <div class="brand-signature">Grazielle Matos</div>
          <div class="brand-subtitle admin-brand-subtitle">NUTRICIONISTA</div>
        </div>
        <button id="btnAtualizarPainel" class="button compact-button secondary-button" type="button">
          Atualizar
        </button>
      </header>

      <section class="admin-grid">
        <div class="admin-card generator-card">
          <h1 class="admin-title">Gerar formulário</h1>
          <p id="orientacaoGerador" class="admin-text">
            Escolha o formulário, informe o nome do paciente e gere um link exclusivo.
          </p>

          <label class="field-label" for="tipoFormulario">Formulário</label>
          <select id="tipoFormulario" class="field-control">
            ${opcoes}
          </select>

          <label class="field-label" for="nomePacienteGerador">Nome do paciente</label>
          <input
            id="nomePacienteGerador"
            class="field-control"
            type="text"
            maxlength="150"
            autocomplete="off"
            placeholder="Ex.: Maria da Silva"
          >

          <button id="btnGerar" class="button primary-button" type="button">
            Gerar link do paciente
          </button>

          <div id="geradorLoading" class="inline-status hidden">Gerando formulário...</div>
          <div id="geradorErro" class="alert error hidden"></div>

          <section id="geradorResultado" class="generated-box hidden">
            <div class="success-title">✓ Formulário criado</div>

            <div class="generated-info">
              <span>Paciente</span>
              <strong id="resultadoPaciente"></strong>
            </div>

            <div class="generated-info">
              <span>Formulário</span>
              <strong id="resultadoFormulario"></strong>
            </div>

            <label class="field-label" for="linkGerado">Link exclusivo</label>
            <textarea id="linkGerado" class="link-output" readonly></textarea>

            <button id="btnCopiar" class="button primary-button" type="button">Copiar link</button>
            <button id="btnWhatsApp" class="button whatsapp-button" type="button">Enviar pelo WhatsApp</button>
            <button id="btnNovo" class="button secondary-button" type="button">Gerar outro</button>
          </section>
        </div>

        <section class="dashboard-area">
          <div class="dashboard-title-row">
            <div>
              <h2>Formulários gerados</h2>
              <p>Acompanhe os links pendentes e os formulários já respondidos.</p>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <span>Total</span>
              <strong id="statTotal">—</strong>
            </div>
            <div class="stat-card pending-stat">
              <span>Pendentes</span>
              <strong id="statPendentes">—</strong>
            </div>
            <div class="stat-card answered-stat">
              <span>Respondidos</span>
              <strong id="statRespondidos">—</strong>
            </div>
          </div>

          <div class="dashboard-tools">
            <input id="buscaPaciente" class="field-control dashboard-search" type="search" placeholder="Buscar paciente...">
            <select id="filtroStatus" class="field-control dashboard-filter">
              <option value="todos">Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="concluido">Respondidos</option>
            </select>
          </div>

          <div id="painelLoading" class="dashboard-empty">Carregando formulários...</div>
          <div id="painelErro" class="alert error hidden"></div>
          <div id="listaFormularios" class="forms-list"></div>
        </section>
      </section>
    </main>

    <div id="modalRespostas" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="modalTitulo">
      <div class="response-modal">
        <div class="modal-header">
          <div>
            <span class="modal-kicker">FORMULÁRIO RESPONDIDO</span>
            <h2 id="modalTitulo"></h2>
            <p id="modalPaciente"></p>
          </div>
          <button id="btnFecharModal" class="modal-close" type="button" aria-label="Fechar">×</button>
        </div>
        <div id="modalConteudo" class="response-content"></div>
      </div>
    </div>
  `;

  const nomeInput = document.getElementById("nomePacienteGerador");
  const tipoInput = document.getElementById("tipoFormulario");
  document.getElementById("btnGerar").addEventListener("click", gerarLinkPaciente);
  document.getElementById("btnCopiar").addEventListener("click", copiarLinkGerado);
  document.getElementById("btnWhatsApp").addEventListener("click", enviarLinkWhatsApp);
  document.getElementById("btnNovo").addEventListener("click", limparGerador);
  document.getElementById("btnAtualizarPainel").addEventListener("click", carregarPainelFormularios);
  document.getElementById("buscaPaciente").addEventListener("input", aplicarFiltrosPainel);
  document.getElementById("filtroStatus").addEventListener("change", aplicarFiltrosPainel);
  document.getElementById("btnFecharModal").addEventListener("click", fecharModalRespostas);
  document.getElementById("modalRespostas").addEventListener("click", event => {
    if (event.target.id === "modalRespostas") fecharModalRespostas();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") fecharModalRespostas();
  });

  nomeInput.addEventListener("keydown", event => {
    if (event.key === "Enter") gerarLinkPaciente();
  });
  tipoInput.addEventListener("change", atualizarCampoNomeGerador);
  atualizarCampoNomeGerador();

  carregarPainelFormularios();
}

let formulariosPainel = [];

async function gerarLinkPaciente() {
  const numeroFormulario = document.getElementById("tipoFormulario").value;
  const formulario = FORMULARIOS[numeroFormulario];
  const nome = normalizarEspacos(document.getElementById("nomePacienteGerador").value);
  const btn = document.getElementById("btnGerar");
  const loading = document.getElementById("geradorLoading");

  esconderGeradorErro();
  document.getElementById("geradorResultado").classList.add("hidden");

  if (!formulario) {
    mostrarGeradorErro("Formulário inválido.");
    return;
  }

  if (!formulario.nomePreenchidoPeloCliente && nome.length < 2) {
    mostrarGeradorErro("Informe o nome do paciente.");
    return;
  }

  btn.disabled = true;
  loading.classList.remove("hidden");

  try {
    const id = gerarIdSeguro();
    const referencia = doc(db, formulario.colecao, id);

    await setDoc(referencia, {
      paciente: formulario.nomePreenchidoPeloCliente ? "" : nome,
      titulo: formulario.titulo,
      formulario_numero: formulario.numero,
      status: "pendente",
      criado_em: serverTimestamp()
    });

    const url = criarUrlPaciente(formulario.numero, id);

    document.getElementById("resultadoPaciente").textContent =
      formulario.nomePreenchidoPeloCliente ? "Será informado pela cliente" : nome;
    document.getElementById("resultadoFormulario").textContent = formulario.titulo;
    document.getElementById("linkGerado").value = url;
    document.getElementById("geradorResultado").classList.remove("hidden");

    await carregarPainelFormularios();
  } catch (erro) {
    console.error(erro);
    mostrarGeradorErro(
      "Não foi possível criar o formulário. Verifique as regras do Firestore e tente novamente."
    );
  } finally {
    btn.disabled = false;
    loading.classList.add("hidden");
  }
=======

const pagina = document.body.dataset.page;
const app = document.getElementById("app");

if (pagina === "gerador") {
  renderGerador();
} else {
  iniciarFormularioPublico();
}

/* ============================================================
   GERADOR DE LINKS
   ============================================================ */
function renderGerador() {
  const opcoes = Object.values(FORMULARIOS)
    .map(form => `<option value="${escapeHtml(form.numero)}">${escapeHtml(form.titulo)}</option>`)
    .join("");

  app.innerHTML = `
    <main class="admin-page">
      <header class="admin-header">
        <div>
          <div class="brand-signature">Grazielle Matos</div>
          <div class="brand-subtitle admin-brand-subtitle">NUTRICIONISTA</div>
        </div>
        <button id="btnAtualizarPainel" class="button compact-button secondary-button" type="button">
          Atualizar
        </button>
      </header>

      <section class="admin-grid">
        <div class="admin-card generator-card">
          <h1 class="admin-title">Gerar formulário</h1>
          <p id="orientacaoGerador" class="admin-text">
            Escolha o formulário, informe o nome do paciente e gere um link exclusivo.
          </p>

          <label class="field-label" for="tipoFormulario">Formulário</label>
          <select id="tipoFormulario" class="field-control">
            ${opcoes}
          </select>

          <label class="field-label" for="nomePacienteGerador">Nome do paciente</label>
          <input
            id="nomePacienteGerador"
            class="field-control"
            type="text"
            maxlength="150"
            autocomplete="off"
            placeholder="Ex.: Maria da Silva"
          >

          <button id="btnGerar" class="button primary-button" type="button">
            Gerar link do paciente
          </button>

          <div id="geradorLoading" class="inline-status hidden">Gerando formulário...</div>
          <div id="geradorErro" class="alert error hidden"></div>

          <section id="geradorResultado" class="generated-box hidden">
            <div class="success-title">✓ Formulário criado</div>

            <div class="generated-info">
              <span>Paciente</span>
              <strong id="resultadoPaciente"></strong>
            </div>

            <div class="generated-info">
              <span>Formulário</span>
              <strong id="resultadoFormulario"></strong>
            </div>

            <label class="field-label" for="linkGerado">Link exclusivo</label>
            <textarea id="linkGerado" class="link-output" readonly></textarea>

            <button id="btnCopiar" class="button primary-button" type="button">Copiar link</button>
            <button id="btnWhatsApp" class="button whatsapp-button" type="button">Enviar pelo WhatsApp</button>
            <button id="btnNovo" class="button secondary-button" type="button">Gerar outro</button>
          </section>
        </div>

        <section class="dashboard-area">
          <div class="dashboard-title-row">
            <div>
              <h2>Formulários gerados</h2>
              <p>Acompanhe os links pendentes e os formulários já respondidos.</p>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <span>Total</span>
              <strong id="statTotal">—</strong>
            </div>
            <div class="stat-card pending-stat">
              <span>Pendentes</span>
              <strong id="statPendentes">—</strong>
            </div>
            <div class="stat-card answered-stat">
              <span>Respondidos</span>
              <strong id="statRespondidos">—</strong>
            </div>
          </div>

          <div class="dashboard-tools">
            <input id="buscaPaciente" class="field-control dashboard-search" type="search" placeholder="Buscar paciente...">
            <select id="filtroStatus" class="field-control dashboard-filter">
              <option value="todos">Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="concluido">Respondidos</option>
            </select>
          </div>

          <div id="painelLoading" class="dashboard-empty">Carregando formulários...</div>
          <div id="painelErro" class="alert error hidden"></div>
          <div id="listaFormularios" class="forms-list"></div>
        </section>
      </section>
    </main>

    <div id="modalRespostas" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="modalTitulo">
      <div class="response-modal">
        <div class="modal-header">
          <div>
            <span class="modal-kicker">FORMULÁRIO RESPONDIDO</span>
            <h2 id="modalTitulo"></h2>
            <p id="modalPaciente"></p>
          </div>
          <button id="btnFecharModal" class="modal-close" type="button" aria-label="Fechar">×</button>
        </div>
        <div id="modalConteudo" class="response-content"></div>
      </div>
    </div>
  `;

  const nomeInput = document.getElementById("nomePacienteGerador");
  const tipoInput = document.getElementById("tipoFormulario");
  document.getElementById("btnGerar").addEventListener("click", gerarLinkPaciente);
  document.getElementById("btnCopiar").addEventListener("click", copiarLinkGerado);
  document.getElementById("btnWhatsApp").addEventListener("click", enviarLinkWhatsApp);
  document.getElementById("btnNovo").addEventListener("click", limparGerador);
  document.getElementById("btnAtualizarPainel").addEventListener("click", carregarPainelFormularios);
  document.getElementById("buscaPaciente").addEventListener("input", aplicarFiltrosPainel);
  document.getElementById("filtroStatus").addEventListener("change", aplicarFiltrosPainel);
  document.getElementById("btnFecharModal").addEventListener("click", fecharModalRespostas);
  document.getElementById("modalRespostas").addEventListener("click", event => {
    if (event.target.id === "modalRespostas") fecharModalRespostas();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") fecharModalRespostas();
  });

  nomeInput.addEventListener("keydown", event => {
    if (event.key === "Enter") gerarLinkPaciente();
  });
  tipoInput.addEventListener("change", atualizarCampoNomeGerador);
  atualizarCampoNomeGerador();

  carregarPainelFormularios();
}

let formulariosPainel = [];

async function gerarLinkPaciente() {
  const numeroFormulario = document.getElementById("tipoFormulario").value;
  const formulario = FORMULARIOS[numeroFormulario];
  const nome = normalizarEspacos(document.getElementById("nomePacienteGerador").value);
  const btn = document.getElementById("btnGerar");
  const loading = document.getElementById("geradorLoading");

  esconderGeradorErro();
  document.getElementById("geradorResultado").classList.add("hidden");

  if (!formulario) {
    mostrarGeradorErro("Formulário inválido.");
    return;
  }

  if (!formulario.nomePreenchidoPeloCliente && nome.length < 2) {
    mostrarGeradorErro("Informe o nome do paciente.");
    return;
  }

  btn.disabled = true;
  loading.classList.remove("hidden");

  try {
    const id = gerarIdSeguro();
    const referencia = doc(db, formulario.colecao, id);

    await setDoc(referencia, {
      paciente: formulario.nomePreenchidoPeloCliente ? "" : nome,
      titulo: formulario.titulo,
      formulario_numero: formulario.numero,
      status: "pendente",
      criado_em: serverTimestamp()
    });

    const url = criarUrlPaciente(formulario.numero, id);

    document.getElementById("resultadoPaciente").textContent =
      formulario.nomePreenchidoPeloCliente ? "Será informado pela cliente" : nome;
    document.getElementById("resultadoFormulario").textContent = formulario.titulo;
    document.getElementById("linkGerado").value = url;
    document.getElementById("geradorResultado").classList.remove("hidden");

    await carregarPainelFormularios();
  } catch (erro) {
    console.error(erro);
    mostrarGeradorErro(
      "Não foi possível criar o formulário. Verifique as regras do Firestore e tente novamente."
    );
  } finally {
    btn.disabled = false;
    loading.classList.add("hidden");
  }
>>>>>>> bf6d5538731ba43065b6986d40d549da19de86ae
}

function atualizarCampoNomeGerador() {
  const formulario = FORMULARIOS[document.getElementById("tipoFormulario")?.value];
  const nomeInput = document.getElementById("nomePacienteGerador");
  const nomeLabel = document.querySelector('label[for="nomePacienteGerador"]');
  const orientacao = document.getElementById("orientacaoGerador");
  if (!formulario || !nomeInput || !nomeLabel) return;

  const preenchidoPeloCliente = Boolean(formulario.nomePreenchidoPeloCliente);
  nomeInput.disabled = preenchidoPeloCliente;
  nomeInput.value = "";
  nomeInput.placeholder = preenchidoPeloCliente
    ? "A cliente preencherá no formulário"
    : "Ex.: Maria da Silva";
  nomeLabel.textContent = preenchidoPeloCliente
    ? "Nome da cliente (preenchido por ela)"
    : "Nome do paciente";
  if (orientacao) {
    orientacao.textContent = preenchidoPeloCliente
      ? "Gere o link exclusivo. A própria cliente informará o nome ao preencher o formulário."
      : "Escolha o formulário, informe o nome do paciente e gere um link exclusivo.";
  }
}
<<<<<<< HEAD

function criarUrlPaciente(numeroFormulario, id) {
  const url = new URL("index.html", window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("f", numeroFormulario);
  url.searchParams.set("id", id);
  return url.href;
}

function gerarIdSeguro() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function copiarLinkGerado() {
  const campo = document.getElementById("linkGerado");
  if (!campo.value) return;
  await copiarTexto(campo.value);

  const botao = document.getElementById("btnCopiar");
  const original = botao.textContent;
  botao.textContent = "✓ Link copiado";
  setTimeout(() => (botao.textContent = original), 1600);
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const temporario = document.createElement("textarea");
    temporario.value = texto;
    temporario.style.position = "fixed";
    temporario.style.opacity = "0";
    document.body.appendChild(temporario);
    temporario.focus();
    temporario.select();
    document.execCommand("copy");
    temporario.remove();
  }
}

function enviarLinkWhatsApp() {
  const link = document.getElementById("linkGerado").value;
  const paciente = document.getElementById("resultadoPaciente").textContent;
  const formulario = document.getElementById("resultadoFormulario").textContent;
  if (!link) return;

  const saudacao = paciente === "Será informado pela cliente" ? "Olá!" : `Olá, ${paciente}!`;
  const mensagem =
    `${saudacao}\n\n` +
    `Preparei para você o formulário “${formulario}”.\n\n` +
    `Acesse pelo link abaixo:\n${link}\n\n` +
    `O formulário poderá ser enviado uma única vez.`;

  window.open(
    `https://wa.me/?text=${encodeURIComponent(mensagem)}`,
    "_blank",
    "noopener,noreferrer"
  );
}

=======

function criarUrlPaciente(numeroFormulario, id) {
  const url = new URL("index.html", window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("f", numeroFormulario);
  url.searchParams.set("id", id);
  return url.href;
}

function gerarIdSeguro() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function copiarLinkGerado() {
  const campo = document.getElementById("linkGerado");
  if (!campo.value) return;
  await copiarTexto(campo.value);

  const botao = document.getElementById("btnCopiar");
  const original = botao.textContent;
  botao.textContent = "✓ Link copiado";
  setTimeout(() => (botao.textContent = original), 1600);
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const temporario = document.createElement("textarea");
    temporario.value = texto;
    temporario.style.position = "fixed";
    temporario.style.opacity = "0";
    document.body.appendChild(temporario);
    temporario.focus();
    temporario.select();
    document.execCommand("copy");
    temporario.remove();
  }
}

function enviarLinkWhatsApp() {
  const link = document.getElementById("linkGerado").value;
  const paciente = document.getElementById("resultadoPaciente").textContent;
  const formulario = document.getElementById("resultadoFormulario").textContent;
  if (!link) return;

  const saudacao = paciente === "Será informado pela cliente" ? "Olá!" : `Olá, ${paciente}!`;
  const mensagem =
    `${saudacao}\n\n` +
    `Preparei para você o formulário “${formulario}”.\n\n` +
    `Acesse pelo link abaixo:\n${link}\n\n` +
    `O formulário poderá ser enviado uma única vez.`;

  window.open(
    `https://wa.me/?text=${encodeURIComponent(mensagem)}`,
    "_blank",
    "noopener,noreferrer"
  );
}

>>>>>>> bf6d5538731ba43065b6986d40d549da19de86ae
function limparGerador() {
  document.getElementById("nomePacienteGerador").value = "";
  document.getElementById("geradorResultado").classList.add("hidden");
  esconderGeradorErro();
  if (!document.getElementById("nomePacienteGerador").disabled) {
    document.getElementById("nomePacienteGerador").focus();
  }
<<<<<<< HEAD
}

function mostrarGeradorErro(mensagem) {
  const box = document.getElementById("geradorErro");
  box.textContent = mensagem;
  box.classList.remove("hidden");
}

function esconderGeradorErro() {
  document.getElementById("geradorErro")?.classList.add("hidden");
}

/* ============================================================
   PAINEL DE ACOMPANHAMENTO - gerar.html
   ============================================================ */
async function carregarPainelFormularios() {
  const loading = document.getElementById("painelLoading");
  const erroBox = document.getElementById("painelErro");
  if (!loading || !erroBox) return;

  loading.classList.remove("hidden");
  loading.textContent = "Carregando formulários...";
  erroBox.classList.add("hidden");

  try {
    const resultados = [];

    for (const formulario of Object.values(FORMULARIOS)) {
      const snapshot = await getDocs(collection(db, formulario.colecao));
      snapshot.forEach(documento => {
        resultados.push({
          id: documento.id,
          colecao: formulario.colecao,
          numeroFormulario: formulario.numero,
          tituloConfigurado: formulario.titulo,
          ...documento.data()
        });
      });
    }

    formulariosPainel = resultados.sort((a, b) => timestampMillis(b.criado_em) - timestampMillis(a.criado_em));
    atualizarEstatisticasPainel();
    aplicarFiltrosPainel();
    loading.classList.add("hidden");
  } catch (erro) {
    console.error(erro);
    loading.classList.add("hidden");
    erroBox.textContent =
      "Não foi possível listar os formulários. Publique as regras atualizadas do Firestore que permitem listagem no painel.";
    erroBox.classList.remove("hidden");
  }
}

function atualizarEstatisticasPainel() {
  const total = formulariosPainel.length;
  const pendentes = formulariosPainel.filter(item => item.status === "pendente").length;
  const respondidos = formulariosPainel.filter(item => item.status === "concluido").length;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statPendentes").textContent = pendentes;
  document.getElementById("statRespondidos").textContent = respondidos;
}

function aplicarFiltrosPainel() {
  const busca = normalizarEspacos(document.getElementById("buscaPaciente")?.value || "").toLocaleLowerCase("pt-BR");
  const status = document.getElementById("filtroStatus")?.value || "todos";

  const filtrados = formulariosPainel.filter(item => {
    const paciente = String(item.paciente || "").toLocaleLowerCase("pt-BR");
    const combinaBusca = !busca || paciente.includes(busca);
    const combinaStatus = status === "todos" || item.status === status;
    return combinaBusca && combinaStatus;
  });

  renderListaFormularios(filtrados);
}

function renderListaFormularios(itens) {
  const lista = document.getElementById("listaFormularios");
  if (!lista) return;

  if (!itens.length) {
    lista.innerHTML = `<div class="dashboard-empty">Nenhum formulário encontrado.</div>`;
    return;
  }

  lista.innerHTML = itens.map(item => {
    const respondido = item.status === "concluido";
    const dataCriacao = formatarTimestamp(item.criado_em);
    const dataResposta = respondido ? formatarTimestamp(item.preenchido_em) : "";

    return `
      <article class="form-list-item">
        <div class="form-list-main">
          <div class="form-list-title-row">
            <strong>${escapeHtml(item.paciente || "Nome será informado pela cliente")}</strong>
            <span class="status-pill ${respondido ? "answered" : "pending"}">
              ${respondido ? "Respondido" : "Pendente"}
            </span>
          </div>
          <span class="form-list-form">${escapeHtml(item.titulo || item.tituloConfigurado)}</span>
          <span class="form-list-date">
            Gerado: ${escapeHtml(dataCriacao)}${dataResposta ? ` · Respondido: ${escapeHtml(dataResposta)}` : ""}
          </span>
        </div>
        <div class="form-list-actions">
          ${respondido
            ? `<button class="mini-button primary-mini" data-action="ver" data-key="${escapeHtml(chavePainel(item))}" type="button">Ver respostas</button>`
            : `
              <button class="mini-button" data-action="copiar" data-key="${escapeHtml(chavePainel(item))}" type="button">Copiar link</button>
              <button class="mini-button" data-action="abrir" data-key="${escapeHtml(chavePainel(item))}" type="button">Abrir</button>
            `}
        </div>
      </article>
    `;
  }).join("");

  lista.querySelectorAll("button[data-action]").forEach(botao => {
    botao.addEventListener("click", () => acaoItemPainel(botao.dataset.action, botao.dataset.key, botao));
  });
}

function chavePainel(item) {
  return `${item.numeroFormulario}:${item.id}`;
}

function localizarItemPainel(chave) {
  const [numero, id] = String(chave || "").split(":");
  return formulariosPainel.find(item => item.numeroFormulario === numero && item.id === id);
}

async function acaoItemPainel(acao, chave, botao) {
  const item = localizarItemPainel(chave);
  if (!item) return;

  if (acao === "ver") {
    abrirModalRespostas(item);
    return;
  }

  const link = criarUrlPaciente(item.numeroFormulario, item.id);

  if (acao === "abrir") {
    window.open(link, "_blank", "noopener,noreferrer");
    return;
  }

  if (acao === "copiar") {
    await copiarTexto(link);
    const original = botao.textContent;
    botao.textContent = "✓ Copiado";
    setTimeout(() => (botao.textContent = original), 1400);
  }
}

const ROTULOS_FORMULARIO1 = [
  ["onde_estou", "Onde eu estou hoje"],
  ["obstaculo", "Meu principal obstáculo"],
  ["prioridade", "Minha prioridade"],
  ["organizar", "Organizar"],
  ["cuidar", "Cuidar"],
  ["preparar", "Preparar"],
  ["plano_b", "Meu plano B"],
  ["fora_rotina", "Quando eu sair da rotina"],
  ["semana_prioridade", "Semana 1 — prioridade"],
  ["semana_preparar", "Semana 1 — preparar"],
  ["semana_observar", "Semana 1 — observar"],
  ["semana_evitar", "Semana 1 — evitar"],
  ["avancos", "Como vou saber que estou avançando"],
  ["outro_avanco", "Outro avanço"],
  ["primeiro_passo", "Meu primeiro passo"],
  ["data_compromisso", "Data do compromisso"]
=======
}

function mostrarGeradorErro(mensagem) {
  const box = document.getElementById("geradorErro");
  box.textContent = mensagem;
  box.classList.remove("hidden");
}

function esconderGeradorErro() {
  document.getElementById("geradorErro")?.classList.add("hidden");
}

/* ============================================================
   PAINEL DE ACOMPANHAMENTO - gerar.html
   ============================================================ */
async function carregarPainelFormularios() {
  const loading = document.getElementById("painelLoading");
  const erroBox = document.getElementById("painelErro");
  if (!loading || !erroBox) return;

  loading.classList.remove("hidden");
  loading.textContent = "Carregando formulários...";
  erroBox.classList.add("hidden");

  try {
    const resultados = [];

    for (const formulario of Object.values(FORMULARIOS)) {
      const snapshot = await getDocs(collection(db, formulario.colecao));
      snapshot.forEach(documento => {
        resultados.push({
          id: documento.id,
          colecao: formulario.colecao,
          numeroFormulario: formulario.numero,
          tituloConfigurado: formulario.titulo,
          ...documento.data()
        });
      });
    }

    formulariosPainel = resultados.sort((a, b) => timestampMillis(b.criado_em) - timestampMillis(a.criado_em));
    atualizarEstatisticasPainel();
    aplicarFiltrosPainel();
    loading.classList.add("hidden");
  } catch (erro) {
    console.error(erro);
    loading.classList.add("hidden");
    erroBox.textContent =
      "Não foi possível listar os formulários. Publique as regras atualizadas do Firestore que permitem listagem no painel.";
    erroBox.classList.remove("hidden");
  }
}

function atualizarEstatisticasPainel() {
  const total = formulariosPainel.length;
  const pendentes = formulariosPainel.filter(item => item.status === "pendente").length;
  const respondidos = formulariosPainel.filter(item => item.status === "concluido").length;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statPendentes").textContent = pendentes;
  document.getElementById("statRespondidos").textContent = respondidos;
}

function aplicarFiltrosPainel() {
  const busca = normalizarEspacos(document.getElementById("buscaPaciente")?.value || "").toLocaleLowerCase("pt-BR");
  const status = document.getElementById("filtroStatus")?.value || "todos";

  const filtrados = formulariosPainel.filter(item => {
    const paciente = String(item.paciente || "").toLocaleLowerCase("pt-BR");
    const combinaBusca = !busca || paciente.includes(busca);
    const combinaStatus = status === "todos" || item.status === status;
    return combinaBusca && combinaStatus;
  });

  renderListaFormularios(filtrados);
}

function renderListaFormularios(itens) {
  const lista = document.getElementById("listaFormularios");
  if (!lista) return;

  if (!itens.length) {
    lista.innerHTML = `<div class="dashboard-empty">Nenhum formulário encontrado.</div>`;
    return;
  }

  lista.innerHTML = itens.map(item => {
    const respondido = item.status === "concluido";
    const dataCriacao = formatarTimestamp(item.criado_em);
    const dataResposta = respondido ? formatarTimestamp(item.preenchido_em) : "";

    return `
      <article class="form-list-item">
        <div class="form-list-main">
          <div class="form-list-title-row">
            <strong>${escapeHtml(item.paciente || "Nome será informado pela cliente")}</strong>
            <span class="status-pill ${respondido ? "answered" : "pending"}">
              ${respondido ? "Respondido" : "Pendente"}
            </span>
          </div>
          <span class="form-list-form">${escapeHtml(item.titulo || item.tituloConfigurado)}</span>
          <span class="form-list-date">
            Gerado: ${escapeHtml(dataCriacao)}${dataResposta ? ` · Respondido: ${escapeHtml(dataResposta)}` : ""}
          </span>
        </div>
        <div class="form-list-actions">
          ${respondido
            ? `<button class="mini-button primary-mini" data-action="ver" data-key="${escapeHtml(chavePainel(item))}" type="button">Ver respostas</button>`
            : `
              <button class="mini-button" data-action="copiar" data-key="${escapeHtml(chavePainel(item))}" type="button">Copiar link</button>
              <button class="mini-button" data-action="abrir" data-key="${escapeHtml(chavePainel(item))}" type="button">Abrir</button>
            `}
        </div>
      </article>
    `;
  }).join("");

  lista.querySelectorAll("button[data-action]").forEach(botao => {
    botao.addEventListener("click", () => acaoItemPainel(botao.dataset.action, botao.dataset.key, botao));
  });
}

function chavePainel(item) {
  return `${item.numeroFormulario}:${item.id}`;
}

function localizarItemPainel(chave) {
  const [numero, id] = String(chave || "").split(":");
  return formulariosPainel.find(item => item.numeroFormulario === numero && item.id === id);
}

async function acaoItemPainel(acao, chave, botao) {
  const item = localizarItemPainel(chave);
  if (!item) return;

  if (acao === "ver") {
    abrirModalRespostas(item);
    return;
  }

  const link = criarUrlPaciente(item.numeroFormulario, item.id);

  if (acao === "abrir") {
    window.open(link, "_blank", "noopener,noreferrer");
    return;
  }

  if (acao === "copiar") {
    await copiarTexto(link);
    const original = botao.textContent;
    botao.textContent = "✓ Copiado";
    setTimeout(() => (botao.textContent = original), 1400);
  }
}

const ROTULOS_FORMULARIO1 = [
  ["onde_estou", "Onde eu estou hoje"],
  ["obstaculo", "Meu principal obstáculo"],
  ["prioridade", "Minha prioridade"],
  ["organizar", "Organizar"],
  ["cuidar", "Cuidar"],
  ["preparar", "Preparar"],
  ["plano_b", "Meu plano B"],
  ["fora_rotina", "Quando eu sair da rotina"],
  ["semana_prioridade", "Semana 1 — prioridade"],
  ["semana_preparar", "Semana 1 — preparar"],
  ["semana_observar", "Semana 1 — observar"],
  ["semana_evitar", "Semana 1 — evitar"],
  ["avancos", "Como vou saber que estou avançando"],
  ["outro_avanco", "Outro avanço"],
  ["primeiro_passo", "Meu primeiro passo"],
  ["data_compromisso", "Data do compromisso"]
>>>>>>> bf6d5538731ba43065b6986d40d549da19de86ae
];

const ROTULOS_FORMULARIO2 = [
  ["paciente", "Nome"], ["idade", "Idade"], ["data", "Data"], ["profissao", "Profissão"], ["contato", "Contato"],
  ["motivo_busca", "O que fez você buscar orientação nutricional"], ["objetivo", "Principal objetivo"],
  ["objetivo_outro", "Outro objetivo"], ["primeira_melhoria", "Uma coisa para melhorar primeiro"],
  ["dia_comum", "Como é um dia comum"], ["hora_acorda", "Horário que acorda"], ["hora_dorme", "Horário que dorme"],
  ["trabalho_estudo", "Trabalho/estudo"], ["atividade_fisica", "Atividade física"], ["nota_rotina", "Organização da rotina (0 a 10)"],
  ["dificuldades_alimentacao", "Dificuldades com a alimentação"], ["dificuldade_outro", "Outra dificuldade"],
  ["cafe_manha", "Café da manhã"], ["lanche_manha", "Lanche"], ["almoco", "Almoço"],
  ["lanche_tarde", "Lanche da tarde"], ["jantar", "Jantar"], ["ceia", "Ceia"],
  ["habitos_alimentares", "Hábitos alimentares"], ["habito_outro", "Outro hábito"], ["finais_semana", "Como são os finais de semana"],
  ["responsavel_compras", "Quem faz as compras"], ["responsavel_refeicoes", "Quem prepara as refeições"],
  ["planeja_compras", "Planeja as compras"], ["opcoes_em_casa", "Opções que facilitam a alimentação em casa"],
  ["dificuldade_organizacao", "Dificuldade de organização em casa"], ["sintomas", "Sintomas atuais"],
  ["sintoma_outro", "Outro sintoma"], ["sintoma_principal", "Sintoma que mais incomoda"], ["quando_sintoma", "Quando acontece"],
  ["relacao_alimento", "Relaciona o sintoma a algum alimento"], ["alimento_relacionado", "Alimento relacionado"],
  ["condicoes_saude", "Condições de saúde"], ["condicao_outra", "Outra condição"], ["cirurgia", "Cirurgia importante"],
  ["cirurgia_qual", "Qual cirurgia"], ["alergia_intolerancia", "Alergia ou intolerância diagnosticada"],
  ["suspeita_reacao", "Suspeita de reação a alimentos"], ["usa_medicamento", "Usa medicamento"],
  ["medicamentos_detalhes", "Medicamentos: nome, dose e frequência"], ["suplementos", "Vitaminas e suplementos"],
  ["mudanca_medicamento", "Mudança recente de medicamento"], ["mudanca_qual", "Qual mudança"],
  ["historico_familiar", "História familiar"], ["historico_outro", "Outra condição familiar"], ["familiar_condicao", "Quem e qual condição"],
  ["exames_recentes", "Possui exames recentes"], ["exames", "Exames disponíveis"], ["exames_outros", "Outros exames"],
  ["data_exames", "Data aproximada dos exames"], ["dietas_anteriores", "Dietas/acompanhamentos anteriores"],
  ["o_que_tentou", "O que já tentou"], ["o_que_funcionou", "O que funcionou"], ["motivo_abandono", "O que fez parar"],
  ["nao_quer_repetir", "O que não quer repetir"], ["faz_bem", "O que já faz bem"],
  ["expectativa_sessao", "O que gostaria de entender na Sessão Clareza"], ["prontidao", "Prontidão para mudar (0 a 10)"],
  ["subir_nota", "O que faria a nota subir um ponto"], ["mudanca_30_dias", "O que estaria diferente em 30 dias"]
];
<<<<<<< HEAD

function abrirModalRespostas(item) {
  const modal = document.getElementById("modalRespostas");
  const titulo = document.getElementById("modalTitulo");
  const paciente = document.getElementById("modalPaciente");
  const conteudo = document.getElementById("modalConteudo");

  titulo.textContent = item.titulo || item.tituloConfigurado || "Formulário";
  paciente.textContent = `${item.paciente || "Paciente"} · Respondido em ${formatarTimestamp(item.preenchido_em)}`;

  const rotulos = item.numeroFormulario === "1"
    ? ROTULOS_FORMULARIO1
    : item.numeroFormulario === "2" ? ROTULOS_FORMULARIO2 : [];
  conteudo.innerHTML = rotulos.map(([campo, rotulo]) => {
    const valorCampo = formatarResposta(item[campo]);
    return `
      <section class="response-item">
        <span>${escapeHtml(rotulo)}</span>
        <div>${valorCampo}</div>
      </section>
    `;
  }).join("");

  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function fecharModalRespostas() {
  document.getElementById("modalRespostas")?.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function formatarResposta(valorCampo) {
  if (Array.isArray(valorCampo)) {
    if (!valorCampo.length) return `<em class="empty-answer">Não informado</em>`;
    return `<ul class="response-list">${valorCampo.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  const texto = String(valorCampo ?? "").trim();
  return texto ? escapeHtml(texto).replaceAll("\n", "<br>") : `<em class="empty-answer">Não informado</em>`;
}

function timestampMillis(valorTimestamp) {
  if (!valorTimestamp) return 0;
  if (typeof valorTimestamp.toMillis === "function") return valorTimestamp.toMillis();
  if (valorTimestamp.seconds) return valorTimestamp.seconds * 1000;
  return 0;
}

function formatarTimestamp(valorTimestamp) {
  const millis = timestampMillis(valorTimestamp);
  if (!millis) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(millis));
}

/* ============================================================
   PÁGINA PÚBLICA ÚNICA: index.html
   ============================================================ */
async function iniciarFormularioPublico() {
  renderTelaCarregando();

  const params = new URLSearchParams(window.location.search);
  const numeroFormulario = params.get("f");
  const id = params.get("id");
  const formulario = FORMULARIOS[numeroFormulario];

  if (!formulario || !id || !/^[a-f0-9]{32}$/.test(id)) {
    renderTelaInvalida();
    return;
  }

  try {
    const referencia = doc(db, formulario.colecao, id);
    const snapshot = await getDoc(referencia);

    if (!snapshot.exists()) {
      renderTelaInvalida();
      return;
    }

    const dados = snapshot.data();

    if (
      dados.formulario_numero !== formulario.numero ||
      dados.titulo !== formulario.titulo ||
      typeof dados.paciente !== "string"
    ) {
      renderTelaInvalida();
      return;
    }

    if (dados.status === "concluido") {
      renderTelaConcluida(dados.paciente, formulario.titulo);
      return;
    }

    if (dados.status !== "pendente") {
      renderTelaInvalida();
      return;
    }

    formulario.render({
      paciente: dados.paciente,
      titulo: formulario.titulo
    });

    const form = document.getElementById("formPaciente");
    form.addEventListener("submit", event =>
      enviarFormulario(event, referencia, formulario)
    );
  } catch (erro) {
    console.error(erro);
    renderTelaErroConexao();
  }
}

async function enviarFormulario(event, referencia, formulario) {
  event.preventDefault();

  const botao = document.getElementById("btnEnviar");
  const erroBox = document.getElementById("erroEnvio");
=======

function abrirModalRespostas(item) {
  const modal = document.getElementById("modalRespostas");
  const titulo = document.getElementById("modalTitulo");
  const paciente = document.getElementById("modalPaciente");
  const conteudo = document.getElementById("modalConteudo");

  titulo.textContent = item.titulo || item.tituloConfigurado || "Formulário";
  paciente.textContent = `${item.paciente || "Paciente"} · Respondido em ${formatarTimestamp(item.preenchido_em)}`;

  const rotulos = item.numeroFormulario === "1"
    ? ROTULOS_FORMULARIO1
    : item.numeroFormulario === "2" ? ROTULOS_FORMULARIO2 : [];
  conteudo.innerHTML = rotulos.map(([campo, rotulo]) => {
    const valorCampo = formatarResposta(item[campo]);
    return `
      <section class="response-item">
        <span>${escapeHtml(rotulo)}</span>
        <div>${valorCampo}</div>
      </section>
    `;
  }).join("");

  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function fecharModalRespostas() {
  document.getElementById("modalRespostas")?.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function formatarResposta(valorCampo) {
  if (Array.isArray(valorCampo)) {
    if (!valorCampo.length) return `<em class="empty-answer">Não informado</em>`;
    return `<ul class="response-list">${valorCampo.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  const texto = String(valorCampo ?? "").trim();
  return texto ? escapeHtml(texto).replaceAll("\n", "<br>") : `<em class="empty-answer">Não informado</em>`;
}

function timestampMillis(valorTimestamp) {
  if (!valorTimestamp) return 0;
  if (typeof valorTimestamp.toMillis === "function") return valorTimestamp.toMillis();
  if (valorTimestamp.seconds) return valorTimestamp.seconds * 1000;
  return 0;
}

function formatarTimestamp(valorTimestamp) {
  const millis = timestampMillis(valorTimestamp);
  if (!millis) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(millis));
}

/* ============================================================
   PÁGINA PÚBLICA ÚNICA: index.html
   ============================================================ */
async function iniciarFormularioPublico() {
  renderTelaCarregando();

  const params = new URLSearchParams(window.location.search);
  const numeroFormulario = params.get("f");
  const id = params.get("id");
  const formulario = FORMULARIOS[numeroFormulario];

  if (!formulario || !id || !/^[a-f0-9]{32}$/.test(id)) {
    renderTelaInvalida();
    return;
  }

  try {
    const referencia = doc(db, formulario.colecao, id);
    const snapshot = await getDoc(referencia);

    if (!snapshot.exists()) {
      renderTelaInvalida();
      return;
    }

    const dados = snapshot.data();

    if (
      dados.formulario_numero !== formulario.numero ||
      dados.titulo !== formulario.titulo ||
      typeof dados.paciente !== "string"
    ) {
      renderTelaInvalida();
      return;
    }

    if (dados.status === "concluido") {
      renderTelaConcluida(dados.paciente, formulario.titulo);
      return;
    }

    if (dados.status !== "pendente") {
      renderTelaInvalida();
      return;
    }

    formulario.render({
      paciente: dados.paciente,
      titulo: formulario.titulo
    });

    const form = document.getElementById("formPaciente");
    form.addEventListener("submit", event =>
      enviarFormulario(event, referencia, formulario)
    );
  } catch (erro) {
    console.error(erro);
    renderTelaErroConexao();
  }
}

async function enviarFormulario(event, referencia, formulario) {
  event.preventDefault();

  const botao = document.getElementById("btnEnviar");
  const erroBox = document.getElementById("erroEnvio");
>>>>>>> bf6d5538731ba43065b6986d40d549da19de86ae
  erroBox.classList.add("hidden");

  const respostas = formulario.coletar();
  const erroValidacao = formulario.validar?.(respostas);
  if (erroValidacao) {
    erroBox.textContent = erroValidacao;
    erroBox.classList.remove("hidden");
    document.getElementById("nomeCliente")?.focus();
    return;
  }
<<<<<<< HEAD

  const confirmou = window.confirm(
    "Deseja enviar o formulário?\n\nApós o envio ele não poderá ser preenchido ou alterado novamente."
  );

  if (!confirmou) return;

  botao.disabled = true;
  botao.textContent = "Enviando...";

  try {
    const atual = await getDoc(referencia);

    if (!atual.exists() || atual.data().status !== "pendente") {
      renderTelaConcluida(
        atual.exists() ? atual.data().paciente : "",
        formulario.titulo
      );
      return;
    }

    await updateDoc(referencia, {
      ...respostas,
      status: "concluido",
      preenchido_em: serverTimestamp()
    });

    renderTelaSucesso(formulario.titulo);
  } catch (erro) {
    console.error(erro);

    if (erro?.code === "permission-denied") {
      renderTelaConcluida("", formulario.titulo);
      return;
    }

    erroBox.textContent =
      "Não foi possível enviar agora. Verifique sua conexão e tente novamente.";
    erroBox.classList.remove("hidden");
    botao.disabled = false;
    botao.textContent = "Enviar formulário";
  }
}

/* ============================================================
   FORMULÁRIO 1 - MINHA ROTA DOS 30 DIAS
   ============================================================ */
function renderFormulario1({ paciente }) {
  document.title = "Minha Rota dos 30 Dias | Grazielle Matos";

  app.innerHTML = `
    <div class="form-page">
      <header class="hero">
        <div class="hero-small">MINHA</div>
        <div class="hero-main">ROTA</div>
        <div class="hero-script">dos 30 dias</div>
        <div class="hero-caption">PERSONALIZADA PARA MIM</div>
        <div class="gold-line"></div>
        <p>Pequenas escolhas diárias, grandes transformações.</p>
      </header>

      <section class="patient-box">
        <span>PACIENTE</span>
        <strong>${escapeHtml(paciente)}</strong>
      </section>

      <form id="formPaciente" novalidate>
        ${cardTexto(1, "ONDE EU ESTOU HOJE", "Eu percebi que:", "ondeEstou", "Conte um pouco sobre como você está hoje...")}
        ${cardTexto(2, "MEU PRINCIPAL OBSTÁCULO", "O que mais está me impedindo de avançar agora:", "obstaculo")}
        ${cardTexto(3, "MINHA PRIORIDADE", "Nos próximos 30 dias, meu foco será:", "prioridade")}

        <div class="section-title">4. MINHAS 3 AÇÕES PARA OS PRÓXIMOS 30 DIAS</div>

        ${acaoCard(
          "1. ORGANIZAR",
          "organizar",
          [
            "Definir horários das refeições",
            "Planejar o que vou comer",
            "Deixar opções saudáveis disponíveis",
            "Organizar minhas compras"
          ],
          "purple"
        )}

        ${acaoCard(
          "2. CUIDAR",
          "cuidar",
          [
            "Escolher alimentos reais",
            "Beber mais água",
            "Comer com atenção",
            "Dormir melhor",
            "Me movimentar"
          ],
          "gold"
        )}

        ${acaoCard(
          "3. PREPARAR",
          "preparar",
          [
            "Ter um plano para os dias corridos",
            "Preparar marmitas",
            "Ter um plano B para imprevistos",
            "Definir estratégias para momentos difíceis"
          ],
          "purple"
        )}

        <section class="form-card">
          ${tituloNumerado(5, "MEU PLANO B")}
          ${textareaCampo("Quando algo inesperado acontecer, meu plano será:", "planoB")}
          ${textareaCampo("Quando eu sair da rotina:", "foraRotina")}
          <div class="tip-box">
            ♥ Se eu não conseguir cumprir, eu não preciso esperar segunda-feira. Vou retomar na próxima oportunidade.
          </div>
        </section>

        <section class="form-card">
          ${tituloNumerado(6, "MINHA SEMANA 1")}
          ${textareaCampo("Nesta semana, minha prioridade é:", "semanaPrioridade", 1000)}
          ${textareaCampo("Uma coisa que vou preparar:", "semanaPreparar", 1000)}
          ${textareaCampo("Uma coisa que vou observar:", "semanaObservar", 1000)}
          ${textareaCampo("Uma coisa que vou evitar fazer por conta própria:", "semanaEvitar", 1000)}
        </section>

        <section class="form-card">
          ${tituloNumerado(7, "COMO VOU SABER QUE ESTOU AVANÇANDO?")}
          <p class="helper-text">Marque o que faz sentido para você:</p>
          ${checkboxAvanco("Menos desconforto")}
          ${checkboxAvanco("Melhor funcionamento intestinal")}
          ${checkboxAvanco("Mais organização")}
          ${checkboxAvanco("Menos fome desorganizada")}
          ${checkboxAvanco("Mais energia")}
          ${checkboxAvanco("Melhor sono")}
          ${checkboxAvanco("Mais confiança")}
          ${checkboxAvanco("Conseguir cumprir minha rotina")}
          ${checkboxAvanco("Conseguir retomar depois de um imprevisto")}
          <label class="field-label" for="outroAvanco">Outro:</label>
          <input id="outroAvanco" class="field-control" type="text" maxlength="500">
        </section>

        <section class="form-card commitment-card">
          <h2 class="commitment-title">MEU COMPROMISSO</h2>
          <p class="commitment-text">
            Não preciso fazer tudo perfeito.<br>
            Preciso saber qual é o próximo passo. ♥
          </p>
          ${textareaCampo("Meu primeiro passo será:", "primeiroPasso")}
          <label class="field-label" for="dataCompromisso">Data:</label>
          <input id="dataCompromisso" class="field-control" type="date">
        </section>

        <section class="final-reminder">
          <strong>Lembre-se!</strong>
          <p>Não é sobre perfeição.<br>É sobre consistência, escolhas e constância.</p>
          <em>Um dia de cada vez, no seu ritmo!</em>
        </section>

        <div id="erroEnvio" class="alert error hidden"></div>

        <button id="btnEnviar" class="button send-button" type="submit">
          Enviar formulário
        </button>

        <p class="single-use-warning">
          Após o envio, este formulário não poderá ser alterado nem preenchido novamente.
        </p>
      </form>

      <footer class="footer-brand">
        <div class="brand-signature">Grazielle Matos</div>
        <div class="brand-subtitle">NUTRICIONISTA</div>
      </footer>
    </div>
  `;
}

function coletarFormulario1() {
  const avancos = Array.from(
    document.querySelectorAll('input[name="avanco"]:checked')
  ).map(item => item.value);

  return {
    onde_estou: valor("ondeEstou"),
    obstaculo: valor("obstaculo"),
    prioridade: valor("prioridade"),
    organizar: valor("organizar"),
    cuidar: valor("cuidar"),
    preparar: valor("preparar"),
    plano_b: valor("planoB"),
    fora_rotina: valor("foraRotina"),
    semana_prioridade: valor("semanaPrioridade"),
    semana_preparar: valor("semanaPreparar"),
    semana_observar: valor("semanaObservar"),
    semana_evitar: valor("semanaEvitar"),
    avancos,
    outro_avanco: valor("outroAvanco"),
    primeiro_passo: valor("primeiroPasso"),
    data_compromisso: valor("dataCompromisso")
  };
=======

  const confirmou = window.confirm(
    "Deseja enviar o formulário?\n\nApós o envio ele não poderá ser preenchido ou alterado novamente."
  );

  if (!confirmou) return;

  botao.disabled = true;
  botao.textContent = "Enviando...";

  try {
    const atual = await getDoc(referencia);

    if (!atual.exists() || atual.data().status !== "pendente") {
      renderTelaConcluida(
        atual.exists() ? atual.data().paciente : "",
        formulario.titulo
      );
      return;
    }

    await updateDoc(referencia, {
      ...respostas,
      status: "concluido",
      preenchido_em: serverTimestamp()
    });

    renderTelaSucesso(formulario.titulo);
  } catch (erro) {
    console.error(erro);

    if (erro?.code === "permission-denied") {
      renderTelaConcluida("", formulario.titulo);
      return;
    }

    erroBox.textContent =
      "Não foi possível enviar agora. Verifique sua conexão e tente novamente.";
    erroBox.classList.remove("hidden");
    botao.disabled = false;
    botao.textContent = "Enviar formulário";
  }
}

/* ============================================================
   FORMULÁRIO 1 - MINHA ROTA DOS 30 DIAS
   ============================================================ */
function renderFormulario1({ paciente }) {
  document.title = "Minha Rota dos 30 Dias | Grazielle Matos";

  app.innerHTML = `
    <div class="form-page">
      <header class="hero">
        <div class="hero-small">MINHA</div>
        <div class="hero-main">ROTA</div>
        <div class="hero-script">dos 30 dias</div>
        <div class="hero-caption">PERSONALIZADA PARA MIM</div>
        <div class="gold-line"></div>
        <p>Pequenas escolhas diárias, grandes transformações.</p>
      </header>

      <section class="patient-box">
        <span>PACIENTE</span>
        <strong>${escapeHtml(paciente)}</strong>
      </section>

      <form id="formPaciente" novalidate>
        ${cardTexto(1, "ONDE EU ESTOU HOJE", "Eu percebi que:", "ondeEstou", "Conte um pouco sobre como você está hoje...")}
        ${cardTexto(2, "MEU PRINCIPAL OBSTÁCULO", "O que mais está me impedindo de avançar agora:", "obstaculo")}
        ${cardTexto(3, "MINHA PRIORIDADE", "Nos próximos 30 dias, meu foco será:", "prioridade")}

        <div class="section-title">4. MINHAS 3 AÇÕES PARA OS PRÓXIMOS 30 DIAS</div>

        ${acaoCard(
          "1. ORGANIZAR",
          "organizar",
          [
            "Definir horários das refeições",
            "Planejar o que vou comer",
            "Deixar opções saudáveis disponíveis",
            "Organizar minhas compras"
          ],
          "purple"
        )}

        ${acaoCard(
          "2. CUIDAR",
          "cuidar",
          [
            "Escolher alimentos reais",
            "Beber mais água",
            "Comer com atenção",
            "Dormir melhor",
            "Me movimentar"
          ],
          "gold"
        )}

        ${acaoCard(
          "3. PREPARAR",
          "preparar",
          [
            "Ter um plano para os dias corridos",
            "Preparar marmitas",
            "Ter um plano B para imprevistos",
            "Definir estratégias para momentos difíceis"
          ],
          "purple"
        )}

        <section class="form-card">
          ${tituloNumerado(5, "MEU PLANO B")}
          ${textareaCampo("Quando algo inesperado acontecer, meu plano será:", "planoB")}
          ${textareaCampo("Quando eu sair da rotina:", "foraRotina")}
          <div class="tip-box">
            ♥ Se eu não conseguir cumprir, eu não preciso esperar segunda-feira. Vou retomar na próxima oportunidade.
          </div>
        </section>

        <section class="form-card">
          ${tituloNumerado(6, "MINHA SEMANA 1")}
          ${textareaCampo("Nesta semana, minha prioridade é:", "semanaPrioridade", 1000)}
          ${textareaCampo("Uma coisa que vou preparar:", "semanaPreparar", 1000)}
          ${textareaCampo("Uma coisa que vou observar:", "semanaObservar", 1000)}
          ${textareaCampo("Uma coisa que vou evitar fazer por conta própria:", "semanaEvitar", 1000)}
        </section>

        <section class="form-card">
          ${tituloNumerado(7, "COMO VOU SABER QUE ESTOU AVANÇANDO?")}
          <p class="helper-text">Marque o que faz sentido para você:</p>
          ${checkboxAvanco("Menos desconforto")}
          ${checkboxAvanco("Melhor funcionamento intestinal")}
          ${checkboxAvanco("Mais organização")}
          ${checkboxAvanco("Menos fome desorganizada")}
          ${checkboxAvanco("Mais energia")}
          ${checkboxAvanco("Melhor sono")}
          ${checkboxAvanco("Mais confiança")}
          ${checkboxAvanco("Conseguir cumprir minha rotina")}
          ${checkboxAvanco("Conseguir retomar depois de um imprevisto")}
          <label class="field-label" for="outroAvanco">Outro:</label>
          <input id="outroAvanco" class="field-control" type="text" maxlength="500">
        </section>

        <section class="form-card commitment-card">
          <h2 class="commitment-title">MEU COMPROMISSO</h2>
          <p class="commitment-text">
            Não preciso fazer tudo perfeito.<br>
            Preciso saber qual é o próximo passo. ♥
          </p>
          ${textareaCampo("Meu primeiro passo será:", "primeiroPasso")}
          <label class="field-label" for="dataCompromisso">Data:</label>
          <input id="dataCompromisso" class="field-control" type="date">
        </section>

        <section class="final-reminder">
          <strong>Lembre-se!</strong>
          <p>Não é sobre perfeição.<br>É sobre consistência, escolhas e constância.</p>
          <em>Um dia de cada vez, no seu ritmo!</em>
        </section>

        <div id="erroEnvio" class="alert error hidden"></div>

        <button id="btnEnviar" class="button send-button" type="submit">
          Enviar formulário
        </button>

        <p class="single-use-warning">
          Após o envio, este formulário não poderá ser alterado nem preenchido novamente.
        </p>
      </form>

      <footer class="footer-brand">
        <div class="brand-signature">Grazielle Matos</div>
        <div class="brand-subtitle">NUTRICIONISTA</div>
      </footer>
    </div>
  `;
}

function coletarFormulario1() {
  const avancos = Array.from(
    document.querySelectorAll('input[name="avanco"]:checked')
  ).map(item => item.value);

  return {
    onde_estou: valor("ondeEstou"),
    obstaculo: valor("obstaculo"),
    prioridade: valor("prioridade"),
    organizar: valor("organizar"),
    cuidar: valor("cuidar"),
    preparar: valor("preparar"),
    plano_b: valor("planoB"),
    fora_rotina: valor("foraRotina"),
    semana_prioridade: valor("semanaPrioridade"),
    semana_preparar: valor("semanaPreparar"),
    semana_observar: valor("semanaObservar"),
    semana_evitar: valor("semanaEvitar"),
    avancos,
    outro_avanco: valor("outroAvanco"),
    primeiro_passo: valor("primeiroPasso"),
    data_compromisso: valor("dataCompromisso")
  };
>>>>>>> bf6d5538731ba43065b6986d40d549da19de86ae
}

/* ============================================================
   FORMULÁRIO 2 - PRÉ-CONSULTA: ROTA DA MULHER REAL
   ============================================================ */
function renderFormulario2() {
  document.title = "Pré-Consulta - Rota da Mulher Real | Grazielle Matos";
  app.innerHTML = `
    <div class="form-page preconsulta-page">
      <header class="hero preconsulta-hero">
        <div class="hero-small">PRÉ-CONSULTA</div>
        <div class="hero-main">ROTA</div>
        <div class="hero-script">da Mulher Real</div>
        <div class="gold-line"></div>
        <p>Para eu entender onde você está antes de definirmos os próximos passos.</p>
      </header>

      <form id="formPaciente" novalidate>
        <section class="form-card identity-card">
          <h2 class="action-title">SOBRE VOCÊ</h2>
          ${inputCampo("Nome completo *", "nomeCliente", "text", 150, "Preencha seu nome")}
          <div class="field-grid">
            ${inputCampo("Idade", "idade", "number", 3)}
            ${inputCampo("Data", "dataPreConsulta", "date")}
          </div>
          ${inputCampo("Profissão", "profissao")}
          ${inputCampo("Contato", "contato", "tel")}
        </section>

        ${secaoPreConsulta(1, "POR QUE VOCÊ ESTÁ AQUI?", `
          ${textareaCampo("O que fez você buscar orientação nutricional neste momento?", "motivoBusca")}
          ${grupoOpcoes("Qual é seu principal objetivo hoje?", "objetivo", ["Emagrecimento", "Hipertrofia/ganho de massa", "Reeducação alimentar", "Melhorar sintomas digestivos", "Melhorar energia/disposição", "Organizar minha alimentação", "Melhorar exames/saúde metabólica"])}
          ${inputCampo("Outro objetivo", "objetivoOutro")}
          ${textareaCampo("Se pudéssemos melhorar apenas uma coisa primeiro, seria:", "primeiraMelhoria")}
        `)}

        ${secaoPreConsulta(2, "SUA ROTINA REAL", `
          ${textareaCampo("Como é um dia comum para você?", "diaComum")}
          <div class="field-grid">${inputCampo("Horário que acorda", "horaAcorda", "time")}${inputCampo("Horário que dorme", "horaDorme", "time")}</div>
          ${inputCampo("Trabalho/estudo", "trabalhoEstudo")}${inputCampo("Atividade física", "atividadeFisica")}
          ${escalaCampo("Como você avalia sua rotina atualmente?", "notaRotina", "0 = muito desorganizada | 10 = muito organizada")}
          ${grupoOpcoes("O que mais dificulta sua alimentação?", "dificuldadesAlimentacao", ["Falta de tempo", "Cansaço", "Trabalho", "Filhos/família", "Falta de planejamento", "Falta de alimentos disponíveis", "Comer fora", "Fim de semana", "Sono irregular", "Estresse"])}
          ${inputCampo("Outro", "dificuldadeOutro")}
        `)}

        ${secaoPreConsulta(3, "COMO VOCÊ ESTÁ COMENDO?", `
          <p class="helper-text">Em um dia habitual, como costuma ser:</p>
          ${textareaCampo("Café da manhã", "cafeManha", 1000)}${textareaCampo("Lanche", "lancheManha", 1000)}
          ${textareaCampo("Almoço", "almoco", 1000)}${textareaCampo("Lanche da tarde", "lancheTarde", 1000)}
          ${textareaCampo("Jantar", "jantar", 1000)}${textareaCampo("Ceia", "ceia", 1000)}
          ${grupoOpcoes("Você costuma:", "habitosAlimentares", ["Pular refeições", "Ficar muitas horas sem comer", "Comer rapidamente", "Comer fora", "Beliscar entre refeições", "Comer mais à noite", "Ter dificuldade para perceber fome/saciedade", "Fazer refeições em horários muito diferentes"])}
          ${inputCampo("Outro", "habitoOutro")}${textareaCampo("Como são normalmente seus finais de semana?", "finaisSemana")}
        `)}

        ${secaoPreConsulta(4, "COMPRAS E AMBIENTE ALIMENTAR", `
          ${grupoOpcoes("Quem normalmente faz as compras da casa?", "responsavelCompras", ["Eu", "Cônjuge", "Outra pessoa", "Dividimos"], "radio")}
          ${inputCampo("Quem prepara as refeições?", "responsavelRefeicoes")}
          ${grupoOpcoes("Você costuma planejar as compras?", "planejaCompras", ["Sim", "Às vezes", "Não"], "radio")}
          ${grupoOpcoes("Na sua casa, você geralmente encontra opções que facilitam sua alimentação?", "opcoesEmCasa", ["Sim", "Algumas", "Não"], "radio")}
          ${textareaCampo("O que mais dificulta sua organização em casa?", "dificuldadeOrganizacao")}
        `)}

        ${secaoPreConsulta(5, "CORPO E SINTOMAS", `
          ${grupoOpcoes("Você apresenta atualmente algum destes sintomas?", "sintomas", ["Gases", "Distensão/inchaço abdominal", "Dor abdominal", "Azia/refluxo", "Náuseas", "Constipação", "Diarreia", "Alterações nas fezes", "Fome excessiva", "Cansaço", "Alterações de sono"])}
          ${inputCampo("Outro sintoma", "sintomaOutro")}${textareaCampo("Qual é o sintoma que mais incomoda?", "sintomaPrincipal")}
          ${grupoOpcoes("Quando costuma acontecer?", "quandoSintoma", ["Antes das refeições", "Depois das refeições", "À noite", "Ao acordar", "Em situações específicas", "Não sei identificar"])}
          ${grupoOpcoes("Você relaciona esse sintoma a algum alimento?", "relacaoAlimento", ["Sim", "Não", "Não sei"], "radio")}
          ${inputCampo("Se sim, qual?", "alimentoRelacionado")}
          <div class="tip-box">Não é necessário retirar alimentos por conta própria para responder este questionário.</div>
        `)}

        ${secaoPreConsulta(6, "SAÚDE E HISTÓRICO CLÍNICO", `
          ${grupoOpcoes("Você possui ou já teve alguma condição de saúde diagnosticada?", "condicoesSaude", ["Hipertensão", "Diabetes tipo 1", "Diabetes tipo 2", "Dislipidemia/colesterol elevado", "Doença gastrointestinal", "Gastrite", "Esofagite/refluxo", "Síndrome do intestino irritável", "Doença da tireoide", "Doença renal", "Doença hepática", "Nenhuma"])}
          ${inputCampo("Outra condição", "condicaoOutra")}
          ${grupoOpcoes("Já passou por cirurgia importante?", "cirurgia", ["Não", "Sim"], "radio")}${inputCampo("Se sim, qual?", "cirurgiaQual")}
          ${textareaCampo("Possui alguma alergia ou intolerância diagnosticada?", "alergiaIntolerancia")}
          ${textareaCampo("Existe alguma suspeita de reação a alimentos ainda não investigada?", "suspeitaReacao")}
        `)}

        ${secaoPreConsulta(7, "MEDICAMENTOS E SUPLEMENTOS", `
          ${grupoOpcoes("Usa atualmente algum medicamento?", "usaMedicamento", ["Não", "Sim"], "radio")}
          ${textareaCampo("Nome / dose / frequência, se souber:", "medicamentosDetalhes")}
          ${textareaCampo("Usa vitaminas, minerais, fitoterápicos ou outros suplementos?", "suplementos")}
          ${grupoOpcoes("Houve alguma mudança recente de medicamento?", "mudancaMedicamento", ["Não", "Sim"], "radio")}${inputCampo("Se sim, qual?", "mudancaQual")}
        `)}

        ${secaoPreConsulta(8, "HISTÓRIA FAMILIAR", `
          ${grupoOpcoes("Algum familiar próximo possui ou teve:", "historicoFamiliar", ["Diabetes", "Hipertensão", "Obesidade", "Doença cardiovascular", "Colesterol elevado", "Doença da tireoide", "Doença gastrointestinal", "Câncer"])}
          ${inputCampo("Outra condição relevante", "historicoOutro")}${textareaCampo("Quem e qual condição?", "familiarCondicao")}
        `)}

        ${secaoPreConsulta(9, "EXAMES", `
          ${grupoOpcoes("Possui exames laboratoriais recentes?", "examesRecentes", ["Sim", "Não"], "radio")}
          ${grupoOpcoes("Quais?", "exames", ["Hemograma", "Glicemia", "HbA1c", "Perfil lipídico", "TSH/T4", "Ferritina/ferro", "Vitamina B12", "Vitamina D", "Função hepática", "Função renal"])}
          ${inputCampo("Outros exames", "examesOutros")}${inputCampo("Data aproximada dos exames", "dataExames")}
          <div class="tip-box">Os exames serão avaliados em conjunto com história clínica, sinais, sintomas e contexto.</div>
        `)}

        ${secaoPreConsulta(10, "HISTÓRIA COM DIETAS", `
          ${grupoOpcoes("Você já fez dietas ou acompanhamentos nutricionais anteriormente?", "dietasAnteriores", ["Não", "Sim"], "radio")}
          ${textareaCampo("O que já tentou?", "oQueTentou")}${textareaCampo("O que funcionou?", "oQueFuncionou")}
          ${textareaCampo("O que fez você parar ou abandonar?", "motivoAbandono")}${textareaCampo("O que você NÃO quer repetir desta vez?", "naoQuerRepetir")}
        `)}

        ${secaoPreConsulta(11, "O QUE VOCÊ JÁ FAZ BEM?", textareaCampo("O que você já faz bem hoje e gostaria de continuar fazendo?", "fazBem"))}
        ${secaoPreConsulta(12, "SUA EXPECTATIVA PARA A SESSÃO CLAREZA", `
          ${textareaCampo("Ao final da nossa conversa, o que você gostaria de entender melhor?", "expectativaSessao")}
          ${escalaCampo("De 0 a 10, quanto você acredita que está pronta para fazer uma mudança agora?", "prontidao")}
          ${textareaCampo("O que faria essa nota subir um ponto?", "subirNota")}
        `)}
        <section class="form-card commitment-card">
          <h2 class="commitment-title">UMA ÚLTIMA PERGUNTA</h2>
          ${textareaCampo("Se sua alimentação estivesse mais organizada daqui a 30 dias, o que estaria diferente na sua vida?", "mudanca30Dias")}
        </section>

        <div id="erroEnvio" class="alert error hidden"></div>
        <button id="btnEnviar" class="button send-button" type="submit">Enviar formulário</button>
        <p class="single-use-warning">Após o envio, este formulário não poderá ser alterado nem preenchido novamente.</p>
      </form>
      <footer class="footer-brand"><div class="brand-signature">Grazielle Matos</div><div class="brand-subtitle">NUTRICIONISTA</div></footer>
    </div>`;
}

function coletarFormulario2() {
  const campos = {
    paciente: "nomeCliente", idade: "idade", data: "dataPreConsulta", profissao: "profissao", contato: "contato",
    motivo_busca: "motivoBusca", objetivo_outro: "objetivoOutro", primeira_melhoria: "primeiraMelhoria", dia_comum: "diaComum",
    hora_acorda: "horaAcorda", hora_dorme: "horaDorme", trabalho_estudo: "trabalhoEstudo", atividade_fisica: "atividadeFisica",
    nota_rotina: "notaRotina", dificuldade_outro: "dificuldadeOutro", cafe_manha: "cafeManha", lanche_manha: "lancheManha",
    almoco: "almoco", lanche_tarde: "lancheTarde", jantar: "jantar", ceia: "ceia", habito_outro: "habitoOutro",
    finais_semana: "finaisSemana", responsavel_refeicoes: "responsavelRefeicoes", dificuldade_organizacao: "dificuldadeOrganizacao",
    sintoma_outro: "sintomaOutro", sintoma_principal: "sintomaPrincipal", alimento_relacionado: "alimentoRelacionado",
    condicao_outra: "condicaoOutra", cirurgia_qual: "cirurgiaQual", alergia_intolerancia: "alergiaIntolerancia",
    suspeita_reacao: "suspeitaReacao", medicamentos_detalhes: "medicamentosDetalhes", suplementos: "suplementos",
    mudanca_qual: "mudancaQual", historico_outro: "historicoOutro", familiar_condicao: "familiarCondicao",
    exames_outros: "examesOutros", data_exames: "dataExames", o_que_tentou: "oQueTentou", o_que_funcionou: "oQueFuncionou",
    motivo_abandono: "motivoAbandono", nao_quer_repetir: "naoQuerRepetir", faz_bem: "fazBem",
    expectativa_sessao: "expectativaSessao", prontidao: "prontidao", subir_nota: "subirNota", mudanca_30_dias: "mudanca30Dias"
  };
  const respostas = Object.fromEntries(Object.entries(campos).map(([campo, id]) => [campo, valor(id)]));
  ["objetivo", "dificuldadesAlimentacao", "habitosAlimentares", "responsavelCompras", "planejaCompras", "opcoesEmCasa", "sintomas", "quandoSintoma", "relacaoAlimento", "condicoesSaude", "cirurgia", "usaMedicamento", "mudancaMedicamento", "historicoFamiliar", "examesRecentes", "exames", "dietasAnteriores"].forEach(nome => {
    respostas[camelParaSnake(nome)] = valoresMarcados(nome);
  });
  return respostas;
}

function validarFormulario2(respostas) {
  return respostas.paciente.length < 2 ? "Por favor, informe seu nome completo antes de enviar." : "";
}

function secaoPreConsulta(numero, titulo, conteudo) {
  return `<section class="form-card preconsulta-card">${tituloNumerado(numero, titulo)}${conteudo}</section>`;
}

function inputCampo(label, id, type = "text", maxlength = 500, placeholder = "") {
  return `<label class="field-label" for="${id}">${escapeHtml(label)}</label><input id="${id}" class="field-control" type="${type}" maxlength="${maxlength}" placeholder="${escapeHtml(placeholder)}">`;
}

function grupoOpcoes(label, nome, opcoes, tipo = "checkbox") {
  return `<fieldset class="option-group"><legend class="field-label">${escapeHtml(label)}</legend>${opcoes.map(opcao => `<label class="check-row"><input type="${tipo}" name="${nome}" value="${escapeHtml(opcao)}"><span>${escapeHtml(opcao)}</span></label>`).join("")}</fieldset>`;
}

function escalaCampo(label, id, ajuda = "0 = nada | 10 = totalmente") {
  return `<label class="field-label" for="${id}">${escapeHtml(label)}</label><input id="${id}" class="field-control scale-control" type="number" min="0" max="10" step="1"><p class="scale-help">${escapeHtml(ajuda)}</p>`;
}

function valoresMarcados(nome) {
  const itens = Array.from(document.querySelectorAll(`input[name="${nome}"]:checked`)).map(item => item.value);
  return document.querySelector(`input[name="${nome}"]`)?.type === "radio" ? (itens[0] || "") : itens;
}

function camelParaSnake(texto) {
  return texto.replace(/[A-Z]/g, letra => `_${letra.toLowerCase()}`);
}

/* ============================================================
<<<<<<< HEAD
   COMPONENTES DE HTML
   ============================================================ */
function cardTexto(numero, titulo, label, id, placeholder = "") {
  return `
    <section class="form-card">
      ${tituloNumerado(numero, titulo)}
      ${textareaCampo(label, id, 1500, placeholder)}
    </section>
  `;
}

function tituloNumerado(numero, titulo) {
  return `
    <div class="number-title">
      <span class="number-badge">${numero}</span>
      <h2>${escapeHtml(titulo)}</h2>
    </div>
  `;
}

function textareaCampo(label, id, maxlength = 1500, placeholder = "") {
  return `
    <label class="field-label" for="${id}">${escapeHtml(label)}</label>
    <textarea
      id="${id}"
      class="field-control textarea-control"
      maxlength="${maxlength}"
      placeholder="${escapeHtml(placeholder)}"
    ></textarea>
  `;
}

function acaoCard(titulo, id, exemplos, cor) {
  const itens = exemplos.map(item => `<li>${escapeHtml(item)}</li>`).join("");
  return `
    <section class="form-card action-card ${cor === "gold" ? "action-gold" : "action-purple"}">
      <h2 class="action-title">${escapeHtml(titulo)}</h2>
      ${textareaCampo("Eu vou:", id)}
      <div class="examples-box ${cor === "gold" ? "examples-gold" : ""}">
        <strong>EXEMPLOS</strong>
        <ul>${itens}</ul>
      </div>
    </section>
  `;
}

function checkboxAvanco(texto) {
  return `
    <label class="check-row">
      <input type="checkbox" name="avanco" value="${escapeHtml(texto)}">
      <span>${escapeHtml(texto)}</span>
    </label>
  `;
}

/* ============================================================
   TELAS DE STATUS
   ============================================================ */
function renderTelaCarregando() {
  app.innerHTML = `
    <section class="status-page">
      <div class="spinner"></div>
      <p>Carregando seu formulário...</p>
    </section>
  `;
}

function renderTelaInvalida() {
  document.title = "Link inválido";
  app.innerHTML = `
    <section class="status-page">
      <div class="status-icon">!</div>
      <h1>Link inválido</h1>
      <p>Este endereço não corresponde a um formulário válido.</p>
    </section>
  `;
}

function renderTelaErroConexao() {
  app.innerHTML = `
    <section class="status-page">
      <div class="status-icon">!</div>
      <h1>Não foi possível carregar</h1>
      <p>Verifique sua conexão e tente abrir o link novamente.</p>
    </section>
  `;
}

function renderTelaConcluida(paciente, titulo) {
  document.title = "Formulário já preenchido";
  app.innerHTML = `
    <section class="status-page">
      <div class="status-icon success">✓</div>
      <h1>Formulário já preenchido</h1>
      ${paciente ? `<p><strong>${escapeHtml(paciente)}</strong></p>` : ""}
      <p>“${escapeHtml(titulo)}” já foi enviado e não pode ser preenchido novamente.</p>
      <div class="brand-signature status-signature">Grazielle Matos</div>
    </section>
  `;
}

function renderTelaSucesso(titulo) {
  document.title = "Formulário enviado";
  app.innerHTML = `
    <section class="status-page">
      <div class="status-icon success">✓</div>
      <h1>Formulário enviado!</h1>
      <p>Suas respostas de “${escapeHtml(titulo)}” foram registradas com sucesso.</p>
      <p>Este link não poderá ser utilizado para um novo preenchimento.</p>
      <div class="brand-signature status-signature">Grazielle Matos</div>
    </section>
  `;
}

/* ============================================================
   UTILITÁRIOS
   ============================================================ */
function valor(id) {
  const elemento = document.getElementById(id);
  return elemento ? elemento.value.trim() : "";
}

function normalizarEspacos(texto) {
  return texto.trim().replace(/\s+/g, " ");
}

function escapeHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
=======
   COMPONENTES DE HTML
   ============================================================ */
function cardTexto(numero, titulo, label, id, placeholder = "") {
  return `
    <section class="form-card">
      ${tituloNumerado(numero, titulo)}
      ${textareaCampo(label, id, 1500, placeholder)}
    </section>
  `;
}

function tituloNumerado(numero, titulo) {
  return `
    <div class="number-title">
      <span class="number-badge">${numero}</span>
      <h2>${escapeHtml(titulo)}</h2>
    </div>
  `;
}

function textareaCampo(label, id, maxlength = 1500, placeholder = "") {
  return `
    <label class="field-label" for="${id}">${escapeHtml(label)}</label>
    <textarea
      id="${id}"
      class="field-control textarea-control"
      maxlength="${maxlength}"
      placeholder="${escapeHtml(placeholder)}"
    ></textarea>
  `;
}

function acaoCard(titulo, id, exemplos, cor) {
  const itens = exemplos.map(item => `<li>${escapeHtml(item)}</li>`).join("");
  return `
    <section class="form-card action-card ${cor === "gold" ? "action-gold" : "action-purple"}">
      <h2 class="action-title">${escapeHtml(titulo)}</h2>
      ${textareaCampo("Eu vou:", id)}
      <div class="examples-box ${cor === "gold" ? "examples-gold" : ""}">
        <strong>EXEMPLOS</strong>
        <ul>${itens}</ul>
      </div>
    </section>
  `;
}

function checkboxAvanco(texto) {
  return `
    <label class="check-row">
      <input type="checkbox" name="avanco" value="${escapeHtml(texto)}">
      <span>${escapeHtml(texto)}</span>
    </label>
  `;
}

/* ============================================================
   TELAS DE STATUS
   ============================================================ */
function renderTelaCarregando() {
  app.innerHTML = `
    <section class="status-page">
      <div class="spinner"></div>
      <p>Carregando seu formulário...</p>
    </section>
  `;
}

function renderTelaInvalida() {
  document.title = "Link inválido";
  app.innerHTML = `
    <section class="status-page">
      <div class="status-icon">!</div>
      <h1>Link inválido</h1>
      <p>Este endereço não corresponde a um formulário válido.</p>
    </section>
  `;
}

function renderTelaErroConexao() {
  app.innerHTML = `
    <section class="status-page">
      <div class="status-icon">!</div>
      <h1>Não foi possível carregar</h1>
      <p>Verifique sua conexão e tente abrir o link novamente.</p>
    </section>
  `;
}

function renderTelaConcluida(paciente, titulo) {
  document.title = "Formulário já preenchido";
  app.innerHTML = `
    <section class="status-page">
      <div class="status-icon success">✓</div>
      <h1>Formulário já preenchido</h1>
      ${paciente ? `<p><strong>${escapeHtml(paciente)}</strong></p>` : ""}
      <p>“${escapeHtml(titulo)}” já foi enviado e não pode ser preenchido novamente.</p>
      <div class="brand-signature status-signature">Grazielle Matos</div>
    </section>
  `;
}

function renderTelaSucesso(titulo) {
  document.title = "Formulário enviado";
  app.innerHTML = `
    <section class="status-page">
      <div class="status-icon success">✓</div>
      <h1>Formulário enviado!</h1>
      <p>Suas respostas de “${escapeHtml(titulo)}” foram registradas com sucesso.</p>
      <p>Este link não poderá ser utilizado para um novo preenchimento.</p>
      <div class="brand-signature status-signature">Grazielle Matos</div>
    </section>
  `;
}

/* ============================================================
   UTILITÁRIOS
   ============================================================ */
function valor(id) {
  const elemento = document.getElementById(id);
  return elemento ? elemento.value.trim() : "";
}

function normalizarEspacos(texto) {
  return texto.trim().replace(/\s+/g, " ");
}

function escapeHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
>>>>>>> bf6d5538731ba43065b6986d40d549da19de86ae
