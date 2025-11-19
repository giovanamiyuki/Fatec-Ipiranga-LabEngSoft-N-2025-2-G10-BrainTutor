// Gerenciamento de autenticação

// Estado de autenticação
let authState = {
    isLoggedIn: false,
    user: null,
    token: null
};

// Inicializar autenticação
function initAuth() {
    debugLog('Inicializando autenticação...');
    
    const token = TokenManager.get();
    const user = UserManager.get();
    
    if (token && user && TokenManager.isValid()) {
        authState.isLoggedIn = true;
        authState.user = user;
        authState.token = token;
        updateUIForLoggedInUser(user);
        debugLog('Usuário já logado:', user);
    } else {
        // Limpar dados inválidos
        TokenManager.remove();
        UserManager.remove();
        updateUIForLoggedOutUser();
        debugLog('Usuário não logado ou token inválido');
    }
}

// Atualizar UI para usuário logado
function updateUIForLoggedInUser(user) {
    debugLog('Atualizando UI para usuário logado:', user);
    
    // Esconder botões de auth e mostrar menu de usuário
    DOMUtils.hide('navAuth');
    DOMUtils.show('navUser');
    
    // Atualizar informações do usuário no header
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) {
        userName.textContent = user.name;
    }
    
    if (userAvatar) {
        userAvatar.src = user.profileImage || APP_CONFIG.DEFAULT_IMAGES.AVATAR;
        userAvatar.alt = `Avatar de ${user.name}`;
    }
    
    // Adicionar links específicos do tipo de usuário
    updateUserTypeSpecificUI(user.userType);
}

// Atualizar UI para usuário deslogado
function updateUIForLoggedOutUser() {
    debugLog('Atualizando UI para usuário deslogado');
    
    // Mostrar botões de auth e esconder menu de usuário
    DOMUtils.show('navAuth');
    DOMUtils.hide('navUser');
    
    // Fechar dropdown se estiver aberto
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
}

// Atualizar UI específica do tipo de usuário
function updateUserTypeSpecificUI(userType) {
    // Lógica específica pode ser adicionada aqui
    // Por exemplo, mostrar/esconder certas funcionalidades
    debugLog('Atualizando UI para tipo de usuário:', userType);
}

