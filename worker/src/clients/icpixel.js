/**
 * ICPixel is a browser editor. Captain watches the site and does not mint.
 */

export const ICPIXEL_STATUS = "watch";

export async function registerCaptainOnIcpixel(/* { identity } */) {
  throw new Error("ICPixel stays in the browser session. Captain does not mint from here.");
}

export async function createLayeredCollection(/* opts */) {
  throw new Error(
    "ICPixel has no public mint canister. Layered art stays in the browser at https://icpixel.org.",
  );
}
