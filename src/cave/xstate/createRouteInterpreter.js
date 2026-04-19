'use strict';

const { interpret, createMachine, assign } = require('xstate');

/**
 * @param {string} id
 * @param {(ctx: { structural: string, route: string, payload: Record<string, unknown>, traceId: string, tenant: string }) => Record<string, unknown> | null} handler
 */
function createDomainRouteMachine(id, handler) {
  return createMachine(
    {
      id,
      predictableActionArguments: true,
      context: {
        response: null,
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            ROUTE: {
              target: 'done',
              actions: assign({
                response: (_c, e) =>
                  handler({
                    structural: e.structural,
                    route: e.route,
                    payload: e.payload,
                    traceId: e.traceId,
                    tenant: e.tenant,
                  }),
              }),
            },
          },
        },
        done: { type: 'final' },
      },
    },
    { actions: {}, guards: {} }
  );
}

/** @param {{ structural: string, route: string, payload: Record<string, unknown>, traceId: string, tenant: string }} ctx */
function caveRouteEvent(ctx) {
  return {
    type: 'ROUTE',
    structural: ctx.structural,
    route: ctx.route,
    payload: ctx.payload,
    traceId: ctx.traceId,
    tenant: ctx.tenant,
  };
}

/**
 * @param {Array<{ id: string, prefixes: string[], machine: object }>} registrations
 */
function createRouteInterpreter(registrations) {
  const flat = registrations.flatMap((r) =>
    r.prefixes.map((prefix) => ({ prefix, id: r.id, machine: r.machine }))
  );
  flat.sort((a, b) => b.prefix.length - a.prefix.length);

  return {
    /**
     * @param {{ structural: string, route: string, payload: Record<string, unknown>, traceId: string, tenant: string }} ctx
     * @returns {{ response: Record<string, unknown> | null, machineId: string } | null}
     */
    dispatch(ctx) {
      const structural = ctx.structural;
      for (const { prefix, id, machine } of flat) {
        if (structural === prefix || structural.startsWith(prefix)) {
          const service = interpret(machine).start();
          service.send(caveRouteEvent(ctx));
          return { response: service.state.context.response, machineId: id };
        }
      }
      return null;
    },
  };
}

module.exports = { createRouteInterpreter, createDomainRouteMachine, caveRouteEvent };
