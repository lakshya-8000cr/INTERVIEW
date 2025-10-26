// Dashboard functionality
let currentUser = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupEventListeners();
    loadUserInfo();
});

function initializeDashboard() {
    // Check if user is authenticated
    fetch('/api/user')
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                window.location.href = '/';
                return;
            }
            currentUser = data.user;
            updateUserInterface();
        })
        .catch(error => {
            console.error('Authentication check failed:', error);
            window.location.href = '/';
        });
}

function updateUserInterface() {
    if (currentUser) {
        // Update user name in header
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = currentUser.full_name;
        }
        
        // Update user initials in avatar
        const userNameShort = document.getElementById('userNameShort');
        if (userNameShort && currentUser.full_name) {
            const initials = currentUser.full_name.split(' ')
                .map(name => name.charAt(0))
                .join('')
                .substring(0, 2)
                .toUpperCase();
            userNameShort.textContent = initials;
        }
    }
}

function setupEventListeners() {
    // Sidebar navigation
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', handleMenuItemClick);
    });
    
    // Sidebar toggle functionality
    const sidebarToggle = document.getElementById('sidebarToggle');
    const dashboardContainer = document.querySelector('.dashboard-container');
    const mobileOverlay = document.getElementById('mobileOverlay');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                // Mobile behavior
                const sidebar = document.querySelector('.sidebar');
                sidebar.classList.toggle('mobile-open');
                if (mobileOverlay) {
                    mobileOverlay.classList.toggle('show');
                }
            } else {
                // Desktop behavior - collapse/expand sidebar
                dashboardContainer.classList.toggle('sidebar-collapsed');
            }
        });
    }
    
    // Close mobile sidebar when clicking overlay
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', function() {
            const sidebar = document.querySelector('.sidebar');
            sidebar.classList.remove('mobile-open');
            mobileOverlay.classList.remove('show');
        });
    }
    
    // User menu dropdown
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!userMenuBtn.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });
    }
    
    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Quick action buttons
    setupQuickActions();
}

function handleMenuItemClick(event) {
    event.preventDefault();
    
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked item
    event.currentTarget.classList.add('active');
    
    // Get section to show
    const section = event.currentTarget.getAttribute('data-section');
    showSection(section);
}

function showSection(sectionId) {
    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Load section-specific content
    loadSectionContent(sectionId);
}

function loadSectionContent(sectionId) {
    switch(sectionId) {
        case 'overview':
            loadOverviewData();
            break;
        case 'practice':
            loadPracticeOptions();
            break;
        case 'analytics':
            loadAnalyticsData();
            break;
        case 'feedback':
            loadFeedbackData();
            break;
        case 'library':
            loadQuestionLibrary();
            break;
        case 'settings':
            loadUserSettings();
            break;
    }
}

function setupQuickActions() {
    // Start AI Interview button
    const startInterviewBtns = document.querySelectorAll('.action-card .btn.primary');
    startInterviewBtns.forEach(btn => {
        if (btn.textContent.includes('Start Now')) {
            btn.addEventListener('click', function() {
                showNotification('AI Interview feature coming soon!', 'info');
            });
        }
    });
    
    // Other action buttons
    const actionBtns = document.querySelectorAll('.action-card .btn.secondary');
    actionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const action = btn.textContent.trim();
            showNotification(`${action} feature coming soon!`, 'info');
        });
    });
    
    // Practice session buttons
    const practiceStartBtns = document.querySelectorAll('.practice-card .btn');
    practiceStartBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const practiceType = btn.closest('.practice-card').querySelector('h3').textContent;
            showNotification(`Starting ${practiceType} session...`, 'info');
        });
    });
}

function loadUserInfo() {
    // This would typically fetch real user data
    // For now, we'll simulate it
    setTimeout(() => {
        animateStats();
    }, 1000);
}

function loadOverviewData() {
    // Simulate loading overview data
    animateStats();
    loadRecentActivity();
}

function animateStats() {
    // Animate stat counters
    const statNumbers = document.querySelectorAll('.stat-content h3');
    statNumbers.forEach(stat => {
        const finalValue = stat.textContent;
        if (!isNaN(parseInt(finalValue))) {
            animateCounter(stat, 0, parseInt(finalValue), 1000);
        }
    });
    
    // Animate metric bars
    const metricBars = document.querySelectorAll('.metric-fill');
    metricBars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.width = width;
        }, 500);
    });
}

