// pages/DashboardPage.js
const { expect } = require('@playwright/test');

class DashboardPage {
  constructor(page) {
    this.page = page;

    this.notificationIcon = page.locator('.notification-bell-button');

    this.notificationDropdown = page.locator('.notification-dropdown');


    this.notificationList = page.locator('.notification-list');

    this.notificationItems = page.locator('.notification-item');
  }


  async openNotificationList() {
    await this.notificationIcon.click();
  }

  async verifyNotificationListVisible() {
    await expect(this.notificationDropdown).toBeVisible();
    await expect(this.notificationList).toBeVisible();
  }

  async clickNotificationByText(text) {

    const targetItem = this.notificationList.locator(`.notification-item:has-text("${text}")`).first();
    
    // Chờ nó hiện ra rồi click
    await targetItem.waitFor({ state: 'visible' });
    await targetItem.click();
  }
}

module.exports = { DashboardPage };