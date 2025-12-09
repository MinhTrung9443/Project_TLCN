const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/Manage Account/loginPage');
const { ProfilePage } = require('../../pages/Manage Account/myProfilePage');
const path = require('path');

test.describe('Module: Quản lý Hồ sơ cá nhân (My Profile)', () => {

  test('TC_Profile_01: Cập nhật thông tin và Avatar thành công', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const profilePage = new ProfilePage(page);

    await loginPage.goto();
    await loginPage.login('minhtrungbttv@gmail.com', '123123123'); 

    await profilePage.gotoProfile();

    const newName = 'Trung Admin Update';
    const newPhone = '0988888888';
    
    await profilePage.updateBasicInfo(newName, newPhone);

    await profilePage.selectGender('Female'); 


    await profilePage.clickSave();

    await expect(profilePage.successToast).toBeVisible();

    await page.reload();
    await expect(profilePage.fullNameInput).toHaveValue(newName);
    await expect(profilePage.phoneInput).toHaveValue(newPhone);
  });

});