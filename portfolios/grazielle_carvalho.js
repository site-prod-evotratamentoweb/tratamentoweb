// ============================================
// DADOS DO CARROSSEL
// ============================================

// NOVIDADES (3 itens)
const novidadesItens = [
    { id: 1, imagem: "grazielle_carvalho_imagens/novidade1.jpg", icone: "bi bi-megaphone", titulo: "Nova Unidade", subtitulo: "Inauguramos nossa nova clínica" },
    { id: 2, imagem: "grazielle_carvalho_imagens/novidade2.jpg", icone: "bi bi-calendar", titulo: "Campanha de Saúde", subtitulo: "Mutirão de atendimentos em setembro" },
    { id: 3, imagem: "grazielle_carvalho_imagens/novidade3.jpg", icone: "bi bi-star", titulo: "Parceria", subtitulo: "Nova parceria com academias" }
];

// SERVIÇOS (5 itens)
const servicosItens = [
    { id: 1, imagem: "grazielle_carvalho_imagens/servico1.jpg", icone: "bi bi-laptop", titulo: "Acompanhamento Web Personalizado", subtitulo: "Suporte nutricional online" },
    { id: 2, imagem: "grazielle_carvalho_imagens/servico2.jpg", icone: "bi bi-people", titulo: "Consultoria e Assessoria", subtitulo: "Orientação especializada" },
    { id: 3, imagem: "grazielle_carvalho_imagens/servico3.jpg", icone: "bi bi-person-arms-up", titulo: "Atendimento Nutricional", subtitulo: "Individualizado e em grupo" },
    { id: 4, imagem: "grazielle_carvalho_imagens/servico4.jpg", icone: "bi bi-people-fill", titulo: "Especialização em Saúde Coletiva", subtitulo: "Nutrição para comunidade" },
    { id: 5, imagem: "grazielle_carvalho_imagens/servico5.jpg", icone: "bi bi-emoji-smile", titulo: "Especialização 60+", subtitulo: "Cuidado para melhor idade" }
];

// IMAGENS DE FUNDO DAS ABAS (fallback se não carregar)
const fundosAbas = {
    novidades: "grazielle_carvalho_imagens/fundo_novidades.jpg",
    sobre: "grazielle_carvalho_imagens/fundo_sobre.jpg",
    servicos: "grazielle_carvalho_imagens/fundo_servicos.jpg",
    contatos: "grazielle_carvalho_imagens/fundo_contatos.jpg"
};

// ============================================
// VARIÁVEIS DOS CARROSSEIS
// ============================================
let carrosselNovidades = null;
let carrosselServicos = null;
let anguloNovidades = 0;
let anguloServicos = 0;
let currentNovidadesIndex = 0;
let currentServicosIndex = 0;
let autoRotateNovidades = null;
let autoRotateServicos = null;

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    inicializarCarrossel("carrosselNovidades", novidadesItens, "novidades");
    inicializarCarrossel("carrosselServicos", servicosItens, "servicos");
    configurarAbas();
    carregarFundoAtivo("novidades");
});

// ============================================
// CARREGAR IMAGEM DE FUNDO COM FALLBACK
// ============================================
function carregarFundoAtivo(aba) {
    const imgUrl = fundosAbas[aba];
    const img = new Image();
    
    img.onload = () => {
        document.body.style.backgroundImage = `url('${imgUrl}')`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
    };
    
    img.onerror = () => {
        // Fallback: remove imagem de fundo, usa cor gradiente
        document.body.style.backgroundImage = "";
        document.body.className = `fundo-${aba}`;
    };
    
    img.src = imgUrl;
}

// ============================================
// INICIALIZAR CARROSSEL
// ============================================
function inicializarCarrossel(containerId, itens, tipo) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = "";
    const total = itens.length;
    const anguloStep = 360 / total;
    const raio = 420;
    
    for (let i = 0; i < total; i++) {
        const item = itens[i];
        const slide = criarSlide(item);
        container.appendChild(slide);
        
        const anguloRad = (i * anguloStep) * (Math.PI / 180);
        const x = Math.sin(anguloRad) * raio;
        const z = Math.cos(anguloRad) * raio;
        slide.style.transform = `translateX(${x}px) translateZ(${z}px) rotateY(${i * anguloStep}deg)`;
    }
    
    if (tipo === "novidades") {
        carrosselNovidades = container;
        irParaItemNovidades(0);
        configurarEventosNovidades();
        iniciarRotacaoNovidades();
    } else {
        carrosselServicos = container;
        irParaItemServicos(0);
        configurarEventosServicos();
        iniciarRotacaoServicos();
    }
}

