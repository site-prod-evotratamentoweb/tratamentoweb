// grazielle_carvalho.js - Portfolio Manager
import { 
    db, 
    auth, 
    getDoc, 
    doc, 
    signInWithEmailAndPassword, 
    updateDoc,
    setDoc,
    deleteDoc,
    getDocs,
    collection,
    query,
    where,
    orderBy,
    serverTimestamp,
    uploadParaImgbb
} from '../../0_firebase_api_config.js';

// ==================== CONFIGURAÇÃO ====================
const PROFESSIONAL_ID = 'grazielle.carvalho';
const PORTFOLIO_PATH = `portfolios/${PROFESSIONAL_ID}`;
const IMAGES_COLLECTION = `${PORTFOLIO_PATH}/imagens`;
const CONTENT_DOC = `${PORTFOLIO_PATH}/conteudo`;
const SERVICES_COLLECTION = `${PORTFOLIO_PATH}/servicos`;

// ==================== ESTADO GLOBAL ====================
let currentUser = null;
let carouselImages = [];
let currentSlide = 0;
let autoSlideInterval = null;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando portfólio de:', PROFESSIONAL_ID);
    
    setupNavigation();
    setupMenuDropdown();
    setupModals();
    await loadPortfolioData();
    
    // Esconder loading screen
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
    }, 500);
});

// ==================== NAVEGAÇÃO ====================
function setupNavigation() {
    // Smooth scroll para links internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Atualizar link ativo
                document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
                if (this.classList.contains('nav-link')) {
                    this.classList.add('active');
                }
                
                // Fechar menu mobile se aberto
                document.getElementById('dropdownMenu').classList.remove('show');
            }
        });
    });
    
    // Header scroll effect
    window.addEventListener('scroll', () => {
        const header = document.getElementById('mainHeader');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

function setupMenuDropdown() {
    const menuToggle = document.getElementById('menuToggle');
    const dropdownMenu = document.getElementById('dropdownMenu');
    
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });
    
    // Fechar menu ao clicar fora
    document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && e.target !== menuToggle) {
            dropdownMenu.classList.remove('show');
        }
    });
    
    // Botão de acesso administrativo
    document.getElementById('adminAccessBtn').addEventListener('click', (e) => {
        e.preventDefault();
        dropdownMenu.classList.remove('show');
        openLoginModal();
    });
}

// ==================== MODAIS ====================
function setupModals() {
    // Login Modal
    document.getElementById('closeLoginModal').addEventListener('click', closeLoginModal);
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
    
    // Admin Modal
    document.getElementById('closeAdminModal').addEventListener('click', closeAdminModal);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Admin Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            switchAdminTab(tab);
        });
    });
    
    // Forms
    document.getElementById('imageUploadForm').addEventListener('submit', handleImageUpload);
    document.getElementById('contentForm').addEventListener('submit', handleContentSave);
    document.getElementById('serviceForm').addEventListener('submit', handleServiceAdd);
    
    // Fechar modais ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
    document.getElementById('adminLogin').focus();
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('adminLoginForm').reset();
    document.getElementById('loginError').style.display = 'none';
}

function openAdminModal() {
    document.getElementById('adminModal').style.display = 'block';
    loadAdminData();
}

function closeAdminModal() {
    document.getElementById('adminModal').style.display = 'none';
}

function switchAdminTab(tabName) {
    // Atualizar botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Atualizar conteúdo
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    switch(tabName) {
        case 'images':
            document.getElementById('imagesTab').classList.add('active');
            loadCurrentImages();
            break;
        case 'content':
            document.getElementById('contentTab').classList.add('active');
            loadContentForm();
            break;
        case 'services':
            document.getElementById('servicesTab').classList.add('active');
            loadCurrentServices();
            break;
    }
}

