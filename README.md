# Lumenu

SaaS de cardápio digital, delivery, reservas de mesa, email marketing e promoções para restaurantes.

- **Site institucional** (`index.html`, `privacidade.html`, `termos.html`): HTML/CSS/JS puros.
- **App** (`app.html` + `src/`): React. Checkout com gateway de exemplo, login, painel do restaurante e o site público de cada restaurante (template do Brasa Grill).
- **API** (`api/index.js` → `server/`): funções da Vercel com banco Neon Postgres.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:5173. O `npm run dev` sobe o site, o app e a API juntos (o Vite atende `/api` com o mesmo código das funções da Vercel).

Crie um `.env.local` a partir do `.env.example` com o `DATABASE_URL` do Neon. Para criar as tabelas num banco novo:

```bash
npm run db:migrate
```

## Fluxo

1. **/assinar?plano=ultimate**: checkout. Cria a conta, a assinatura, o restaurante (com conteúdo de exemplo) e já faz login.
2. **/painel**: painel do restaurante. Edita clicando direto no texto/foto da prévia ou pelo menu lateral. Salva sozinho (e pelo botão Salvar / Ctrl+S), com Desfazer/Refazer (Ctrl+Z, Ctrl+Shift+Z).
3. **Publicar**: copia o rascunho para o site público. Exige nome e **planta com pelo menos uma mesa**.
4. **Site público**: cada restaurante vira uma "pasta" do próprio Lumenu: `https://<domínio do Lumenu>/<slug>` (ex.: `/cantina-da-nona`). Não cria projeto nem domínio novo. Os endereços antigos `/r/<slug>` redirecionam.
5. **/painel/configuracoes**: perfil, foto, dados da empresa, plano (renova todo mês no dia do pagamento) e senha.

### O que o restaurante edita

- **Textos**: clicar em qualquer texto edita no lugar e abre a barra de estilo: cor sólida, gradiente ou gradiente animado, e tamanho (40% a 300%).
- **Aparência**: cor de fundo (fundo claro troca o texto para escuro sozinho), brilho colorido, botões, destaques, preços e cor da mesa selecionada.
- **Planta**: andares, áreas (cozinha, banheiro, bar…), mesas com tamanho livre, tamanho de todas as mesas de uma vez e o tamanho do salão (alça no canto).
- **Idiomas**: PT/EN/DE. O padrão é o idioma em que o site abre e a bandeira dele vem primeiro.
- **Promoções**: no cardápio todo, em pratos escolhidos ou para reserva antecipada; % ou R$, cupom opcional, datas e dias da semana.
- **Delivery**: taxa, pedido mínimo, entrega grátis acima de um valor, prazo e formas de pagamento.
- **Mesas**: botão "Estou no restaurante", chamar atendente, pedido pela mesa e o link de cada mesa (para QR Code).
- **Pedidos e chamados** e **Reservas**: atualizam sozinhos; o painel avisa quando chega pedido novo.

### Clientes do restaurante

O site público tem **Entrar/Criar conta** (a conta vale só para aquele restaurante). Pela conta o cliente vê reservas e pedidos e a sua **nota de 0 a 5**:

- Reserva e delivery exigem login. Pedido pela mesa não.
- Cancelamento de reserva: até 2 h antes. Reserva feita com menos de 2 h de antecedência pode ser cancelada em até 30 min depois de feita, desde que faltem mais de 30 min (reservou 22:35 para 23:00 → não cancela).
- Pedido só pode ser cancelado pelo cliente enquanto está "Recebido".
- Nota: reservas e pedidos são calculados separados (`5 − cancelamentos ÷ idas`, entre 0 e 5) e a nota final é a média dos dois. Não comparecer conta como cancelamento. Sem histórico, a nota é 5. Regras em `shared/policy.js`.

Só o plano Ultimate pode ser assinado online por enquanto (`checkout: true` em `shared/plans.js`).

### Gateway de exemplo

Nenhuma cobrança real. Só os cartões de teste são aceitos (qualquer validade futura e qualquer CVV):

| Cartão | Resultado |
| --- | --- |
| 4242 4242 4242 4242 | aprovado |
| 5555 5555 5555 4444 | aprovado |
| 4000 0000 0000 0002 | recusado |
| 4000 0000 0000 9995 | saldo insuficiente |

O Pix também é simulado. Só a bandeira e os 4 últimos dígitos ficam salvos. Para um gateway real (Mercado Pago, Stripe, Asaas…), troque `processTestPayment` em `shared/payments.js` / `server/routes/account.js`.

## Publicar na Vercel

1. Importe o repositório na Vercel (framework **Vite**).
2. Em *Settings → Environment Variables*, adicione `DATABASE_URL`.
3. Opcional: `VITE_LUMENU_URL` (URL do site do Lumenu) transforma o "Site feito com Lumenu" do rodapé dos restaurantes em link.
4. Depois de atualizar o código, rode `npm run db:migrate` com o `DATABASE_URL` de produção (o script só cria o que falta).

O `vercel.json` manda `/api/*` para uma função só (limite de funções do plano Hobby), entrega o app para qualquer caminho sem arquivo (`/painel`, `/<slug>`, `/<slug>/conta`…) e roda as funções em São Paulo (`gru1`), perto do banco. Nomes usados pelo próprio Lumenu (`painel`, `entrar`, `api`…) não podem virar endereço de restaurante (`RESERVED_SLUGS` em `shared/slug.js`).

## Estrutura

```
index.html, css/, js/     Site institucional
app.html, src/            App React
  pages/                  Checkout, login, painel e site público
  admin/                  Menu lateral, painéis, editor da planta
  site/                   Template do restaurante (edição no lugar)
server/                   API (rotas, sessões do painel e dos clientes)
shared/                   Código usado pelo app e pela API (planos, site, planta, idiomas,
                          preços/promoções, regras de cancelamento e nota)
db/schema.sql             Tabelas
```
