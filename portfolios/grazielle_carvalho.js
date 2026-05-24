// DADOS DO CARROSSEL - 5 SERVIÇOS
const trabalhosImagens = [
    { 
        id: 1, 
        imagem: "grazielle_carvalho_imagens/trabalho1.jpg", 
        icone: "bi bi-laptop",
        titulo: "Acompanhamento Web Personalizado", 
        subtitulo: "Suporte nutricional online sob medida para você" 
    },
    { 
        id: 2, 
        imagem: "grazielle_carvalho_imagens/trabalho2.jpg", 
        icone: "bi bi-people",
        titulo: "Consultoria e Assessoria Nutricional", 
        subtitulo: "Orientação especializada para seus objetivos" 
    },
    { 
        id: 3, 
        imagem: "grazielle_carvalho_imagens/trabalho3.jpg", 
        icone: "bi bi-person-arms-up",
        titulo: "Atendimento Nutricional", 
        subtitulo: "Individualizado e em grupo" 
    },
    { 
        id: 4, 
        imagem: "grazielle_carvalho_imagens/trabalho4.jpg", 
        icone: "bi bi-people-fill",
        titulo: "Especialização em Saúde Coletiva", 
        subtitulo: "Nutrição para toda comunidade" 
    },
    { 
        id: 5, 
        imagem: "grazielle_carvalho_imagens/trabalho5.jpg", 
        icone: "bi bi-emoji-smile",
        titulo: "Especialização 60+", 
        subtitulo: "Cuidado nutricional para a melhor idade" 
    }
];

let anguloGestoras = 0;
let containerGestoras = null;
let currentGestoraIndex = 0;
let autoRotateInterval = null;

// INICIAR
document.addEventListener("DOMContentLoaded", () => {
    inicializarCarrossel();
});

function inicializarCarrossel() {
    containerGestoras = document.getElementById("carrossel3d");
    if (!containerGestoras) return;

    containerGestoras.innerHTML = "";
    const total = trabalhosImagens.length;
    const anguloStep = 360 / total;
    const raio = 420;

    for (let i = 0; i < total; i++) {
        const item = trabalhosImagens[i];
        const slide = criarSlide(item);
        containerGestoras.appendChild(slide);
        
        const anguloRad = (i * anguloStep) * (Math.PI / 180);
        const x = Math.sin(anguloRad) * raio;
        const z = Math.cos(anguloRad) * raio;
        slide.style.transform = `translateX(${x}px) translateZ(${z}px) rotateY(${i * anguloStep}deg)`;
    }
    
    irParaItem(0);
    configurarEventos();
    iniciarRotacaoAutomatica();
}

function criarSlide(item) {
    const slide = document.createElement("div");
    slide.className = "carousel-item-3d";
    
    // Criar imagem
    const img = document.createElement("img");
    img.src = item.imagem;
    img.alt = item.titulo;
    img.style.display = "none"; // Começa escondida
    
    // Criar fallback (ícone)
    const fallback = document.createElement("div");
    fallback.className = "fallback-icon";
    fallback.innerHTML = `<i class="${item.icone}"></i><span>${item.titulo}</span>`;
    
    slide.appendChild(img);
    slide.appendChild(fallback);
    
    // Tentar carregar a imagem
    img.onload = () => {
        // Se carregou, mostra imagem e esconde fallback
        img.style.display = "block";
        fallback.style.display = "none";
    };
    
    img.onerror = () => {
        // Se falhou, mantém fallback visível
        img.style.display = "none";
        fallback.style.display = "flex";
    };
    
    // Forçar tentativa de carregamento
    img.src = item.imagem;
    
    const overlay = document.createElement("div");
    overlay.className = "image-overlay";
    overlay.innerHTML = `
        <h3 class="image-title">${item.titulo}</h3>
        <p class="image-subtitle">${item.subtitulo}</p>
    `;
    
    slide.appendChild(overlay);
    
    // Clique na imagem
    slide.addEventListener('click', () => {
        alert(`🍎 ${item.titulo}\n\n${item.subtitulo}\n\nAgende sua consulta!`);
    });
    
    return slide;
}

function irParaItem(index) {
    currentGestoraIndex = index;
    const anguloPorItem = 360 / trabalhosImagens.length;
    anguloGestoras = -(currentGestoraIndex * anguloPorItem);
    containerGestoras.style.transform = `rotateY(${anguloGestoras}deg)`;
    document.getElementById("gestoraCounter").innerText = `${currentGestoraIndex + 1} / ${trabalhosImagens.length}`;
}

function proximoItem() {
    currentGestoraIndex = (currentGestoraIndex + 1) % trabalhosImagens.length;
    irParaItem(currentGestoraIndex);
    resetarAutoRotacao();
}

function anteriorItem() {
    currentGestoraIndex = (currentGestoraIndex - 1 + trabalhosImagens.length) % trabalhosImagens.length;
    irParaItem(currentGestoraIndex);
    resetarAutoRotacao();
}

function configurarEventos() {
    document.getElementById("btnPrev").addEventListener("click", anteriorItem);
    document.getElementById("btnNext").addEventListener("click", proximoItem);
}

function iniciarRotacaoAutomatica() {
    autoRotateInterval = setInterval(() => {
        proximoItem();
    }, 4000);
}

function resetarAutoRotacao() {
    clearInterval(autoRotateInterval);
    iniciarRotacaoAutomatica();
}
