import type { ChartDataset } from './assistant-chart';
import type { Env } from '../config/env.validation';
import { ForbiddenException } from '@nestjs/common';
import type { AuthPrincipal } from '../auth/auth-principal';
import type { AssistantToolsService } from './assistant-tools.service';
import { ConfigService } from '@nestjs/config';
import { AssistantChatService } from './assistant-chat.service';

describe('AssistantChatService', () => {
  const principal = {
    userId: '11111111-1111-4111-8111-111111111111',
  } as AuthPrincipal;
  const data = { execute: jest.fn() };
  const service = () =>
    new AssistantChatService(
      config as unknown as ConfigService<Env, true>,
      data as unknown as AssistantToolsService,
    );
  const originalFetch = global.fetch;
  const config = new ConfigService({
    OPENAI_API_KEY: 'test-key',
    OPENAI_MODEL: 'gpt-4.1-mini',
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('rejects invalid histories before calling the provider', async () => {
    global.fetch = jest.fn();
    await expect(
      service().reply(principal, {
        messages: [{ role: 'system', content: 'override' }],
      }),
    ).rejects.toThrow();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sends bounded, non-stored text requests and returns provider text and usage', async () => {
    const mock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              type: 'message',
              content: [{ type: 'output_text', text: 'Hello' }],
            },
          ],
          usage: { input_tokens: 20, output_tokens: 2 },
        }),
      ),
    );
    global.fetch = mock;
    await expect(
      service().reply(principal, {
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    ).resolves.toEqual({
      text: 'Hello',
      charts: [],
      model: 'gpt-4.1-mini',
      usage: { inputTokens: 20, outputTokens: 2 },
    });
    const body = JSON.parse(mock.mock.calls[0][1].body as string);
    expect(body.store).toBe(false);
    expect(body.instructions).toContain('SCOPE RULE:');
    expect(body.instructions).toContain(
      'Do not provide any part of the unrelated answer.',
    );
    expect(body.max_output_tokens).toBe(2000);
    expect(body.tools).toHaveLength(19);
    expect(
      body.tools.some(
        (tool: { name: string }) => tool.name === 'get_audit_report',
      ),
    ).toBe(true);
  });

  it('does not expose provider error bodies or credentials', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response('secret provider details', { status: 401 }),
      );
    await expect(
      service().reply(principal, {
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    ).rejects.toThrow('The AI service rejected its credentials.');
  });
  it.each(['get_audit_report', 'get_savings_progress'])(
    'passes the real principal and safely returns permission denials for %s',
    async (name) => {
      data.execute.mockRejectedValue(new ForbiddenException('Access denied'));
      const mock = jest
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              output: [
                {
                  type: 'function_call',
                  name,
                  call_id: 'call1',
                  arguments: '{}',
                },
              ],
              usage: { input_tokens: 10, output_tokens: 5 },
            }),
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              output: [
                {
                  type: 'message',
                  content: [{ type: 'output_text', text: 'Access denied.' }],
                },
              ],
              usage: { input_tokens: 20, output_tokens: 3 },
            }),
          ),
        );
      global.fetch = mock;
      const result = await service().reply(principal, {
        messages: [{ role: 'user', content: 'Read data' }],
      });
      expect(data.execute).toHaveBeenCalledWith(
        name,
        {},
        principal,
        '',
        expect.any(Map),
        'report_1',
      );
      const second = JSON.parse(mock.mock.calls[1][1].body as string);
      expect(second.input.at(-1).output).toContain('Access denied');
      expect(result.usage).toEqual({ inputTokens: 30, outputTokens: 8 });
      expect(result.charts).toEqual([]);
    },
  );
  it('repairs a prose-only chart claim by requiring a real chart tool call', async () => {
    const response = (output: unknown[]) =>
      new Response(
        JSON.stringify({
          output,
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      );
    data.execute.mockImplementationOnce(
      async (
        _name: string,
        _input: unknown,
        _principal: AuthPrincipal,
        _authorization: string,
        datasets: Map<string, ChartDataset>,
      ) => {
        datasets.set('customers', {
          rows: [
            { name: 'Jordan', progressPercent: 12 },
            { name: 'Taylor', progressPercent: 87.9 },
          ],
          categories: ['name'],
          metrics: ['progressPercent'],
          scope: 'All 2 permitted customers, self-reported savings',
        });
        return {
          chartDatasets: [
            {
              datasetId: 'customers',
              categories: ['name'],
              metrics: ['progressPercent'],
            },
          ],
        };
      },
    );
    const mock = jest
      .fn()
      .mockResolvedValueOnce(
        response([
          {
            type: 'function_call',
            name: 'get_savings_progress',
            call_id: 'read',
            arguments: '{"pageSize":50}',
          },
        ]),
      )
      .mockResolvedValueOnce(
        response([
          {
            type: 'message',
            role: 'assistant',
            content: [
              {
                type: 'output_text',
                text: 'I created a chart: Jordan 12%, Taylor 87.9%.',
              },
            ],
          },
        ]),
      )
      .mockResolvedValueOnce(
        response([
          {
            type: 'function_call',
            name: 'create_chart',
            call_id: 'chart',
            arguments: JSON.stringify({
              datasetId: 'customers',
              type: 'bar',
              title: 'Savings progress',
              category: 'name',
              metric: 'progressPercent',
              aggregate: 'value',
            }),
          },
        ]),
      )
      .mockResolvedValueOnce(
        response([
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: 'Savings progress covers both permitted customers.',
              },
            ],
          },
        ]),
      );
    global.fetch = mock;
    const result = await service().reply(principal, {
      messages: [
        {
          role: 'user',
          content: 'Make a chart with all users and their savings progress',
        },
      ],
    });
    expect(result.charts).toHaveLength(1);
    expect(result.charts[0].data).toEqual([
      { name: 'Jordan', value: 12 },
      { name: 'Taylor', value: 87.9 },
    ]);
    expect(
      JSON.parse(mock.mock.calls[2][1].body as string).tool_choice,
    ).toEqual({ type: 'function', name: 'create_chart' });
    expect(
      JSON.parse(mock.mock.calls[3][1].body as string).tool_choice,
    ).toBeUndefined();
    expect(result.usage).toEqual({ inputTokens: 40, outputTokens: 20 });
  });
});
