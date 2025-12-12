export interface AjaxHookRequest {
  type: "xhr" | "fetch";
  abort: boolean;
  async: boolean;
  data: any;
  headers: Record<string, string>;
  method: string;
  response: (resp: AjaxHookResponse) => void;
  url: string;
}

export interface AjaxHookResponse {
  responseText: string;
  finalUrl: string;
  responseHeaders: Record<string, string>;
  response: string;
  status: number;
  statusText: string;
}
