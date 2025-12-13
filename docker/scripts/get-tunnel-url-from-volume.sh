#!/bin/bash

# Script para ler a URL do túnel do volume compartilhado

VOLUME_FILE="/shared/tunnel-url.txt"

if [ -f "$VOLUME_FILE" ]; then
  cat "$VOLUME_FILE"
else
  echo "URL ainda não disponível"
  exit 1
fi

