var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : /* @__PURE__ */ Symbol.for("Symbol." + name);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __decoratorStart = (base) => [, , , __create(base?.[__knownSymbol("metadata")] ?? null)];
var __decoratorStrings = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError("Function expected") : fn;
var __decoratorContext = (kind, name, done, metadata, fns) => ({ kind: __decoratorStrings[kind], name, metadata, addInitializer: (fn) => done._ ? __typeError("Already initialized") : fns.push(__expectFn(fn || null)) });
var __decoratorMetadata = (array, target) => __defNormalProp(target, __knownSymbol("metadata"), array[3]);
var __runInitializers = (array, flags, self, value) => {
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++) flags & 1 ? fns[i].call(self) : value = fns[i].call(self, value);
  return value;
};
var __decorateElement = (array, flags, name, decorators, target, extra) => {
  var fn, it, done, ctx, access, k = flags & 7, s = !!(flags & 8), p = !!(flags & 16);
  var j = k > 3 ? array.length + 1 : k ? s ? 1 : 2 : 0, key = __decoratorStrings[k + 5];
  var initializers = k > 3 && (array[j - 1] = []), extraInitializers = array[j] || (array[j] = []);
  var desc = k && (!p && !s && (target = target.prototype), k < 5 && (k > 3 || !p) && __getOwnPropDesc(k < 4 ? target : { get [name]() {
    return __privateGet(this, extra);
  }, set [name](x) {
    return __privateSet(this, extra, x);
  } }, name));
  k ? p && k < 4 && __name(extra, (k > 2 ? "set " : k > 1 ? "get " : "") + name) : __name(target, name);
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
    if (k) {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: p ? (x) => __privateIn(target, x) : (x) => name in x };
      if (k ^ 3) access.get = p ? (x) => (k ^ 1 ? __privateGet : __privateMethod)(x, target, k ^ 4 ? extra : desc.get) : (x) => x[name];
      if (k > 2) access.set = p ? (x, y) => __privateSet(x, target, y, k ^ 4 ? extra : desc.set) : (x, y) => x[name] = y;
    }
    it = (0, decorators[i])(k ? k < 4 ? p ? extra : desc[key] : k > 4 ? void 0 : { get: desc.get, set: desc.set } : target, ctx), done._ = 1;
    if (k ^ 4 || it === void 0) __expectFn(it) && (k > 4 ? initializers.unshift(it) : k ? p ? extra = it : desc[key] = it : target = it);
    else if (typeof it !== "object" || it === null) __typeError("Object expected");
    else __expectFn(fn = it.get) && (desc.get = fn), __expectFn(fn = it.set) && (desc.set = fn), __expectFn(fn = it.init) && initializers.unshift(fn);
  }
  return k || __decoratorMetadata(array, target), desc && __defProp(target, name, desc), p ? k ^ 4 ? extra : desc : target;
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateIn = (member, obj) => Object(obj) !== obj ? __typeError('Cannot use the "in" operator on this value') : member.has(obj);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

// src/host/forge-gateway.ts
import { TypertRemoteService, Remote } from "@deepseek-ai/dsh-typert-protocol";
var _finish_dec, _resume_dec, _pause_dec, _nav_dec, _answer_dec, _applySeed_dec, _load_dec, _report_dec, _snapshot_dec, _list_dec, _a, _init;
var ForgeGateway = class extends (_a = TypertRemoteService, _list_dec = [Remote("list")], _snapshot_dec = [Remote("snapshot")], _report_dec = [Remote("report")], _load_dec = [Remote("load")], _applySeed_dec = [Remote("applySeed")], _answer_dec = [Remote("answer")], _nav_dec = [Remote("nav")], _pause_dec = [Remote("pause")], _resume_dec = [Remote("resume")], _finish_dec = [Remote("finish")], _a) {
  constructor(ctx) {
    super(ctx, "forge");
    __runInitializers(_init, 5, this);
    __publicField(this, "store");
    this.store = { sessions: /* @__PURE__ */ new Map() };
  }
  list() {
    return { entries: [] };
  }
  snapshot(args) {
    return {
      sessionId: args.sessionId,
      status: "answering",
      currentIndex: 0,
      answers: {},
      elapsedGlobal: 0,
      elapsedQuestion: 0
    };
  }
  report(args) {
    return { reportHtml: null };
  }
  load(args) {
    return { sessionId: args.sessionId, quiz: null, status: "answering" };
  }
  applySeed(args) {
    void args;
    return { ok: true, seeded: 0 };
  }
  answer(args) {
    void args;
    return { ok: true };
  }
  nav(args) {
    void args;
    return { ok: true };
  }
  pause(args) {
    void args;
    return { ok: true };
  }
  resume(args) {
    void args;
    return { ok: true };
  }
  finish(args) {
    void args;
    return { ok: true };
  }
};
_init = __decoratorStart(_a);
__decorateElement(_init, 1, "list", _list_dec, ForgeGateway);
__decorateElement(_init, 1, "snapshot", _snapshot_dec, ForgeGateway);
__decorateElement(_init, 1, "report", _report_dec, ForgeGateway);
__decorateElement(_init, 1, "load", _load_dec, ForgeGateway);
__decorateElement(_init, 1, "applySeed", _applySeed_dec, ForgeGateway);
__decorateElement(_init, 1, "answer", _answer_dec, ForgeGateway);
__decorateElement(_init, 1, "nav", _nav_dec, ForgeGateway);
__decorateElement(_init, 1, "pause", _pause_dec, ForgeGateway);
__decorateElement(_init, 1, "resume", _resume_dec, ForgeGateway);
__decorateElement(_init, 1, "finish", _finish_dec, ForgeGateway);
__decoratorMetadata(_init, ForgeGateway);
__publicField(ForgeGateway, "inject", ["fs"]);
var forge_gateway_default = ForgeGateway;
export {
  ForgeGateway,
  forge_gateway_default as default
};
