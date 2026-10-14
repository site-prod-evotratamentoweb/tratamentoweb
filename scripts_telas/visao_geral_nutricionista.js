import { FuncoesCompartilhadas } from './0_home.js';
import { MenuProfissional } from './0_complementos_menu_profissional.js';
import { criarNavegador } from './0_complementos_menu_navegacao.js';
import { db, collection, getDocs, query, where } from '../0_firebase_api_config.js';

const REFEICOES = [
    ['breakfast', 'Café da manhã'],
    ['morningSnack', 'Lanche da manhã'],
    ['lunch', 'Almoço'],
    ['afternoonSnack', 'Lanche da tarde'],
    ['dinner', 'Jantar'],
    ['supper', 'Ceia']
];

export class VisaoGeralNutricionista {
    constructor(userInfo, pacientesList = []) {
        this.userInfo = userInfo;
        this.funcoes = FuncoesCompartilhadas;
        this.pacientesList = pacientesList || [];
        this.selectedPaciente = null;
        this.menu = null;
        this.navegador = criarNavegador(userInfo, this.pacientesList);
        this.dados = this.criarDadosVazios();
        this.graficos = [];
    }

    criarDadosVazios() {
        return { avaliacoes: [], anamneses: [], exames: [], consumo: [], calculos: [], planos: [] };
    }

    render() {
        localStorage.setItem('activeModule', 'visao_geral_nutricional');
        const app = document.getElementById('app');
        app.innerHTML = this.renderHTML();
        this.menu = new MenuProfissional(this.userInfo, (module) => this.navegador.navegarPara(module), 'visao_geral_nutricional');
        const menuContainer = document.getElementById('menuContainer');
        if (menuContainer) menuContainer.innerHTML = this.menu.render();
        this.menu.attachEvents();
        this.attachEvents();
        void this.carregarPacientes();
    }

