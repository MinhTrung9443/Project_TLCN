// tests/login_test.spec.js
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/Manage Account/loginPage'); 

test.describe('Kiểm thử chức năng Đăng Nhập', () => {
  
  test('TC01: Đăng nhập thành công', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login('minhtrungbttv@gmail.com', '123123123');
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
  });

  test('TC02: Đăng nhập thất bại do sai pass', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('admin@gmail.com', '123'); 
    await expect(page).toHaveURL('http://localhost:3000/login');
  });
  test ('TC03: Đăng nhập với trường bắt buộc bị để trống', async ({page}) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('minhtrungbttv@gmail.com', '');
    await expect(page).toHaveURL('http://localhost:3000/login');
  });
  test ('TC04: Đăng nhập với định dạng email bị sai', async ({page}) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('minhtrungbttv', '123123123');
    await expect(page).toHaveURL('http://localhost:3000/login');
  });
});