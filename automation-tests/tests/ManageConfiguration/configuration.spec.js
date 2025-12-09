import { PlatformPage } from "../../pages/ManageConfiguration/platformPage";
import { LoginPage} from "../../pages/Manage Account/loginPage";
const { test, expect } = require('@playwright/test');

test.describe('Testcase cho platform', () =>{
    test('Tao moi platform', async({page})=> {
        const loginPage = new LoginPage(page);
        const platformPage = new PlatformPage(page);
        await loginPage.goto();
        await loginPage.login('minhtrungbttv@gmail.com', '123123123');
        await platformPage.goToSettings();
        await platformPage.createPlatform('taoMoiNe1');
        await expect(page.locator('.settings-list-container .settings-list-row .col-name', {hasText: 'taoMoiNe1'})).toBeVisible();
    });

    test('Chinh sua Platform', async({page}) => {
        const loginPage = new LoginPage(page);
        const platformPage = new PlatformPage(page);
        await loginPage.goto();
        await loginPage.login('minhtrungbttv@gmail.com', '123123123');
        await platformPage.goToSettings();
        await platformPage.createPlatform('taoDeUpdate');
        await platformPage.updatePlatform('taoDeUpdate', 'updateRoiNe');
        await expect(page.locator('.settings-list-container .settings-list-row .col-name', {hasText: 'updateRoiNe'})).toBeVisible();
    });
    test('Xoa platform', async({page}) => {
        const loginPage = new LoginPage(page);
        const platformPage = new PlatformPage(page);
        await loginPage.goto();
        await loginPage.login('minhtrungbttv@gmail.com', '123123123');
        await platformPage.goToSettings();
        await platformPage.createPlatform('taoDeUpdate');
        await platformPage.deletePlatform('taoDeUpdate');
        await expect(page.locator('.settings-list-container .settings-list-row .col-name', {hasText: 'taoDeUpdate'})).toBeVisible();
    })
});
