// 0_complementos_menu_navegacao.js
import { FuncoesCompartilhadas } from './0_home.js';

// ==================== CLASSE BASE DE NAVEGAÇÃO ====================

export class NavegadorBase {
    constructor(userInfo, pacientesList = []) {
        this.userInfo = userInfo;
        this.pacientesList = pacientesList;
        this.funcoes = FuncoesCompartilhadas;
    }

    async navegarPara(module, telaAtual = null) {
        const moduloLower = module.toLowerCase();
        
        // Rotas comuns para todos os perfis
        switch(moduloLower) {
            case 'home':
                await this.irParaHome();
                return true;
            case 'cadastro_cliente':
                await this.irParaCadastroCliente();
                return true;
            case 'logout':
                this.funcoes.logout();
                return true;
        }
        
        return false; // Módulo não encontrado na navegação base
    }

    async irParaHome() {
        // Será sobrescrito pelas classes filhas
        console.warn('Método irParaHome deve ser implementado pela classe filha');
    }

    async irParaCadastroCliente() {
        const { CadastroCliente } = await import('./cadastro_cliente.js');
        const cadastroCliente = new CadastroCliente(this.userInfo);
        cadastroCliente.render();
    }

    showMensagemDesenvolvimento(module) {
        alert(`🚧 Módulo "${module}" em desenvolvimento`);
    }
}

// ==================== NAVEGADOR DO NUTRICIONISTA ====================

export class NavegadorNutricionista extends NavegadorBase {
    constructor(userInfo, pacientesList = []) {
        super(userInfo, pacientesList);
    }

    async navegarPara(module, telaAtual = null) {
        const moduloLower = module.toLowerCase();
        
        // Tenta navegar pelos módulos do nutricionista primeiro
        switch(moduloLower) {
            case 'plano_alimentar':
                await this.irParaPlanoAlimentar();
                return true;
            case 'anamnese':
                await this.irParaAnamnese();
                return true;
            case 'calculo_energetico':
                await this.irParaCalculoEnergetico();
                return true;
            case 'evolucao_paciente':
                await this.irParaEvolucaoPaciente();
                return true;
            case 'relatorios_nutricionais':
                await this.irParaRelatoriosNutricionais();
                return true;
            case 'shopping_nutri':
                await this.irParaShoppingNutri();
                return true;
        }
        
        // Se não encontrou, tenta navegar pelos módulos base
        const navegou = await super.navegarPara(module, telaAtual);
        if (!navegou) {
            this.showMensagemDesenvolvimento(module);
        }
    }

    async irParaHome() {
        const { HomeNutricionista } = await import('./home_nutricionista.js');
        const homeScreen = new HomeNutricionista(this.userInfo);
        homeScreen.render();
    }

    async irParaPlanoAlimentar() {
        const { PlanoAlimentarNutricionista } = await import('./plano_alimentar_nutricionista.js');
        const planoScreen = new PlanoAlimentarNutricionista(this.userInfo, this.pacientesList);
        planoScreen.render();
    }

    async irParaAnamnese() {
        const { AnamneseNutricionista } = await import('./anamnese_nutricionista.js');
        const anamneseScreen = new AnamneseNutricionista(this.userInfo, this.pacientesList);
        anamneseScreen.render();
    }

    async irParaCalculoEnergetico() {
        const { CalculoEnergeticoNutricionista } = await import('./calculo_energetico_nutricionista.js');
        const calculoScreen = new CalculoEnergeticoNutricionista(this.userInfo, this.pacientesList);
        calculoScreen.render();
    }

    async irParaEvolucaoPaciente() {
        // Para futura implementação
        this.showMensagemDesenvolvimento('evolucao_paciente');
    }

    async irParaRelatoriosNutricionais() {
        // Para futura implementação
        this.showMensagemDesenvolvimento('relatorios_nutricionais');
    }

    async irParaShoppingNutri() {
        const { ShoppingNutriNutricionista } = await import('./shopping_nutri_nutricionista.js');
        const shoppingScreen = new ShoppingNutriNutricionista(this.userInfo, this.pacientesList);
        shoppingScreen.render();
    }
}

// ==================== NAVEGADOR DO PSICÓLOGO ====================

export class NavegadorPsicologo extends NavegadorBase {
    constructor(userInfo, pacientesList = []) {
        super(userInfo, pacientesList);
    }

    async navegarPara(module, telaAtual = null) {
        const moduloLower = module.toLowerCase();
        
        // Módulos específicos do psicólogo
        switch(moduloLower) {
            case 'avaliacao_psicologica':
                await this.irParaAvaliacaoPsicologica();
                return true;
            case 'prontuario_psicologico':
                await this.irParaProntuarioPsicologico();
                return true;
            case 'escalas_avaliacao':
                await this.irParaEscalasAvaliacao();
                return true;
            case 'evolucao_psicologica':
                await this.irParaEvolucaoPsicologica();
                return true;
            case 'relatorios_psicologicos':
                await this.irParaRelatoriosPsicologicos();
                return true;
            case 'shopping_nutri':
                await this.irParaShoppingNutri();
                return true;
        }
        
        // Tenta navegar pelos módulos base
        const navegou = await super.navegarPara(module, telaAtual);
        if (!navegou) {
            this.showMensagemDesenvolvimento(module);
        }
    }

