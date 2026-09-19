// 0_ia_tensorflowjs_exames.js
// IA exclusiva para exames: modelos carregados online e executados no navegador.

let modeloVisual = null;
let carregandoModeloVisual = null;
let tesseractCarregado = false;
let pdfJsCarregado = false;

function carregarScript(src) {
    return new Promise((resolve, reject) => {
        const existente = document.querySelector(`script[src="${src}"]`);
        if (existente?.dataset.loaded === 'true') {
            resolve();
            return;
        }
        if (existente) {
            existente.addEventListener('load', resolve, { once: true });
            existente.addEventListener('error', reject, { once: true });
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            script.dataset.loaded = 'true';
            resolve();
        };
        script.onerror = () => reject(new Error('Não foi possível carregar um componente da leitura online.'));
        document.head.appendChild(script);
    });
}

async function carregarModeloVisual(onProgress) {
    if (modeloVisual) return modeloVisual;
    if (carregandoModeloVisual) return carregandoModeloVisual;
    carregandoModeloVisual = (async () => {
        if (!window.tf) {
            if (onProgress) onProgress(3, 'Carregando TensorFlow.js...');
            await carregarScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js');
        }
        if (!window.cocoSsd) {
            if (onProgress) onProgress(8, 'Carregando modelo de identificação de imagem...');
            await carregarScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.2/dist/coco-ssd.min.js');
        }
        modeloVisual = await window.cocoSsd.load();
        return modeloVisual;
    })();
    try {
        return await carregandoModeloVisual;
    } finally {
        carregandoModeloVisual = null;
    }
}

async function detectarObjetos(imagemDataUrl, onProgress) {
    try {
        const modelo = await carregarModeloVisual(onProgress);
        const imagem = new Image();
        await new Promise((resolve, reject) => {
            imagem.onload = resolve;
            imagem.onerror = reject;
            imagem.src = imagemDataUrl;
        });
        const predicoes = await modelo.detect(imagem);
        return predicoes.map((item) => item.class);
    } catch (_error) {
        return [];
    }
}

const MARCADORES_EXAMES = [
    { campo: 'hemoglobina_glicada', nome: 'Hemoglobina glicada', aliases: ['hemoglobina glicada', 'hba1c'] },
    { campo: 'colesterol_total', nome: 'Colesterol total', aliases: ['colesterol total'] },
    { campo: 'triglicerideos', nome: 'Triglicerídeos', aliases: ['triglicerideos', 'triglicérides', 'triglicerides'] },
    { campo: 'vitamina_d', nome: 'Vitamina D', aliases: ['vitamina d', '25-oh vitamina d', '25 oh vitamina d'] },
    { campo: 'glicemia', nome: 'Glicemia', aliases: ['glicemia', 'glicose'] },
    { campo: 'ferritina', nome: 'Ferritina', aliases: ['ferritina'] },
    { campo: 'hdl', nome: 'HDL', aliases: ['colesterol hdl', 'hdl colesterol', 'hdl'] },
    { campo: 'ldl', nome: 'LDL', aliases: ['colesterol ldl', 'ldl colesterol', 'ldl'] }
];

