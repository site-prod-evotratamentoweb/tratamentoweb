import { 
    db, 
    collection, 
    getDocs, 
    doc, 
    setDoc, 
    getDoc, 
    addDoc, 
    auth, 
    createUserWithEmailAndPassword, 
    signOut, 
    serverTimestamp,
    updateDoc,
    query,
    where
} from '../0_firebase_api_config.js';
import { deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { HomeCliente } from './home_cliente.js';
import { HomeNutricionista } from './home_nutricionista.js';
import { HomePsicologo } from './home_psicologo.js';

// ==================== FUNÇÕES COMPARTILHADAS ====================

export class FuncoesCompartilhadas {
    
    // ==================== UTILITÁRIOS GERAIS ====================
    
    static gerarCodigoTemporario() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    
    static gerarEmailPorLogin(login) {
        return `${login.toLowerCase()}@tratamentoweb.com`;
    }
    
    static formatDateToDisplay(dateString) {
        if (!dateString) return '';
        const partes = dateString.split('-');
        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        return dateString;
    }
    
    static formatarDataHoraCadastro() {
        const agora = new Date();
        const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                       'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        
        const dia = agora.getDate();
        const mes = meses[agora.getMonth()];
        const ano = agora.getFullYear();
        const horas = agora.getHours().toString().padStart(2, '0');
        const minutos = agora.getMinutes().toString().padStart(2, '0');
        const segundos = agora.getSeconds().toString().padStart(2, '0');
        
        const offset = -agora.getTimezoneOffset() / 60;
        const offsetSinal = offset >= 0 ? '+' : '';
        const offsetStr = `UTC${offsetSinal}${offset}`;
        
        return `${dia} de ${mes} de ${ano} às ${horas}:${minutos}:${segundos} ${offsetStr}`;
    }
    
    static validarIdade(dataNascimento) {
        if (!dataNascimento) return false;
        const dataNasc = new Date(dataNascimento);
        const hoje = new Date();
        let idade = hoje.getFullYear() - dataNasc.getFullYear();
        const mesDiff = hoje.getMonth() - dataNasc.getMonth();
        if (mesDiff < 0 || (mesDiff === 0 && hoje.getDate() < dataNasc.getDate())) {
            idade--;
        }
        return idade >= 18;
    }
    
    static calcularIdade(dataNascimento) {
        if (!dataNascimento) return null;
        const dataNasc = new Date(dataNascimento);
        const hoje = new Date();
        let idade = hoje.getFullYear() - dataNasc.getFullYear();
        const mesDiff = hoje.getMonth() - dataNasc.getMonth();
        if (mesDiff < 0 || (mesDiff === 0 && hoje.getDate() < dataNasc.getDate())) {
            idade--;
        }
        return idade;
    }
    
    // ==================== FUNÇÕES DE EXIBIÇÃO ====================
    
    static formatarCargo(cargo) {
        if (!cargo) return '';
        return cargo.charAt(0).toUpperCase() + cargo.slice(1);
    }
    
    static getPerfil(perfil) {
        return perfil || '';
    }
    
    // ==================== VALIDAÇÕES ====================
    
    static isCliente(cargo) {
        return cargo === 'paciente';
    }
    
    static isProfissional(cargo) {
        return cargo !== 'paciente';
    }
    
    static isCombinacaoValida(cargo, perfil) {
        if (this.isCliente(cargo)) {
            return perfil === 'operador' || perfil === 'operador_membro';
        }
        
        if (this.isProfissional(cargo)) {
            return perfil === 'supervisor' || perfil === 'gerente';
        }
        
        return false;
    }
    
    static podeCriarPaciente(perfil) {
        return perfil === 'gerente';
    }
    
    // ==================== FUNÇÕES DE PACIENTE ====================
    
    static async loadPacientesList(profissionalLogin = null) {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            
            if (currentUser.cargo === 'paciente') {
                console.log('🔒 Paciente não tem permissão para ver lista de pacientes');
                return [];
            }
            
            if (!profissionalLogin) {
                profissionalLogin = currentUser.login;
            }
            
            console.log('🔍 Buscando pacientes vinculados ao profissional:', profissionalLogin);
            
            const profissionalRef = doc(db, "logins", profissionalLogin);
            const profissionalDoc = await getDoc(profissionalRef);
            
            if (!profissionalDoc.exists()) {
                console.error('Profissional não encontrado:', profissionalLogin);
                return [];
            }
            
            const profissionalData = profissionalDoc.data();
            const pacientesMap = profissionalData.pacientes || {};
            
            const pacientesList = [];
            
            for (const [pacienteLogin, pacienteNome] of Object.entries(pacientesMap)) {
                try {
                    const pacienteRef = doc(db, "logins", pacienteLogin);
                    const pacienteDoc = await getDoc(pacienteRef);
                    
                    if (pacienteDoc.exists()) {
                        const pacienteData = pacienteDoc.data();
                        pacientesList.push({
                            login: pacienteLogin,
                            nome: pacienteData.nome || pacienteNome,
                            email: pacienteData.email,
                            dataNascimento: pacienteData.dataNascimento,
                            sexo: pacienteData.sexo,
                            status_ativo: pacienteData.status_ativo,
                            cargo: pacienteData.cargo,
                            perfil: pacienteData.perfil,
                            dataHoraCadastro: pacienteData.dataHoraCadastro,
                            hasUltimoLogin: pacienteData.hasOwnProperty('ultimo_login'),
                            telefone: pacienteData.telefone,
                            whatsapp: pacienteData.whatsapp,
                            endereco: pacienteData.endereco,
                            plano: pacienteData.plano
                        });
                    } else {
                        pacientesList.push({
                            login: pacienteLogin,
                            nome: pacienteNome,
                            cargo: 'paciente',
                            perfil: 'operador',
                            status_ativo: true,
                            hasUltimoLogin: false
                        });
                    }
                } catch (err) {
                    console.error(`Erro ao buscar paciente ${pacienteLogin}:`, err);
                }
            }
            
            console.log(`✅ Encontrados ${pacientesList.length} pacientes vinculados`);
            return pacientesList;
            
        } catch (error) {
            console.error("Erro ao carregar pacientes:", error);
            return [];
        }
    }
    
    static async verificarLoginExistente(login) {
        try {
            const userRef = doc(db, "logins", login);
            const userDoc = await getDoc(userRef);
            return userDoc.exists();
        } catch (error) {
            console.error("Erro ao verificar login:", error);
            return false;
        }
    }
    
    static async registerPaciente(pacienteData) {
        const { nome, login, dataNascimento, sexo } = pacienteData;
        
        if (!nome || !login || !dataNascimento || !sexo) {
            throw new Error('Preencha todos os campos!');
        }
        
        if (login.includes(' ')) {
            throw new Error('O login não pode conter espaços!');
        }
        
        if (!this.validarIdade(dataNascimento)) {
            throw new Error('Paciente deve ter 18 anos ou mais!');
        }
        
        const codigo = this.gerarCodigoTemporario();
        const emailGerado = this.gerarEmailPorLogin(login);
        const dataExpiracao = new Date();
        dataExpiracao.setDate(dataExpiracao.getDate() + 7);
        
        const loginExiste = await this.verificarLoginExistente(login);
        if (loginExiste) {
            throw new Error('❌ Este login já está cadastrado! Escolha outro.');
        }
        
        try {
            const pacienteRef = doc(db, "logins", login);
            
            const pacienteDataToSave = {
                nome: nome.toUpperCase(),
                email: emailGerado,
                dataNascimento: dataNascimento,
                sexo: sexo,
                cargo: "paciente",
                perfil: "operador",
                status_ativo: true,
                dataHoraCadastro: this.formatarDataHoraCadastro(),
                codigo_temporario: codigo,
                codigo_expiracao: dataExpiracao.toISOString()
            };
            
            await setDoc(pacienteRef, pacienteDataToSave);
            
            return { 
                success: true, 
                message: `✅ Paciente "${nome}" cadastrado com sucesso!`,
                codigo: codigo,
                login: login
            };
            
        } catch (error) {
            console.error("Erro ao cadastrar paciente:", error);
            throw new Error('❌ Erro ao cadastrar paciente: ' + error.message);
        }
    }
    
    // ==================== FUNÇÕES DE AVALIAÇÃO ====================
    
    static async loadEvaluationsByPatient(patientLogin) {
        try {
            console.log('🔍 Buscando avaliações do paciente:', patientLogin);
            
            const avaliacoesRef = collection(db, "avaliacao_nutricional");
            const q = query(avaliacoesRef, where("paciente_login", "==", patientLogin));
            const querySnapshot = await getDocs(q);
            
            const evaluations = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                evaluations.push({ id: doc.id, ...data });
            });
            
            evaluations.sort((a, b) => {
                const dateA = a.data_avaliacao || a.timestamp;
                const dateB = b.data_avaliacao || b.timestamp;
                return new Date(dateA) - new Date(dateB);
            });
            
            console.log(`✅ Encontradas ${evaluations.length} avaliações`);
            return evaluations;
            
        } catch (error) {
            console.error("Erro ao carregar avaliações:", error);
            return [];
        }
    }
    
    static async saveNutritionalEvaluation(evaluationData) {
        try {
            const docRef = await addDoc(collection(db, "avaliacao_nutricional"), {
                ...evaluationData,
                timestamp: new Date().toISOString()
            });
            return { success: true, message: '✅ Avaliação salva com sucesso!', id: docRef.id };
        } catch (error) {
            console.error("Erro ao salvar avaliação:", error);
            throw new Error('Erro ao salvar avaliação: ' + error.message);
        }
    }
    
    static calculateNutritionalParameters(weight, height, idade, sexo) {
        if (!weight || !height || height <= 0) return null;
        
        const imc = weight / (height * height);
        
        let classification = '';
        if (imc < 18.5) classification = 'Abaixo do peso';
        else if (imc < 25) classification = 'Peso normal';
        else if (imc < 30) classification = 'Sobrepeso';
        else if (imc < 35) classification = 'Obesidade grau I';
        else if (imc < 40) classification = 'Obesidade grau II';
        else classification = 'Obesidade grau III';
        
        let percentualMassaMuscularIdeal = 0;
        
        if (sexo === 'masculino') {
            if (idade <= 35) percentualMassaMuscularIdeal = 42;
            else if (idade <= 55) percentualMassaMuscularIdeal = 38;
            else if (idade <= 75) percentualMassaMuscularIdeal = 33.5;
            else percentualMassaMuscularIdeal = 30;
        } else {
            if (idade <= 35) percentualMassaMuscularIdeal = 27.5;
            else if (idade <= 55) percentualMassaMuscularIdeal = 26;
            else if (idade <= 75) percentualMassaMuscularIdeal = 24;
            else percentualMassaMuscularIdeal = 22;
        }
        
        if (imc > 25 && imc < 30) percentualMassaMuscularIdeal -= 1;
        else if (imc >= 30) percentualMassaMuscularIdeal -= 2;
        else if (imc < 18.5) percentualMassaMuscularIdeal -= 2;
        
        percentualMassaMuscularIdeal = Math.min(50, Math.max(20, percentualMassaMuscularIdeal));
        const massaMuscularIdealKg = (weight * percentualMassaMuscularIdeal) / 100;
        
        let percentualGorduraIdeal = 0;
        
        if (sexo === 'masculino') {
            if (idade < 30) percentualGorduraIdeal = 14;
            else if (idade < 50) percentualGorduraIdeal = 16;
            else percentualGorduraIdeal = 18;
        } else {
            if (idade < 30) percentualGorduraIdeal = 21;
            else if (idade < 50) percentualGorduraIdeal = 23;
            else percentualGorduraIdeal = 25;
        }
        
        if (imc < 18.5) percentualGorduraIdeal -= 2;
        else if (imc > 25) percentualGorduraIdeal += 2;
        if (imc > 30) percentualGorduraIdeal += 2;
        
        percentualGorduraIdeal = Math.min(35, Math.max(10, percentualGorduraIdeal));
        
        let idealBodyWater = 0;
        
        if (sexo === 'masculino') {
            if (idade < 30) idealBodyWater = 62;
            else if (idade < 50) idealBodyWater = 60;
            else idealBodyWater = 58;
        } else {
            if (idade < 30) idealBodyWater = 58;
            else if (idade < 50) idealBodyWater = 56;
            else idealBodyWater = 54;
        }
        
        if (imc > 25) idealBodyWater -= 3;
        if (imc > 30) idealBodyWater -= 2;
        idealBodyWater = Math.min(70, Math.max(45, idealBodyWater));
        
        return {
            imc: imc.toFixed(2),
            classification: classification,
            idealMuscleMass: massaMuscularIdealKg.toFixed(1),
            idealBodyFat: percentualGorduraIdeal + '%',
            idealBodyWater: idealBodyWater + '%'
        };
    }
    
    // ==================== FUNÇÕES DE UI ====================
    
    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'block';
    }
    
    static closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    }
    
    static setupModalEvents(modalId) {
        const modal = document.getElementById(modalId);
        const closeBtn = modal?.querySelector('.close');
        
        if (closeBtn) {
            closeBtn.onclick = () => this.closeModal(modalId);
        }
        
        window.onclick = (event) => {
            if (event.target === modal) {
                this.closeModal(modalId);
            }
        };
    }
    
    static showError(message, formId = 'loginForm') {
        const existingError = document.querySelector('.error-message-custom');
        if (existingError) existingError.remove();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message-custom';
        errorDiv.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i><span>${message}</span>`;
        
        const form = document.getElementById(formId);
        if (form) {
            const button = form.querySelector('button');
            if (button) {
                form.insertBefore(errorDiv, button);
            } else {
                form.appendChild(errorDiv);
            }
        }
        
        setTimeout(() => {
            if (errorDiv) errorDiv.remove();
        }, 5000);
    }
    
    static async logout() {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Erro ao fazer logout do Auth:", error);
        }
        localStorage.removeItem('currentUser');
        window.location.reload();
    }
    
    static async updatePaciente(login, data) {
        try {
            const userRef = doc(db, "logins", login);
            await updateDoc(userRef, data);
            return { success: true };
        } catch (error) {
            console.error("Erro ao atualizar paciente:", error);
            throw new Error('Erro ao atualizar dados do paciente');
        }
    }
    
    static async visualizarCodigoPaciente(login) {
        try {
            const userRef = doc(db, "logins", login);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                throw new Error('Paciente não encontrado!');
            }
            
            const userData = userDoc.data();
            
            if (userData.hasOwnProperty('ultimo_login')) {
                throw new Error('❌ Este paciente já fez o primeiro acesso!');
            }
            
            if (!userData.codigo_temporario) {
                throw new Error('❌ Nenhum código temporário encontrado.');
            }
            
            const dataExpiracao = new Date(userData.codigo_expiracao);
            if (dataExpiracao < new Date()) {
                throw new Error('⚠️ O código expirou! Gere um novo código.');
            }
            
            return {
                success: true,
                codigo: userData.codigo_temporario,
                expiracao: userData.codigo_expiracao,
                nome: userData.nome,
                login: login
            };
            
        } catch (error) {
            console.error("Erro ao visualizar código:", error);
            throw error;
        }
    }
    
    static async regenerarCodigoPaciente(login) {
        try {
            const userRef = doc(db, "logins", login);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                throw new Error('Paciente não encontrado!');
            }
            
            const userData = userDoc.data();
            
            if (userData.hasOwnProperty('ultimo_login')) {
                throw new Error('❌ Este paciente já fez o primeiro acesso!');
            }
            
            const novoCodigo = this.gerarCodigoTemporario();
            const dataExpiracao = new Date();
            dataExpiracao.setDate(dataExpiracao.getDate() + 7);
            
            await updateDoc(userRef, {
                codigo_temporario: novoCodigo,
                codigo_expiracao: dataExpiracao.toISOString()
            });
            
            return {
                success: true,
                codigo: novoCodigo,
                expiracao: dataExpiracao.toISOString(),
                nome: userData.nome,
                login: login
            };
            
        } catch (error) {
            console.error("Erro ao regenerar código:", error);
            throw error;
        }
    }
    
    static async resetarSenhaPaciente(login) {
        try {
            const userRef = doc(db, "logins", login);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                throw new Error('Paciente não encontrado!');
            }
            
            const userData = userDoc.data();
            
            if (!userData.hasOwnProperty('ultimo_login')) {
                throw new Error('❌ Este paciente ainda não fez o primeiro acesso! Use a opção de gerar código.');
            }
            
            const tokenReset = this.gerarCodigoTemporario();
            const dataExpiracao = new Date();
            dataExpiracao.setHours(dataExpiracao.getHours() + 1);
            
            await updateDoc(userRef, {
                reset_token: tokenReset,
                reset_token_expiracao: dataExpiracao.toISOString()
            });
            
            return {
                success: true,
                token: tokenReset,
                expiracao: dataExpiracao.toISOString(),
                nome: userData.nome,
                login: login
            };
            
        } catch (error) {
            console.error("Erro ao resetar senha:", error);
            throw error;
        }
    }
    
    static async visualizarTokenReset(login) {
        try {
            const userRef = doc(db, "logins", login);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                throw new Error('Paciente não encontrado!');
            }
            
            const userData = userDoc.data();
            
            if (!userData.reset_token) {
                throw new Error('❌ Nenhum token de reset ativo. Gere um novo token.');
            }
            
            const dataExpiracao = new Date(userData.reset_token_expiracao);
            if (dataExpiracao < new Date()) {
                throw new Error('⚠️ Token expirado! Gere um novo token.');
            }
            
            return {
                success: true,
                token: userData.reset_token,
                expiracao: userData.reset_token_expiracao,
                nome: userData.nome,
                login: login
            };
            
        } catch (error) {
            console.error("Erro ao visualizar token:", error);
            throw error;
        }
    }
    
    static async limparTokenReset(login) {
        try {
            const userRef = doc(db, "logins", login);
            await updateDoc(userRef, {
                reset_token: deleteField(),
                reset_token_expiracao: deleteField()
            });
            return { success: true };
        } catch (error) {
            console.error("Erro ao limpar token:", error);
            throw error;
        }
    }
}

// ==================== GERENCIADOR PRINCIPAL ====================

export class HomeManager {
    constructor(userInfo) {
        this.userInfo = userInfo;
        this.currentHome = null;
        this.funcoes = FuncoesCompartilhadas;
    }

    render() {
        this.showHomeByCargo(this.userInfo.cargo);
    }
    
    showHomeByCargo(cargo) {
        switch(cargo) {
            case 'paciente':
                this.currentHome = new HomeCliente(this.userInfo);
                break;
            case 'nutricionista':
                this.currentHome = new HomeNutricionista(this.userInfo);
                break;
            case 'psicologo':
                this.currentHome = new HomePsicologo(this.userInfo);
                break;
            default:
                this.currentHome = new HomeNutricionista(this.userInfo);
        }
        
        this.currentHome.render();
    }
}
