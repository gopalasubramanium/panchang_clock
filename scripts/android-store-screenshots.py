"""Validate the native Android app, then retain genuine emulator store captures."""
import runpy, shutil
from pathlib import Path
runpy.run_path('scripts/android-native-tests.py',run_name='__main__')
source=Path('test-results/android-native');dest=Path('store-release/android-screenshots');dest.mkdir(parents=True,exist_ok=True)
for file in source.iterdir():
    if file.suffix in {'.png','.xml','.json','.txt'}:shutil.copy2(file,dest/file.name)