function normalizarTexto(valor) {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function numeroBrasileiro(valor) {
    const limpo = String(valor || '').replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    const numero = Number(limpo);
    return Number.isFinite(numero) ? numero : null;
}

function inferirStatus(valor, referencia) {
    if (!Number.isFinite(valor) || !referencia) return 'indefinido';
    const texto = normalizarTexto(referencia);
    const numeros = [...texto.matchAll(/\d+(?:[.,]\d+)?/g)].map((match) => numeroBrasileiro(match[0])).filter(Number.isFinite);
    if (!numeros.length) return 'indefinido';
    if (/[<>≤≥]/.test(texto)) {
        const limite = numeros[0];
        if (/[<≤]/.test(texto)) return valor <= limite ? 'normal' : 'alto';
        if (/[>≥]/.test(texto)) return valor >= limite ? 'normal' : 'baixo';
    }
    if (numeros.length >= 2) {
        const minimo = Math.min(numeros[0], numeros[1]);
        const maximo = Math.max(numeros[0], numeros[1]);
        if (valor < minimo) return 'baixo';
        if (valor > maximo) return 'alto';
        return 'normal';
    }
    return 'indefinido';
}

function extrairReferencia(textoDepoisValor) {
    const faixa = textoDepoisValor.match(/(?:refer[eê]ncia\s*:?)?\s*([<>≤≥]?\s*\d+(?:[.,]\d+)?\s*(?:a|até|[-–])\s*\d+(?:[.,]\d+)?|[<>≤≥]\s*\d+(?:[.,]\d+)?)/i);
    return faixa?.[1]?.trim() || null;
}

function extrairUnidade(texto) {
    const match = texto.match(/(?:mg|g|ng|pg|µg|ug|mmol|umol|mEq|U|UI|mUI|milh[oõ]es|mil)\s*\/?\s*(?:dL|L|mL|mm³|mm3|m³|m3)?|%/i);
    return match?.[0]?.replace(/\s+/g, '') || null;
}

function extrairResultadoConhecido(linhas, marcador) {
    for (let index = 0; index < linhas.length; index += 1) {
        const linha = linhas[index];
        const linhaNormalizada = normalizarTexto(linha);
        const alias = marcador.aliases.find((item) => linhaNormalizada.includes(normalizarTexto(item)));
        if (!alias) continue;
        const posicao = linhaNormalizada.indexOf(normalizarTexto(alias));
        const depoisNome = linha.slice(posicao + alias.length).replace(/^[\s.:=-]+/, '');
        const complemento = /\d/.test(depoisNome) ? depoisNome : `${depoisNome} ${linhas[index + 1] || ''}`;
        const matchFinal = complemento.match(/\b\d+(?:[.,]\d+)?\b/);
        if (!matchFinal) continue;
        const valorTexto = matchFinal[0];
        const depoisValor = complemento.slice((matchFinal.index || 0) + valorTexto.length);
        const referencia = extrairReferencia(depoisValor);
        const valorNumerico = numeroBrasileiro(valorTexto);
        return {
            nome: marcador.nome,
            campo_padrao: marcador.campo,
            valor_texto: valorTexto,
            valor_numerico: valorNumerico,
            unidade: extrairUnidade(complemento),
            referencia,
            status: inferirStatus(valorNumerico, referencia),
            lido_com_confianca: Boolean(extrairUnidade(complemento))
        };
    }
    return null;
}

function extrairResultadosGenericos(linhas, nomesUsados) {
    const ignorar = /paciente|nascimento|solicitante|laborat[oó]rio|material|coleta|resultado|refer[eê]ncia|assinatura|p[aá]gina/i;
    const resultados = [];
    for (const linha of linhas) {
        if (ignorar.test(linha)) continue;
        const match = linha.match(/^\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 ()/.-]{2,55}?)\s*(?::|\.{2,}|\s{2,}|-)\s*([<>]?\s*\d+(?:[.,]\d+)?)\s*(.*)$/);
        if (!match) continue;
        const nome = match[1].trim();
        if (nomesUsados.some((usado) => normalizarTexto(nome).includes(normalizarTexto(usado)))) continue;
        const valorTexto = match[2].replace(/\s/g, '');
        const valorNumerico = numeroBrasileiro(valorTexto.replace(/[<>]/g, ''));
        const referencia = extrairReferencia(match[3]);
        resultados.push({
            nome,
            campo_padrao: 'outro',
            valor_texto: valorTexto,
            valor_numerico: valorNumerico,
            unidade: extrairUnidade(match[3]),
            referencia,
            status: inferirStatus(valorNumerico, referencia),
            lido_com_confianca: Boolean(extrairUnidade(match[3]))
        });
        if (resultados.length >= 200) break;
    }
    return resultados;
}

function extrairMetadado(texto, expressoes) {
    for (const expressao of expressoes) {
        const match = texto.match(expressao);
        if (match?.[1]) return match[1].trim().replace(/\s{2,}.*$/, '');
    }
    return null;
}

