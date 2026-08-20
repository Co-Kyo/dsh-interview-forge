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
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateIn = (member, obj) => Object(obj) !== obj ? __typeError('Cannot use the "in" operator on this value') : member.has(obj);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

// src/host/forge-gateway.ts
import { TypertRemoteService, Remote } from "@deepseek-ai/dsh-typert-protocol";
function pad(n) {
  return String(n).padStart(2, "0");
}
function stamp() {
  const d = /* @__PURE__ */ new Date();
  return "if-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
}
function dateDir() {
  const d = /* @__PURE__ */ new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function freshProgress() {
  return { currentIndex: 0, answers: {}, globalStartTime: 0, questionStartTime: 0, pausedAt: 0, started: false };
}
function toListItem(entry) {
  return {
    sessionId: entry.sessionId,
    dshSessionId: entry.ownerSessionId || null,
    title: entry.quiz.meta.title,
    totalQuestions: entry.quiz.questions.length,
    status: entry.status,
    createdAt: entry.startedAt,
    archiveDir: entry.archiveDir || null
  };
}
function createdAtFromSid(sid) {
  const m = /^if-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/.exec(sid);
  if (!m) return 0;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6])).getTime();
}
var ForgeStore = class {
  sessions = /* @__PURE__ */ new Map();
  order = [];
  lastArchiveDir = null;
  lastWorkspace = null;
  latestEntry() {
    if (this.order.length === 0) return void 0;
    return this.sessions.get(this.order[this.order.length - 1]);
  }
  findEntry(sid) {
    if (!sid) return this.latestEntry();
    if (this.sessions.has(sid)) return this.sessions.get(sid);
    return this.entryForOwner(sid);
  }
  entryForOwner(ownerSid) {
    if (!ownerSid) return void 0;
    for (let i = this.order.length - 1; i >= 0; i--) {
      const e = this.sessions.get(this.order[i]);
      if (e && e.ownerSessionId === ownerSid) return e;
    }
    return void 0;
  }
  clear() {
    this.sessions.clear();
    this.order.length = 0;
  }
};
var store = new ForgeStore();
async function scanArchive(fs, roots, year, month) {
  const daysMap = /* @__PURE__ */ new Map();
  const seen = /* @__PURE__ */ new Set();
  for (const root of [...new Set(roots)]) {
    let sdir;
    try {
      sdir = await fs.resolve(root + "/sessions");
    } catch {
      continue;
    }
    let dateDirs;
    try {
      dateDirs = await fs.listDir(sdir);
    } catch {
      continue;
    }
    for (const d of dateDirs) {
      if (d.type !== "directory") continue;
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.name);
      if (!m) continue;
      if (year && m[1] !== year) continue;
      if (month && m[2] !== month) continue;
      let files;
      try {
        files = await fs.listDir(d.target);
      } catch {
        continue;
      }
      for (const f of files) {
        if (f.type !== "file") continue;
        const qm = /^quiz-(if-[\d-]+)\.json$/.exec(f.name);
        if (!qm) continue;
        const sid = qm[1];
        if (seen.has(sid)) continue;
        seen.add(sid);
        let quiz = null;
        try {
          quiz = JSON.parse(await fs.readText(f.target));
        } catch {
          continue;
        }
        if (!quiz || !quiz.meta) continue;
        const hasResult = files.some((x) => x.name === "result-" + sid + ".json");
        const hasReport = files.some((x) => x.name === "report-" + sid + ".html");
        let result = null;
        if (hasResult) {
          try {
            const rf = files.find((x) => x.name === "result-" + sid + ".json");
            result = JSON.parse(await fs.readText(rf.target));
          } catch {
            result = null;
          }
        }
        let correctCount = 0;
        let accuracy = null;
        let durationMs = null;
        let status = hasReport ? "reported" : hasResult ? "submitted" : "answering";
        if (result) {
          durationMs = result.globalDuration || null;
          if (result.answers && Array.isArray(quiz.questions)) {
            for (const q of quiz.questions) {
              const a = result.answers[q.id];
              if (a && q.type === "choice" && a.selected != null && q.answer != null && String(a.selected) === String(q.answer)) correctCount++;
            }
            accuracy = quiz.questions.length > 0 ? Math.round(correctCount / quiz.questions.length * 100) : null;
          }
        }
        const key = m[1] + "-" + m[2] + "-" + m[3];
        const bucket = daysMap.get(key) || { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), entries: [] };
        bucket.entries.push({ sessionId: sid, title: quiz.meta.title || sid, totalQuestions: Array.isArray(quiz.questions) ? quiz.questions.length : 0, correctCount, accuracy, durationMs, status });
        daysMap.set(key, bucket);
      }
    }
  }
  return [...daysMap.values()].sort((a, b) => a.day - b.day);
}
async function diskEntries(ctx) {
  const fs = ctx.get("fs");
  if (!fs) return [];
  const roots = [];
  if (store.lastArchiveDir) roots.push(store.lastArchiveDir);
  if (store.lastWorkspace) roots.push(store.lastWorkspace + "/interview-forge-archive");
  if (roots.length === 0) return [];
  const days = await scanArchive(fs, roots, null, null);
  const out = [];
  for (const d of days) for (const en of d.entries) {
    out.push({
      sessionId: en.sessionId,
      dshSessionId: null,
      title: en.title,
      totalQuestions: en.totalQuestions,
      status: en.status,
      createdAt: createdAtFromSid(en.sessionId),
      archiveDir: null
    });
  }
  return out;
}
var _report_dec, _finish_dec, _resume_dec, _pause_dec, _nav_dec, _answer_dec, _applySeed_dec, _snapshot_dec, _load_dec, _list_dec, _a, _init;
var ForgeGateway = class extends (_a = TypertRemoteService, _list_dec = [Remote("list")], _load_dec = [Remote("load")], _snapshot_dec = [Remote("snapshot")], _applySeed_dec = [Remote("applySeed")], _answer_dec = [Remote("answer")], _nav_dec = [Remote("nav")], _pause_dec = [Remote("pause")], _resume_dec = [Remote("resume")], _finish_dec = [Remote("finish")], _report_dec = [Remote("report")], _a) {
  constructor(ctx) {
    super(ctx, "forge");
    __runInitializers(_init, 5, this);
  }
  async list() {
    const entries = [];
    for (let i = store.order.length - 1; i >= 0; i--) {
      const e = store.sessions.get(store.order[i]);
      if (e) entries.push(toListItem(e));
    }
    const have = new Set(entries.map((e) => e.sessionId));
    for (const d of await diskEntries(this.ctx)) if (!have.has(d.sessionId)) {
      entries.push(d);
      have.add(d.sessionId);
    }
    entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return { entries };
  }
  async load(args) {
    const entry = store.findEntry(args.sessionId);
    if (!entry) return null;
    return {
      sessionId: entry.sessionId,
      quiz: entry.quiz,
      meta: entry.quiz.meta,
      status: entry.status,
      startedAt: entry.startedAt,
      progress: { currentIndex: entry.progress.currentIndex, answers: entry.progress.answers }
    };
  }
  async snapshot(args) {
    const entry = store.findEntry(args.sessionId);
    if (!entry) return null;
    const p = entry.progress;
    const now = Date.now();
    const base = p.pausedAt || now;
    return {
      sessionId: entry.sessionId,
      status: entry.status,
      started: p.started === true,
      currentIndex: p.currentIndex,
      answers: p.answers,
      elapsedGlobal: p.started ? Math.max(0, Math.floor((base - p.globalStartTime) / 1e3)) : 0,
      elapsedQuestion: p.started ? Math.max(0, Math.floor((base - p.questionStartTime) / 1e3)) : 0
    };
  }
  async applySeed(args) {
    const entry = store.sessions.get(args.sessionId);
    if (!entry || entry.seeded) return { ok: false, reason: "no-entry-or-seeded" };
    const fs = this.ctx.get("fs");
    if (!fs) return { ok: false, reason: "no-fs" };
    const seedPath = entry.archiveDir + "/sessions/" + dateDir() + "/seed-" + entry.sessionId + ".json";
    let seed = null;
    try {
      seed = JSON.parse(await fs.readText(await fs.resolve(seedPath)));
    } catch {
      return { ok: false, reason: "no-seed" };
    }
    const answers = seed && seed.answers || {};
    for (const qid of Object.keys(answers)) {
      const a = answers[qid] || {};
      const rec = { questionId: qid, startTime: entry.progress.questionStartTime, endTime: Date.now(), duration: 0 };
      if (a.selected != null) rec.selected = a.selected;
      if (a.note != null) rec.note = a.note;
      entry.progress.answers[qid] = rec;
    }
    entry.seeded = true;
    return { ok: true, seeded: Object.keys(answers).length };
  }
  async answer(args) {
    const entry = store.findEntry(args.sessionId);
    if (!entry) throw new Error("\u672A\u77E5\u7684 sessionId: " + args.sessionId);
    const p = entry.progress;
    const end = p.pausedAt || Date.now();
    const rec = {
      questionId: args.questionId,
      startTime: p.questionStartTime,
      endTime: end,
      duration: Math.max(0, end - p.questionStartTime)
    };
    if (args.selected != null) rec.selected = args.selected;
    if (args.note != null) rec.note = args.note;
    p.answers[args.questionId] = rec;
    return { ok: true };
  }
  async nav(args) {
    const entry = store.findEntry(args.sessionId);
    if (!entry) throw new Error("\u672A\u77E5\u7684 sessionId: " + args.sessionId);
    entry.progress.currentIndex = args.index;
    if (entry.progress.pausedAt === 0) entry.progress.questionStartTime = Date.now();
    return { ok: true };
  }
  async pause(args) {
    const entry = store.findEntry(args.sessionId);
    if (!entry) throw new Error("\u672A\u77E5\u7684 sessionId: " + args.sessionId);
    const p = entry.progress;
    if (p.started && p.pausedAt === 0) p.pausedAt = Date.now();
    return { ok: true };
  }
  async resume(args) {
    const entry = store.findEntry(args.sessionId);
    if (!entry) throw new Error("\u672A\u77E5\u7684 sessionId: " + args.sessionId);
    const p = entry.progress;
    const now = Date.now();
    if (!p.started) {
      p.started = true;
      p.globalStartTime = now;
      p.questionStartTime = now;
    } else if (p.pausedAt !== 0) {
      const delta = now - p.pausedAt;
      p.pausedAt = 0;
      if (delta > 0) {
        p.globalStartTime = p.globalStartTime + delta;
        p.questionStartTime = p.questionStartTime + delta;
      }
    }
    return { ok: true };
  }
  async finish(args) {
    if (!args || !args.sessionId) throw new Error("forge.finish \u9700\u8981 sessionId");
    const entry = store.sessions.get(args.sessionId);
    if (!entry) throw new Error("\u672A\u77E5\u7684 sessionId: " + args.sessionId);
    const fs = this.ctx.get("fs");
    if (!fs) throw new Error("fs \u670D\u52A1\u4E0D\u53EF\u7528\uFF0C\u65E0\u6CD5\u5199\u5165\u7B54\u9898\u7ED3\u679C");
    const p = entry.progress;
    const now = Date.now();
    const end = p.pausedAt || now;
    const result = {
      sessionId: entry.sessionId,
      quizMeta: entry.quiz.meta,
      globalStartTime: p.globalStartTime,
      globalEndTime: end,
      globalDuration: p.started ? Math.max(0, end - p.globalStartTime) : 0,
      answers: { ...p.answers },
      status: "completed"
    };
    await fs.writeText(await fs.resolve(entry.resultPath), JSON.stringify(result, null, 2));
    entry.status = "submitted";
    entry.result = result;
    return { ok: true };
  }
  async report(args) {
    const entry = store.findEntry(args.sessionId);
    if (entry && entry.reportHtml) return { reportHtml: entry.reportHtml };
    const fs = this.ctx.get("fs");
    const archiveRoot = store.lastArchiveDir || (store.lastWorkspace ? store.lastWorkspace + "/interview-forge-archive" : null);
    if (fs && args.sessionId && archiveRoot) {
      const m = /^if-(\d{4})(\d{2})(\d{2})-/.exec(args.sessionId);
      if (m) {
        try {
          const p = archiveRoot + "/sessions/" + m[1] + "-" + m[2] + "-" + m[3] + "/report-" + args.sessionId + ".html";
          const html = await fs.readText(await fs.resolve(p));
          return { reportHtml: html };
        } catch {
        }
      }
    }
    return { reportHtml: null };
  }
};
_init = __decoratorStart(_a);
__decorateElement(_init, 1, "list", _list_dec, ForgeGateway);
__decorateElement(_init, 1, "load", _load_dec, ForgeGateway);
__decorateElement(_init, 1, "snapshot", _snapshot_dec, ForgeGateway);
__decorateElement(_init, 1, "applySeed", _applySeed_dec, ForgeGateway);
__decorateElement(_init, 1, "answer", _answer_dec, ForgeGateway);
__decorateElement(_init, 1, "nav", _nav_dec, ForgeGateway);
__decorateElement(_init, 1, "pause", _pause_dec, ForgeGateway);
__decorateElement(_init, 1, "resume", _resume_dec, ForgeGateway);
__decorateElement(_init, 1, "finish", _finish_dec, ForgeGateway);
__decorateElement(_init, 1, "report", _report_dec, ForgeGateway);
__decoratorMetadata(_init, ForgeGateway);
var forge_gateway_default = ForgeGateway;
export {
  ForgeGateway,
  ForgeStore,
  dateDir,
  forge_gateway_default as default,
  diskEntries,
  freshProgress,
  stamp,
  store
};
