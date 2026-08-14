/** Web NFC (NDEF) — Android Chrome only; iOS uses NFC Tools handoff. */

export function webNfcSupported(): boolean {
  return typeof window !== "undefined" && "NDEFReader" in window;
}

export async function writePlantUrlToNfcTag(url: string): Promise<void> {
  if (!webNfcSupported()) {
    throw new Error("Web NFC is not available on this device");
  }
  const NDEFReader = (
    window as unknown as {
      NDEFReader: new () => {
        write: (msg: {
          records: Array<{ recordType: string; data: string }>;
        }) => Promise<void>;
      };
    }
  ).NDEFReader;
  const ndef = new NDEFReader();
  await ndef.write({
    records: [{ recordType: "url", data: url }],
  });
}
