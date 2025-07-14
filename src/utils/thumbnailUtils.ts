import html2canvas from 'html2canvas';
import { storage, rtdb } from '../config/firebase';
import { ref as storageRef, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { ref as dbRef, set, get } from 'firebase/database';

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  scale?: number;
  backgroundColor?: string;
}

/**
 * ボード全体のサムネイル画像を生成
 */
export async function generateBoardThumbnail(
  boardElement: HTMLElement,
  options: ThumbnailOptions = {}
): Promise<string | null> {
  try {
    console.log('🎯 Starting thumbnail generation for board element:', boardElement);
    if (!boardElement) {
      console.error('❌ Board element is null');
      return null;
    }

    const thumbnailWidth = options.width || 1000;
    const thumbnailHeight = options.height || 750;

    // 一時的に付箋の選択状態を削除
    const noteElements = boardElement.querySelectorAll('.sticky-note');
    const elementStates = Array.from(noteElements).map(element => ({
      element: element as HTMLElement,
      wasSelected: element.classList.contains('selected'),
      wasActive: element.classList.contains('active')
    }));

    elementStates.forEach(({ element, wasSelected, wasActive }) => {
      if (wasSelected) element.classList.remove('selected');
      if (wasActive) element.classList.remove('active');
    });

    // 一時的にFABボタンを非表示にする
    const fabButton = document.querySelector('.fab-add-btn') as HTMLElement;
    const fabWasVisible = fabButton && fabButton.style.display !== 'none';
    if (fabButton) {
      fabButton.style.display = 'none';
    }

    try {
      console.log('📷 Capturing board with html2canvas...');
      console.log('Board dimensions:', {
        scrollWidth: boardElement.scrollWidth,
        scrollHeight: boardElement.scrollHeight,
        clientWidth: boardElement.clientWidth,
        clientHeight: boardElement.clientHeight
      });

      // ボードの左上1000pxをキャプチャ
      const canvas = await html2canvas(boardElement, {
        backgroundColor: options.backgroundColor || '#f5f5f5',
        scale: options.scale || 1,
        useCORS: true,
        allowTaint: true,
        logging: true,
        width: 1000,
        height: 1000,
        x: 0,
        y: 0,
      } as any);

      console.log('✅ Canvas generated:', {
        width: canvas.width,
        height: canvas.height
      });

      // サムネイルサイズにリサイズ
      const thumbnailCanvas = document.createElement('canvas');
      thumbnailCanvas.width = thumbnailWidth;
      thumbnailCanvas.height = thumbnailHeight;
      
      const ctx = thumbnailCanvas.getContext('2d');
      if (!ctx) return null;

      // 背景色を設定
      ctx.fillStyle = options.backgroundColor || '#f5f5f5';
      ctx.fillRect(0, 0, thumbnailWidth, thumbnailHeight);

      // アスペクト比を保持してリサイズ
      const sourceAspect = canvas.width / canvas.height;
      const targetAspect = thumbnailWidth / thumbnailHeight;

      let drawWidth, drawHeight, drawX, drawY;

      if (sourceAspect > targetAspect) {
        // 幅に合わせる
        drawWidth = thumbnailWidth;
        drawHeight = thumbnailWidth / sourceAspect;
        drawX = 0;
        drawY = (thumbnailHeight - drawHeight) / 2;
      } else {
        // 高さに合わせる
        drawHeight = thumbnailHeight;
        drawWidth = thumbnailHeight * sourceAspect;
        drawX = (thumbnailWidth - drawWidth) / 2;
        drawY = 0;
      }

      ctx.drawImage(canvas, drawX, drawY, drawWidth, drawHeight);

      const dataUrl = thumbnailCanvas.toDataURL('image/png');
      console.log('🖼️ Thumbnail generated:', {
        dataUrlLength: dataUrl.length,
        thumbnailSize: `${thumbnailWidth}x${thumbnailHeight}`
      });

      return dataUrl;
    } finally {
      // クラスを元に戻す
      elementStates.forEach(({ element, wasSelected, wasActive }) => {
        if (wasSelected) element.classList.add('selected');
        if (wasActive) element.classList.add('active');
      });
      
      // FABボタンの表示を元に戻す
      if (fabButton && fabWasVisible) {
        fabButton.style.display = '';
      }
    }
  } catch (error) {
    return null;
  }
}

/**
 * ボードサムネイルをFirebase Storageに保存
 */
export async function saveBoardThumbnail(
  boardId: string,
  thumbnailDataUrl: string
): Promise<boolean> {
  try {
    console.log('💾 Starting thumbnail save for board:', boardId);
    console.log('Data URL length:', thumbnailDataUrl.length);

    // Firebase Storageに画像を保存
    const thumbnailRef = storageRef(storage, `thumbnails/${boardId}.png`);
    console.log('📁 Storage ref created:', `thumbnails/${boardId}.png`);
    
    // Data URLからbase64部分を抽出
    const base64Data = thumbnailDataUrl.split(',')[1];
    console.log('🔄 Uploading to Firebase Storage...');
    
    await uploadString(thumbnailRef, base64Data, 'base64', {
      contentType: 'image/png'
    });
    console.log('✅ Upload to Storage completed');

    // ダウンロードURLを取得
    console.log('🔗 Getting download URL...');
    const downloadURL = await getDownloadURL(thumbnailRef);
    console.log('✅ Download URL obtained:', downloadURL);

    // Realtime DatabaseにURLを保存
    console.log('💽 Saving URL to Realtime Database...');
    const boardThumbnailRef = dbRef(rtdb, `boardThumbnails/${boardId}`);
    await set(boardThumbnailRef, {
      url: downloadURL,
      updatedAt: Date.now()
    });
    console.log('✅ Thumbnail saved successfully');

    return true;
  } catch (error) {
    console.error('❌ Error saving board thumbnail:', error);
    return false;
  }
}

/**
 * ボードサムネイルURLを取得
 */
export async function getBoardThumbnail(boardId: string): Promise<string | null> {
  try {
    console.log('🔍 Getting thumbnail for board:', boardId);
    const boardThumbnailRef = dbRef(rtdb, `boardThumbnails/${boardId}`);
    const snapshot = await get(boardThumbnailRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('✅ Thumbnail found:', data.url);
      return data.url;
    }
    
    console.log('❌ No thumbnail found for board:', boardId);
    return null;
  } catch (error) {
    console.error('❌ Error getting thumbnail:', error);
    return null;
  }
}

/**
 * ボードサムネイルを削除
 */
export async function deleteBoardThumbnail(boardId: string): Promise<void> {
  try {
    // Storage から画像を削除
    const thumbnailRef = storageRef(storage, `thumbnails/${boardId}.png`);
    await deleteObject(thumbnailRef);

    // Database からURLを削除
    const boardThumbnailRef = dbRef(rtdb, `boardThumbnails/${boardId}`);
    await set(boardThumbnailRef, null);
  } catch (error) {
    // Silent fail - 画像が存在しない場合もあるため
  }
}