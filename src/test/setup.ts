import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
window.scrollTo = () => {};
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement["getContext"];
