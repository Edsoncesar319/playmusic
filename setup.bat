@echo off
echo Instalando dependencias Python...
pip install -r requirements.txt

echo Baixando musicas...
python download_music.py

echo Iniciando o player...
start index.html

echo Processo concluido! 