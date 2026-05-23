// ============================================
// GRAZIELLE CARVALHO - CARROSSEL 3D
// ============================================

// DADOS DAS IMAGENS DO CARROSSEL
const trabalhosImagens = [
    { 
        id: 1, 
        imagem: "grazielle_carvalho_imagens/trabalho1.jpg", 
        titulo: "Alimentação Saudável", 
        subtitulo: "Refeições balanceadas" 
    },
    { 
        id: 2, 
        imagem: "grazielle_carvalho_imagens/trabalho2.jpg", 
        titulo: "Cardápio Personalizado", 
        subtitulo: "Plano alimentar exclusivo" 
    },
    { 
        id: 3, 
        imagem: "grazielle_carvalho_imagens/trabalho3.jpg", 
        titulo: "Acompanhamento", 
        subtitulo: "Evolução constante" 
    },
    { 
        id: 4, 
        imagem: "grazielle_carvalho_imagens/trabalho4.jpg", 
        titulo: "Receitas Saudáveis", 
        subtitulo: "Sabor e saúde" 
    },
    { 
        id: 5, 
        imagem: "grazielle_carvalho_imagens/trabalho5.jpg", 
        titulo: "Consultas", 
        subtitulo: "Atendimento humanizado" 
    },
    { 
        id: 6, 
        imagem: "grazielle_carvalho_imagens/trabalho6.jpg", 
        titulo: "Resultados", 
        subtitulo: "Clientes satisfeitos" 
    }
];

// Variáveis do carrossel
let anguloGestoras = 0;
let containerGestoras = null;
let currentGestoraIndex = 0;
let autoRotateInterval = null;
let isDragging = false;
let startX = 0;
let startAngle = 0;

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Iniciando Carrossel 3D");
    inicializarCarrossel();
    
    // Esconder loading após carregar
    setTimeout(() => {
        const loading = document.getElementById('loadingScreen');
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => {
                loading.style.display = 'none';
            }, 500);
        }
    }, 1000);
});

// Inicializar Carrossel
function inicializarCarrossel() {
    containerGestoras = document.getElementById("carrossel3d");
    if (!containerGestoras) {
        console.error("❌ Container do carrossel não encontrado!");
        return;
    }

    containerGestoras.innerHTML = "";
    const total = trabalhosImagens.length;
    const anguloStep = 360 / total;
    const raio = 380; // Raio do círculo

    for (let i = 0; i < total; i++) {
        const item = trabalhosImagens[i];
        const slide = criarSlide(item, item.imagem, i);
        containerGestoras.appendChild(slide);
        
        // Calcular posição 3D
        const anguloRad = (i * anguloStep) * (Math.PI / 180);
        const x = Math.sin(anguloRad) * raio;
        const z = Math.cos(anguloRad) * raio;
        const rotacaoY = i * anguloStep;
        slide.style.transform = `translateX(${x}px) translateZ(${z}px) rotateY(${rotacaoY}deg)`;
    }
    
    irParaItem(0);
    configurarEventos();
    iniciarRotacaoAutomatica();
    configurarDrag();
}

// Criar slide individual
function criarSlide(item, imgPath, index) {
    const slide = document.createElement("div");
    slide.className = "carousel-item-3d";
    slide.setAttribute("data-index", index);
    
    const img = document.createElement("img");
    img.src = imgPath;
    img.alt = item.titulo;
    
    // Fallback se imagem não existir
    img.onerror = () => {
        img.src = `https://via.placeholder.com/400x400/667eea/white?text=${encodeURIComponent(item.titulo)}`;
    };
    
    const overlay = document.createElement("div");
    overlay.className = "image-overlay";
    overlay.innerHTML = `
        <h3 class="image-title">${item.titulo}</h3>
        <p class="image-subtitle">${item.subtitulo}</p>
    `;
    
    slide.appendChild(img);
    slide.appendChild(overlay);
    
    // Evento de clique na imagem
    slide.addEventListener('click', () => {
        alert(`📸 ${item.titulo}\n${item.subtitulo}\n\nClique para ver mais detalhes!`);
    });
    
    return slide;
}

