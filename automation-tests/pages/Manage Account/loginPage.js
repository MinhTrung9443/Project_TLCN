class LoginPage {
  constructor(page) {
    this.page = page;
    
    this.emailInput = page.locator('input[name="email"]'); 
    this.passwordInput = page.locator('input[name="password"]'); 
    this.loginButton = page.locator('button[type="submit"]'); 
    this.errorMessage = page.locator('.alert-danger'); 
  }

  async goto() {
    await this.page.goto('http://localhost:3000/login');
  }

  // Hàm nhập email
  async enterEmail(email) {
    await this.emailInput.fill(email);
  }

  // Hàm nhập password
  async enterPassword(pass) {
    await this.passwordInput.fill(pass);
  }

  // Hàm click nút login
  async clickLoginBtn() {
    await this.loginButton.click();
  }

  // HOẶC: Viết 1 hàm gộp làm luôn việc Login cho nhanh (Re-usable function)
  async login(email, pass) {
    await this.enterEmail(email);
    await this.enterPassword(pass);
    await this.clickLoginBtn();
  }
}

module.exports = { LoginPage };