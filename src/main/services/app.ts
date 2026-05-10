import { runtime, Service } from "@zenbujs/core/runtime";
import { WindowService } from "@zenbujs/core/services";

export class AppService extends Service.create({
  key: "app",
  deps: {
    window: WindowService,
  },
}) {
  async evaluate() {
    await this.ctx.window.openView({ type: "app" });
  }

  async getCwd() {
    return process.cwd() + "poop";
  }
}

runtime.register(AppService, import.meta);
