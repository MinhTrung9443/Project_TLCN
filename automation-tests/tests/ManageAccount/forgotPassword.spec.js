const { test, expect } = require('@playwright/test');
const { ForgotPasswordPage } = require('../../pages/Manage Account/forgotPasswordPage');

test.describe('Kiểm thử chức năng Quên mật khẩu', () => {

  test('TC01: Luồng Reset Password (Nhập OTP thủ công)', async ({ page }) => {

    const forgotPage = new ForgotPasswordPage(page);

    // 1. Vào trang và gửi OTP
    await forgotPage.gotoLogin();
    await forgotPage.clickForgotLink();
    await expect(page).toHaveURL(/.*forgot-password/); 
    await forgotPage.sendOtp('hnhunght31.10+1@gmail.com');

    // 2. Chờ 15 giây để nhập OTP
    console.log("⏳ Vui lòng nhập OTP vào trình duyệt trong vòng 15 giây...");
    await page.waitForTimeout(25000); 

    // 3. Sau 15s, máy sẽ tự điền mật khẩu mới và bấm nút
    // Lưu ý: Chỉ điền pass, KHÔNG điền OTP nữa
    await forgotPage.submitNewPasswordOnly('NewPassword123@');

    await expect(page).toHaveURL('http://localhost:3000/login'); 
  });

});