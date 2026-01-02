#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('okr-2026.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"\n=== 2026 OKR Progress (Updated: {data['lastUpdate']}) ===\n")

for key, goal in data['goals'].items():
    print(f"[{goal['title']}]")
    for metric_key, metric in goal['metrics'].items():
        current = metric['current']
        target = metric['target']
        if isinstance(target, int):
            progress = (current / target * 100) if target > 0 else 0
            print(f"  {metric_key}: {current:,} / {target:,} ({progress:.1f}%)")
        else:
            print(f"  {metric_key}: {current} / {target}")
    print()
