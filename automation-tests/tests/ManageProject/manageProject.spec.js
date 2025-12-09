// tests/manageProject.spec.js
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/Manage Account/loginPage');
const { ProjectsPage } = require('../../pages/ManageProject/ProjectPage');

test.describe('Module: Quản lý Project', () => {

  let page; // Tạo biến page để dùng chung
  let loginPage;
  let projectsPage;
  const projectName = `Test Project - ${Date.now()}`;
  const projectKey = `TP${Math.floor(Math.random() * 1000)}`;

  // Chạy trước mỗi test case
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    loginPage = new LoginPage(page);
    projectsPage = new ProjectsPage(page);
    
    // Đăng nhập
    await loginPage.goto();
    await loginPage.login('minhtrungbttv@gmail.com', '123123123');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  // Chạy sau mỗi test case
  test.afterEach(async () => {
    await page.close();
  });

  // TEST CASE 1: TẠO PROJECT
  test('TC_Project_01: Tạo Project mới thành công', async () => {
    // 1. Vào trang Projects
    await projectsPage.goto();

    // 2. Tạo project
    const projectData = {
      name: projectName,
      key: projectKey,
      manager: 'hoanglong' 
    };
    await projectsPage.createProject(projectData);

    // 3. Kiểm tra kết quả
    await projectsPage.verifyProjectCreated(projectName);
  });

  // TEST CASE 2: LƯU TRỮ PROJECT
  test('TC_Project_02: Lưu trữ (Archive) Project thành công', async () => {
    await projectsPage.goto();
    await projectsPage.archiveProject('Project Priority');

    await projectsPage.verifyProjectArchived('Project Priority');
  });

});