// tests/deleteTask.spec.js
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/Manage Account/loginPage');
const { TaskFinderPage } = require('../../pages/ManageTask/TaskPage');

test.describe('Module: Quản lý Task', () => {

  test('TC_Task_03: Xóa Task thành công', async ({ page }) => {
    test.setTimeout(90000);
    
    const loginPage = new LoginPage(page);
    const taskFinderPage = new TaskFinderPage(page);
    
    // --- SETUP: Tạo 1 task mới để xóa ---
    console.log('--- SETUP: Đang tạo task để chuẩn bị xóa ---');
    await loginPage.goto();
    await loginPage.login('minhtrungbttv@gmail.com', '123123123');
    await taskFinderPage.goto();
    await taskFinderPage.openCreateTaskModal();

    const taskNameToDelete = `Task to DELETE - ${Date.now()}`;
    const taskData = {
      project: 'Account System',
      type: 'Task',
      name: taskNameToDelete,
      priority: 'High'
    };
    
    await taskFinderPage.fillTaskForm(taskData);
    await taskFinderPage.saveTask();
    await taskFinderPage.verifyTaskCreated(taskNameToDelete);
    console.log(`--- SETUP: Đã tạo thành công task "${taskNameToDelete}" ---`);
    
    // --- KỊCH BẢN XÓA ---
    console.log('--- Bắt đầu kịch bản xóa task ---');
    
    // 1. Click vào task vừa tạo
    await taskFinderPage.selectTask(taskNameToDelete);

    await taskFinderPage.clickDeleteTask();
    
    // 3. KIỂM TRA KẾT QUẢ
    await expect(page.locator('.Toastify')).toContainText('Task deleted successfully!');
    await taskFinderPage.verifyTaskDeleted(taskNameToDelete);
  });

});