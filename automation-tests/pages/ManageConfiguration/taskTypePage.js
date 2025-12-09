const { expect } = require("@playwright/test");

class TaskTypePage {
    constructor(page){
        this.page = page;
        this.navigateSettings = page.getByRole('link', { name: 'settings Settings' });
        this.addIcon = page.locator('.btn-add-icon');
        this.nameTaskTypeInput = page.getByLabel('Task Type');
        this.iconTaskTypeInput = page.locator('.icon-picker-container .icon-picker-button');
        this.saveButton = page.getByRole('button', {name:'SAVE'});
        this.findTaskTypeRow = page.locator('.settings-list-body .col-name');

        //delete
        this.deleteConfirm = page.getByRole('button', {name:'SAVE'});
    }
    async goToSettings(){
        await this.navigateSettings.click();
    }
    async createTaskType(nameTaskType, number1){
        await this.addIcon.click();
        await this.nameTaskTypeInput.fill(nameTaskType);
        await this.iconTaskTypeInput.nth(number1).click();
        await this.saveButton.click();
    }
    async updateTaskType(oldName, newName){
        const row = this.page.locator('.settings-list-row', {hasText: oldName});
        await row.locator('.btn-edit').click();
        await this.nameTaskTypeInput.fill(newName);
        await this.saveButton.click();
    }
    async deleteTaskType(nameTaskType){
        const row = this.page.locator('.settings-list-row', {hasText:nameTaskType});
        await row.locator('.btn-delete').click();
        await this.page.getByRole('button', {name:'Yes'}).click();
    }
}
module.exports = {TaskTypePage};