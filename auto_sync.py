#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import sys
import subprocess
from datetime import datetime

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def update_all():
    with open('okr-2026.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    data['lastUpdate'] = datetime.now().strftime('%Y-%m-%d')
    with open('okr-2026.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("[OK] Auto-synced OKR data")

if __name__ == '__main__':
    update_all()
