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
- Vercel Functions (Node.js 20+)
- Vercel Blob (`@vercel/blob`)

## 📦 Estrutura do Projeto

```
musickera/
├── index.html          # Interface do usuário
├── api/
│   ├── music.js       # Lista músicas e capas do Blob
│   └── upload.js      # Autoriza uploads diretos e limitados
├── package.json       # Dependências das funções Vercel
└── README.md         # Documentação
```

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone [URL_DO_REPOSITÓRIO]
cd musickera
```

2. Instale as dependências:
```bash
npm install
```

3. Conecte o armazenamento Blob ao projeto Vercel:
   - No painel da Vercel, abra **Storage**, selecione o Blob store e conecte-o ao projeto.
   - Habilite os ambientes que serão usados. A Vercel disponibiliza `BLOB_READ_WRITE_TOKEN` para as funções.
   - Para desenvolvimento local, use `vercel env pull .env.local` depois de instalar a CLI e vincular o projeto.

   Nunca coloque o token no HTML, no JavaScript do navegador ou no repositório.

4. Inicie o projeto localmente com a CLI da Vercel para que as rotas `/api` funcionem:
```bash
npx vercel dev
```

Em produção, publique o projeto na Vercel. Os uploads de áudio (até 100 MB) e de capas (até 10 MB) vão diretamente do navegador ao Blob; as funções mantêm o token no servidor. As faixas são listadas em `/api/music`, e uma capa pode ser enviada para a faixa selecionada. O player continua guardando uma cópia local dos áudios enviados pelo navegador.

As rotas de upload são públicas e limitam os tipos e tamanhos de arquivo; para uma biblioteca privada, adicione autenticação antes de publicar.

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

### Backend (`api/`)
- Funções serverless da Vercel para listar Blob e autorizar uploads assinados
- Token Blob mantido somente no ambiente do servidor
- Áudio e imagens públicos são associados por um identificador aleatório da faixa

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
