import json
from pathlib import Path

CATALOG_PATH = Path(__file__).with_suffix('.json')


def read_catalog():
    return json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