    renderHTML() {
        return `
            <div class="dashboard-container" style="height:calc(100vh - 24px);max-height:calc(100vh - 24px);margin:12px auto;display:flex;flex-direction:column;">
                <div id="menuContainer"></div>
                <main class="main-content" style="flex:1;min-height:0;overflow-y:auto;padding:14px 20px 90px;">
                    ${this.renderNavegacaoAvaliacao()}
                    <section class="info-section" style="margin-bottom:20px;">
                        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap;">
                            <label style="display:grid;gap:6px;width:min(100%,420px);font-weight:700;color:#334155;">
                                Paciente
                                <select id="pacienteVisaoGeral" style="width:100%;padding:10px 14px;border-radius:10px;border:2px solid #e2e8f0;background:white;">
                                    <option value="">-- Selecione um paciente --</option>
                                </select>
                            </label>
                            <button id="btnExportarVisaoGeral" type="button" disabled style="padding:10px 16px;border:none;border-radius:9px;background:#1a237e;color:white;font-weight:700;cursor:pointer;opacity:.55;">Imprimir / Exportar PDF</button>
                        </div>
                        <div id="pacienteResumoVisaoGeral" style="display:none;margin-top:14px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:9px;"></div>
                    </section>
                    <div id="conteudoVisaoGeral">
                        <section class="evaluation-section" style="text-align:center;padding:42px 20px;color:#64748b;">
                            <div style="font-size:42px;margin-bottom:10px;">☷</div>
                            <h3 style="color:#1a237e;margin:0 0 6px;">Visão consolidada do paciente</h3>
                            <p style="margin:0;">Selecione um paciente para consultar resumos, evolução e documentos.</p>
                        </section>
                    </div>
                </main>
            </div>
            <div id="modalExportarVisaoGeral" style="display:none;position:fixed;inset:0;z-index:3500;background:rgba(15,23,42,.62);padding:16px;align-items:center;justify-content:center;">
                <div style="width:min(94vw,620px);max-height:90vh;overflow:auto;background:white;border-radius:16px;box-shadow:0 24px 70px rgba(15,23,42,.35);">
                    <header style="background:#1a237e;color:white;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
                        <div><strong style="font-size:17px;">Exportar dados do paciente</strong><div style="font-size:12px;color:#c7d2fe;margin-top:3px;">Escolha o que fará parte do documento.</div></div>
                        <button id="btnFecharExportacaoGeral" type="button" aria-label="Fechar" style="width:34px;height:34px;border:none;border-radius:8px;background:rgba(255,255,255,.18);color:white;font-size:18px;cursor:pointer;">×</button>
                    </header>
                    <div style="padding:18px;display:grid;gap:10px;">
                        ${this.renderOpcaoExportacao('resumo', 'Visão geral e gráficos', 'Resumo atual e tendências do peso, IMC e massa muscular.', true)}
                        ${this.renderOpcaoExportacao('antropometria', 'Histórico antropométrico', 'Todas as avaliações e dados de composição corporal.', true)}
                        ${this.renderOpcaoExportacao('anamnese', 'Anamnese clínica', 'Histórico clínico, exame físico, estilo de vida e observações.', true)}
                        ${this.renderOpcaoExportacao('exames', 'Exames laboratoriais', 'Marcadores, resultados extraídos e análises registradas.', true)}
                        ${this.renderOpcaoExportacao('consumo', 'Consumo alimentar', 'Hábitos, hidratação, preferências, restrições e suplementos.', true)}
                        ${this.renderOpcaoExportacao('calculos', 'Cálculos energéticos', 'GET, VET e distribuição de macronutrientes.', true)}
                        ${this.renderOpcaoExportacao('planos', 'Planos alimentares', 'Plano atual e histórico completo de refeições.', true)}
                        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:8px;padding-top:14px;border-top:1px solid #e2e8f0;">
                            <button id="btnAlternarSecoesExportacao" type="button" style="padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;background:white;color:#334155;font-weight:700;cursor:pointer;">Desmarcar todas</button>
                            <div style="display:flex;gap:9px;">
                                <button id="btnCancelarExportacaoGeral" type="button" style="padding:9px 14px;border:none;border-radius:8px;background:#e2e8f0;color:#334155;cursor:pointer;">Cancelar</button>
                                <button id="btnGerarPdfVisaoGeral" type="button" style="padding:9px 16px;border:none;border-radius:8px;background:#1a237e;color:white;font-weight:700;cursor:pointer;">Gerar documento</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    renderOpcaoExportacao(valor, titulo, descricao, marcada = false) {
        return `<label style="display:flex;gap:11px;align-items:flex-start;padding:11px 12px;border:1px solid #dbe3ef;border-radius:10px;cursor:pointer;background:#f8fafc;">
            <input type="checkbox" name="secaoExportacaoGeral" value="${valor}" ${marcada ? 'checked' : ''} style="margin-top:3px;accent-color:#1a237e;">
            <span><strong style="display:block;color:#1a237e;">${titulo}</strong><small style="display:block;color:#64748b;margin-top:3px;line-height:1.35;">${descricao}</small></span>
        </label>`;
    }

    renderNavegacaoAvaliacao() {
        const botao = (id, rotulo, ativo = false) => `<button id="${id}" type="button" style="padding:9px 14px;border:1px solid ${ativo ? '#1a237e' : '#cbd5e1'};border-radius:8px;background:${ativo ? '#1a237e' : 'white'};color:${ativo ? 'white' : '#334155'};font-weight:700;cursor:pointer;">${rotulo}</button>`;
        return `<section style="margin-bottom:16px;background:white;border:1px solid #dbe3ef;border-radius:12px;padding:12px 14px;">
            <div style="margin-bottom:10px;"><h2 style="margin:0;color:#1a237e;font-size:21px;">Avaliação Nutricional</h2><p style="margin:3px 0 0;color:#64748b;font-size:13px;">Informações clínicas organizadas por etapa da consulta.</p></div>
            <nav style="display:flex;gap:8px;flex-wrap:wrap;" aria-label="Seções da avaliação nutricional">
                ${botao('abaVisaoGeral', 'Visão Geral', true)}
                ${botao('abaAnamneses', 'Anamnese Clínica')}
                ${botao('abaMedidasFisicas', 'Avaliação Antropométrica')}
                ${botao('abaExames', 'Exames Laboratoriais')}
                ${botao('abaConsumo', 'Consumo Alimentar')}
            </nav>
        </section>`;
    }

    attachEvents() {
        document.getElementById('abaAnamneses')?.addEventListener('click', () => this.navegador.navegarPara('anamnese'));
        document.getElementById('abaMedidasFisicas')?.addEventListener('click', () => this.navegador.navegarPara('medidas_fisicas'));
        document.getElementById('abaExames')?.addEventListener('click', () => this.navegador.navegarPara('exames_nutricionais'));
        document.getElementById('abaConsumo')?.addEventListener('click', () => this.navegador.navegarPara('medidas_consumo'));

        document.getElementById('pacienteVisaoGeral')?.addEventListener('change', async (event) => {
            const login = event.target.value;
            this.selectedPaciente = this.pacientesList.find((paciente) => paciente.login === login) || null;
            if (!this.selectedPaciente) {
                localStorage.removeItem('avaliacaoNutricionalSelectedPacienteLogin');
                this.dados = this.criarDadosVazios();
                this.renderEstadoInicial();
                return;
            }
            localStorage.setItem('avaliacaoNutricionalSelectedPacienteLogin', login);
            await this.carregarDadosPaciente();
        });

        document.getElementById('btnExportarVisaoGeral')?.addEventListener('click', () => this.abrirExportacao());
        document.getElementById('btnFecharExportacaoGeral')?.addEventListener('click', () => this.fecharExportacao());
        document.getElementById('btnCancelarExportacaoGeral')?.addEventListener('click', () => this.fecharExportacao());
        document.getElementById('modalExportarVisaoGeral')?.addEventListener('click', (event) => {
            if (event.target.id === 'modalExportarVisaoGeral') this.fecharExportacao();
        });
        document.getElementById('btnAlternarSecoesExportacao')?.addEventListener('click', () => this.alternarSecoesExportacao());
        document.getElementById('btnGerarPdfVisaoGeral')?.addEventListener('click', () => this.exportarPdf());
    }

    async carregarPacientes() {
        if (!this.pacientesList.length) {
            this.pacientesList = await this.funcoes.loadPacientesList(this.userInfo.login);
        }
        this.navegador.pacientesList = this.pacientesList;
        const select = document.getElementById('pacienteVisaoGeral');
        if (!select) return;
        this.pacientesList.forEach((paciente) => select.appendChild(new Option(`${paciente.nome} (${paciente.login})`, paciente.login)));
        const salvo = localStorage.getItem('avaliacaoNutricionalSelectedPacienteLogin');
        const pacienteSalvo = this.pacientesList.find((paciente) => paciente.login === salvo);
        if (pacienteSalvo) {
            select.value = pacienteSalvo.login;
            this.selectedPaciente = pacienteSalvo;
            await this.carregarDadosPaciente();
        }
    }

    async buscarColecao(nome, pacienteLogin) {
        const snapshot = await getDocs(query(collection(db, nome), where('paciente_login', '==', pacienteLogin)));
        return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    }

    async carregarDadosPaciente() {
        const login = this.selectedPaciente?.login;
        if (!login) return;
        const conteudo = document.getElementById('conteudoVisaoGeral');
        if (conteudo) conteudo.innerHTML = '<section class="evaluation-section" style="padding:38px;text-align:center;color:#64748b;">Carregando dados consolidados...</section>';
        const [avaliacoes, registros, calculos, planos] = await Promise.allSettled([
            this.funcoes.loadEvaluationsByPatient(login),
            this.buscarColecao('anamneses_nutricionais', login),
            this.buscarColecao('calculos_energeticos', login),
            getDocs(collection(db, 'planos_alimentares', this.userInfo.login, login))
        ]);
        if (this.selectedPaciente?.login !== login) return;

        const registrosLista = registros.status === 'fulfilled' ? registros.value : [];
        const planosLista = planos.status === 'fulfilled'
            ? planos.value.docs.map((item) => ({ id: item.id, ...item.data() }))
            : [];
        const possuiValor = (grupo) => Object.values(grupo || {}).some((valor) => valor !== null && valor !== undefined && String(valor).trim() !== '');
        this.dados = {
            avaliacoes: this.ordenarRegistros(avaliacoes.status === 'fulfilled' ? avaliacoes.value : [], 'data_avaliacao'),
            anamneses: this.ordenarRegistros(registrosLista.filter((item) => !item.tipo_registro || item.tipo_registro === 'anamnese'), 'data_anamnese'),
            exames: this.ordenarRegistros(registrosLista.filter((item) => item.tipo_registro === 'exames' || (!item.tipo_registro && possuiValor(item.exames_laboratoriais))), 'data_anamnese'),
            consumo: this.ordenarRegistros(registrosLista.filter((item) => item.tipo_registro === 'consumo' || (!item.tipo_registro && possuiValor(item.historico_alimentar))), 'data_anamnese'),
            calculos: this.ordenarRegistros(calculos.status === 'fulfilled' ? calculos.value : [], 'data_calculo'),
            planos: this.ordenarRegistros(planosLista, 'data_criacao')
        };
        this.renderPacienteResumo();
        this.renderConteudo();
    }

    ordenarRegistros(registros, campoData) {
        return registros.slice().sort((a, b) => this.obterData(a, campoData) - this.obterData(b, campoData));
    }

    obterData(registro, campoData = '') {
        const valor = registro?.[campoData] || registro?.data_atualizacao || registro?.data_criacao || registro?.timestamp || registro?.id;
        if (valor?.toDate) return valor.toDate();
        const texto = String(valor || '');
        const data = new Date(/^\d{4}-\d{2}-\d{2}$/.test(texto) ? `${texto}T12:00:00` : texto);
        return Number.isNaN(data.getTime()) ? new Date(0) : data;
    }

    formatarData(registro, campoData = '') {
        const data = this.obterData(registro, campoData);
        return data.getTime() ? data.toLocaleDateString('pt-BR') : 'Data não informada';
    }

    ultimo(lista) {
        return lista[lista.length - 1] || null;
    }

    escapeHtml(valor) {
        return String(valor ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
    }

    numero(valor, casas = 1) {
        if (valor === null || valor === undefined || valor === '') return '--';
        const numero = Number(valor);
        return Number.isFinite(numero) ? numero.toLocaleString('pt-BR', { maximumFractionDigits: casas }) : '--';
    }

    renderPacienteResumo() {
        const container = document.getElementById('pacienteResumoVisaoGeral');
        const botao = document.getElementById('btnExportarVisaoGeral');
        if (!container || !this.selectedPaciente) return;
        const item = (rotulo, valor) => `<div style="padding:10px 12px;border:1px solid #e2e8f0;border-radius:9px;background:#f8fafc;"><small style="display:block;color:#64748b;font-weight:700;margin-bottom:3px;">${rotulo}</small><strong style="color:#1f2937;">${this.escapeHtml(valor || '--')}</strong></div>`;
        container.style.display = 'grid';
        container.innerHTML = `${item('Nome', this.selectedPaciente.nome)}${item('Login', this.selectedPaciente.login)}${item('Nascimento', this.funcoes.formatDateToDisplay(this.selectedPaciente.dataNascimento))}${item('Idade', `${this.funcoes.calcularIdade(this.selectedPaciente.dataNascimento) || '--'} anos`)}${item('Sexo', this.selectedPaciente.sexo)}`;
        if (botao) {
            botao.disabled = false;
            botao.style.opacity = '1';
        }
    }

    renderEstadoInicial() {
        this.graficos.forEach((grafico) => grafico?.destroy());
        this.graficos = [];
        const resumo = document.getElementById('pacienteResumoVisaoGeral');
        if (resumo) { resumo.style.display = 'none'; resumo.innerHTML = ''; }
        const botao = document.getElementById('btnExportarVisaoGeral');
        if (botao) { botao.disabled = true; botao.style.opacity = '.55'; }
        const conteudo = document.getElementById('conteudoVisaoGeral');
        if (conteudo) conteudo.innerHTML = '<section class="evaluation-section" style="text-align:center;padding:42px 20px;color:#64748b;"><h3 style="color:#1a237e;margin:0 0 6px;">Visão consolidada do paciente</h3><p style="margin:0;">Selecione um paciente para consultar resumos, evolução e documentos.</p></section>';
    }

    renderResumoCard(titulo, principal, detalhe, cor = '#1a237e') {
        return `<article style="border:1px solid #dbe3ef;border-radius:12px;background:white;padding:14px;border-top:4px solid ${cor};min-height:128px;">
            <small style="color:#64748b;font-weight:800;text-transform:uppercase;letter-spacing:.04em;">${this.escapeHtml(titulo)}</small>
            <div style="font-size:22px;font-weight:800;color:${cor};margin:9px 0 5px;">${this.escapeHtml(principal)}</div>
            <p style="margin:0;color:#64748b;font-size:13px;line-height:1.4;">${this.escapeHtml(detalhe)}</p>
        </article>`;
    }

    renderConteudo() {
        const ultimaAvaliacao = this.ultimo(this.dados.avaliacoes);
        const ultimaAnamnese = this.ultimo(this.dados.anamneses);
        const ultimoExame = this.ultimo(this.dados.exames);
        const ultimoConsumo = this.ultimo(this.dados.consumo);
        const ultimoCalculo = this.ultimo(this.dados.calculos);
        const planoAtual = this.dados.planos.find((plano) => plano.atual === true) || this.ultimo(this.dados.planos);
        const antropometria = ultimaAvaliacao?.dados_antropometricos || {};
        const exame = ultimoExame?.exames_laboratoriais || {};
        const consumo = ultimoConsumo?.historico_alimentar || {};
        const marcadores = Object.values(exame).filter((valor) => valor !== null && valor !== undefined && valor !== '').length;
        const primeiroPeso = this.dados.avaliacoes[0]?.dados_antropometricos?.peso;
        const ultimoPeso = antropometria.peso;
        const variacaoPeso = Number.isFinite(Number(primeiroPeso)) && Number.isFinite(Number(ultimoPeso))
            ? Number(ultimoPeso) - Number(primeiroPeso)
            : null;
        const conteudo = document.getElementById('conteudoVisaoGeral');
        if (!conteudo) return;

        conteudo.innerHTML = `
            <section style="margin-bottom:22px;">
                <div style="display:flex;justify-content:space-between;align-items:end;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
                    <div><h3 style="margin:0;color:#1a237e;">Resumo por área</h3><p style="margin:4px 0 0;color:#64748b;">Informações mais recentes e quantidade de registros.</p></div>
                    <span style="font-size:13px;color:#64748b;">Atualizado com os dados gravados no prontuário</span>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(205px,1fr));gap:11px;">
                    ${this.renderResumoCard('Antropometria', ultimaAvaliacao ? `${this.numero(antropometria.peso)} kg · IMC ${this.numero(antropometria.imc)}` : 'Sem dados', `${this.dados.avaliacoes.length} registro(s)${variacaoPeso === null ? '' : ` · Variação ${variacaoPeso > 0 ? '+' : ''}${this.numero(variacaoPeso)} kg`}`, '#f97316')}
                    ${this.renderResumoCard('Anamnese clínica', ultimaAnamnese ? this.formatarData(ultimaAnamnese, 'data_anamnese') : 'Sem dados', `${this.dados.anamneses.length} registro(s) clínico(s)`, '#6366f1')}
                    ${this.renderResumoCard('Exames laboratoriais', ultimoExame ? `${marcadores} marcador(es)` : 'Sem dados', `${this.dados.exames.length} registro(s) de exames`, '#0ea5e9')}
                    ${this.renderResumoCard('Consumo alimentar', ultimoConsumo ? `${this.numero(consumo.consumo_agua, 0)} ml/dia` : 'Sem dados', `${this.dados.consumo.length} registro(s) alimentares`, '#10b981')}
                    ${this.renderResumoCard('Cálculo energético', ultimoCalculo ? `${this.numero(ultimoCalculo.vet_ajustado, 0)} kcal` : 'Sem dados', `${this.dados.calculos.length} cálculo(s) salvo(s)`, '#8b5cf6')}
                    ${this.renderResumoCard('Plano alimentar', planoAtual ? `${this.numero(planoAtual.meta_calorica, 0)} kcal` : 'Sem plano', `${this.dados.planos.length} plano(s) · ${planoAtual?.atual ? 'Plano atual identificado' : 'Nenhum marcado como atual'}`, '#1a237e')}
                </div>
            </section>
            <section class="evaluation-section" style="margin-bottom:22px;">
                <div class="section-header"><h3 style="margin:0;">Gráficos de evolução</h3></div>
                ${this.dados.avaliacoes.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:12px;">
                    ${this.renderChartCard('Evolução do peso', 'graficoGeralPeso')}
                    ${this.renderChartCard('Evolução do IMC', 'graficoGeralImc')}
                    ${this.renderChartCard('Evolução da massa muscular', 'graficoGeralMassa')}
                </div>` : '<p style="color:#64748b;">Nenhuma avaliação antropométrica disponível para gerar gráficos.</p>'}
            </section>
            ${this.renderRegistrosRecentes()}`;
        this.renderGraficos();
    }

