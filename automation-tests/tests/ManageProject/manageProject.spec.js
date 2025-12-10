const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/Manage Account/loginPage');
const { ProjectsPage } = require('../../pages/ManageProject/ProjectPage');
const { ManageMemberPage } = require('../../pages/ManageProject/manageMember'); // Import class mới
const { SprintPage } = require('../../pages/ManageProject/manageSprint'); // <-- IMPORT MỚI

test.describe('Module: Quản lý Project', () => {

  let loginPage;
  let projectsPage;
  let manageMemberPage; // Thêm biến cho trang quản lý member

  // Dùng beforeEach chuẩn với fixture { page }
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    projectsPage = new ProjectsPage(page);
    manageMemberPage = new ManageMemberPage(page); // Khởi tạo page object
    
    // Đăng nhập
    await loginPage.goto();
    await loginPage.login('minhtrungbttv@gmail.com', '123123123');
    await expect(page).toHaveURL(/.*dashboard/);
  });


  // TEST CASE 1: TẠO PROJECT
 test('TC_Project_01: Tạo Project mới thành công', async () => {
    const projectName = `Test Project - ${Date.now()}`;
    const projectKey = `TP${Math.floor(Math.random() * 1000)}`;
    await projectsPage.goto();
    const projectData = {
      name: projectName,
      key: projectKey,
      manager: 'hoanglong' 
    };
    await projectsPage.createProject(projectData);
    await projectsPage.verifyProjectCreated(projectName);
  });

  // TEST CASE 2: LƯU TRỮ PROJECT
  test('TC_Project_02: Lưu trữ (Archive) Project thành công', async () => {
    await projectsPage.goto();
    await projectsPage.archiveProject('Project Priority');

    await projectsPage.verifyProjectArchived('Project Priority');
  });

  // TEST CASE 3: THÊM THÀNH VIÊN CÁ NHÂN
  test('TC_Member_01: Thêm thành viên cá nhân (Individual) vào project', async ({ page }) => {
    await manageMemberPage.gotoProjectList();
    await manageMemberPage.navigateToProjectSettings('Account System');
    await manageMemberPage.goToMembersTab();
    await manageMemberPage.addIndividualMember('NhungNguyen', 'BA');
    await manageMemberPage.verifyMemberAdded('NhungNguyen');
  });

  // TEST CASE 4: THÊM TEAM
  test('TC_Member_02: Thêm một Team vào project', async ({ page }) => {
    await manageMemberPage.gotoProjectList();
    await manageMemberPage.navigateToProjectSettings('Account System');
    await manageMemberPage.goToMembersTab();
    await manageMemberPage.addTeamToProject('FE', 'Nguyen Hoang Nam');

    await expect(page.getByText('Team members added successfully!')).toBeVisible();
    const membersContainer = page.locator('.project-members-container');
    await expect(membersContainer.getByText('FE (2 members)')).toBeVisible();
  });

  test('TC_Member_03: Xóa một Team khỏi project', async ({ page }) => {
        const teamToRemove = 'FE'; // Dùng một team khác để test
        const leaderOfTeam = 'Nguyen Hoang Nam'; // Giả sử leader của team BA

        await manageMemberPage.gotoProjectList();
        await manageMemberPage.navigateToProjectSettings('Account System');
        await manageMemberPage.goToMembersTab();
        await manageMemberPage.addTeamToProject(teamToRemove, leaderOfTeam);
        await expect(page.getByText('Team members added successfully!')).toBeVisible();
        await expect(page.locator('.table-row.team-row', { hasText: teamToRemove })).toBeVisible();
        await manageMemberPage.removeTeamFromProject(teamToRemove);
        await manageMemberPage.verifyTeamRemoved(teamToRemove);
    });
});
test.describe('Module: Quản lý Sprint', () => {

    let loginPage;
    let sprintPage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        sprintPage = new SprintPage(page);

        await loginPage.goto();
        await loginPage.login('minhtrungbttv@gmail.com', '123123123');
        await expect(page).toHaveURL(/.*dashboard/);

        await sprintPage.navigateToProject('Project Priority');
        await sprintPage.gotoBacklog();
        await expect(sprintPage.createSprintButton).toBeVisible();
    });

    // TEST CASE 1: TẠO SPRINT
    test('TC_Sprint_01: Tạo Sprint mới với tên mặc định thành công', async ({ page }) => {
        await sprintPage.createSprint();        
    });

    // TEST CASE 2: CẬP NHẬT SPRINT (vẫn giữ nguyên)
    test('TC_Sprint_02: Cập nhật Sprint thành công', async ({ page }) => {
        const oldSprintName = 'PP Sprint 1';
        const newSprintData = {
            name: `Updated Sprint ${Date.now()}`,
        };

        await sprintPage.updateSprint(oldSprintName, newSprintData);
    });
    test('TC_Sprint_03: Bắt đầu Sprint ', async ({ page }) => {
        await sprintPage.startSprint('PP Sprint 3');
    });
});