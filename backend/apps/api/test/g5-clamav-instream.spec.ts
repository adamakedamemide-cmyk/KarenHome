import { createServer, type Server, type Socket } from 'node:net';
import { ClamavInstreamScanner } from '../../../apps/worker/src/transports/clamav';

/**
 * GATE 5 Phase E — ClamAV clamd INSTREAM adapter contract tests.
 * A real clamd wire-protocol daemon is simulated on loopback TCP so the
 * adapter's framing (zINSTREAM + 4-byte BE length chunks + terminator) and
 * verdict parsing (OK / FOUND) are verified without a live daemon.
 * Live daemon classification stays UNVERIFIED_EXTERNAL (registered honestly).
 */

const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

/** Minimal clamd-compatible INSTREAM daemon for contract testing. */
function startMockClamd(opts: { verdict: 'ok' | 'found' | 'silent' }): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = createServer((socket: Socket) => {
      let buffer = Buffer.alloc(0);
      const chunks: Buffer[] = [];
      let totalLength = 0;
      let sawTerminator = false;
      socket.on('data', (data: Buffer) => {
        buffer = Buffer.concat([buffer, data]);
        // Command phase: PING → PONG
        if (buffer.toString('binary').startsWith('PING')) {
          socket.write('PONG\n');
          buffer = Buffer.alloc(0);
          return;
        }
        if (!buffer.toString('binary').startsWith('zINSTREAM\0')) return;
        const payload = buffer.subarray('zINSTREAM\0'.length);
        let offset = 0;
        for (;;) {
          if (payload.length - offset < 4) break;
          const frameLength = payload.readUInt32BE(offset);
          offset += 4;
          if (frameLength === 0) {
            sawTerminator = true;
            break;
          }
          if (payload.length - offset < frameLength) break;
          chunks.push(payload.subarray(offset, offset + frameLength));
          totalLength += frameLength;
          offset += frameLength;
        }
        buffer = payload.subarray(offset);
        if (sawTerminator && opts.verdict !== 'silent') {
          const body = Buffer.concat(chunks).toString('binary');
          if (body.includes(EICAR)) socket.write('stream: EICAR-Test-File FOUND\n');
          else socket.write('stream: OK\n');
          socket.end();
        }
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, port: typeof address === 'object' && address ? address.port : 0 });
    });
  });
}

describe('G5-E — ClamAV INSTREAM adapter (contract level, mock clamd)', () => {
  let server: Server;
  let port: number;

  afterEach(async () => {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  });

  it('verifies PING → PONG reachability', async () => {
    const started = await startMockClamd({ verdict: 'ok' });
    server = started.server;
    port = started.port;
    const scanner = new ClamavInstreamScanner('127.0.0.1', port, 2000);
    await expect(scanner.ping()).resolves.toBeUndefined();
  });

  it('scans a clean file → clean verdict via real INSTREAM framing', async () => {
    const started = await startMockClamd({ verdict: 'ok' });
    server = started.server;
    port = started.port;
    const scanner = new ClamavInstreamScanner('127.0.0.1', port, 2000);
    const result = await scanner.scan(Buffer.from('hello clean image bytes'));
    expect(result).toMatchObject({ status: 'clean', provider: 'clamav-instream' });
  });

  it('scans the EICAR official test signature → infected with signature name', async () => {
    const started = await startMockClamd({ verdict: 'found' });
    server = started.server;
    port = started.port;
    const scanner = new ClamavInstreamScanner('127.0.0.1', port, 2000);
    const result = await scanner.scan(Buffer.from(EICAR));
    expect(result.status).toBe('infected');
    expect(result.signature).toBe('EICAR-Test-File');
    expect(result.reason).toBe('EICAR-Test-File');
  });

  it('times out against a silent daemon', async () => {
    const started = await startMockClamd({ verdict: 'silent' });
    server = started.server;
    port = started.port;
    const scanner = new ClamavInstreamScanner('127.0.0.1', port, 300);
    const result = await scanner.scan(Buffer.from('bytes'));
    expect(result.status).toBe('error');
    expect(result.reason).toBe('CLAMAV_TIMEOUT');
  }, 10_000);

  it('reports an error status when the daemon is unavailable (never guesses)', async () => {
    const scanner = new ClamavInstreamScanner('127.0.0.1', 1, 500); // port 1 — nothing listens
    const result = await scanner.scan(Buffer.from('bytes'));
    expect(result.status).toBe('error');
    expect(result.reason).toContain('CLAMAV_CONNECT_FAILED');
  }, 10_000);
});
