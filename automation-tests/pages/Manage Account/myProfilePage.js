const { expect } = require('@playwright/test');

class ProfilePage {
  constructor(page) {
    this.page = page;

    this.headerAvatar = page.locator('.header-avatar-container, img[alt="Avatar"], .user-avatar').first(); 
    this.myProfileLink = page.locator('text=My Profile');

    this.fullNameInput = page.locator('input[name="fullname"]');
    this.phoneInput = page.locator('input[name="phone"]');
    this.genderSelect = page.locator('select[name="gender"]');

    this.uploadBtn = page.locator('text=Upload Avatar');
    this.saveBtn = page.locator('button:has-text("Save")');
    
    this.successToast = page.locator('.Toastify__toast--success, .alert-success');
  }


  async gotoProfile() {
    // Chờ header load xong mới click
    await this.headerAvatar.waitFor({ state: 'visible' });
    await this.headerAvatar.click();
    await this.myProfileLink.click();
    // Kiểm tra URL đổi sang trang profile
    await expect(this.page).toHaveURL(/.*profile/);
  }

  async updateBasicInfo(fullName, phone) {
    await this.fullNameInput.fill(fullName);
    await this.phoneInput.fill(phone);
  }

  async selectGender(genderValue) {
    const isSelectTag = await this.genderSelect.isVisible().catch(() => false);
    
    if (isSelectTag) {
        await this.genderSelect.selectOption({ label: genderValue }); // VD: "Female"
    } else {

        await this.page.locator('text=Gender').locator('..').click(); // Click vào vùng Gender
        await this.page.locator(`div[role="option"]:has-text("${genderValue}")`).click();
    }
  }

  // Hàm Lưu
  async clickSave() {
    await this.saveBtn.click();
  }
}

module.exports = { ProfilePage };