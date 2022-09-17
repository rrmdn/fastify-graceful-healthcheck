import fastify from "fastify";
import fastifyGracefulHealthcheck from ".";
import emitter from "./emitter";

describe("root", () => {
  afterEach(() => {
    emitter.removeAllListeners("death");
  });
  it("should be able to shutdown gracefully", async () => {
    let isShuttingDown = false;
    const app = fastify();
    await app.register(fastifyGracefulHealthcheck, {
      route: "/v1/health",
      onShutdown: async () => {
        isShuttingDown = true;
      },
    });
    await app.ready();
    await expect(
      app.inject({ method: "GET", path: "/v1/health" })
    ).resolves.toMatchObject({
      body: '{"status":200}',
    });
    emitter.emit("death");
    // let the load balancer know that we are shutting down
    await expect(
      app.inject({ method: "GET", path: "/v1/health" })
    ).resolves.toMatchObject({ body: '{"status":503}' });
    // the shutdown procedure should not be triggered yet
    expect(isShuttingDown).toBe(false);
    // the load balancer should have enough time to remove this instance from the pool
    await expect(
      app.inject({ method: "GET", path: "/v1/health" })
    ).resolves.toMatchObject({ body: '{"status":503}' });
    // the shutdown procedure should be triggered after the second health check
    expect(isShuttingDown).toBe(true);
  });

  it("should be able to shutdown gracefully with a custom timeout", async () => {
    let isShuttingDown = false;
    const app = fastify();
    await app.register(fastifyGracefulHealthcheck, {
      route: "/v1/health",
      timeout: 1000,
      onShutdown: async () => {
        isShuttingDown = true;
      },
    });
    await app.ready();
    emitter.emit("death");
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(isShuttingDown).toBe(false);
    // the shutdown procedure should be triggered after the timeout
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(isShuttingDown).toBe(true);
  });
});
