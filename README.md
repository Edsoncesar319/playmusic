# Musickera - Player de Música Web

Um player de música web moderno e responsivo com suporte a upload de músicas, playlist e controles de reprodução.

## 🚀 Funcionalidades

- **Player de Música**
  - Reprodução de músicas MP3, WAV e OGG
  - Controles de play/pause, próximo/anterior
  - Barra de progresso interativa
  - Controle de volume
  - Modos de repetição (nenhum, uma música, todas)
  - Modo tela cheia

- **Playlist**
  - Lista de reprodução organizada
  - Busca de músicas
  - Upload de novas músicas
  - Visualização de capas de álbum
  - Informações de artista e álbum

- **Upload de Músicas**
  - Suporte a múltiplos arquivos
  - Barra de progresso de upload
  - Validação de tipos de arquivo
  - Tratamento de erros
  - Atualização automática da playlist

## 🛠️ Tecnologias Utilizadas

### Frontend
- HTML5
- CSS3 (com animações e gradientes)
- JavaScript (Vanilla)
- Design responsivo
- Animações CSS
- Gradientes e efeitos visuais

### Backend
- Python 3.x
- Flask (Framework web)
- Flask-CORS (Cross-Origin Resource Sharing)
- Werkzeug (Utilitários web)

## 📦 Estrutura do Projeto

```
musickera/
├── index.html          # Interface do usuário
├── server.py          # Servidor backend
├── requirements.txt   # Dependências Python
├── musics/           # Pasta de músicas
│   ├── *.mp3        # Arquivos de música
│   └── *.jpeg       # Capas de álbum
└── README.md         # Documentação
```

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone [URL_DO_REPOSITÓRIO]
cd musickera
```

2. Instale as dependências Python:
```bash
pip install -r requirements.txt
```

3. Inicie o servidor:
```bash
python server.py
```

4. Abra o arquivo `index.html` no navegador ou use um servidor local.

## 💻 Uso

### Player de Música
- Clique no botão play/pause para controlar a reprodução
- Use os botões de próximo/anterior para navegar entre músicas
- Ajuste o volume usando o controle deslizante
- Clique na barra de progresso para pular para um ponto específico
- Use o botão de repetição para alternar entre os modos de repetição
- Clique no botão de tela cheia para expandir o player

### Playlist
- Clique em uma música para reproduzi-la
- Use a barra de busca para filtrar músicas
- Clique no botão de upload para adicionar novas músicas
- As músicas são organizadas automaticamente por artista e álbum

### Upload de Músicas
- Clique no botão "Upload"
- Selecione um ou mais arquivos de música
- Aguarde o upload ser concluído
- As novas músicas aparecerão automaticamente na playlist

## 🔒 Segurança

- Validação de tipos de arquivo
- Nomes de arquivo seguros
- Permissões de arquivo configuradas
- Limite de tamanho de upload (100MB)
- CORS configurado para desenvolvimento

## 🐛 Logs e Debug

- Logs detalhados no arquivo `server.log`
- Mensagens de erro no console do navegador
- Feedback visual para erros de upload
- Status de upload em tempo real

## 📝 Notas de Desenvolvimento

### Backend (server.py)
- Servidor Flask na porta 5000
- Suporte a CORS para desenvolvimento
- Rotas para upload e listagem de músicas
- Tratamento de erros e logging
- Configuração de permissões de arquivo

### Frontend (index.html)
- Interface moderna e responsiva
- Animações suaves
- Controles de reprodução intuitivos
- Sistema de upload com feedback visual
- Busca em tempo real

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## ✨ Créditos

- Desenvolvido com ❤️ para amantes de música
- Interface inspirada em players modernos
- Animações e efeitos visuais personalizados 
