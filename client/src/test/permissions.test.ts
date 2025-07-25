import { describe, it, expect } from "vitest";
import {
  checkProjectMembership,
  getUserRole,
  isProjectOwner,
  checkBoardAccess,
  checkBoardEditPermission,
  checkProjectEditPermission,
  checkMemberManagementPermission,
  checkProjectDeletePermission,
} from "../utils/permissions";
import { Project, Board } from "../types";

// テスト用のモックデータ
const mockProject: Project = {
  id: "project1",
  name: "Test Project",
  slug: "slug",
  createdBy: "owner1",
  createdAt: Date.now(),
  isPublic: false,
  members: {
    owner1: {
      role: "owner",
      displayName: "Owner User",
      email: "owner@test.com",
      joinedAt: Date.now(),
    },
    admin1: {
      role: "admin",
      displayName: "Admin User",
      email: "admin@test.com",
      joinedAt: Date.now(),
    },
    member1: {
      role: "member",
      displayName: "Member User",
      email: "member@test.com",
      joinedAt: Date.now(),
    },
  },
};

const mockPublicProject: Project = {
  ...mockProject,
  isPublic: true,
};

const mockBoard: Board = {
  id: "board1",
  name: "Test Board",
  createdBy: "owner1",
  createdAt: Date.now(),
  projectId: "project1",
};

