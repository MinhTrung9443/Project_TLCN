const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/Manage Account/loginPage');
const { DashboardPage } = require('../../pages/Manage Account/notificationPage');

test.describe('Module: Thông báo (Notifications)', () => {

  test('TC_Notify_01: Xem và Click vào thông báo', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // 1. Đăng nhập
    await loginPage.goto();
    await loginPage.login('minhtrungbttv@gmail.com', '123123123');

    // 2. Click mở thông báo
    await dashboardPage.openNotificationList();

    // 3. Kiểm tra danh sách hiển thị
    await dashboardPage.verifyNotificationListVisible();

    const notificationText = "New Comment on Task";
    
    console.log(`Đang click vào thông báo: "${notificationText}"`);
    await dashboardPage.clickNotificationByText(notificationText);

    await expect(page).not.toHaveURL(/dashboard$/); 

  });

});