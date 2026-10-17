// Loaded only by the isolated test-server process; production never imports this.
import { registerHooks } from "node:module";
const fixture = new URL("./test-mail-transport.cjs", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^nodemailer(?:$|[-/])/.test(specifier))
      return { url: fixture, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
