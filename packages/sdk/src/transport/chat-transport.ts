export interface ChatTransport<TRequest, TResponse> {
  sendMessage(request: TRequest): Promise<TResponse>
}
