declare module 'snarkjs' {
  export const groth16: {
    fullProve: (
      input: Record<string, unknown>,
      wasmPath: string,
      zkeyPath: string,
    ) => Promise<{ proof: unknown; publicSignals: unknown[] }>;
    verify: (
      vkey: unknown,
      publicSignals: unknown[],
      proof: unknown,
    ) => Promise<boolean>;
    exportSolidityCallData: (
      proof: unknown,
      publicSignals: unknown[],
    ) => Promise<string>;
  };
}
