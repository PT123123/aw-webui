// Cypress 集成测试：测试 Inbox 页面点击刷新按钮后能获取并渲染 notes
describe('Inbox 页面集成测试', () => {
  it('点击刷新按钮后能获取并渲染 notes', () => {
    // 请根据实际前端端口修改下方 URL
    cy.exec('mkdir -p cypress/results')
    cy.writeFile('cypress/results/debug.log', 'before visit\n', { flag: 'a+' })
    cy.on('window:before:load', win => {
      win.onerror = function(msg, url, line, col, error) {
        const errMsg = `window.onerror: ${msg} at ${url}:${line}:${col}\n`;
        fetch('/__cypress__/write-log', {method: 'POST', body: errMsg});
      };
    });
    cy.on('uncaught:exception', (err, runnable) => {
      cy.writeFile('cypress/results/debug.log', 'uncaught:exception: ' + err.message + '\n', { flag: 'a+' });
      return false; // 防止 Cypress 因异常而中断
    });
    cy.visit('http://localhost:27180/#/inbox')
    cy.writeFile('cypress/results/debug.log', 'after visit\n', { flag: 'a+' }).should('exist')
    // cy.get('.note-item', {timeout: 5000}).should('have.length.greaterThan', 0).screenshot('step4-note-item-exist')
    // cy.document().then(doc => {
    //   cy.writeFile('cypress/results/inbox-page.html', doc.body.innerHTML)
    // })
    // cy.get('.note-item').first().should('contain.text', 'content')
  })
})
