// DADOS DAS IMAGENS
const trabalhosImagens = [
    { id: 1, imagem: "grazielle_carvalho_imagens/trabalho1.jpg", titulo: "Alimentação Saudável", subtitulo: "Refeições balanceadas" },
    { id: 2, imagem: "grazielle_carvalho_imagens/trabalho2.jpg", titulo: "Cardápio Personalizado", subtitulo: "Plano alimentar exclusivo" },
    { id: 3, imagem: "grazielle_carvalho_imagens/trabalho3.jpg", titulo: "Acompanhamento", subtitulo: "Evolução constante" },
    { id: 4, imagem: "grazielle_carvalho_imagens/trabalho4.jpg", titulo: "Receitas Saudáveis", subtitulo: "Sabor e saúde" },
    { id: 5, imagem: "grazielle_carvalho_imagens/trabalho5.jpg", titulo: "Consultas", subtitulo: "Atendimento humanizado" },
    { id: 6, imagem: "grazielle_carvalho_imagens/trabalho6.jpg", titulo: "Resultados", subtitulo: "Clientes satisfeitos" }
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
    const raio = 380;

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
    
    const img = document.createElement("img");
    img.src = item.imagem;
    img.alt = item.titulo;
    img.onerror = () => {
        img.src = `https://via.placeholder.com/400x400/667eea/white?text=${encodeURIComponent(item.titulo)}`;
    };
    
    const overlay = document.createElement("div");
    overlay.className = "image-overlay";
    overlay.innerHTML = `<h3 class="image-title">${item.titulo}</h3><p class="image-subtitle">${item.subtitulo}</p>`;
    
    slide.appendChild(img);
    slide.appendChild(overlay);
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
