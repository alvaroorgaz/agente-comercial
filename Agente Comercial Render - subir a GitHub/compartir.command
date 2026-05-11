#!/bin/bash
cd "$(dirname "$0")"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  INSTORE · Generar enlace público"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Arrancar Flask si no está activo
if ! lsof -ti:5081 > /dev/null 2>&1; then
  echo "  Arrancando servidor local..."
  pip3 install -r requirements.txt -q
  python3 app.py &
  sleep 3
fi

echo "  Creando enlace público..."
echo "  (espera unos segundos)"
echo ""

# Túnel SSH a localhost.run – captura la URL y la copia al portapapeles
ssh -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=30 \
    -R 80:localhost:5081 nokey@localhost.run 2>&1 | while IFS= read -r line; do
  if echo "$line" | grep -q "lhr.life"; then
    BASE=$(echo "$line" | grep -o 'https://[^[:space:]]*lhr\.life')
    if [ -n "$BASE" ]; then
      LINK="${BASE}/ecom/kpiscomercial"
      clear
      echo ""
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "  INSTORE · Enlace listo"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo ""
      echo "  ✓  $LINK"
      echo ""
      echo "  Cópialo y pégalo en el correo."
      echo "  El enlace copiado también en el portapapeles."
      echo ""
      echo "  ⚠  Funciona mientras esta ventana esté abierta."
      echo "     Ciérrala para desactivar el enlace."
      echo ""
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "$LINK" | pbcopy
    fi
  fi
done
