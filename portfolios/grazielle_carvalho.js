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
    addDoc,
    getDocs,
    collection,
    query,
    orderBy,
    limit,
    serverTimestamp,
    uploadParaImgbb
} from '../0_firebase_api_config.js';

// ==================== CONFIGURAÇÃO ====================
const PROFESSIONAL_ID = 'grazielle.carvalho';
const PORTFOLIO_PATH = `portfolios/${PROFESSIONAL_ID}`;
const IMAGES_COLLECTION = `${PORTFOLIO_PATH}/imagens`;
const CONTENT_DOC = `${PORTFOLIO_PATH}/conteudo`;
const SERVICES_COLLECTION = `${PORTFOLIO_PATH}/servicos`;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando portfólio de:', PROFESSIONAL_ID);
    
    setupEventListeners();
    await loadPortfolioData();
    
    // Esconder loading screen
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
    }, 500);
});

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Acesso Administrativo
    document.getElementById('adminAccessBtn').addEventListener('click', (e) => {
        e.preventDefault();
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    });
    
    // Form de Login
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
    
    // Forms do Admin
    document.getElementById('imageUploadForm').addEventListener('submit', handleImageUpload);
    document.getElementById('contentForm').addEventListener('submit', handleContentSave);
    document.getElementById('serviceForm').addEventListener('submit', handleServiceAdd);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
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
        document.getElementById('navName').textContent = data.nome;
        document.title = `${data.nome} | Nutricionista - TratamentoWeb`;
    }
    if (data.titulo) {
        document.getElementById('navTitle').textContent = data.titulo;
    }
    
    // Sobre
    if (data.sobre) {
        document.getElementById('aboutContent').innerHTML = `
            <h3 class="mb-4">Minha História</h3>
            <p class="lead">${data.sobre}</p>
        `;
    }
    
    // WhatsApp
    if (data.whatsapp) {
        document.getElementById('btnWhatsappHero').href = `https://wa.me/${data.whatsapp}`;
    }
    
    // Contato
    const contactInfo = document.getElementById('contactInfo');
    let contactHTML = '<h3 class="mb-4">Informações de Contato</h3>';
    
    if (data.whatsapp) {
        contactHTML += `
            <a href="https://wa.me/${data.whatsapp}" target="_blank" class="contact-item">
                <i class="bi bi-whatsapp fs-3"></i>
                <div>
                    <strong>WhatsApp</strong><br>
                    <span>${formatWhatsapp(data.whatsapp)}</span>
                </div>
            </a>
        `;
    }
    
    if (data.instagram) {
        contactHTML += `
            <a href="https://instagram.com/${data.instagram.replace('@', '')}" target="_blank" class="contact-item">
                <i class="bi bi-instagram fs-3"></i>
                <div>
                    <strong>Instagram</strong><br>
                    <span>${data.instagram}</span>
                </div>
            </a>
        `;
    }
    
    if (data.email) {
        contactHTML += `
            <a href="mailto:${data.email}" class="contact-item">
                <i class="bi bi-envelope fs-3"></i>
                <div>
                    <strong>E-mail</strong><br>
                    <span>${data.email}</span>
                </div>
            </a>
        `;
    }
    
    if (data.endereco) {
        contactHTML += `
            <div class="contact-item">
                <i class="bi bi-geo-alt fs-3"></i>
                <div>
                    <strong>Endereço</strong><br>
                    <span>${data.endereco}</span>
                </div>
            </div>
        `;
    }
    
    contactInfo.innerHTML = contactHTML;
    
    // Redes sociais no footer
    const footerSocial = document.getElementById('footerSocial');
    let socialHTML = '<h6 class="fw-bold mb-3">Redes Sociais</h6>';
    
    if (data.whatsapp) {
        socialHTML += `<a href="https://wa.me/${data.whatsapp}" target="_blank" class="text-white me-3"><i class="bi bi-whatsapp"></i></a>`;
    }
    if (data.instagram) {
        socialHTML += `<a href="https://instagram.com/${data.instagram.replace('@', '')}" target="_blank" class="text-white me-3"><i class="bi bi-instagram"></i></a>`;
    }
    if (data.email) {
        socialHTML += `<a href="mailto:${data.email}" class="text-white me-3"><i class="bi bi-envelope"></i></a>`;
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
        
        const carouselInner = document.getElementById('carouselInner');
        const placeholder = document.getElementById('carouselPlaceholder');
        const mainCarousel = document.getElementById('mainCarousel');
        
        if (querySnapshot.empty) {
            mainCarousel.style.display = 'none';
            placeholder.classList.remove('d-none');
            return;
        }
        
        mainCarousel.style.display = 'block';
        placeholder.classList.add('d-none');
        
        let slidesHTML = '';
        let isFirst = true;
        
        querySnapshot.forEach((doc) => {
            const img = doc.data();
            slidesHTML += `
                <div class="carousel-item ${isFirst ? 'active' : ''}">
                    <img src="${img.url}" class="d-block w-100" alt="${img.titulo || 'Imagem do portfólio'}">
                    ${img.titulo ? `
                        <div class="carousel-caption d-none d-md-block">
                            <h5>${img.titulo}</h5>
                            ${img.descricao ? `<p>${img.descricao}</p>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
            isFirst = false;
        });
        
        carouselInner.innerHTML = slidesHTML;
        
    } catch (error) {
        console.error('Erro ao carregar imagens:', error);
    }
}

// ==================== SERVIÇOS ====================
async function loadServices() {
    try {
        const servicesRef = collection(db, SERVICES_COLLECTION);
        const q = query(servicesRef, orderBy('ordem', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const servicesGrid = document.getElementById('servicesGrid');
        
        if (querySnapshot.empty) {
            servicesGrid.innerHTML = '<div class="col-12 text-center text-muted py-5">Nenhum serviço cadastrado ainda</div>';
            return;
        }
        
        let servicesHTML = '';
        
        querySnapshot.forEach((doc) => {
            const service = doc.data();
            servicesHTML += `
                <div class="col-md-6 col-lg-4">
                    <div class="service-card">
                        <div class="service-icon">
                            <i class="bi bi-check-circle-fill"></i>
                        </div>
                        <h5>${service.nome}</h5>
                        <p class="text-muted">${service.descricao || ''}</p>
                        ${service.preco ? `<span class="service-price">${service.preco}</span>` : ''}
                    </div>
                </div>
            `;
        });
        
        servicesGrid.innerHTML = servicesHTML;
        
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
    }
}

// ==================== AUTENTICAÇÃO ====================
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const login = document.getElementById('adminLogin').value.trim();
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('loginError');
    const errorMessage = document.getElementById('loginErrorMessage');
    const submitBtn = document.getElementById('btnLoginSubmit');
    
    if (!login || !password) {
        errorMessage.textContent = 'Preencha todos os campos!';
        errorDiv.classList.remove('d-none');
        return;
    }
    
    const originalHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Autenticando...';
    submitBtn.disabled = true;
    
    try {
        // 1. Autenticar no Firebase Auth
        const email = `${login.toLowerCase()}@tratamentoweb.com`;
        await signInWithEmailAndPassword(auth, email, password);
        
        // 2. Verificar no Firestore
        const userRef = doc(db, 'logins', login);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            await auth.signOut();
            errorMessage.textContent = 'Usuário não encontrado!';
            errorDiv.classList.remove('d-none');
            return;
        }
        
        const userData = userDoc.data();
        
        // 3. Verificar se está ativo
        if (!userData.status_ativo) {
            await auth.signOut();
            errorMessage.textContent = 'Sua conta está desativada!';
            errorDiv.classList.remove('d-none');
            return;
        }
        
        // 4. Verificar permissão de edição do portfólio
        if (!userData.habilitar_edicao_portfolio) {
            await auth.signOut();
            errorMessage.textContent = 'Você não tem permissão para editar portfólios!';
            errorDiv.classList.remove('d-none');
            return;
        }
        
        // 5. Verificar se é o dono do portfólio
        if (login !== PROFESSIONAL_ID) {
            await auth.signOut();
            errorMessage.textContent = 'Você só pode editar seu próprio portfólio!';
            errorDiv.classList.remove('d-none');
            return;
        }
        
        // Login bem-sucedido
        await updateDoc(userRef, { ultimo_login: serverTimestamp() });
        
        // Fechar modal de login
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        loginModal.hide();
        
        // Limpar formulário
        document.getElementById('adminLoginForm').reset();
        errorDiv.classList.add('d-none');
        
        // Abrir modal de administração
        const adminModal = new bootstrap.Modal(document.getElementById('adminModal'));
        adminModal.show();
        
        // Carregar dados para edição
        await loadAdminData();
        
    } catch (error) {
        console.error('Erro no login:', error);
        
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
            errorMessage.textContent = 'Login ou senha incorretos!';
        } else if (error.code === 'auth/user-not-found') {
            errorMessage.textContent = 'Usuário não cadastrado!';
        } else {
            errorMessage.textContent = 'Erro na autenticação: ' + error.message;
        }
        errorDiv.classList.remove('d-none');
    } finally {
        submitBtn.innerHTML = originalHTML;
        submitBtn.disabled = false;
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
        
        const adminModal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
        adminModal.hide();
        
        showToast('Logout realizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
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
        
        if (querySnapshot.empty) {
            container.innerHTML = '<p class="text-muted text-center">Nenhuma imagem cadastrada</p>';
            return;
        }
        
        let html = '';
        
        querySnapshot.forEach((doc) => {
            const img = doc.data();
            html += `
                <div class="admin-image-item">
                    <img src="${img.thumb || img.url}" alt="${img.titulo || ''}">
                    <div class="image-info">
                        <strong>${img.titulo || 'Sem título'}</strong>
                        <p class="mb-0 text-white-50 small">${img.descricao || ''}</p>
                    </div>
                    <button class="btn btn-danger btn-sm" onclick="window.deleteImage('${doc.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
        });
        
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
        
        if (querySnapshot.empty) {
            container.innerHTML = '<p class="text-muted text-center">Nenhum serviço cadastrado</p>';
            return;
        }
        
        let html = '';
        
        querySnapshot.forEach((doc) => {
            const service = doc.data();
            html += `
                <div class="admin-service-item">
                    <div>
                        <strong>${service.nome}</strong>
                        <p class="mb-0 text-white-50 small">${service.descricao || ''}</p>
                        ${service.preco ? `<span class="badge bg-warning text-dark">${service.preco}</span>` : ''}
                    </div>
                    <button class="btn btn-danger btn-sm" onclick="window.deleteService('${doc.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
        });
        
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
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('uploadProgressBar');
    
    if (!fileInput.files || !fileInput.files[0]) {
        showToast('Selecione uma imagem!', 'danger');
        return;
    }
    
    const file = fileInput.files[0];
    
    // Mostrar progresso
    progressDiv.classList.remove('d-none');
    progressBar.style.width = '0%';
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
    
    try {
        // Converter para base64
        const base64 = await fileToBase64(file);
        progressBar.style.width = '50%';
        
        // Upload para ImgBB
        const result = await uploadParaImgbb(base64);
        progressBar.style.width = '100%';
        
        if (result.success) {
            // Buscar última ordem
            const imagesRef = collection(db, IMAGES_COLLECTION);
            const q = query(imagesRef, orderBy('ordem', 'desc'), limit(1));
            const querySnapshot = await getDocs(q);
            let nextOrder = 0;
            
            if (!querySnapshot.empty) {
                nextOrder = querySnapshot.docs[0].data().ordem + 1;
            }
            
            // Salvar no Firestore
            await addDoc(imagesRef, {
                url: result.url,
                thumb: result.thumb,
                delete_url: result.delete_url,
                titulo: titleInput.value,
                descricao: descriptionInput.value,
                ordem: nextOrder,
                data_upload: serverTimestamp()
            });
            
            showToast('Imagem adicionada com sucesso!', 'success');
            
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
        showToast('Erro ao fazer upload: ' + error.message, 'danger');
    } finally {
        progressDiv.classList.add('d-none');
        progressBar.style.width = '0%';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Fazer Upload';
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
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';
    
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
        
        showToast('Informações salvas com sucesso!', 'success');
        
        // Atualizar visualização
        populatePortfolioContent(data);
        
    } catch (error) {
        console.error('Erro ao salvar conteúdo:', error);
        showToast('Erro ao salvar: ' + error.message, 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Salvar Informações';
    }
}

// ==================== ADMIN: GERENCIAR SERVIÇOS ====================
async function handleServiceAdd(e) {
    e.preventDefault();
    
    const nome = document.getElementById('serviceName').value;
    const descricao = document.getElementById('serviceDescription').value;
    const preco = document.getElementById('servicePrice').value;
    
    if (!nome) {
        showToast('Informe o nome do serviço!', 'danger');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adicionando...';
    
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
        
        showToast('Serviço adicionado!', 'success');
        
        // Limpar formulário
        document.getElementById('serviceName').value = '';
        document.getElementById('serviceDescription').value = '';
        document.getElementById('servicePrice').value = '';
        
        // Recarregar
        await loadCurrentServices();
        await loadServices();
        
    } catch (error) {
        console.error('Erro ao adicionar serviço:', error);
        showToast('Erro: ' + error.message, 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Adicionar Serviço';
    }
}

// ==================== FUNÇÕES GLOBAIS ====================
window.deleteImage = async function(imageId) {
    if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;
    
    try {
        const imageRef = doc(db, IMAGES_COLLECTION, imageId);
        await deleteDoc(imageRef);
        
        showToast('Imagem excluída!', 'success');
        await loadCurrentImages();
        await loadCarouselImages();
        
    } catch (error) {
        console.error('Erro ao excluir imagem:', error);
        showToast('Erro ao excluir: ' + error.message, 'danger');
    }
};

window.deleteService = async function(serviceId) {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    
    try {
        const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
        await deleteDoc(serviceRef);
        
        showToast('Serviço excluído!', 'success');
        await loadCurrentServices();
        await loadServices();
        
    } catch (error) {
        console.error('Erro ao excluir serviço:', error);
        showToast('Erro ao excluir: ' + error.message, 'danger');
    }
};

// ==================== UTILITÁRIOS ====================
function showToast(message, type = 'success') {
    const toastEl = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.innerHTML = `<i class="bi bi-${type === 'success' ? 'check' : 'exclamation'}-circle me-2"></i>${message}`;
    toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
    
    const toast = new bootstrap.Toast(toastEl, {
        delay: 3000
    });
    toast.show();
}