    renderChartCard(titulo, id) {
        return `<article style="border:1px solid #dbe3ef;border-radius:11px;padding:12px;background:white;min-width:0;"><h4 style="margin:0 0 9px;color:#1a237e;">${titulo}</h4><canvas id="${id}" style="width:100%;max-height:250px;"></canvas></article>`;
    }

    renderRegistrosRecentes() {
        const itens = [
            ['Antropometria', this.ultimo(this.dados.avaliacoes), 'data_avaliacao', `${this.dados.avaliacoes.length} registro(s)`],
            ['Anamnese clínica', this.ultimo(this.dados.anamneses), 'data_anamnese', `${this.dados.anamneses.length} registro(s)`],
            ['Exames laboratoriais', this.ultimo(this.dados.exames), 'data_anamnese', `${this.dados.exames.length} registro(s)`],
            ['Consumo alimentar', this.ultimo(this.dados.consumo), 'data_anamnese', `${this.dados.consumo.length} registro(s)`],
            ['Cálculo energético', this.ultimo(this.dados.calculos), 'data_calculo', `${this.dados.calculos.length} registro(s)`],
            ['Plano alimentar', this.dados.planos.find((plano) => plano.atual) || this.ultimo(this.dados.planos), 'data_criacao', `${this.dados.planos.length} plano(s)`]
        ];
        return `<section class="evaluation-section" style="margin-bottom:24px;"><div class="section-header"><h3 style="margin:0;">Registros mais recentes</h3></div><div style="display:grid;gap:8px;margin-top:12px;">${itens.map(([titulo, registro, campo, detalhe]) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 12px;border:1px solid #e2e8f0;border-radius:9px;background:#f8fafc;"><strong style="color:#334155;">${titulo}</strong><span style="color:#64748b;font-size:13px;">${registro ? this.formatarData(registro, campo) : 'Sem registro'} · ${detalhe}</span></div>`).join('')}</div></section>`;
    }

    renderGraficos() {
        this.graficos.forEach((grafico) => grafico?.destroy());
        this.graficos = [];
        if (!this.dados.avaliacoes.length || typeof Chart === 'undefined') {
            if (this.dados.avaliacoes.length) setTimeout(() => this.renderGraficos(), 400);
            return;
        }
        const labels = this.dados.avaliacoes.map((item) => this.formatarData(item, 'data_avaliacao'));
        const configuracoes = [
            ['graficoGeralPeso', 'Peso (kg)', this.dados.avaliacoes.map((item) => item.dados_antropometricos?.peso ?? null), '#f97316'],
            ['graficoGeralImc', 'IMC', this.dados.avaliacoes.map((item) => item.dados_antropometricos?.imc ?? null), '#3b82f6'],
            ['graficoGeralMassa', 'Massa muscular (kg)', this.dados.avaliacoes.map((item) => item.bioimpedancia?.massa_muscular ?? null), '#10b981']
        ];
        configuracoes.forEach(([id, label, valores, cor]) => {
            const contexto = document.getElementById(id)?.getContext('2d');
            if (!contexto) return;
            this.graficos.push(new Chart(contexto, {
                type: 'line',
                data: { labels, datasets: [{ label, data: valores, borderColor: cor, backgroundColor: `${cor}18`, borderWidth: 3, tension: .3, fill: true, spanGaps: true, pointRadius: 4 }] },
                options: { responsive: true, maintainAspectRatio: true, scales: { y: { beginAtZero: false } } }
            }));
        });
    }

    abrirExportacao() {
        if (!this.selectedPaciente) return;
        const modal = document.getElementById('modalExportarVisaoGeral');
        if (modal) modal.style.display = 'flex';
    }

    fecharExportacao() {
        const modal = document.getElementById('modalExportarVisaoGeral');
        if (modal) modal.style.display = 'none';
    }

    alternarSecoesExportacao() {
        const campos = [...document.querySelectorAll('input[name="secaoExportacaoGeral"]')];
        const marcar = campos.some((campo) => !campo.checked);
        campos.forEach((campo) => { campo.checked = marcar; });
        const botao = document.getElementById('btnAlternarSecoesExportacao');
        if (botao) botao.textContent = marcar ? 'Desmarcar todas' : 'Marcar todas';
    }

    secoesSelecionadas() {
        return new Set([...document.querySelectorAll('input[name="secaoExportacaoGeral"]:checked')].map((campo) => campo.value));
    }

    valorPdf(rotulo, valor, unidade = '') {
        const vazio = valor === null || valor === undefined || valor === '';
        return `<div class="field"><span>${this.escapeHtml(rotulo)}</span><strong>${vazio ? '--' : `${this.escapeHtml(valor)}${unidade}`}</strong></div>`;
    }

    renderGraficoPdf(titulo, dados, unidade, cor) {
        const pontosValidos = dados.filter((item) => item.valor !== null && item.valor !== undefined && item.valor !== '' && Number.isFinite(Number(item.valor)));
        if (!pontosValidos.length) return `<article class="chart"><h3>${titulo}</h3><p>Dados ainda não disponíveis.</p></article>`;
        const width = 520;
        const height = 176;
        const pad = 34;
        const valores = pontosValidos.map((item) => Number(item.valor));
        const min = Math.min(...valores);
        const max = Math.max(...valores);
        const range = max - min || 1;
        const pontos = pontosValidos.map((item, index) => ({
            ...item,
            x: pad + index * ((width - pad * 2) / Math.max(1, pontosValidos.length - 1)),
            y: height - pad - ((Number(item.valor) - min) / range) * (height - pad * 2)
        }));
        const caminho = pontos.map((ponto, index) => `${index ? 'L' : 'M'} ${ponto.x.toFixed(1)} ${ponto.y.toFixed(1)}`).join(' ');
        return `<article class="chart"><h3>${titulo}</h3><svg viewBox="0 0 ${width} ${height}"><line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#cbd5e1"/><path d="${caminho}" fill="none" stroke="${cor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${pontos.map((ponto) => `<circle cx="${ponto.x}" cy="${ponto.y}" r="5" fill="${cor}" stroke="white" stroke-width="2"/><text x="${ponto.x}" y="${ponto.y - 10}" text-anchor="middle" font-size="11" fill="#334155">${this.numero(ponto.valor)}${unidade}</text><text x="${ponto.x}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#64748b">${this.escapeHtml(ponto.label)}</text>`).join('')}</svg></article>`;
    }

    renderResumoPdf() {
        const ultima = this.ultimo(this.dados.avaliacoes);
        const dados = ultima?.dados_antropometricos || {};
        const atual = this.dados.planos.find((plano) => plano.atual) || this.ultimo(this.dados.planos);
        const pontos = (campo, grupo = 'dados_antropometricos') => this.dados.avaliacoes.map((item) => ({ label: this.formatarData(item, 'data_avaliacao'), valor: item[grupo]?.[campo] }));
        return `<section><h2 class="section-title">Visão geral</h2><div class="summary-grid">
            ${this.valorPdf('Último peso', dados.peso, ' kg')}${this.valorPdf('Último IMC', dados.imc)}${this.valorPdf('Classificação', dados.classificacao_imc)}${this.valorPdf('Avaliações', this.dados.avaliacoes.length)}${this.valorPdf('Anamneses', this.dados.anamneses.length)}${this.valorPdf('Exames', this.dados.exames.length)}${this.valorPdf('Consumos', this.dados.consumo.length)}${this.valorPdf('Meta do plano atual', atual?.meta_calorica, ' kcal')}
        </div><div class="chart-grid">${this.renderGraficoPdf('Evolução do peso', pontos('peso'), ' kg', '#f97316')}${this.renderGraficoPdf('Evolução do IMC', pontos('imc'), '', '#3b82f6')}${this.renderGraficoPdf('Evolução da massa muscular', pontos('massa_muscular', 'bioimpedancia'), ' kg', '#10b981')}</div></section>`;
    }

    renderAntropometriaPdf() {
        const registros = this.dados.avaliacoes.slice().reverse().map((item) => {
            const dados = item.dados_antropometricos || {};
            const bio = item.bioimpedancia || {};
            return `<article class="record"><h3>${this.formatarData(item, 'data_avaliacao')}</h3><div class="field-grid">${this.valorPdf('Peso', dados.peso, ' kg')}${this.valorPdf('Altura', dados.altura, ' m')}${this.valorPdf('IMC', dados.imc)}${this.valorPdf('Classificação', dados.classificacao_imc)}${this.valorPdf('Perfil', dados.perfil)}${this.valorPdf('Massa muscular', bio.massa_muscular, ' kg')}${this.valorPdf('Gordura corporal', bio.gordura_corporal, '%')}${this.valorPdf('Altura do joelho', dados.altura_joelho, ' cm')}${this.valorPdf('Altura estimada', dados.altura_estimada_chumlea, ' m')}${this.valorPdf('Circunferência da panturrilha', dados.circunferencia_panturrilha, ' cm')}${this.valorPdf('Classificação da panturrilha', dados.classificacao_panturrilha)}</div></article>`;
        }).join('');
        return this.renderSecaoPdf('Histórico antropométrico', registros, 'Nenhuma avaliação antropométrica registrada.');
    }

    renderAnamnesePdf() {
        const registros = this.dados.anamneses.slice().reverse().map((item) => {
            const clinico = item.historico_clinico || {};
            const fisico = item.exame_fisico || {};
            const estilo = item.estilo_vida || {};
            return `<article class="record"><h3>${this.formatarData(item, 'data_anamnese')}</h3><div class="field-grid">${this.valorPdf('Doenças preexistentes', clinico.doencas_preexistentes)}${this.valorPdf('Medicamentos', clinico.medicamentos)}${this.valorPdf('Cirurgias', clinico.cirurgias)}${this.valorPdf('Histórico familiar', clinico.historico_familiar)}${this.valorPdf('Achados do exame físico', fisico.achados_gerais)}${this.valorPdf('Sinais e sintomas', fisico.sintomas_funcionais)}${this.valorPdf('Atividade física', estilo.atividade_fisica)}${this.valorPdf('Sono', estilo.sono)}${this.valorPdf('Hábitos', estilo.habitos)}${this.valorPdf('Estresse', estilo.nivel_estresse)}${this.valorPdf('Observações', item.observacoes)}</div></article>`;
        }).join('');
        return this.renderSecaoPdf('Anamnese clínica', registros, 'Nenhuma anamnese clínica registrada.');
    }

    renderExamesPdf() {
        const registros = this.dados.exames.slice().reverse().map((item) => {
            const exames = item.exames_laboratoriais || {};
            const extraidos = item.documento_exame?.leitura?.resultados || [];
            const padroes = `${this.valorPdf('Glicemia', exames.glicemia, ' mg/dL')}${this.valorPdf('Colesterol total', exames.colesterol_total, ' mg/dL')}${this.valorPdf('HDL', exames.hdl, ' mg/dL')}${this.valorPdf('LDL', exames.ldl, ' mg/dL')}${this.valorPdf('Triglicerídeos', exames.triglicerideos, ' mg/dL')}${this.valorPdf('Hemoglobina glicada', exames.hemoglobina_glicada, '%')}${this.valorPdf('Vitamina D', exames.vitamina_d, ' ng/mL')}${this.valorPdf('Ferritina', exames.ferritina, ' ng/mL')}`;
            const tabela = extraidos.length ? `<table><thead><tr><th>Exame</th><th>Resultado</th><th>Referência</th><th>Status</th></tr></thead><tbody>${extraidos.map((resultado) => `<tr><td>${this.escapeHtml(resultado.nome)}</td><td>${this.escapeHtml(resultado.valor_texto)} ${this.escapeHtml(resultado.unidade || '')}</td><td>${this.escapeHtml(resultado.referencia || '--')}</td><td>${this.escapeHtml(resultado.status || '--')}</td></tr>`).join('')}</tbody></table>` : '';
            return `<article class="record"><h3>${this.formatarData(item, 'data_anamnese')}</h3><div class="field-grid">${padroes}</div>${tabela}${item.analise_ia_exames?.resultado?.resumo ? `<p class="note"><strong>Resumo da análise:</strong> ${this.escapeHtml(item.analise_ia_exames.resultado.resumo)}</p>` : ''}</article>`;
        }).join('');
        return this.renderSecaoPdf('Exames laboratoriais', registros, 'Nenhum exame laboratorial registrado.');
    }

    renderConsumoPdf() {
        const registros = this.dados.consumo.slice().reverse().map((item) => {
            const consumo = item.historico_alimentar || {};
            return `<article class="record"><h3>${this.formatarData(item, 'data_anamnese')}</h3><div class="field-grid">${this.valorPdf('Hábitos alimentares', consumo.habitos_alimentares)}${this.valorPdf('Consumo de água', consumo.consumo_agua, ' ml/dia')}${this.valorPdf('Restrições', consumo.restricoes)}${this.valorPdf('Preferências', consumo.preferencias)}${this.valorPdf('Suplementos', consumo.suplementos)}</div></article>`;
        }).join('');
        return this.renderSecaoPdf('Consumo alimentar', registros, 'Nenhum registro de consumo alimentar.');
    }

    renderCalculosPdf() {
        const registros = this.dados.calculos.slice().reverse().map((item) => `<article class="record"><h3>${this.formatarData(item, 'data_calculo')}</h3><div class="field-grid">${this.valorPdf('Fórmula', item.formula)}${this.valorPdf('Objetivo', item.objetivo)}${this.valorPdf('GEB', item.geb, ' kcal')}${this.valorPdf('GET', item.get, ' kcal')}${this.valorPdf('VET ajustado', item.vet_ajustado, ' kcal')}${this.valorPdf('Proteínas', item.proteinas?.gramas, ' g')}${this.valorPdf('Carboidratos', item.carboidratos?.gramas, ' g')}${this.valorPdf('Lipídios', item.lipidios?.gramas, ' g')}</div></article>`).join('');
        return this.renderSecaoPdf('Cálculos energéticos', registros, 'Nenhum cálculo energético registrado.');
    }

    linhasRefeicao(plano, refeicaoId) {
        const itens = Array.isArray(plano.itens_plano?.[refeicaoId]) ? plano.itens_plano[refeicaoId] : [];
        if (itens.length) return itens.map((item) => {
            const opcoes = Array.isArray(item.opcoes) ? item.opcoes : [];
            const indice = Math.max(0, Math.min(opcoes.length - 1, Number(item.opcaoVisivelIndex || 0)));
            return opcoes[indice]?.texto || item.texto || '';
        }).filter(Boolean);
        return String(plano[refeicaoId] || '').split('\n').map((linha) => linha.trim()).filter(Boolean);
    }

    renderItensRefeicaoPdf(plano, refeicaoId) {
        const itens = Array.isArray(plano.itens_plano?.[refeicaoId]) ? plano.itens_plano[refeicaoId] : [];
        if (!itens.length) {
            const linhas = this.linhasRefeicao(plano, refeicaoId);
            return linhas.length ? `<ul>${linhas.map((linha) => `<li>${this.escapeHtml(linha)}</li>`).join('')}</ul>` : '<p>Sem alimentos cadastrados.</p>';
        }
        return `<div class="food-list">${itens.map((item, itemIndex) => {
            const opcoes = Array.isArray(item.opcoes) && item.opcoes.length ? item.opcoes : [{ texto: item.texto, detalhes: item.detalhes }];
            const selecionada = Math.max(0, Math.min(opcoes.length - 1, Number(item.opcaoVisivelIndex || 0)));
            return `<div class="food-item"><strong>Item ${itemIndex + 1}</strong>${opcoes.map((opcao, opcaoIndex) => {
                const detalhes = opcao.detalhes || {};
                const macros = [
                    detalhes.quantidadeTexto,
                    Number(detalhes.gramas) > 0 ? `${this.numero(detalhes.gramas, 0)} g` : '',
                    Number(detalhes.kcal) > 0 ? `${this.numero(detalhes.kcal, 0)} kcal` : '',
                    Number(detalhes.carboidratos) > 0 ? `${this.numero(detalhes.carboidratos)} g carb.` : '',
                    Number(detalhes.proteinas) > 0 ? `${this.numero(detalhes.proteinas)} g prot.` : '',
                    Number(detalhes.gorduras) > 0 ? `${this.numero(detalhes.gorduras)} g gord.` : ''
                ].filter(Boolean).join(' · ');
                return `<div class="food-option ${opcaoIndex === selecionada ? 'selected' : ''}"><small>${opcaoIndex === selecionada ? 'Selecionado' : `Substituição ${opcaoIndex}`}</small><div>${this.escapeHtml(opcao.texto || '')}</div>${macros ? `<em>${this.escapeHtml(macros)}</em>` : ''}</div>`;
            }).join('')}</div>`;
        }).join('')}</div>`;
    }

    renderPlanosPdf() {
        const planos = this.dados.planos.slice().reverse().map((plano) => `<article class="record meal-plan"><h3>Plano de ${this.formatarData(plano, 'data_criacao')} ${plano.atual ? '<span class="badge">ATUAL</span>' : ''}</h3><div class="field-grid">${this.valorPdf('Meta calórica', plano.meta_calorica, ' kcal')}${this.valorPdf('Profissional', plano.profissional_nome || this.userInfo.nome)}</div><div class="meal-grid">${REFEICOES.map(([id, titulo]) => `<section class="meal"><h4>${titulo}</h4>${this.renderItensRefeicaoPdf(plano, id)}</section>`).join('')}</div>${plano.guidelines ? `<p class="note"><strong>Orientações:</strong> ${this.escapeHtml(plano.guidelines)}</p>` : ''}${plano.restrictions ? `<p class="note"><strong>Restrições:</strong> ${this.escapeHtml(plano.restrictions)}</p>` : ''}${plano.goals ? `<p class="note"><strong>Objetivos:</strong> ${this.escapeHtml(plano.goals)}</p>` : ''}</article>`).join('');
        return this.renderSecaoPdf('Planos alimentares', planos, 'Nenhum plano alimentar registrado.');
    }

    renderSecaoPdf(titulo, conteudo, vazio) {
        return `<section class="page-break"><h2 class="section-title">${titulo}</h2>${conteudo || `<p class="empty">${vazio}</p>`}</section>`;
    }

    exportarPdf() {
        if (!this.selectedPaciente) return;
        const secoes = this.secoesSelecionadas();
        if (!secoes.size) {
            alert('Selecione pelo menos uma seção para exportar.');
            return;
        }
        const pacienteNome = this.selectedPaciente.nome || 'Paciente';
        const fotoProfissional = this.userInfo.foto_perfil_url || this.userInfo.fotoPerfilUrl || this.userInfo.foto || '';
        const conteudo = [
            secoes.has('resumo') ? this.renderResumoPdf() : '',
            secoes.has('antropometria') ? this.renderAntropometriaPdf() : '',
            secoes.has('anamnese') ? this.renderAnamnesePdf() : '',
            secoes.has('exames') ? this.renderExamesPdf() : '',
            secoes.has('consumo') ? this.renderConsumoPdf() : '',
            secoes.has('calculos') ? this.renderCalculosPdf() : '',
            secoes.has('planos') ? this.renderPlanosPdf() : ''
        ].join('');
        const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório nutricional - ${this.escapeHtml(pacienteNome)}</title><style>
            @page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1f2937;margin:0;background:#f8fafc}.page{background:white;padding:14px}.header{display:flex;justify-content:space-between;align-items:center;gap:14px;border-bottom:2px solid #1a237e;padding-bottom:10px;margin-bottom:12px}.brand h1{margin:0 0 4px;color:#1a237e;font-size:25px}.brand p{margin:3px 0;color:#475569;font-size:14px}.prof{display:flex;align-items:center;gap:10px;text-align:right}.prof img{width:62px;height:62px;object-fit:cover;border-radius:50%;border:2px solid #e0e7ff}.prof-name{font-weight:700;color:#1a237e;font-size:15px}.section-title{margin:14px 0 9px;color:#1a237e;font-size:20px;border-bottom:2px solid #e0e7ff;padding-bottom:5px}.page-break{break-before:page;page-break-before:always}.page>section.page-break:first-of-type{break-before:auto;page-break-before:auto}.summary-grid,.field-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.field{border:1px solid #e2e8f0;border-radius:8px;padding:8px;background:#f8fafc;break-inside:avoid}.field span{display:block;color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;margin-bottom:4px}.field strong{font-size:12px;white-space:pre-wrap}.chart-grid{display:grid;gap:8px;margin-top:10px}.chart{border:1px solid #dbe3ef;border-radius:9px;padding:8px;break-inside:avoid}.chart h3{margin:0 0 4px;color:#1a237e;font-size:15px}.chart p{color:#64748b;font-size:12px}.chart svg{display:block;width:100%;height:176px}.record{border:1px solid #dbe3ef;border-radius:10px;padding:10px;margin-bottom:9px;break-inside:avoid}.record h3{margin:0 0 8px;color:#1a237e;font-size:15px}.badge{display:inline-block;padding:3px 7px;border-radius:999px;background:#dcfce7;color:#166534;font-size:9px;margin-left:6px}table{width:100%;border-collapse:collapse;margin-top:8px;font-size:10px}th,td{border:1px solid #dbe3ef;padding:5px;text-align:left}th{background:#eef2ff;color:#1a237e}.meal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:8px}.meal{border:1px solid #dbe3ef;border-radius:8px;overflow:hidden;break-inside:avoid}.meal h4{margin:0;padding:7px 9px;background:#eef2ff;color:#1a237e;font-size:12px}.meal ul{margin:0;padding:7px 10px 8px 23px}.meal li,.meal p{font-size:10px;line-height:1.35;margin:3px 0}.food-list{padding:6px;display:grid;gap:5px}.food-item{font-size:10px;border-left:3px solid #1a237e;padding-left:6px}.food-option{border:1px solid #e2e8f0;border-radius:6px;padding:5px;margin-top:4px}.food-option.selected{border-color:#1a237e;background:#eef2ff}.food-option small{display:block;color:#1a237e;font-weight:700;margin-bottom:2px}.food-option em{display:block;color:#64748b;font-style:normal;font-size:9px;margin-top:3px}.note{border:1px solid #e2e8f0;border-radius:8px;padding:8px;font-size:11px;line-height:1.4;white-space:pre-wrap}.empty{color:#64748b;font-style:italic}.copyright{position:fixed;left:0;bottom:0;color:#64748b;font-size:10px}@media print{body{background:white}.page{padding:0}}
        </style></head><body><main class="page"><header class="header"><div class="brand"><h1>Relatório Nutricional</h1><p><strong>Paciente:</strong> ${this.escapeHtml(pacienteNome)}</p><p><strong>Emitido em:</strong> ${new Date().toLocaleDateString('pt-BR')}</p></div><div class="prof"><div><div class="prof-name">${this.escapeHtml(this.userInfo.nome || 'Profissional')}</div><div>Profissional responsável</div></div>${fotoProfissional ? `<img src="${this.escapeHtml(fotoProfissional)}" alt="Foto do profissional">` : ''}</div></header>${conteudo}<div class="copyright">© TRATAMENTO WEB</div></main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300));<\/script></body></html>`;
        const janela = window.open('', '_blank');
        if (!janela) {
            alert('Permita pop-ups para exportar o PDF.');
            return;
        }
        this.fecharExportacao();
        janela.document.open();
        janela.document.write(html);
        janela.document.close();
    }
}
