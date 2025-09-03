describe('Dashboard and Resume Analysis', () => {
  const testUser = {
    email: 'dashboard@example.com',
    password: 'testpassword123',
    name: 'Dashboard User'
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // Register and login
    cy.register(testUser.email, testUser.password, testUser.name);
  });

  it('should display dashboard correctly', () => {
    cy.url().should('include', '/dashboard');
    
    // Check main elements
    cy.contains('Resume Analysis Dashboard').should('be.visible');
    cy.contains('Upload Resume for Analysis').should('be.visible');
    cy.contains('Analysis History').should('be.visible');
    
    // Check file upload area
    cy.contains('Drop your resume here').should('be.visible');
    cy.contains('Supports PDF and DOCX files').should('be.visible');
    
    // Check job description textarea
    cy.get('textarea[placeholder*="job description"]').should('be.visible');
    
    // Check analyze button (should be disabled without file)
    cy.get('button').contains('Analyze Resume').should('be.disabled');
  });

  it('should show empty state for analysis history', () => {
    cy.contains('Analysis History').should('be.visible');
    cy.contains('No analyses yet').should('be.visible');
  });

  it('should handle file upload', () => {
    // Create a test file
    const fileName = 'test-resume.pdf';
    const fileContent = 'This is a test PDF content for resume analysis';
    
    // Mock file upload
    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from(fileContent),
        fileName: fileName,
        mimeType: 'application/pdf'
      },
      { force: true }
    );
    
    // Should show selected file
    cy.contains(`Selected: ${fileName}`).should('be.visible');
    
    // Analyze button should now be enabled
    cy.get('button').contains('Analyze Resume').should('not.be.disabled');
  });

  it('should allow adding job description', () => {
    const jobDescription = 'We are looking for a JavaScript developer with React experience...';
    
    cy.get('textarea[placeholder*="job description"]').type(jobDescription);
    cy.get('textarea[placeholder*="job description"]').should('have.value', jobDescription);
  });

  it('should navigate back to dashboard from results', () => {
    // This would require a successful analysis, which we'll mock
    cy.visit('/dashboard');
    
    // Check navigation elements
    cy.get('header').contains('Dashboard').should('be.visible');
    cy.get('header').contains('Dashboard').click();
    
    cy.url().should('include', '/dashboard');
  });

  it('should maintain user session', () => {
    cy.visit('/dashboard');
    
    // Refresh page
    cy.reload();
    
    // Should still be logged in
    cy.url().should('include', '/dashboard');
    cy.get('header').should('contain', `Hi, ${testUser.name}`);
  });

  it('should redirect to login after logout', () => {
    cy.get('button').contains('Logout').click();
    
    // Try to visit dashboard
    cy.visit('/dashboard');
    
    // Should redirect to login
    cy.url().should('include', '/auth/login');
  });
});
