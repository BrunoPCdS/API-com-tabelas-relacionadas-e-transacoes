<p align="center">
  <img src="assets/banner.svg" alt="API - Evento - Registro de usuários e ingressos" width="100%" />
</p>

# API - Evento / Registro de usuários e ingressos

API REST para gerenciamento de eventos, ingressos, usuários, inscrições e autenticação. O projeto fornece:

- Cadastro, ativação por e-mail e recuperação de senha de usuários
- Autenticação via JWT (`/login`) e proteção de rotas com token
- CRUD de eventos e ingressos
- Inscrições com controle transacional de estoque de ingressos
- Envio de e-mails (Mailtrap usado durante desenvolvimento)

## Funcionalidades

- Cadastro, listagem, atualização e exclusão de eventos
- Cadastro, listagem, atualização e exclusão de ingressos
- Cadastro, listagem, atualização e exclusão de inscrições
- Cadastro de usuários com ativação por e-mail
- Recuperação de senha por código (envio por e-mail)
- Alterar senha usando código de recuperação
- Soft delete de usuários e restauração
- Controle de quantidade de ingressos por evento (transações)
- Envio de e-mail de confirmação para o usuário inscrito

## Tecnologias

- Node.js
- Express
- TypeScript
- Prisma (MySQL)
- Zod (validação)
- Nodemailer (Mailtrap para dev)
- bcrypt (hash de senhas)
- jsonwebtoken (JWT)
- tsx (execução em dev)

## Como executar

1. Instale as dependências:

```bash
npm install
```

2. Configure o arquivo `.env` com as variáveis do banco e do Mailtrap.

3. Rode as migrations e gere o client do Prisma, se necessário:

```bash
npx prisma migrate dev
npx prisma generate
```

4. Inicie a aplicação:

```bash
npm run dev
```

Observações:
- O script `dev` usa `npx tsx watch src/server.ts`.
- O `postinstall` já executa `prisma generate` (veja `package.json`).

## Endpoints principais

Rotas públicas:

- `GET /` — rota raiz (mensagem)
- `GET /eventos` — listar eventos
- `POST /eventos` — criar evento
- `PUT /eventos/:id` — atualizar evento
- `DELETE /eventos/:id` — deletar evento

- `GET /ingresso` — listar ingressos
- `POST /ingresso` — criar ingresso
- `PUT /ingresso/:id` — atualizar ingresso
- `DELETE /ingresso/:id` — deletar ingresso

- `GET /inscricao` — listar inscrições (inclui dados relacionados)
- `POST /inscricao` — criar inscrição (usa transação e decrementa estoque)
- `PUT /inscricao/:id` — atualizar inscrição (ajusta estoques quando troca de evento)
- `DELETE /inscricao/:id` — deletar inscrição (restaura estoque)

Rotas de usuário / autenticação:

- `POST /usuario` — cadastrar usuário (envia e-mail de ativação)
- `GET /usuario` — listar usuários
- `GET /usuario/deletados` — listar usuários soft-deletados
- `PUT /usuario/:id` — atualizar usuário (requer token; só pode alterar o próprio usuário)
- `DELETE /usuario/:id` — soft-delete de usuário (requer token; só pode deletar o próprio usuário)
- `PATCH /usuario/:id/restaurar` — restaurar usuário soft-deletado
- `POST /usuario/recuperar-senha` — solicita código por e-mail para recuperar senha
- `GET /usuario/ativar/:codigo` — ativar conta via link enviado por e-mail
- `POST /usuario/alterar-senha` — alterar senha usando código de recuperação

- `POST /login` — autenticar e receber JWT (token expira em 15 minutos)

Observações:
- Algumas rotas exigem o header `Authorization: Bearer <token>` (verificaToken).
- Envio de e-mail em desenvolvimento utiliza `sandbox.smtp.mailtrap.io`.

<p align="center">
  <img src="assets/Screenshot_5.png" alt="Interface do software Bruno" width="100%" />
</p>

## Exemplo de inscrição

```json
{
  "eventoId": 1,
  "usuarioId": 1,
  "ingressoId": 1
}
```

## Exemplo de cadastro / login

Cadastro (`POST /usuario`):

```json
{
  "nome": "Fulano",
  "email": "fulano@example.com",
  "senha": "SenhaSegura123"
}
```

Login (`POST /login`):

```json
{
  "email": "fulano@example.com",
  "senha": "SenhaSegura123"
}
```

## Observações


- O envio de e-mail usa o host `sandbox.smtp.mailtrap.io` por padrão (Mailtrap).
- O estoque do evento é reduzido quando uma inscrição é criada e restaurado ao excluir.
- O cadastro de usuário envia um link de ativação; a conta permanece com status `Inativo` até ativada.

## Variáveis de ambiente (exigidas)

- `DATABASE_URL` — string de conexão com o banco MySQL (usada pelo Prisma)
- `MAILTRAP_EMAIL` — usuário Mailtrap (envio de e-mails)
- `MAILTRAP_SENHA` — senha Mailtrap
- `JWT_SECRET` — segredo usado para assinar tokens JWT

## Arquitetura / observações técnicas

- Proteções de rota com `verificaToken` (middleware). Veja `src/utilit/verificaToken.ts`.
- Validações com `zod` nas rotas.
- Transações Prisma para operações de inscrição (garante consistência de estoque).

Se quiser, atualizo este README com exemplos de request cURL ou collection Postman/Insomnia.
