// ===== CARROSSEL 3D (PADRÃO SETOR DE ACESSOS) =====
let anguloGestoras = 0;
let itemsGestoras = [];
let containerGestoras = null;
let currentGestoraIndex = 0;
let isDragging = false;

// Dados das imagens (substitua pelos dados do Firebase)
const trabalhosImagens = [
    { id: 1, titulo: "Antes e Depois", subtitulo: "Cliente satisfeito" },
    { id: 2, titulo: "Cardápio Personalizado", subtitulo: "Plano alimentar" },
    // ... mais imagens
];

function inicializarCarrosselGestoras() {
    containerGestoras = document.getElementById("carrossel3d");
    if (!containerGestoras) return;

    containerGestoras.innerHTML = "";
    const total = trabalhosImagens.length;
    const anguloStep = 360 / total;
    const raio = 480;

    for (let i = 0; i < total; i++) {
        const item = trabalhosImagens[i];
        const slide = criarSlide3D(item, item.imagemUrl, i);
        containerGestoras.appendChild(slide);
        
        const anguloRad = (i * anguloStep) * (Math.PI / 180);
        const x = Math.sin(anguloRad) * raio;
        const z = Math.cos(anguloRad) * raio;
        slide.style.transform = `translateX(${x}px) translateZ(${z}px) rotateY(${i * anguloStep}deg)`;
        
        itemsGestoras.push({ element: slide, anguloBase: i * anguloStep, data: item, index: i });
    }
    
    irParaItemGestora(0);
    document.getElementById("btnPrev")?.addEventListener("click", anteriorGestora);
    document.getElementById("btnNext")?.addEventListener("click", proximoGestora);
}

function criarSlide3D(item, imgPath, index) {
    const slide = document.createElement("div");
    slide.className = "carousel-item-3d";
    slide.setAttribute("data-index", index);
    
    const img = document.createElement("img");
    img.src = imgPath;
    img.alt = item.titulo;
    
    const overlay = document.createElement("div");
    overlay.className = "image-overlay";
    overlay.innerHTML = `<h3 class="image-title">${item.titulo}</h3><p class="image-subtitle">${item.subtitulo}</p>`;
    
    slide.appendChild(img);
    slide.appendChild(overlay);
    return slide;
}

function irParaItemGestora(index) {
    currentGestoraIndex = index;
    const anguloPorItem = 360 / trabalhosImagens.length;
    anguloGestoras = -(currentGestoraIndex * anguloPorItem);
    containerGestoras.style.transform = `rotateY(${anguloGestoras}deg)`;
    document.getElementById("gestoraCounter").innerText = `${currentGestoraIndex + 1} / ${trabalhosImagens.length}`;
}