// ==================== AUTENTICAÇÃO ====================
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const login = document.getElementById('adminLogin').value.trim();
    const password = document.getElementById('adminPassword').value;
    
    if (!login || !password) {
        showLoginError('Preencha todos os campos!');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Autenticando...';
    submitBtn.disabled = true;
    
    try {
        // 1. Autenticar no Firebase Auth
        const email = `${login.toLowerCase()}@tratamentoweb.com`;
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // 2. Verificar no Firestore
        const userRef = doc(db, 'logins', login);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            await auth.signOut();
            showLoginError('Usuário não encontrado!');
            return;
        }
        
        const userData = userDoc.data();
        
        // 3. Verificar se está ativo
        if (!userData.status_ativo) {
            await auth.signOut();
            showLoginError('Sua conta está desativada!');
            return;
        }
        
        // 4. Verificar permissão de edição do portfólio
        if (!userData.habilitar_edicao_portfolio) {
            await auth.signOut();
            showLoginError('Você não tem permissão para editar portfólios!');
            return;
        }
        
        // 5. Verificar se é o dono do portfólio
        if (login !== PROFESSIONAL_ID) {
            await auth.signOut();
            showLoginError('Você só pode editar seu próprio portfólio!');
            return;
        }
        
        // Login bem-sucedido
        currentUser = {
            ...userData,
            login: login,
            email: email,
            uid: userCredential.user.uid
        };
        
        // Atualizar último login
        await updateDoc(userRef, { ultimo_login: serverTimestamp() });
        
        closeLoginModal();
        openAdminModal();
        
    } catch (error) {
        console.error('Erro no login:', error);
        
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
            showLoginError('Login ou senha incorretos!');
        } else if (error.code === 'auth/user-not-found') {
            showLoginError('Usuário não cadastrado!');
        } else {
            showLoginError('Erro na autenticação: ' + error.message);
        }
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

async function handleLogout() {
    try {
        await auth.signOut();
        currentUser = null;
        closeAdminModal();
        showToast('Logout realizado com sucesso!');
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
}

// ==================== CARREGAR DADOS DO PORTFÓLIO ====================
async function loadPortfolioData() {
    try {
        // Carregar conteúdo
        const contentRef = doc(db, CONTENT_DOC);
        const contentDoc = await getDoc(contentRef);
        
        if (contentDoc.exists()) {
            const data = contentDoc.data();
            populatePortfolioContent(data);
        }
        
        // Carregar imagens do carrossel
        await loadCarouselImages();
        
        // Carregar serviços
        await loadServices();
        
    } catch (error) {
        console.error('Erro ao carregar dados do portfólio:', error);
    }
}

function populatePortfolioContent(data) {
    // Atualizar nome e título
    if (data.nome) {
        document.getElementById('professionalName').textContent = data.nome;
        document.title = `${data.nome} | Nutricionista - TratamentoWeb`;
    }
    if (data.titulo) {
        document.getElementById('professionalTitle').textContent = data.titulo;
    }
    
    // Sobre
    if (data.sobre) {
        document.getElementById('aboutContent').innerHTML = `<p>${data.sobre}</p>`;
    }
    
    // Contato
    const contactInfo = document.getElementById('contactInfo');
    let contactHTML = '<div class="contact-list">';
    
    if (data.whatsapp) {
        contactHTML += `
            <a href="https://wa.me/${data.whatsapp}" target="_blank" class="contact-item">
                <i class="bi bi-whatsapp"></i>
                <div>
                    <strong>WhatsApp</strong>
                    <span>${formatWhatsapp(data.whatsapp)}</span>
                </div>
            </a>
        `;
    }
    
    if (data.instagram) {
        contactHTML += `
            <a href="https://instagram.com/${data.instagram.replace('@', '')}" target="_blank" class="contact-item">
                <i class="bi bi-instagram"></i>
                <div>
                    <strong>Instagram</strong>
                    <span>${data.instagram}</span>
                </div>
            </a>
        `;
    }
    
    if (data.email) {
        contactHTML += `
            <a href="mailto:${data.email}" class="contact-item">
                <i class="bi bi-envelope"></i>
                <div>
                    <strong>E-mail</strong>
                    <span>${data.email}</span>
                </div>
            </a>
        `;
    }
    
    if (data.endereco) {
        contactHTML += `
            <div class="contact-item">
                <i class="bi bi-geo-alt"></i>
                <div>
                    <strong>Endereço</strong>
                    <span>${data.endereco}</span>
                </div>
            </div>
        `;
    }
    
    contactHTML += '</div>';
    contactInfo.innerHTML = contactHTML;
    
    // Redes sociais no footer
    const footerSocial = document.getElementById('footerSocial');
    let socialHTML = '';
    
    if (data.whatsapp) {
        socialHTML += `<a href="https://wa.me/${data.whatsapp}" target="_blank"><i class="bi bi-whatsapp"></i></a>`;
    }
    if (data.instagram) {
        socialHTML += `<a href="https://instagram.com/${data.instagram.replace('@', '')}" target="_blank"><i class="bi bi-instagram"></i></a>`;
    }
    if (data.email) {
        socialHTML += `<a href="mailto:${data.email}"><i class="bi bi-envelope"></i></a>`;
    }
    
    footerSocial.innerHTML = socialHTML;
}

function formatWhatsapp(number) {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 13) {
        return `(${cleaned.substring(2,4)}) ${cleaned.substring(4,9)}-${cleaned.substring(9)}`;
    }
    return number;
}

