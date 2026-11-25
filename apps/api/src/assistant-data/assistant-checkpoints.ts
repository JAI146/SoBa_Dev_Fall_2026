import { ConflictException, GoneException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthPrincipal } from '../auth/auth-principal';

/** Store query recipes only. Never persist bearer tokens, model history, or copies of dashboard records. */
export type AnalysisStep = { name: string; args: unknown; prefix: string };
export type AnalysisCheckpoint = {
  question: string;
  steps: AnalysisStep[];
  nextCall: number;
};

const lifetimeMs = 15 * 60 * 1000;
const maxEntries = 64;
const maxRecipeBytes = 32 * 1024;
const maxReplaySteps = 24;

export class AssistantCheckpoints {
  private readonly entries = new Map<
    string,
    {
      owner: string;
      expires: number;
      busy: boolean;
      state: AnalysisCheckpoint;
    }
  >();

  private owner(principal: AuthPrincipal, conversationId: string) {
    return JSON.stringify([
      principal.userId,
      principal.sessionId,
      conversationId,
    ]);
  }

  save(
    principal: AuthPrincipal,
    conversationId: string,
    state: AnalysisCheckpoint,
  ) {
    if (
      state.steps.length > maxReplaySteps ||
      Buffer.byteLength(JSON.stringify(state)) > maxRecipeBytes
    )
      return undefined;
    const now = Date.now();
    for (const [id, entry] of this.entries) {
      if (!entry.busy && entry.expires <= now) this.entries.delete(id);
    }
    if (this.entries.size >= maxEntries) {
      const oldest = [...this.entries].find(([, entry]) => !entry.busy);
      if (!oldest) return undefined;
      this.entries.delete(oldest[0]);
    }
    const id = randomUUID();
    this.entries.set(id, {
      owner: this.owner(principal, conversationId),
      expires: now + lifetimeMs,
      busy: false,
      state,
    });
    return id;
  }

  async resume<T>(
    principal: AuthPrincipal,
    conversationId: string,
    id: string,
    work: (state: AnalysisCheckpoint) => Promise<T>,
  ): Promise<T> {
    const entry = this.entries.get(id);
    if (
      !entry ||
      entry.expires <= Date.now() ||
      entry.owner !== this.owner(principal, conversationId)
    )
      throw new GoneException(
        'This analysis has expired. Send the original question again to start a fresh analysis.',
      );
    if (entry.busy)
      throw new ConflictException('This analysis is already continuing.');
    entry.busy = true;
    try {
      const result = await work(entry.state);
      this.entries.delete(id);
      return result;
    } finally {
      entry.busy = false;
    }
  }
}
