const { expect } = require('@playwright/test');

class TaskFinderPage {
  constructor(page) {
    this.page = page;
    this.taskFinderLink = page.locator('a[href="/task-finder"]');
    this.createTaskBtn = page.locator('button:has-text("CREATE TASK")');
    this.taskList = page.locator('.task-list-container');

    this.modal = page.locator('div.modal-content'); 
    
    this.projectDropdown = this.modal.locator('select#projectId');
    this.typeDropdown = this.modal.locator('select#taskTypeId'); // ID đoán
    this.priorityDropdown = this.modal.locator('select#priorityId'); // ID đoán

    this.taskNameInput = this.modal.locator('input[name="name"]');
    this.saveTaskBtn = this.modal.locator('button:has-text("SAVE")');
    

    // UPDATE TASK 
    this.taskRow = (taskName) => this.page.locator(`.task-row:has-text("${taskName}")`);
    this.taskDetailPanel = this.page.locator('.task-detail-panel, .task-detail-container');
    
    this.typeDropdownDetail = this.taskDetailPanel.locator('div.detail-item-editable:has-text("Task")'); // Dùng text mặc định của nó
    this.platformDropdownDetail = this.taskDetailPanel.locator('div.detail-item-editable:has-text("Platform")');
    
    // ADD COMMENT
    this.commentsTab = this.taskDetailPanel.locator('button:has-text("Comments")');
    this.commentInput = this.taskDetailPanel.locator('textarea[placeholder="Add a comment..."]');
    this.postCommentBtn = this.taskDetailPanel.locator('button:has-text("Post Comment")');
    this.commentList = this.taskDetailPanel.locator('.comment-list');

    //DELETE TASK
    this.actionsMenuBtn = this.taskDetailPanel.locator('button.actions-menu-trigger');
    this.deleteTaskLink = page.locator('li.danger:has-text("Delete Task")');
     this.confirmDeleteBtn = page.getByRole('button', { name: 'Yes' });
  }
  async goto() {
    await this.taskFinderLink.click();
    await expect(this.page).toHaveURL(/.*task-finder/);
  }

  async openCreateTaskModal() {
    await this.createTaskBtn.click();
    // Chờ cho cái modal có class "modal-content" hiện ra
    await this.modal.waitFor({ state: 'visible' }); 
    // Kiểm tra tiêu đề (nằm trong modal)
    await expect(this.modal.locator('h2:has-text("Create Task")')).toBeVisible();
  }

  async fillTaskForm(taskData) {
    // Dùng lệnh `selectOption` để chọn theo text hiển thị
    await this.projectDropdown.selectOption({ label: taskData.project });
    await this.typeDropdown.selectOption({ label: taskData.type });
    await this.priorityDropdown.selectOption({ label: taskData.priority });

    // Nhập Tên Task
    await this.taskNameInput.fill(taskData.name);
  }
  
  async saveTask() {
    await this.saveTaskBtn.click();
  }

  async verifyTaskCreated(taskName) {
    await this.modal.waitFor({ state: 'hidden' });
    await this.page.locator('text=Loading tasks...').waitFor({ state: 'hidden' });
    const firstTask = this.taskList.locator('.task-row').first();
    await expect(firstTask).toContainText(taskName);
  }
  async selectTask(taskName) {
    await this.taskRow(taskName).click();
    await this.taskDetailPanel.waitFor({ state: 'visible' });
  }
  
  // --- SỬA LẠI HÀM UPDATE TYPE VÀ PLATFORM ---
  async updateType(newType) {
    await this.typeDropdownDetail.click();
    await this.page.locator(`div[role="option"]:has-text("${newType}")`).click();
  }

  async updatePlatform(newPlatform) {
    await this.platformDropdownDetail.click();
    await this.page.locator(`div[role="option"]:has-text("${newPlatform}")`).click();
  }
  // --- HẾT PHẦN SỬA ---

  async addComment(commentText) {
    await this.commentsTab.click();
    await this.commentInput.fill(commentText);
    await this.postCommentBtn.click();
  }
  
  async verifyCommentAdded(commentText) {
    await expect(this.commentList).toContainText(commentText);
  }
  
  async clickDeleteTask() {
    await this.actionsMenuBtn.click();
    await this.deleteTaskLink.click();
    
    // Thêm một bước chờ nhỏ để đảm bảo modal có thời gian render
    await this.page.waitForTimeout(500); 

    // Click nút Yes
    await this.confirmDeleteBtn.click();
  }
  async verifyTaskDeleted(taskName) {
    await this.page.locator('text=Loading tasks...').waitFor({ state: 'hidden' });
    await expect(this.taskRow(taskName)).toBeHidden();
  }
}

module.exports = { TaskFinderPage };