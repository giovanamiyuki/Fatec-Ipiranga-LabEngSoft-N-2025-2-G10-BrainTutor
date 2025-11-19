// ============================================================
// CHECKOUT.JS - Brain Tutor Payment System
// Integração com Stripe Payment
// ============================================================

// Variáveis Globais
let stripe;
let elements;
let cardElement;
let clientSecret;
let lessonData;
const STRIPE_PUBLIC_KEY = 'pk_test_51QdQcGKYBaWbKGZ7kHdR8eXcZNb9X5ykJQ1pZPRvS0LpTMzYAGHi3z0eXqJvJT3jcFPHkUqU2fALnfJKqmXQiLlU00O9s7YXPq'; // Chave pública de teste

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadUserInfo();
    
    // Obter lesson_id da URL
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('lesson_id');

    if (!lessonId) {
        showError('ID da aula não fornecido. Redirecionando...');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);
        return;
    }

    // Carregar detalhes da aula
    await loadLessonDetails(lessonId);

    // Inicializar Stripe
    await initializeStripe();
});

// ============================================================
// AUTENTICAÇÃO E INFORMAÇÕES DO USUÁRIO
// ============================================================

async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../index.html';
        return;
    }
}

async function loadUserInfo() {
    try {
        const response = await fetch(`${API_URL}/api/users/profile`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('userName').textContent = data.data.user.name;
        }
    } catch (error) {
        console.error('Erro ao carregar informações do usuário:', error);
    }
}

// ============================================================
// CARREGAR DETALHES DA AULA
// ============================================================

async function loadLessonDetails(lessonId) {
    try {
        const response = await fetch(`${API_URL}/api/lessons/${lessonId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar detalhes da aula');
        }

        const data = await response.json();
        lessonData = data.data.lesson;

        displayLessonDetails(lessonData);

    } catch (error) {
        console.error('Erro ao carregar aula:', error);
        showError('Erro ao carregar informações da aula. Tente novamente.');
    }
}

function displayLessonDetails(lesson) {
    const lessonInfoDiv = document.getElementById('lessonInfo');
    
    // Formatar data
    const scheduledDate = new Date(lesson.scheduled_date);
    const dateFormatted = scheduledDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const timeFormatted = scheduledDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    lessonInfoDiv.innerHTML = `
        <div class="teacher-card">
            <div class="teacher-avatar">
                👨‍🏫
            </div>
            <div class="teacher-info">
                <h3>${lesson.teacher_name}</h3>
                <p>${lesson.teacher_email}</p>
            </div>
        </div>

        <div class="info-row">
            <span class="info-label">📚 Disciplina:</span>
            <span class="info-value">${lesson.subject}</span>
        </div>

        <div class="info-row">
            <span class="info-label">📅 Data:</span>
            <span class="info-value">${dateFormatted}</span>
        </div>

        <div class="info-row">
            <span class="info-label">🕐 Horário:</span>
            <span class="info-value">${timeFormatted}</span>
        </div>

        <div class="info-row">
            <span class="info-label">⏱️ Duração:</span>
            <span class="info-value">${lesson.duration_minutes} minutos</span>
        </div>

        ${lesson.description ? `
        <div class="info-row">
            <span class="info-label">📝 Descrição:</span>
            <span class="info-value">${lesson.description}</span>
        </div>
        ` : ''}

        <div class="info-row">
            <span class="info-label">💵 Valor:</span>
            <span class="info-value price-highlight">R$ ${parseFloat(lesson.price).toFixed(2)}</span>
        </div>
    `;

    // Atualizar resumo do pagamento
    document.getElementById('lessonPrice').textContent = `R$ ${parseFloat(lesson.price).toFixed(2)}`;
    document.getElementById('totalPrice').textContent = `R$ ${parseFloat(lesson.price).toFixed(2)}`;
}

// ============================================================
// INICIALIZAR STRIPE
// ============================================================

async function initializeStripe() {
    try {
        // Inicializar Stripe
        stripe = Stripe(STRIPE_PUBLIC_KEY);

        // Criar PaymentIntent no servidor
        const response = await fetch(`${API_URL}/api/payments/create-intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                lesson_id: lessonData.id
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao criar intenção de pagamento');
        }

        const data = await response.json();
        clientSecret = data.data.clientSecret;

        // Configurar Stripe Elements
        const appearance = {
            theme: 'stripe',
            variables: {
                colorPrimary: '#667eea',
                colorBackground: '#ffffff',
                colorText: '#333333',
                colorDanger: '#e74c3c',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                borderRadius: '10px',
                spacingUnit: '4px'
            }
        };

        elements = stripe.elements({ clientSecret, appearance });

        // Criar e montar Card Element
        cardElement = elements.create('payment');
        cardElement.mount('#card-element');

        // Event listeners
        cardElement.on('change', (event) => {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        });

        // Form submit
        const form = document.getElementById('payment-form');
        form.addEventListener('submit', handleSubmit);

        console.log('✅ Stripe inicializado com sucesso');

    } catch (error) {
        console.error('Erro ao inicializar Stripe:', error);
        showError(error.message);
    }
}

// ============================================================
// PROCESSAR PAGAMENTO
// ============================================================

async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin + '/client/pages/checkout.html',
            },
            redirect: 'if_required'
        });

        if (error) {
            // Erro de pagamento
            showError(error.message);
            setLoading(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            // Pagamento bem-sucedido
            showSuccessModal();
        } else {
            // Status inesperado
            showError('Status de pagamento inesperado. Por favor, verifique suas aulas.');
            setLoading(false);
        }

    } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        showError('Erro ao processar pagamento. Tente novamente.');
        setLoading(false);
    }
}

// ============================================================
// UI HELPERS
// ============================================================

function setLoading(isLoading) {
    const submitButton = document.getElementById('submit-payment');
    const buttonText = document.getElementById('button-text');
    const spinner = document.getElementById('spinner');

    if (isLoading) {
        submitButton.disabled = true;
        buttonText.textContent = 'Processando...';
        spinner.classList.remove('hidden');
    } else {
        submitButton.disabled = false;
        buttonText.textContent = 'Confirmar Pagamento';
        spinner.classList.add('hidden');
    }
}

function showError(message) {
    const errorDiv = document.getElementById('card-errors');
    errorDiv.textContent = message;
    
    // Scroll para o erro
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.add('show');
    
    // Confete ou animação de sucesso (opcional)
    console.log('🎉 Pagamento realizado com sucesso!');
}

// ============================================================
// LOGOUT
// ============================================================

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../index.html';
}
