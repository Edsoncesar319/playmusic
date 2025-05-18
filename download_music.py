import os
import requests
from bs4 import BeautifulSoup
import time
import re
import json

def create_music_folder():
    if not os.path.exists('musics'):
        os.makedirs('musics')

def download_music(url, filename):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        # Primeiro, obtemos a página do 4shared
        print(f"Acessando {url}...")
        session = requests.Session()
        response = session.get(url, headers=headers)
        
        if response.status_code != 200:
            raise Exception(f"Erro ao acessar a página. Status code: {response.status_code}")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Procura pelo link de download nos scripts
        download_link = None
        for script in soup.find_all('script'):
            script_text = str(script)
            if 'downloadUrl' in script_text:
                match = re.search(r'downloadUrl\s*=\s*[\'"]([^\'"]+)[\'"]', script_text)
                if match:
                    download_link = match.group(1)
                    break
        
        if not download_link:
            raise Exception("Link de download não encontrado")
        
        # Baixamos o arquivo
        print(f"Baixando {filename}...")
        response = session.get(download_link, headers=headers, stream=True)
        
        if response.status_code != 200:
            raise Exception(f"Erro ao baixar arquivo. Status code: {response.status_code}")
        
        # Salvamos o arquivo
        filepath = os.path.join('musics', filename)
        total_size = int(response.headers.get('content-length', 0))
        block_size = 8192
        downloaded = 0
        
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=block_size):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    # Mostra o progresso
                    if total_size > 0:
                        percent = int(100 * downloaded / total_size)
                        print(f"\rProgresso: {percent}%", end='')
        
        print(f"\n{filename} baixado com sucesso!")
        
        # Verifica se o arquivo foi baixado corretamente
        if os.path.getsize(filepath) == 0:
            raise Exception("Arquivo baixado está vazio")
            
        return True
    except Exception as e:
        print(f"\nErro ao baixar {filename}: {str(e)}")
        return False

def main():
    create_music_folder()
    
    # Lista de músicas para baixar
    musicas = [
        {
            'url': 'https://www.4shared.com/audio/RWy0B5enjq/Evidncias.html',
            'filename': '01 - Evidencias.mp3'
        },
        {
            'url': 'https://www.4shared.com/audio/D7d3nKL5ku/Al_online.html',
            'filename': '02 - Alo.mp3'
        }
    ]
    
    success_count = 0
    for musica in musicas:
        success = download_music(musica['url'], musica['filename'])
        if success:
            success_count += 1
            time.sleep(2)  # Espera 2 segundos entre os downloads
    
    print(f"\nDownload concluído: {success_count} de {len(musicas)} arquivos baixados com sucesso.")

if __name__ == "__main__":
    main() 