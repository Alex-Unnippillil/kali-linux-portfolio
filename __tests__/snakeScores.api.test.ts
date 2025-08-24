import handler from '../pages/api/snake/scores';

function createRes() {
  return {
    statusCode: 0,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(d) {
      this.data = d;
      return this;
    },
    setHeader() {
      return this;
    },
  };
}

describe('snake scores api', () => {
  test('stores and returns scores', () => {
    const postReq = { method: 'POST', body: { score: 42 } };
    const postRes = createRes();
    handler(postReq, postRes);
    expect(postRes.statusCode).toBe(201);
    expect(postRes.data.scores[0]).toBe(42);

    const getReq = { method: 'GET' };
    const getRes = createRes();
    handler(getReq, getRes);
    expect(getRes.statusCode).toBe(200);
    expect(getRes.data.scores[0]).toBe(42);
  });
});