export function estruturarTextoExame(texto, objetosDetectados = []) {
    const linhas = String(texto || '').split(/\r?\n/).map((linha) => linha.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const conhecidos = MARCADORES_EXAMES.map((marcador) => extrairResultadoConhecido(linhas, marcador)).filter(Boolean);
    const genericos = extrairResultadosGenericos(linhas, conhecidos.map((item) => item.nome));
    const resultados = [...conhecidos, ...genericos];
    const documentoValido = resultados.length > 0;
    const baixaConfianca = resultados.filter((item) => !item.lido_com_confianca).length;
    const qualidade = !documentoValido ? 'ilegivel' : baixaConfianca > Math.max(2, resultados.length / 2) ? 'parcial' : 'legivel';
    const mensagens = [];
    if (!documentoValido) mensagens.push('Nenhum resultado laboratorial foi reconhecido automaticamente.');
    if (baixaConfianca) mensagens.push(`${baixaConfianca} resultado(s) precisam de atenção especial na conferência.`);
    if (objetosDetectados.length) mensagens.push(`Validação visual pelo TensorFlow: ${objetosDetectados.slice(0, 4).join(', ')}.`);
    return {
        documento_valido: documentoValido,
        paciente_nome: extrairMetadado(texto, [/paciente\s*[:\-]\s*([^\n]+)/i, /nome\s*[:\-]\s*([^\n]+)/i]),
        data_coleta: extrairMetadado(texto, [/(?:data\s+da\s+)?coleta\s*[:\-]\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i]),
        laboratorio: extrairMetadado(texto, [/laborat[oó]rio\s*[:\-]\s*([^\n]+)/i]),
        qualidade: { status: qualidade, mensagens },
        resultados,
        texto_ocr: texto
    };
}

async function carregarTesseract() {
    if (window.Tesseract) {
        tesseractCarregado = true;
        return;
    }
    await carregarScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
    tesseractCarregado = true;
}

async function reconhecerTextoImagem(origem, onProgress, inicio = 0, faixa = 100) {
    await carregarTesseract();
    const resultado = await window.Tesseract.recognize(origem, 'por', {
        logger: (evento) => {
            if (evento.status === 'recognizing text' && onProgress) {
                onProgress(Math.round(inicio + evento.progress * faixa), 'Lendo textos e valores do exame...');
            }
        }
    });
    return resultado?.data?.text || '';
}

async function carregarPdfJs() {
    if (window.pdfjsLib) {
        pdfJsCarregado = true;
        return;
    }
    await carregarScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    pdfJsCarregado = true;
}

function textoEstruturadoPdf(items) {
    let ultimaLinha = null;
    let texto = '';
    for (const item of items) {
        const linha = Math.round(item.transform?.[5] || 0);
        texto += ultimaLinha !== null && Math.abs(linha - ultimaLinha) > 2 ? '\n' : ' ';
        texto += item.str;
        ultimaLinha = linha;
    }
    return texto.trim();
}

async function extrairTextoPdf(file, onProgress) {
    await carregarPdfJs();
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const paginas = Math.min(pdf.numPages, 12);
    const textos = [];
    for (let numero = 1; numero <= paginas; numero += 1) {
        if (onProgress) onProgress(Math.round(((numero - 1) / paginas) * 90), `Lendo página ${numero} de ${paginas}...`);
        const pagina = await pdf.getPage(numero);
        const conteudo = await pagina.getTextContent();
        let texto = textoEstruturadoPdf(conteudo.items);
        if (texto.replace(/\s/g, '').length < 40) {
            const viewport = pagina.getViewport({ scale: 1.7 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await pagina.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            texto = await reconhecerTextoImagem(canvas, onProgress, ((numero - 1) / paginas) * 90, 90 / paginas);
        }
        textos.push(texto);
    }
    if (pdf.numPages > paginas) textos.push(`Aviso: leitura limitada às primeiras ${paginas} páginas.`);
    return textos.join('\n');
}

export async function lerExameComIA(file, imagemDataUrl, onProgress) {
    let texto = '';
    let objetosDetectados = [];
    if (file.type === 'application/pdf') {
        texto = await extrairTextoPdf(file, onProgress);
    } else {
        objetosDetectados = await detectarObjetos(imagemDataUrl, onProgress);
        texto = await reconhecerTextoImagem(imagemDataUrl, onProgress, 10, 90);
    }
    if (onProgress) onProgress(100, 'Leitura online concluída.');
    return {
        extraction: estruturarTextoExame(texto, objetosDetectados),
        model: 'tensorflow-coco-ssd+tesseract-ocr-exames-v1'
    };
}

export function analisarExameConfirmado(resultados) {
    const preenchidos = (resultados || []).filter((item) => item.nome && item.valor_texto !== '');
    const alterados = preenchidos.filter((item) => ['alto', 'baixo', 'critico'].includes(item.status));
    const indefinidos = preenchidos.filter((item) => item.status === 'indefinido');
    const achados = alterados.map((item) => ({
        nivel: item.status === 'critico' ? 'prioridade' : 'atencao',
        titulo: `${item.nome}: resultado ${item.status}`,
        descricao: `Valor confirmado: ${item.valor_texto}${item.unidade ? ` ${item.unidade}` : ''}${item.referencia ? ` (referência informada: ${item.referencia})` : ''}. Correlacionar com o contexto clínico.`,
        exames_relacionados: [item.nome]
    }));
    const campos = new Set(preenchidos.map((item) => item.campo_padrao));
    const correlacoes = [];
    if (campos.has('glicemia') && campos.has('hemoglobina_glicada')) correlacoes.push('Revisar glicemia e hemoglobina glicada em conjunto, considerando jejum e histórico do paciente.');
    if (['colesterol_total', 'hdl', 'ldl', 'triglicerideos'].filter((campo) => campos.has(campo)).length >= 2) correlacoes.push('Interpretar os componentes do perfil lipídico em conjunto e conforme o risco clínico individual.');
    if (campos.has('ferritina')) correlacoes.push('Correlacionar ferritina com hemograma, marcadores inflamatórios e história clínica quando disponíveis.');
    return {
        resumo: `${preenchidos.length} resultado(s) conferido(s): ${alterados.length} fora da faixa informada, ${preenchidos.filter((item) => item.status === 'normal').length} dentro da faixa e ${indefinidos.length} sem classificação automática.`,
        achados,
        correlacoes,
        proximos_passos: [
            'Confirmar unidades, intervalos de referência e condições da coleta no laudo original.',
            'Correlacionar os achados com anamnese, sintomas, medicamentos e evolução do paciente.'
        ],
        alertas: indefinidos.length ? [`${indefinidos.length} resultado(s) não possuem faixa de referência suficiente para classificação automática.`] : [],
        aviso_profissional: 'Análise feita no navegador, baseada apenas nos valores e referências confirmados. Não constitui diagnóstico ou prescrição.'
    };
}
