const { expect } = require('@playwright/test');

class PlatformPage {
    constructor (page){
        this.page = page;
        this.navigateToSettings = page.locator('a[href="/settings/TaskTypes"]');
        this.navigateToPlatformTab = page.getByRole('button', { name: 'Platform' });
        //Create Platform
        this.addIcon = page.locator('.header-col .btn-add-icon');
        this.namePlatform = page.getByLabel('Name');
        this.iconPlatform = page.locator('.icon-picker-container');
        this.saveButton = page.getByRole('button', {name:'SAVE'});
    }
    async goToSettings(){
        await this.navigateToSettings.click();
        await this.navigateToPlatformTab.click();
    };
    // 1. Tạo Platform
    async createPlatform(namePlatform){
        await this.addIcon.click();
        await this.namePlatform.fill(namePlatform);
        await this.iconPlatform.click();
        await this.saveButton.click();
    };
    async updatePlatform(oldPlatform, newPlatform){
        const row = this.page.locator('.settings-list-row', {hasText: oldPlatform} );
        await row.locator('.btn-edit').click();
        await this.namePlatform.clear();
        await this.namePlatform.fill(newPlatform);
        await this.saveButton.click();
    };
    async deletePlatform(oldPlatform){
        const row = this.page.locator('.settings-list-row', {hasText: oldPlatform});
        await row.locator('.btn-delete').click();
        
    }
}
module.exports = {PlatformPage};