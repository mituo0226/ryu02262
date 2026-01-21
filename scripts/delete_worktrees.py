#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ワークツリーを削除するスクリプト
"""
import os
import shutil
import subprocess
from pathlib import Path

WORKTREE_BASE = Path(r"C:\Users\mituo\.cursor\worktrees\kaede")

def check_git_changes(worktree_path):
    """Gitの未コミット変更を確認"""
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=worktree_path,
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout.strip() != ""
    except:
        return False

def delete_worktree(worktree_path):
    """ワークツリーを削除"""
    try:
        if worktree_path.exists():
            shutil.rmtree(worktree_path, ignore_errors=True)
            return not worktree_path.exists()
        return True
    except Exception as e:
        print(f"  エラー: {e}")
        return False

def main():
    import sys
    
    # 強制削除モード（-f または --force オプション）
    force = "-f" in sys.argv or "--force" in sys.argv
    
    print("=" * 50)
    print("ワークツリー一括削除")
    if force:
        print("（強制削除モード）")
    print("=" * 50)
    print()
    
    if not WORKTREE_BASE.exists():
        print(f"ワークツリーディレクトリが見つかりません: {WORKTREE_BASE}")
        return
    
    worktrees = [d for d in WORKTREE_BASE.iterdir() 
                 if d.is_dir() and d.name != "README_WORKTREE.md"]
    
    if not worktrees:
        print("削除対象のワークツリーはありません")
        return
    
    print(f"見つかったワークツリー: {len(worktrees)}個")
    print()
    
    deleted_count = 0
    skipped_count = 0
    
    for worktree in worktrees:
        print(f"処理中: {worktree.name}")
        
        # Gitリポジトリとして有効か確認
        git_dir = worktree / ".git"
        if git_dir.exists() and not force:
            # 未コミットの変更を確認
            has_changes = check_git_changes(worktree)
            if has_changes:
                print("  [警告] 未コミットの変更があるためスキップ")
                print("  （強制削除する場合は -f オプションを使用）")
                skipped_count += 1
                continue
        
        # 削除実行
        print("  -> 削除中...")
        if delete_worktree(worktree):
            print("  [OK] 削除完了")
            deleted_count += 1
        else:
            print("  [失敗] 削除失敗")
            skipped_count += 1
    
    print()
    print("=" * 50)
    print("削除結果")
    print("=" * 50)
    print(f"削除: {deleted_count}個")
    print(f"スキップ: {skipped_count}個")
    print()
    
    if deleted_count > 0:
        print("[OK] クリーンアップが完了しました")
        print()
        print("[重要] 今後はメインプロジェクトディレクトリで作業してください:")
        print("   C:\\Users\\mituo\\Desktop\\kaede")
    elif skipped_count > 0:
        print("[警告] 未コミットの変更があるワークツリーがあります。")
        print("   メインプロジェクトに反映してから再度実行してください。")

if __name__ == "__main__":
    main()
