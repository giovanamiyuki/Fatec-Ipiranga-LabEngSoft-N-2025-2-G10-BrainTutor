// Gerenciamento de professores

// Estado dos professores
let teachersState = {
    teachers: [],
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    filters: {
        search: '',
        subject: '',
        location: '',
        minPrice: 0,
        maxPrice: 200,
        minRating: 0
    },
    isLoading: false,
    subjects: []
};

// Inicializar seção de professores
async function initTeachers() {
    debugLog('Inicializando seção de professores...');
    
    try {
        // Carregar matérias disponíveis
        await loadSubjects();
        
        // Carregar professores
        await loadTeachers();
        
        // Configurar event listeners
        setupTeachersEventListeners();
        
        debugLog('Seção de professores inicializada com sucesso');
    } catch (error) {
        errorLog('Erro ao inicializar seção de professores:', error);
        showTeachersError('Erro ao carregar professores. Tente recarregar a página.');
    }
}

// Carregar matérias disponíveis
async function loadSubjects() {
    try {
        const response = await ApiClient.get(APP_CONFIG.ENDPOINTS.TEACHER_SUBJECTS);
        
        if (response.success) {
            teachersState.subjects = response.data;
            updateSubjectFilter();
            debugLog('Matérias carregadas:', response.data);
        } else {
            // Usar matérias padrão em caso de erro
            teachersState.subjects = APP_CONFIG.DEFAULT_SUBJECTS.map(subject => ({
                subject,
                teacher_count: 0
            }));
            updateSubjectFilter();
        }
    } catch (error) {
        errorLog('Erro ao carregar matérias:', error);
        // Usar matérias padrão
        teachersState.subjects = APP_CONFIG.DEFAULT_SUBJECTS.map(subject => ({
            subject,
            teacher_count: 0
        }));
        updateSubjectFilter();
    }
}

// Atualizar filtro de matérias
function updateSubjectFilter() {
    const subjectFilter = document.getElementById('subjectFilter');
    if (!subjectFilter) return;
    
    // Manter opção "Todas as matérias"
    subjectFilter.innerHTML = '<option value="">Todas as matérias</option>';
    
    // Adicionar matérias disponíveis
    teachersState.subjects.forEach(item => {
        const option = document.createElement('option');
        option.value = item.subject;
        option.textContent = `${item.subject} (${item.teacher_count})`;
        subjectFilter.appendChild(option);
    });
}

// Carregar professores
async function loadTeachers(page = 1) {
    if (teachersState.isLoading) return;
    
    teachersState.isLoading = true;
    teachersState.currentPage = page;
    
    // Mostrar loading
    showTeachersLoading();
    
    try {
        // Preparar parâmetros da query
        const queryParams = new URLSearchParams({
            page: page.toString(),
            limit: APP_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE.toString(),
            ...teachersState.filters
        });
        
        // Remover parâmetros vazios
        Object.keys(teachersState.filters).forEach(key => {
            if (!teachersState.filters[key] || teachersState.filters[key] === 0) {
                queryParams.delete(key);
            }
        });
        
        const url = `${getApiUrl(APP_CONFIG.ENDPOINTS.TEACHERS)}?${queryParams.toString()}`;
        const response = await ApiClient.request(url);
        
        if (response.success) {
            teachersState.teachers = response.data.teachers;
            teachersState.totalPages = response.data.pagination.total;
            teachersState.totalCount = response.data.pagination.totalCount;
            
            // Renderizar professores
            renderTeachers();
            renderPagination();
            
            debugLog('Professores carregados:', response.data);
        } else {
            throw new Error(response.message || 'Erro ao carregar professores');
        }
        
    } catch (error) {
        errorLog('Erro ao carregar professores:', error);
        showTeachersError(error.message || 'Erro ao carregar professores. Tente novamente.');
    } finally {
        teachersState.isLoading = false;
    }
}

// Mostrar loading de professores
function showTeachersLoading() {
    const grid = document.getElementById('teachersGrid');
    if (!grid) return;
    
    grid.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Carregando professores...</p>
        </div>
    `;
}

// Mostrar erro de professores
function showTeachersError(message) {
    const grid = document.getElementById('teachersGrid');
    if (!grid) return;
    
    grid.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Ops! Algo deu errado</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="loadTeachers()">
                <i class="fas fa-refresh"></i> Tentar Novamente
            </button>
        </div>
    `;
}

