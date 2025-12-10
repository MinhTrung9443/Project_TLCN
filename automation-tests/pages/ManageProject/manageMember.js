// pages/ManageProject/manageMember.js

const { expect } = require('@playwright/test');

class ManageMemberPage {
    constructor(page){
        this.page = page;

        this.projectsLink = page.getByRole('link', { name: 'Projects' });

        this.membersTab = page.getByRole('link', { name: 'Members' });
        
        this.addPeopleButton = page.getByRole('button', { name: 'Add People / Team' });
        
        // Tab Add Individual
        const userSelectContainer = page.locator('div.form-group:has-text("Select a user")');
        this.selectUserDropdown = userSelectContainer.getByRole('combobox');
        const groupSelectContainer = page.locator('div.form-group:has-text("Select a group for this project...")');
        this.selectGroupDropdown = groupSelectContainer.getByRole('combobox');
        
        this.addButtonInModal = page.locator('.modal-actions').getByRole('button', { name: 'Add' });


        // Tab Add Team
        this.addTeamTab = page.getByRole('button', { name: 'Add Team' });
        const teamSelectContainer = page.locator('div.form-group:has-text("Select a Team")');
        this.selectTeamDropdown = teamSelectContainer.getByRole('combobox');
        const leaderSelectContainer = page.locator('div.form-group:has-text("Select a Leader")');
        this.selectLeaderDropdown = leaderSelectContainer.getByRole('combobox');
        this.addButtonInModal = page.locator('.modal-actions').getByRole('button', { name: 'Add' });

        //Remove a team
        this.confirmYesButton = page.getByRole('button', {name:'Yes'});
    }

    async gotoProjectList() {
        await this.projectsLink.click();
    }

    async navigateToProjectSettings(projectName) {
        const projectRow = this.page.locator('tr', { hasText: projectName });
        await projectRow.locator('.project-name-link').click();
        await expect(this.page.getByText('Project Settings')).toBeVisible();
    }

    async goToMembersTab() {
        await this.membersTab.click();
        await expect(this.page.getByRole('button', { name: 'Add People / Team' })).toBeVisible();
    }

    async addIndividualMember(userName, groupName) {
        await this.addPeopleButton.click();
        
        await this.selectUserDropdown.click();
        await this.page.getByText(userName).click();

        await this.selectGroupDropdown.click();
        await this.page.getByRole('option', { name: groupName, exact: true }).click();;
        
        await this.addButtonInModal.click();
    }

    async addTeamToProject(teamName, leaderName) {
    // Các bước này đã hoạt động tốt
    await this.addPeopleButton.click();
    await this.addTeamTab.click();
    await this.selectTeamDropdown.click();
    await this.page.getByRole('option', { name: teamName }).click();
    await this.selectLeaderDropdown.click();
    await this.selectLeaderDropdown.fill(leaderName);
    
    await this.page.waitForTimeout(500); 

    await this.selectLeaderDropdown.press('ArrowDown');
    
    await this.selectLeaderDropdown.press('Enter');

    await this.addButtonInModal.click();
    }

    async verifyMemberAdded(memberName) {
        await expect(this.page.getByText('Member added successfully!')).toBeVisible();        
        const memberRow = this.page.locator('.project-members-container', { hasText: memberName });
        await expect(memberRow).toBeVisible();
    }

    async removeTeamFromProject(teamName) {
        const teamRow = this.page.locator('.table-row.team-row', { hasText: teamName });

        await teamRow.locator('.actions-menu-container button').click();
        await this.page.locator('li.danger', { hasText: 'Remove Team' }).click();
        await this.confirmYesButton.click();
    }

    async verifyTeamRemoved(teamName) {
        await expect(this.page.getByText('Team removed.')).toBeVisible();
        const teamRow = this.page.locator('.table-row.team-row', { hasText: teamName });
        await expect(teamRow).not.toBeVisible();
    }
}

module.exports = { ManageMemberPage }; 