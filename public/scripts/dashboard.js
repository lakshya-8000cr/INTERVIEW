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
}

function loadAnalyticsData() {
    console.log('Loading analytics data...');
    // Animate metric bars when analytics section is viewed
    setTimeout(() => {
        animateStats();
    }, 300);
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