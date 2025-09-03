/// <reference types="cypress" />

// Custom commands for ResumeRadar testing

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>
      register(email: string, password: string, name?: string): Chainable<void>
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/auth/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
});

Cypress.Commands.add('register', (email: string, password: string, name?: string) => {
  cy.visit('/auth/register');
  if (name) {
    cy.get('input[placeholder*="full name"]').type(name);
  }
  cy.get('input[type="email"]').type(email);
  cy.get('input[placeholder*="Create a password"]').type(password);
  cy.get('input[placeholder*="Confirm your password"]').type(password);
  cy.get('button[type="submit"]').click();
});
