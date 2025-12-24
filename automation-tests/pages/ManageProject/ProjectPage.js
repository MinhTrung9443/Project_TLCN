// pages/ProjectsPage.js
const { expect } = require("@playwright/test");

class ProjectsPage {
  constructor(page) {
    this.page = page;

    // --- LOCATORS ---
    // Nút điều hướng "Projects" ở sidebar
    this.projectsLink = page.getByRole("link", { name: "Projects" });

    // --- CREATE PROJECT ---
    this.createProjectBtn = page.getByRole("button", { name: "CREATE PROJECT" });
    // Modal tạo project
    this.modal = page.locator('.modal-container, [role="dialog"]');
    // Các trường trong form
    this.projectNameInput = this.modal.getByRole("textbox", { name: "Project Name *" });
    this.projectKeyInput = this.modal.getByLabel("Key");
    this.projectManagerDropdown = this.modal.locator("#projectManagerId");
    this.createBtnInModal = this.modal.getByRole("button", { name: "Create" });

    // --- DELETE PROJECT ---
    this.projectRow = (projectName) => page.locator(`tr:has-text("${projectName}")`);
    this.actionsMenuBtn = (projectName) => this.projectRow(projectName).locator(".actions-trigger-btn");
    this.confirmDeleteBtn = page.locator("button.confirm-button");

    // Tab "Delete Project"
    this.deleteTab = page.getByRole("button", { name: "Delete Project" });
    // Toast message
    this.successToast = page.locator(".Toastify");
  }

  // --- ACTIONS ---

  async goto() {
    await this.projectsLink.click();
    await expect(this.page).toHaveURL(/.*projects/);
  }

  async createProject(projectData) {
    await this.createProjectBtn.click();
    await this.modal.waitFor({ state: "visible" });
    await this.projectNameInput.fill(projectData.name);
    await this.projectKeyInput.fill(projectData.key);

    // Chọn Project Manager
    await this.projectManagerDropdown.click();
    await this.projectManagerDropdown.selectOption({ label: projectData.manager });
    await this.createBtnInModal.click();
  }

  async deleteProject(projectName) {
    // 1. Mở menu 3 chấm của đúng project đó
    const projectActionsMenu = this.actionsMenuBtn(projectName);
    await projectActionsMenu.click();
    const deleteLink = this.page.locator(".actions-dropdown:visible").locator('button:has-text("Delete Project")');

    await deleteLink.waitFor({ state: "visible" });
    await deleteLink.click();

    await this.confirmDeleteBtn.waitFor({ state: "visible" });
    await this.confirmDeleteBtn.click();
  }

  async verifyProjectCreated(projectName) {
    await expect(this.successToast).toContainText("Project created successfully!");
    await this.successToast.waitFor({ state: "hidden" });
    await expect(this.projectRow(projectName)).toBeVisible();
  }

  async verifyProjectDeleted(projectName) {
    await expect(this.successToast).toContainText("Project deleted successfully!");
    await this.successToast.waitFor({ state: "hidden" });

    // Kiểm tra project không còn ở tab "All Projects"
    await expect(this.projectRow(projectName)).toBeHidden();

    // Chuyển qua tab "Delete Project" và kiểm tra
    await this.deleteTab.click();
    await expect(this.projectRow(projectName)).toBeVisible();
  }
}

module.exports = { ProjectsPage };
