// Aplicação principal Brain Tutor

// Estado global da aplicação
let appState = {
    isInitialized: false,
    currentSection: 'home',
    modals: {
        active: null,
        stack: []
    }
};

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    debugLog('Inicializando aplicação Brain Tutor...');
    
    try {
        // Inicializar componentes
        initializeApp();
        
        // Configurar navegação
        setupNavigation();
        
        // Configurar modals
        setupModals();
        
        // Configurar scroll
        setupScrollEffects();
        
        // Inicializar seções específicas
        initializeSections();
        
        appState.isInitialized = true;
        debugLog('✅ Aplicação Brain Tutor inicializada com sucesso');
        
    } catch (error) {
        errorLog('❌ Erro na inicialização da aplicação:', error);
        showToast(
            'Erro ao carregar a aplicação. Tente recarregar a página.',
            APP_CONFIG.TOAST_TYPES.ERROR,
            'Erro de Inicialização'
        );
    }
});

// Inicializar aplicação
function initializeApp() {
    // Inicializar autenticação
    initAuth();
    
    // Configurar handlers de erro global
    setupGlobalErrorHandlers();
    
    // Configurar interceptação de links
    setupLinkInterception();
    
    // Aplicar configurações iniciais de UI
    applyInitialUISettings();
}

// Configurar navegação
function setupNavigation() {
    // Smooth scroll para links internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                smoothScrollTo(target, 100);
            }
        });
    });
    
    // Navegação mobile
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (navToggle) {
        navToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // Fechar menu mobile ao clicar em link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (navLinks) {
                navLinks.classList.remove('active');
            }
        });
    });
    
    // Highlight da seção ativa
    setupSectionHighlight();
}

// Configurar modals
function setupModals() {
    // Fechar modal ao clicar no overlay
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeModal);
    }
    
    // Fechar modal com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && appState.modals.active) {
            closeModal();
        }
    });
    
    // Prevenir fechamento ao clicar no conteúdo do modal
    document.querySelectorAll('.modal-content').forEach(content => {
        content.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });
}

// Mostrar modal
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('modalOverlay');
    
    if (!modal || !overlay) {
        errorLog('Modal não encontrado:', modalId);
        return;
    }
    
    // Fechar modal atual se houver
    if (appState.modals.active) {
        const currentModal = document.getElementById(appState.modals.active);
        if (currentModal) {
            currentModal.classList.remove('active');
        }
    }
    
    // Adicionar à pilha de modals
    appState.modals.stack.push(modalId);
    appState.modals.active = modalId;
    
    // Mostrar overlay e modal
    overlay.classList.add('active');
    modal.classList.add('active');
    
    // Prevenir scroll do body
    document.body.style.overflow = 'hidden';
    
    debugLog('Modal aberto:', modalId);
}

// Fechar modal
function closeModal() {
    if (!appState.modals.active) return;
    
    const modal = document.getElementById(appState.modals.active);
    const overlay = document.getElementById('modalOverlay');
    
    if (modal) {
        modal.classList.remove('active');
    }
    
    // Remover da pilha
    appState.modals.stack.pop();
    
    // Verificar se há modal anterior na pilha
    if (appState.modals.stack.length > 0) {
        const previousModalId = appState.modals.stack[appState.modals.stack.length - 1];
        appState.modals.active = previousModalId;
        
        const previousModal = document.getElementById(previousModalId);
        if (previousModal) {
            previousModal.classList.add('active');
        }
    } else {
        // Nenhum modal na pilha, fechar overlay
        appState.modals.active = null;
        if (overlay) {
            overlay.classList.remove('active');
        }
        // Restaurar scroll do body
        document.body.style.overflow = '';
    }
    
    debugLog('Modal fechado');
}

// Configurar menu mobile
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    const navToggle = document.querySelector('.nav-toggle');
    
    if (navLinks) {
        navLinks.classList.toggle('active');
    }
    
    if (navToggle) {
        navToggle.classList.toggle('active');
    }
}

// Configurar dropdown do usuário
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

// Fechar dropdown ao clicar fora
document.addEventListener('click', (e) => {
    const userDropdown = document.getElementById('userDropdown');
    const userBtn = document.querySelector('.user-btn');
    
    if (userDropdown && userBtn && !userBtn.contains(e.target)) {
        userDropdown.classList.remove('active');
    }
});

// Configurar efeitos de scroll
function setupScrollEffects() {
    let lastScrollTop = 0;
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', debounce(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Header effect
        if (header) {
            if (scrollTop > 100) {
                header.style.background = 'rgba(255, 255, 255, 0.98)';
                header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
            } else {
                header.style.background = 'rgba(255, 255, 255, 0.95)';
                header.style.boxShadow = 'none';
            }
        }
        
        lastScrollTop = scrollTop;
    }, 10));
}

// Configurar highlight da seção ativa
function setupSectionHighlight() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    function updateActiveSection() {
        let current = '';
        const scrollPos = window.scrollY + 200;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        if (current !== appState.currentSection) {
            appState.currentSection = current;
            
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        }
    }
    
    window.addEventListener('scroll', debounce(updateActiveSection, 100));
    updateActiveSection(); // Executar uma vez no carregamento
}

