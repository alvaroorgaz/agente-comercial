import sys
import os

# Ruta a tu proyecto en PythonAnywhere
path = '/home/TUUSUARIO/comercial-agent'
if path not in sys.path:
    sys.path.insert(0, path)

# Importar la app Flask
from app import app as application
