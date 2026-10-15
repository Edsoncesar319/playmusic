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
- Vercel Functions (Node.js 24.x)
- Vercel Blob (`@vercel/blob`)

## 📦 Estrutura do Projeto

```
musickera/
├── index.html          # Interface do usuário
├── api/
│   ├── music.js       # Lista músicas e capas do Blob
│   ├── upload.js      # Autoriza uploads diretos e limitados
│   └── auth/          # Cadastro, login, sessão e gestão da própria conta
├── database/
│   └── schema.sql     # Tabelas de usuários e sessões do Neon
├── lib/               # Acesso ao Neon e utilitários de autenticação
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

3. Crie um banco PostgreSQL no Neon e execute [`database/schema.sql`](./database/schema.sql) no SQL Editor do Neon.

4. Configure as variáveis de ambiente no painel da Vercel (Development, Preview e Production, conforme necessário):
   - `DATABASE_URL`: connection string do Neon, de preferência a pooled connection string.
   - `BLOB_READ_WRITE_TOKEN`: token do armazenamento Vercel Blob.

   Para desenvolvimento local, defina essas variáveis no `.env.local` ou use `vercel env pull .env.local`. Nunca coloque credenciais no HTML, no JavaScript do navegador ou no repositório.

5. Conecte o armazenamento Blob ao projeto Vercel:
   - No painel da Vercel, abra **Storage**, selecione o Blob store e conecte-o ao projeto.
   - Habilite os ambientes que serão usados. A Vercel disponibiliza `BLOB_READ_WRITE_TOKEN` para as funções.

6. Inicie o projeto localmente com a CLI da Vercel para que as rotas `/api` funcionem:
```bash
npx vercel dev
```
Abra o endereço local exibido pela CLI. Não abra `index.html` diretamente nem use um servidor estático, como o Live Server do VS Code: eles não executam as funções da API necessárias para cadastro, login e biblioteca. O script `setup.bat` também inicia o servidor da Vercel.

Em produção, publique o projeto na Vercel. Cada conta pode consultar e enviar arquivos para a biblioteca compartilhada; os endpoints de listagem e upload exigem uma sessão válida. Os uploads de áudio (até 100 MB) e de capas (até 10 MB) vão diretamente do navegador ao Blob; as funções mantêm o token no servidor. O player também mantém uma cópia local dos áudios no navegador, separada por conta.

O Vercel Blob deste projeto usa arquivos públicos. A autenticação protege a listagem e a autorização de novos uploads, mas um URL público de arquivo já compartilhado pode ser aberto por qualquer pessoa que o possua.

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
