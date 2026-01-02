#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import sys
from datetime import datetime

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def update_okr(category, metric, value):
    with open('okr-2026.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    data['goals'][category]['metrics'][metric]['current'] = value
    data['lastUpdate'] = datetime.now().strftime('%Y-%m-%d')
    with open('okr-2026.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"[OK] Updated {category}.{metric} to {value}")

if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("Usage: python update_okr.py <category> <metric> <value>")
        sys.exit(1)
    category, metric, value = sys.argv[1], sys.argv[2], sys.argv[3]
    try:
        value = int(value)
    except ValueError:
        pass
    update_okr(category, metric, value)
