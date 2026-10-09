/**
 * The console's actions, from the browser: each is one request to the
 * server, which checks the administrator's permission, the inputs, the
 * confirmation (an authenticator code for money and refunds) and the
 * idempotency key, then hands the action to the Shaheen app.
 * (src/server/admin/actions.ts)
 */
import type { ActionRecord, Audience, Channel, MasterWallet, MessageResult, MoneyResult } from '../types/admin';
import { request } from './http/client';

export const getMasterWallet = (signal?: AbortSignal) => request<MasterWallet>('/actions/wallet', { signal });

export const getRecentActions = (signal?: AbortSignal) => request<{ items: ActionRecord[] }>('/actions/recent', { signal }).then((r) => r.items);

export const countAudience = (channel: Channel, audience: Audience, signal?: AbortSignal) =>
  request<{ recipients: number }>('/actions/audience', { method: 'POST', body: { channel, audience }, signal }).then((r) => r.recipients);

export const sendMessage = (body: { channel: Channel; audience: Audience; title?: string; body: string }) =>
  request<MessageResult>('/actions/message', { method: 'POST', body: { ...body, confirm: true } });

export const sendMoney = (body: { userId: string; asset: string; amount: string; note?: string; idempotencyKey: string; code?: string }) =>
  request<MoneyResult>('/actions/money', { method: 'POST', body: { ...body, confirm: true } });

export const issueRefund = (body: { transactionId: string; amount?: string; reason: string; idempotencyKey: string; code?: string }) =>
  request<MoneyResult>('/actions/refund', { method: 'POST', body: { ...body, confirm: true } });

/** A fresh key for one money action: the same key is reused if the request is retried. */
export const newIdempotencyKey = () => crypto.randomUUID().replace(/-/g, '');
