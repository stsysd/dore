const encoder = new TextEncoder();

export function enterBuffer(): Uint8Array {
  return encoder.encode("\x1b[?1049h");
}

export function exitBuffer(): Uint8Array {
  return encoder.encode("\x1b[?1049l");
}

export function clearBuffer(): Uint8Array {
  return encoder.encode("\x1b[2J");
}

export function moveCursor(x: number, y: number): Uint8Array {
  return encoder.encode(`\x1b[${~~x};${~~y}H`);
}

export function saveCurosr(): Uint8Array {
  return encoder.encode("\x1b[s");
}

export function loadCurosr(): Uint8Array {
  return encoder.encode("\x1b[u");
}
