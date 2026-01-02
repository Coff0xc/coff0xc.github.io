#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OKR 数据同步脚本
自动从 GitHub 获取 contributions、PR 数量和代码变更行数
"""
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# 配置
GITHUB_USERNAME = "Coff0xc"
YEAR = 2026
OKR_FILE = Path(__file__).parent / "okr-2026.json"
GH_PATH = r"E:\Applocation\githubcli\gh.exe"  # Windows 本地路径，GitHub Actions 会用 'gh'

def get_gh_cmd():
    """获取 gh 命令路径"""
    import shutil
    if shutil.which('gh'):
        return 'gh'
    return GH_PATH

def get_github_contributions():
    """通过 GitHub CLI 获取年度贡献数（需要安装 gh）"""
    try:
        gh = get_gh_cmd()
        query = f'''query {{ user(login: "{GITHUB_USERNAME}") {{ contributionsCollection(from: "{YEAR}-01-01T00:00:00Z", to: "{YEAR}-12-31T23:59:59Z") {{ contributionCalendar {{ totalContributions }} }} }} }}'''
        result = subprocess.run(
            [gh, 'api', 'graphql', '-f', f'query={query}'],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return data['data']['user']['contributionsCollection']['contributionCalendar']['totalContributions']
    except Exception as e:
        print(f"[WARN] 无法通过 gh 获取 contributions: {e}")
    return None

def get_github_prs():
    """通过 GitHub CLI 获取年度 PR 数量"""
    try:
        gh = get_gh_cmd()
        result = subprocess.run(
            [gh, 'search', 'prs', f'--author={GITHUB_USERNAME}',
             f'--created={YEAR}-01-01..{YEAR}-12-31', '--json', 'number', '--limit', '1000'],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            prs = json.loads(result.stdout)
            return len(prs)
    except Exception as e:
        print(f"[WARN] 无法通过 gh 获取 PRs: {e}")
    return None

def get_github_loc():
    """统计 GitHub 所有仓库的代码变更行数 (additions + deletions)"""
    total_loc = 0
    gh = get_gh_cmd()
    try:
        # 获取用户所有仓库
        result = subprocess.run(
            [gh, 'repo', 'list', GITHUB_USERNAME, '--json', 'nameWithOwner', '--limit', '500'],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            print(f"[WARN] 无法获取仓库列表")
            return None

        repos = json.loads(result.stdout)
        start_date = f"{YEAR}-01-01"
        end_date = f"{YEAR}-12-31"

        for repo in repos:
            repo_name = repo['nameWithOwner']
            # 获取该仓库中用户的 commits
            commits_result = subprocess.run(
                [gh, 'api', f'repos/{repo_name}/commits?author={GITHUB_USERNAME}&since={start_date}T00:00:00Z&until={end_date}T23:59:59Z&per_page=100',
                 '-q', '.[].sha'],
                capture_output=True, text=True
            )
            if commits_result.returncode != 0:
                continue

            shas = [s for s in commits_result.stdout.strip().split('\n') if s]
            repo_loc = 0
            for sha in shas:
                commit_result = subprocess.run(
                    [gh, 'api', f'repos/{repo_name}/commits/{sha}',
                     '-q', '.stats.additions + .stats.deletions'],
                    capture_output=True, text=True
                )
                if commit_result.returncode == 0 and commit_result.stdout.strip():
                    try:
                        repo_loc += int(commit_result.stdout.strip())
                    except ValueError:
                        pass

            if repo_loc > 0:
                print(f"[OK] {repo_name}: {repo_loc:,} 行")
                total_loc += repo_loc

    except Exception as e:
        print(f"[WARN] 统计 LOC 失败: {e}")
        return None

    return total_loc if total_loc > 0 else None

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
    
    # 统计 GitHub 代码变更行数
    loc = get_github_loc()
    if loc is not None:
        okr['goals']['engineering']['metrics']['loc']['current'] = loc
        print(f"[SYNC] LOC: {loc:,}")
    
    # 更新时间戳
    okr['lastUpdate'] = datetime.now().strftime('%Y-%m-%d')
    
    with open(OKR_FILE, 'w', encoding='utf-8') as f:
        json.dump(okr, f, indent=2, ensure_ascii=False)
    
    print(f"\n[DONE] OKR 数据已更新至 {OKR_FILE}")

if __name__ == '__main__':
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')
    update_okr()