// Navegar para um item específico
function irParaItem(index) {
    currentGestoraIndex = index;
    const anguloPorItem = 360 / trabalhosImagens.length;
    anguloGestoras = -(currentGestoraIndex * anguloPorItem);
    containerGestoras.style.transform = `rotateY(${anguloGestoras}deg)`;
    
    const counter = document.getElementById("gestoraCounter");
    if (counter) {
        counter.innerText = `${currentGestoraIndex + 1} / ${trabalhosImagens.length}`;
    }
}

// Próximo item
function proximoItem() {
    currentGestoraIndex = (currentGestoraIndex + 1) % trabalhosImagens.length;
    irParaItem(currentGestoraIndex);
    resetarAutoRotacao();
}

// Item anterior
function anteriorItem() {
    currentGestoraIndex = (currentGestoraIndex - 1 + trabalhosImagens.length) % trabalhosImagens.length;
    irParaItem(currentGestoraIndex);
    resetarAutoRotacao();
}

// Configurar eventos dos botões
function configurarEventos() {
    const btnPrev = document.getElementById("btnPrev");
    const btnNext = document.getElementById("btnNext");
    
    if (btnPrev) btnPrev.addEventListener("click", anteriorItem);
    if (btnNext) btnNext.addEventListener("click", proximoItem);
}

// Rotação automática
function iniciarRotacaoAutomatica() {
    autoRotateInterval = setInterval(() => {
        if (!isDragging) {
            proximoItem();
        }
    }, 4000); // Rotação a cada 4 segundos
}

// Resetar rotação automática
function resetarAutoRotacao() {
    if (autoRotateInterval) {
        clearInterval(autoRotateInterval);
        iniciarRotacaoAutomatica();
    }
}

// Configurar drag (arrastar com mouse)
function configurarDrag() {
    if (!containerGestoras) return;
    
    containerGestoras.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startAngle = anguloGestoras;
        containerGestoras.style.cursor = 'grabbing';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const newAngle = startAngle + (deltaX * 0.5);
        anguloGestoras = newAngle;
        containerGestoras.style.transform = `rotateY(${anguloGestoras}deg)`;
        
        // Atualizar índice baseado no ângulo
        const anguloPorItem = 360 / trabalhosImagens.length;
        let newIndex = Math.round((-newAngle % 360) / anguloPorItem);
        if (newIndex < 0) newIndex += trabalhosImagens.length;
        currentGestoraIndex = newIndex % trabalhosImagens.length;
        
        const counter = document.getElementById("gestoraCounter");
        if (counter) {
            counter.innerText = `${currentGestoraIndex + 1} / ${trabalhosImagens.length}`;
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            irParaItem(currentGestoraIndex);
            resetarAutoRotacao();
        }
    });
    
    // Touch para mobile
    containerGestoras.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].clientX;
        startAngle = anguloGestoras;
        e.preventDefault();
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.touches[0].clientX - startX;
        const newAngle = startAngle + (deltaX * 0.5);
        anguloGestoras = newAngle;
        containerGestoras.style.transform = `rotateY(${anguloGestoras}deg)`;
        
        const anguloPorItem = 360 / trabalhosImagens.length;
        let newIndex = Math.round((-newAngle % 360) / anguloPorItem);
        if (newIndex < 0) newIndex += trabalhosImagens.length;
        currentGestoraIndex = newIndex % trabalhosImagens.length;
        
        const counter = document.getElementById("gestoraCounter");
        if (counter) {
            counter.innerText = `${currentGestoraIndex + 1} / ${trabalhosImagens.length}`;
        }
    });
    
    document.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            irParaItem(currentGestoraIndex);
            resetarAutoRotacao();
        }
    });
}

// Smooth scroll para os links da navbar
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});
