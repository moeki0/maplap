import React, { useState, useEffect } from "react";
import { getBoardInfo } from "../utils/boardInfo";
import { getBoardThumbnail } from "../utils/thumbnailGenerator";

interface ThumbnailImageProps {
  boardName: string;
  projectId: string;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}

/**
 * [pageTitle.img]記法で他のボードのサムネイル画像を表示するコンポーネント
 */
export const ThumbnailImage: React.FC<ThumbnailImageProps> = ({
  boardName,
  projectId,
  className = "",
  alt,
  style,
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchThumbnail = async () => {
      try {
        setLoading(true);
        setError(null);

        // インデックスから効率的に検索
        const { getBoardIdByTitle } = await import("../utils/boardTitleIndex");
        const targetBoardId = await getBoardIdByTitle(projectId, boardName);

        if (!targetBoardId) {
          throw new Error(`ボード "${boardName}" が見つかりません`);
        }

        // サムネイルを取得
        let thumbnail = null;

        // 手動保存されたサムネイルを最初にチェック
        thumbnail = await getBoardThumbnail(targetBoardId);

        if (!thumbnail) {
          // 手動保存サムネイルがない場合は、ボード情報からサムネイルを取得
          const boardInfo = await getBoardInfo(targetBoardId);
          thumbnail = boardInfo.thumbnailUrl;
        }

        if (!thumbnail) {
          throw new Error(`ボード "${boardName}" のサムネイルが見つかりません`);
        }

        setThumbnailUrl(thumbnail);
      } catch (err) {
        console.error("サムネイル取得エラー:", err);
        setError(
          err instanceof Error ? err.message : "サムネイル取得に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchThumbnail();
  }, [boardName, projectId]);

  if (loading) {
    const defaultStyle = { width: "100px", height: "auto" };
    const finalStyle = { ...defaultStyle, ...style };
    return (
      <div
        className={`inline-block bg-gray-200 animate-pulse rounded ${className}`}
        style={finalStyle}
      >
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          読み込み中...
        </div>
      </div>
    );
  }

  if (error) {
    const defaultStyle = { width: "100px", height: "auto" };
    const finalStyle = { ...defaultStyle, ...style };
    return (
      <div
        className={`inline-block bg-red-50 border border-red-200 rounded p-2 ${className}`}
        style={finalStyle}
      >
        <div className="flex items-center justify-center h-full text-red-500 text-sm text-center">
          {error}
        </div>
      </div>
    );
  }

  if (!thumbnailUrl) {
    const defaultStyle = { width: "100px", height: "auto" };
    const finalStyle = { ...defaultStyle, ...style };
    return (
      <div
        className={`inline-block bg-gray-100 border border-gray-200 rounded p-2 ${className}`}
        style={finalStyle}
      >
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          サムネイルなし
        </div>
      </div>
    );
  }

  const defaultStyle = { maxWidth: "100px", maxHeight: "auto" };
  const finalStyle = { ...defaultStyle, ...style, pointerEvents: "none" };

  return (
    <img
      src={thumbnailUrl}
      alt={alt || `${boardName}のサムネイル`}
      className={`inline-block rounded shadow-sm ${className}`}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={finalStyle as any}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onError={() => setError("画像の読み込みに失敗しました")}
    />
  );
};
