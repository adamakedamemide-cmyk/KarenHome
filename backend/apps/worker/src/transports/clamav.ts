import { connect, type Socket } from 'node:net';

/**
 * GATE 5 Phase E — real ClamAV clamd INSTREAM adapter (wire protocol).
 *
 * Protocol (clamd >= 0.95): connect to clamd TCP port, send `zINSTREAM\0`,
 * then stream the payload as frames of <4-byte big-endian length><data>,
 * terminated by a zero-length frame. clamd replies with either
 * `stream: OK` (clean) or `stream: <signature> FOUND` (infected).
 *
 * Failure policy: any transport/timeout error surfaces as status 'error' —
 * the caller (media worker) decides fail-open vs fail-closed and the job
 * queue provides retry/DLQ. This adapter never guesses a verdict.
 */
export interface ClamavScanResult {
  status: 'clean' | 'infected' | 'error';
  provider: 'clamav-instream';
  reason?: string;
  signature?: string;
}

export class ClamavInstreamScanner {
  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly timeoutMs: number = 10_000,
    private readonly maxChunk = 32_768,
  ) {}

  async ping(): Promise<void> {
    const response = await this.command('PING');
    if (response.trim() !== 'PONG') throw new Error(`CLAMAV_UNEXPECTED_PING_RESPONSE: ${response.slice(0, 64)}`);
  }

  async version(): Promise<string> {
    return this.command('zVERSION');
  }

  async scan(buffer: Buffer): Promise<ClamavScanResult> {
    try {
      const verdict = await this.instream(buffer);
      if (/^stream:\s*OK\s*$/.test(verdict.trim())) return { status: 'clean', provider: 'clamav-instream' };
      const signature = verdict.replace(/^stream:\s*/, '').replace(/\s*FOUND\s*$/, '').trim();
      return { status: 'infected', provider: 'clamav-instream', signature, reason: signature };
    } catch (error) {
      return {
        status: 'error',
        provider: 'clamav-instream',
        reason: error instanceof Error ? error.message : 'clamav_unreachable',
      };
    }
  }

  private instream(buffer: Buffer): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const socket: Socket = connect({ host: this.host, port: this.port });
      let received = Buffer.alloc(0);
      let settled = false;
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error('CLAMAV_TIMEOUT'));
      }, this.timeoutMs);

      const fail = (error: Error): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.destroy();
        reject(error);
      };
      socket.on('error', (error) => fail(new Error(`CLAMAV_CONNECT_FAILED: ${error.message}`)));

      socket.on('connect', () => {
        socket.write('zINSTREAM\0');
        for (let offset = 0; offset < buffer.length; offset += this.maxChunk) {
          const chunk = buffer.subarray(offset, Math.min(offset + this.maxChunk, buffer.length));
          const header = Buffer.alloc(4);
          header.writeUInt32BE(chunk.length, 0);
          socket.write(header);
          socket.write(chunk);
        }
        const terminator = Buffer.alloc(4);
        terminator.writeUInt32BE(0, 0);
        // Real clamd sends the verdict and closes the connection itself;
        // ending the client side here can race the daemon's response.
        socket.write(terminator);
      });

      socket.on('data', (data: Buffer) => {
        received = Buffer.concat([received, data]);
      });
      socket.on('close', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const response = received.toString('utf8').trim();
        if (!response) {
          reject(new Error('CLAMAV_EMPTY_RESPONSE'));
          return;
        }
        resolve(response);
      });
    });
  }

  private command(payload: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const socket: Socket = connect({ host: this.host, port: this.port });
      let received = Buffer.alloc(0);
      let settled = false;
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error('CLAMAV_TIMEOUT'));
      }, this.timeoutMs);
      const settle = (action: () => void): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.destroy();
        action();
      };
      socket.on('error', (error) => settle(() => reject(new Error(`CLAMAV_CONNECT_FAILED: ${error.message}`))));
      socket.on('connect', () => socket.write(payload));
      socket.on('data', (data: Buffer) => {
        received = Buffer.concat([received, data]);
        // Single-line responses (PONG / version string) — resolve on arrival.
        settle(() => resolve(received.toString('utf8').trim()));
      });
      socket.on('close', () => settle(() => resolve(received.toString('utf8').trim())));
    });
  }
}
