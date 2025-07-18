import { rtdb } from '../config/firebase';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { getBoardIdByTitle } from './boardTitleIndex';
import { getProjectIdBySlug } from './projectSlugIndex';

/**
 * Resolves a project slug to its ID by searching all projects
 */
export async function resolveProjectSlug(projectSlug: string): Promise<string | null> {
  try {
    // First try the index for fast lookup
    const projectIdFromIndex = await getProjectIdBySlug(projectSlug);
    if (projectIdFromIndex) {
      return projectIdFromIndex;
    }
    
    // Fallback to query (for projects without index)
    const projectsRef = ref(rtdb, 'projects');
    const projectQuery = query(projectsRef, orderByChild('slug'), equalTo(projectSlug));
    const snapshot = await get(projectQuery);
    
    if (snapshot.exists()) {
      const projects = snapshot.val();
      const projectId = Object.keys(projects)[0];
      return projectId;
    }
    
    return null;
  } catch (error) {
    console.error('Error resolving project slug:', error);
    return null;
  }
}

/**
 * Resolves a board name to its ID within a specific project
 */
export async function resolveBoardName(projectId: string, boardName: string): Promise<string | null> {
  try {
    // Use title index for fast lookup
    const boardId = await getBoardIdByTitle(projectId, boardName);
    if (boardId) {
      return boardId;
    }
    
    // Fallback: get all boards for the project (for boards without index)
    const projectBoardsRef = ref(rtdb, `projectBoards/${projectId}`);
    const projectBoardsSnapshot = await get(projectBoardsRef);
    
    if (!projectBoardsSnapshot.exists()) {
      return null;
    }
    
    const projectBoardsData = projectBoardsSnapshot.val();
    
    // Check each board name directly from projectBoards data
    for (const [boardId, boardData] of Object.entries(projectBoardsData)) {
      if ((boardData as any).name === boardName) {
        return boardId;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error resolving board name:', error);
    return null;
  }
}

/**
 * Resolves both project slug and board name to their respective IDs
 */
export async function resolveProjectAndBoardSlugs(
  projectSlug: string,
  boardName: string
): Promise<{ projectId: string | null; boardId: string | null }> {
  try {
    const projectId = await resolveProjectSlug(projectSlug);
    if (!projectId) {
      return { projectId: null, boardId: null };
    }
    
    const boardId = await resolveBoardName(projectId, boardName);
    return { projectId, boardId };
  } catch (error) {
    console.error('Error resolving project slug and board name:', error);
    return { projectId: null, boardId: null };
  }
}

/**
 * Resolves a project ID to its slug
 */
export async function resolveProjectIdToSlug(projectId: string): Promise<string | null> {
  try {
    const projectRef = ref(rtdb, `projects/${projectId}/slug`);
    const snapshot = await get(projectRef);
    
    if (snapshot.exists()) {
      const slug = snapshot.val();
      // 空文字列の場合はnullを返す
      return slug && slug.trim() !== '' ? slug : null;
    }
    
    return null;
  } catch (error) {
    console.error('Error resolving project ID to slug:', error);
    return null;
  }
}