import { describe, it } from "node:test";
import assert from "node:assert/strict";

import createElement, {
  _,
  createSVGElement,
  SVG_NAMESPACE,
  createMathMLElement,
  MATHML_NAMESPACE,
  fromString,
} from "../src/create-element.mjs";
import { div, ul, li, button, input } from "../src/tags/html.mjs";
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

// Issue #9: listeners, properties, attribute values, and children.

/** Records every call so a test can assert a listener ran, and with what. */
function spy() {
  const calls = [];
  const fn = function (event) {
    calls.push({ event, self: this });
  };
  fn.calls = calls;
  return fn;
}

describe("createElement event listeners (#9)", () => {
  it("a function-valued onclick prop becomes a real listener, and no onclick attribute is written", () => {
    const onclick = spy();
    const el = createElement("button", { onclick }, "save");
    assert.equal(el.hasAttribute("onclick"), false);
    assert.equal(el.outerHTML, "<button>save</button>");
    el.click();
    assert.equal(onclick.calls.length, 1);
    assert.equal(onclick.calls[0].event.type, "click");
  });

  it("camelCase on<Event> names are lowercased (onInput -> input, onClick -> click)", () => {
    const onInput = spy();
    const onClick = spy();
    const el = createElement("input", { onInput, onClick });
    assert.equal(el.attributes.length, 0);
    el.dispatchEvent(new Event("input"));
    el.dispatchEvent(new Event("click"));
    assert.equal(onInput.calls.length, 1);
    assert.equal(onClick.calls.length, 1);
  });

  it("a STRING onclick value is still an attribute, exactly as before", () => {
    const el = createElement("button", { onclick: "go()" });
    assert.equal(el.getAttribute("onclick"), "go()");
  });

  it("null/undefined/false on* values add nothing", () => {
    const el = createElement("button", { onclick: null, onfocus: undefined, onblur: false });
    assert.equal(el.attributes.length, 0);
  });

  it('"@type" adds a listener for the type verbatim -- custom events, hyphens and case preserved', () => {
    const onMine = spy();
    const onCamel = spy();
    const el = createElement("div", { "@my-event": onMine, "@valueChanged": onCamel });
    assert.equal(el.attributes.length, 0);
    el.dispatchEvent(new CustomEvent("my-event", { detail: 42 }));
    el.dispatchEvent(new Event("valuechanged"));
    el.dispatchEvent(new Event("valueChanged"));
    assert.equal(onMine.calls.length, 1);
    assert.equal(onMine.calls[0].event.detail, 42);
    assert.equal(onCamel.calls.length, 1);
  });

  it('"@type": [listener, options] passes addEventListener options through ({ once: true })', () => {
    const fn = spy();
    const el = createElement("div", { "@ping": [fn, { once: true }] });
    el.dispatchEvent(new Event("ping"));
    el.dispatchEvent(new Event("ping"));
    assert.equal(fn.calls.length, 1);
  });

  it('"@type" accepts an EventListener object ({ handleEvent })', () => {
    const seen = [];
    const listener = { handleEvent: (event) => seen.push(event.type) };
    createElement("div", { "@ping": listener }).dispatchEvent(new Event("ping"));
    assert.deepEqual(seen, ["ping"]);
  });

  it('"@type": null/undefined/false adds nothing (conditional listeners)', () => {
    const el = createElement("div", { "@a": null, "@b": undefined, "@c": false });
    assert.equal(el.attributes.length, 0);
  });

  it('"@type": [fn, { signal }] -- aborting the signal removes the listener', () => {
    const fn = spy();
    // jsdom only honors its own AbortSignal, not Node's global one.
    const controller = new document.defaultView.AbortController();
    const el = createElement("div", { "@ping": [fn, { signal: controller.signal }] });
    el.dispatchEvent(new Event("ping"));
    controller.abort();
    el.dispatchEvent(new Event("ping"));
    assert.equal(fn.calls.length, 1);
  });

  it('a STRING "@type" value is still an attribute, as before (Alpine.js-style @click="...")', () => {
    const el = createElement("button", { "@click": "open = !open" });
    assert.equal(el.getAttribute("@click"), "open = !open");
  });

  it("the html shorthands get listeners too", () => {
    const onclick = spy();
    const el = button({ onclick, type: "button" }, "go");
    assert.equal(el.outerHTML, '<button type="button">go</button>');
    el.click();
    assert.equal(onclick.calls.length, 1);
  });
});