function criarSlide(item) {
    const slide = document.createElement("div");
    slide.className = "carousel-item-3d";
    
    const img = document.createElement("img");
    img.src = item.imagem;
    img.alt = item.titulo;
    img.style.display = "none";
    
    const fallback = document.createElement("div");
    fallback.className = "fallback-icon";
    fallback.innerHTML = `<i class="${item.icone}"></i><span>${item.titulo}</span>`;
    
    slide.appendChild(img);
    slide.appendChild(fallback);
    
    img.onload = () => {
        img.style.display = "block";
        fallback.style.display = "none";
    };
    
    img.onerror = () => {
        img.style.display = "none";
        fallback.style.display = "flex";
    };
    
    img.src = item.imagem;
    
    const overlay = document.createElement("div");
    overlay.className = "image-overlay";
    overlay.innerHTML = `
        <h3 class="image-title">${item.titulo}</h3>
        <p class="image-subtitle">${item.subtitulo}</p>
    `;
    
    slide.appendChild(overlay);
    
    slide.addEventListener('click', () => {
        alert(`📢 ${item.titulo}\n\n${item.subtitulo}`);
    });
    
    return slide;
}

// ============================================
// CONTROLE NOVIDADES
// ============================================
function irParaItemNovidades(index) {
    currentNovidadesIndex = index;
    const anguloPorItem = 360 / novidadesItens.length;
    anguloNovidades = -(currentNovidadesIndex * anguloPorItem);
    carrosselNovidades.style.transform = `rotateY(${anguloNovidades}deg)`;
    document.getElementById("novidadesCounter").innerText = `${currentNovidadesIndex + 1} / ${novidadesItens.length}`;
}

function proximoNovidades() {
    currentNovidadesIndex = (currentNovidadesIndex + 1) % novidadesItens.length;
    irParaItemNovidades(currentNovidadesIndex);
    resetarRotacaoNovidades();
}

function anteriorNovidades() {
    currentNovidadesIndex = (currentNovidadesIndex - 1 + novidadesItens.length) % novidadesItens.length;
    irParaItemNovidades(currentNovidadesIndex);
    resetarRotacaoNovidades();
}

function configurarEventosNovidades() {
    document.getElementById("btnPrevNovidades").addEventListener("click", anteriorNovidades);
    document.getElementById("btnNextNovidades").addEventListener("click", proximoNovidades);
}

function iniciarRotacaoNovidades() {
    autoRotateNovidades = setInterval(() => {
        proximoNovidades();
    }, 4000);
}

function resetarRotacaoNovidades() {
    clearInterval(autoRotateNovidades);
    iniciarRotacaoNovidades();
}

// ============================================
// CONTROLE SERVIÇOS
// ============================================
function irParaItemServicos(index) {
    currentServicosIndex = index;
    const anguloPorItem = 360 / servicosItens.length;
    anguloServicos = -(currentServicosIndex * anguloPorItem);
    carrosselServicos.style.transform = `rotateY(${anguloServicos}deg)`;
    document.getElementById("servicosCounter").innerText = `${currentServicosIndex + 1} / ${servicosItens.length}`;
}

function proximoServicos() {
    currentServicosIndex = (currentServicosIndex + 1) % servicosItens.length;
    irParaItemServicos(currentServicosIndex);
    resetarRotacaoServicos();
}

function anteriorServicos() {
    currentServicosIndex = (currentServicosIndex - 1 + servicosItens.length) % servicosItens.length;
    irParaItemServicos(currentServicosIndex);
    resetarRotacaoServicos();
}

function configurarEventosServicos() {
    document.getElementById("btnPrevServicos").addEventListener("click", anteriorServicos);
    document.getElementById("btnNextServicos").addEventListener("click", proximoServicos);
}

function iniciarRotacaoServicos() {
    autoRotateServicos = setInterval(() => {
        proximoServicos();
    }, 4000);
}

function resetarRotacaoServicos() {
    clearInterval(autoRotateServicos);
    iniciarRotacaoServicos();
}

// ============================================
// CONFIGURAR ABAS
// ============================================
function configurarAbas() {
    const abas = document.querySelectorAll(".aba-btn");
    const conteudos = {
        novidades: document.getElementById("aba-novidades"),
        sobre: document.getElementById("aba-sobre"),
        servicos: document.getElementById("aba-servicos"),
        contatos: document.getElementById("aba-contatos")
    };
    
    abas.forEach(aba => {
        aba.addEventListener("click", () => {
            const abaId = aba.getAttribute("data-aba");
            
            // Atualizar botões ativos
            abas.forEach(btn => btn.classList.remove("active"));
            aba.classList.add("active");
            
            // Mostrar conteúdo correto
            Object.keys(conteudos).forEach(key => {
                conteudos[key].style.display = key === abaId ? "flex" : "none";
            });
            
            // Trocar imagem de fundo
            carregarFundoAtivo(abaId);
            
            // Resetar rotação do carrossel visível
            if (abaId === "novidades") {
                resetarRotacaoNovidades();
            } else if (abaId === "servicos") {
                resetarRotacaoServicos();
            }
        });
    });
}
