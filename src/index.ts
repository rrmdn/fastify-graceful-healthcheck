import { type FastifyPluginAsync } from "fastify";
import emitter from "./emitter";

const fastifyGracefulHealthcheck: FastifyPluginAsync<{
  route?: string;
  onShutdown?: () => Promise<void>;
  timeout?: number;
}> = async (fastify, opts) => {
  const route = opts.route || "/health";
  const onShutdown =
    opts.onShutdown ||
    (async () => {
      await fastify.close();
    });
  const timeout = opts.timeout || 25000;
  let timeoutID: NodeJS.Timeout;
  let status = 200;
  let shutdownAttempt = 0;
  fastify.get(route, async (request, reply) => {
    if (status !== 200) {
      shutdownAttempt++;
    }
    // If there are no ongoing requests except this health call,
    // we can shutdown immediately
    if (shutdownAttempt > 1) {
      timeoutID && clearTimeout(timeoutID);
      await onShutdown();
    }
    reply.status(status).send({ status });
  });
  emitter.on("death", () => {
    status = 503;
    // Force the system to shutdown after the timeout
    timeoutID = setTimeout(() => {
      onShutdown();
    }, timeout);
  });
};

export default fastifyGracefulHealthcheck;
