import { describe, it } from "node:test";
import assert from "node:assert/strict";

import textToReact from "../src/text-to-react.mjs";
import reactToText from "../src/react-to-text.mjs";

describe("textToReact / reactToText (the composed corner of the Text/DOM/React triangle)", () => {
  it("textToReact: a single top-level element converts directly, not Fragment-wrapped", () => {
    const react = textToReact("<div>hi</div>");
    assert.equal(react.type, "div");
    assert.deepEqual(react.props.children, ["hi"]);
  });

  it("textToReact: multiple top-level nodes convert to a Fragment element", () => {
    const react = textToReact("<li>one</li><li>two</li>");
    assert.equal(react.type, Symbol.for("react.fragment"));
    assert.equal(react.props.children.length, 2);
  });

  it("reactToText: converts a React-element-shaped object straight to an HTML string", () => {
    const react = { $$typeof: Symbol.for("react.element"), type: "div", props: { className: "card", children: "hi" } };
    assert.equal(reactToText(react), '<div class="card">hi</div>');
  });

  it("round-trips through all three representations: text -> react -> text", () => {
    const original = '<div class="card"><span>hi</span></div>';
    assert.equal(reactToText(textToReact(original)), original);
  });
});
