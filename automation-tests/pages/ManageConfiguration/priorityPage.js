const { expect } = require("@playwright/test");

class PriorityPage {
    constructor(page){
        this.page = page;
        this.navigateSettings = page.getByRole('link', { name: 'settings Settings' });
        this.PriorityTab = page.getByRole('button', { name: 'Priority' });
        this.addIcon = page.locator('.btn-add-icon');
        this.namePriorityInput = page.getByLabel('Priority Name');
        this.iconPriorityInput = page.locator('.icon-picker-container .icon-picker-button');
        this.saveButton = page.getByRole('button', {name:'SAVE'});

    }
    async goToSettings(){
        await this.navigateSettings.click();
        await this.PriorityTab.click();
    }
    async createPriority(name, number1){
        await this.addIcon.click();
        await this.namePriorityInput.fill(name);
        await this.iconPriorityInput.nth(number1).click();
        await this.saveButton.click();
    }
    async updatePriority(oldName, newName){
        const row = this.page.locator('.settings-list-row', {hasText: oldName});
        await row.locator('.btn-edit').click();
        await this.namePriorityInput.fill(newName);
        await this.saveButton.click();
    }
    async deletePriority(name){
        const row = this.page.locator('.settings-list-row', {hasText:name});
        await row.locator('.btn-delete').click();
        await this.page.getByRole('button', {name:'Yes'}).click();
    }
}
module.exports = {PriorityPage};