describe("権限チェック機能", () => {
  describe("プロジェクトメンバーシップ", () => {
    it("プロジェクトメンバーを正しく識別する", () => {
      expect(checkProjectMembership(mockProject, "owner1")).toBe(true);
      expect(checkProjectMembership(mockProject, "member1")).toBe(true);
      expect(checkProjectMembership(mockProject, "nonmember")).toBe(false);
    });

    it("プロジェクトがnullの場合はfalseを返す", () => {
      expect(checkProjectMembership(null, "owner1")).toBe(false);
    });

    it("メンバーが存在しないプロジェクトではfalseを返す", () => {
      const emptyProject = { ...mockProject, members: {} };
      expect(checkProjectMembership(emptyProject, "owner1")).toBe(false);
    });
  });

  describe("ユーザー役割の取得", () => {
    it("オーナーの役割を正しく取得する", () => {
      expect(getUserRole(mockProject, "owner1")).toBe("owner");
    });

    it("メンバーの役割を正しく取得する", () => {
      expect(getUserRole(mockProject, "member1")).toBe("member");
    });

    it("非メンバーの場合はnullを返す", () => {
      expect(getUserRole(mockProject, "nonmember")).toBe(null);
    });

    it("プロジェクトがnullの場合はnullを返す", () => {
      expect(getUserRole(null, "owner1")).toBe(null);
    });
  });

  describe("プロジェクトオーナーチェック", () => {
    it("オーナーを正しく識別する", () => {
      expect(isProjectOwner(mockProject, "owner1")).toBe(true);
    });

    it("メンバーはオーナーではない", () => {
      expect(isProjectOwner(mockProject, "member1")).toBe(false);
    });

    it("非メンバーはオーナーではない", () => {
      expect(isProjectOwner(mockProject, "nonmember")).toBe(false);
    });
  });

  describe("ボードアクセス権限", () => {
    it("パブリックプロジェクトのボードは誰でもアクセス可能", () => {
      const result = checkBoardAccess(
        mockBoard,
        mockPublicProject,
        "nonmember"
      );
      expect(result.hasAccess).toBe(true);
    });

    it("プライベートプロジェクトのボードはプロジェクトメンバーのみアクセス可能", () => {
      // メンバーのアクセス
      const memberResult = checkBoardAccess(mockBoard, mockProject, "member1");
      expect(memberResult.hasAccess).toBe(true);

      // 非メンバーのアクセス
      const nonMemberResult = checkBoardAccess(
        mockBoard,
        mockProject,
        "nonmember"
      );
      expect(nonMemberResult.hasAccess).toBe(false);
      expect(nonMemberResult.reason).toBe("Not a project member");
    });

    it("ボードがnullの場合はアクセス拒否", () => {
      const result = checkBoardAccess(null, mockProject, "owner1");
      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe("Board not found");
    });

    it("プロジェクトがnullの場合はアクセス拒否", () => {
      const result = checkBoardAccess(mockBoard, null, "owner1");
      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe("Project not found");
    });
  });

  describe("ボード編集権限", () => {
    it("パブリックプロジェクトでもメンバーのみ編集可能", () => {
      // メンバーの編集
      const memberResult = checkBoardEditPermission(
        mockBoard,
        mockPublicProject,
        "member1"
      );
      expect(memberResult.canEdit).toBe(true);

      // 非メンバーの編集
      const nonMemberResult = checkBoardEditPermission(
        mockBoard,
        mockPublicProject,
        "nonmember"
      );
      expect(nonMemberResult.canEdit).toBe(false);
      expect(nonMemberResult.reason).toBe("Not a project member");
    });

    it("プライベートプロジェクトはプロジェクトメンバーのみ編集可能", () => {
      // メンバーの編集
      const memberResult = checkBoardEditPermission(
        mockBoard,
        mockProject,
        "member1"
      );
      expect(memberResult.canEdit).toBe(true);

      // 非メンバーの編集
      const nonMemberResult = checkBoardEditPermission(
        mockBoard,
        mockProject,
        "nonmember"
      );
      expect(nonMemberResult.canEdit).toBe(false);
      expect(nonMemberResult.reason).toBe("Not a project member");
    });
  });

  describe("プロジェクト編集権限", () => {
    it("オーナーはプロジェクト設定を編集可能", () => {
      const result = checkProjectEditPermission(mockProject, "owner1");
      expect(result.canEdit).toBe(true);
    });

    it("管理者はプロジェクト設定を編集可能", () => {
      const result = checkProjectEditPermission(mockProject, "admin1");
      expect(result.canEdit).toBe(true);
    });

    it("メンバーはプロジェクト設定を編集不可", () => {
      const result = checkProjectEditPermission(mockProject, "member1");
      expect(result.canEdit).toBe(false);
      expect(result.reason).toBe("Admin privileges required");
    });

    it("非メンバーはプロジェクト設定を編集不可", () => {
      const result = checkProjectEditPermission(mockProject, "nonmember");
      expect(result.canEdit).toBe(false);
      expect(result.reason).toBe("Not a project member");
    });
  });

  describe("メンバー管理権限", () => {
    it("オーナーはメンバーを管理可能", () => {
      const result = checkMemberManagementPermission(mockProject, "owner1");
      expect(result.canManage).toBe(true);
    });

    it("メンバーはメンバー管理不可", () => {
      const result = checkMemberManagementPermission(mockProject, "member1");
      expect(result.canManage).toBe(false);
      expect(result.reason).toBe("Only owners can manage members");
    });

    it("非メンバーはメンバー管理不可", () => {
      const result = checkMemberManagementPermission(mockProject, "nonmember");
      expect(result.canManage).toBe(false);
      expect(result.reason).toBe("Not a project member");
    });
  });

  describe("プロジェクト削除権限", () => {
    it("プロジェクト作成者は削除可能", () => {
      const result = checkProjectDeletePermission(mockProject, "owner1");
      expect(result.canDelete).toBe(true);
    });

    it("オーナーでも作成者でなければ削除不可", () => {
      const projectWithDifferentCreator = {
        ...mockProject,
        createdBy: "different-creator",
      };
      const result = checkProjectDeletePermission(
        projectWithDifferentCreator,
        "owner1"
      );
      expect(result.canDelete).toBe(false);
      expect(result.reason).toBe("Only project creator can delete");
    });

    it("メンバーは削除不可", () => {
      const result = checkProjectDeletePermission(mockProject, "member1");
      expect(result.canDelete).toBe(false);
      expect(result.reason).toBe("Only project creator can delete");
    });

    it("プロジェクトがnullの場合は削除不可", () => {
      const result = checkProjectDeletePermission(null, "owner1");
      expect(result.canDelete).toBe(false);
      expect(result.reason).toBe("Project not found");
    });
  });

  describe("エッジケース", () => {
    it("メンバーリストが未定義のプロジェクトを処理", () => {
      const projectWithoutMembers = {
        ...mockProject,
        members: undefined as any,
      };
      expect(checkProjectMembership(projectWithoutMembers, "owner1")).toBe(
        false
      );
      expect(getUserRole(projectWithoutMembers, "owner1")).toBe(null);
    });

    it("プロジェクトIDが設定されていないボード", () => {
      const boardWithoutProject = {
        ...mockBoard,
        projectId: "",
      };
      const result = checkBoardAccess(boardWithoutProject, null, "owner1");
      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe("Project not found");
    });
  });
});