// Renderizar professores
function renderTeachers() {
    const grid = document.getElementById('teachersGrid');
    if (!grid) return;
    
    if (teachersState.teachers.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Nenhum professor encontrado</h3>
                <p>Tente ajustar os filtros de busca para encontrar mais professores.</p>
                <button class="btn btn-outline" onclick="clearFilters()">
                    <i class="fas fa-times"></i> Limpar Filtros
                </button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = teachersState.teachers.map(teacher => `
        <div class="teacher-card" onclick="showTeacherDetails(${teacher.id})">
            <div class="teacher-header">
                <img src="${teacher.profile_image || APP_CONFIG.DEFAULT_IMAGES.AVATAR}" 
                     alt="Avatar de ${teacher.name}" 
                     class="teacher-avatar"
                     onerror="this.src='${APP_CONFIG.DEFAULT_IMAGES.AVATAR}'">
                <div class="teacher-info">
                    <h3>${sanitizeHtml(teacher.name)}</h3>
                    <div class="teacher-subject">${sanitizeHtml(teacher.subject)}</div>
                </div>
            </div>
            
            <div class="teacher-rating">
                <div class="stars">
                    ${Formatters.rating(teacher.rating)}
                </div>
                <span class="rating-text">
                    ${teacher.rating.toFixed(1)} (${teacher.total_reviews} ${teacher.total_reviews === 1 ? 'avaliação' : 'avaliações'})
                </span>
            </div>
            
            <div class="teacher-description">
                ${sanitizeHtml(Formatters.truncateText(teacher.description || 'Sem descrição disponível', 120))}
            </div>
            
            <div class="teacher-footer">
                <div class="teacher-price">
                    ${Formatters.currency(teacher.hourly_rate)}
                    <span class="price-label">/hora</span>
                </div>
                ${teacher.location ? `
                    <div class="teacher-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${sanitizeHtml(teacher.location)}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Renderizar paginação
function renderPagination() {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    
    if (teachersState.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    const currentPage = teachersState.currentPage;
    const totalPages = teachersState.totalPages;
    
    let html = '';
    
    // Botão anterior
    html += `
        <button class="pagination-btn" 
                onclick="loadTeachers(${currentPage - 1})"
                ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> Anterior
        </button>
    `;
    
    // Páginas
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += `<button class="pagination-btn" onclick="loadTeachers(1)">1</button>`;
        if (startPage > 2) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                    onclick="loadTeachers(${i})">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
        html += `<button class="pagination-btn" onclick="loadTeachers(${totalPages})">${totalPages}</button>`;
    }
    
    // Botão próximo
    html += `
        <button class="pagination-btn" 
                onclick="loadTeachers(${currentPage + 1})"
                ${currentPage === totalPages ? 'disabled' : ''}>
            Próximo <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    // Informações da paginação
    const start = (currentPage - 1) * APP_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE + 1;
    const end = Math.min(currentPage * APP_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE, teachersState.totalCount);
    
    html += `
        <div class="pagination-info">
            Mostrando ${start}-${end} de ${teachersState.totalCount} professores
        </div>
    `;
    
    container.innerHTML = html;
}

// Mostrar detalhes do professor
async function showTeacherDetails(teacherId) {
    debugLog('Carregando detalhes do professor:', teacherId);
    
    try {
        // Mostrar modal com loading
        const modal = document.getElementById('teacherModal');
        const details = document.getElementById('teacherDetails');
        
        if (!modal || !details) return;
        
        details.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Carregando dados do professor...</p>
            </div>
        `;
        
        showModal('teacherModal');
        
        // Carregar dados do professor
        const response = await ApiClient.get(APP_CONFIG.ENDPOINTS.TEACHER_DETAILS, { id: teacherId });
        
        if (response.success) {
            const { teacher, reviews } = response.data;
            renderTeacherDetails(teacher, reviews);
        } else {
            throw new Error(response.message || 'Erro ao carregar dados do professor');
        }
        
    } catch (error) {
        errorLog('Erro ao carregar detalhes do professor:', error);
        
        const details = document.getElementById('teacherDetails');
        if (details) {
            details.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro ao carregar dados</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="showTeacherDetails(${teacherId})">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }
}

// Renderizar detalhes do professor
function renderTeacherDetails(teacher, reviews) {
    const details = document.getElementById('teacherDetails');
    if (!details) return;
    
    const canSchedule = UserManager.isLoggedIn() && UserManager.getUserType() === APP_CONFIG.USER_TYPES.STUDENT;
    
    details.innerHTML = `
        <div class="teacher-details">
            <div class="teacher-sidebar">
                <div class="teacher-profile-card">
                    <img src="${teacher.profile_image || APP_CONFIG.DEFAULT_IMAGES.AVATAR}" 
                         alt="Avatar de ${teacher.name}" 
                         class="teacher-profile-avatar"
                         onerror="this.src='${APP_CONFIG.DEFAULT_IMAGES.AVATAR}'">
                    
                    <h2 class="teacher-profile-name">${sanitizeHtml(teacher.name)}</h2>
                    <div class="teacher-profile-subject">${sanitizeHtml(teacher.subject)}</div>
                    
                    <div class="teacher-profile-rating">
                        <div class="stars">
                            ${Formatters.rating(teacher.rating)}
                        </div>
                        <span>${teacher.rating.toFixed(1)} (${teacher.total_reviews} avaliações)</span>
                    </div>
                    
                    <div class="teacher-profile-price">
                        ${Formatters.currency(teacher.hourly_rate)}/hora
                    </div>
                    
                    ${canSchedule ? `
                        <button class="btn btn-primary btn-full" onclick="scheduleSession(${teacher.id})">
                            <i class="fas fa-calendar-plus"></i> Agendar Aula
                        </button>
                    ` : `
                        <div class="login-prompt">
                            <p>Faça login como estudante para agendar aulas</p>
                            <button class="btn btn-outline btn-full" onclick="showLogin()">
                                Fazer Login
                            </button>
                        </div>
                    `}
                </div>
            </div>
            
            <div class="teacher-main-content">
                <div class="content-section">
                    <h3><i class="fas fa-user"></i> Sobre o Professor</h3>
                    <p>${sanitizeHtml(teacher.description || 'Nenhuma descrição disponível.')}</p>
                </div>
                
                <div class="content-section">
                    <h3><i class="fas fa-info-circle"></i> Informações</h3>
                    <div class="teacher-info-grid">
                        <div class="info-item">
                            <i class="fas fa-graduation-cap"></i>
                            <div class="info-item-text">
                                <div class="info-item-label">Formação</div>
                                <div class="info-item-value">${sanitizeHtml(teacher.education || 'Não informado')}</div>
                            </div>
                        </div>
                        
                        <div class="info-item">
                            <i class="fas fa-clock"></i>
                            <div class="info-item-text">
                                <div class="info-item-label">Experiência</div>
                                <div class="info-item-value">${teacher.experience_years} anos</div>
                            </div>
                        </div>
                        
                        ${teacher.location ? `
                            <div class="info-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <div class="info-item-text">
                                    <div class="info-item-label">Localização</div>
                                    <div class="info-item-value">${sanitizeHtml(teacher.location)}</div>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${teacher.phone ? `
                            <div class="info-item">
                                <i class="fas fa-phone"></i>
                                <div class="info-item-text">
                                    <div class="info-item-label">Contato</div>
                                    <div class="info-item-value">${Formatters.phone(teacher.phone)}</div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${reviews.length > 0 ? `
                    <div class="content-section">
                        <h3><i class="fas fa-star"></i> Avaliações (${reviews.length})</h3>
                        <div class="reviews-list">
                            ${reviews.map(review => `
                                <div class="review-item">
                                    <div class="review-header">
                                        <div class="review-author">${sanitizeHtml(review.student_name)}</div>
                                        <div class="review-date">${Formatters.date(review.created_at)}</div>
                                    </div>
                                    <div class="review-rating">
                                        ${Formatters.rating(review.rating)}
                                    </div>
                                    ${review.comment ? `
                                        <div class="review-comment">${sanitizeHtml(review.comment)}</div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Agendar sessão (placeholder - implementar modal de agendamento)
function scheduleSession(teacherId) {
    // Por enquanto, mostrar toast informativo
    showToast(
        'Funcionalidade de agendamento em desenvolvimento. Entre em contato diretamente com o professor.',
        APP_CONFIG.TOAST_TYPES.INFO,
        'Agendamento'
    );
    debugLog('Agendamento solicitado para professor:', teacherId);
}

// Aplicar filtros
function applyFilters() {
    // Atualizar estado dos filtros
    teachersState.filters.search = document.getElementById('heroSearchInput')?.value || '';
    teachersState.filters.subject = document.getElementById('subjectFilter')?.value || '';
    teachersState.filters.location = document.getElementById('locationFilter')?.value || '';
    teachersState.filters.maxPrice = parseInt(document.getElementById('priceRange')?.value) || 200;
    teachersState.filters.minRating = parseFloat(document.getElementById('ratingFilter')?.value) || 0;
    
    debugLog('Aplicando filtros:', teachersState.filters);
    
    // Recarregar professores da primeira página
    loadTeachers(1);
}

// Limpar filtros
function clearFilters() {
    debugLog('Limpando filtros');
    
    // Resetar valores dos inputs
    const heroSearch = document.getElementById('heroSearchInput');
    const subjectFilter = document.getElementById('subjectFilter');
    const locationFilter = document.getElementById('locationFilter');
    const priceRange = document.getElementById('priceRange');
    const ratingFilter = document.getElementById('ratingFilter');
    
    if (heroSearch) heroSearch.value = '';
    if (subjectFilter) subjectFilter.value = '';
    if (locationFilter) locationFilter.value = '';
    if (priceRange) {
        priceRange.value = 200;
        updatePriceLabel();
    }
    if (ratingFilter) {
        ratingFilter.value = 0;
        updateRatingLabel();
    }
    
    // Resetar estado dos filtros
    teachersState.filters = {
        search: '',
        subject: '',
        location: '',
        minPrice: 0,
        maxPrice: 200,
        minRating: 0
    };
    
    // Recarregar professores
    loadTeachers(1);
}

// Atualizar label do preço
function updatePriceLabel() {
    const priceRange = document.getElementById('priceRange');
    const priceLabel = document.getElementById('priceLabel');
    
    if (priceRange && priceLabel) {
        const value = parseInt(priceRange.value);
        priceLabel.textContent = value >= 200 ? 'Qualquer preço' : Formatters.currency(value) + '/h';
    }
}

// Atualizar label da avaliação
function updateRatingLabel() {
    const ratingFilter = document.getElementById('ratingFilter');
    const ratingLabel = document.getElementById('ratingLabel');
    
    if (ratingFilter && ratingLabel) {
        const value = parseFloat(ratingFilter.value);
        ratingLabel.textContent = value === 0 ? 'Qualquer' : `${value}+ estrelas`;
    }
}

// Buscar professores (função para busca do hero)
function searchTeachers() {
    const searchInput = document.getElementById('heroSearchInput');
    if (searchInput) {
        teachersState.filters.search = searchInput.value;
        loadTeachers(1);
        
        // Scroll para seção de professores
        smoothScrollTo('#teachers', 100);
    }
}

// Configurar event listeners
function setupTeachersEventListeners() {
    // Busca em tempo real (debounced)
    const heroSearchInput = document.getElementById('heroSearchInput');
    if (heroSearchInput) {
        heroSearchInput.addEventListener('input', debounce(() => {
            applyFilters();
        }, APP_CONFIG.UI.DEBOUNCE_DELAY));
    }
    
    // Filtros
    const locationFilter = document.getElementById('locationFilter');
    if (locationFilter) {
        locationFilter.addEventListener('input', debounce(applyFilters, APP_CONFIG.UI.DEBOUNCE_DELAY));
    }
    
    // Enter key para busca
    if (heroSearchInput) {
        heroSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchTeachers();
            }
        });
    }
    
    debugLog('Event listeners dos professores configurados');
}

// Exportar funções para uso global
window.initTeachers = initTeachers;
window.loadTeachers = loadTeachers;
window.showTeacherDetails = showTeacherDetails;
window.scheduleSession = scheduleSession;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.updatePriceLabel = updatePriceLabel;
window.updateRatingLabel = updateRatingLabel;
window.searchTeachers = searchTeachers;