function animateCounter(element, start, end, duration) {
    const range = end - start;
    const stepTime = Math.abs(Math.floor(duration / range));
    const startTime = new Date().getTime();
    const endTime = startTime + duration;
    
    function updateCounter() {
        const now = new Date().getTime();
        const remaining = Math.max((endTime - now) / duration, 0);
        const value = Math.round(end - (remaining * range));
        element.textContent = value + (element.textContent.includes('%') ? '%' : '');
        
        if (value !== end) {
            setTimeout(updateCounter, stepTime);
        }
    }
    
    updateCounter();
}

function loadRecentActivity() {
    // Simulate real-time activity updates
    // In a real app, this would connect to a WebSocket or poll an API
    console.log('Loading recent activity...');
}

function loadPracticeOptions() {
    console.log('Loading practice options...');
    // populate history in practice section
    setTimeout(() => { loadInterviewHistory(); }, 150);
}

function loadAnalyticsData() {
    console.log('Loading analytics data...');
    // Animate metric bars when analytics section is viewed
    setTimeout(() => {
        animateStats();
    }, 300);
    // populate chart from history
    setTimeout(() => { loadInterviewHistory(); }, 300);
}

// Load interview history (server API with localStorage fallback)
async function loadInterviewHistory(limit = 20) {
    const container = document.getElementById('historyList');
    if (!container) return;
    container.innerHTML = 'Loading...';

    try {
        const res = await fetch(`/api/interview/history?limit=${limit}`);
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.interviews) && data.interviews.length) {
                renderHistoryList(data.interviews, container);
                // also draw trend if in analytics view
                drawTrendChart(data.interviews);
                return;
            }
        }
    } catch (err) {
        console.warn('Failed to fetch server history, falling back to local', err);
    }

    // Fallback: localStorage
    try {
        const raw = localStorage.getItem('interview_history');
        const arr = raw ? JSON.parse(raw) : [];
        if (!arr || arr.length === 0) {
            container.innerHTML = '<p>No past sessions found.</p>';
            return;
        }
        // map local shape to server-like rows
        const interviews = arr.map(s => ({
            id: s.id,
            interview_type: s.interview_type || 'AI Voice',
            status: 'completed',
            started_at: s.started_at,
            ended_at: null,
            duration_minutes: s.duration_minutes,
            total_questions: s.total_questions,
            overall_score: s.overall_score
        }));
        renderHistoryList(interviews, container);
        drawTrendChart(interviews);
    } catch (err) {
        console.error('Failed to read local history', err);
        container.innerHTML = '<p>Unable to load history.</p>';
    }
}

function renderHistoryList(interviews, container) {
    container.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'history-list';
    interviews.forEach(it => {
        const item = document.createElement('div');
        item.className = 'history-item';
        const date = new Date(it.started_at).toLocaleString();
        item.innerHTML = `
            <div class="hi-left">
                <strong>${it.interview_type || 'Interview'}</strong>
                <div class="muted">${date}</div>
            </div>
            <div class="hi-right">
                <div class="score">${it.overall_score != null ? it.overall_score + '%' : '--'}</div>
                <div class="muted">${it.duration_minutes || '-'} min</div>
            </div>
        `;
        // click to view details when server session id exists
        item.addEventListener('click', () => {
            if (typeof it.id === 'number') {
                // open session detail API page (could implement a modal)
                window.open(`/api/interview/session/${it.id}`, '_blank');
            } else {
                showLocalSessionModal(it);
            }
        });
        list.appendChild(item);
    });
    container.appendChild(list);
}

function showLocalSessionModal(it) {
    // Simple popup with details
    const w = window.open('', '_blank', 'width=600,height=600');
    if (!w) return;
    const html = `
        <html><head><title>Session ${it.id}</title></head><body>
        <h2>${it.interview_type}</h2>
        <p>Started: ${new Date(it.started_at).toLocaleString()}</p>
        <p>Duration: ${it.duration_minutes} min</p>
        <p>Score: ${it.overall_score}%</p>
        <h3>Transcript</h3>
        <pre>${(it.conversation || JSON.parse(localStorage.getItem('interview_history') || '[]').find(s => s.id===it.id)?.conversation || []).map(p => JSON.stringify(p)).join('\n')}</pre>
        </body></html>`;
    w.document.write(html);
    w.document.close();
}