describe("createElement properties (#9)", () => {
  it('".value" sets the input\'s value PROPERTY, not the attribute', () => {
    const el = createElement("input", { ".value": "typed" });
    assert.equal(el.value, "typed");
    assert.equal(el.hasAttribute("value"), false);
  });

  it('".checked"/".indeterminate" set properties that have no (or only an initial-value) attribute', () => {
    const el = input({ type: "checkbox", checked: true, ".checked": false, ".indeterminate": true });
    assert.equal(el.getAttribute("checked"), ""); // the default-checked attribute
    assert.equal(el.checked, false); // the live property, set explicitly -- false is assigned, not skipped
    assert.equal(el.indeterminate, true);
  });

  it("a custom element's property setter receives the object as-is (not stringified)", () => {
    class ValueInspector extends HTMLElement {
      #value;
      set value(v) {
        this.#value = v;
        this.setAttribute("kind", typeof v);
      }
      get value() {
        return this.#value;
      }
    }
    customElements.define("value-inspector-9", ValueInspector);
    const data = { a: [1, 2, 3] };
    const el = createElement("value-inspector-9", { ".value": data });
    assert.ok(el instanceof ValueInspector);
    assert.equal(el.value, data);
    assert.equal(el.getAttribute("kind"), "object");
    assert.equal(el.hasAttribute("value"), false);
  });

  it("properties are assigned after children are appended (a <select>'s .value needs its options)", () => {
    const el = createElement(
      "select",
      { ".value": "b" },
      createElement("option", { value: "a" }, "A"),
      createElement("option", { value: "b" }, "B"),
    );
    assert.equal(el.value, "b");
  });
});

describe("createElement attribute values (#9)", () => {
  it("false/null/undefined values omit the attribute", () => {
    const el = createElement("input", { disabled: false, title: null, placeholder: undefined, id: "x" });
    assert.equal(el.outerHTML, '<input id="x">');
  });

  it('true sets a boolean attribute to ""', () => {
    const el = createElement("input", { disabled: true, required: true });
    assert.equal(el.outerHTML, '<input disabled="" required="">');
  });

  it('aria-*/data-* booleans are written as "true"/"false" (string-valued, not boolean, attributes)', () => {
    const el = createElement("div", { "aria-hidden": true, "aria-expanded": false, "data-on": true });
    assert.equal(el.getAttribute("aria-hidden"), "true");
    assert.equal(el.getAttribute("aria-expanded"), "false");
    assert.equal(el.getAttribute("data-on"), "true");
  });

  it("other values are still stringified via setAttribute, as before (0 is kept)", () => {
    const el = createElement("div", { tabindex: 0, "data-n": 12 });
    assert.equal(el.outerHTML, '<div tabindex="0" data-n="12"></div>');
  });

  it("style as an object: kebab-case, camelCase and --custom properties; null/false entries skipped", () => {
    const el = createElement("div", {
      style: { color: "red", "background-color": "blue", fontSize: "12px", "--gap": 4, margin: null, padding: false },
    });
    assert.equal(el.style.color, "red");
    assert.equal(el.style.backgroundColor, "blue");
    assert.equal(el.style.fontSize, "12px");
    assert.equal(el.style.getPropertyValue("--gap"), "4");
    assert.equal(el.style.margin, "");
    assert.equal(el.style.padding, "");
  });

  it("style as a string is set as-is, as before", () => {
    assert.equal(createElement("div", { style: "color: red" }).getAttribute("style"), "color: red");
  });

  it("class as an array skips falsy entries (conditional classes)", () => {
    const active = false;
    const el = createElement("div", { class: ["a", active && "active", null, undefined, "", "b"] });
    assert.equal(el.getAttribute("class"), "a b");
  });

  it("class as a { name: boolean } object adds only the truthy names", () => {
    const el = createElement("div", { class: { a: true, b: false, c: 1 } });
    assert.equal(el.getAttribute("class"), "a c");
  });

  it("class as a string is set as-is, as before", () => {
    assert.equal(createElement("div", { class: "a  b" }).getAttribute("class"), "a  b");
  });
});