// ==================== CARROSSEL DE IMAGENS ====================
async function loadCarouselImages() {
    try {
        const imagesRef = collection(db, IMAGES_COLLECTION);
        const q = query(imagesRef, orderBy('ordem', 'asc'));
        const querySnapshot = await getDocs(q);
        
        carouselImages = [];
        querySnapshot.forEach((doc) => {
            carouselImages.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderCarousel();
        startAutoSlide();
        
    } catch (error) {
        console.error('Erro ao carregar imagens:', error);
        // Se não houver imagens, mostrar placeholder
        if (carouselImages.length === 0) {
            document.getElementById('mainCarousel').innerHTML = `
                <div class="carousel-placeholder">
                    <i class="bi bi-image"></i>
                    <p>Nenhuma imagem no portfólio ainda</p>
                </div>
            `;
        }
    }
}

function renderCarousel() {
    const carousel = document.getElementById('mainCarousel');
    const indicators = document.getElementById('carouselIndicators');
    
    if (carouselImages.length === 0) {
        carousel.innerHTML = `
            <div class="carousel-placeholder">
                <i class="bi bi-image"></i>
                <p>Nenhuma imagem no portfólio ainda</p>
            </div>
        `;
        indicators.innerHTML = '';
        return;
    }
    
    // Renderizar slides
    carousel.innerHTML = carouselImages.map((img, index) => `
        <div class="carousel-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
            <img src="${img.url}" alt="${img.titulo || 'Imagem do portfólio'}">
            ${img.titulo ? `
                <div class="carousel-caption">
                    <h3>${img.titulo}</h3>
                    ${img.descricao ? `<p>${img.descricao}</p>` : ''}
                </div>
            ` : ''}
        </div>
    `).join('');
    
    // Renderizar indicadores
    indicators.innerHTML = carouselImages.map((_, index) => `
        <button class="indicator ${index === 0 ? 'active' : ''}" 
                data-index="${index}" 
                aria-label="Slide ${index + 1}">
        </button>
    `).join('');
    
    // Event listeners dos indicadores
    indicators.querySelectorAll('.indicator').forEach(dot => {
        dot.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            goToSlide(index);
        });
    });
    
    // Event listeners dos controles
    document.getElementById('prevSlide').addEventListener('click', () => prevSlide());
    document.getElementById('nextSlide').addEventListener('click', () => nextSlide());
    
    currentSlide = 0;
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');
    
    slides.forEach(slide => slide.classList.remove('active'));
    indicators.forEach(dot => dot.classList.remove('active'));
    
    slides[index].classList.add('active');
    indicators[index].classList.add('active');
    
    currentSlide = index;
}

function nextSlide() {
    const next = (currentSlide + 1) % carouselImages.length;
    goToSlide(next);
}

function prevSlide() {
    const prev = (currentSlide - 1 + carouselImages.length) % carouselImages.length;
    goToSlide(prev);
}

function startAutoSlide() {
    if (autoSlideInterval) clearInterval(autoSlideInterval);
    
    if (carouselImages.length > 1) {
        autoSlideInterval = setInterval(() => {
            nextSlide();
        }, 5000);
    }
}

// Pausar autoplay quando mouse estiver sobre o carrossel
document.addEventListener('DOMContentLoaded', () => {
    const carouselContainer = document.querySelector('.carousel-container');
    if (carouselContainer) {
        carouselContainer.addEventListener('mouseenter', () => {
            if (autoSlideInterval) clearInterval(autoSlideInterval);
        });
        
        carouselContainer.addEventListener('mouseleave', () => {
            startAutoSlide();
        });
    }
});

