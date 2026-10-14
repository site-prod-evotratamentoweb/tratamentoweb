import { 
    db, 
    collection, 
    getDocs, 
    doc, 
    setDoc, 
    runTransaction,
    deleteDoc,
    getDoc, 
    addDoc, 
    auth, 
    signOut, 
    serverTimestamp,
    updateDoc,
    query,
    where,
    apiAutenticada
} from '../0_firebase_api_config.js';
import { deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { HomeCliente } from './home_cliente.js';
import { HomeNutricionista } from './home_nutricionista.js';
import { HomePsicologo } from './home_psicologo.js';

const MIGRACOES_LOGIN_LEGADO = [
    { loginAntigo: 'Geron01', nome: 'ADENICE FIGUEIREDO', loginNovo: 'adenice.figueiredo' },
    { loginAntigo: 'Geron02', nome: 'MARIA LUIZA ALMEIDA COSTA', loginNovo: 'maria.costa' }
];
const AUTH_PRIMEIRO_ACESSO_SINCRONIZADOS = new Set();

// ==================== FUNÇÕES COMPARTILHADAS ====================

export class FuncoesCompartilhadas {
    
    // ==================== UTILITÁRIOS GERAIS ====================
    
    static gerarCodigoTemporario() {
        const values = new Uint32Array(1);
        crypto.getRandomValues(values);
        return String(100000 + (values[0] % 900000));
    }

    static gerarSenhaPrimeiroAcesso(dataNascimento) {
        const match = String(dataNascimento || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return '';
        const [, ano, mes, dia] = match;
        const data = new Date(`${ano}-${mes}-${dia}T00:00:00.000Z`);
        if (
            Number.isNaN(data.getTime())
            || data.getUTCFullYear() !== Number(ano)
            || data.getUTCMonth() + 1 !== Number(mes)
            || data.getUTCDate() !== Number(dia)
        ) return '';
        return `${dia}${mes}${ano}`;
    }
    
    static gerarEmailPorLogin(login, organizacao = '') {
        const loginNormalizado = String(login || '').trim().toLowerCase();
        const organizacaoNormalizada = String(organizacao || '').trim().toUpperCase();

        if (organizacaoNormalizada) {
            return `${organizacaoNormalizada}-${loginNormalizado}@tratamentoweb.com.br`.toLowerCase();
        }

        return `${loginNormalizado}@tratamentoweb.com`;
    }

    static gerarLoginPorNome(nome) {
        const nomeNormalizado = this.normalizarNomeCompleto(nome);
        if (!this.validarNomeCompleto(nomeNormalizado)) return '';

        const partes = nomeNormalizado
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .split(/[^a-z]+/)
            .filter(Boolean);

        if (partes.length < 2) return '';
        return `${partes[0]}.${partes[partes.length - 1]}`;
    }

    static normalizarNomeCompleto(nome) {
        return String(nome || '').trim().replace(/\s+/g, ' ');
    }

    static validarNomeCompleto(nome) {
        return /^\p{L}+(?: \p{L}+)+$/u.test(this.normalizarNomeCompleto(nome));
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
            
            if (!profissionalLogin && currentUser.cargo === 'paciente') {
                return [];
            }
            
            if (!profissionalLogin) {
                profissionalLogin = currentUser.login;
            }

            await this.migrarCheckinsLegadosOrganizacao(currentUser);
            
            const profissionalRef = doc(db, "logins", profissionalLogin);
            const profissionalDoc = await getDoc(profissionalRef);
            
            if (!profissionalDoc.exists()) {
                return [];
            }
            
            const profissionalData = profissionalDoc.data();
            const pacientesMap = await this.migrarLoginsLegados(
                profissionalLogin,
                profissionalData.pacientes || {}
            );
            
            const pacientesList = [];
            
            for (const [pacienteLogin, pacienteNome] of Object.entries(pacientesMap)) {
                const pacienteBase = {
                    login: pacienteLogin,
                    nome: pacienteNome,
                    cargo: 'paciente',
                    perfil: 'operador',
                    status_ativo_login: false,
                    hasUltimoLogin: false
                };

                try {
                    const pacienteRef = doc(db, "logins", pacienteLogin);
                    const pacienteDoc = await getDoc(pacienteRef);
                    
                    if (pacienteDoc.exists()) {
                        const pacienteData = pacienteDoc.data();
                        if (Object.prototype.hasOwnProperty.call(pacienteData, 'status_ativo')) {
                            void updateDoc(pacienteRef, { status_ativo: deleteField() }).catch(() => {});
                        }

                        const chaveSincronizacaoAuth = `${currentUser.organizacao}:${pacienteLogin}`;
                        if (
                            !Object.prototype.hasOwnProperty.call(pacienteData, 'ultimo_login')
                            && !AUTH_PRIMEIRO_ACESSO_SINCRONIZADOS.has(chaveSincronizacaoAuth)
                        ) {
                            try {
                                const authSincronizado = await apiAutenticada(
                                    `/api/patients/${encodeURIComponent(pacienteLogin)}/first-access-auth`,
                                    { method: 'POST' }
                                );
                                pacienteData.codigo_temporario = authSincronizado.senha_primeiro_acesso;
                                pacienteData.email = authSincronizado.email;
                                delete pacienteData.codigo_expiracao;
                                await updateDoc(pacienteRef, {
                                    codigo_temporario: authSincronizado.senha_primeiro_acesso,
                                    codigo_expiracao: deleteField(),
                                    email: authSincronizado.email,
                                    status_ativo: deleteField()
                                });
                                AUTH_PRIMEIRO_ACESSO_SINCRONIZADOS.add(chaveSincronizacaoAuth);
                            } catch (error) {
                                console.warn(`Não foi possível sincronizar o Auth de ${pacienteLogin}:`, error.message);
                            }
                        }

                        pacientesList.push({
                            ...pacienteBase,
                            login: pacienteLogin,
                            nome: pacienteData.nome || pacienteNome,
                            email: pacienteData.email,
                            dataNascimento: pacienteData.dataNascimento,
                            sexo: pacienteData.sexo,
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
                        pacientesList.push(pacienteBase);
                    }
                } catch (err) {
                    // O vínculo no mapa do profissional é a fonte principal.
                    // Mesmo sem acesso ao documento individual, o paciente deve aparecer.
                    pacientesList.push(pacienteBase);
                }
            }
            
            if (pacientesList.length > 0) {
                const logins = pacientesList.map(({ login }) => login).join(',');
                const { statuses = {} } = await apiAutenticada(`/api/patients/statuses?logins=${encodeURIComponent(logins)}`);
                pacientesList.forEach((paciente) => {
                    paciente.status_ativo_login = statuses[paciente.login] === true;
                });
            }

            return pacientesList;
            
        } catch (error) {
            return [];
        }
    }

    static async migrarCheckinsLegadosOrganizacao(currentUser) {
        if (currentUser.perfil !== 'gerente') return;

        try {
            const registros = await apiAutenticada('/api/meal-plan-checkins/legacy/organization');
            for (const registro of Array.isArray(registros) ? registros : []) {
                if (!registro.id || !registro.paciente_login || !registro.plano_id || !registro.data) continue;

                const {
                    id,
                    organization: _organization,
                    data_atualizacao_backend: _legacyUpdatedAt,
                    ...dadosOperacionais
                } = registro;
                await setDoc(doc(db, 'checkins_plano_alimentar', id), {
                    ...dadosOperacionais,
                    data_atualizacao: serverTimestamp()
                }, { merge: true });
                await apiAutenticada(`/api/meal-plan-checkins/legacy/organization/${encodeURIComponent(id)}`, {
                    method: 'DELETE'
                });
            }
        } catch (_error) {
            // A migração é retomada no próximo acesso do gerente sem bloquear a lista de pacientes.
        }
    }

    static async migrarLoginsLegados(profissionalLogin, pacientesMap) {
        let pacientesAtualizados = { ...pacientesMap };
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser.perfil !== 'gerente') return pacientesAtualizados;

        const profissionalRef = doc(db, 'logins', profissionalLogin);

        for (const migracao of MIGRACOES_LOGIN_LEGADO) {
            const chaveAntigaNoMapa = Object.keys(pacientesAtualizados).find(
                (login) => login.toLowerCase() === migracao.loginAntigo.toLowerCase()
            );
            const chaveAntiga = chaveAntigaNoMapa || migracao.loginAntigo;

            const loginAntigoRef = doc(db, 'logins', chaveAntiga);
            const loginNovoRef = doc(db, 'logins', migracao.loginNovo);
            const [loginAntigoDoc, loginNovoDoc] = await Promise.all([
                getDoc(loginAntigoRef),
                getDoc(loginNovoRef)
            ]);

            if (!loginAntigoDoc.exists()) continue;

            const dadosAntigos = loginAntigoDoc.data();
            if (this.gerarLoginPorNome(dadosAntigos.nome) !== migracao.loginNovo) continue;
            if (Object.prototype.hasOwnProperty.call(dadosAntigos, 'ultimo_login')) {
                throw new Error(`O login ${chaveAntiga} já foi utilizado e precisa de migração assistida.`);
            }
            if (loginNovoDoc.exists() && this.gerarLoginPorNome(loginNovoDoc.data().nome) !== migracao.loginNovo) {
                throw new Error(`O login ${migracao.loginNovo} já pertence a outro paciente.`);
            }

            const { status_ativo: _statusLegado, ...dadosMigrados } = dadosAntigos;
            const senhaPrimeiroAcesso = this.gerarSenhaPrimeiroAcesso(dadosAntigos.dataNascimento);
            if (!senhaPrimeiroAcesso) {
                throw new Error(`Data de nascimento inválida para migrar ${chaveAntiga}.`);
            }
            await setDoc(loginNovoRef, {
                ...dadosMigrados,
                nome: migracao.nome,
                email: this.gerarEmailPorLogin(migracao.loginNovo, currentUser.organizacao),
                codigo_temporario: senhaPrimeiroAcesso,
                codigo_expiracao: deleteField(),
                profissionais_vinculados: {
                    ...(dadosMigrados.profissionais_vinculados || {}),
                    [profissionalLogin]: {
                        cargo: currentUser.cargo,
                        nome: currentUser.nome
                    }
                }
            }, { merge: true });

            await apiAutenticada(`/api/patients/${encodeURIComponent(chaveAntiga)}/rename`, {
                method: 'POST',
                body: JSON.stringify({
                    novo_login: migracao.loginNovo,
                    nome: migracao.nome,
                    codigo_temporario: senhaPrimeiroAcesso,
                    codigo_temporario_anterior: dadosAntigos.codigo_temporario
                })
            });

            if (chaveAntigaNoMapa) delete pacientesAtualizados[chaveAntigaNoMapa];
            pacientesAtualizados[migracao.loginNovo] = migracao.nome;
            await updateDoc(profissionalRef, { pacientes: pacientesAtualizados });
            await deleteDoc(loginAntigoRef);
        }

        return pacientesAtualizados;
    }
    
    static async verificarLoginExistente(login) {
        try {
            const userRef = doc(db, "logins", login);
            const userDoc = await getDoc(userRef);
            return userDoc.exists();
        } catch (error) {
            return false;
        }
    }
    
    static async registerPaciente(pacienteData) {
        const nome = this.normalizarNomeCompleto(pacienteData.nome);
        const { dataNascimento, sexo } = pacienteData;
        const loginBase = this.gerarLoginPorNome(nome);
        
        if (!nome || !dataNascimento || !sexo) {
            throw new Error('Preencha todos os campos!');
        }

        if (!this.validarNomeCompleto(nome)) {
            throw new Error('O nome deve conter somente letras e ter, no mínimo, nome e sobrenome.');
        }
        
        if (!this.validarIdade(dataNascimento)) {
            throw new Error('Paciente deve ter 18 anos ou mais!');
        }
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const disponibilidade = await apiAutenticada('/api/patients/availability', {
            method: 'POST',
            body: JSON.stringify({ nome, dataNascimento })
        });

        if (disponibilidade.duplicado) {
            throw new Error(`Já existe um paciente com este nome e esta data de nascimento (${disponibilidade.login_existente}).`);
        }

        const login = disponibilidade.login_sugerido || loginBase;
        const adicionarNumeracao = login !== loginBase;
        if (adicionarNumeracao) {
            const confirmou = window.confirm(
                `O login "${loginBase}" já existe. Deseja criar o novo login como "${login}"?`
            );
            if (!confirmou) throw new Error('Criação cancelada: o login não pode ser repetido.');
        }

        const codigo = this.gerarSenhaPrimeiroAcesso(dataNascimento);
        if (!/^\d{8}$/.test(codigo)) {
            throw new Error('A data de nascimento não permite gerar a senha de primeiro acesso.');
        }
        const emailGerado = this.gerarEmailPorLogin(login, currentUser.organizacao);
        
        const loginExiste = await this.verificarLoginExistente(login);
        if (loginExiste) {
            throw new Error('❌ Este login já está cadastrado! Escolha outro.');
        }
        
        try {
            const pacienteRef = doc(db, "logins", login);
            const profissionalRef = doc(db, "logins", currentUser.login);
            let pacientesAnteriores = {};
            
            const pacienteDataToSave = {
                nome: nome.toUpperCase(),
                email: emailGerado,
                dataNascimento: dataNascimento,
                sexo: sexo,
                cargo: "paciente",
                perfil: "operador",
                profissionais_vinculados: {
                    [currentUser.login]: {
                        cargo: currentUser.cargo,
                        nome: currentUser.nome
                    }
                },
                dataHoraCadastro: serverTimestamp(),
                codigo_temporario: codigo
            };
            
            await runTransaction(db, async (transaction) => {
                const [profissionalDoc, pacienteDoc] = await Promise.all([
                    transaction.get(profissionalRef),
                    transaction.get(pacienteRef)
                ]);
                if (!profissionalDoc.exists()) throw new Error('Profissional não encontrado.');
                if (pacienteDoc.exists()) throw new Error('Este login acabou de ser utilizado. Tente novamente.');

                pacientesAnteriores = profissionalDoc.data().pacientes || {};
                transaction.set(pacienteRef, pacienteDataToSave);
                transaction.update(profissionalRef, {
                    pacientes: {
                        ...pacientesAnteriores,
                        [login]: pacienteDataToSave.nome
                    }
                });
            });

            try {
                await apiAutenticada('/api/patients', {
                    method: 'POST',
                    body: JSON.stringify({
                        login,
                        nome,
                        dataNascimento,
                        codigo_temporario: codigo,
                        adicionar_numeracao: adicionarNumeracao
                    })
                });
            } catch (error) {
                await Promise.allSettled([
                    deleteDoc(pacienteRef),
                    updateDoc(profissionalRef, { pacientes: pacientesAnteriores })
                ]);
                throw error;
            }
            
            return { 
                success: true, 
                message: `✅ Paciente "${nome}" cadastrado com sucesso!`,
                codigo: codigo,
                login: login
            };
            
        } catch (error) {
            throw new Error('❌ Erro ao cadastrar paciente: ' + error.message);
        }
    }
    
    // ==================== FUNÇÕES DE AVALIAÇÃO ====================
    
    static async loadEvaluationsByPatient(patientLogin) {
        try {
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
            
            return evaluations;
            
        } catch (error) {
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
            throw new Error('Erro ao salvar avaliação: ' + error.message);
        }
    }
    
    static calculateNutritionalParameters(weight, height, idade, sexo, perfilAntropometrico = '') {
        if (!weight || !height || height <= 0) return null;
        
        const imc = weight / (height * height);
        const perfil = perfilAntropometrico || (idade >= 60 ? 'idoso' : 'adulto');
        
        let classification = '';
        if (perfil === 'idoso') {
            if (imc <= 22) classification = 'Baixo peso — classificação para idosos';
            else if (imc <= 27) classification = 'Peso adequado — classificação para idosos';
            else classification = 'Excesso de peso — classificação para idosos';
        } else {
            if (imc < 18.5) classification = 'Abaixo do peso';
            else if (imc < 25) classification = 'Peso normal';
            else if (imc < 30) classification = 'Sobrepeso';
            else if (imc < 35) classification = 'Obesidade grau I';
            else if (imc < 40) classification = 'Obesidade grau II';
            else classification = 'Obesidade grau III';
        }
        
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
        }
        localStorage.removeItem('currentUser');
        localStorage.removeItem('activeModule');
        localStorage.removeItem('planoAlimentarSelectedPacienteLogin');
        localStorage.removeItem('sessionCreatedAt');
        localStorage.removeItem('sessionExpiresAt');
        window.location.reload();
    }
    
    static async updatePaciente(login, data) {
        try {
            const userRef = doc(db, "logins", login);
            const { status_ativo_login, status_ativo: _legacyStatus, login: _login, ...dadosPaciente } = data;

            if (typeof status_ativo_login === 'boolean') {
                await apiAutenticada(`/api/patients/${encodeURIComponent(login)}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status_ativo_login })
                });
            }

            if (Object.keys(dadosPaciente).length > 0) {
                await updateDoc(userRef, {
                    ...dadosPaciente,
                    status_ativo: deleteField()
                });
            } else {
                void updateDoc(userRef, { status_ativo: deleteField() }).catch(() => {});
            }
            return { success: true };
        } catch (error) {
            throw new Error(error.message || 'Erro ao atualizar dados do paciente');
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
                throw new Error('❌ Nenhuma senha de primeiro acesso encontrada.');
            }
            
            return {
                success: true,
                codigo: userData.codigo_temporario,
                nome: userData.nome,
                login: login
            };
            
        } catch (error) {
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
            
            const novoCodigo = this.gerarSenhaPrimeiroAcesso(userData.dataNascimento);
            if (!/^\d{8}$/.test(novoCodigo)) {
                throw new Error('❌ Data de nascimento inválida para gerar a senha de primeiro acesso.');
            }

            await apiAutenticada(`/api/patients/${encodeURIComponent(login)}/first-access-auth`, {
                method: 'POST'
            });
            
            await updateDoc(userRef, {
                codigo_temporario: novoCodigo,
                codigo_expiracao: deleteField()
            });
            
            return {
                success: true,
                codigo: novoCodigo,
                nome: userData.nome,
                login: login
            };
            
        } catch (error) {
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
