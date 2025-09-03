describe('ResumeRadar Landing Page', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display the landing page correctly', () => {
    // Check main heading
    cy.contains('Beat the ATS with ResumeRadar').should('be.visible');
    
    // Check navigation
    cy.get('header').should('contain', 'ResumeRadar');
    cy.get('header').should('contain', 'Home');
    cy.get('header').should('contain', 'Login');
    cy.get('header').should('contain', 'Sign Up');
    
    // Check features section
    cy.contains('Why Choose ResumeRadar?').should('be.visible');
    cy.contains('ATS Optimization').should('be.visible');
    cy.contains('Job-Targeted Analysis').should('be.visible');
    cy.contains('Actionable Insights').should('be.visible');
    
    // Check how it works section
    cy.contains('How It Works').should('be.visible');
    cy.contains('Upload Your Resume').should('be.visible');
    cy.contains('Add Job Description').should('be.visible');
    cy.contains('Get Your Report').should('be.visible');
    
    // Check footer
    cy.get('footer').should('contain', 'ResumeRadar');
    cy.get('footer').should('contain', 'Created by');
  });

  it('should navigate to registration page', () => {
    cy.contains('Get Started Free').click();
    cy.url().should('include', '/auth/register');
  });

  it('should navigate to login page', () => {
    cy.contains('Sign In').click();
    cy.url().should('include', '/auth/login');
  });
});
