#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OKR 数据同步脚本
自动从 GitHub 获取 contributions 和 PR 数量，并统计本地代码行数
"""
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# 配置
GITHUB_USERNAME = "Coff0xc"
YEAR = 2026
OKR_FILE = Path(__file__).parent / "okr-2026.json"

# 本地仓库路径（用于统计代码行数，请填写你自己的路径）
LOCAL_REPOS = [
    # r"E:\workplace\AutoRedTeam-Orchestrator",
    # r"E:\workplace\Github-API-scan",
    # r"E:\workplace\Hexstrike-ai-6.2",
    # r"E:\workplace\LLM-Security-Assessment-Framework",
    # 添加更多本地仓库路径...
]

def get_github_contributions():
    """通过 GitHub CLI 获取年度贡献数（需要安装 gh）"""
    try:
        # 使用 gh api 查询
        cmd = f'gh api graphql -f query="query {{ user(login: \\"{GITHUB_USERNAME}\\") {{ contributionsCollection(from: \\"{YEAR}-01-01T00:00:00Z\\", to: \\"{YEAR}-12-31T23:59:59Z\\") {{ contributionCalendar {{ totalContributions }} }} }} }}"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return data['data']['user']['contributionsCollection']['contributionCalendar']['totalContributions']
    except Exception as e:
        print(f"[WARN] 无法通过 gh 获取 contributions: {e}")
    return None

def get_github_prs():
    """通过 GitHub CLI 获取年度 PR 数量"""
    try:
        cmd = f'gh search prs --author={GITHUB_USERNAME} --created={YEAR}-01-01..{YEAR}-12-31 --json number --limit 1000'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            prs = json.loads(result.stdout)
            return len(prs)
    except Exception as e:
        print(f"[WARN] 无法通过 gh 获取 PRs: {e}")
    return None

def count_lines_of_code(repo_paths):
    """统计本地仓库代码行数（需要安装 cloc 或 tokei）"""
    total_loc = 0
    for repo in repo_paths:
        if not os.path.exists(repo):
            print(f"[SKIP] 路径不存在: {repo}")
            continue
        try:
            # 尝试使用 cloc
            result = subprocess.run(
                ['cloc', '--json', '--quiet', repo],
                capture_output=True, text=True
            )
            if result.returncode == 0:
                data = json.loads(result.stdout)
                if 'SUM' in data:
                    total_loc += data['SUM']['code']
                    print(f"[OK] {repo}: {data['SUM']['code']} 行")
        except FileNotFoundError:
            print("[INFO] 未安装 cloc，请运行: pip install cloc 或 choco install cloc")
            break
    return total_loc

def update_okr():
    """更新 OKR JSON 文件"""
    with open(OKR_FILE, 'r', encoding='utf-8') as f:
        okr = json.load(f)
    
    # 更新 GitHub 数据
    contributions = get_github_contributions()
    if contributions is not None:
        okr['goals']['openSource']['metrics']['contributions']['current'] = contributions
        print(f"[SYNC] Contributions: {contributions}")
    
    prs = get_github_prs()
    if prs is not None:
        okr['goals']['openSource']['metrics']['pr']['current'] = prs
        print(f"[SYNC] PRs: {prs}")
    
    # 统计代码行数
    if LOCAL_REPOS:
        loc = count_lines_of_code(LOCAL_REPOS)
        if loc > 0:
            okr['goals']['engineering']['metrics']['loc']['current'] = loc
            print(f"[SYNC] LOC: {loc}")
    
    # 更新时间戳
    okr['lastUpdate'] = datetime.now().strftime('%Y-%m-%d')
    
    with open(OKR_FILE, 'w', encoding='utf-8') as f:
        json.dump(okr, f, indent=2, ensure_ascii=False)
    
    print(f"\n[DONE] OKR 数据已更新至 {OKR_FILE}")

if __name__ == '__main__':
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')
    update_okr()
