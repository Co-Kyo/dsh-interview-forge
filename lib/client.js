window.__ModuleLoader__.load({
  id: "interview-forge-plugin",
  factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var React = __toESM(require("react"), 1);
var inject = ["slots", "remote"];
function h(type, props, ...children) {
  return React.createElement(type, props, ...children);
}
function apply(ctx) {
  const remote = ctx.get("remote");
  const slots = ctx.get("slots");
  function entryRow(e) {
    return h(
      "li",
      { key: e.sessionId, style: { padding: "6px 0", borderBottom: "1px solid #eee" } },
      h("span", null, e.title),
      h("span", { style: { float: "right", color: "#2f6bff" } }, String(e.totalQuestions) + " \u9898")
    );
  }
  function ForgeFab() {
    const [entries, setEntries] = React.useState([]);
    const [open, setOpen] = React.useState(false);
    React.useEffect(() => {
      remote.forge.list().then((d) => setEntries(d.entries || [])).catch(() => {
      });
    }, []);
    const body = open ? h(
      "div",
      { style: { position: "absolute", right: 0, bottom: 66, width: 280, background: "#fff", border: "1px solid #d9dae2", borderRadius: 10, padding: 10, boxShadow: "0 6px 20px rgba(0,0,0,.15)" } },
      h("div", { style: { fontWeight: 700, marginBottom: 8 } }, "InterviewForge \u901F\u7EC3"),
      entries.length === 0 ? h("div", { style: { color: "#8b8b9a" } }, "\u6682\u65E0\u7EC3\u4E60") : h(
        "ul",
        { style: { listStyle: "none", margin: 0, padding: 0 } },
        entries.filter((e) => e.status === "answering").map(entryRow)
      )
    ) : null;
    return h(
      "div",
      { style: { position: "fixed", right: 22, bottom: 22, zIndex: 1300 } },
      h("button", {
        onClick: () => setOpen((o) => !o),
        style: { width: 56, height: 56, borderRadius: "50%", border: "none", background: "#2f6bff", color: "#fff", fontSize: 22, cursor: "pointer" }
      }, "\u26A1"),
      body
    );
  }
  slots.inject("shell.overlay", () => slots.register({ name: "shell.overlay", id: "forge-overlay", order: 60 }, () => h(ForgeFab, null)));
}

return module.exports; } });