function drawTrendChart(interviews) {
    // find container
    const chartHolder = document.querySelector('.chart-placeholder');
    if (!chartHolder) return;
    // extract latest 12 scores
    const scores = interviews.map(i => (i.overall_score != null ? Number(i.overall_score) : null)).filter(s => s !== null).slice(0, 12).reverse();
    if (!scores || scores.length === 0) {
        chartHolder.innerHTML = '<div class="no-data">No analytics data available</div>';
        return;
    }
    const w = 480, h = 140, padding = 12;
    const max = Math.max(...scores); const min = Math.min(...scores);
    const points = scores.map((v, i) => {
        const x = padding + (i * ((w - padding * 2) / Math.max(1, scores.length - 1)));
        const y = padding + ((1 - (v - min) / Math.max(1, max - min)) * (h - padding * 2));
        return `${x},${y}`;
    }).join(' ');
    const avg = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
    chartHolder.innerHTML = `
        <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
            <polyline points="${points}" fill="none" stroke="#00d4ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <text x="8" y="16" fill="#cfeffd" font-size="12">Avg: ${avg}%</text>
        </svg>`;
}

function loadFeedbackData() {
    console.log('Loading feedback data...');
}

function loadQuestionLibrary() {
    console.log('Loading question library...');
}

function loadUserSettings() {
    console.log('Loading user settings...');
}

async function handleLogout(event) {
    event.preventDefault();
    
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            showNotification('Logout failed', 'error');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Network error during logout', 'error');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    // Add notification styles if not already added
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
                padding: 16px 20px;
                z-index: 10000;
                transform: translateX(400px);
                transition: transform 0.3s ease;
                border-left: 4px solid #3B82F6;
                max-width: 400px;
            }
            .notification.show {
                transform: translateX(0);
            }
            .notification.success {
                border-left-color: #22c55e;
            }
            .notification.error {
                border-left-color: #ef4444;
            }
            .notification.warning {
                border-left-color: #f59e0b;
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .notification-icon {
                font-size: 1.2rem;
            }
            .notification-message {
                color: #1e293b;
                font-weight: 500;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 4000);
}

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return '✅';
        case 'error': return '❌';
        case 'warning': return '⚠️';
        default: return 'ℹ️';
    }
}



// Handle window resize
window.addEventListener('resize', function() {
    const sidebar = document.querySelector('.sidebar');
    const dashboardContainer = document.querySelector('.dashboard-container');
    const mobileOverlay = document.getElementById('mobileOverlay');
    
    if (window.innerWidth > 768) {
        // Desktop mode
        sidebar.classList.remove('mobile-open');
        if (mobileOverlay) {
            mobileOverlay.classList.remove('show');
        }
        // Reset sidebar to expanded state on desktop
        dashboardContainer.classList.remove('sidebar-collapsed');
    } else {
        // Mobile mode - ensure sidebar is hidden by default
        sidebar.classList.remove('mobile-open');
        if (mobileOverlay) {
            mobileOverlay.classList.remove('show');
        }
    }
});

// Initialize tooltips and interactive elements
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects for interactive elements
    const interactiveElements = document.querySelectorAll('.stat-card, .action-card, .practice-card, .activity-item');
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.style.transform = this.style.transform.replace('translateY(-4px)', '') + ' translateY(-4px)';
        });
        
        element.addEventListener('mouseleave', function() {
            this.style.transform = this.style.transform.replace(' translateY(-4px)', '');
        });
    });
});

async function loadSectionContent(sectionId) {
    switch(sectionId) {
        case 'overview': loadOverviewData(); break;
        case 'practice': loadPracticeOptions(); break;
        case 'analytics': loadAnalyticsData(); break;
        case 'feedback': loadFeedbackData(); break;
        case 'library': loadQuestionLibrary(); break;
        case 'settings': loadUserSettings(); break;
        case 'mock-interview':
            const container = document.getElementById('mock-interview');
            if (container) {
                const res = await fetch('/mock-interview.html');
                const html = await res.text();
                container.innerHTML = html;
            }
            break;
    }
}
