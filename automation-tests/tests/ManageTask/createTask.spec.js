// tests/createTask.spec.js
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/Manage Account/loginPage');
const { TaskFinderPage } = require('../../pages/ManageTask/TaskPage');

test.describe('Module: Quản lý Task', () => {

  test('TC_Task_01: Tạo Task mới thành công với đầy đủ thông tin', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskFinderPage = new TaskFinderPage(page);

    await loginPage.goto();
    await loginPage.login('minhtrungbttv@gmail.com', '123123123');

    await taskFinderPage.goto();

    await taskFinderPage.openCreateTaskModal();

    const taskData = {
      project: 'Account System', // Chọn từ dropdown
      type: 'Bug',          // Chọn từ dropdown
      name: `New Task`, 
      description: 'Đây là mô tả chi tiết cho task mới được tạo bằng Automation Test.',
      priority: 'Low',           // Chọn từ dropdown
      assignee: 'Trung Admin Update'
    };
    
    console.log(`Đang tạo task với tên: ${taskData.name}`);
    await taskFinderPage.fillTaskForm(taskData);
    
    await taskFinderPage.saveTask();

    await taskFinderPage.verifyTaskCreated(taskData.name);

    await page.screenshot({ path: 'test-results/create-task-success.png' });
  });
});