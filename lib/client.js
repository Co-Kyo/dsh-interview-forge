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
var inject = ["slots"];
function h(type, props, ...children) {
  return React.createElement(type, props, ...children);
}
function apply(ctx) {
  const slots = ctx.get("slots");
  function Fab() {
    return h(
      React.Fragment,
      null,
      h("div", {
        style: { position: "fixed", right: 22, bottom: 22, zIndex: 2e3, width: 56, height: 56, borderRadius: "50%", background: "#d93045", color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }
      }, "\u26A1FORGE")
    );
  }
  slots.inject("shell.overlay", () => slots.register({ name: "shell.overlay", id: "forge-overlay", order: 65 }, () => h(Fab, null)));
}

return module.exports; } });
