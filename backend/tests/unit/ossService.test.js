'use strict';

describe('ossService', () => {
  let originalEnv;

  beforeEach(() => {
    jest.resetModules();
    originalEnv = { ...process.env };
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  function loadService({ env = {}, mockClient = {}, liveClient = {} } = {}) {
    process.env = { ...originalEnv, ...env };

    const mockUploadClient = {
      post: jest.fn().mockResolvedValue({ data: { code: 0 } }),
      ...mockClient,
    };

    const liveUploadClient = {
      post: jest.fn(),
      ...liveClient,
    };

    const create = jest
      .fn()
      .mockReturnValueOnce(mockUploadClient)
      .mockReturnValueOnce(liveUploadClient);

    jest.doMock('axios', () => ({ create }));

    // eslint-disable-next-line global-require
    const service = require('../../src/services/ossService');
    return { service, mockUploadClient, liveUploadClient };
  }

  it('uses mock mode by default', async () => {
    const { service, mockUploadClient } = loadService({
      env: {
        OSS_MODE: 'stub',
        OSS_BUCKET: 'family-space',
      },
    });

    const url = await service.uploadAudio(Buffer.from('abc'), 'voice/test.wav');

    expect(url).toContain('voice/test.wav');
    expect(mockUploadClient.post).toHaveBeenCalled();
  });

  it('maps timeout to 504 in live mode', async () => {
    const { service } = loadService({
      env: {
        OSS_MODE: 'live',
        OSS_UPLOAD_API_URL: 'https://oss-api.example.com',
        OSS_UPLOAD_TOKEN: 'token',
      },
      liveClient: {
        post: jest.fn().mockRejectedValue({ code: 'ECONNABORTED' }),
      },
    });

    await expect(service.uploadAudio(Buffer.from('abc'), 'voice/test.wav')).rejects.toMatchObject({
      code: 504,
      statusCode: 504,
    });
  });

  it('maps 429 to 503 in live mode', async () => {
    const { service } = loadService({
      env: {
        OSS_MODE: 'live',
        OSS_UPLOAD_API_URL: 'https://oss-api.example.com',
        OSS_UPLOAD_TOKEN: 'token',
      },
      liveClient: {
        post: jest.fn().mockRejectedValue({ response: { status: 429 } }),
      },
    });

    await expect(service.uploadImage(Buffer.from('abc'), 'album/test.jpg')).rejects.toMatchObject({
      code: 503,
      statusCode: 503,
    });
  });

  it('returns uploaded url in live mode', async () => {
    const { service, liveUploadClient } = loadService({
      env: {
        OSS_MODE: 'live',
        OSS_UPLOAD_API_URL: 'https://oss-api.example.com',
        OSS_UPLOAD_TOKEN: 'token',
      },
      liveClient: {
        post: jest
          .fn()
          .mockResolvedValue({ data: { url: 'https://cdn.example.com/family-space/a.jpg' } }),
      },
    });

    const url = await service.uploadImage(Buffer.from('abc'), 'album/test.jpg');

    expect(url).toBe('https://cdn.example.com/family-space/a.jpg');
    expect(liveUploadClient.post).toHaveBeenCalled();
  });

  it('throws 503 when live response does not contain url', async () => {
    const { service } = loadService({
      env: {
        OSS_MODE: 'live',
        OSS_UPLOAD_API_URL: 'https://oss-api.example.com',
        OSS_UPLOAD_TOKEN: 'token',
      },
      liveClient: {
        post: jest.fn().mockResolvedValue({ data: { code: 0 } }),
      },
    });

    await expect(service.uploadImage(Buffer.from('abc'), 'album/test.jpg')).rejects.toMatchObject({
      code: 503,
      statusCode: 503,
    });
  });

  it('builds url from OSS_PUBLIC_BASE_URL in mock mode', async () => {
    const { service } = loadService({
      env: {
        OSS_MODE: 'stub',
        OSS_PUBLIC_BASE_URL: 'https://cdn.example.com/public',
      },
    });

    const url = await service.uploadAudio(Buffer.from('abc'), 'voice/���� path.wav');

    expect(url).toContain('https://cdn.example.com/public/voice/');
    expect(url).toContain('path.wav');
  });
});