// Inicializar seções específicas
function initializeSections() {
    // Inicializar seção de professores
    initTeachers();
    
    // Outras seções podem ser inicializadas aqui
    // initDashboard();
    // initProfile();
}

// Configurar handlers de erro global
function setupGlobalErrorHandlers() {
    // Erros não capturados
    window.addEventListener('error', (e) => {
        errorLog('Erro global capturado:', e.error);
        if (APP_CONFIG.DEBUG) {
            showToast(
                `Erro: ${e.error?.message || 'Erro desconhecido'}`,
                APP_CONFIG.TOAST_TYPES.ERROR,
                'Erro da Aplicação'
            );
        }
    });
    
    // Promises rejeitadas não capturadas
    window.addEventListener('unhandledrejection', (e) => {
        errorLog('Promise rejeitada não capturada:', e.reason);
        if (APP_CONFIG.DEBUG) {
            showToast(
                `Promise rejeitada: ${e.reason?.message || 'Motivo desconhecido'}`,
                APP_CONFIG.TOAST_TYPES.ERROR,
                'Erro de Promise'
            );
        }
    });
}

// Configurar interceptação de links
function setupLinkInterception() {
    // Interceptar links externos para abrir em nova aba
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href && !link.href.startsWith(window.location.origin) && !link.href.startsWith('#')) {
            e.preventDefault();
            window.open(link.href, '_blank', 'noopener,noreferrer');
        }
    });
}

// Aplicar configurações iniciais de UI
function applyInitialUISettings() {
    // Configurar imagens padrão
    document.querySelectorAll('img').forEach(img => {
        if (!img.hasAttribute('onerror')) {
            img.addEventListener('error', function() {
                if (this.src !== APP_CONFIG.DEFAULT_IMAGES.AVATAR) {
                    this.src = APP_CONFIG.DEFAULT_IMAGES.AVATAR;
                }
            });
        }
    });
    
    // Configurar lazy loading para imagens
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// Funções de navegação
function navigateToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        smoothScrollTo(section, 100);
        
        // Atualizar URL sem recarregar
        if (history.pushState) {
            history.pushState(null, null, `#${sectionId}`);
        }
    }
}

// Placeholder para dashboard (futuro)
function showDashboard() {
    if (!UserManager.isLoggedIn()) {
        showLogin();
        return;
    }
    
    showToast(
        'Dashboard em desenvolvimento',
        APP_CONFIG.TOAST_TYPES.INFO,
        'Em Breve'
    );
}

// Placeholder para perfil (futuro)
function showProfile() {
    if (!UserManager.isLoggedIn()) {
        showLogin();
        return;
    }
    
    showToast(
        'Perfil do usuário em desenvolvimento',
        APP_CONFIG.TOAST_TYPES.INFO,
        'Em Breve'
    );
}

// Utilitários de performance
const PerformanceUtils = {
    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Medir performance de função
    measureFunction(name, func) {
        return function(...args) {
            const start = performance.now();
            const result = func.apply(this, args);
            const end = performance.now();
            debugLog(`Performance [${name}]: ${end - start}ms`);
            return result;
        };
    },
    
    // Preload de recursos
    preloadResources(urls) {
        urls.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            document.head.appendChild(link);
        });
    }
};

// Configurações de acessibilidade
function setupAccessibility() {
    // Navegação por teclado
    document.addEventListener('keydown', (e) => {
        // Tab trap em modals
        if (appState.modals.active && e.key === 'Tab') {
            const modal = document.getElementById(appState.modals.active);
            if (modal) {
                const focusableElements = modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        }
    });
    
    // Anúncios para screen readers
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0,0,0,0) !important;
        border: 0 !important;
    `;
    document.body.appendChild(announcer);
    
    window.announceToScreenReader = function(message) {
        announcer.textContent = message;
        setTimeout(() => {
            announcer.textContent = '';
        }, 1000);
    };
}

// Inicializar acessibilidade quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', setupAccessibility);

// Service Worker para PWA (futuro)
if ('serviceWorker' in navigator && !APP_CONFIG.DEBUG) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                debugLog('Service Worker registrado:', registration);
            })
            .catch(error => {
                debugLog('Erro no Service Worker:', error);
            });
    });
}

// Analytics (placeholder para futuro)
const Analytics = {
    track(event, properties = {}) {
        if (APP_CONFIG.DEBUG) {
            debugLog('Analytics Event:', event, properties);
        }
        // Implementar analytics aqui (Google Analytics, etc.)
    },
    
    page(path) {
        if (APP_CONFIG.DEBUG) {
            debugLog('Analytics Page:', path);
        }
        // Implementar page tracking aqui
    }
};

// Exportar funções para uso global
window.showModal = showModal;
window.closeModal = closeModal;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleUserMenu = toggleUserMenu;
window.navigateToSection = navigateToSection;
window.showDashboard = showDashboard;
window.showProfile = showProfile;
window.PerformanceUtils = PerformanceUtils;
window.Analytics = Analytics;

debugLog('App.js carregado com sucesso');