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
const PROFESSIONAL_ID = 'grazielle_carvalho';

// ✅ CORRIGIDO: Usando documento raiz para conteúdo
const PORTFOLIO_DOC_REF = doc(db, 'portfolios', PROFESSIONAL_ID); // Documento principal com todos os dados
const IMAGES_COLLECTION_REF = collection(PORTFOLIO_DOC_REF, 'imagens'); // Subcoleção imagens
const SERVICES_COLLECTION_REF = collection(PORTFOLIO_DOC_REF, 'servicos'); // Subcoleção serviços

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando portfólio de:', PROFESSIONAL_ID);
    
    setupEventListeners();
    await loadPortfolioData();
    
    // Esconder loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }, 500);
});

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Acesso Administrativo
    const adminAccessBtn = document.getElementById('adminAccessBtn');
    if (adminAccessBtn) {
        adminAccessBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
        });
    }
    
    // Form de Login
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleAdminLogin);
    }
    
    // Forms do Admin
    const imageUploadForm = document.getElementById('imageUploadForm');
    if (imageUploadForm) {
        imageUploadForm.addEventListener('submit', handleImageUpload);
    }
    
    const contentForm = document.getElementById('contentForm');
    if (contentForm) {
        contentForm.addEventListener('submit', handleContentSave);
    }
    
    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) {
        serviceForm.addEventListener('submit', handleServiceAdd);
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// ==================== CARREGAR DADOS DO PORTFÓLIO ====================
async function loadPortfolioData() {
    try {
        console.log('📁 Carregando conteúdo do portfólio...');
        
        const portfolioDoc = await getDoc(PORTFOLIO_DOC_REF);
        
        if (portfolioDoc.exists()) {
            const data = portfolioDoc.data();
            console.log('✅ Conteúdo carregado:', data);
            populatePortfolioContent(data);
        } else {
            console.log('ℹ️ Nenhum conteúdo cadastrado ainda');
            await setDoc(PORTFOLIO_DOC_REF, {
                nome: "Grazielle Carvalho",
                titulo: "Nutricionista",
                sobre: "Bem-vindo ao meu portfólio! Em breve mais informações.",
                criado_em: serverTimestamp()
            }, { merge: true });
            await loadPortfolioData();
        }
        
        await loadCarouselImages();
        await loadServices();
        
        // ✅ ADICIONE ESTA LINHA AQUI - Forçar esconder loading
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados do portfólio:', error);
        // Esconder loading mesmo com erro
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
}

function populatePortfolioContent(data) {
    // Atualizar nome e título
    if (data.nome) {
        const navName = document.getElementById('navName');
        if (navName) navName.textContent = data.nome;
        document.title = `${data.nome} | Nutricionista - TratamentoWeb`;
    }
    
    if (data.titulo) {
        const navTitle = document.getElementById('navTitle');
        if (navTitle) navTitle.textContent = data.titulo;
    }
    
    // Sobre
    if (data.sobre) {
        const aboutContent = document.getElementById('aboutContent');
        if (aboutContent) {
            aboutContent.innerHTML = `
                <h3 class="mb-4">Minha História</h3>
                <p class="lead">${data.sobre}</p>
            `;
        }
    }
    
    // WhatsApp
    if (data.whatsapp) {
        const btnWhatsapp = document.getElementById('btnWhatsappHero');
        if (btnWhatsapp) {
            btnWhatsapp.href = `https://wa.me/${data.whatsapp}`;
        }
    }
    
    // Contato
    const contactInfo = document.getElementById('contactInfo');
    if (contactInfo) {
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
    }
    
    // Redes sociais no footer
    const footerSocial = document.getElementById('footerSocial');
    if (footerSocial) {
        let socialHTML = '<h6 class="fw-bold mb-3">Redes Sociais</h6>';
        
        if (data.whatsapp) {
            socialHTML += `<a href="https://wa.me/${data.whatsapp}" target="_blank" class="text-white me-3"><i class="bi bi-whatsapp fs-4"></i></a>`;
        }
        if (data.instagram) {
            socialHTML += `<a href="https://instagram.com/${data.instagram.replace('@', '')}" target="_blank" class="text-white me-3"><i class="bi bi-instagram fs-4"></i></a>`;
        }
        if (data.email) {
            socialHTML += `<a href="mailto:${data.email}" class="text-white me-3"><i class="bi bi-envelope fs-4"></i></a>`;
        }
        
        footerSocial.innerHTML = socialHTML;
    }
}

function formatWhatsapp(number) {
    if (!number) return '';
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 13) {
        return `(${cleaned.substring(2,4)}) ${cleaned.substring(4,9)}-${cleaned.substring(9)}`;
    }
    return number;
}

// ==================== CARROSSEL DE IMAGENS ====================
async function loadCarouselImages() {
    try {
        const q = query(IMAGES_COLLECTION_REF, orderBy('ordem', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const carouselInner = document.getElementById('carouselInner');
        const placeholder = document.getElementById('carouselPlaceholder');
        const mainCarousel = document.getElementById('mainCarousel');
        
        if (!carouselInner) return;
        
        if (querySnapshot.empty) {
            if (mainCarousel) mainCarousel.style.display = 'none';
            if (placeholder) {
                placeholder.classList.remove('d-none');
                placeholder.innerHTML = `
                    <div class="text-center py-5">
                        <i class="bi bi-images fs-1 text-muted"></i>
                        <h4 class="mt-3">Em breve, fotos do meu trabalho</h4>
                        <p class="text-muted">Entre em contato para mais informações</p>
                    </div>
                `;
            }
            return;
        }
        
        if (mainCarousel) mainCarousel.style.display = 'block';
        if (placeholder) placeholder.classList.add('d-none');
        
        let slidesHTML = '';
        let isFirst = true;
        
        querySnapshot.forEach((doc) => {
            const img = doc.data();
            slidesHTML += `
                <div class="carousel-item ${isFirst ? 'active' : ''}">
                    <img src="${img.url}" class="d-block w-100" alt="${img.titulo || 'Imagem do portfólio'}" style="height: 500px; object-fit: cover;">
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
        console.log('✅ Carrossel carregado com', querySnapshot.size, 'imagens');
        
    } catch (error) {
        console.error('❌ Erro ao carregar imagens:', error);
    }
}

// ==================== SERVIÇOS ====================
async function loadServices() {
    try {
        const q = query(SERVICES_COLLECTION_REF, orderBy('ordem', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const servicesGrid = document.getElementById('servicesGrid');
        if (!servicesGrid) return;
        
        if (querySnapshot.empty) {
            servicesGrid.innerHTML = '<div class="col-12 text-center py-5"><i class="bi bi-briefcase fs-1 text-muted"></i><h5 class="mt-3">Serviços em breve</h5><p class="text-muted">Entre em contato para saber mais</p></div>';
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
        console.log('✅ Serviços carregados:', querySnapshot.size);
        
    } catch (error) {
        console.error('❌ Erro ao carregar serviços:', error);
    }
}

// ==================== AUTENTICAÇÃO ====================
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const loginInput = document.getElementById('adminLogin');
    const passwordInput = document.getElementById('adminPassword');
    const errorDiv = document.getElementById('loginError');
    const errorMessage = document.getElementById('loginErrorMessage');
    const submitBtn = document.getElementById('btnLoginSubmit');
    
    if (!loginInput || !passwordInput) return;
    
    const login = loginInput.value.trim();
    const password = passwordInput.value;
    
    if (!login || !password) {
        if (errorMessage) errorMessage.textContent = 'Preencha todos os campos!';
        if (errorDiv) errorDiv.classList.remove('d-none');
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
            if (errorMessage) errorMessage.textContent = 'Usuário não encontrado!';
            if (errorDiv) errorDiv.classList.remove('d-none');
            return;
        }
        
        const userData = userDoc.data();
        
        // 3. Verificar se está ativo
        if (!userData.status_ativo) {
            await auth.signOut();
            if (errorMessage) errorMessage.textContent = 'Sua conta está desativada!';
            if (errorDiv) errorDiv.classList.remove('d-none');
            return;
        }
        
        // 4. Verificar permissão de edição do portfólio
        if (!userData.habilitar_edicao_portfolio) {
            await auth.signOut();
            if (errorMessage) errorMessage.textContent = 'Você não tem permissão para editar portfólios!';
            if (errorDiv) errorDiv.classList.remove('d-none');
            return;
        }
        
        // 5. Verificar se é o dono do portfólio
        if (login !== PROFESSIONAL_ID) {
            await auth.signOut();
            if (errorMessage) errorMessage.textContent = 'Você só pode editar seu próprio portfólio!';
            if (errorDiv) errorDiv.classList.remove('d-none');
            return;
        }
        
        // Login bem-sucedido
        console.log('✅ Login administrativo realizado:', login);
        await updateDoc(userRef, { ultimo_login: serverTimestamp() });
        
        // Fechar modal de login
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (loginModal) loginModal.hide();
        
        // Limpar formulário
        document.getElementById('adminLoginForm').reset();
        if (errorDiv) errorDiv.classList.add('d-none');
        
        // Abrir modal de administração
        const adminModal = new bootstrap.Modal(document.getElementById('adminModal'));
        adminModal.show();
        
        // Carregar dados para edição
        await loadAdminData();
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
            if (errorMessage) errorMessage.textContent = 'Login ou senha incorretos!';
        } else if (error.code === 'auth/user-not-found') {
            if (errorMessage) errorMessage.textContent = 'Usuário não cadastrado!';
        } else {
            if (errorMessage) errorMessage.textContent = 'Erro na autenticação: ' + error.message;
        }
        if (errorDiv) errorDiv.classList.remove('d-none');
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
        }
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
        
        const adminModal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
        if (adminModal) adminModal.hide();
        
        showToast('Logout realizado com sucesso!', 'success');
    } catch (error) {
        console.error('❌ Erro ao fazer logout:', error);
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
        const q = query(IMAGES_COLLECTION_REF, orderBy('ordem', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const container = document.getElementById('currentImages');
        if (!container) return;
        
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
        console.error('❌ Erro ao carregar imagens admin:', error);
    }
}

async function loadContentForm() {
    try {
        const portfolioDoc = await getDoc(PORTFOLIO_DOC_REF);
        
        if (portfolioDoc.exists()) {
            const data = portfolioDoc.data();
            
            const aboutText = document.getElementById('aboutText');
            const whatsapp = document.getElementById('whatsapp');
            const instagram = document.getElementById('instagram');
            const email = document.getElementById('email');
            const endereco = document.getElementById('endereco');
            
            if (aboutText) aboutText.value = data.sobre || '';
            if (whatsapp) whatsapp.value = data.whatsapp || '';
            if (instagram) instagram.value = data.instagram || '';
            if (email) email.value = data.email || '';
            if (endereco) endereco.value = data.endereco || '';
        }
    } catch (error) {
        console.error('❌ Erro ao carregar conteúdo admin:', error);
    }
}

async function loadCurrentServices() {
    try {
        const q = query(SERVICES_COLLECTION_REF, orderBy('ordem', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const container = document.getElementById('currentServices');
        if (!container) return;
        
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
        console.error('❌ Erro ao carregar serviços admin:', error);
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
    
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        showToast('Selecione uma imagem!', 'danger');
        return;
    }
    
    const file = fileInput.files[0];
    
    if (progressDiv) progressDiv.classList.remove('d-none');
    if (progressBar) progressBar.style.width = '0%';
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
    
    try {
        const base64 = await fileToBase64(file);
        if (progressBar) progressBar.style.width = '50%';
        
        const result = await uploadParaImgbb(base64);
        if (progressBar) progressBar.style.width = '100%';
        
        if (result.success) {
            const q = query(IMAGES_COLLECTION_REF, orderBy('ordem', 'desc'), limit(1));
            const querySnapshot = await getDocs(q);
            let nextOrder = 0;
            
            if (!querySnapshot.empty) {
                nextOrder = querySnapshot.docs[0].data().ordem + 1;
            }
            
            await addDoc(IMAGES_COLLECTION_REF, {
                url: result.url,
                thumb: result.thumb,
                delete_url: result.delete_url,
                titulo: titleInput ? titleInput.value : '',
                descricao: descriptionInput ? descriptionInput.value : '',
                ordem: nextOrder,
                data_upload: serverTimestamp()
            });
            
            showToast('Imagem adicionada com sucesso!', 'success');
            
            fileInput.value = '';
            if (titleInput) titleInput.value = '';
            if (descriptionInput) descriptionInput.value = '';
            
            await loadCurrentImages();
            await loadCarouselImages();
        }
        
    } catch (error) {
        console.error('❌ Erro no upload:', error);
        showToast('Erro ao fazer upload: ' + error.message, 'danger');
    } finally {
        if (progressDiv) progressDiv.classList.add('d-none');
        if (progressBar) progressBar.style.width = '0%';
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
        const aboutText = document.getElementById('aboutText');
        const whatsapp = document.getElementById('whatsapp');
        const instagram = document.getElementById('instagram');
        const email = document.getElementById('email');
        const endereco = document.getElementById('endereco');
        
        const data = {
            sobre: aboutText ? aboutText.value : '',
            whatsapp: whatsapp ? whatsapp.value : '',
            instagram: instagram ? instagram.value : '',
            email: email ? email.value : '',
            endereco: endereco ? endereco.value : '',
            atualizado_em: serverTimestamp()
        };
        
        // ✅ CORRIGIDO: Salvar no documento raiz
        await setDoc(PORTFOLIO_DOC_REF, data, { merge: true });
        
        showToast('Informações salvas com sucesso!', 'success');
        
        // Atualizar visualização
        const portfolioDoc = await getDoc(PORTFOLIO_DOC_REF);
        if (portfolioDoc.exists()) {
            populatePortfolioContent(portfolioDoc.data());
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar conteúdo:', error);
        showToast('Erro ao salvar: ' + error.message, 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Salvar Informações';
    }
}

// ==================== ADMIN: GERENCIAR SERVIÇOS ====================
async function handleServiceAdd(e) {
    e.preventDefault();
    
    const serviceName = document.getElementById('serviceName');
    const serviceDescription = document.getElementById('serviceDescription');
    const servicePrice = document.getElementById('servicePrice');
    
    const nome = serviceName ? serviceName.value : '';
    const descricao = serviceDescription ? serviceDescription.value : '';
    const preco = servicePrice ? servicePrice.value : '';
    
    if (!nome) {
        showToast('Informe o nome do serviço!', 'danger');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adicionando...';
    
    try {
        const q = query(SERVICES_COLLECTION_REF, orderBy('ordem', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);
        let nextOrder = 0;
        
        if (!querySnapshot.empty) {
            nextOrder = querySnapshot.docs[0].data().ordem + 1;
        }
        
        await addDoc(SERVICES_COLLECTION_REF, {
            nome: nome,
            descricao: descricao,
            preco: preco,
            ordem: nextOrder,
            criado_em: serverTimestamp()
        });
        
        showToast('Serviço adicionado!', 'success');
        
        if (serviceName) serviceName.value = '';
        if (serviceDescription) serviceDescription.value = '';
        if (servicePrice) servicePrice.value = '';
        
        await loadCurrentServices();
        await loadServices();
        
    } catch (error) {
        console.error('❌ Erro ao adicionar serviço:', error);
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
        const imageRef = doc(IMAGES_COLLECTION_REF, imageId);
        await deleteDoc(imageRef);
        
        showToast('Imagem excluída!', 'success');
        await loadCurrentImages();
        await loadCarouselImages();
        
    } catch (error) {
        console.error('❌ Erro ao excluir imagem:', error);
        showToast('Erro ao excluir: ' + error.message, 'danger');
    }
};

window.deleteService = async function(serviceId) {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    
    try {
        const serviceRef = doc(SERVICES_COLLECTION_REF, serviceId);
        await deleteDoc(serviceRef);
        
        showToast('Serviço excluído!', 'success');
        await loadCurrentServices();
        await loadServices();
        
    } catch (error) {
        console.error('❌ Erro ao excluir serviço:', error);
        showToast('Erro ao excluir: ' + error.message, 'danger');
    }
};

// ==================== UTILITÁRIOS ====================
function showToast(message, type = 'success') {
    const toastEl = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toastEl || !toastMessage) return;
    
    const icon = type === 'success' ? 'check' : 'exclamation';
    toastMessage.innerHTML = `<i class="bi bi-${icon}-circle me-2"></i>${message}`;
    toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
    
    const toast = new bootstrap.Toast(toastEl, {
        delay: 3000
    });
    toast.show();
}
