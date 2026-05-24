// ============================================
// DADOS DOS CARROSSEIS
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

// FUNDOS DAS SEÇÕES
const fundosSecoes = {
    novidades: "grazielle_carvalho_imagens/fundo_novidades.jpg",
    sobre: "grazielle_carvalho_imagens/fundo_sobre.jpg",
    servicos: "grazielle_carvalho_imagens/fundo_servicos.jpg",
    contatos: "grazielle_carvalho_imagens/fundo_contatos.jpg"
};

// ============================================
// VARIÁVEIS
// ============================================
let carrosselNovidades = null;
let carrosselServicos = null;
let anguloNovidades = 0;
let anguloServicos = 0;
let currentNovidadesIndex = 0;
let currentServicosIndex = 0;
let autoRotateNovidades = null;
let autoRotateServicos = null;
let novidadesAtivado = false;
let servicosAtivado = false;

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    configurarMenuMobile();
    configurarScrollSuave();
    carregarFundosSecoes();
    configurarTriggers();
});

// ============================================
// CONFIGURAR TRIGGERS (Botões de ativação)
// ============================================
function configurarTriggers() {
    // Trigger Novidades
    const triggerNovidades = document.getElementById("triggerNovidades");
    const wrapperNovidades = document.getElementById("carrosselWrapperNovidades");
    
    if (triggerNovidades) {
        triggerNovidades.addEventListener("click", () => {
            if (!novidadesAtivado) {
                wrapperNovidades.style.display = "block";
                triggerNovidades.style.display = "none";
                inicializarCarrossel("carrosselNovidades", novidadesItens, "novidades");
                novidadesAtivado = true;
                
                // Scroll suave para o carrossel
                setTimeout(() => {
                    wrapperNovidades.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        });
    }
    
    // Trigger Serviços
    const triggerServicos = document.getElementById("triggerServicos");
    const wrapperServicos = document.getElementById("carrosselWrapperServicos");
    
    if (triggerServicos) {
        triggerServicos.addEventListener("click", () => {
            if (!servicosAtivado) {
                wrapperServicos.style.display = "block";
                triggerServicos.style.display = "none";
                inicializarCarrossel("carrosselServicos", servicosItens, "servicos");
                servicosAtivado = true;
                
                // Scroll suave para o carrossel
                setTimeout(() => {
                    wrapperServicos.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        });
    }
}

// ============================================
// CARREGAR FUNDOS DAS SEÇÕES
// ============================================
function carregarFundosSecoes() {
    Object.keys(fundosSecoes).forEach(secao => {
        const section = document.querySelector(`[data-fundo="${secao}"]`);
        if (!section) return;
        
        const imgUrl = fundosSecoes[secao];
        const img = new Image();
        
        img.onload = () => {
            section.style.backgroundImage = `url('${imgUrl}')`;
            section.classList.remove('fallback');
        };
        
        img.onerror = () => {
            section.classList.add('fallback');
        };
        
        img.src = imgUrl;
    });
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
    const raio = 380;
    
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
    if (carrosselNovidades) {
        carrosselNovidades.style.transform = `rotateY(${anguloNovidades}deg)`;
    }
    const counter = document.getElementById("novidadesCounter");
    if (counter) {
        counter.innerText = `${currentNovidadesIndex + 1} / ${novidadesItens.length}`;
    }
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
    const btnPrev = document.getElementById("btnPrevNovidades");
    const btnNext = document.getElementById("btnNextNovidades");
    if (btnPrev) btnPrev.addEventListener("click", anteriorNovidades);
    if (btnNext) btnNext.addEventListener("click", proximoNovidades);
}

function iniciarRotacaoNovidades() {
    autoRotateNovidades = setInterval(() => {
        if (novidadesAtivado) proximoNovidades();
    }, 5000);
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
    if (carrosselServicos) {
        carrosselServicos.style.transform = `rotateY(${anguloServicos}deg)`;
    }
    const counter = document.getElementById("servicosCounter");
    if (counter) {
        counter.innerText = `${currentServicosIndex + 1} / ${servicosItens.length}`;
    }
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
    const btnPrev = document.getElementById("btnPrevServicos");
    const btnNext = document.getElementById("btnNextServicos");
    if (btnPrev) btnPrev.addEventListener("click", anteriorServicos);
    if (btnNext) btnNext.addEventListener("click", proximoServicos);
}

function iniciarRotacaoServicos() {
    autoRotateServicos = setInterval(() => {
        if (servicosAtivado) proximoServicos();
    }, 5000);
}

function resetarRotacaoServicos() {
    clearInterval(autoRotateServicos);
    iniciarRotacaoServicos();
}

// ============================================
// MENU MOBILE
// ============================================
function configurarMenuMobile() {
    const menuToggle = document.getElementById("menuToggle");
    const navMenu = document.getElementById("navMenu");
    
    if (menuToggle) {
        menuToggle.addEventListener("click", () => {
            navMenu.classList.toggle("active");
        });
    }
    
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            navMenu.classList.remove("active");
        });
    });
}

// ============================================
// SCROLL SUAVE
// ============================================
function configurarScrollSuave() {
    document.querySelectorAll('.nav-link[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}
