/* eslint-disable @typescript-eslint/no-unused-vars */
interface SendMessageRequest {
  to: string;
  content: {
    text?: string;
    media?: string; // Base64
    mediaType?: string;
    caption?: string;
  };
}