    async irParaHome() {
        const { HomePsicologo } = await import('./home_psicologo.js');
        const homeScreen = new HomePsicologo(this.userInfo);
        homeScreen.render();
    }

    async irParaAvaliacaoPsicologica() {
        const { AvaliacaoPsicologica } = await import('./avaliacao_psicologica.js');
        const avaliacaoScreen = new AvaliacaoPsicologica(this.userInfo, this.pacientesList);
        avaliacaoScreen.render();
    }

    async irParaProntuarioPsicologico() {
        this.showMensagemDesenvolvimento('prontuario_psicologico');
    }

    async irParaEscalasAvaliacao() {
        this.showMensagemDesenvolvimento('escalas_avaliacao');
    }

    async irParaEvolucaoPsicologica() {
        this.showMensagemDesenvolvimento('evolucao_psicologica');
    }

    async irParaRelatoriosPsicologicos() {
        this.showMensagemDesenvolvimento('relatorios_psicologicos');
    }

    async irParaShoppingNutri() {
        const { ShoppingNutriNutricionista } = await import('./shopping_nutri_nutricionista.js');
        const shoppingScreen = new ShoppingNutriNutricionista(this.userInfo, this.pacientesList);
        shoppingScreen.render();
    }
}

// ==================== NAVEGADOR DO PACIENTE ====================

export class NavegadorPaciente extends NavegadorBase {
    constructor(userInfo) {
        super(userInfo, []);
    }

    async navegarPara(module, telaAtual = null) {
        const moduloLower = module.toLowerCase();
        
        // Módulos específicos do paciente
        switch(moduloLower) {
            case 'minhas_avaliacoes':
                await this.irParaMinhasAvaliacoes();
                return true;
            case 'meu_plano_alimentar':
                await this.irParaMeuPlanoAlimentar();
                return true;
            case 'minha_anamnese':
                await this.irParaMinhaAnamnese();
                return true;
            case 'meus_resultados':
                await this.irParaMeusResultados();
                return true;
            case 'meus_agendamentos':
                await this.irParaMeusAgendamentos();
                return true;
            case 'minhas_mensagens':
                await this.irParaMinhasMensagens();
                return true;
            case 'minha_jornada':
                await this.irParaMinhaJornada();
                return true;
            case 'shopping_nutri':
                await this.irParaShoppingNutri();
                return true;
        }
        
        // Tenta navegar pelos módulos base
        const navegou = await super.navegarPara(module, telaAtual);
        if (!navegou) {
            this.showMensagemDesenvolvimento(module);
        }
    }

    async irParaHome() {
        const { HomeCliente } = await import('./home_cliente.js');
        const homeScreen = new HomeCliente(this.userInfo);
        homeScreen.render();
    }

    async irParaMinhasAvaliacoes() {
        // Já está na home do cliente, apenas recarrega
        await this.irParaHome();
    }

    async irParaMeuPlanoAlimentar() {
        const { PlanoAlimentarCliente } = await import('./plano_alimentar_cliente.js');
        const planoScreen = new PlanoAlimentarCliente(this.userInfo);
        planoScreen.render();
    }
    
    async irParaMinhaAnamnese() {
        const { AnamneseCliente } = await import('./anamnese_cliente.js');
        const anamneseScreen = new AnamneseCliente(this.userInfo);
        anamneseScreen.render();
    }

    async irParaMeusResultados() {
        this.showMensagemDesenvolvimento('meus_resultados');
    }

    async irParaMeusAgendamentos() {
        this.showMensagemDesenvolvimento('meus_agendamentos');
    }

    async irParaMinhasMensagens() {
        this.showMensagemDesenvolvimento('minhas_mensagens');
    }

    async irParaMinhaJornada() {
        // Chama o método da home do cliente
        if (window.currentHomeCliente && window.currentHomeCliente.showMinhaJornada) {
            window.currentHomeCliente.showMinhaJornada();
        } else {
            this.showMensagemDesenvolvimento('minha_jornada');
        }
    }

    async irParaShoppingNutri() {
        const { ShoppingNutriCliente } = await import('./shopping_nutri_cliente.js');
        const shoppingScreen = new ShoppingNutriCliente(this.userInfo);
        shoppingScreen.render();
    }
}

// ==================== FACTORY PARA CRIAR O NAVEGADOR CORRETO ====================

export function criarNavegador(userInfo, pacientesList = []) {
    switch(userInfo.cargo) {
        case 'nutricionista':
            return new NavegadorNutricionista(userInfo, pacientesList);
        case 'psicologo':
            return new NavegadorPsicologo(userInfo, pacientesList);
        case 'paciente':
            return new NavegadorPaciente(userInfo);
        default:
            console.warn(`Cargo não reconhecido: ${userInfo.cargo}, usando NavegadorBase`);
            return new NavegadorBase(userInfo, pacientesList);
    }
}
