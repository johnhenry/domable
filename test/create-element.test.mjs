import { describe, it } from "node:test";
import assert from "node:assert/strict";

import createElement, { _, createSVGElement, SVG_NAMESPACE, fromString } from "../src/create-element.mjs";
import { div, ul, li } from "../src/tags/html.mjs";
import { circle, svg as svgTag } from "../src/tags/svg.mjs";

describe("createElement", () => {
  it("creates a bare element with no attributes/children", () => {
    assert.equal(createElement("div").outerHTML, "<div></div>");
  });

  it("sets attributes as-is, no camelCase translation", () => {
    const el = createElement("div", { id: "foo", "data-bar": "baz" });
    assert.equal(el.outerHTML, '<div id="foo" data-bar="baz"></div>');
  });

  it("class as an array adds each entry via classList", () => {
    const el = createElement("div", { class: ["a", "b"] });
    assert.equal(el.outerHTML, '<div class="a b"></div>');
  });

  it("string children become text nodes", () => {
    assert.equal(createElement("p", {}, "hello").outerHTML, "<p>hello</p>");
  });

  it("Node children are appended as-is", () => {
    const child = createElement("span");
    assert.equal(createElement("div", {}, child).outerHTML, "<div><span></span></div>");
  });

  it("the attributes argument is optional -- a child can be passed directly as the second argument", () => {
    assert.equal(createElement("ul", createElement("li")).outerHTML, "<ul><li></li></ul>");
  });

  it("the tag argument is optional -- returns a DocumentFragment", () => {
    const frag = createElement(createElement("li"), createElement("li"));
    assert.equal(frag.nodeType, 11);
    assert.equal(frag.childNodes.length, 2);
  });

  it("a single bare Node argument produces a fragment with exactly that one child -- not a second, bogus child from the {} props default (real bug found while building reactToDom's Fragment path)", () => {
    const frag = createElement(createElement("li"));
    assert.equal(frag.childNodes.length, 1);
    assert.equal(frag.firstChild.tagName, "LI");
  });

  it("_ is shorthand for a bare fragment", () => {
    const frag = _(createElement("li"), createElement("li"));
    assert.equal(frag.childNodes.length, 2);
  });

  it("props.children is prepended to positional children (JSX-transform compatibility)", () => {
    const el = createElement("ul", { children: [createElement("li", {}, "a")] }, createElement("li", {}, "b"));
    assert.equal(el.outerHTML, "<ul><li>a</li><li>b</li></ul>");
  });

  it("createSVGElement builds a real SVG-namespaced element", () => {
    const el = createSVGElement("circle", { r: "5" });
    assert.equal(el.namespaceURI, SVG_NAMESPACE);
    assert.equal(el.outerHTML, '<circle r="5"></circle>');
  });

  it("fromString is text-to-dom.mjs, re-exported for convenience", () => {
    const frag = fromString("<b>x</b>");
    assert.equal(frag.firstChild.outerHTML, "<b>x</b>");
  });
});

describe("tags/html.mjs and tags/svg.mjs shorthands", () => {
  it("html shorthand functions build the named tag", () => {
    assert.equal(ul({}, li({}, "item")).outerHTML, "<ul><li>item</li></ul>");
    assert.equal(div({ id: "x" }).outerHTML, '<div id="x"></div>');
  });

  it("svg shorthand functions build SVG-namespaced elements", () => {
    const el = svgTag({}, circle({ r: "3" }));
    assert.equal(el.namespaceURI, SVG_NAMESPACE);
    assert.equal(el.firstChild.namespaceURI, SVG_NAMESPACE);
  });
});
