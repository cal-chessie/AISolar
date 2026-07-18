import http.server
import socketserver
import os
import signal
import sys

# Ignore termination signals
signal.signal(signal.SIGTERM, signal.SIG_IGN)
signal.signal(signal.SIGINT, signal.SIG_IGN)

os.chdir('/home/z/my-project/aisolar/dist')

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?')[0]
        # SPA fallback: if path doesn't have a file extension, serve index.html
        if '.' not in path.split('/')[-1] and path != '/':
            self.path = '/index.html'
        super().do_GET()
    
    def log_message(self, *args):
        pass  # suppress logs

socketserver.TCPServer.allow_reuse_address = True
try:
    with socketserver.TCPServer(("0.0.0.0", 3000), Handler) as httpd:
        httpd.serve_forever()
except Exception as e:
    sys.exit(1)
