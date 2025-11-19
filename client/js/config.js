// Configurações da aplicação
const APP_CONFIG = {
    // URLs da API
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api' 
        : '/api',
    
    // Endpoints da API
    ENDPOINTS: {
        // Autenticação
        REGISTER: '/auth/register',
        LOGIN: '/auth/login',
        FORGOT_PASSWORD: '/auth/forgot-password',
        RESET_PASSWORD: '/auth/reset-password',
        VERIFY_TOKEN: '/auth/verify',
        
        // Usuários
        USER_PROFILE: '/users/profile',
        USER_STATS: '/users/stats',
        
        // Professores
        TEACHERS: '/teachers',
        TEACHER_DETAILS: '/teachers/:id',
        TEACHER_SUBJECTS: '/teachers/subjects/list',
        SCHEDULE_SESSION: '/teachers/:id/schedule',
        REVIEW_TEACHER: '/teachers/:id/review'
    },
    
    // Configurações de paginação
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 12,
        MAX_PAGE_SIZE: 50
    },
    
    // Configurações de UI
    UI: {
        TOAST_DURATION: 5000, // 5 segundos
        MODAL_ANIMATION_DURATION: 200, // 200ms
        DEBOUNCE_DELAY: 300 // 300ms para busca
    },
    
    // Configurações de validação
    VALIDATION: {
        MIN_PASSWORD_LENGTH: 6,
        MAX_NAME_LENGTH: 100,
        MAX_EMAIL_LENGTH: 255,
        MAX_DESCRIPTION_LENGTH: 1000
    },
    
    // Configurações de formatação
    FORMAT: {
        CURRENCY: 'pt-BR',
        CURRENCY_CODE: 'BRL',
        DATE_FORMAT: 'pt-BR',
        TIMEZONE: 'America/Sao_Paulo'
    },
    
    // Status de resposta HTTP
    HTTP_STATUS: {
        OK: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        INTERNAL_SERVER_ERROR: 500
    },
    
    // Tipos de usuário
    USER_TYPES: {
        STUDENT: 'student',
        TEACHER: 'teacher'
    },
    
    // Tipos de toast
    TOAST_TYPES: {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    },
    
    // Configurações de localStorage
    STORAGE_KEYS: {
        AUTH_TOKEN: 'braintutor_auth_token',
        USER_DATA: 'braintutor_user_data',
        FILTERS: 'braintutor_filters',
        THEME: 'braintutor_theme'
    },
    
    // Matérias disponíveis (fallback)
    DEFAULT_SUBJECTS: [
        'Matemática',
        'Física',
        'Química',
        'Biologia',
        'História',
        'Geografia',
        'Português',
        'Literatura',
        'Inglês',
        'Espanhol',
        'Filosofia',
        'Sociologia',
        'Artes',
        'Educação Física',
        'Informática',
        'Música'
    ],
    
    // URLs de imagens padrão
    DEFAULT_IMAGES: {
        AVATAR: 'assets/images/default-avatar.svg',
        HERO: 'assets/images/hero-illustration.svg'
    },
    
    // Configurações de desenvolvimento
    DEBUG: window.location.hostname === 'localhost',
    
    // Versão da aplicação
    VERSION: '1.0.0'
};

// Função para obter URL completa da API
window.getApiUrl = function(endpoint, params = {}) {
    let url = APP_CONFIG.API_BASE_URL + endpoint;
    
    // Substituir parâmetros na URL (ex: :id)
    Object.keys(params).forEach(key => {
        url = url.replace(`:${key}`, params[key]);
    });
    
    return url;
};

// Função para log de debug
window.debugLog = function(...args) {
    if (APP_CONFIG.DEBUG) {
        console.log('[Brain Tutor Debug]', ...args);
    }
};

// Função para log de erro
window.errorLog = function(...args) {
    console.error('[Brain Tutor Error]', ...args);
};

// Exportar configurações para uso global
window.APP_CONFIG = APP_CONFIG;