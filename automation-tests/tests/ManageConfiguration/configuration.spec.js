import { PlatformPage } from "../../pages/ManageConfiguration/platformPage";
import { LoginPage} from "../../pages/Manage Account/loginPage";
import { TaskTypePage } from "../../pages/ManageConfiguration/taskTypePage";
import { PriorityPage } from "../../pages/ManageConfiguration/priorityPage";
const { test, expect } = require('@playwright/test');

//PLATFORM
test.describe('Testcase cho platform', () =>{
    test.beforeEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login('minhtrungbttv@gmail.com', '123123123');
    });
    test('Tao moi platform', async({page})=> {
        const platformPage = new PlatformPage(page);
        await platformPage.goToSettings();
        await platformPage.createPlatform('taoMoiNe1');
        await expect(page.locator('.settings-list-container .settings-list-row .col-name', {hasText: 'taoMoiNe1'})).toBeVisible();
    });

    test('Chinh sua Platform', async({page}) => {
        const platformPage = new PlatformPage(page);
        await platformPage.goToSettings();
        await platformPage.createPlatform('taoDeUpdate1');
        await platformPage.updatePlatform('taoDeUpdate1', 'updateRoiNe');
        await expect(page.locator('.settings-list-container .settings-list-row .col-name', {hasText: 'updateRoiNe'})).toBeVisible();
    });
    test('Xoa platform', async({page}) => {
        const platformPage = new PlatformPage(page);
        await platformPage.goToSettings();
        await platformPage.createPlatform('taoDeUpdate3');
        await platformPage.deletePlatform('taoDeUpdate3');
    })
});

//TASK TYPE
test.describe('Testcase cho task type', () => {
    test.beforeEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login('minhtrungbttv@gmail.com', '123123123');
    });
    test('Create Task Type', async({page})=> {
        const taskType = new TaskTypePage(page);
        await taskType.goToSettings();
        await taskType.createTaskType('new tasktype', 5);
        await expect(page.locator('.settings-list-body .col-name', {hasText:'new tasktype'})).toBeVisible();
    });

    test('Chinh sua task type', async({page}) => {
        const taskType = new TaskTypePage(page);
        await taskType.goToSettings();
        await taskType.updateTaskType('new tasktype', 'new tasktype1');
        await expect(page.locator('.settings-list-body .col-name', {hasText:'new tasktype1'})).toBeVisible();

    });

    test('Xoa task type', async({page}) => {
        const taskType = new TaskTypePage(page);
        await taskType.goToSettings();
        await taskType.deleteTaskType('new tasktype1');
    });
});

//PRIORITY
test.describe('Testcase cho Priority', () => {
    test.beforeEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login('minhtrungbttv@gmail.com', '123123123');
    });
    test('Create Priority', async({page}) => {
        const priorityPage = new PriorityPage(page);
        await priorityPage.goToSettings();
        await priorityPage.createPriority('new Priority', 4);
    });
    test('Update Priority', async({page}) => {
        const priorityPage = new PriorityPage(page);
        await priorityPage.goToSettings();
        await priorityPage.updatePriority('new Priority','new Priority1');
    });
    test('Delete Priority', async({page})=> {
        const priorityPage = new PriorityPage(page);
        await priorityPage.goToSettings();
        await priorityPage.deletePriority('new Priority1');
    });
})