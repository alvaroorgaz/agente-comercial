#!/bin/bash
cd "$(dirname "$0")"
echo "Instalando dependencias..."
pip3 install -r requirements.txt -q
echo "Iniciando Agente Comercial..."
python3 app.py
