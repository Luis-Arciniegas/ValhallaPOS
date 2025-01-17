class AuthManager {
    constructor() {
      this.credentials = {
        username: 'luis',
        password: '123456'
      };
      this.loginContainer = document.getElementById('loginContainer');
      this.loginForm = document.getElementById('loginForm');
    }
    showLoginForm() {
      this.loginContainer.style.display = 'flex';
    }
    hideLoginForm() {
      this.loginContainer.style.display = 'none';
    }
    validateCredentials(username, password) {
      return username === this.credentials.username && password === this.credentials.password;
    }
    handleLogin(event) {
      event.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      if (this.validateCredentials(username, password)) {
        localStorage.setItem('isLoggedIn', 'true');
        this.hideLoginForm();
      } else {
        alert('Credenciales incorrectas. Por favor intente nuevamente.');
      }
    }
    logout() {
      localStorage.removeItem('isLoggedIn');
      this.showLoginForm();
    }
    checkAuthStatus() {
      if (!localStorage.getItem('isLoggedIn')) {
        this.showLoginForm();
      }
    }
  }
  class ModuleManager {
    constructor() {
      this.modulesContainer = document.getElementById('modulesContainer');
      this.utilitiesContainer = document.getElementById('utilitiesContainer');
      this.supportContainer = document.getElementById('supportContainer');
      this.modulesContainer.style.display = 'grid';
      this.utilitiesContainer.style.display = 'none';
      this.supportContainer.style.display = 'none';
      this.initializeModules();
      this.initializeUtilities();
      this.initializeSupport();
      this.handleOrientationChange = this.handleOrientationChange.bind(this);
      window.addEventListener('orientationchange', this.handleOrientationChange);
      this.handleOrientationChange();
    }
    initializeModules() {
      document.getElementById('modulesLink').addEventListener('click', () => {
        this.showModules();
      });
      const moduleCards = document.querySelectorAll('.module-card');
      moduleCards.forEach(card => {
        card.addEventListener('click', () => {
          const moduleType = card.dataset.module;
          this.handleModuleClick(moduleType);
        });
      });
    }
    initializeUtilities() {
      document.getElementById('utilidadesLink').addEventListener('click', () => {
        this.showUtilities();
      });
    }
    initializeSupport() {
      document.getElementById('supportLink').addEventListener('click', () => {
        this.showSupport();
      });
    }
    showModules() {
      this.modulesContainer.style.display = 'grid';
      this.utilitiesContainer.style.display = 'none';
      this.supportContainer.style.display = 'none';
    }
    showUtilities() {
      this.modulesContainer.style.display = 'none';
      this.utilitiesContainer.style.display = 'block';
      this.supportContainer.style.display = 'none';
    }
    showSupport() {
      this.modulesContainer.style.display = 'none';
      this.utilitiesContainer.style.display = 'none';
      this.supportContainer.style.display = 'block';
    }
    handleModuleClick(moduleType) {
      switch (moduleType) {
        case 'restaurant':
          window.location.href = 'https://restaurant.example.com';
          break;
        case 'invoice':
          window.location.href = 'https://invoice.example.com';
          break;
        case 'tasks':
          window.location.href = 'https://tasks.example.com';
          break;
      }
    }
    handleOrientationChange() {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      const isMobile = window.matchMedia('(max-height: 600px)').matches;
      if (isLandscape && isMobile) {
        document.body.classList.add('landscape-mobile');
      } else {
        document.body.classList.remove('landscape-mobile');
      }
    }
  }
  class DashboardManager {
    constructor(authManager) {
      this.authManager = authManager;
      const manifestContent = {
        "name": "Valhalla Panel de Control",
        "short_name": "Valhalla POS",
        "icons": [{
          "src": "../imagenes/valhallaLogo.png",
          "sizes": "192x192",
          "type": "image/png"
        }, {
          "src": "../imagenes/valhallaLogo.png",
          "sizes": "512x512",
          "type": "image/png"
        }],
        "start_url": "../index.html",
        "display": "standalone",
        "background_color": "#2c3e50",
        "theme_color": "#2c3e50"
      };
      const manifestBlob = new Blob([JSON.stringify(manifestContent, null, 2)], {
        type: 'application/json'
      });
      const manifestURL = URL.createObjectURL(manifestBlob);
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = manifestURL;
      document.head.appendChild(manifestLink);
      document.getElementById('logoutBtn').addEventListener('click', () => {
        this.authManager.logout();
      });
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const authManager = new AuthManager();
    const moduleManager = new ModuleManager();
    const dashboard = new DashboardManager(authManager);
    authManager.loginForm.addEventListener('submit', e => authManager.handleLogin(e));
    authManager.checkAuthStatus();
    window.onunload = function () {
      window.removeEventListener('orientationchange', moduleManager.handleOrientationChange);
    };
  });