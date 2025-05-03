module.exports = {
  e2e: {
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    baseUrl: 'http://localhost:27180', // Vite 前端服务端口
    supportFile: false,
  },
}
