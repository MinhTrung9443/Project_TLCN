class ForgotPasswordPage {
  constructor(page) {
    this.page = page;
    this.forgotPasswordLink = page.locator('text=Forgot your password?');
    this.emailInput = page.locator('input[placeholder="your.email@example.com"]');
    this.sendOtpBtn = page.locator('button:has-text("Send OTP")');
    this.otpInput = page.locator('input[placeholder="Enter the OTP"]');
    this.newPassInput = page.locator('input[placeholder="Enter your new password"]');
    this.repeatPassInput = page.locator('input[placeholder="Repeat your new password"]');
    this.resetBtn = page.locator('button:has-text("Reset Password")');
  }

  async gotoLogin() {
    await this.page.goto('http://localhost:3000/login');
  }

  async clickForgotLink() {
    await this.forgotPasswordLink.click();
  }

  async sendOtp(email) {
    await this.emailInput.fill(email);
    await this.sendOtpBtn.click();
  }

  async resetPassword(otp, newPass) {
    await this.otpInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.otpInput.fill(otp);
    await this.newPassInput.fill(newPass);
    await this.repeatPassInput.fill(newPass); 
    await this.resetBtn.click();
  }


  async submitNewPasswordOnly(newPass) {
    await this.newPassInput.waitFor({ state: 'visible' });
    
    await this.newPassInput.fill(newPass);
    await this.repeatPassInput.fill(newPass); 
    await this.resetBtn.click();
  }
};

module.exports = { ForgotPasswordPage };