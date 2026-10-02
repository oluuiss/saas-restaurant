import { db } from './db.js';
import { HttpError, sendJson } from './http.js';
import * as account from './routes/account.js';
import * as restaurant from './routes/restaurant.js';
import * as media from './routes/media.js';
import * as site from './routes/site.js';
import * as team from './routes/team.js';
import * as ops from './routes/ops.js';
import * as finance from './routes/finance.js';

const routes = [];
const route = (method, pattern, handler) =>
  routes.push({ method, handler, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`) });

route('POST', 'checkout', account.checkout);
route('POST', 'auth/login', account.login);
route('POST', 'auth/logout', account.logout);
route('GET', 'auth/me', account.me);
route('PUT', 'account', account.updateAccount);
route('PUT', 'account/password', account.changePassword);

route('GET', 'restaurant', restaurant.getRestaurant);
route('PUT', 'restaurant/draft', restaurant.saveDraft);
route('POST', 'restaurant/publish', restaurant.publish);
route('GET', 'restaurant/slug-check', restaurant.checkSlug);
route('PUT', 'restaurant/slug', restaurant.changeSlug);
route('GET', 'restaurant/reservations', restaurant.listReservations);
route('POST', 'restaurant/reservations/:id/status', restaurant.setReservationStatus);
route('GET', 'restaurant/orders', restaurant.listOrders);
route('POST', 'restaurant/orders/:id/status', restaurant.setOrderStatus);
route('POST', 'restaurant/calls/:id/done', restaurant.closeCall);
route('GET', 'restaurant/activity', restaurant.activity);
route('GET', 'restaurant/billing', restaurant.billing);

route('POST', 'media', media.uploadMedia);
route('GET', 'media/:id', media.getMedia);

// Site público de cada restaurante: /api/s/<slug>/...
route('GET', 's/:slug', site.getSite);
route('GET', 's/:slug/availability', site.availability);
route('POST', 's/:slug/reservations', site.createReservation);
route('GET', 's/:slug/auth/me', site.customerMe);
route('POST', 's/:slug/auth/register', site.customerRegister);
route('POST', 's/:slug/auth/login', site.customerLogin);
route('POST', 's/:slug/auth/logout', site.customerLogout);
route('GET', 's/:slug/me/reservations', site.myReservations);
route('POST', 's/:slug/me/reservations/:id/cancel', site.cancelMyReservation);
route('GET', 's/:slug/me/orders', site.myOrders);
route('POST', 's/:slug/me/orders/:id/cancel', site.cancelMyOrder);
route('POST', 's/:slug/orders', site.createOrder);
route('GET', 's/:slug/orders/:id', site.orderStatus);
route('POST', 's/:slug/table/check', site.checkTable);
route('POST', 's/:slug/table/call', site.callWaiter);

// Assinatura (contrato anual)
route('POST', 'account/subscription/cancel', account.cancelSubscription);
route('POST', 'account/subscription/resume', account.resumeSubscription);

// Equipe: login do colaborador pelo link e gestão pelo gerente
route('GET', 'team/me', team.me);
route('GET', 'team/invite/:code', team.invite);
route('POST', 'team/login', team.login);
route('PUT', 'team/password', team.changeOwnPassword);
route('GET', 'team/staff', team.listStaff);
route('POST', 'team/staff', team.createStaff);
route('PUT', 'team/staff/:id', team.updateStaff);
route('DELETE', 'team/staff/:id', team.deleteStaff);
route('POST', 'team/staff/:id/password', team.resetStaffPassword);
route('POST', 'team/staff/:id/link', team.regenerateLink);

// Operação: salão, contas, esgotados, clientes
route('GET', 'ops/context', ops.context);
route('GET', 'ops/overview', ops.overview);
route('POST', 'ops/tables/open', ops.openTable);
route('GET', 'ops/sessions/:id', ops.getSession);
route('PUT', 'ops/sessions/:id', ops.updateSession);
route('POST', 'ops/sessions/:id/orders', ops.addSessionOrder);
route('POST', 'ops/sessions/:id/release', ops.releaseSession);
route('POST', 'ops/sessions/:id/close', ops.closeSession);
route('PUT', 'ops/menu/:itemId', ops.setSoldOut);
route('POST', 'ops/menu/reset', ops.resetSoldOut);
route('PUT', 'ops/settings', ops.updateSettings);
route('GET', 'ops/customers', ops.customers);

// Financeiro
route('GET', 'finance/summary', finance.summary);
route('GET', 'finance/expenses', finance.listExpenses);
route('POST', 'finance/expenses', finance.createExpense);
route('PUT', 'finance/expenses/:id', finance.updateExpense);
route('DELETE', 'finance/expenses/:id', finance.deleteExpense);
route('POST', 'finance/expenses/:id/stop', finance.stopExpense);

/**
 * Entrada única da API. Na Vercel, /api/<rota> é reescrito para /api?route=<rota>
 * (uma função só, por causa do limite de funções do plano Hobby). No dev, a URL chega inteira.
 */
export async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = (url.searchParams.get('route') ?? url.pathname.replace(/^\/api\/?/, '')).replace(/^\/+|\/+$/g, '');
  url.searchParams.delete('route');

  const match = routes.find((r) => r.method === req.method && r.re.test(path));
  if (!match) return sendJson(res, 404, { error: 'Rota não encontrada.' });

  try {
    await match.handler({ req, res, sql: db(), params: path.match(match.re).groups ?? {}, query: url.searchParams });
  } catch (error) {
    if (error instanceof HttpError) return sendJson(res, error.status, { error: error.message, ...error.extra });
    console.error(`[api] ${req.method} /${path}`, error);
    sendJson(res, 500, { error: 'Algo deu errado do nosso lado. Tente novamente em instantes.' });
  }
}
