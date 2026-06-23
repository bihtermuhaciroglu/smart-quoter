import sys
import os

# When running as PyInstaller bundle, adjust paths
if getattr(sys, 'frozen', False):
    bundle_dir = sys._MEIPASS
    sys.path.insert(0, bundle_dir)

import uvicorn

if __name__ == '__main__':
    port = int(os.environ.get("SMART_QUOTER_PORT", "8000"))
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=port,
        reload=False,
        log_level="warning",
    )
