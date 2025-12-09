// tests/updateTask.spec.js
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/Manage Account/loginPage');
const { TaskFinderPage } = require('../../pages/ManageTask/TaskPage');

test.describe('Module: Quản lý Task', () => {

  // Gộp cả 2 chức năng vào 1 test case end-to-end
  test('TC_Task_02: Tạo mới và Cập nhật Task thành công', async ({ page }) => {
    // Tăng thời gian chạy của test case này lên 90 giây cho thoải mái
    test.setTimeout(90000); 

    const loginPage = new LoginPage(page);
    const taskFinderPage = new TaskFinderPage(page);

    // --- PHẦN 1: TẠO TASK MỚI (Giống hệt test case create) ---
    console.log('--- BƯỚC 1: Đang tạo task mới để làm dữ liệu test ---');
    
    await loginPage.goto();
    await loginPage.login('minhtrungbttv@gmail.com', '123123123');
    await taskFinderPage.goto();
    await taskFinderPage.openCreateTaskModal();

    const taskName = `Task to Update - ${Date.now()}`;
    const taskData = {
      project: 'Account System',
      type: 'Task',
      name: taskName,
      priority: 'Medium'
    };

    await taskFinderPage.fillTaskForm(taskData);
    await taskFinderPage.saveTask();
    await taskFinderPage.verifyTaskCreated(taskName);
    console.log(`--- Đã tạo thành công task: "${taskName}" ---`);

    // --- PHẦN 2: CẬP NHẬT TASK VỪA TẠO ---
    console.log('--- BƯỚC 2: Bắt đầu cập nhật task vừa tạo ---');

    await taskFinderPage.selectTask(taskName);

    // 2. Cập nhật Type
    const newType = 'Improvement';
    console.log(`Đang đổi Type sang: ${newType}`);
    await taskFinderPage.updateType(newType);

    // --- SỬA LẠI CÁCH CHECK TOAST ---
    // Tìm toast nào có class success VÀ có chứa text "updated"
    const updateTypeToast = page.locator('.Toastify__toast--success:has-text("updated")');
    await expect(updateTypeToast).toBeVisible();
    await expect(updateTypeToast).toContainText('task Type Id updated successfully!');

    // Chờ cho cái toast này biến mất trước khi làm tiếp, để tránh lỗi tương tự
    await updateTypeToast.waitFor({ state: 'hidden' });
    // --- HẾT PHẦN SỬA ---

    // 3. Cập nhật Platform
    const newPlatform = 'BE';
    console.log(`Đang đổi Platform sang: ${newPlatform}`);
    await taskFinderPage.updatePlatform(newPlatform);

    // --- SỬA LẠI CÁCH CHECK TOAST CHO PLATFORM ---
    const updatePlatformToast = page.locator('.Toastify__toast--success:has-text("updated")');
    await expect(updatePlatformToast).toBeVisible();
    await expect(updatePlatformToast).toContainText('platform Id updated successfully!');

    // Chờ nó biến mất
    await updatePlatformToast.waitFor({ state: 'hidden' });

    // 4. Thêm Comment
    const newComment = `Đây là comment tự động lúc ${new Date().toLocaleTimeString()}`;
    console.log(`Đang thêm comment: ${newComment}`);
    await taskFinderPage.addComment(newComment);
    
    // 5. Kiểm tra Comment đã được thêm
    await taskFinderPage.verifyCommentAdded(newComment);
    
    await page.screenshot({ path: 'test-results/update-task-success.png' });
  });

});