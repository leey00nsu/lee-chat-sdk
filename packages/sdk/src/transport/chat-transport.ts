export interface ChatTransportSendMessageOptions {
  signal?: AbortSignal
}

export interface ChatTransport<TRequest, TResponse> {
  sendMessage(
    request: TRequest,
    options?: ChatTransportSendMessageOptions,
  ): Promise<TResponse>
}
