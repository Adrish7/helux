#!/bin/zsh
set -e

cd -- "${0:A:h}"
npm run update:app
