@echo off
cd /d "%~dp0"

echo Iniciando o backend Musickera em http://127.0.0.1:8000
echo Abra esse endereco no navegador. Nao use o Live Server na porta 5500.

if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" -m uvicorn backend.app:app --reload
) else (
    py -m uvicorn backend.app:app --reload
)

if errorlevel 1 (
    echo.
    echo Falha ao iniciar. Instale as dependencias com: py -m pip install -r requirements.txt
    pause
)