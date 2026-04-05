/**
 * Lightweight ubus JSON-RPC wrapper for OpenWrt.
 * This will be used by the frontend to communicate with the router's rpcd.
 */

export interface UbusResponse<T = any> {
  jsonrpc: "2.0";
  id: number;
  result: [number, T]; // [status_code, data]
}

class UbusService {
  private sid: string | null = null;
  private baseUrl: string = "/ubus"; // Standard OpenWrt ubus endpoint

  setSessionId(sid: string) {
    this.sid = sid;
  }

  async call<T = any>(module: string, method: string, params: any = {}): Promise<T> {
    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "call",
      params: [this.sid || "00000000000000000000000000000000", module, method, params],
    };

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const data: UbusResponse<T> = await response.json();
    
    // index 0 is the status code, index 1 is the actual data
    if (data.result[0] !== 0) {
      throw new Error(`Ubus Error Code: ${data.result[0]}`);
    }

    return data.result[1];
  }

  // Helper for UCI get
  async uciGet(config: string, section?: string, option?: string): Promise<any> {
    return this.call("uci", "get", { config, section, option });
  }

  // Helper for UCI set
  async uciSet(config: string, section: string, values: Record<string, string>): Promise<void> {
    await this.call("uci", "set", { config, section, values });
    await this.call("uci", "commit", { config });
  }
}

export const ubus = new UbusService();
