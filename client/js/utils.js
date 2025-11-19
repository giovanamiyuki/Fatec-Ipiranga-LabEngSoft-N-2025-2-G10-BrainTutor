// Utilitários gerais da aplicação

// Gerenciamento de Token JWT
const TokenManager = {
    set(token) {
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
        debugLog('Token salvo no localStorage');
    },
    
    get() {
        return localStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    },
    
    remove() {
        localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER_DATA);
        debugLog('Token removido do localStorage');
    },
    
    isValid() {
        const token = this.get();
        if (!token) return false;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp > Date.now() / 1000;
        } catch (e) {
            return false;
        }
    }
};

// Gerenciamento de Dados do Usuário
const UserManager = {
    set(userData) {
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        debugLog('Dados do usuário salvos', userData);
    },
    
    get() {
        const data = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_DATA);
        return data ? JSON.parse(data) : null;
    },
    
    remove() {
        localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER_DATA);
    },
    
    isLoggedIn() {
        return this.get() !== null && TokenManager.isValid();
    },
    
    getUserType() {
        const user = this.get();
        return user ? user.userType : null;
    }
};

// Classe para fazer requisições HTTP
class ApiClient {
    static async request(url, options = {}) {
        const token = TokenManager.get();
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };
        
        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };
        
        debugLog('Fazendo requisição:', url, finalOptions);
        
        try {
            const response = await fetch(url, finalOptions);
            const data = await response.json();
            
            debugLog('Resposta recebida:', response.status, data);
            
            // Se o token expirou, fazer logout
            if (response.status === 401 && data.message?.includes('Token')) {
                this.handleUnauthorized();
                throw new Error('Sessão expirada. Faça login novamente.');
            }
            
            if (!response.ok) {
                throw new Error(data.message || `Erro HTTP: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            errorLog('Erro na requisição:', error);
            throw error;
        }
    }
    
    static async get(endpoint, params = {}) {
        const url = getApiUrl(endpoint, params);
        return this.request(url);
    }
    
    static async post(endpoint, data = {}, params = {}) {
        const url = getApiUrl(endpoint, params);
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    static async put(endpoint, data = {}, params = {}) {
        const url = getApiUrl(endpoint, params);
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    static async delete(endpoint, params = {}) {
        const url = getApiUrl(endpoint, params);
        return this.request(url, {
            method: 'DELETE'
        });
    }
    
    static handleUnauthorized() {
        TokenManager.remove();
        UserManager.remove();
        updateUIForLoggedOutUser();
        showToast('Sessão expirada. Faça login novamente.', APP_CONFIG.TOAST_TYPES.WARNING);
    }
}

// Sistema de Toast (Notificações)
class ToastManager {
    static show(message, type = APP_CONFIG.TOAST_TYPES.INFO, title = '') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toastId = 'toast-' + Date.now();
        const iconMap = {
            [APP_CONFIG.TOAST_TYPES.SUCCESS]: 'fas fa-check-circle',
            [APP_CONFIG.TOAST_TYPES.ERROR]: 'fas fa-exclamation-circle',
            [APP_CONFIG.TOAST_TYPES.WARNING]: 'fas fa-exclamation-triangle',
            [APP_CONFIG.TOAST_TYPES.INFO]: 'fas fa-info-circle'
        };
        
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="${iconMap[type]}"></i>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="ToastManager.remove('${toastId}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
        // Auto-remover após o tempo configurado
        setTimeout(() => {
            this.remove(toastId);
        }, APP_CONFIG.UI.TOAST_DURATION);
        
        debugLog('Toast criado:', type, message);
    }
    
    static remove(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }
    
    static clear() {
        const container = document.getElementById('toastContainer');
        if (container) {
            container.innerHTML = '';
        }
    }
}

// Funções globais para toast (compatibilidade)
window.showToast = (message, type, title) => ToastManager.show(message, type, title);
window.hideToast = (id) => ToastManager.remove(id);

// Utilitários de formatação
const Formatters = {
    currency(value, locale = APP_CONFIG.FORMAT.CURRENCY) {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: APP_CONFIG.FORMAT.CURRENCY_CODE
        }).format(value);
    },
    
    date(date, locale = APP_CONFIG.FORMAT.DATE_FORMAT) {
        return new Intl.DateTimeFormat(locale).format(new Date(date));
    },
    
    dateTime(date, locale = APP_CONFIG.FORMAT.DATE_FORMAT) {
        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    },
    
    rating(rating, maxRating = 5) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);
        
        let html = '';
        
        // Estrelas cheias
        for (let i = 0; i < fullStars; i++) {
            html += '<i class="fas fa-star star"></i>';
        }
        
        // Meia estrela
        if (hasHalfStar) {
            html += '<i class="fas fa-star-half-alt star"></i>';
        }
        
        // Estrelas vazias
        for (let i = 0; i < emptyStars; i++) {
            html += '<i class="far fa-star star empty"></i>';
        }
        
        return html;
    },
    
    truncateText(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    },
    
    phone(phone) {
        // Formatar telefone brasileiro (11) 99999-9999
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
        }
        return phone;
    }
};

// Utilitários de validação
const Validators = {
    email(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    password(password) {
        return password.length >= APP_CONFIG.VALIDATION.MIN_PASSWORD_LENGTH;
    },
    
    required(value) {
        return value !== null && value !== undefined && value.toString().trim() !== '';
    },
    
    maxLength(value, max) {
        return value.length <= max;
    },
    
    minLength(value, min) {
        return value.length >= min;
    },
    
    numeric(value) {
        return !isNaN(value) && !isNaN(parseFloat(value));
    },
    
    positiveNumber(value) {
        return this.numeric(value) && parseFloat(value) > 0;
    },
    
    phone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 11;
    }
};

// Utilitários de DOM
const DOMUtils = {
    show(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.classList.remove('hidden');
        }
    },
    
    hide(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.classList.add('hidden');
        }
    },
    
    toggle(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.classList.toggle('hidden');
        }
    },
    
    addClass(element, className) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.classList.add(className);
        }
    },
    
    removeClass(element, className) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.classList.remove(className);
        }
    },
    
    hasClass(element, className) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        return element ? element.classList.contains(className) : false;
    }
};

// Debounce function para otimizar buscas
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Função para sanitizar HTML (prevenir XSS)
function sanitizeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

// Função para gerar IDs únicos
function generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Função para copiar texto para clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Texto copiado para a área de transferência', APP_CONFIG.TOAST_TYPES.SUCCESS);
        return true;
    } catch (err) {
        errorLog('Erro ao copiar texto:', err);
        showToast('Erro ao copiar texto', APP_CONFIG.TOAST_TYPES.ERROR);
        return false;
    }
}

// Função para scroll suave
function smoothScrollTo(element, offset = 0) {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }
    
    if (element) {
        const elementPosition = element.offsetTop;
        const offsetPosition = elementPosition - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

// Exportar utilitários para uso global
window.TokenManager = TokenManager;
window.UserManager = UserManager;
window.ApiClient = ApiClient;
window.ToastManager = ToastManager;
window.Formatters = Formatters;
window.Validators = Validators;
window.DOMUtils = DOMUtils;
window.debounce = debounce;
window.sanitizeHtml = sanitizeHtml;
window.generateId = generateId;
window.copyToClipboard = copyToClipboard;
window.smoothScrollTo = smoothScrollTo;