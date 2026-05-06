// 0_ia_tensorflowjs.js
// Arquivo centralizado para gerenciar a IA do TensorFlow.js

let modeloIA = null;
let modeloCarregado = false;
let carregando = false;
let filaEspera = [];

// Configuração das palavras-chave para cada categoria
export const PALAVRAS_CHAVE_IA = {
    'refeicao': ['sandwich', 'pizza', 'cake', 'donut', 'carrot', 'broccoli', 'apple', 'orange', 'banana', 'hot dog', 'bowl', 'food', 'dining table'],
    'exercicio': ['person', 'sports ball', 'skateboard', 'surfboard', 'snowboard', 'frisbee', 'baseball bat', 'baseball glove', 'tennis racket', 'gym', 'weight'],
    'selfie': ['person', 'face', 'head', 'hair', 'eyes', 'mouth'],
    'prato_feito': ['sandwich', 'pizza', 'bowl', 'cake', 'donut', 'hot dog', 'carrot', 'broccoli', 'plate', 'dining table'],
    'agua': ['bottle', 'cup', 'glass', 'water', 'drink'],
    'fruta': ['apple', 'orange', 'banana', 'carrot', 'fruit'],
    'amigo': ['person', 'face', 'head', 'hair', 'people', 'group']
};

// Carregar scripts dinamicamente
function carregarScript(src) {
    return new Promise((resolve, reject) => {
        // Verificar se o script já existe
        const scriptExistente = document.querySelector(`script[src="${src}"]`);
        if (scriptExistente) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Carregar o modelo de IA
export async function carregarModeloIA(onProgress, onError) {
    // Se já está carregado, resolve imediatamente
    if (modeloCarregado && modeloIA) {
        if (onProgress) onProgress(100, 'Modelo já carregado!');
        return modeloIA;
    }
    
    // Se já está carregando, adiciona à fila
    if (carregando) {
        return new Promise((resolve, reject) => {
            filaEspera.push({ resolve, reject });
        });
    }
    
    carregando = true;
    
    try {
        if (onProgress) onProgress(10, 'Carregando TensorFlow.js...');
        await carregarScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js');
        
        if (onProgress) onProgress(40, 'Carregando modelo COCO-SSD...');
        await carregarScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.2/dist/coco-ssd.min.js');
        
        // Aguardar um pouco para os scripts serem processados
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (onProgress) onProgress(70, 'Inicializando IA...');
        modeloIA = await cocoSsd.load();
        modeloCarregado = true;
        
        if (onProgress) onProgress(100, 'IA carregada com sucesso!');
        console.log('✅ Modelo de IA carregado com sucesso!');
        
        // Processar fila de espera
        filaEspera.forEach(item => item.resolve(modeloIA));
        filaEspera = [];
        
        return modeloIA;
        
    } catch (error) {
        console.error('Erro ao carregar modelo de IA:', error);
        if (onError) onError(error);
        
        filaEspera.forEach(item => item.reject(error));
        filaEspera = [];
        throw error;
        
    } finally {
        carregando = false;
    }
}

// Analisar imagem com IA
export async function analisarImagemComIA(imagemDataUrl, categoria, onProgress) {
    if (!modeloCarregado || !modeloIA) {
        await carregarModeloIA(onProgress);
    }
    
    try {
        if (onProgress) onProgress(20, 'Processando imagem...');
        
        // Converter base64 para blob
        const blob = await dataURLtoBlob(imagemDataUrl);
        const imagemUrl = URL.createObjectURL(blob);
        
        const img = new Image();
        await new Promise((resolve) => {
            img.onload = resolve;
            img.src = imagemUrl;
        });
        
        if (onProgress) onProgress(60, 'Analisando com IA...');
        
        // Detectar objetos na imagem
        const predictions = await modeloIA.detect(img);
        URL.revokeObjectURL(imagemUrl);
        
        if (onProgress) onProgress(90, 'Gerando resultado...');
        
        // Processar análise baseada na categoria
        const resultado = processarAnalisePorCategoria(predictions, categoria);
        
        if (onProgress) onProgress(100, 'Análise concluída!');
        
        return resultado;
        
    } catch (error) {
        console.error('Erro na análise de IA:', error);
        return {
            aprovado: false,
            confianca: 0,
            objetosEncontrados: [],
            mensagem: 'Erro na análise automática. Foto será enviada para avaliação manual.',
            predictions: []
        };
    }
}

// Processar análise baseada na categoria
function processarAnalisePorCategoria(predictions, categoria) {
    const palavrasChave = PALAVRAS_CHAVE_IA;
    let totalPessoas = 0;
    let pontuacao = 0;
    const objetosMatch = [];
    
    // Contar pessoas (útil para categoria amigo)
    if (categoria === 'amigo') {
        totalPessoas = predictions.filter(pred => 
            pred.class.toLowerCase().includes('person') || 
            pred.class.toLowerCase().includes('face')
        ).length;
    }
    
    const palavras = palavrasChave[categoria] || palavrasChave['refeicao'];
    
    for (const pred of predictions) {
        const classe = pred.class.toLowerCase();
        if (palavras.some(p => classe.includes(p.toLowerCase()))) {
            pontuacao += pred.score;
            objetosMatch.push(pred.class);
        }
    }
    
    // Lógica específica para categoria amigo
    if (categoria === 'amigo') {
        if (totalPessoas >= 2) {
            return {
                aprovado: true,
                confianca: 0.9,
                objetosEncontrados: [...new Set(objetosMatch.slice(0, 5)), `${totalPessoas} pessoas`],
                mensagem: '🎉 Legal! Foto com amigo identificada! Pontos creditados!',
                predictions: predictions,
                totalPessoas: totalPessoas
            };
        } else if (totalPessoas === 1) {
            return {
                aprovado: false,
                confianca: 0.3,
                objetosEncontrados: [...new Set(objetosMatch.slice(0, 5)), `1 pessoa (sozinho)`],
                mensagem: '👤 Só tem 1 pessoa na imagem, para valer chame um amigo!',
                predictions: predictions,
                totalPessoas: totalPessoas
            };
        } else {
            return {
                aprovado: false,
                confianca: 0,
                objetosEncontrados: [...new Set(objetosMatch.slice(0, 5)), `0 pessoas`],
                mensagem: '👥 Nenhuma pessoa identificada na foto. Lembre-se: o desafio é tirar foto com um amigo!',
                predictions: predictions,
                totalPessoas: totalPessoas
            };
        }
    }
    
    // Lógica para outras categorias
    if (pontuacao >= 0.9) {
        return {
            aprovado: true,
            confianca: 0.9,
            objetosEncontrados: [...new Set(objetosMatch.slice(0, 5))],
            mensagem: 'Excelente! Foto corresponde perfeitamente ao desafio.',
            predictions: predictions
        };
    } else if (pontuacao >= 0.7) {
        return {
            aprovado: true,
            confianca: 0.7,
            objetosEncontrados: [...new Set(objetosMatch.slice(0, 5))],
            mensagem: 'Boa! Foto reconhecida como relacionada ao desafio.',
            predictions: predictions
        };
    } else if (pontuacao >= 0.4) {
        return {
            aprovado: false,
            confianca: pontuacao,
            objetosEncontrados: [...new Set(objetosMatch.slice(0, 5))],
            mensagem: 'Possível correspondência detectada, mas com baixa confiança. Enviando para análise.',
            predictions: predictions
        };
    } else if (predictions.length === 0) {
        return {
            aprovado: false,
            confianca: 0,
            objetosEncontrados: [],
            mensagem: 'Nenhum objeto reconhecido. A foto pode não estar relacionada ao desafio.',
            predictions: predictions
        };
    } else {
        return {
            aprovado: false,
            confianca: pontuacao,
            objetosEncontrados: [...new Set(objetosMatch.slice(0, 5))],
            mensagem: 'Conteúdo não identificado como relacionado ao desafio.',
            predictions: predictions
        };
    }
}

// Função auxiliar para converter DataURL para Blob
function dataURLtoBlob(dataURL) {
    const partes = dataURL.split(',');
    const byteString = atob(partes[1]);
    const mimeString = partes[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}

// Verificar se o modelo está carregado
export function isModeloCarregado() {
    return modeloCarregado && modeloIA !== null;
}

// Resetar modelo (útil para debugging)
export function resetarModelo() {
    modeloIA = null;
    modeloCarregado = false;
    carregando = false;
    filaEspera = [];
}