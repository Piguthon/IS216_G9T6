// Unit tests for middleware/member.js, with the models stubbed.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Meetup = require('../../models/meetup-model');
const User = require('../../models/user-model');
const { findCaller, requireMember } = require('../member');

const host = { _id: 'm1', name: 'Alice', userId: 'user-1', memberToken: 'host-secret' };
const guest = { _id: 'm2', name: 'Ben', userId: null, memberToken: 'guest-secret' };
const meetup = { code: 'ABC123', members: [host, guest] };

// A request with the given headers, like Express's req.get(name)
function fakeRequest(headers = {}) {
  return { params: { code: 'ABC123' }, get: (name) => headers[name] };
}

// A response that remembers its status and JSON body
function fakeResponse() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

// Runs requireMember and returns what happened
async function check(headers) {
  const req = fakeRequest(headers);
  const res = fakeResponse();
  const next = vi.fn();
  await requireMember(req, res, next);
  return { req, res, next };
}

const realFindByCode = Meetup.findByCode;
const realFindOne = User.findOne;

beforeEach(() => {
  Meetup.findByCode = async (code) => (code === 'ABC123' ? meetup : null);
  User.findOne = async (query) => (query.sessionToken === 'good-session' ? { _id: 'user-1' } : null);
});

afterEach(() => {
  Meetup.findByCode = realFindByCode;
  User.findOne = realFindOne;
});

describe('requireMember', () => {
  it('answers 403 when there is no credential', async () => {
    const { res, next } = await check({});

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'You are not a member of this meetup.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('answers 403 for a wrong guest secret', async () => {
    const { res, next } = await check({ 'X-Member-Token': 'not-the-secret' });

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown code', async () => {
    const req = { params: { code: 'NOPE00' }, get: () => undefined };
    const res = fakeResponse();
    await requireMember(req, res, vi.fn());

    expect(res.statusCode).toBe(404);
  });

  it('finds the guest from their X-Member-Token', async () => {
    const { req, next } = await check({ 'X-Member-Token': 'guest-secret' });

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.member).toBe(guest);
    expect(req.meetup).toBe(meetup);
  });

  it('finds the member with the logged-in account', async () => {
    const { req, next } = await check({ Authorization: 'Bearer good-session' });

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.member).toBe(host);
    expect(req.user).toEqual({ _id: 'user-1' });
  });

  it('ignores a stale session when there is a valid guest secret', async () => {
    const { req, res, next } = await check({
      Authorization: 'Bearer old-session',
      'X-Member-Token': 'guest-secret',
    });

    expect(res.statusCode).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.member).toBe(guest);
    expect(req.user).toBeUndefined();
  });

  it('answers 401 for a stale session with no guest secret', async () => {
    const { res, next } = await check({ Authorization: 'Bearer old-session' });

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Your session is invalid. Please log in again.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('answers 403 for a stale session with a wrong guest secret', async () => {
    const { res } = await check({
      Authorization: 'Bearer old-session',
      'X-Member-Token': 'not-the-secret',
    });

    expect(res.statusCode).toBe(403);
  });
});

describe('findCaller', () => {
  it('returns null when there is no credential', async () => {
    expect(await findCaller(fakeRequest(), meetup)).toBeNull();
  });

  it('throws Invalid session for a stale session alone', async () => {
    await expect(
      findCaller(fakeRequest({ Authorization: 'Bearer old-session' }), meetup),
    ).rejects.toThrow('Invalid session');
  });

  it('falls back to the guest secret when the account is not a member', async () => {
    User.findOne = async () => ({ _id: 'user-9' });
    const req = fakeRequest({ Authorization: 'Bearer good-session', 'X-Member-Token': 'guest-secret' });

    expect(await findCaller(req, meetup)).toBe(guest);
  });
});
