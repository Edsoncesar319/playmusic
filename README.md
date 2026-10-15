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

- **Contas**
  - Cadastro e login com sessão segura
  - Edição de nome, e-mail e senha
  - Exclusão da própria conta
  - Biblioteca e uploads disponíveis apenas para usuários autenticados

## 🛠️ Tecnologias Utilizadas

### Frontend
- HTML5
- CSS3 (com animações e gradientes)
- JavaScript (Vanilla)
- Material Symbols Rounded para os ícones da interface
- Design responsivo
- Animações CSS
- Gradientes e efeitos visuais

### Backend
- FastAPI (Python), SQLite e armazenamento local para execução integrada
- Vercel Functions (Node.js 24.x) e Vercel Blob para a implantação Vercel existente

## 📦 Estrutura do Projeto

```
musickera/
├── index.html          # Player e gestão da conta
├── login.html          # Login e cadastro
├── api/
│   ├── music.js       # Lista músicas e capas do Blob
│   ├── upload.js      # Autoriza uploads diretos e limitados
│   └── auth/          # Cadastro, login, sessão e gestão da própria conta
├── backend/
│   └── app.py         # API FastAPI compatível com a interface e execução local
├── database/
│   └── schema.sql     # Tabelas de usuários e sessões do Neon
├── lib/               # Acesso ao Neon e utilitários de autenticação
├── package.json       # Dependências das funções Vercel
└── README.md         # Documentação
```

## 🔧 Instalação e execução

1. Clone o repositório:
```bash
git clone [URL_DO_REPOSITÓRIO]
cd musickera
```

2. Para executar localmente com o backend Python, instale as dependências:
```bash
py -m pip install -r requirements.txt
```

3. Inicie o backend, que também serve o player e a tela de login:
```bash
py -m uvicorn backend.app:app --reload
```
Abra http://127.0.0.1:8000. Para verificar se a API está ativa, acesse http://127.0.0.1:8000/api/health. Se o comando `py` não estiver disponível, use `python` no lugar dele.

O arquivo `setup.bat` também inicia esse backend. Abra a aplicação em `http://127.0.0.1:8000`; a tela de entrar/criar conta fica em `http://127.0.0.1:8000/login`. Após autenticar, a aplicação retorna ao player em `/`. Não use o Live Server, pois ele serve a página em outra porta e as chamadas `/api` não chegam ao backend.

O backend Python implementa as rotas `/api/auth/*`, `/api/music`, `/api/music/{track_id}` (edição e exclusão) e `/api/upload`, com sessões autenticadas e limites de 100 MB para áudio e 10 MB para capas. O banco SQLite e os arquivos enviados ficam em `data/`; defina `MUSICKERA_DATA_DIR` para escolher outro diretório. As faixas são servidas pelo próprio backend em `/media/`. Esses dados locais não são sincronizados com a implantação Vercel.

Execute os testes do backend com:
```bash
py -m unittest backend.test_app
```

### Implantação existente com Node.js e Vercel

Para executar ou publicar o backend Node.js existente, instale as dependências:
```bash
npm install
```

Crie um banco PostgreSQL no Neon e execute [`database/schema.sql`](./database/schema.sql) no SQL Editor do Neon. Configure no painel da Vercel:

- `DATABASE_URL`: connection string do Neon, de preferência a pooled connection string.
- `BLOB_READ_WRITE_TOKEN`: token do armazenamento Vercel Blob.

Para desenvolvimento local, defina essas variáveis no `.env.local` ou use `vercel env pull .env.local`. Nunca coloque credenciais no HTML, no JavaScript do navegador ou no repositório.

Conecte o armazenamento Blob ao projeto Vercel em **Storage** e habilite os ambientes necessários.

Para executar localmente com Neon e Blob, inicie pela CLI:
```bash
npx vercel dev
```
Abra o endereço local exibido pela CLI. O script `setup.bat` também inicia o servidor da Vercel.

Em produção, publique o projeto na Vercel. Cada conta pode consultar e enviar arquivos para a biblioteca compartilhada; os endpoints de listagem e upload exigem uma sessão válida. Os uploads de áudio (até 100 MB) e de capas (até 10 MB) vão diretamente do navegador ao Blob; as funções mantêm o token no servidor. O player também mantém uma cópia local dos áudios no navegador, separada por conta.

O Vercel Blob deste projeto usa arquivos públicos. A autenticação protege a listagem e a autorização de novos uploads, mas um URL público de arquivo já compartilhado pode ser aberto por qualquer pessoa que o possua. O backend Python local serve os arquivos pelo próprio servidor e não os envia ao Blob.

Os cookies de sessão são `HttpOnly`, `Secure` e `SameSite=Lax`; as senhas são armazenadas com scrypt. Para produção, configure também limitação de tentativas de login no firewall/WAF da Vercel.

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
- Sessões autenticadas e protegidas contra acesso por origem externa
- Senhas armazenadas com scrypt; nenhum segredo de banco ou Blob é enviado ao navegador
- Limites de upload: áudio (100 MB) e capa (10 MB)
- URLs do Blob são públicos; não use este armazenamento para conteúdo que exija confidencialidade do arquivo

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
