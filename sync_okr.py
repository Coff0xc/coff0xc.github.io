#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OKR 数据同步脚本
自动从 GitHub 获取 contributions、PR 数量、代码变更行数和用户统计
"""
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

GITHUB_USERNAME = "Coff0xc"
YEAR = 2026
OKR_FILE = Path(__file__).parent / "okr-2026.json"
PROJECTS_FILE = Path(__file__).parent / "projects.json"
GH_PATH = r"E:\Applocation\githubcli\gh.exe"

def get_gh_cmd():
    import shutil
    return 'gh' if shutil.which('gh') else GH_PATH

def get_github_contributions():
    try:
        gh = get_gh_cmd()
        query = f'query {{ user(login: "{GITHUB_USERNAME}") {{ contributionsCollection(from: "{YEAR}-01-01T00:00:00Z", to: "{YEAR}-12-31T23:59:59Z") {{ contributionCalendar {{ totalContributions }} }} }} }}'
        result = subprocess.run([gh, 'api', 'graphql', '-f', f'query={query}'], capture_output=True, text=True)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return data['data']['user']['contributionsCollection']['contributionCalendar']['totalContributions']
    except Exception as e:
        print(f"[WARN] 无法获取 contributions: {e}")
    return None

def get_github_prs():
    try:
        gh = get_gh_cmd()
        result = subprocess.run([gh, 'search', 'prs', f'--author={GITHUB_USERNAME}', f'--created={YEAR}-01-01..{YEAR}-12-31', '--json', 'number', '--limit', '1000'], capture_output=True, text=True)
        if result.returncode == 0:
            return len(json.loads(result.stdout))
    except Exception as e:
        print(f"[WARN] 无法获取 PRs: {e}")
    return None

def get_github_stats():
    """获取 GitHub 用户统计：repos、followers、stars"""
    gh = get_gh_cmd()
    try:
        result = subprocess.run([gh, 'api', f'users/{GITHUB_USERNAME}', '-q', '.public_repos, .followers'], capture_output=True, text=True)
        repos, followers = 0, 0
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            repos, followers = int(lines[0]), int(lines[1])
        result = subprocess.run([gh, 'api', f'users/{GITHUB_USERNAME}/repos?per_page=100', '-q', '[.[].stargazers_count] | add'], capture_output=True, text=True)
        stars = int(result.stdout.strip()) if result.returncode == 0 and result.stdout.strip() else 0
        return {'repos': repos, 'followers': followers, 'stars': stars}
    except Exception as e:
        print(f"[WARN] 获取 GitHub Stats 失败: {e}")
    return None

def get_github_loc():
    total_loc = 0
    gh = get_gh_cmd()
    try:
        result = subprocess.run([gh, 'repo', 'list', GITHUB_USERNAME, '--json', 'nameWithOwner', '--limit', '500'], capture_output=True, text=True)
        if result.returncode != 0:
            return None
        repos = json.loads(result.stdout)
        for repo in repos:
            repo_name = repo['nameWithOwner']
            commits_result = subprocess.run([gh, 'api', f'repos/{repo_name}/commits?author={GITHUB_USERNAME}&since={YEAR}-01-01T00:00:00Z&until={YEAR}-12-31T23:59:59Z&per_page=100', '-q', '.[].sha'], capture_output=True, text=True)
            if commits_result.returncode != 0:
                continue
            shas = [s for s in commits_result.stdout.strip().split('\n') if s]
            repo_loc = 0
            for sha in shas:
                commit_result = subprocess.run([gh, 'api', f'repos/{repo_name}/commits/{sha}', '-q', '.stats.additions + .stats.deletions'], capture_output=True, text=True)
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

def get_github_projects():
    """获取 GitHub 仓库列表作为项目数据"""
    gh = get_gh_cmd()
    try:
        result = subprocess.run([
            gh, 'repo', 'list', GITHUB_USERNAME,
            '--json', 'name,description,url,stargazerCount,primaryLanguage,updatedAt',
            '--limit', '100'
        ], capture_output=True, text=True, encoding='utf-8', errors='replace')
        if result.returncode != 0:
            return None
        repos = json.loads(result.stdout)
        # 过滤掉 .github.io 页面仓库，按星标和更新时间排序
        projects = []
        for repo in repos:
            if '.github.io' in repo['name']:
                continue
            lang = repo.get('primaryLanguage') or {}
            projects.append({
                'name': repo['name'],
                'description': repo.get('description') or '',
                'url': repo['url'],
                'stars': repo.get('stargazerCount', 0),
                'language': lang.get('name', 'Unknown'),
                'updatedAt': repo.get('updatedAt', '')
            })
        # 按星标数降序排序
        projects.sort(key=lambda x: x['stars'], reverse=True)
        return projects
    except Exception as e:
        print(f"[WARN] 获取项目列表失败: {e}")
    return None

def update_okr():
    with open(OKR_FILE, 'r', encoding='utf-8') as f:
        okr = json.load(f)
    
    contributions = get_github_contributions()
    if contributions is not None:
        okr['goals']['openSource']['metrics']['contributions']['current'] = contributions
        print(f"[SYNC] Contributions: {contributions}")
    
    prs = get_github_prs()
    if prs is not None:
        okr['goals']['openSource']['metrics']['pr']['current'] = prs
        print(f"[SYNC] PRs: {prs}")
    
    loc = get_github_loc()
    if loc is not None:
        okr['goals']['engineering']['metrics']['loc']['current'] = loc
        print(f"[SYNC] LOC: {loc:,}")
    
    stats = get_github_stats()
    if stats:
        okr['stats'] = stats
        print(f"[SYNC] Stats: {stats}")
    
    okr['lastUpdate'] = datetime.now().strftime('%Y-%m-%d')
    
    with open(OKR_FILE, 'w', encoding='utf-8') as f:
        json.dump(okr, f, indent=2, ensure_ascii=False)
    
    print(f"\n[DONE] OKR 数据已更新至 {OKR_FILE}")

def sync_projects():
    """同步项目数据到 projects.json"""
    projects = get_github_projects()
    if projects:
        with open(PROJECTS_FILE, 'w', encoding='utf-8') as f:
            json.dump({
                'lastUpdate': datetime.now().strftime('%Y-%m-%d'),
                'projects': projects
            }, f, indent=2, ensure_ascii=False)
        print(f"[SYNC] Projects: {len(projects)} 个仓库")
        print(f"[DONE] 项目数据已更新至 {PROJECTS_FILE}")
    else:
        print("[WARN] 无法获取项目数据")

if __name__ == '__main__':
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')
    update_okr()
    sync_projects()
