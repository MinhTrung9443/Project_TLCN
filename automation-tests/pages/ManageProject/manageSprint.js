const { expect } = require('@playwright/test');

class SprintPage {
    constructor(page) {
        this.page = page;

        // Locators trên trang danh sách Projects
        this.projectsLink = page.getByRole('link', { name: 'Projects' });

        // Locators trên trang Backlog & Sprints
        this.backlogLink = page.locator('a[href*="/backlog"]');
        this.createSprintButton = page.getByRole('button', { name: 'Create Sprint' });


        // Locators trong modal Create/Edit Sprint
        this.createSprintButton = page.getByRole('button', { name: 'Create Sprint' });
        this.sprintNameInput = page.getByLabel('Name');
        this.saveButton = page.getByRole('button', { name: 'Save' });
    }

    async navigateToProject(projectName) {
        await this.projectsLink.click();
        
        // Chờ cho bảng project tải xong
        await expect(this.page.locator('table')).toBeVisible();

        const projectRow = this.page.locator('tr', { hasText: projectName });
        await projectRow.locator('.project-name-link').click();
        
        // THÊM BƯỚC CHỜ QUAN TRỌNG:
        // Chờ cho đến khi trang Cài đặt tải xong VÀ link Backlog trong sidebar xuất hiện.
        await expect(this.backlogLink).toBeVisible();
    }

    async gotoBacklog() {
        // Click vào link Backlog đã tìm được
        await this.backlogLink.click();
        
        // Chờ cho trang Backlog tải xong, dấu hiệu là nút "Create Sprint" xuất hiện
        await expect(this.createSprintButton).toBeVisible();
    }

     async createSprint() {
        await this.createSprintButton.click();
    }
    
    async updateSprint(oldSprintName, newSprintData) {
        // 1. Tìm đúng sprint card và click vào nút menu ba chấm
        const sprintCard = this.page.locator('.sprint-card', { hasText: oldSprintName });
        await sprintCard.locator('.sprint-menu-btn').click();

        // 2. Click vào lựa chọn "Edit"
        await this.page.getByRole('button', { name: 'Edit' }).click();

        // 3. Cập nhật các trường dữ liệu mới
        if (newSprintData.name) {
            await this.sprintNameInput.clear();
            await this.sprintNameInput.fill(newSprintData.name);
        }
        // 4. Lưu lại thay đổi
        await this.saveButton.click();
    }

    async startSprint(sprintName) {
        const sprintCard = this.page.locator('.sprint-card', { hasText: sprintName });
        await sprintCard.locator('.sprint-menu-btn').click();

        await this.page.getByRole('button', { name: 'Start Sprint' }).click();
        // Xử lý modal xác nhận nếu có
        const confirmButton = this.page.getByRole('button', { name: 'Start' });
        if (await confirmButton.isVisible()) {
            await confirmButton.click();
        }
    }

}

module.exports = { SprintPage };