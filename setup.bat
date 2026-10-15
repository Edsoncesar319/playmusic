@echo off
cd /d "%~dp0"

echo Instalando dependencias Python...
pip install -r requirements.txt

echo Baixando musicas...
python download_music.py

echo Iniciando o servidor Vercel. Acesse o endereco local exibido abaixo...
npx vercel dev

echo Processo concluido!