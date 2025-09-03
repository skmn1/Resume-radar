describe('Authentication Flow', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'testpassword123',
    name: 'Test User'
  };

  beforeEach(() => {
    // Clear any existing session
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('Registration', () => {
    it('should register a new user successfully', () => {
      cy.visit('/auth/register');
      
      // Fill out registration form
      cy.get('input[placeholder*="full name"]').type(testUser.name);
      cy.get('input[type="email"]').type(testUser.email);
      cy.get('input[placeholder*="Create a password"]').type(testUser.password);
      cy.get('input[placeholder*="Confirm your password"]').type(testUser.password);
      
      // Submit form
      cy.get('button[type="submit"]').click();
      
      // Should redirect to dashboard after successful registration
      cy.url().should('include', '/dashboard');
      cy.contains('Resume Analysis Dashboard').should('be.visible');
    });

    it('should show error for mismatched passwords', () => {
      cy.visit('/auth/register');
      
      cy.get('input[type="email"]').type(testUser.email);
      cy.get('input[placeholder*="Create a password"]').type(testUser.password);
      cy.get('input[placeholder*="Confirm your password"]').type('differentpassword');
      
      cy.get('button[type="submit"]').click();
      
      cy.contains('Passwords do not match').should('be.visible');
    });

    it('should show error for short password', () => {
      cy.visit('/auth/register');
      
      cy.get('input[type="email"]').type(testUser.email);
      cy.get('input[placeholder*="Create a password"]').type('123');
      cy.get('input[placeholder*="Confirm your password"]').type('123');
      
      cy.get('button[type="submit"]').click();
      
      cy.contains('Password must be at least 6 characters').should('be.visible');
    });
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', () => {
      // First register a user
      cy.register(testUser.email, testUser.password, testUser.name);
      
      // Logout
      cy.get('button').contains('Logout').click();
      
      // Login again
      cy.login(testUser.email, testUser.password);
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.contains('Resume Analysis Dashboard').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/auth/login');
      
      cy.get('input[type="email"]').type('invalid@example.com');
      cy.get('input[type="password"]').type('wrongpassword');
      cy.get('button[type="submit"]').click();
      
      cy.contains('Invalid credentials').should('be.visible');
    });
  });

  describe('Navigation', () => {
    it('should redirect to login when accessing protected routes', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/auth/login');
    });

    it('should show user name in header when logged in', () => {
      cy.register(testUser.email, testUser.password, testUser.name);
      
      cy.get('header').should('contain', `Hi, ${testUser.name}`);
    });

    it('should logout successfully', () => {
      cy.register(testUser.email, testUser.password, testUser.name);
      
      cy.get('button').contains('Logout').click();
      
      // Should redirect to home page
      cy.url().should('eq', Cypress.config().baseUrl + '/');
      
      // Should show login/signup buttons again
      cy.get('header').should('contain', 'Login');
      cy.get('header').should('contain', 'Sign Up');
    });
  });
});
