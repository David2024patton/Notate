import { chatCompletion } from "../chatCompletion.js";
import { providerInitialize } from "../llmHelpers/providerInit.js";

export async function ExternalOllamaProvider(
  params: ProviderInputParams
): Promise<ProviderResponse> {
  const openai = await providerInitialize("ollama external", params.activeUser);
  return chatCompletion(openai, params);
}