// ==================== SERVIÇOS ====================
async function loadServices() {
    try {
        const servicesRef = collection(db, SERVICES_COLLECTION);
        const q = query(servicesRef, orderBy('ordem', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const servicesGrid = document.getElementById('servicesGrid');
        let servicesHTML = '';
        
        querySnapshot.forEach((doc) => {
            const service = doc.data();
            servicesHTML += `
                <div class="service-card">
                    <i class="bi bi-check-circle-fill"></i>
                    <h3>${service.nome}</h3>
                    <p>${service.descricao || ''}</p>
                    ${service.preco ? `<span class="service-price">${service.preco}</span>` : ''}
                </div>
            `;
        });
        
        if (!servicesHTML) {
            servicesHTML = '<p class="no-data">Nenhum serviço cadastrado ainda</p>';
        }
        
        servicesGrid.innerHTML = servicesHTML;
        
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
    }
}

// ==================== ADMIN: CARREGAR DADOS ====================
async function loadAdminData() {
    await loadCurrentImages();
    await loadContentForm();
    await loadCurrentServices();
}

async function loadCurrentImages() {
    try {
        const imagesRef = collection(db, IMAGES_COLLECTION);
        const q = query(imagesRef, orderBy('ordem', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const container = document.getElementById('currentImages');
        let html = '';
        
        querySnapshot.forEach((doc) => {
            const img = doc.data();
            html += `
                <div class="image-item">
                    <img src="${img.thumb || img.url}" alt="${img.titulo || ''}">
                    <div class="image-info">
                        <strong>${img.titulo || 'Sem título'}</strong>
                        <p>${img.descricao || ''}</p>
                    </div>
                    <div class="image-actions">
                        <button onclick="deleteImage('${doc.id}')" class="btn-danger">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        if (!html) {
            html = '<p class="no-data">Nenhuma imagem cadastrada</p>';
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erro ao carregar imagens:', error);
    }
}

async function loadContentForm() {
    try {
        const contentRef = doc(db, CONTENT_DOC);
        const contentDoc = await getDoc(contentRef);
        
        if (contentDoc.exists()) {
            const data = contentDoc.data();
            document.getElementById('aboutText').value = data.sobre || '';
            document.getElementById('whatsapp').value = data.whatsapp || '';
            document.getElementById('instagram').value = data.instagram || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('endereco').value = data.endereco || '';
        }
    } catch (error) {
        console.error('Erro ao carregar conteúdo:', error);
    }
}

async function loadCurrentServices() {
    try {
        const servicesRef = collection(db, SERVICES_COLLECTION);
        const q = query(servicesRef, orderBy('ordem', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const container = document.getElementById('currentServices');
        let html = '';
        
        querySnapshot.forEach((doc) => {
            const service = doc.data();
            html += `
                <div class="service-admin-item">
                    <div class="service-info">
                        <strong>${service.nome}</strong>
                        <p>${service.descricao || ''}</p>
                        ${service.preco ? `<span>${service.preco}</span>` : ''}
                    </div>
                    <button onclick="deleteService('${doc.id}')" class="btn-danger">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
        });
        
        if (!html) {
            html = '<p class="no-data">Nenhum serviço cadastrado</p>';
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
    }
}

// ==================== ADMIN: UPLOAD DE IMAGENS ====================
async function handleImageUpload(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('imageFile');
    const titleInput = document.getElementById('imageTitle');
    const descriptionInput = document.getElementById('imageDescription');
    
    if (!fileInput.files || !fileInput.files[0]) {
        showToast('Selecione uma imagem!', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const progressBar = document.getElementById('uploadProgress');
    const progressFill = progressBar.querySelector('.progress-fill');
    
    // Mostrar progresso
    progressBar.style.display = 'block';
    progressFill.style.width = '0%';
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Enviando...';
    
    try {
        // Converter para base64
        const base64 = await fileToBase64(file);
        
        // Atualizar progresso
        progressFill.style.width = '50%';
        
        // Upload para ImgBB
        const result = await uploadParaImgbb(base64);
        
        progressFill.style.width = '100%';
        
        if (result.success) {
            // Salvar no Firestore
            const imagesRef = collection(db, IMAGES_COLLECTION);
            await addDoc(imagesRef, {
                url: result.url,
                thumb: result.thumb,
                delete_url: result.delete_url,
                titulo: titleInput.value,
                descricao: descriptionInput.value,
                ordem: carouselImages.length,
                data_upload: serverTimestamp()
            });
            
            showToast('Imagem adicionada com sucesso!');
            
            // Limpar formulário
            fileInput.value = '';
            titleInput.value = '';
            descriptionInput.value = '';
            
            // Recarregar dados
            await loadCurrentImages();
            await loadCarouselImages();
        }
        
    } catch (error) {
        console.error('Erro no upload:', error);
        showToast('Erro ao fazer upload: ' + error.message, 'error');
    } finally {
        progressBar.style.display = 'none';
        progressFill.style.width = '0%';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-cloud-upload"></i> Fazer Upload';
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ==================== ADMIN: SALVAR CONTEÚDO ====================
async function handleContentSave(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Salvando...';
    
    try {
        const data = {
            sobre: document.getElementById('aboutText').value,
            whatsapp: document.getElementById('whatsapp').value,
            instagram: document.getElementById('instagram').value,
            email: document.getElementById('email').value,
            endereco: document.getElementById('endereco').value,
            atualizado_em: serverTimestamp()
        };
        
        const contentRef = doc(db, CONTENT_DOC);
        await setDoc(contentRef, data, { merge: true });
        
        showToast('Informações salvas com sucesso!');
        
        // Atualizar visualização
        populatePortfolioContent(data);
        
    } catch (error) {
        console.error('Erro ao salvar conteúdo:', error);
        showToast('Erro ao salvar: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Salvar Informações';
    }
}

// ==================== ADMIN: GERENCIAR SERVIÇOS ====================
async function handleServiceAdd(e) {
    e.preventDefault();
    
    const nome = document.getElementById('serviceName').value;
    const descricao = document.getElementById('serviceDescription').value;
    const preco = document.getElementById('servicePrice').value;
    
    if (!nome) {
        showToast('Informe o nome do serviço!', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    
    try {
        const servicesRef = collection(db, SERVICES_COLLECTION);
        
        // Buscar última ordem
        const q = query(servicesRef, orderBy('ordem', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);
        let nextOrder = 0;
        
        if (!querySnapshot.empty) {
            nextOrder = querySnapshot.docs[0].data().ordem + 1;
        }
        
        await addDoc(servicesRef, {
            nome: nome,
            descricao: descricao,
            preco: preco,
            ordem: nextOrder,
            criado_em: serverTimestamp()
        });
        
        showToast('Serviço adicionado!');
        
        // Limpar formulário
        document.getElementById('serviceName').value = '';
        document.getElementById('serviceDescription').value = '';
        document.getElementById('servicePrice').value = '';
        
        // Recarregar
        await loadCurrentServices();
        await loadServices();
        
    } catch (error) {
        console.error('Erro ao adicionar serviço:', error);
        showToast('Erro: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

// ==================== FUNÇÕES GLOBAIS PARA OS BOTÕES ====================
window.deleteImage = async function(imageId) {
    if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;
    
    try {
        const imageRef = doc(db, IMAGES_COLLECTION, imageId);
        await deleteDoc(imageRef);
        
        showToast('Imagem excluída!');
        await loadCurrentImages();
        await loadCarouselImages();
        
    } catch (error) {
        console.error('Erro ao excluir imagem:', error);
        showToast('Erro ao excluir: ' + error.message, 'error');
    }
};

window.deleteService = async function(serviceId) {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    
    try {
        const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
        await deleteDoc(serviceRef);
        
        showToast('Serviço excluído!');
        await loadCurrentServices();
        await loadServices();
        
    } catch (error) {
        console.error('Erro ao excluir serviço:', error);
        showToast('Erro ao excluir: ' + error.message, 'error');
    }
};

// ==================== UTILITÁRIOS ====================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const icon = toast.querySelector('i');
    
    toastMessage.textContent = message;
    
    if (type === 'error') {
        toast.classList.add('toast-error');
        icon.className = 'bi bi-exclamation-circle';
    } else {
        toast.classList.remove('toast-error');
        icon.className = 'bi bi-check-circle';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}