// Função de login
async function handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    debugLog('Tentativa de login:', loginData.email);
    
    // Validações básicas
    if (!Validators.email(loginData.email)) {
        showToast('Por favor, digite um email válido', APP_CONFIG.TOAST_TYPES.ERROR);
        return;
    }
    
    if (!Validators.required(loginData.password)) {
        showToast('Por favor, digite sua senha', APP_CONFIG.TOAST_TYPES.ERROR);
        return;
    }
    
    try {
        // Desativar botão de submit
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
        
        // Fazer requisição de login
        const response = await ApiClient.post(APP_CONFIG.ENDPOINTS.LOGIN, loginData);
        
        if (response.success) {
            const { token, user } = response.data;
            
            // Salvar dados de autenticação
            TokenManager.set(token);
            UserManager.set(user);
            
            // Atualizar estado
            authState.isLoggedIn = true;
            authState.user = user;
            authState.token = token;
            
            // Atualizar UI
            updateUIForLoggedInUser(user);
            
            // Fechar modal
            closeModal();
            
            // Mostrar mensagem de sucesso
            showToast(
                `Bem-vindo de volta, ${user.name}!`, 
                APP_CONFIG.TOAST_TYPES.SUCCESS,
                'Login realizado'
            );
            
            debugLog('Login realizado com sucesso:', user);
            
        } else {
            throw new Error(response.message || 'Erro no login');
        }
        
    } catch (error) {
        errorLog('Erro no login:', error);
        showToast(
            error.message || 'Erro ao fazer login. Tente novamente.', 
            APP_CONFIG.TOAST_TYPES.ERROR,
            'Erro no Login'
        );
    } finally {
        // Reativar botão
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Função de registro
async function handleRegister(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const registerData = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        userType: formData.get('userType'),
        phone: formData.get('phone') || '',
        // Campos específicos de professor
        subject: formData.get('subject') || '',
        hourlyRate: formData.get('hourlyRate') || '',
        description: formData.get('description') || ''
    };
    
    const confirmPassword = formData.get('confirmPassword');
    
    debugLog('Tentativa de registro:', registerData.email, registerData.userType);
    
    // Validações
    if (!Validators.required(registerData.name)) {
        showToast('Por favor, digite seu nome completo', APP_CONFIG.TOAST_TYPES.ERROR);
        return;
    }
    
    if (!Validators.email(registerData.email)) {
        showToast('Por favor, digite um email válido', APP_CONFIG.TOAST_TYPES.ERROR);
        return;
    }
    
    if (!Validators.password(registerData.password)) {
        showToast(
            `A senha deve ter pelo menos ${APP_CONFIG.VALIDATION.MIN_PASSWORD_LENGTH} caracteres`, 
            APP_CONFIG.TOAST_TYPES.ERROR
        );
        return;
    }
    
    if (registerData.password !== confirmPassword) {
        showToast('As senhas não coincidem', APP_CONFIG.TOAST_TYPES.ERROR);
        return;
    }
    
    // Validações específicas para professores
    if (registerData.userType === APP_CONFIG.USER_TYPES.TEACHER) {
        if (!Validators.required(registerData.subject)) {
            showToast('Por favor, informe a matéria que você ensina', APP_CONFIG.TOAST_TYPES.ERROR);
            return;
        }
        
        if (!Validators.positiveNumber(registerData.hourlyRate)) {
            showToast('Por favor, informe um valor por hora válido', APP_CONFIG.TOAST_TYPES.ERROR);
            return;
        }
    }
    
    try {
        // Desativar botão de submit
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando conta...';
        
        // Fazer requisição de registro
        const response = await ApiClient.post(APP_CONFIG.ENDPOINTS.REGISTER, registerData);
        
        if (response.success) {
            const { token, user } = response.data;
            
            // Salvar dados de autenticação
            TokenManager.set(token);
            UserManager.set(user);
            
            // Atualizar estado
            authState.isLoggedIn = true;
            authState.user = user;
            authState.token = token;
            
            // Atualizar UI
            updateUIForLoggedInUser(user);
            
            // Fechar modal
            closeModal();
            
            // Mostrar mensagem de sucesso
            const userTypeText = user.userType === 'teacher' ? 'Professor' : 'Aluno';
            showToast(
                `Conta criada com sucesso! Bem-vindo ao Brain Tutor, ${user.name}!`, 
                APP_CONFIG.TOAST_TYPES.SUCCESS,
                `${userTypeText} cadastrado`
            );
            
            debugLog('Registro realizado com sucesso:', user);
            
        } else {
            throw new Error(response.message || 'Erro no registro');
        }
        
    } catch (error) {
        errorLog('Erro no registro:', error);
        showToast(
            error.message || 'Erro ao criar conta. Tente novamente.', 
            APP_CONFIG.TOAST_TYPES.ERROR,
            'Erro no Cadastro'
        );
    } finally {
        // Reativar botão
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Função de recuperação de senha
async function handleForgotPassword(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const email = formData.get('email');
    
    debugLog('Solicitação de recuperação de senha:', email);
    
    if (!Validators.email(email)) {
        showToast('Por favor, digite um email válido', APP_CONFIG.TOAST_TYPES.ERROR);
        return;
    }
    
    try {
        // Desativar botão de submit
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        
        // Fazer requisição
        const response = await ApiClient.post(APP_CONFIG.ENDPOINTS.FORGOT_PASSWORD, { email });
        
        if (response.success) {
            // Fechar modal
            closeModal();
            
            // Mostrar mensagem de sucesso
            showToast(
                'Instruções de recuperação enviadas para seu email', 
                APP_CONFIG.TOAST_TYPES.SUCCESS,
                'Email Enviado'
            );
            
            debugLog('Email de recuperação enviado para:', email);
            
        } else {
            throw new Error(response.message || 'Erro ao enviar email');
        }
        
    } catch (error) {
        errorLog('Erro na recuperação de senha:', error);
        showToast(
            error.message || 'Erro ao enviar email. Tente novamente.', 
            APP_CONFIG.TOAST_TYPES.ERROR,
            'Erro no Envio'
        );
    } finally {
        // Reativar botão
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Função de logout
function logout() {
    debugLog('Fazendo logout...');
    
    // Limpar dados de autenticação
    TokenManager.remove();
    UserManager.remove();
    
    // Atualizar estado
    authState.isLoggedIn = false;
    authState.user = null;
    authState.token = null;
    
    // Atualizar UI
    updateUIForLoggedOutUser();
    
    // Mostrar mensagem
    showToast('Logout realizado com sucesso', APP_CONFIG.TOAST_TYPES.SUCCESS);
    
    // Redirecionar para home se necessário
    if (window.location.hash && window.location.hash !== '#home') {
        window.location.hash = '#home';
    }
}

// Função para mostrar modal de login
function showLogin() {
    debugLog('Mostrando modal de login');
    closeModal(); // Fechar qualquer modal aberto
    showModal('loginModal');
    
    // Focar no campo de email
    setTimeout(() => {
        const emailInput = document.getElementById('loginEmail');
        if (emailInput) emailInput.focus();
    }, 300);
}

// Função para mostrar modal de registro
function showRegister() {
    debugLog('Mostrando modal de registro');
    closeModal(); // Fechar qualquer modal aberto
    showModal('registerModal');
    
    // Focar no campo de nome
    setTimeout(() => {
        const nameInput = document.getElementById('registerName');
        if (nameInput) nameInput.focus();
    }, 300);
}

// Função para mostrar modal de recuperação de senha
function showForgotPassword() {
    debugLog('Mostrando modal de recuperação de senha');
    closeModal(); // Fechar qualquer modal aberto
    showModal('forgotPasswordModal');
    
    // Focar no campo de email
    setTimeout(() => {
        const emailInput = document.getElementById('forgotEmail');
        if (emailInput) emailInput.focus();
    }, 300);
}

// Função para alternar entre tipos de usuário no registro
function toggleUserType() {
    const teacherRadio = document.getElementById('teacherType');
    const teacherFields = document.getElementById('teacherFields');
    
    if (teacherRadio && teacherFields) {
        if (teacherRadio.checked) {
            DOMUtils.show(teacherFields);
            // Tornar campos obrigatórios
            const subjectInput = document.getElementById('teacherSubject');
            const rateInput = document.getElementById('teacherRate');
            if (subjectInput) subjectInput.required = true;
            if (rateInput) rateInput.required = true;
        } else {
            DOMUtils.hide(teacherFields);
            // Remover obrigatoriedade
            const subjectInput = document.getElementById('teacherSubject');
            const rateInput = document.getElementById('teacherRate');
            if (subjectInput) subjectInput.required = false;
            if (rateInput) rateInput.required = false;
        }
    }
}

// Função para verificar token válido (chamada pela API)
async function verifyToken() {
    if (!TokenManager.isValid()) {
        return false;
    }
    
    try {
        const response = await ApiClient.get(APP_CONFIG.ENDPOINTS.VERIFY_TOKEN);
        return response.success;
    } catch (error) {
        errorLog('Erro na verificação de token:', error);
        return false;
    }
}

// Event listeners para o registro
document.addEventListener('DOMContentLoaded', function() {
    // Listener para mudança de tipo de usuário
    const userTypeRadios = document.querySelectorAll('input[name="userType"]');
    userTypeRadios.forEach(radio => {
        radio.addEventListener('change', toggleUserType);
    });
    
    // Inicializar estado correto dos campos de professor
    toggleUserType();
    
    // Inicializar autenticação
    initAuth();
});

// Exportar funções para uso global
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleForgotPassword = handleForgotPassword;
window.logout = logout;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.showForgotPassword = showForgotPassword;
window.verifyToken = verifyToken;
window.updateUIForLoggedInUser = updateUIForLoggedInUser;
window.updateUIForLoggedOutUser = updateUIForLoggedOutUser;
window.authState = authState;