describe("createElement children (#9)", () => {
  it("null/undefined/false/true children are skipped -- cond && el works", () => {
    const el = createElement("p", {}, null, "a", undefined, false, true, "b", false && createElement("i"));
    assert.equal(el.outerHTML, "<p>ab</p>");
    assert.equal(el.childNodes.length, 2);
  });

  it("numbers and bigints become text; 0 and NaN are rendered, not skipped", () => {
    assert.equal(createElement("p", {}, 0, " ", 1.5, " ", 10n, " ", NaN).textContent, "0 1.5 10 NaN");
  });

  it("nested arrays are flattened, in order", () => {
    const el = createElement("ul", {}, [createElement("li", {}, "1"), [createElement("li", {}, "2"), [null, "3"]]], "4");
    assert.equal(el.outerHTML, "<ul><li>1</li><li>2</li>34</ul>");
  });

  it("an array passed as the second argument is children, not props", () => {
    const items = ["a", "b"].map((x) => li({}, x));
    assert.equal(ul(items).outerHTML, "<ul><li>a</li><li>b</li></ul>");
  });

  it("iterables are flattened -- generators, Sets, and live NodeLists (collected before any node moves)", () => {
    function* gen() {
      yield "x";
      yield createElement("b", {}, "y");
    }
    assert.equal(createElement("p", {}, gen(), new Set(["z"])).outerHTML, "<p>x<b>y</b>z</p>");

    const source = createElement("div", {}, createElement("i"), createElement("i"), createElement("i"));
    const target = createElement("div", {}, source.childNodes);
    assert.equal(target.childNodes.length, 3);
    assert.equal(source.childNodes.length, 0);
  });

  it("props.children may itself be nested/contain empties (JSX compatibility kept)", () => {
    const el = createElement("ul", { children: [[li({}, "a")], null, undefined] }, false, li({}, "b"));
    assert.equal(el.outerHTML, "<ul><li>a</li><li>b</li></ul>");
  });

  it("props.children: undefined is skipped, not rendered as the text 'undefined'", () => {
    assert.equal(createElement("p", { children: undefined }).outerHTML, "<p></p>");
  });

  it("fragments (omitted tag / _) get the same child rules", () => {
    const frag = _(false, [createElement("li"), null], createElement("li"), 3);
    assert.equal(frag.nodeType, 11);
    assert.equal(frag.childNodes.length, 3);
    assert.equal(frag.lastChild.textContent, "3");
  });
});

describe("SVG and MathML get the same semantics (#9)", () => {
  it("createSVGElement: listener attached, no on* attribute, correct namespace, falsy attrs skipped", () => {
    const onclick = spy();
    const el = createSVGElement("circle", { r: 5, onclick, fill: null, "@hover-ish": onclick });
    assert.equal(el.namespaceURI, SVG_NAMESPACE);
    assert.equal(el.outerHTML, '<circle r="5"></circle>');
    el.dispatchEvent(new Event("click"));
    el.dispatchEvent(new Event("hover-ish"));
    assert.equal(onclick.calls.length, 2);
  });

  it("svg shorthands: style object, class array, flattened children, listener", () => {
    const onClick = spy();
    const el = svgTag({ onClick, style: { "--c": "red" }, class: ["a", false] }, [circle({ r: 1 }), [circle({ r: 2 })]], null);
    assert.equal(el.namespaceURI, SVG_NAMESPACE);
    assert.equal(el.childNodes.length, 2);
    assert.ok([...el.childNodes].every((c) => c.namespaceURI === SVG_NAMESPACE));
    assert.equal(el.getAttribute("class"), "a");
    assert.equal(el.style.getPropertyValue("--c"), "red");
    assert.equal(el.hasAttribute("onclick"), false);
    el.dispatchEvent(new Event("click"));
    assert.equal(onClick.calls.length, 1);
  });

  it("createMathMLElement: listener, properties and style object (falls back to a style attribute where there is no .style)", () => {
    const onclick = spy();
    const el = createMathMLElement("mi", { onclick, ".custom": 7, style: { color: "red", "--x": 1 }, hidden: false }, "x", null);
    assert.equal(el.namespaceURI, MATHML_NAMESPACE);
    assert.equal(el.hasAttribute("onclick"), false);
    assert.equal(el.hasAttribute("hidden"), false);
    assert.equal(el.custom, 7);
    assert.equal(el.textContent, "x");
    assert.match(el.getAttribute("style"), /color: red/);
    assert.match(el.getAttribute("style"), /--x: 1/);
    el.dispatchEvent(new Event("click"));
    assert.equal(onclick.calls.length, 1);
  });
});
