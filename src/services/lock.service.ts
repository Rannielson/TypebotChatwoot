import { queueConnection } from '../config/queue.config';
import Redlock from 'redlock';

// Tipo do Lock do Redlock
type RedlockLock = Awaited<ReturnType<Redlock['acquire']>>;

// Cliente Redlock para locks distribuídos
const redlock = new Redlock(
  [queueConnection], // Usa a mesma conexão do BullMQ
  {
    // Tempo de expiração do lock (em ms)
    driftFactor: 0.01,
    retryCount: 3,
    retryDelay: 200,
    retryJitter: 200,
    automaticExtensionThreshold: 500,
  }
);

export class LockService {
  /**
   * Tenta adquirir um lock para processar um job
   * @param lockKey Chave única do lock (ex: jobId, messageId)
   * @param ttl Tempo de vida do lock em ms (padrão: 30s)
   * @returns Lock se adquirido, null se já está em uso
   */
  static async acquireLock(
    lockKey: string,
    ttl: number = 30000 // 30 segundos padrão
  ): Promise<RedlockLock | null> {
    try {
      const lock = await redlock.acquire([`lock:${lockKey}`], ttl);
      return lock;
    } catch (error: any) {
      // Lock já está em uso ou não pôde ser adquirido
      // Redlock lança erro quando não consegue adquirir o lock
      if (
        error.name === 'LockError' || 
        error.message?.includes('already locked') ||
        error.message?.includes('unable to acquire') ||
        error.message?.includes('acquire')
      ) {
        return null; // Lock não disponível
      }
      // Outro erro - relança
      throw error;
    }
  }

  /**
   * Libera um lock
   */
  static async releaseLock(lock: RedlockLock): Promise<void> {
    try {
      await lock.release();
    } catch (error) {
      console.error('[LockService] Erro ao liberar lock:', error);
      // Não relança - lock pode ter expirado
    }
  }

  /**
   * Executa uma função com lock (helper)
   * Retorna null se o lock não pôde ser adquirido
   */
  static async withLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
    ttl: number = 30000
  ): Promise<T | null> {
    const lock = await this.acquireLock(lockKey, ttl);
    if (!lock) {
      return null; // Lock já está em uso, job será processado por outro worker
    }

    try {
      const result = await fn();
      return result;
    } finally {
      await this.releaseLock(lock);
    }
  }

  /**
   * Verifica se um lock está ativo (sem adquirir)
   */
  static async isLocked(lockKey: string): Promise<boolean> {
    try {
      const result = await queueConnection.get(`lock:${lockKey}`);
      return result !== null;
    } catch (error) {
      return false;
    }
  }
}
